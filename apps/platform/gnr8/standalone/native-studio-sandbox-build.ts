import 'server-only';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Sandbox } from '@vercel/sandbox';

const ROOT = '/vercel/sandbox/gnr8-native-build';
const MANIFEST = '/vercel/sandbox/gnr8-native-build-manifest.json';
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const SHA = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
type File = { path: string; body: Buffer };
type Output = { path: string; bytes: number; sha256: string };

function safePath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 300 &&
    !path.includes('\\') && !path.includes('\0') && !path.startsWith('/') &&
    path.split('/').every(part => part && part !== '.' && part !== '..');
}

function outputs(value: unknown): Output[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_FILES)
    throw Error('native_studio_sandbox_build_manifest_invalid');
  const seen = new Set<string>();
  let total = 0;
  const files: Output[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw Error('native_studio_sandbox_build_manifest_invalid');
    const file = entry as Record<string, unknown>;
    if (!safePath(file.path) ||
        !(file.path.startsWith('dist/') || file.path.startsWith('studio/dist/')) ||
        !Number.isSafeInteger(file.bytes) || Number(file.bytes) < 0 ||
        Number(file.bytes) > MAX_FILE_BYTES ||
        typeof file.sha256 !== 'string' || !SHA.test(file.sha256) ||
        seen.has(file.path))
      throw Error('native_studio_sandbox_build_manifest_invalid');
    seen.add(file.path);
    total += Number(file.bytes);
    if (total > MAX_TOTAL_BYTES)
      throw Error('native_studio_sandbox_build_manifest_invalid');
    files.push({ path: file.path, bytes: Number(file.bytes), sha256: file.sha256 });
  }
  if (!files.some(file => file.path.startsWith('dist/')) ||
      !files.some(file => file.path.startsWith('studio/dist/')))
    throw Error('native_studio_sandbox_build_manifest_invalid');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export const nativeStudioBuildManifestScript = (root: string, out: string) =>
`import{lstat,readdir,readFile,writeFile}from'node:fs/promises';
import{join}from'node:path';import{createHash}from'node:crypto';
const root=${JSON.stringify(root)},out=${JSON.stringify(out)};
const files=[];let total=0;
async function walk(path){const full=join(root,path),s=await lstat(full);
if(s.isSymbolicLink())throw Error('symlink');
if(s.isDirectory()){for(const name of (await readdir(full)).sort()){
if(!name||name==='.'||name==='..'||name.includes('/')||name.includes('\\\\'))throw Error('path');
await walk(path+'/'+name)}return}
if(!s.isFile()||s.size>67108864||files.length>=20000)throw Error('limit');
total+=s.size;if(total>536870912)throw Error('limit');
const body=await readFile(full);if(body.length!==s.size)throw Error('changed');
files.push({path,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})}
await walk('dist');await walk('studio/dist');
await writeFile(out,JSON.stringify(files),{flag:'wx',mode:384});`;

async function readBounded(sandbox: Sandbox, path: string, limit: number): Promise<Buffer> {
  const stream = await sandbox.readFile({ path }, { signal: AbortSignal.timeout(30_000) });
  if (!stream) throw Error('native_studio_sandbox_build_output_missing');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > limit) throw Error('native_studio_sandbox_build_output_limit');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

/** Runs verified source bytes in a credential-free, ephemeral build Sandbox.
 * Only npm registry reads are permitted. The returned directory contains only
 * bounded, hashed build output; a separate trusted job must verify the handoff.
 */
