import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioAccessReconciliation } from './native-studio-configured-access-reconciliation';
import { SCHEDULED_NATIVE_STUDIO_RECONCILIATION } from './native-studio-reconciliation-authority';

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

test('removal revokes the bound application sessions before changing Git roles', async () => {
  const calls: string[] = [];
  const oldRoles = { ...previous, previousPrincipals:
    ['access:admin@example.com', 'access:owner@example.com'] };
  const newPolicy = { ...policyProof, principals: ['access:owner@example.com'] };
  const deps = {
    store: () => ({ read: async () => ({ appId }) }),
    inspectRoles: async () => { calls.push('inspect'); return oldRoles; },
    policy: async () => { calls.push('policy'); return newPolicy; },
    revokeSessions: async () => { calls.push('revoke'); return {
      state: 'revoke-accepted' as const, appId,
      removed: ['access:admin@example.com'] }; },
    writeRoles: async () => { calls.push('roles'); return {
      state: 'verified' as const, commit: 'f'.repeat(40),
      principals: newPolicy.principals }; },
  };
  const result = await configuredNativeStudioAccessReconciliation({ scope,
    client: {} as SupabaseClient, sourceId, actor }, env, fetch, deps as any);
  assert.deepEqual(calls, ['inspect', 'policy', 'revoke', 'roles']);
  assert.equal(result.sessions, 'revoke-accepted');

  calls.length = 0;
  await assert.rejects(configuredNativeStudioAccessReconciliation({ scope,
    client: {} as SupabaseClient, sourceId, actor }, env, fetch, {
      ...deps, revokeSessions: async () => { calls.push('revoke');
        throw Error('pending-review'); },
    } as any), /pending-review/);
  assert.deepEqual(calls, ['inspect', 'policy', 'revoke']);
});

test('scheduled reconciliation keeps system cause separate in an immutable result', async () => {
  const audits: Array<{ key: string; value: Record<string, unknown> }> = [];
  const deps = {
    store: () => ({ read: async () => ({ appId }),
      put: async (key: string, value: Record<string, unknown>) => {
        audits.push({ key, value }); return value; } }),
    inspectRoles: async (input: { actor: unknown }) => {
      assert.equal(input.actor, SCHEDULED_NATIVE_STUDIO_RECONCILIATION);
      return previous;
    },
    policy: async (input: { actor: unknown }) => {
      assert.equal(input.actor, SCHEDULED_NATIVE_STUDIO_RECONCILIATION);
      return policyProof;
    },
    writeRoles: async (input: { actor: unknown }) => {
      assert.equal(input.actor, SCHEDULED_NATIVE_STUDIO_RECONCILIATION);
      return { state: 'verified' as const, commit: 'f'.repeat(40),
        principals: policyProof.principals };
    },
  };
  const result = await configuredNativeStudioAccessReconciliation({ scope,
    client: {} as SupabaseClient, sourceId,
    actor: SCHEDULED_NATIVE_STUDIO_RECONCILIATION }, env, fetch, deps as any);
  assert.equal(result.actorType, 'system');
  assert.equal(audits.length, 1);
  assert.match(audits[0].key, /^native-studio\/access-system-result-[a-f0-9]{64}\.json$/);
  assert.equal(audits[0].value.actorType, 'system');
  assert.equal(audits[0].value.cause, 'scheduled-access-drift');
  assert.equal(audits[0].value.principalCount, 2);
  assert.equal(audits[0].value.removedCount, 0);
  assert.equal(JSON.stringify(audits[0]).includes('example.com'), false);
});
