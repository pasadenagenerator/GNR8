import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revokeBoundNativeStudioAccessSessions } from './native-studio-access-session-revocation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const appId = '55555555-5555-4555-8555-555555555555';
const policyProof = { state: 'observed-exact-access-policy' as const, appId,
  policyId: '66666666-6666-4666-8666-666666666666',
  principals: ['access:owner@example.com'] };
const credential = 'access-manager-token-value-1234567890';

function fixture(lost = false) {
  const records = new Map<string, unknown>();
  let posts = 0, policyReads = 0;
  const store = {
    read: async <T>(key: string) => (records.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    },
    put: async <T>(key: string, value: T) => {
      if (records.has(key)) throw Error('receipt_conflict');
      records.set(key, value); return value;
    },
  };
  const deps = { actor: async () => undefined,
    policy: async () => { policyReads++; return policyProof; } };
  const transport = (async (url: string, init: RequestInit) => {
    posts++;
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}` +
      `/access/apps/${appId}/revoke_tokens`);
    assert.equal(init.method, 'POST');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    if (lost) throw Error('lost-response');
    return Response.json({ success: true, result: {} });
  }) as typeof fetch;
  const input = { scope, client: {} as SupabaseClient, store,
    accountId: 'a'.repeat(32), appId, credential,
    actor: '44444444-4444-4444-8444-444444444444',
    previousCommit: 'b'.repeat(40),
    previousPrincipals: ['access:admin@example.com', 'access:owner@example.com'],
    policyProof };
  return { input, deps, transport, posts: () => posts,
    policyReads: () => policyReads };
}

test('one scoped sign-out follows exact policy proof and persists accepted response', async () => {
  const f = fixture();
  const result = { state: 'revoke-accepted', appId,
    removed: ['access:admin@example.com'] };
  assert.deepEqual(await revokeBoundNativeStudioAccessSessions(f.input,
    f.transport, f.deps as any), result);
  assert.deepEqual(await revokeBoundNativeStudioAccessSessions(f.input,
    f.transport, f.deps as any), result);
  assert.equal(f.posts(), 1);
  assert.equal(f.policyReads(), 4);
});

test('a lost response becomes pending review and cannot issue a second sign-out', async () => {
  const f = fixture(true);
  await assert.rejects(revokeBoundNativeStudioAccessSessions(f.input,
    f.transport, f.deps as any), /pending_review/);
  await assert.rejects(revokeBoundNativeStudioAccessSessions(f.input,
    f.transport, f.deps as any), /pending_review/);
  assert.equal(f.posts(), 1);
});

test('changed policy stops before a provider request', async () => {
  const f = fixture();
  const deps = { ...f.deps, policy: async () => ({ ...policyProof,
    principals: ['access:admin@example.com', 'access:owner@example.com'] }) };
  await assert.rejects(revokeBoundNativeStudioAccessSessions(f.input,
    f.transport, deps as any), /policy_changed/);
  assert.equal(f.posts(), 0);
});
