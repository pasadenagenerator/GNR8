import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstBuild } from './native-studio-first-build-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
requestId: 'a'.repeat(64), sourceId: 'b'.repeat(64) };
const result = { requestId: request.requestId, sourceId: request.sourceId,
  sourceManifestSha256: 'c'.repeat(64), studioVersion: '1.4.8', files: 42,
  hosted: false as const };

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
    sourceResult: async (scope: typeof request.scope, received: SupabaseClient,
      requestId: string) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      assert.equal(requestId, request.requestId);
      calls.push('source');
      return result;
    },
    build: async () => { calls.push('build'); return { commit: 'd'.repeat(40) }; },
  };
  return { calls, deps };
}

test('disabled or forged build event cannot reach storage or provider', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstBuild(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioFirstBuild({ ...request, repository: 'other/site' },
    f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioFirstBuild({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor stops before source lookup and build', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstBuild(request, { ...f.deps,
    authorize: async () => { f.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(f.calls, ['client', 'authorize']);
});

test('source result must match exact request and source identity', async () => {
  for (const invalid of [null, { ...result, sourceId: 'd'.repeat(64) },
    { ...result, hosted: true }, { ...result, files: 0 }]) {
    const f = fixture();
    await assert.rejects(runNativeStudioFirstBuild(request, { ...f.deps,
      sourceResult: async () => { f.calls.push('source'); return invalid as typeof result; },
    }), /source_unverified/);
    assert.deepEqual(f.calls, ['client', 'authorize', 'source']);
  }
});

test('authorized prepared source enters build once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioFirstBuild(request, f.deps),
    { commit: 'd'.repeat(40) });
  assert.deepEqual(f.calls, ['client', 'authorize', 'source', 'build']);
});
