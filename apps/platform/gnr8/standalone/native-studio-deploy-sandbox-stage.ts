import 'server-only';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { NetworkPolicy, Sandbox } from '@vercel/sandbox';

export const NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT =
  '/vercel/sandbox/gnr8-deploy-package';
const MANIFEST = '/vercel/sandbox/gnr8-deploy-package-manifest.json';
const MAX_FILES = 20_260;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 640 * 1024 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const hash = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fail = () => { throw Error('native_studio_deploy_package_unverified'); };

type Staged = { deploymentRoot: string; studio: string; bundleRoot: string;
  config: { relative: string; entry: string; image: string } };
export type NativeStudioDeploySandboxAttestation = {
  siteId: string; accountId: string;
  sourceId: string; snapshotId: string; sessionId: string;
  networkPolicy: NetworkPolicy; sandboxTimeoutMs: number;
  sandbox: Pick<Sandbox, 'name' | 'status' | 'sourceSnapshotId' |
    'region' | 'persistent' | 'timeout' | 'networkPolicy' | 'mounts' |
    'expiresAt' | 'currentSession' | 'runCommand' | 'writeFiles'> };
type Input = NativeStudioDeploySandboxAttestation & { staged: Staged };
type Listed = { path: string; bytes: number; sha256: string };

function safePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 &&
    value.length <= 300 && !/[\\\x00-\x1f\x7f]/.test(value) &&
    !value.startsWith('/') && value.split('/').every(part => part &&
      part !== '.' && part !== '..' && part !== '.git' &&
      part !== 'node_modules');
}

function attest(input: NativeStudioDeploySandboxAttestation) {
  const sandbox = input.sandbox;
  if (!UUID.test(input.siteId) || !/^[a-f0-9]{32}$/.test(input.accountId) ||
      !SHA.test(input.sourceId) || !SNAPSHOT.test(input.snapshotId) ||
      !ID.test(input.sessionId) || !input.networkPolicy ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 15 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000 || !sandbox ||
      sandbox.name !== `gnr8-deploy-${input.siteId}-${input.sourceId.slice(0, 12)}` ||
      sandbox.status !== 'running' ||
      sandbox.sourceSnapshotId !== input.snapshotId ||
      sandbox.currentSession().sessionId !== input.sessionId ||
      sandbox.region !== 'iad1' || sandbox.persistent !== false ||
      sandbox.timeout !== input.sandboxTimeoutMs ||
      !same(sandbox.networkPolicy, input.networkPolicy) ||
      Object.keys(sandbox.mounts ?? {}).length !== 0 ||
      !(sandbox.expiresAt instanceof Date) ||
      sandbox.expiresAt.getTime() - Date.now() < 10 * 60_000)
    fail();
}

async function localFiles(input: Input) {
  const staged = input.staged;
  if (!staged || ![staged.deploymentRoot, staged.studio, staged.bundleRoot]
        .every(path => typeof path === 'string' && isAbsolute(path)) ||
      !staged.config ||
      !/^cloudflare\/\.gnr8-deploy-[a-f0-9-]+\.jsonc$/.test(staged.config.relative) ||
      !isAbsolute(staged.config.entry) ||
      typeof staged.config.image !== 'string') fail();
  const root = resolve(staged.deploymentRoot);
  if (resolve(staged.studio) !== join(root, 'studio') ||
      resolve(staged.bundleRoot) !== join(root, 'worker-bundle') ||
      await realpath(root) !== root) fail();
  const entry = relative(staged.bundleRoot, staged.config.entry);
  if (!safePath(entry) || !entry.endsWith('.js') ||
      staged.config.entry !== join(staged.bundleRoot, entry)) fail();
  const image = `registry.cloudflare.com/${input.accountId}/gnr8-${input.siteId}-studio@sha256:`;
  if (!staged.config.image.startsWith(image) ||
      !SHA.test(staged.config.image.slice(image.length))) fail();
  const configPath = `studio/${staged.config.relative}`;
  for (const path of ['studio', 'worker-bundle', 'studio/cloudflare',
    'studio/cloudflare/wrangler.jsonc', configPath]) {
    const info = await lstat(join(root, path));
    if (info.isSymbolicLink()) fail();
  }
  const config = JSON.parse(await readFile(join(root, configPath), 'utf8'));
  const original = JSON.parse(await readFile(
    join(root, 'studio/cloudflare/wrangler.jsonc'), 'utf8'));
  if (config.main !== staged.config.entry ||
      config.assets?.directory !== join(staged.studio, 'dist') ||
      config.no_bundle !== true || config.find_additional_modules !== false ||
      !Array.isArray(config.containers) || config.containers.length !== 1 ||
      config.containers[0]?.image !== staged.config.image ||
      'build' in config || 'rules' in config || 'site' in config ||
      original.account_id !== input.accountId ||
      original.name !== `gnr8-${input.siteId}-studio` ||
      !['../src/cloudflare/worker.ts', './gnr8-worker-entry.ts'].includes(original.main) ||
      original.assets?.directory !== '../dist' ||
      !Array.isArray(original.containers) || original.containers.length !== 1 ||
      original.containers[0]?.image !== '../Dockerfile' ||
      !same(config, { ...original, main: staged.config.entry,
        no_bundle: true, find_additional_modules: false,
        assets: { ...original.assets, directory: join(staged.studio, 'dist') },
        containers: [{ ...original.containers[0],
          image: staged.config.image }] })) fail();
  const remoteEntry = `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/worker-bundle/${entry}`;
  const remoteAssets = `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio/dist`;
  const remoteConfig = Buffer.from(JSON.stringify({ ...config,
    main: remoteEntry, assets: { ...config.assets,
      directory: remoteAssets } }) + '\n');
  const files: Listed[] = [];
  let total = 0;
  async function walk(dir: string, prefix = ''): Promise<void> {
    const info = await lstat(dir);
    if (info.isSymbolicLink() || !info.isDirectory()) fail();
    for (const name of (await readdir(dir)).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!safePath(path)) fail();
      const full = join(dir, name);
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) fail();
      if (stat.isDirectory()) { await walk(full, path); continue; }
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES ||
          files.length >= MAX_FILES) fail();
      if (path !== 'studio/cloudflare/wrangler.jsonc' &&
          path !== configPath && !path.startsWith('studio/dist/') &&
          !path.startsWith('worker-bundle/')) fail();
      const body = path === configPath ? remoteConfig : await readFile(full);
      if (path !== configPath && body.length !== stat.size) fail();
      if (body.length > MAX_FILE_BYTES) fail();
      total += body.length;
      if (total > MAX_TOTAL_BYTES) fail();
      files.push({ path, bytes: body.length, sha256: hash(body) });
    }
  }
  await walk(root);
  if (!files.some(file => file.path === configPath) ||
      !files.some(file => file.path === 'studio/cloudflare/wrangler.jsonc') ||
      !files.some(file => file.path === `worker-bundle/${entry}`) ||
      !files.some(file => file.path.startsWith('studio/dist/'))) fail();
  return { files, configPath, remoteEntry, remoteConfig };
}

