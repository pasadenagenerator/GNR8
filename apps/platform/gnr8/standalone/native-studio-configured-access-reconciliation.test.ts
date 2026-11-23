import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioAccessReconciliation } from './native-studio-configured-access-reconciliation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const sourceId = 'a'.repeat(64);
const appId = '55555555-5555-4555-8555-555555555555';
const policyId = '66666666-6666-4666-8666-666666666666';
const previous = { sourceId, headCommit: 'b'.repeat(40),
  treeSha: 'c'.repeat(40), roleBlobSha: 'd'.repeat(40),
  previousPrincipals: ['access:owner@example.com'] };
const policyProof = { state: 'observed-exact-access-policy' as const,
  appId, policyId, principals: ['access:admin@example.com', 'access:owner@example.com'] };
const env = { GNR8_NATIVE_STUDIO_ACCESS_RECONCILE_ENABLED: '1',
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'e'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER: 'access-manager-token-value-1234567890' };

test('reconciles the exact current Access policy before writing GitHub roles', async () => {
  const calls: string[] = [];
  const store = { read: async () => ({ appId }), getBytes: async () => Buffer.alloc(0),
    claim: async () => true };
  const deps = {
    store: () => store,
    inspectRoles: async () => { calls.push('inspect'); return previous; },
    policy: async () => { calls.push('policy'); return policyProof; },
    writeRoles: async () => { calls.push('roles'); return {
      state: 'verified' as const, commit: 'f'.repeat(40),
      principals: policyProof.principals }; },
  };
  const result = await configuredNativeStudioAccessReconciliation({ scope,
    client: {} as SupabaseClient, sourceId, actor }, env, fetch, deps as any);
  assert.deepEqual(calls, ['inspect', 'policy', 'roles']);
  assert.equal(result.state, 'verified');
  assert.equal(result.commit, 'f'.repeat(40));
  assert.deepEqual(result.principals, policyProof.principals);
});

test('a pending Access mutation stops before the GitHub write', async () => {
  const calls: string[] = [];
  const deps = {
    store: () => ({ read: async () => ({ appId }) }),
    inspectRoles: async () => { calls.push('inspect'); return previous; },
    policy: async () => { calls.push('policy'); throw Error('pending'); },
    writeRoles: async () => { calls.push('roles'); throw Error('unexpected'); },
  };
  await assert.rejects(configuredNativeStudioAccessReconciliation({ scope,
    client: {} as SupabaseClient, sourceId, actor }, env, fetch, deps as any),
  /pending/);
  assert.deepEqual(calls, ['inspect', 'policy']);
});
