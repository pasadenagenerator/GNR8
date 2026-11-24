import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceNativeStudioDetachedImageBuild,
  ensureNativeStudioDockerDaemon } from './native-studio-detached-image-build';
import { claimNativeStudioImageDriveAttempt,
  readNativeStudioImageDriveTransfer,
  recordNativeStudioImageDriveTransfer } from './native-studio-image-drive-handoff';
import { pollNativeStudioImageCommand,
  startNativeStudioImageCommand } from './native-studio-image-detached-command';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40),
  workerId = 'c'.repeat(32), accountId = 'd'.repeat(32);
const files = [
  { path: 'studio/Dockerfile', body: Buffer.from('COPY .studio-image/site /opt/site\n') },
  { path: 'package.json', body: Buffer.from('{}') },
  { path: 'package-lock.json', body: Buffer.from('{}') },
  { path: 'studio/worker.js', body: Buffer.from('export default {}') },
];

function fixture() {
  const records = new Map<string, unknown>();
  const storedBytes = new Map<string, Buffer>();
  const calls: string[] = [];
  const exits = new Map<string, number | null>();
  let running = true, mounted = false, nextCommand = 0;
  let failStart = false, failStop = false, failDocker = false,
    failBundle = false;
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    },
    putBytes: async (key: string, value: Buffer) => {
      storedBytes.set(key, Buffer.from(value)); },
    getBytes: async (key: string) => storedBytes.get(key) ?? Buffer.alloc(0) };
  const input = { scope, site: { siteId: scope.siteId, accountId },
    sourceId, commit, workerId, store, files,
    buildSnapshotId: 'snap_build', pushSnapshotId: 'snap_push',
    buildNetworkPolicy: { allow: ['registry-1.docker.io'] },
    sandboxTimeoutMs: 60 * 60_000 };
  const session = { sessionId: 'sess_123',
    runCommand: async (command: any) => {
      calls.push(`start:${command.args[0]}`);
      assert.equal(command.env.DOCKER_HOST, 'unix:///var/run/docker.sock');
      if (command.cmd === '/usr/local/bin/wrangler') {
        assert.deepEqual(command.args, ['deploy', '--dry-run', '--outdir',
          '/vercel/sandbox/gnr8-worker-bundle', '--metafile',
          '/vercel/sandbox/gnr8-worker-bundle-meta.json', '--config',
          'cloudflare/wrangler.jsonc']);
        assert.equal(command.env.CLOUDFLARE_API_TOKEN, undefined);
      }
      if (failStart) throw Error('connection lost');
      const cmdId = `cmd_${++nextCommand}`;
      exits.set(cmdId, null); return { cmdId };
    },
    getCommand: async (cmdId: string) => ({ exitCode: exits.get(cmdId) ?? null }) };
  const sandbox = { name: '', get status() { return running ? 'running' : 'stopped'; },
    sourceSnapshotId: input.buildSnapshotId, region: 'iad1',
    persistent: false, timeout: input.sandboxTimeoutMs,
    get mounts() { return { '/gnr8-image': {
      drive: drive.name, mode: 'read-write' } }; },
    networkPolicy: input.buildNetworkPolicy,
    expiresAt: new Date(Date.now() + 60 * 60_000),
    currentSession: () => session,
    stop: async () => { calls.push('stop');
      if (failStop) throw Error('stop uncertain');
      running = false; mounted = false; } };
  const drive = { name: '', driveId: 'drive_1', projectId: 'project_1',
    region: 'iad1', maxSize: 12 * 1024 * 1024 * 1024,
    get currentSessionId() { return mounted ? 'mount_1' : undefined; } };
  const sdk = { drive: {
    getOrCreate: async ({ name }: any) => {
      calls.push('drive-create'); drive.name = name; return drive; },
    get: async ({ name }: any) => {
      calls.push('drive-get'); assert.equal(name, drive.name); return drive; },
  }, sandbox: {
    create: async ({ name, timeout }: any) => {
      calls.push('sandbox-create'); assert.equal(timeout, 60 * 60_000);
      sandbox.name = name; mounted = true; return sandbox; },
    get: async ({ name, resume }: any) => {
      calls.push('sandbox-get'); assert.equal(name, sandbox.name);
      assert.equal(resume, false); return sandbox; },
  } };
  const receipt = { sourceId, commit, workerId, scope,
    siteId: scope.siteId, accountId,
    archive: { bytes: 1024, sha256: 'e'.repeat(64) } };
  let inspectedReceipt = receipt;
  const steps = { claimAttempt: claimNativeStudioImageDriveAttempt,
    readTransfer: readNativeStudioImageDriveTransfer,
    recordTransfer: recordNativeStudioImageDriveTransfer,
    stage: async () => { calls.push('stage'); },
    verifySource: async () => { calls.push('verify-source'); },
    inspect: async () => { calls.push('inspect'); return inspectedReceipt; },
    ensureDocker: async (_sandbox: unknown, path: string) => {
      assert.equal(path, 'docker'); calls.push('docker-ready');
      if (failDocker) throw Error('daemon unavailable'); },
    recordBundle: async () => { calls.push('bundle-record');
      if (failBundle) throw Error('bundle invalid'); },
    verifyBundle: async () => { calls.push('bundle-verify'); },
    startCommand: startNativeStudioImageCommand,
    pollCommand: pollNativeStudioImageCommand };
  const advance = () => advanceNativeStudioDetachedImageBuild(
    input, sdk as any, steps as any);
  return { input, records, calls, exits, advance, sandbox,
    failStart: () => { failStart = true; },
    failStop: () => { failStop = true; },
    failDocker: () => { failDocker = true; },
    failBundle: () => { failBundle = true; },
    resumeStop: () => { failStop = false; },
    changeArchive: () => { inspectedReceipt = { ...receipt,
      archive: { ...receipt.archive, sha256: 'f'.repeat(64) } }; }, receipt };
}

