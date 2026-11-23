import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstDeploy } from './native-studio-first-deploy-job';

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
  workers: { studio: { id: request.workerId } } } };

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
