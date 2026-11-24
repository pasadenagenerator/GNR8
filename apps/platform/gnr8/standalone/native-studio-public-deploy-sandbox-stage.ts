import 'server-only';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { NetworkPolicy, Sandbox } from '@vercel/sandbox';

export const PUBLIC_PACKAGE = '/vercel/sandbox/gnr8-public-deploy-package';
const MANIFEST = '/vercel/sandbox/gnr8-public-deploy-manifest.json';
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const hash = (body: Buffer | string) =>
  createHash('sha256').update(body).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fail = (): never => { throw Error('native_studio_public_package_unverified'); };
const safe = (path: string) => path.length > 0 && path.length <= 300 &&
  !/[\\\x00-\x1f\x7f]/.test(path) && !path.startsWith('/') &&
  path.split('/').every(part => part && part !== '.' && part !== '..' &&
    part !== '.git' && part !== 'node_modules' &&
    /^[A-Za-z0-9._@+-]+$/.test(part));

type Attestation = { siteId: string; accountId: string; sourceId: string;
  snapshotId: string; sessionId: string; networkPolicy: NetworkPolicy;
  sandboxTimeoutMs: number;
  sandbox: Pick<Sandbox, 'name' | 'status' | 'sourceSnapshotId' |
    'region' | 'persistent' | 'timeout' | 'networkPolicy' | 'mounts' |
    'expiresAt' | 'currentSession' | 'runCommand' | 'writeFiles'> };
type Staged = { deploymentRoot: string; bundleRoot: string;
  config: string; entry: string };
type Listed = { path: string; bytes: number; sha256: string };

function attest(input: Attestation) {
  const sandbox = input.sandbox;
  if (!UUID.test(input.siteId) || !/^[a-f0-9]{32}$/.test(input.accountId) ||
      !SHA.test(input.sourceId) || !SNAPSHOT.test(input.snapshotId) ||
      !ID.test(input.sessionId) ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 30 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000 ||
      sandbox.name !== `gnr8-public-deploy-${input.siteId}-${input.sourceId.slice(0, 12)}` ||
      sandbox.status !== 'running' ||
      sandbox.sourceSnapshotId !== input.snapshotId ||
      sandbox.currentSession().sessionId !== input.sessionId ||
      sandbox.region !== 'iad1' || sandbox.persistent !== false ||
      sandbox.timeout !== input.sandboxTimeoutMs ||
      !same(sandbox.networkPolicy, input.networkPolicy) ||
      Object.keys(sandbox.mounts ?? {}).length !== 0 ||
      !(sandbox.expiresAt instanceof Date) ||
      sandbox.expiresAt.getTime() - Date.now() < 5 * 60_000) fail();
}

function verifyScript(expectedHash: string) { return `import{lstat,readdir,readFile}from'node:fs/promises';
import{join}from'node:path';import{createHash}from'node:crypto';
const root=${JSON.stringify(PUBLIC_PACKAGE)},manifest=${JSON.stringify(MANIFEST)};
const m=await lstat(manifest);if(!m.isFile()||m.isSymbolicLink()||m.size>4194304)process.exit(2);
const mb=await readFile(manifest);if(createHash('sha256').update(mb).digest('hex')!==${JSON.stringify(expectedHash)})process.exit(2);
const expected=JSON.parse(mb);const actual=[];let total=0;
async function walk(path){const full=path?join(root,path):root,s=await lstat(full);
if(s.isSymbolicLink())process.exit(2);
if(s.isDirectory()){for(const name of(await readdir(full)).sort()){
if(!name||name==='.'||name==='..'||name.includes('/')||name.includes('\\\\'))process.exit(2);
await walk(path?path+'/'+name:name)}return}
if(!s.isFile()||s.size>67108864||actual.length>=20260)process.exit(2);
total+=s.size;if(total>671088640)process.exit(2);
const body=await readFile(full);if(body.length!==s.size)process.exit(2);
actual.push({path,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})}
await walk('');actual.sort((a,b)=>a.path.localeCompare(b.path));
if(JSON.stringify(actual)!==JSON.stringify(expected))process.exit(2);
console.log('verified')`; }