function remoteVerify(expectedSha256: string) { return `import{lstat,readdir,readFile}from'node:fs/promises';
import{join}from'node:path';import{createHash}from'node:crypto';
const root=${JSON.stringify(NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT)},manifest=${JSON.stringify(MANIFEST)};
const m=await lstat(manifest);if(!m.isFile()||m.isSymbolicLink()||m.size>4194304)process.exit(2);
const mb=await readFile(manifest);if(createHash('sha256').update(mb).digest('hex')!==${JSON.stringify(expectedSha256)})process.exit(2);
const expected=JSON.parse(mb);
const actual=[];let total=0;
async function walk(path){const full=path?join(root,path):root,s=await lstat(full);
if(s.isSymbolicLink())process.exit(2);
if(s.isDirectory()){for(const name of (await readdir(full)).sort()){
if(!name||name==='.'||name==='..'||name.includes('/')||name.includes('\\\\'))process.exit(2);
await walk(path?path+'/'+name:name)}return}
if(!s.isFile()||s.size>67108864||actual.length>=20260)process.exit(2);
total+=s.size;if(total>671088640)process.exit(2);
const body=await readFile(full);if(body.length!==s.size)process.exit(2);
actual.push({path,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})}
await walk('');actual.sort((a,b)=>a.path.localeCompare(b.path));
if(JSON.stringify(actual)!==JSON.stringify(expected))process.exit(2);
console.log('verified')`; }

/** Rehash the entire remote package on every invocation before credentials. */
export async function verifyNativeStudioDeployPackageInSandbox(
  input: NativeStudioDeploySandboxAttestation & { manifestSha256: string },
) {
  attest(input);
  if (!SHA.test(input.manifestSha256)) fail();
  const verified = await input.sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e', remoteVerify(input.manifestSha256)],
    cwd: NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT, timeoutMs: 5 * 60_000,
    env: { CI: '1' } });
  if (verified.exitCode !== 0 || (await verified.stdout()).trim() !== 'verified')
    fail();
  attest(input);
}

/** Transfer only an already verified, credential-free package. Never invoke
 * Wrangler or load a Cloudflare credential in this step. */
export async function stageNativeStudioDeployPackageInSandbox(input: Input) {
  attest(input);
  const { files, configPath, remoteEntry, remoteConfig } = await localFiles(input);
  const manifest = Buffer.from(JSON.stringify([...files].sort((a, b) =>
    a.path.localeCompare(b.path))));
  if (manifest.length > 4 * 1024 * 1024) fail();
  const clean = await input.sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e',
      `import{lstat}from'node:fs/promises';for(const p of ${JSON.stringify([NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT, MANIFEST])}){try{await lstat(p);process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}}`],
    timeoutMs: 30_000, env: { CI: '1' } });
  if (clean.exitCode !== 0) fail();
  for (const file of files) {
    attest(input);
    const body = file.path === configPath ? remoteConfig :
      await readFile(join(input.staged.deploymentRoot, file.path));
    if (body.length !== file.bytes || hash(body) !== file.sha256) fail();
    await input.sandbox.writeFiles([{ path:
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/${file.path}`,
      content: body }]);
  }
  await input.sandbox.writeFiles([{ path: MANIFEST, content: manifest }]);
  attest(input);
  await verifyNativeStudioDeployPackageInSandbox({ ...input,
    manifestSha256: hash(manifest) });
  return { root: NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT,
    studio: `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio`,
    config: input.staged.config.relative,
    entry: remoteEntry, manifestSha256: hash(manifest) };
}
