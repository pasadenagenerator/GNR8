import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeStudioImageRecoveryStore } from './native-studio-image-recovery';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const identity = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), scope,
  site: { siteId: scope.siteId, accountId: 'd'.repeat(32) },
  buildSnapshotId: 'snap_new' };
const driveName = `gnr8-img-33333333-aaaaaaaa-44444444-4444-4444-8444-444444444444`;
const oldAttempt = { sourceId: identity.sourceId, commit: identity.commit,
  workerId: identity.workerId, scope, siteId: scope.siteId,
  accountId: identity.site.accountId, driveName,
  buildSnapshotId: 'snap_old', pushSnapshotId: 'snap_push' };
const sandboxName = 'gnr8-image-build-44444444-4444-4444-8444-444444444444';

function fixture() {
  const records = new Map<string, unknown>([
    ['native-studio/image-drive-attempt-v2.json', oldAttempt],
    ['native-studio/image-build-session-v1.json', {
      attempt: oldAttempt, sandboxName, sessionId: 'sess_old' }],
    ['native-studio/image-build-command-started-v1.json', {
      intent: { sourceId: identity.sourceId, commit: identity.commit,
        workerId: identity.workerId, siteId: scope.siteId, driveName,
        sandboxName, sessionId: 'sess_old', phase: 'build' },
      cmdId: 'cmd_old' }],
  ]);
  const store = { read: async <T>(key: string) =>
      (records.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    },
    put: async <T>(key: string, value: T) => {
      records.set(key, value); return value;
    },
    putBytes: async () => {}, getBytes: async () => Buffer.alloc(0) };
  const sandbox = { get: async () => ({ name: sandboxName,
    status: 'stopped', sourceSnapshotId: 'snap_old',
    currentSession: () => ({ sessionId: 'sess_old' }) }) };
  return { records, store, sandbox };
}

test('stopped failed builder gets a separate immutable image namespace', async () => {
  const f = fixture();
  const current = await nativeStudioImageRecoveryStore(f.store, {
    ...identity, site: { ...identity.site, repository: 'example/site' },
  },
    { allowCreate: true, sandbox: f.sandbox as any });
  assert.deepEqual(await current.read('native-studio/image-drive-attempt-v2.json'), null);
  await current.claim('native-studio/image-drive-attempt-v2.json',
    { ...oldAttempt, buildSnapshotId: 'snap_new' });
  assert.deepEqual(f.records.get('native-studio/image-drive-attempt-v2.json'), oldAttempt);
  assert.equal(f.records.has(
    'native-studio/recovery-v1/image-drive-attempt-v2.json'), true);
  await current.claim('native-studio/image-drive-transfer-v1.json',
    { attempt: 'new' });
  await current.claim('native-studio/prebuilt-image-v1.json',
    { digest: 'new' });
  await current.claim('native-studio/first-deploy-dry-run-v1.json',
    { identity: 'new' });
  assert.equal(f.records.has('native-studio/image-drive-transfer-v1.json'), false);
  assert.equal(f.records.has('native-studio/prebuilt-image-v1.json'), false);
  assert.equal(f.records.has('native-studio/first-deploy-dry-run-v1.json'), false);
  assert.equal((await current.read<any>('native-studio/image-recovery-v1.json'))
    ?.oldCommandId, 'cmd_old');
  assert.equal(await current.read('native-studio/build-artifact-github-push-v1.json'), null);
  const resumed = await nativeStudioImageRecoveryStore(f.store, identity);
  assert.deepEqual(await resumed.read('native-studio/image-drive-attempt-v2.json'),
    { ...oldAttempt, buildSnapshotId: 'snap_new' });
  assert.deepEqual(await resumed.read('native-studio/prebuilt-image-v1.json'),
    { digest: 'new' });
});

test('new sites keep the original storage contract', async () => {
  const f = fixture();
  f.records.clear();
  const current = await nativeStudioImageRecoveryStore(f.store, identity,
    { allowCreate: true, sandbox: f.sandbox as any });
  assert.equal(current, f.store);
  assert.equal(f.records.size, 0);
});

test('active or partially published old attempt cannot start recovery', async () => {
  const f = fixture();
  await assert.rejects(nativeStudioImageRecoveryStore(f.store, identity,
    { allowCreate: true, sandbox: { get: async () => ({ name: sandboxName,
      status: 'running', sourceSnapshotId: 'snap_old',
      currentSession: () => ({ sessionId: 'sess_old' }) }) } as any }),
  /pending_review/);
  assert.equal(f.records.has('native-studio/image-recovery-v1.json'), false);
  f.records.set('native-studio/image-drive-transfer-v1.json', { transferred: true });
  await assert.rejects(nativeStudioImageRecoveryStore(f.store, identity,
    { allowCreate: true, sandbox: f.sandbox as any }), /pending_review/);
  assert.equal(f.records.has('native-studio/image-recovery-v1.json'), false);
});

test('unavailable replacement snapshot cannot claim a recovery', async () => {
  const f = fixture();
  await assert.rejects(nativeStudioImageRecoveryStore(f.store, identity, {
    allowCreate: true, sandbox: f.sandbox as any,
    validateNewSnapshot: async () => { throw Error('snapshot unavailable'); },
  }), /snapshot unavailable/);
  assert.equal(f.records.has('native-studio/image-recovery-v1.json'), false);
});

test('a stopped image build can resume for every site when its network allowlist expands', async () => {
  const f = fixture();
  await nativeStudioImageRecoveryStore(f.store, identity,
    { allowCreate: true, sandbox: f.sandbox as any });
  const nextAttempt = { ...oldAttempt, buildSnapshotId: identity.buildSnapshotId,
    driveName: 'gnr8-img-33333333-aaaaaaaa-55555555-5555-4555-8555-555555555555' };
  const nextName = 'gnr8-image-build-55555555-5555-4555-8555-555555555555';
  f.records.set('native-studio/recovery-v1/image-drive-attempt-v2.json', nextAttempt);
  f.records.set('native-studio/recovery-v1/image-build-session-v1.json',
    { attempt: nextAttempt, sandboxName: nextName, sessionId: 'sess_new' });
  f.records.set('native-studio/recovery-v1/image-build-command-started-v1.json',
    { intent: { sourceId: identity.sourceId, commit: identity.commit,
      workerId: identity.workerId, siteId: scope.siteId,
      driveName: nextAttempt.driveName, sandboxName: nextName,
      sessionId: 'sess_new', phase: 'build' }, cmdId: 'cmd_new' });
  const policy = { allow: ['registry-1.docker.io', 'docker-images.example.com'] };
  const sandbox = { get: async () => ({ name: nextName, status: 'stopped',
    sourceSnapshotId: identity.buildSnapshotId,
    currentSession: () => ({ sessionId: 'sess_new' }),
    networkPolicy: { allow: ['registry-1.docker.io'] } }) };
  const current = await nativeStudioImageRecoveryStore(f.store, identity,
    { allowCreate: true, sandbox: sandbox as any, buildNetworkPolicy: policy });
  assert.equal(await current.read('native-studio/image-drive-attempt-v2.json'), null);
  await current.claim('native-studio/image-drive-attempt-v2.json',
    { ...nextAttempt, driveName: 'gnr8-img-next' });
  assert.equal(f.records.has('native-studio/recovery-v2/image-drive-attempt-v2.json'), true);
  assert.deepEqual(await (await nativeStudioImageRecoveryStore(f.store, identity))
    .read('native-studio/image-drive-attempt-v2.json'),
    await current.read('native-studio/image-drive-attempt-v2.json'));
});
