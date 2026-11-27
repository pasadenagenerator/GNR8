/** Derive a disposable Wrangler config from verified, already built inputs. */
import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';

const IMAGE_KEY = 'native-studio/prebuilt-image-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 256;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw Error('native_studio_prebundled_config_unverified'); };
const safePath = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 300 && !value.includes('\\') && !value.includes('\0') &&
  !value.startsWith('/') && value.split('/').every(part => part &&
    part !== '.' && part !== '..' && /^[A-Za-z0-9._-]+$/.test(part));
const within = (root, child) => child.startsWith(`${root}${sep}`);

async function verifiedDirectory(path) {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() ||
      await realpath(path) !== resolve(path)) fail();
}

async function verifyBundle(root, receipt) {
  if (!Array.isArray(receipt.files) || receipt.files.length < 1 ||
      receipt.files.length > MAX_FILES || !safePath(receipt.entryPath) ||
      !receipt.entryPath.endsWith('.js')) fail();
  await verifiedDirectory(root);
  const expected = new Map();
  let total = 0;
  for (const file of receipt.files) {
    if (!safePath(file.path) || expected.has(file.path) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
        file.bytes > MAX_FILE_BYTES || !SHA.test(file.sha256) ||
        !Array.isArray(file.chunks) || file.chunks.length < 1 ||
        file.chunks.length > Math.ceil(MAX_FILE_BYTES / CHUNK_BYTES) + 1) fail();
    total += file.bytes;
    if (total > MAX_TOTAL_BYTES) fail();
    expected.set(file.path, file);
  }
  if (!expected.has(receipt.entryPath)) fail();
  const manifest = [...expected.values()].map(({ path, bytes, sha256 }) =>
    ({ path, bytes, sha256 })).sort((a, b) => a.path.localeCompare(b.path));
  if (hash(JSON.stringify(manifest)) !== receipt.manifestSha256) fail();
  const found = new Set();
  async function walk(directory, prefix = '') {
    for (const name of await readdir(directory)) {
      if (!/^[A-Za-z0-9._-]+$/.test(name) || name === '.' || name === '..') fail();
      const rel = prefix ? `${prefix}/${name}` : name;
      const path = join(directory, name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) fail();
      if (info.isDirectory()) { await walk(path, rel); continue; }
      if (!info.isFile() || !expected.has(rel) || found.has(rel) ||
          info.size !== expected.get(rel).bytes) fail();
      const file = expected.get(rel);
      const body = await readFile(path);
      if (body.length !== file.bytes || hash(body) !== file.sha256) fail();
      let offset = 0;
      for (const chunk of file.chunks) {
        if (!Number.isSafeInteger(chunk.bytes) || chunk.bytes < 0 ||
            chunk.bytes > CHUNK_BYTES || !SHA.test(chunk.sha256) ||
            hash(body.subarray(offset, offset + chunk.bytes)) !== chunk.sha256)
          fail();
        offset += chunk.bytes;
      }
      if (offset !== body.length) fail();
      found.add(rel);
    }
  }
  await walk(root);
  if (found.size !== expected.size) fail();
  return join(root, receipt.entryPath);
}

/**
 * The caller must first verify the private bundle receipt against its stored
 * chunks and supply a source-manifest SHA for the original Wrangler config.
 * This helper also checks the staged bytes; it never runs a build or deploy.
 */
export async function preparePrebundledStudioDeployConfig(input) {
  const { studio, store, sourceId, commit, workerId, site, scope,
    originalConfigSha256, deploymentRoot, bundleRoot, bundleReceipt,
    assetsDirectory } = input ?? {};
  if (typeof studio !== 'string' || !isAbsolute(studio) ||
      typeof deploymentRoot !== 'string' || !isAbsolute(deploymentRoot) ||
      typeof bundleRoot !== 'string' || !isAbsolute(bundleRoot) ||
      typeof assetsDirectory !== 'string' || !isAbsolute(assetsDirectory) ||
      !store || typeof store.read !== 'function' || !site ||
      !UUID.test(site.siteId) || !HEX32.test(site.accountId) ||
      !SHA.test(sourceId) || !COMMIT.test(commit) || !HEX32.test(workerId) ||
      !SHA.test(originalConfigSha256) || !bundleReceipt ||
      !scope || scope.siteId !== site.siteId ||
      ![scope.agencyId, scope.clientId].every(value => UUID.test(value))) fail();
  const studioPath = resolve(studio);
  const deployPath = resolve(deploymentRoot);
  const bundlePath = resolve(bundleRoot);
  if (!within(deployPath, bundlePath) ||
      resolve(assetsDirectory) !== join(studioPath, 'dist') ||
      await realpath(studio) !== studioPath ||
      await realpath(deploymentRoot) !== deployPath) fail();
  await verifiedDirectory(deployPath);
  await verifiedDirectory(assetsDirectory);
  const receipt = bundleReceipt;
  if (receipt.siteId !== site.siteId || receipt.accountId !== site.accountId ||
      receipt.sourceId !== sourceId || receipt.commit !== commit ||
      receipt.workerId !== workerId ||
      JSON.stringify(receipt.scope) !== JSON.stringify(scope)) fail();
  const entry = await verifyBundle(bundlePath, receipt);
  const imageReceipt = await store.read(IMAGE_KEY);
  if (!imageReceipt || Object.keys(imageReceipt).sort().join() !==
      'accountId,commit,digest,siteId,sourceId,workerId' ||
      imageReceipt.accountId !== site.accountId ||
      imageReceipt.siteId !== site.siteId ||
      imageReceipt.sourceId !== sourceId || imageReceipt.commit !== commit ||
      imageReceipt.workerId !== workerId || !SHA.test(imageReceipt.digest)) fail();
  const image = `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${imageReceipt.digest}`;
  const originalPath = join(studioPath, 'cloudflare', 'wrangler.jsonc');
  let config;
  try {
    const bytes = await readFile(originalPath);
    if (hash(bytes) !== originalConfigSha256) fail();
    config = JSON.parse(bytes.toString('utf8'));
  } catch { fail(); }
  if (config.account_id !== site.accountId ||
      config.name !== `gnr8-${site.siteId}-studio` ||
      !['../src/cloudflare/worker.ts', './gnr8-worker-entry.ts'].includes(config.main) ||
      config.assets?.directory !== '../dist' ||
      !Array.isArray(config.containers) || config.containers.length !== 1 ||
      config.containers[0]?.class_name !== 'PreviewContainer' ||
      config.containers[0]?.image !== '../Dockerfile' ||
      'build' in config || 'rules' in config || 'site' in config) fail();
  const derived = { ...config, main: entry,
    no_bundle: true, find_additional_modules: false,
    assets: { ...config.assets, directory: assetsDirectory },
    containers: [{ ...config.containers[0], image }] };
  const relativePath = `cloudflare/.gnr8-deploy-${randomUUID()}.jsonc`;
  const path = join(studioPath, relativePath);
  await writeFile(path, JSON.stringify(derived) + '\n',
    { flag: 'wx', mode: 0o600 });
  return { relative: relativePath, image, entry, cleanup: () =>
    rm(path, { force: true }) };
}
