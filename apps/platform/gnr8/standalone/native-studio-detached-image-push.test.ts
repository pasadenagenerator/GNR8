import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceNativeStudioDetachedImagePush } from
  './native-studio-detached-image-push';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40),
  workerId = 'c'.repeat(32), accountId = 'd'.repeat(32);
const driveName = `gnr8-img-${scope.siteId}-${sourceId.slice(0, 8)}-55555555-5555-4555-8555-555555555555`;
const receipt = { sourceId, commit, workerId, scope,
  siteId: scope.siteId, accountId,
  archive: { bytes: 1024, sha256: 'e'.repeat(64) } };
const transfer = { attempt: { sourceId, commit, workerId, scope,
  siteId: scope.siteId, accountId, driveName,
  buildSnapshotId: 'snap_build', pushSnapshotId: 'snap_push' },
  driveId: 'drive_1', projectId: 'project_1', region: 'iad1' as const,
  receipt };

function fixture() {
  const events: string[] = [];
  const records = new Map<string, unknown>();
  let credentialLoads = 0;
  let createFails = false;
  let archiveFails = false;
  let stopFails = false;
  let configExists = false;
  let failLoadVerifiedClaimOnce = false;
  const sandboxName = `gnr8-push-${driveName}`;
  const policy = { allow: ['api.cloudflare.com', 'registry.cloudflare.com'] };
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      events.push(`claim:${key}`);
      if (key === 'native-studio/image-load-verified-v1.json' &&
          failLoadVerifiedClaimOnce) {
        failLoadVerifiedClaimOnce = false;
        throw Error('store response lost');
      }
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  const sandbox = {
    name: sandboxName, status: 'running', region: 'iad1', persistent: false,
    sourceSnapshotId: 'snap_push', timeout: 60 * 60_000,
    expiresAt: new Date(Date.now() + 60 * 60_000),
    mounts: { '/gnr8-image': { drive: driveName, mode: 'snapshot' } },
    networkPolicy: policy,
    currentSession: () => ({ sessionId: 'sess_123' }),
    runCommand: async (command: any) => {
      events.push(`command:${command.args[0]}`);
      if (command.args[0] === 'image' &&
          command.args[3] === '{{.Os}}/{{.Architecture}}')
        return { exitCode: 0, stdout: async () => 'linux/amd64' };
      if (command.args[0] === 'image') return { exitCode: 0,
        stdout: async () => JSON.stringify([
          `registry.cloudflare.com/${accountId}/gnr8-${scope.siteId}-studio@sha256:${'f'.repeat(64)}`]) };
      if (command.cmd === 'node') return { exitCode: 0,
        stdout: async () => configExists ? 'same' : 'absent' };
      return { exitCode: 0, stdout: async () => '' };
    },
    writeFiles: async () => { events.push('write-config');
      configExists = true; },
    stop: async () => { events.push('stop');
      if (stopFails) throw Error('stop response lost'); },
  };
  const drive = { name: driveName, driveId: transfer.driveId,
    projectId: transfer.projectId, region: 'iad1',
    maxSize: 12 * 1024 * 1024 * 1024, currentSessionId: undefined,
    snapshot: () => ({ drive: driveName, mode: 'snapshot' }),
    delete: async () => { events.push('delete-drive'); } };
  const sdk = { drive: { get: async () => { events.push('get-drive');
    return drive; } }, sandbox: {
    create: async () => { events.push('create-receiver');
      if (createFails) throw Error('connection lost');
      return sandbox; },
    get: async ({ resume }: any) => { assert.equal(resume, false);
      events.push('get-receiver'); return sandbox; },
  } } as any;
  const input = { sourceId, commit, workerId, scope,
    site: { siteId: scope.siteId, accountId },
    buildSnapshotId: 'snap_build', pushSnapshotId: 'snap_push',
    store, project: '/verified/project', pushNetworkPolicy: policy,
    dockerPath: '/usr/bin/docker', wranglerPath: '/usr/bin/wrangler',
    sandboxTimeoutMs: 60 * 60_000,
    loadCredential: async () => { credentialLoads++;
      events.push('credential'); return 'g'.repeat(48); } };
  const steps = {
    transfer: async () => transfer,
    verifyArchive: async () => {
      events.push('verify-archive');
      if (archiveFails) throw Error('archive changed');
      return receipt;
    },
    recordArchive: async () => { events.push('record-archive');
      await store.claim('native-studio/image-archive-v1.json', receipt);
      return receipt; },
    start: async (value: any) => {
      events.push(`start:${value.phase}`);
      if (value.phase === 'push')
        assert.equal(value.command.env.CLOUDFLARE_API_TOKEN, 'g'.repeat(48));
      else assert.equal(value.command.env.CLOUDFLARE_API_TOKEN, undefined);
      await store.claim(`native-studio/image-${value.phase}-command-intent-v1.json`,
        { phase: value.phase });
      return { cmdId: 'cmd_123' };
    },
    poll: async (value: any) => { events.push(`poll:${value.phase}`);
      return { state: 'succeeded', exitCode: 0 }; },
  } as any;
  return { input, sdk, steps, records, events, sandbox,
    getCredentialLoads: () => credentialLoads,
    setCreateFails: () => { createFails = true; },
    setArchiveFails: () => { archiveFails = true; },
    setStopFails: () => { stopFails = true; },
    setLoadVerifiedClaimFailure: () => {
      failLoadVerifiedClaimOnce = true; } };
}

