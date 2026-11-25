import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import test from 'node:test';
import { advanceNativeStudioDetachedSourceBuild } from
  './native-studio-detached-source-build';

const source = { siteId: '11111111-1111-4111-8111-111111111111',
  sourceId: 'a'.repeat(64), snapshotId: 'snap_verified',
  files: [
    { path: 'package.json', body: Buffer.from('{"scripts":{"build":"astro build"}}') },
    { path: 'studio/package.json', body: Buffer.from('{"scripts":{"build":"vite build"}}') },
  ] };
const output = new Map([
  ['dist/index.html', Buffer.from('<main>site</main>')],
  ['studio/dist/studio.js', Buffer.from('console.log("studio")')],
]);
const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex');

function fixture() {
  const records = new Map<string, unknown>();
  const exits = new Map<string, number | null>();
  const starts: string[] = [];
  const attempts: unknown[] = [];
  const sourceFiles = new Map(source.files.map(file => [file.path,
    Buffer.from(file.body)]));
  const served = new Map(output);
  let running = true, sessionId = 'sess_1', next = 0, failStart = false;
  let interruptAfterSource = false;
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  const input = { ...source, store };
  const manifest = [...output].map(([path, body]) => ({ path,
    bytes: body.length, sha256: hash(body) }));
  const currentSession = () => ({ sessionId,
    runCommand: async (command: { cmd: string; args: string[] }) => {
      starts.push(`${command.cmd}:${command.args[0]}`);
      if (failStart) throw Error('lost start');
      const cmdId = `cmd_${++next}`;
      exits.set(cmdId, null);
      return { cmdId };
    },
    getCommand: async (cmdId: string) => ({ exitCode: exits.get(cmdId) ?? null }),
  });
  const sandbox = { name: `gnr8-source-build-${hash(Buffer.from(`v3:${source.siteId}:${source.sourceId}`)).slice(0,32)}`,
    get status() { return running ? 'running' : 'stopped'; },
    sourceSnapshotId: source.snapshotId, region: 'iad1', persistent: true,
    timeout: 60 * 60_000,
    networkPolicy: { allow: { 'registry.npmjs.org': [] } },
    expiresAt: new Date(Date.now() + 60 * 60_000),
    currentSession,
    runCommand: async (command: { args: string[] }) => ({ exitCode: 0,
      stdout: async () => command.args[0] === '--version' ? 'v26.13.0\n' : '' }),
    writeFiles: async () => {
      if (interruptAfterSource)
        sandbox.expiresAt = new Date(Date.now() + 40 * 60_000);
    },
    readFile: async ({ path }: { path: string }) => {
      const relative = path.replace('/vercel/sandbox/gnr8-native-build/', '');
      const body = path.endsWith('-manifest.json')
        ? Buffer.from(JSON.stringify(manifest))
        : sourceFiles.get(relative) ?? served.get(relative);
      return body ? Readable.from([body]) : null;
    },
    stop: async () => { running = false; },
  };
  const sdk = { create: async (config: unknown) => {
    attempts.push(config); return sandbox; },
  get: async ({ resume }: { resume: boolean }) => {
    if (resume && !running) { running = true; sessionId = 'sess_2'; }
    return sandbox;
  } };
  const advance = () => advanceNativeStudioDetachedSourceBuild(input,
    sdk as any);
  return { input, records, exits, starts, attempts, sandbox, advance,
    setRunning: (value: boolean) => { running = value; },
    failStart: () => { failStart = true; },
    interruptAfterSource: () => { interruptAfterSource = true; },
    changeOutput: () => { served.set('dist/index.html', Buffer.from('changed')); },
    changeSource: () => { sourceFiles.set('package.json', Buffer.from('changed')); } };
}

test('reclaims a created Sandbox after it becomes ready without creating another', async () => {
  const f = fixture();
  f.setRunning(false);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.attempts.length, 1);
  assert.equal(f.starts.length, 0);
  f.setRunning(true);
  assert.deepEqual(await f.advance(), { state: 'running' });
  assert.equal(f.attempts.length, 1);
  assert.deepEqual(f.starts, ['npm:ci']);
});

