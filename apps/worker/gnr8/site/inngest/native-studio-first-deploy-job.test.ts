import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstDeploy,
  settleNativeStudioFirstDeploy } from './native-studio-first-deploy-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
sourceId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
workerId: 'c'.repeat(32), artifactCommit: 'd'.repeat(40) };
const evidence = { artifact: { sourceId: request.sourceId,
  sourceCommit: request.sourceCommit, workerId: request.workerId,
  artifactCommit: request.artifactCommit,
  branch: `gnr8-build-${request.sourceCommit}` },
preflight: { identity: 'e'.repeat(64), sourceId: request.sourceId,
  commit: request.sourceCommit, workerId: request.workerId, files: 10 },
prebuilt: { accountId: 'f'.repeat(32), commit: request.sourceCommit,
  digest: '1'.repeat(64), siteId: request.scope.siteId,
  sourceId: request.sourceId, workerId: request.workerId },
resources: { target: { scope: request.scope, accountId: 'f'.repeat(32) },
  workers: { studio: { id: request.workerId } } },
secrets: { accountId: 'f'.repeat(32), identity: '2'.repeat(64),
  worker: `gnr8-${request.scope.siteId}-studio` } };

function fixture() {
  const calls: string[] = [];
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => true,
    client: async () => { calls.push('client'); return client; },
    authorize: async (received: SupabaseClient, actor: string, agencyId: string) => {
      assert.equal(received, client);
      assert.equal(actor, request.actor);
      assert.equal(agencyId, request.scope.agencyId);
      calls.push('authorize');
    },
    evidence: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('evidence');
      return evidence;
    },
    deploy: async (received: typeof request) => {
      assert.deepEqual(received, request);
      calls.push('deploy');
      return { state: 'reconcile-required' as const,
        commit: request.sourceCommit,
        observation: 'verified-source-control-plane' as const };
    },
    chainEnabled: () => false,
    enqueuePublicGateway: async () => { calls.push('enqueue'); },
  };
  return { calls, deps };
}

test('disabled or forged deploy event cannot open storage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioFirstDeploy({ ...request,
    cloudflareCredential: 'forged' }, f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioFirstDeploy({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor or mismatched proof prevents deployment', async () => {
  const revoked = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, { ...revoked.deps,
    authorize: async () => { revoked.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(revoked.calls, ['client', 'authorize']);
  const mismatched = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, { ...mismatched.deps,
    evidence: async () => { mismatched.calls.push('evidence'); return {
      ...evidence, preflight: { ...evidence.preflight, commit: '0'.repeat(40) } }; },
  }), /evidence_unverified/);
  assert.deepEqual(mismatched.calls, ['client', 'authorize', 'evidence']);
  const missingImage = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, { ...missingImage.deps,
    evidence: async () => { missingImage.calls.push('evidence');
      return { ...evidence, prebuilt: null as any }; },
  }), /evidence_unverified/);
  assert.deepEqual(missingImage.calls, ['client', 'authorize', 'evidence']);
  const foreignAccount = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, {
    ...foreignAccount.deps,
    evidence: async () => { foreignAccount.calls.push('evidence');
      return { ...evidence, prebuilt: { ...evidence.prebuilt,
        accountId: '9'.repeat(32) } }; },
  }), /evidence_unverified/);
  assert.deepEqual(foreignAccount.calls, ['client', 'authorize', 'evidence']);
});

test('exact scoped proof enters one trusted deploy coordinator', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioFirstDeploy(request, f.deps),
    { state: 'reconcile-required', commit: request.sourceCommit,
      observation: 'verified-source-control-plane' });
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence', 'deploy']);
});

test('verified active Studio queues only scoped public gateway identities', async () => {
  const f = fixture();
  await runNativeStudioFirstDeploy(request, { ...f.deps,
    chainEnabled: () => true,
    enqueuePublicGateway: async value => {
      assert.deepEqual(value, request);
      f.calls.push('enqueue');
    },
  });
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence',
    'deploy', 'enqueue']);
});

test('pending Studio observation cannot queue public gateway', async () => {
  const f = fixture();
  await runNativeStudioFirstDeploy(request, { ...f.deps,
    chainEnabled: () => true,
    deploy: async () => { f.calls.push('deploy'); return {
      state: 'pending-review' as const, commit: request.sourceCommit,
      observation: 'readback-unavailable' as const }; },
  });
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence', 'deploy']);
});

