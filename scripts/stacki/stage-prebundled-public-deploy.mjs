/** Assemble the public deploy from immutable build and Worker bundle bytes. */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { readStoredVerifiedAstroStudio } from './prepare-from-confirmed-export.mjs';

const HANDOFF = 'native-studio/build-handoff-v1.json';
const BUNDLE = 'native-studio/public-worker-bundle-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hash = body => createHash('sha256').update(body).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = () => { throw Error('native_studio_public_package_unverified'); };
const safe = path => typeof path === 'string' && path.length > 0 &&
  path.length <= 300 && !path.includes('\\') && !path.includes('\0') &&
  !path.startsWith('/') && path.split('/').every(part => part &&
    part !== '.' && part !== '..' && /^[A-Za-z0-9._@+-]+$/.test(part));

async function readExact(root, file) {
  if (!safe(file.path) || !Number.isSafeInteger(file.bytes) ||
      file.bytes < 0 || file.bytes > 64 * 1024 * 1024 ||
      !SHA.test(file.sha256)) fail();
  let path = root;
  for (const part of file.path.split('/')) {
    path = join(path, part);
    if ((await lstat(path)).isSymbolicLink()) fail();
  }
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size !== file.bytes) fail();
    const body = await handle.readFile();
    if (body.length !== file.bytes || hash(body) !== file.sha256) fail();
    return body;
  } finally { await handle.close(); }
}

async function put(root, path, body) {
  if (!safe(path)) fail();
  const full = join(root, path);
  await mkdir(dirname(full), { recursive: true, mode: 0o700 });
  await writeFile(full, body, { flag: 'wx', mode: 0o600 });
}

export async function stagePrebundledPublicDeploy(input, deps = {}) {
  const { artifactProject, store, scope, site, sourceId, commit,
    studioWorkerId, publicWorkerId, bundleReceipt } = input ?? {};
  if (!isAbsolute(artifactProject ?? '') || !store ||
      typeof store.read !== 'function' || typeof store.getBytes !== 'function' ||
      !scope || ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => UUID.test(value)) || site?.siteId !== scope.siteId ||
      !HEX32.test(site.accountId) || !SHA.test(sourceId) ||
      !COMMIT.test(commit) || !HEX32.test(studioWorkerId) ||
      !HEX32.test(publicWorkerId) || !bundleReceipt) fail();
  const artifactPath = resolve(artifactProject);
  if (!(await lstat(artifactPath)).isDirectory()) fail();
  const artifactRoot = await realpath(artifactPath);
  const source = await (deps.readSource ?? readStoredVerifiedAstroStudio)(
    { store, sourceId, site });
  const configEntry = source?.receipt?.files?.find(file =>
    file.path === 'wrangler.json');
  const configFile = source?.files?.find(file => file.path === 'wrangler.json');
  if (!configEntry || !configFile || !Buffer.isBuffer(configFile.body) ||
      configFile.body.length !== configEntry.bytes ||
      hash(configFile.body) !== configEntry.sha256) fail();
  const config = JSON.parse(configFile.body.toString('utf8'));
  const domain = new URL(site.studioOrigin).hostname;
  if (config.account_id !== site.accountId ||
      config.name !== `gnr8-${site.siteId}-site` ||
      config.main !== './studio/src/cloudflare/site.ts' ||
      config.assets?.directory !== './dist' ||
      !same(config.routes, [{ pattern: domain, custom_domain: true }]) ||
      !same(config.services, [{ binding: 'STUDIO',
        service: `gnr8-${site.siteId}-studio` }]) ||
      'build' in config || 'rules' in config || 'site' in config) fail();
  const handoff = await store.read(HANDOFF);
  if (!handoff || handoff.sourceId !== sourceId || handoff.commit !== commit ||
      handoff.workerId !== studioWorkerId || !same(handoff.scope, scope) ||
      !same(handoff.site, { siteId: site.siteId,
        repository: site.repository, branch: site.branch,
        studioOrigin: site.studioOrigin, accountId: site.accountId }) ||
      !Array.isArray(handoff.files) ||
      !handoff.files.some(file => file.path.startsWith('dist/')) ||
      !same(await scanStudioBuildOutputs(artifactRoot), handoff.files)) fail();
  if (!same(await store.read(BUNDLE), bundleReceipt) ||
      !same(bundleReceipt.scope, scope) ||
      bundleReceipt.siteId !== site.siteId ||
      bundleReceipt.accountId !== site.accountId ||
      bundleReceipt.sourceId !== sourceId ||
      bundleReceipt.commit !== commit ||
      bundleReceipt.workerId !== publicWorkerId ||
      !safe(bundleReceipt.entryPath) ||
      !Array.isArray(bundleReceipt.files) ||
      bundleReceipt.files.length < 1 || bundleReceipt.files.length > 256 ||
      !bundleReceipt.files.some(file => file.path === bundleReceipt.entryPath))
    fail();
  const root = await realpath(await mkdtemp(join(tmpdir(),
    'gnr8-public-package-')));
  try {
    await put(root, 'wrangler.json', configFile.body);
    for (const file of handoff.files) {
      if (file.path.startsWith('dist/'))
        await put(root, file.path, await readExact(artifactRoot, file));
    }
    const seen = new Set();
    let total = 0;
    for (const file of bundleReceipt.files) {
      if (!safe(file.path) || seen.has(file.path) ||
          !Number.isSafeInteger(file.bytes) || file.bytes < 1 ||
          file.bytes > 64 * 1024 * 1024 || !SHA.test(file.sha256) ||
          !Array.isArray(file.chunks) || !file.chunks.length) fail();
      seen.add(file.path);
      total += file.bytes;
      if (total > 128 * 1024 * 1024) fail();
      const parts = [];
      let length = 0;
      for (const chunk of file.chunks) {
        if (!Number.isSafeInteger(chunk.bytes) || chunk.bytes < 1 ||
            chunk.bytes > 8 * 1024 * 1024 || !SHA.test(chunk.sha256)) fail();
        const body = await store.getBytes(chunk.sha256);
        if (!Buffer.isBuffer(body) || body.length !== chunk.bytes ||
            hash(body) !== chunk.sha256) fail();
        length += body.length;
        if (length > file.bytes) fail();
        parts.push(body);
      }
      const body = Buffer.concat(parts);
      if (body.length !== file.bytes || hash(body) !== file.sha256) fail();
      await put(root, `worker-bundle/${file.path}`, body);
    }
    const entry = join(root, 'worker-bundle', bundleReceipt.entryPath);
    const derived = { ...config, main: entry, no_bundle: true,
      find_additional_modules: false,
      assets: { ...config.assets, directory: join(root, 'dist') } };
    const relativeConfig = `.gnr8-public-${randomUUID()}.json`;
    await put(root, relativeConfig, Buffer.from(JSON.stringify(derived) + '\n'));
    return { deploymentRoot: root, bundleRoot: join(root, 'worker-bundle'),
      config: relativeConfig, entry,
      cleanup: () => rm(root, { recursive: true, force: true }) };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