export async function verifyNativeStudioPublicPackageInSandbox(
  input: Attestation & { manifestSha256: string }) {
  attest(input);
  if (!SHA.test(input.manifestSha256)) fail();
  const result = await input.sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e', verifyScript(input.manifestSha256)],
    cwd: PUBLIC_PACKAGE, timeoutMs: 5 * 60_000, env: { CI: '1' } });
  if (result.exitCode !== 0 || (await result.stdout()).trim() !== 'verified')
    fail();
  attest(input);
}

/** Transfer an exact credential-free package; the command runs later. */
export async function stageNativeStudioPublicPackageInSandbox(
  input: Attestation & { staged: Staged }) {
  attest(input);
  const staged = input.staged;
  if (!staged || !isAbsolute(staged.deploymentRoot) ||
      !isAbsolute(staged.bundleRoot) || !isAbsolute(staged.entry) ||
      !/^\.gnr8-public-[a-f0-9-]+\.json$/.test(staged.config)) fail();
  const root = resolve(staged.deploymentRoot);
  if (await realpath(root) !== root ||
      resolve(staged.bundleRoot) !== join(root, 'worker-bundle')) fail();
  const entry = relative(staged.bundleRoot, staged.entry);
  if (!safe(entry) || !entry.endsWith('.js') ||
      staged.entry !== join(staged.bundleRoot, entry)) fail();
  const original = JSON.parse(await readFile(join(root, 'wrangler.json'), 'utf8'));
  const derived = JSON.parse(await readFile(join(root, staged.config), 'utf8'));
  if (original.account_id !== input.accountId ||
      original.name !== `gnr8-${input.siteId}-site` ||
      original.main !== './studio/src/cloudflare/site.ts' ||
      original.assets?.directory !== './dist' ||
      !same(derived, { ...original, main: staged.entry, no_bundle: true,
        find_additional_modules: false,
        assets: { ...original.assets, directory: join(root, 'dist') } })) fail();
  const remoteConfig = Buffer.from(JSON.stringify({ ...derived,
    main: `${PUBLIC_PACKAGE}/worker-bundle/${entry}`,
    assets: { ...derived.assets, directory: `${PUBLIC_PACKAGE}/dist` } }) + '\n');
  const listed: Listed[] = [];
  let total = 0;
  async function walk(directory: string, prefix = ''): Promise<void> {
    if ((await lstat(directory)).isSymbolicLink()) fail();
    for (const name of (await readdir(directory)).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (!safe(path)) fail();
      const full = join(directory, name);
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) fail();
      if (stat.isDirectory()) { await walk(full, path); continue; }
      if (!stat.isFile() || stat.size > 64 * 1024 * 1024 ||
          listed.length >= 20_260 ||
          path !== 'wrangler.json' && path !== staged.config &&
          !path.startsWith('dist/') && !path.startsWith('worker-bundle/')) fail();
      const body = path === staged.config ? remoteConfig : await readFile(full);
      total += body.length;
      if (total > 640 * 1024 * 1024) fail();
      listed.push({ path, bytes: body.length, sha256: hash(body) });
    }
  }
  await walk(root);
  if (!listed.some(file => file.path === staged.config) ||
      !listed.some(file => file.path === `worker-bundle/${entry}`) ||
      !listed.some(file => file.path.startsWith('dist/'))) fail();
  const manifest = Buffer.from(JSON.stringify([...listed].sort((a, b) =>
    a.path.localeCompare(b.path))));
  if (manifest.length > 4 * 1024 * 1024) fail();
  const clean = await input.sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e',
      `import{lstat}from'node:fs/promises';for(const p of ${JSON.stringify([PUBLIC_PACKAGE, MANIFEST])}){try{await lstat(p);process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}}`],
    timeoutMs: 30_000, env: { CI: '1' } });
  if (clean.exitCode !== 0) fail();
  for (const file of listed) {
    attest(input);
    const body = file.path === staged.config ? remoteConfig :
      await readFile(join(root, file.path));
    if (body.length !== file.bytes || hash(body) !== file.sha256) fail();
    await input.sandbox.writeFiles([{ path: `${PUBLIC_PACKAGE}/${file.path}`,
      content: body }]);
  }
  await input.sandbox.writeFiles([{ path: MANIFEST, content: manifest }]);
  const manifestSha256 = hash(manifest);
  await verifyNativeStudioPublicPackageInSandbox({ ...input, manifestSha256 });
  return { root: PUBLIC_PACKAGE, config: staged.config, manifestSha256 };
}
