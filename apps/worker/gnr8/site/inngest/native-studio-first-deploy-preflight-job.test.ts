import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstDeployPreflight } from
  './native-studio-first-deploy-preflight-job';

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
    preflight: async (received: typeof request) => {
      assert.deepEqual(received, request);
      calls.push('preflight');
      return { sourceId: request.sourceId, commit: request.sourceCommit,
        workerId: request.workerId, files: 10 };
    },
  };
  return { calls, deps };
}

test('disabled or forged preflight event cannot reach storage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstDeployPreflight(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioFirstDeployPreflight({ ...request,
    cloudflareCredential: 'forged' }, f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioFirstDeployPreflight({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor and mismatched artifact prevent preflight', async () => {
  const revoked = fixture();
  await assert.rejects(runNativeStudioFirstDeployPreflight(request, {
    ...revoked.deps,
    authorize: async () => { revoked.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(revoked.calls, ['client', 'authorize']);
  const mismatched = fixture();
  await assert.rejects(runNativeStudioFirstDeployPreflight(request, {
    ...mismatched.deps,
    artifact: async () => { mismatched.calls.push('artifact');
      return { ...artifact, artifactCommit: 'e'.repeat(40) }; },
  }), /artifact_unverified/);
  assert.deepEqual(mismatched.calls, ['client', 'authorize', 'artifact']);
});

test('exact artifact receipt enters credential-free preflight once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioFirstDeployPreflight(request, f.deps),
    { sourceId: request.sourceId, commit: request.sourceCommit,
      workerId: request.workerId, files: 10 });
  assert.deepEqual(f.calls, ['client', 'authorize', 'artifact', 'preflight']);
});
