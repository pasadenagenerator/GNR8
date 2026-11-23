import assert from 'node:assert/strict';
import test from 'node:test';
import { claimNativeStudioImageDriveAttempt,
  readNativeStudioImageDriveTransfer,
  recordNativeStudioImageDriveTransfer } from './native-studio-image-drive-handoff';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const base = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), scope,
  site: { siteId: scope.siteId, accountId: 'd'.repeat(32) },
  buildSnapshotId: 'snap_build', pushSnapshotId: 'snap_push' };
const uuid = '44444444-4444-4444-8444-444444444444';

function fixture() {
  const records = new Map<string, unknown>();
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  return { records, input: { ...base, store } };
}

test('scoped private attempt binds one Drive and one producer receipt', async () => {
  const f = fixture();
  const attempt = await claimNativeStudioImageDriveAttempt(f.input, () => uuid);
  assert.equal(attempt.driveName,
    `gnr8-img-${scope.siteId}-${base.sourceId.slice(0, 8)}-${uuid}`);
  const receipt = { sourceId: base.sourceId, commit: base.commit,
    workerId: base.workerId, scope, siteId: scope.siteId,
    accountId: base.site.accountId,
    archive: { bytes: 17, sha256: 'e'.repeat(64) } };
  const drive = { name: attempt.driveName, driveId: 'drive_abc',
    projectId: 'prj_abc', region: 'iad1' };
  const transfer = await recordNativeStudioImageDriveTransfer({ ...f.input,
    attempt, drive, receipt });
  assert.deepEqual(await readNativeStudioImageDriveTransfer(f.input), transfer);
  assert.deepEqual(await recordNativeStudioImageDriveTransfer({ ...f.input,
    attempt, drive, receipt }), transfer);
  await assert.rejects(claimNativeStudioImageDriveAttempt(f.input, () => uuid),
    /pending_review/);
});

test('attached or foreign Drive cannot be recorded', async () => {
  const f = fixture();
  const attempt = await claimNativeStudioImageDriveAttempt(f.input, () => uuid);
  const receipt = { sourceId: base.sourceId, commit: base.commit,
    workerId: base.workerId, scope, siteId: scope.siteId,
    accountId: base.site.accountId,
    archive: { bytes: 17, sha256: 'e'.repeat(64) } };
  const drive = { name: attempt.driveName, driveId: 'drive_abc',
    projectId: 'prj_abc', region: 'iad1', currentSessionId: 'session' };
  await assert.rejects(recordNativeStudioImageDriveTransfer({ ...f.input,
    attempt, drive, receipt }), /transfer_unverified/);
  await assert.rejects(recordNativeStudioImageDriveTransfer({ ...f.input,
    attempt, drive: { ...drive, currentSessionId: undefined,
      name: 'foreign-drive' }, receipt }), /transfer_unverified/);
  assert.equal(f.records.has('native-studio/image-drive-transfer-v1.json'), false);
});

test('receiver rejects a transfer for a different commit or missing attempt', async () => {
  const f = fixture();
  await assert.rejects(readNativeStudioImageDriveTransfer(f.input),
    /transfer_unverified/);
  const attempt = await claimNativeStudioImageDriveAttempt(f.input, () => uuid);
  const receipt = { sourceId: base.sourceId, commit: base.commit,
    workerId: base.workerId, scope, siteId: scope.siteId,
    accountId: base.site.accountId,
    archive: { bytes: 17, sha256: 'e'.repeat(64) } };
  await recordNativeStudioImageDriveTransfer({ ...f.input, attempt,
    drive: { name: attempt.driveName, driveId: 'drive_abc',
      projectId: 'prj_abc', region: 'iad1' }, receipt });
  await assert.rejects(readNativeStudioImageDriveTransfer({ ...f.input,
    commit: 'f'.repeat(40) }), /transfer_unverified/);
  f.records.delete('native-studio/image-drive-attempt-v1.json');
  await assert.rejects(readNativeStudioImageDriveTransfer(f.input),
    /transfer_unverified/);
});
