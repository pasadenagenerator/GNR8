import 'server-only';
import { createHash } from 'node:crypto';
import type { Sandbox } from '@vercel/sandbox';
import { verifyStudioImageArchiveIdentity } from '../../../../scripts/stacki/studio-image-archive.mjs';

const ROOT = '/vercel/sandbox/gnr8-image-source';
const MANIFEST = '/vercel/sandbox/gnr8-image-source-manifest.json';
const ARCHIVE = '/gnr8-image/image.tar';
const MAX_FILES = 3000;
const MAX_TOTAL = 512 * 1024 * 1024;
const MAX_ARCHIVE = 8 * 1024 * 1024 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

type File = { path: string; body: Buffer };
type Scope = { agencyId: string; clientId: string; siteId: string };
type Input = { sourceId: string; commit: string; workerId: string;
  scope: Scope; site: { siteId: string; accountId: string }; files: File[] };

function safePath(path: unknown): path is string {
  return typeof path === 'string' && path.length <= 300 &&
    /^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/.test(path) &&
    !path.split('/').some(part => part === '.' || part === '..' ||
      part === '.git' || part === 'node_modules');
}

function sourceScript(manifestSha256: string) {
  return `import{createHash}from'node:crypto';import{constants}from'node:fs';
import{lstat,open}from'node:fs/promises';import{join}from'node:path';
const root=${JSON.stringify(ROOT)},manifest=${JSON.stringify(MANIFEST)};
const m=await lstat(manifest);if(!m.isFile()||m.isSymbolicLink()||m.size>2097152)process.exit(2);
const mf=await open(manifest,constants.O_RDONLY|constants.O_NOFOLLOW);
let body;try{body=await mf.readFile()}finally{await mf.close()}
if(body.length!==m.size||createHash('sha256').update(body).digest('hex')!==${JSON.stringify(manifestSha256)})process.exit(2);
const files=JSON.parse(body.toString('utf8'));
for(const item of files){const p=join(root,item.path),s=await lstat(p);
if(!s.isFile()||s.isSymbolicLink()||s.size!==item.bytes)process.exit(2);
const f=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
try{const h=createHash('sha256');let n=0;
for await(const c of f.createReadStream({autoClose:false})){n+=c.length;
if(n>item.bytes)process.exit(2);h.update(c)}
if(n!==item.bytes||h.digest('hex')!==item.sha256)process.exit(2)}finally{await f.close()}}
console.log('verified')`;
}

const archiveScript = `import{createHash}from'node:crypto';import{constants}from'node:fs';
import{lstat,open}from'node:fs/promises';const p=${JSON.stringify(ARCHIVE)};
const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size<1||
s.size>${MAX_ARCHIVE})process.exit(2);
const f=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
try{const h=createHash('sha256');let n=0;
for await(const c of f.createReadStream({autoClose:false})){n+=c.length;
if(n>${MAX_ARCHIVE})process.exit(2);h.update(c)}
if(n!==s.size)process.exit(2);
console.log(JSON.stringify({bytes:n,sha256:h.digest('hex')}))}finally{await f.close()}`;

async function command(sandbox: Pick<Sandbox, 'runCommand'>,
  cmd: string, args: string[], cwd?: string, timeoutMs = 60_000) {
  const result = await sandbox.runCommand({ cmd, args, cwd, timeoutMs,
    env: { CI: '1' } });
  if (result.exitCode !== 0) throw Error('native_studio_drive_image_command_failed');
  return (await result.stdout()).trim();
}

/** Build the pinned Stacki source in a credential-free Docker Sandbox. The
 * only output crossing the VM boundary is a scoped archive identity. */