export async function runNativeStudioSandboxBuild(input: {
  siteId: string; sourceId: string; snapshotId: string; files: File[];
}, sdk: Pick<typeof Sandbox, 'create'> = Sandbox) {
  if (!input || !UUID.test(input.siteId) || !SHA.test(input.sourceId) ||
      !/^snap_[A-Za-z0-9]+$/.test(input.snapshotId) ||
      !Array.isArray(input.files) || input.files.length < 1 ||
      input.files.length > MAX_FILES)
    throw Error('native_studio_sandbox_build_input_invalid');
  const seen = new Set<string>();
  let total = 0;
  for (const file of input.files) {
    if (!file || !safePath(file.path) ||
        file.path.split('/').some(part => part === '.git' || part === 'node_modules') ||
        !Buffer.isBuffer(file.body) || file.body.length > MAX_FILE_BYTES ||
        seen.has(file.path))
      throw Error('native_studio_sandbox_build_input_invalid');
    seen.add(file.path);
    total += file.body.length;
    if (total > MAX_TOTAL_BYTES) throw Error('native_studio_sandbox_build_input_invalid');
  }
  let sandbox: Sandbox;
  try { sandbox = await sdk.create({
    name: `gnr8-nb-${input.siteId}-${input.sourceId.slice(0,8)}`,
    source: { type: 'snapshot', snapshotId: input.snapshotId },
    persistent: false, timeout: 30 * 60_000, resources: { vcpus: 2 },
    ports: [], region: 'iad1',
    networkPolicy: { allow: { 'registry.npmjs.org': [
      { match: { method: ['GET', 'HEAD'] }, transform: [] },
      { response: { statusCode: 403 } },
    ] } },
  }); }
  catch { throw Error('native_studio_sandbox_build_unavailable'); }
  let artifactDir: string | null = null;
  try {
    const version = await sandbox.runCommand({ cmd: 'node', args: ['--version'] });
    if (version.exitCode !== 0 || (await version.stdout()).trim() !== 'v26.13.0')
      throw Error('native_studio_sandbox_build_toolchain_mismatch');
    const clean = await sandbox.runCommand({ cmd: 'node',
      args: ['--input-type=module', '-e',
        `import{lstat}from'node:fs/promises';for(const p of ${JSON.stringify([ROOT,MANIFEST])}){try{await lstat(p);process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}}`],
      timeoutMs: 30_000 });
    if (clean.exitCode !== 0)
      throw Error('native_studio_sandbox_build_snapshot_dirty');
    await sandbox.writeFiles(input.files.map(file => ({
      path: `${ROOT}/${file.path}`, content: file.body,
    })));
    for (const cwd of [ROOT, `${ROOT}/studio`]) {
      const install = await sandbox.runCommand({ cmd: 'npm',
        args: ['ci', '--no-audit', '--no-fund'], cwd, timeoutMs: 10 * 60_000,
        env: { CI: '1' } });
      if (install.exitCode !== 0) throw Error('native_studio_sandbox_build_install_failed');
    }
    for (const cwd of [ROOT, `${ROOT}/studio`]) {
      const build = await sandbox.runCommand({ cmd: 'npm',
        args: ['run', 'build'], cwd, timeoutMs: 10 * 60_000,
        env: { CI: '1' } });
      if (build.exitCode !== 0) throw Error('native_studio_sandbox_build_failed');
    }
    for (const file of input.files) {
      const current = await readBounded(sandbox, `${ROOT}/${file.path}`, file.body.length);
      if (!current.equals(file.body))
        throw Error('native_studio_sandbox_build_source_changed');
    }
    const scan = await sandbox.runCommand({ cmd: 'node',
      args: ['--input-type=module', '-e', nativeStudioBuildManifestScript(ROOT, MANIFEST)], cwd: ROOT,
      timeoutMs: 60_000 });
    if (scan.exitCode !== 0) throw Error('native_studio_sandbox_build_output_invalid');
    const listed = outputs(JSON.parse((await readBounded(sandbox, MANIFEST, 8 * 1024 * 1024)).toString()));
    artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-native-build-artifact-'));
    for (const file of listed) {
      const bytes = await readBounded(sandbox, `${ROOT}/${file.path}`, file.bytes);
      if (bytes.length !== file.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== file.sha256)
        throw Error('native_studio_sandbox_build_output_changed');
      const path = join(artifactDir, file.path);
      await mkdir(dirname(path), { recursive: true });
      const handle = await open(path, 'wx', 0o600);
      try { await handle.writeFile(bytes); }
      finally { await handle.close(); }
    }
    return { artifactDir, files: listed, sourceId: input.sourceId };
  } catch (error) {
    if (artifactDir) await rm(artifactDir, { recursive: true, force: true });
    if (error instanceof Error && /^native_studio_sandbox_build_[a-z0-9_]+$/.test(error.message))
      throw error;
    throw Error('native_studio_sandbox_build_unavailable');
  } finally {
    try { await sandbox.stop(); }
    catch {
      if (artifactDir) await rm(artifactDir, { recursive: true, force: true });
      throw Error('native_studio_sandbox_build_stop_failed');
    }
  }
}