test('receiver verifies archive before detached load and token-bearing push', async () => {
  const f = fixture();
  const advance = () => advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps);
  for (let i = 0; i < 5; i++)
    assert.deepEqual(await advance(), { state: 'running' });
  const done = await advance();
  assert.equal(done.state, 'complete');
  if (done.state === 'complete') assert.equal(done.prebuilt.digest, 'f'.repeat(64));
  assert.equal(f.getCredentialLoads(), 1);
  assert.equal(f.events.indexOf('verify-archive') < f.events.indexOf('start:load'), true);
  assert.equal(f.events.indexOf('record-archive') < f.events.indexOf('credential'), true);
  assert.equal(f.events.indexOf('start:load') < f.events.indexOf('start:push'), true);
  assert.equal(f.events.indexOf('stop') < f.events.indexOf('delete-drive'), true);
  assert.equal(f.records.has('native-studio/prebuilt-image-v1.json'), true);
  assert.equal(done.state === 'complete' && done.cleanupState, 'complete');
});

test('remaining Sandbox time gates the next long command', async () => {
  const f = fixture();
  const advance = () => advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps);
  await advance();
  await advance();
  f.sandbox.expiresAt = new Date(Date.now() + 5 * 60_000);
  await assert.rejects(advance(), /time_insufficient/);
  assert.equal(f.events.includes('start:load'), false);
});

test('ambiguous cleanup preserves the prebuilt receipt without repeating side effects', async () => {
  const f = fixture();
  f.setStopFails();
  const advance = () => advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps);
  for (let i = 0; i < 5; i++) await advance();
  const first = await advance();
  assert.equal(first.state === 'complete' && first.cleanupState,
    'pending-review');
  const second = await advance();
  assert.equal(second.state === 'complete' && second.cleanupState,
    'pending-review');
  assert.equal(f.events.filter(value => value === 'stop').length, 1);
  assert.equal(f.events.filter(value => value === 'start:push').length, 1);
  assert.equal(f.records.has('native-studio/image-push-cleanup-intent-v1.json'), true);
  assert.equal(f.records.has('native-studio/image-push-cleanup-done-v1.json'), false);
});

test('receipt written before cleanup resumes one exact cleanup attempt', async () => {
  const f = fixture();
  const advance = () => advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps);
  for (let i = 0; i < 5; i++) await advance();
  f.records.set('native-studio/prebuilt-image-v1.json', {
    sourceId, commit, workerId, siteId: scope.siteId,
    accountId, digest: 'f'.repeat(64),
  });
  const done = await advance();
  assert.equal(done.state === 'complete' && done.cleanupState, 'complete');
  assert.equal(f.events.filter(value => value === 'stop').length, 1);
  assert.equal(f.events.filter(value => value === 'delete-drive').length, 1);
  const repeated = await advance();
  assert.equal(repeated.state === 'complete' && repeated.cleanupState, 'complete');
  assert.equal(f.events.filter(value => value === 'stop').length, 1);
});

test('exact config write can recover before its private completion claim', async () => {
  const f = fixture();
  const advance = () => advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps);
  for (let i = 0; i < 3; i++) await advance();
  f.setLoadVerifiedClaimFailure();
  await assert.rejects(advance(), /store response lost/);
  assert.equal(f.events.filter(value => value === 'write-config').length, 1);
  assert.deepEqual(await advance(), { state: 'running' });
  assert.equal(f.events.filter(value => value === 'write-config').length, 1);
  assert.equal(f.getCredentialLoads(), 0);
  assert.deepEqual(await advance(), { state: 'running' });
  const done = await advance();
  assert.equal(done.state, 'complete');
});

test('ambiguous receiver creation never starts a second Sandbox', async () => {
  const f = fixture();
  f.setCreateFails();
  await assert.rejects(advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps), /connection lost/);
  assert.deepEqual(await advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps), { state: 'pending-review' });
  assert.equal(f.events.filter(value => value === 'create-receiver').length, 1);
  assert.equal(f.getCredentialLoads(), 0);
});

test('changed archive cannot load Docker or Cloudflare credential', async () => {
  const f = fixture();
  f.setArchiveFails();
  assert.deepEqual(await advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps), { state: 'running' });
  await assert.rejects(advanceNativeStudioDetachedImagePush(
    f.input, f.sdk, f.steps), /archive changed/);
  assert.equal(f.events.includes('start:load'), false);
  assert.equal(f.getCredentialLoads(), 0);
});