export async function buildNativeStudioDriveImage(
  sandbox: Pick<Sandbox, 'runCommand' | 'writeFiles'>,
  archivePath: string, input: Input,
) {
  if (archivePath !== ARCHIVE || !input || !SHA.test(input.sourceId) ||
      !COMMIT.test(input.commit) || !HEX32.test(input.workerId) ||
      !input.scope || ![input.scope.agencyId, input.scope.clientId,
        input.scope.siteId].every(value => UUID.test(value)) ||
      !input.site || input.site.siteId !== input.scope.siteId ||
      !HEX32.test(input.site.accountId) ||
      !Array.isArray(input.files) || input.files.length < 4 ||
      input.files.length > MAX_FILES)
    throw Error('native_studio_drive_image_input_invalid');
  const files = new Map<string, Buffer>();
  let total = 0;
  for (const file of input.files) {
    if (!file || !safePath(file.path) || !Buffer.isBuffer(file.body) ||
        file.body.length > 64 * 1024 * 1024 || files.has(file.path))
      throw Error('native_studio_drive_image_input_invalid');
    total += file.body.length;
    if (total > MAX_TOTAL) throw Error('native_studio_drive_image_input_invalid');
    files.set(file.path, file.body);
  }
  const dockerfile = files.get('studio/Dockerfile');
  const packageJson = files.get('package.json');
  const lock = files.get('package-lock.json');
  if (!dockerfile || !packageJson || !lock ||
      !dockerfile.toString('utf8').split(/\r?\n/).some(line =>
        /^COPY \.studio-image\/site \/opt\/site\s*$/.test(line)) ||
      [...files.keys()].some(path => path === 'studio/.studio-image' ||
        path.startsWith('studio/.studio-image/')))
    throw Error('native_studio_drive_image_context_invalid');
  const listed = [...files].map(([path, body]) => ({ path, bytes: body.length,
    sha256: createHash('sha256').update(body).digest('hex') }));
  const manifestBody = Buffer.from(JSON.stringify(listed));
  if (manifestBody.length > 2 * 1024 * 1024)
    throw Error('native_studio_drive_image_input_invalid');
  const manifestSha256 = createHash('sha256').update(manifestBody).digest('hex');
  const clean = await sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e',
      `import{lstat}from'node:fs/promises';for(const p of ${JSON.stringify([ROOT, MANIFEST, ARCHIVE])}){try{await lstat(p);process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}}`],
    timeoutMs: 60_000, env: { CI: '1' } });
  if (clean.exitCode !== 0) throw Error('native_studio_drive_image_snapshot_dirty');
  await sandbox.writeFiles([...files].map(([path, content]) => ({
    path: `${ROOT}/${path}`, content,
  })).concat([
    { path: `${ROOT}/studio/.studio-image/site/package.json`, content: packageJson },
    { path: `${ROOT}/studio/.studio-image/site/package-lock.json`, content: lock },
    { path: MANIFEST, content: manifestBody },
  ]));
  const check = async () => command(sandbox, 'node',
    ['--input-type=module', '-e', sourceScript(manifestSha256)], ROOT, 5 * 60_000);
  if (await check() !== 'verified')
    throw Error('native_studio_drive_image_source_changed');
  const tag = `gnr8-${input.site.siteId}-studio:${input.sourceId.slice(0, 32)}`;
  await command(sandbox, 'docker', ['build', '--platform', 'linux/amd64',
    '--file', 'Dockerfile', '--tag', tag, '.'], `${ROOT}/studio`, 20 * 60_000);
  await command(sandbox, 'docker', ['save', '--output', ARCHIVE, tag],
    `${ROOT}/studio`, 10 * 60_000);
  if (await check() !== 'verified')
    throw Error('native_studio_drive_image_source_changed');
  const output = await command(sandbox, 'node',
    ['--input-type=module', '-e', archiveScript], ROOT, 10 * 60_000);
  let archive: unknown;
  try { archive = JSON.parse(output); }
  catch { throw Error('native_studio_drive_image_archive_invalid'); }
  const receipt = { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, scope: input.scope,
    siteId: input.site.siteId, accountId: input.site.accountId, archive };
  verifyStudioImageArchiveIdentity({ ...input, archivePath, receipt });
  return receipt;
}