test('build and save cross invocations without repeating external effects', async () => {
  const f = fixture();
  assert.deepEqual(await f.advance(), { state: 'running' });
  assert.deepEqual(await f.advance(), { state: 'running' });
  f.exits.set('cmd_1', 0);
  assert.deepEqual(await f.advance(), { state: 'running' });
  assert.deepEqual(await f.advance(), { state: 'running' });
  f.exits.set('cmd_2', 0);
  assert.deepEqual(await f.advance(), { state: 'running' });
  assert.deepEqual(await f.advance(), { state: 'running' });
  f.exits.set('cmd_3', 0);
  assert.deepEqual(await f.advance(), { state: 'running' });
  const done = await f.advance();
  assert.equal(done.state, 'complete');
  assert.deepEqual(await f.advance(), done);
  assert.equal(f.calls.filter(v => v === 'drive-create').length, 1);
  assert.equal(f.calls.filter(v => v === 'sandbox-create').length, 1);
  assert.equal(f.calls.filter(v => v === 'start:build').length, 1);
  assert.equal(f.calls.filter(v => v === 'start:deploy').length, 1);
  assert.equal(f.calls.indexOf('docker-ready') < f.calls.indexOf('stage'), true);
  assert.equal(f.calls.filter(v => v === 'start:save').length, 1);
  assert.equal(f.calls.indexOf('start:deploy') < f.calls.indexOf('start:save'), true);
  assert.equal(f.calls.indexOf('bundle-record') < f.calls.indexOf('start:save'), true);
  assert.equal(f.calls.filter(v => v === 'stop').length, 1);
  assert.equal(f.calls.indexOf('verify-source') < f.calls.indexOf('inspect'), true);
});

test('invalid bundled Worker blocks image save and transfer', async () => {
  const f = fixture();
  await f.advance(); f.exits.set('cmd_1', 0);
  await f.advance(); f.exits.set('cmd_2', 0);
  f.failBundle();
  await assert.rejects(f.advance(), /bundle invalid/);
  assert.equal(f.calls.includes('start:save'), false);
  assert.equal(f.records.has('native-studio/image-drive-transfer-v1.json'), false);
});

test('Docker failure stops before staging the site source', async () => {
  const f = fixture(); f.failDocker();
  await assert.rejects(f.advance(), /daemon unavailable/);
  assert.equal(f.calls.includes('stage'), false);
  assert.equal(f.calls.some(v => v.startsWith('start:')), false);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
});

test('failed Wrangler dry run cannot save or transfer an image', async () => {
  const f = fixture();
  await f.advance();
  f.exits.set('cmd_1', 0);
  await f.advance();
  f.exits.set('cmd_2', 1);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.calls.filter(v => v === 'start:save').length, 0);
  assert.equal(f.records.has('native-studio/image-preflight-proof-v1.json'), false);
  assert.equal(f.records.has('native-studio/image-drive-transfer-v1.json'), false);
});

