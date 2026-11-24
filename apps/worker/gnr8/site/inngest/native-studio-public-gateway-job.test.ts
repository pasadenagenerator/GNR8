import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioPublicGateway,
  settleNativeStudioPublicGateway } from './native-studio-public-gateway-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
sourceId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
workerId: 'c'.repeat(32), artifactCommit: 'd'.repeat(40) };
const artifact = { sourceId: request.sourceId,
  sourceCommit: request.sourceCommit, workerId: request.workerId,
  artifactCommit: request.artifactCommit,
  branch: `gnr8-build-${request.sourceCommit}` };

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
    artifact: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('artifact');
      return artifact;
    },
    publish: async (received: typeof request) => {
      assert.deepEqual(received, request);
      calls.push('publish');
      return { state: 'first-open-required' as const,
        commit: request.sourceCommit,
        observation: 'observed-control-plane' as const };
    },
    chainEnabled: () => false,
    enqueueFirstOpen: async () => { calls.push('enqueue'); },
  };
  return { calls, deps };
}

test('disabled or forged public event cannot reach storage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioPublicGateway(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioPublicGateway({ ...request,
    domain: 'other.example.com' }, f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioPublicGateway({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor or mismatched artifact prevents public intent and deploy', async () => {
  const revoked = fixture();
  await assert.rejects(runNativeStudioPublicGateway(request, { ...revoked.deps,
    authorize: async () => { revoked.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(revoked.calls, ['client', 'authorize']);
  const mismatched = fixture();
  await assert.rejects(runNativeStudioPublicGateway(request, { ...mismatched.deps,
    artifact: async () => { mismatched.calls.push('artifact');
      return { ...artifact, artifactCommit: '0'.repeat(40) }; },
  }), /artifact_unverified/);
  assert.deepEqual(mismatched.calls, ['client', 'authorize', 'artifact']);
});

test('exact scoped artifact enters guarded public gateway once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioPublicGateway(request, f.deps),
    { state: 'first-open-required', commit: request.sourceCommit,
      observation: 'observed-control-plane' });
  assert.deepEqual(f.calls, ['client', 'authorize', 'artifact', 'publish']);
});

test('observed public version queues only scoped first-open identities', async () => {
  const f = fixture();
  await runNativeStudioPublicGateway(request, { ...f.deps,
    chainEnabled: () => true,
    enqueueFirstOpen: async value => {
      assert.deepEqual(value, { scope: request.scope, actor: request.actor,
        sourceId: request.sourceId, sourceCommit: request.sourceCommit });
      f.calls.push('enqueue');
    },
  });
  assert.deepEqual(f.calls, ['client', 'authorize', 'artifact',
    'publish', 'enqueue']);
});

test('pending public readback cannot expose first-open link', async () => {
  const f = fixture();
  await runNativeStudioPublicGateway(request, { ...f.deps,
    chainEnabled: () => true,
    publish: async () => { f.calls.push('publish'); return {
      state: 'pending-review' as const, commit: request.sourceCommit,
      observation: 'readback-unavailable' as const }; },
  });
  assert.deepEqual(f.calls, ['client', 'authorize', 'artifact', 'publish']);
});

test('delayed public readback resumes before first-open handoff', async () => {
  let observations = 0;
  const calls: string[] = [];
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async (_id: string, duration: string) => {
      assert.equal(duration, '1m'); calls.push('sleep'); },
  };
  const result = await settleNativeStudioPublicGateway(request, steps,
    (async () => { observations++; return observations < 3 ? {
      state: 'pending-review', commit: request.sourceCommit,
      observation: 'pending' } : {
      state: 'first-open-required', commit: request.sourceCommit,
      observation: 'observed-control-plane' };
    }) as typeof runNativeStudioPublicGateway);
  assert.equal(result.state, 'first-open-required');
  assert.deepEqual(calls, ['run', 'sleep', 'run', 'sleep', 'run']);
});

test('detached public deploy is polled and an overlong run needs review', async () => {
  let observations = 0;
  const steps = { run: async (_id: string, fn: () => Promise<unknown>) => fn(),
    sleep: async (_id: string, duration: string) => {
      assert.equal(duration, '1m'); } };
  const result = await settleNativeStudioPublicGateway(request, steps,
    (async () => (++observations < 3 ? { state: 'running',
      commit: request.sourceCommit } : { state: 'first-open-required',
      commit: request.sourceCommit,
      observation: 'observed-control-plane' })) as typeof runNativeStudioPublicGateway);
  assert.equal(result.state, 'first-open-required');
  assert.equal(observations, 3);
  observations = 0;
  const timeout = await settleNativeStudioPublicGateway(request, steps,
    (async () => { observations++; return { state: 'running',
      commit: request.sourceCommit }; }) as typeof runNativeStudioPublicGateway);
  assert.deepEqual(timeout, { state: 'pending-review',
    commit: request.sourceCommit, observation: 'execution-timeout' });
  assert.equal(observations, 30);
});

test('ambiguous public intent does not trigger repeated observation', async () => {
  const calls: string[] = [];
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async () => { calls.push('sleep'); },
  };
  const result = await settleNativeStudioPublicGateway(request, steps,
    (async () => ({ state: 'pending-review', commit: request.sourceCommit,
      observation: 'existing-intent' })) as typeof runNativeStudioPublicGateway);
  assert.equal(result.observation, 'existing-intent');
  assert.deepEqual(calls, ['run']);
});
