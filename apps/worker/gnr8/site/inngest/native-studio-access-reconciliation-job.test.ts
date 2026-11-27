import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioAccessReconciliation } from
  './native-studio-access-reconciliation-job';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const request = { scope, actor };
const sourceId = 'a'.repeat(64);
const handoff = { scope, sourceId, commit: 'b'.repeat(40) };
const result = { state: 'verified' as const, scope, sourceId,
  accessAppId: 'c'.repeat(32), policyId: '55555555-5555-4555-8555-555555555555',
  commit: 'd'.repeat(40), principals: ['access:owner@example.com'] };

function fixture() {
  const calls: string[] = [];
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => true,
    client: async () => { calls.push('client'); return client; },
    authorize: async (received: SupabaseClient, user: string, agency: string) => {
      assert.equal(received, client);
      assert.equal(user, actor);
      assert.equal(agency, scope.agencyId);
      calls.push('authorize');
    },
    handoff: async (received: typeof scope, supabase: SupabaseClient) => {
      assert.deepEqual(received, scope);
      assert.equal(supabase, client);
      calls.push('handoff');
      return handoff;
    },
    reconcile: async (input: { scope: typeof scope; client: SupabaseClient;
      sourceId: string; actor: string }) => {
      assert.deepEqual(input, { scope, client, sourceId, actor });
      calls.push('reconcile');
      return result;
    },
  };
  return { calls, deps };
}

test('rejects disabled, forged or malformed events before storage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioAccessReconciliation(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioAccessReconciliation(
    { ...request, sourceId }, f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioAccessReconciliation(
    { ...request, scope: { ...scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor or mismatched handoff stops before provider path', async () => {
  const revoked = fixture();
  await assert.rejects(runNativeStudioAccessReconciliation(request, {
    ...revoked.deps,
    authorize: async () => { revoked.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(revoked.calls, ['client', 'authorize']);
  const stale = fixture();
  await assert.rejects(runNativeStudioAccessReconciliation(request, {
    ...stale.deps,
    handoff: async () => { stale.calls.push('handoff'); return {
      ...handoff, scope: { ...scope, siteId: '66666666-6666-4666-8666-666666666666' } }; },
  }), /handoff_unverified/);
  assert.deepEqual(stale.calls, ['client', 'authorize', 'handoff']);
});

test('uses scoped handoff source identity and returns verified result', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioAccessReconciliation(request, f.deps), result);
  assert.deepEqual(f.calls, ['client', 'authorize', 'handoff', 'reconcile']);
});
