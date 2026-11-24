/** Assemble only verified deploy inputs in a fresh, credential-free directory. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { preparePrebundledStudioDeployConfig } from './prebundled-studio-deploy-config.mjs';
import { readStoredVerifiedAstroStudio } from './prepare-from-confirmed-export.mjs';

const HANDOFF = 'native-studio/build-handoff-v1.json';
const BUNDLE = 'native-studio/worker-bundle-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const safePath = value => typeof value === 'string' && value.length > 0 &&
  value.length <= 300 && !value.includes('\\') && !value.includes('\0') &&
  !value.startsWith('/') && value.split('/').every(part => part &&
    part !== '.' && part !== '..' && /^[A-Za-z0-9._-]+$/.test(part));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw Error('native_studio_prebundled_stage_unverified'); };

async function safeBytes(root, relative, expected) {
  if (!safePath(relative) || !Number.isSafeInteger(expected.bytes) ||
      expected.bytes < 0 || expected.bytes > 64 * 1024 * 1024 ||
      !SHA.test(expected.sha256)) fail();
  let path = root;
  for (const part of relative.split('/')) {
    path = join(path, part);
    const info = await lstat(path);
    if (info.isSymbolicLink()) fail();
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size !== expected.bytes) fail();
    const bytes = await handle.readFile();
    if (bytes.length !== expected.bytes || hash(bytes) !== expected.sha256) fail();
    return bytes;
  } finally { await handle.close(); }
}

async function put(root, relative, bytes) {
  if (!safePath(relative)) fail();
  const path = join(root, relative);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
}

/** The caller supplies an already restored artifact directory and a bundle
 * receipt verified against its metafile. This helper rechecks the stored
 * receipt, build handoff, and all copied bytes before assembling the package.
 * No Git, Wrangler, build command, provider call, or credential is used here.
 */
export async function stagePrebundledStudioDeploy(input, deps = {}) {
  const { artifactProject, store, sourceId, commit, workerId, site, scope,
    bundleReceipt } = input ?? {};
  if (typeof artifactProject !== 'string' || !isAbsolute(artifactProject) ||
      !store || typeof store.read !== 'function' ||
      typeof store.getBytes !== 'function' || !SHA.test(sourceId) ||
      !COMMIT.test(commit) || !HEX32.test(workerId) || !scope || !site ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      scope.siteId !== site.siteId || !HEX32.test(site.accountId) ||
      !bundleReceipt || typeof bundleReceipt !== 'object') fail();
  const artifactRoot = resolve(artifactProject);
  const info = await lstat(artifactRoot);
  if (!info.isDirectory() || info.isSymbolicLink() ||
      await realpath(artifactRoot) !== artifactRoot) fail();
  const source = await (deps.readSource ?? readStoredVerifiedAstroStudio)(
    { store, sourceId, site });
  const sourceEntry = source?.receipt?.files?.find(file =>
    file.path === 'studio/cloudflare/wrangler.jsonc');
  const config = source?.files?.find(file =>
    file.path === 'studio/cloudflare/wrangler.jsonc');
  if (!sourceEntry || !config || !Buffer.isBuffer(config.body) ||
      config.body.length !== sourceEntry.bytes ||
      hash(config.body) !== sourceEntry.sha256) fail();
  const handoff = await store.read(HANDOFF);
  if (!handoff || handoff.sourceId !== sourceId ||
      handoff.commit !== commit || handoff.workerId !== workerId ||
      !same(handoff.scope, scope) ||
      !same(handoff.site, { siteId: site.siteId,
        repository: site.repository, branch: site.branch,
        studioOrigin: site.studioOrigin, accountId: site.accountId }) ||
      !Array.isArray(handoff.files) || handoff.files.length < 2 ||
      !handoff.files.some(file => file.path.startsWith('studio/dist/')) ||
      !handoff.files.some(file => file.path.startsWith('dist/'))) fail();
  const scanned = await scanStudioBuildOutputs(artifactRoot);
  if (!same(scanned, handoff.files)) fail();
  const storedBundle = await store.read(BUNDLE);
  if (!same(storedBundle, bundleReceipt) ||
      !same(bundleReceipt.scope, scope) ||
      bundleReceipt.sourceId !== sourceId ||
      bundleReceipt.commit !== commit ||
      bundleReceipt.workerId !== workerId ||
      bundleReceipt.siteId !== site.siteId ||
      bundleReceipt.accountId !== site.accountId ||
      !Array.isArray(bundleReceipt.files) ||
      bundleReceipt.files.length < 1 || bundleReceipt.files.length > 256) fail();
  const root = await realpath(await mkdtemp(join(tmpdir(),
    'gnr8-prebundled-deploy-')));
  let prepared;
  try {
    await put(root, 'studio/cloudflare/wrangler.jsonc', config.body);
    for (const file of handoff.files) {
      if (!file.path.startsWith('studio/dist/')) continue;
      await put(root, file.path, await safeBytes(artifactRoot, file.path, file));
    }
    const seen = new Set();
    let bundleTotal = 0;
    for (const file of bundleReceipt.files) {
      if (!safePath(file.path) || seen.has(file.path) ||
          !Number.isSafeInteger(file.bytes) || file.bytes < 1 ||
          file.bytes > 64 * 1024 * 1024 || !SHA.test(file.sha256) ||
          !Array.isArray(file.chunks) || !file.chunks.length) fail();
      bundleTotal += file.bytes;
      if (bundleTotal > 128 * 1024 * 1024 ||
          file.chunks.length > Math.ceil(file.bytes / (8 * 1024 * 1024)) + 1)
        fail();
      seen.add(file.path);
      const parts = [];
      let total = 0;
      for (const chunk of file.chunks) {
        if (!Number.isSafeInteger(chunk.bytes) || chunk.bytes < 1 ||
            chunk.bytes > 8 * 1024 * 1024 || !SHA.test(chunk.sha256)) fail();
        const bytes = await store.getBytes(chunk.sha256);
        if (!Buffer.isBuffer(bytes) || bytes.length !== chunk.bytes ||
            hash(bytes) !== chunk.sha256) fail();
        total += bytes.length;
        if (total > file.bytes) fail();
        parts.push(bytes);
      }
      const bytes = Buffer.concat(parts);
      if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) fail();
      await put(root, `worker-bundle/${file.path}`, bytes);
    }
    const studio = join(root, 'studio');
    const bundleRoot = join(root, 'worker-bundle');
    prepared = await (deps.prepareConfig ?? preparePrebundledStudioDeployConfig)({
      studio, store, sourceId, commit, workerId, site, scope,
      originalConfigSha256: sourceEntry.sha256, deploymentRoot: root,
      bundleRoot, bundleReceipt, assetsDirectory: join(studio, 'dist'),
    });
    return { deploymentRoot: root, studio, bundleRoot,
      config: prepared, cleanup: async () => {
        await prepared.cleanup();
        await rm(root, { recursive: true, force: true });
      } };
  } catch (error) {
    if (prepared) await prepared.cleanup();
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