test('Docker daemon starts once from the trusted snapshot and is checked before use', async () => {
  const calls: string[] = [];
  let probes = 0;
  const sandbox = { runCommand: async (command: any) => {
    calls.push(`${command.cmd}:${command.args[0]}`);
    if (command.cmd === 'docker') {
      assert.equal(command.env.DOCKER_HOST, 'unix:///var/run/docker.sock');
      return { exitCode: ++probes >= 3 ? 0 : 1 };
    }
    assert.equal(command.cmd, 'dockerd');
    assert.equal(command.args[0], '--host=unix:///var/run/docker.sock');
    assert.equal(command.sudo, true);
    assert.equal(command.detached, true);
    assert.equal(command.env.CLOUDFLARE_API_TOKEN, undefined);
    return { cmdId: 'daemon' };
  } };
  await ensureNativeStudioDockerDaemon(sandbox as any, 'docker', async () => {});
  assert.deepEqual(calls, ['docker:info', 'dockerd:--host=unix:///var/run/docker.sock',
    'docker:info', 'docker:info']);
  calls.length = 0;
  await ensureNativeStudioDockerDaemon(sandbox as any, 'docker', async () => {});
  assert.deepEqual(calls, ['docker:info']);
});

test('ambiguous detached start blocks retry without another Sandbox', async () => {
  const f = fixture(); f.failStart();
  await assert.rejects(f.advance(), /connection lost/);
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.calls.filter(v => v === 'sandbox-create').length, 1);
  assert.equal(f.calls.filter(v => v === 'start:build').length, 1);
});

test('changed source or insufficient Sandbox budget fails closed', async () => {
  const f = fixture();
  const sdk = { drive: { get: async () => { throw Error('provider call'); },
    getOrCreate: async () => { throw Error('provider call'); } },
    sandbox: { create: async () => { throw Error('provider call'); },
      get: async () => { throw Error('provider call'); } } };
  await assert.rejects(advanceNativeStudioDetachedImageBuild({ ...f.input,
    sandboxTimeoutMs: 30 * 60_000 }, sdk as any), /unconfigured/);
  await f.advance();
  f.input.files[3] = { ...f.input.files[3], body: Buffer.from('changed') };
  await assert.rejects(f.advance(), /source_changed/);
  assert.equal(f.calls.filter(v => v === 'start:build').length, 1);
});

test('remaining Sandbox time blocks save before another long command', async () => {
  const f = fixture();
  await f.advance();
  f.exits.set('cmd_1', 0);
  f.sandbox.expiresAt = new Date(Date.now() + 5 * 60_000);
  await assert.rejects(f.advance(), /time_insufficient/);
  assert.equal(f.calls.filter(v => v === 'start:deploy').length, 0);
  assert.equal(f.calls.filter(v => v === 'start:save').length, 0);
});

test('wrong snapshot or network policy cannot stage or resume the builder', async () => {
  const wrongSnapshot = fixture();
  wrongSnapshot.sandbox.sourceSnapshotId = 'snap_foreign';
  assert.deepEqual(await wrongSnapshot.advance(), { state: 'pending-review' });
  assert.equal(wrongSnapshot.calls.includes('stage'), false);
  assert.equal(wrongSnapshot.calls.some(v => v.startsWith('start:')), false);

  const changedNetwork = fixture();
  await changedNetwork.advance();
  changedNetwork.sandbox.networkPolicy = { allow: ['foreign.example.com'] };
  assert.deepEqual(await changedNetwork.advance(), { state: 'pending-review' });
  assert.equal(changedNetwork.calls.filter(v => v === 'start:save').length, 0);
});

test('claimed receipt is rehashed after an uncertain Sandbox stop', async () => {
  const f = fixture();
  await f.advance(); f.exits.set('cmd_1', 0);
  await f.advance(); f.exits.set('cmd_2', 0);
  await f.advance();
  f.exits.set('cmd_3', 0);
  await f.advance();
  f.failStop();
  await assert.rejects(f.advance(), /stop uncertain/);
  f.resumeStop(); f.changeArchive();
  assert.deepEqual(await f.advance(), { state: 'pending-review' });
  assert.equal(f.records.has('native-studio/image-drive-transfer-v1.json'), false);
});
