import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { Sandbox } from '@vercel/sandbox';
import { nativeStudioBuildManifestScript,
  runNativeStudioSandboxBuild } from './native-studio-sandbox-build';

const input = { siteId: '11111111-1111-4111-8111-111111111111',
  sourceId: 'a'.repeat(64), snapshotId: 'snap_verified', files: [
    { path: 'package.json', body: Buffer.from('{"scripts":{"build":"astro build"}}') },
    { path: 'studio/package.json', body: Buffer.from('{"scripts":{"build":"vite build"}}') },
  ] };
const output = new Map([
  ['dist/index.html', Buffer.from('<main>site</main>')],
  ['studio/dist/studio.js', Buffer.from('console.log("studio")')],
]);

function fixture() {
  const creates: Record<string, unknown>[] = [];
  const commands: Record<string, unknown>[] = [];
  const writes: unknown[] = [];
  let stops = 0;
  let manifest = [...output].map(([path, body]) => ({ path,
    bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') }));
  const served = new Map(output);
  const source = new Map(input.files.map(file => [file.path, file.body]));
  let dirty = false;
  const sandbox = {
    writeFiles: async (files: unknown) => { writes.push(files); },
    runCommand: async (command: Record<string, unknown>) => {
      commands.push(command);
      return { exitCode: dirty && String((command.args as string[]).at(-1)).includes('lstat') ? 2 : 0,
        stdout: async () => command.cmd === 'node' &&
        (command.args as string[])[0] === '--version' ? 'v26.13.0\n' : '' };
    },
    readFile: async ({ path }: { path: string }) => {
      const body = path.endsWith('-manifest.json')
        ? Buffer.from(JSON.stringify(manifest))
        : served.get(path.replace('/vercel/sandbox/gnr8-native-build/', '')) ??
          source.get(path.replace('/vercel/sandbox/gnr8-native-build/', ''));
      return body ? Readable.from([body]) : null;
    },
    stop: async () => { stops++; },
  };
  const sdk = { create: async (config: Record<string, unknown>) => {
    creates.push(config); return sandbox;
  } } as unknown as Pick<typeof Sandbox, 'create'>;
  return { sdk, creates, commands, writes, stops: () => stops,
    setManifest: (value: typeof manifest) => { manifest = value; },
    setOutput: (path: string, body: Buffer) => { served.set(path, body); },
    setSource: (path: string, body: Buffer) => { source.set(path, body); },
    setDirty: (value: boolean) => { dirty = value; } };
}

test('credential-free build receives only verified source and exports bounded output', async () => {
  const f = fixture();
  const result = await runNativeStudioSandboxBuild(input, f.sdk);
  try {
    assert.equal(f.creates.length, 1);
    const config = f.creates[0]!;
    assert.equal(config.persistent, false);
    assert.equal(config.timeout, 30 * 60_000);
    assert.deepEqual(config.ports, []);
    assert.equal(config.env, undefined);
    assert.deepEqual(config.source, { type: 'snapshot', snapshotId: input.snapshotId });
    assert.deepEqual(Object.keys((config.networkPolicy as {allow: Record<string,unknown>}).allow),
      ['registry.npmjs.org']);
    assert.equal(f.writes.length, 1);
    assert.deepEqual((f.writes[0] as Array<{path:string}>).map(file => file.path),
      input.files.map(file => `/vercel/sandbox/gnr8-native-build/${file.path}`));
    assert.deepEqual(f.commands.map(command => [command.cmd, command.cwd]), [
      ['node', undefined], ['node', undefined],
      ['npm', '/vercel/sandbox/gnr8-native-build'],
      ['npm', '/vercel/sandbox/gnr8-native-build/studio'],
      ['npm', '/vercel/sandbox/gnr8-native-build'],
      ['npm', '/vercel/sandbox/gnr8-native-build/studio'],
      ['node', '/vercel/sandbox/gnr8-native-build'],
    ]);
    assert.equal((await readFile(`${result.artifactDir}/dist/index.html`, 'utf8')),
      '<main>site</main>');
    assert.equal(f.stops(), 1);
  } finally { await rm(result.artifactDir, { recursive: true, force: true }); }
});

test('dirty snapshot is rejected before verified source upload', async () => {
  const f = fixture();
  f.setDirty(true);
  await assert.rejects(runNativeStudioSandboxBuild(input, f.sdk),
    /snapshot_dirty/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.stops(), 1);
});

test('invalid output manifest stops Sandbox before any artifact is accepted', async () => {
  const f = fixture();
  f.setManifest([{ path: '../secret', bytes: 2,
    sha256: 'b'.repeat(64) }]);
  await assert.rejects(runNativeStudioSandboxBuild(input, f.sdk),
    /manifest_invalid/);
  assert.equal(f.stops(), 1);
});

test('site-owned Git metadata and dependency trees cannot enter build Sandbox', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioSandboxBuild({ ...input,
    files: [...input.files, { path: '.git/config', body: Buffer.from('bad') }] }, f.sdk),
  /input_invalid/);
  assert.equal(f.creates.length, 0);
});

test('real output scanner lists only regular build files and rejects symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-build-scan-'));
  const manifest = join(root, 'manifest.json');
  try {
    await mkdir(join(root, 'dist'));
    await mkdir(join(root, 'studio/dist'), { recursive: true });
    await writeFile(join(root, 'dist/index.html'), '<main>site</main>');
    await writeFile(join(root, 'studio/dist/studio.js'), 'console.log(1)');
    execFileSync(process.execPath, ['--input-type=module', '-e',
      nativeStudioBuildManifestScript(root, manifest)]);
    const listed = JSON.parse(await readFile(manifest, 'utf8')) as Array<{path:string}>;
    assert.deepEqual(listed.map(file => file.path),
      ['dist/index.html', 'studio/dist/studio.js']);
    await rm(manifest);
    await symlink(join(root, 'dist/index.html'), join(root, 'dist/linked.html'));
    assert.throws(() => execFileSync(process.execPath, ['--input-type=module', '-e',
      nativeStudioBuildManifestScript(root, manifest)], { stdio: 'pipe' }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(manifest, { force: true });
  }
});

test('oversized streamed output is rejected and Sandbox is stopped', async () => {
  const f = fixture();
  f.setOutput('dist/index.html', Buffer.alloc(1024));
  await assert.rejects(runNativeStudioSandboxBuild(input, f.sdk),
    /output_limit/);
  assert.equal(f.stops(), 1);
});

test('build that changes prepared source is rejected before output scan', async () => {
  const f = fixture();
  const changed = Buffer.from(input.files[0]!.body);
  changed[0] = 0x5b;
  f.setSource('package.json', changed);
  await assert.rejects(runNativeStudioSandboxBuild(input, f.sdk),
    /source_changed/);
  assert.equal(f.stops(), 1);
});