test('missing secret receipt waits before any trusted deploy action', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, { ...f.deps,
    evidence: async () => { f.calls.push('evidence'); return {
      ...evidence, secrets: null as any }; },
  }), /native_studio_first_deploy_secrets_pending/);
  assert.deepEqual(f.calls, ['client', 'authorize', 'evidence']);
  const conflict = fixture();
  await assert.rejects(runNativeStudioFirstDeploy(request, { ...conflict.deps,
    evidence: async () => { conflict.calls.push('evidence'); return {
      ...evidence, secrets: { ...evidence.secrets, accountId: '0'.repeat(32) } }; },
  }), /native_studio_first_deploy_secrets_unverified/);
  assert.deepEqual(conflict.calls, ['client', 'authorize', 'evidence']);
});

test('missing secret receipt settles after durable waits without retrying deploy',
async () => {
  const steps: string[] = [];
  let observations = 0;
  const result = await settleNativeStudioFirstDeploy(request, {
    run: async (id: string, fn: () => Promise<unknown>) => {
      steps.push(id); return fn(); },
    sleep: async (id: string, duration: string) => {
      assert.equal(duration, '1m'); steps.push(id); },
  }, (async () => {
    observations++;
    if (observations < 3)
      throw Error('native_studio_first_deploy_secrets_pending');
    return { state: 'reconcile-required', commit: request.sourceCommit,
      observation: 'verified-source-control-plane' };
  }) as typeof runNativeStudioFirstDeploy);
  assert.equal(result.state, 'reconcile-required');
  assert.deepEqual(steps, [
    'first-deploy-observe-0', 'first-deploy-wait-0',
    'first-deploy-observe-1', 'first-deploy-wait-1',
    'first-deploy-observe-2',
  ]);
});

test('detached deploy is polled until completion across durable waits', async () => {
  const steps: string[] = [];
  let calls = 0;
  const result = await settleNativeStudioFirstDeploy(request, {
    run: async (id, fn) => { steps.push(id); return fn(); },
    sleep: async (id, duration) => {
      assert.equal(duration, '1m'); steps.push(id); },
  }, (async () => {
    calls++;
    return calls < 3 ? { state: 'running', commit: request.sourceCommit } :
      { state: 'reconcile-required', commit: request.sourceCommit,
        observation: 'verified-source-control-plane' };
  }) as typeof runNativeStudioFirstDeploy);
  assert.equal(result.state, 'reconcile-required');
  assert.deepEqual(steps, [
    'first-deploy-observe-0', 'first-deploy-wait-0',
    'first-deploy-observe-1', 'first-deploy-wait-1',
    'first-deploy-observe-2',
  ]);
});

test('long-running deploy ends in review without reporting completion', async () => {
  let calls = 0, waits = 0;
  const result = await settleNativeStudioFirstDeploy(request, {
    run: async (_id, fn) => { calls++; return fn(); },
    sleep: async () => { waits++; },
  }, (async () => ({ state: 'running',
    commit: request.sourceCommit })) as typeof runNativeStudioFirstDeploy);
  assert.deepEqual(result, { state: 'pending-review',
    commit: request.sourceCommit, observation: 'execution-timeout' });
  assert.equal(calls, 30);
  assert.equal(waits, 29);
});

test('inconsistent secret receipt is terminal without another observation',
async () => {
  const steps: string[] = [];
  await assert.rejects(settleNativeStudioFirstDeploy(request, {
    run: async (id: string, fn: () => Promise<unknown>) => {
      steps.push(id); return fn(); },
    sleep: async (id: string) => { steps.push(id); },
  }, (async () => { throw Error('native_studio_first_deploy_secrets_unverified');
  }) as typeof runNativeStudioFirstDeploy), /secrets_unverified/);
  assert.deepEqual(steps, ['first-deploy-observe-0']);
});

test('delayed control-plane readback resumes without repeating a completed step', async () => {
  const calls: string[] = [];
  let count = 0;
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async (_id: string, duration: string) => {
      assert.equal(duration, '1m'); calls.push('sleep'); },
  };
  const result = await settleNativeStudioFirstDeploy(request, steps,
    (async () => { count++; return count < 3 ? {
      state: 'pending-review', commit: request.sourceCommit,
      observation: 'pending' } : {
      state: 'reconcile-required', commit: request.sourceCommit,
      observation: 'verified-source-control-plane' };
    }) as typeof runNativeStudioFirstDeploy);
  assert.equal(result.state, 'reconcile-required');
  assert.deepEqual(calls, ['run', 'sleep', 'run', 'sleep', 'run']);
});

test('uncertain intent is terminal and does not start another observation', async () => {
  const calls: string[] = [];
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async () => { calls.push('sleep'); },
  };
  const result = await settleNativeStudioFirstDeploy(request, steps,
    (async () => ({ state: 'pending-review', commit: request.sourceCommit,
      observation: 'existing-intent' })) as typeof runNativeStudioFirstDeploy);
  assert.equal(result.observation, 'existing-intent');
  assert.deepEqual(calls, ['run']);
});
