import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioImageBuild } from './native-studio-image-build-job';
import { runNativeStudioImagePush } from './native-studio-image-push-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
sourceId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
workerId: 'c'.repeat(32), artifactCommit: 'd'.repeat(40) };
const accountId = 'e'.repeat(32);
const attempt = { sourceId: request.sourceId, commit: request.sourceCommit,
  workerId: request.workerId, scope: request.scope,
  siteId: request.scope.siteId, accountId,
  driveName: `gnr8-img-${request.scope.siteId}-${request.sourceId.slice(0, 8)}-55555555-5555-4555-8555-555555555555`,
  buildSnapshotId: 'snap_Build1', pushSnapshotId: 'snap_Push1' };
const transfer = { attempt, driveId: 'drive_1', projectId: 'project_1',
  region: 'iad1' as const, receipt: { sourceId: request.sourceId,
    commit: request.sourceCommit, workerId: request.workerId,
    scope: request.scope, siteId: request.scope.siteId, accountId,
    archive: { bytes: 1024, sha256: 'f'.repeat(64) } } };
const prebuilt = { sourceId: request.sourceId, commit: request.sourceCommit,
  workerId: request.workerId, siteId: request.scope.siteId,
  accountId, digest: '0'.repeat(64) };
const base = { artifact: { sourceId: request.sourceId,
  sourceCommit: request.sourceCommit, workerId: request.workerId,
  artifactCommit: request.artifactCommit,
  branch: `gnr8-build-${request.sourceCommit}` },
preflight: { identity: '1'.repeat(64), sourceId: request.sourceId,
  commit: request.sourceCommit, workerId: request.workerId, files: 3 },
resources: { target: { scope: request.scope, accountId },
  workers: { studio: { id: request.workerId } } } };

function buildFixture() {
  const calls: string[] = [];
  let evidence: any = { ...base, attempt: null, transfer: null };
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => true,
    client: async () => { calls.push('client'); return client; },
    authorize: async () => { calls.push('authorize'); },
    evidence: async () => { calls.push('evidence'); return evidence; },
    build: async () => { calls.push('build'); evidence = { ...evidence,
      attempt, transfer }; return transfer; },
    chainEnabled: () => true,
    enqueuePush: async (value: typeof request) => {
      assert.deepEqual(value, request); calls.push('enqueue'); },
  };
  return { calls, deps, setEvidence: (value: any) => { evidence = value; } };
}

function pushFixture() {
  const calls: string[] = [];
  let evidence: any = { ...base, attempt, transfer,
    prebuilt: null, pushAttempt: null };
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => true,
    client: async () => { calls.push('client'); return client; },
    authorize: async () => { calls.push('authorize'); },
    evidence: async () => { calls.push('evidence'); return evidence; },
    push: async () => { calls.push('push'); evidence = { ...evidence,
      prebuilt }; return prebuilt; },
    chainEnabled: () => true,
    enqueueDeploy: async (value: typeof request) => {
      assert.deepEqual(value, request); calls.push('enqueue'); },
  };
  return { calls, deps, setEvidence: (value: any) => { evidence = value; } };
}

test('image build rejects forged event before storage and revoked actor before evidence', async () => {
  const f = buildFixture();
  await assert.rejects(runNativeStudioImageBuild({ ...request, token: 'forged' },
    f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
  await assert.rejects(runNativeStudioImageBuild(request, { ...f.deps,
    authorize: async () => { throw Error('revoked'); } }), /revoked/);
  assert.deepEqual(f.calls, ['client']);
});

test('image build verifies scoped evidence and transfers before queueing push', async () => {
  const f = buildFixture();
  assert.deepEqual(await runNativeStudioImageBuild(request, f.deps), transfer);
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence', 'build',
    'evidence', 'enqueue']);
  const wrong = buildFixture();
  wrong.setEvidence({ ...base, resources: { ...base.resources,
    target: { scope: request.scope, accountId: '9'.repeat(32) } },
    attempt: null, transfer: null });
  await assert.rejects(runNativeStudioImageBuild(request, wrong.deps),
    /transfer_unverified/);
  assert.equal(wrong.calls.includes('enqueue'), false);
});

test('image build resumes exact transfer without rebuilding and stops ambiguous attempt', async () => {
  const resumed = buildFixture();
  resumed.setEvidence({ ...base, attempt, transfer });
  assert.deepEqual(await runNativeStudioImageBuild(request, resumed.deps), transfer);
  assert.deepEqual(resumed.calls, ['client', 'authorize', 'evidence', 'enqueue']);
  const pending = buildFixture();
  pending.setEvidence({ ...base, attempt, transfer: null });
  await assert.rejects(runNativeStudioImageBuild(request, pending.deps), /pending_review/);
  assert.equal(pending.calls.includes('build'), false);
});

test('image push verifies transfer before provider and prebuilt before deploy', async () => {
  const f = pushFixture();
  assert.deepEqual(await runNativeStudioImagePush(request, f.deps), prebuilt);
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence', 'push',
    'evidence', 'enqueue']);
  const wrong = pushFixture();
  wrong.setEvidence({ ...base, attempt: { ...attempt, accountId: '9'.repeat(32) },
    transfer, prebuilt: null, pushAttempt: null });
  await assert.rejects(runNativeStudioImagePush(request, wrong.deps),
    /transfer_unverified/);
  assert.equal(wrong.calls.includes('push'), false);
});

test('image push resumes exact prebuilt and never repeats ambiguous external push', async () => {
  const resumed = pushFixture();
  resumed.setEvidence({ ...base, attempt, transfer, prebuilt,
    pushAttempt: { sourceId: request.sourceId, commit: request.sourceCommit,
      workerId: request.workerId, archiveSha256: transfer.receipt.archive.sha256 } });
  assert.deepEqual(await runNativeStudioImagePush(request, resumed.deps), prebuilt);
  assert.deepEqual(resumed.calls, ['client', 'authorize', 'evidence', 'enqueue']);
  const pending = pushFixture();
  pending.setEvidence({ ...base, attempt, transfer, prebuilt: null,
    pushAttempt: { sourceId: request.sourceId } });
  await assert.rejects(runNativeStudioImagePush(request, pending.deps),
    /pending_review/);
  assert.equal(pending.calls.includes('push'), false);
});

test('target account change during image work blocks the next stage', async () => {
  const changed = { ...base.resources,
    target: { scope: request.scope, accountId: '9'.repeat(32) } };
  const build = buildFixture();
  build.deps.build = async () => {
    build.calls.push('build');
    build.setEvidence({ ...base, resources: changed, attempt, transfer });
    return transfer;
  };
  await assert.rejects(runNativeStudioImageBuild(request, build.deps),
    /target_changed/);
  assert.equal(build.calls.includes('enqueue'), false);

  const push = pushFixture();
  push.deps.push = async () => {
    push.calls.push('push');
    push.setEvidence({ ...base, resources: changed, attempt, transfer,
      prebuilt, pushAttempt: null });
    return prebuilt;
  };
  await assert.rejects(runNativeStudioImagePush(request, push.deps),
    /target_changed/);
  assert.equal(push.calls.includes('enqueue'), false);
});