test('accepts the SDK-normalized single-host policy but rejects broader egress', async () => {
  const allowed = fixture();
  Object.assign(allowed.sandbox, { networkPolicy: { allow: ['registry.npmjs.org'] } });
  assert.deepEqual(await allowed.advance(), { state: 'running' });
  assert.deepEqual((allowed.attempts[0] as { networkPolicy: unknown }).networkPolicy,
    { allow: { 'registry.npmjs.org': [] } });
  const broad = fixture();
  Object.assign(broad.sandbox, { networkPolicy: {
    allow: ['registry.npmjs.org', 'example.com'] } });
  assert.deepEqual(await broad.advance(), { state: 'pending-review' });
  assert.equal(broad.starts.length, 0);
});

test('five bounded commands produce recoverable verified output', async () => {
  const f = fixture();
  for (let index = 0; index < 5; index++) {
    assert.deepEqual(await f.advance(), { state: 'running' });
    assert.deepEqual(await f.advance(), { state: 'running' });
    f.exits.set(`cmd_${index + 1}`, 0);
  }
  const first = await f.advance();
  assert.equal(first.state, 'complete');
  if (first.state !== 'complete') return;
  try {
    assert.equal(await readFile(`${first.artifactDir}/dist/index.html`, 'utf8'),
      '<main>site</main>');
    assert.equal(f.attempts.length, 1);
    assert.deepEqual(f.starts, ['npm:ci', 'npm:ci', 'npm:run', 'npm:run',
      'node:--input-type=module']);
    assert.equal((f.attempts[0] as { persistent: boolean }).persistent, true);
    const again = await f.advance();
    assert.equal(again.state, 'complete');
    if (again.state === 'complete') {
      try { assert.equal(await readFile(`${again.artifactDir}/studio/dist/studio.js`,
        'utf8'), 'console.log("studio")'); }
      finally { await rm(again.artifactDir, { recursive: true, force: true }); }
    }
    assert.equal(f.attempts.length, 1);
    assert.equal(f.starts.length, 5);
  } finally { await rm(first.artifactDir, { recursive: true, force: true }); }
});

test('failed detached command cannot advance or claim completion', async () => {
  const f = fixture();
  await f.advance();
  f.exits.set('cmd_1', 1);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.starts.length, 1);
  assert.equal(f.records.has('native-studio/source-build-complete-v3.json'), false);
});

test('lost command start cannot duplicate Sandbox or npm invocation', async () => {
  const f = fixture(); f.failStart();
  await assert.rejects(f.advance(), /lost start/);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.attempts.length, 1);
  assert.equal(f.starts.length, 1);
});

test('session claimed before the first command can start once after recovery', async () => {
  const f = fixture();
  f.interruptAfterSource();
  await assert.rejects(f.advance(), /time_insufficient/);
  assert.equal(f.starts.length, 0);
  assert.equal(f.records.has('native-studio/source-build-session-v3.json'), true);
  f.sandbox.expiresAt = new Date(Date.now() + 60 * 60_000);
  assert.deepEqual(await f.advance(), { state: 'running' });
  assert.deepEqual(f.starts, ['npm:ci']);
  assert.equal(f.attempts.length, 1);
});

test('changed source after a completed command stops the next stage', async () => {
  const f = fixture();
  await f.advance(); f.exits.set('cmd_1', 0);
  f.changeSource();
  await assert.rejects(f.advance(), /source_changed/);
  assert.equal(f.starts.length, 1);
});

test('resumed completed Sandbox rehashes output before returning it', async () => {
  const f = fixture();
  for (let index = 0; index < 5; index++) {
    await f.advance(); f.exits.set(`cmd_${index + 1}`, 0);
  }
  const first = await f.advance();
  assert.equal(first.state, 'complete');
  if (first.state !== 'complete') return;
  try {
    f.changeOutput();
    await assert.rejects(f.advance(), /output_changed/);
    assert.equal(f.starts.length, 5);
    assert.equal(f.attempts.length, 1);
  } finally { await rm(first.artifactDir, { recursive: true, force: true }); }
});
