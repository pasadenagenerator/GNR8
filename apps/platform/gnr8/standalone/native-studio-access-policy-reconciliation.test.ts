import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprint } from './publication-contract';
import { inspectCurrentNativeStudioAccessOwnerPolicy,
  reconcileNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reconciliation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const accountId = 'a'.repeat(32);
const appId = '55555555-5555-4555-8555-555555555555';
const policyId = '66666666-6666-4666-8666-666666666666';
const previousCommit = 'b'.repeat(40);
const credential = 'access-manager-token-value-1234567890';
const previous = ['access:owner@example.com'];
const desired = ['access:admin@example.com', 'access:owner@example.com'];
const target = { scope, accountId, studioOrigin: 'https://site.app.pasadenagenerator.com',
  repository: 'example/site', repositoryId: 42 };
const name = `gnr8-${scope.siteId}-studio-owners`;
const client = {} as SupabaseClient;

function fixture(options: { lostResponse?: boolean; omitWrite?: boolean;
  externallyChanged?: boolean; memberChangeAt?: number } = {}) {
  const saved = new Map<string, unknown>([
    ['native-studio/access-app-create-intent-v1.json',
      { identity: 'd'.repeat(64), target }],
    ['native-studio/access-app-bound-v1.json',
      { identity: 'd'.repeat(64), appId, aud: 'c'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com' }],
    ['native-studio/access-policy-create-intent-v1.json',
      { identity: fingerprint({ scope, target, accountId, appId,
        principals: previous }), scope, target, accountId, appId, principals: previous }],
  ]);
  let current = options.externallyChanged ? desired : previous;
  let candidateReads = 0, puts = 0, authorizations = 0;
  const store = {
    read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const deps = {
    target: async () => target,
    candidates: async () => {
      if (++candidateReads >= (options.memberChangeAt ?? Infinity))
        return [{ principal: 'access:other@example.com' }];
      return desired.map(principal => ({ principal }));
    },
    app: async () => ({ state: 'observed-access-app' as const,
      appId, accountId, studioOrigin: target.studioOrigin,
      aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com' }),
    actor: async () => { authorizations++; },
  };
  const transport = (async (url: string, init: RequestInit) => {
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    if (init.method === 'PUT') {
      puts++;
      assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
        `/access/apps/${appId}/policies/${policyId}`);
      assert.deepEqual(JSON.parse(String(init.body)), { name, decision: 'allow',
        include: desired.map(principal => ({ email: { email: principal.slice(7) } })) });
      if (!options.omitWrite) current = desired;
      if (options.lostResponse) throw Error('lost response');
      return Response.json({ success: true, result: { id: policyId } });
    }
    assert.equal(init.method, 'GET');
    return Response.json({ success: true,
      result: [{ id: policyId, name, decision: 'allow',
        include: current.map(principal => ({ email: { email: principal.slice(7) } })) }],
      result_info: { page: 1, count: 1, total_count: 1, total_pages: 1 } });
  }) as typeof fetch;
  const base = { scope, client, accountId, appId, credential, store };
  const mutation = { ...base, actor, previousCommit, previousPrincipals: previous };
  return { saved, deps, transport, base, mutation,
    puts: () => puts, authorizations: () => authorizations };
}

test('updates exact bound policy once and provides fresh read-only proof for Git roles', async () => {
  const f = fixture();
  const expected = { state: 'observed-exact-access-policy', appId, policyId,
    principals: desired };
  assert.deepEqual(await reconcileNativeStudioAccessOwnerPolicy(f.mutation,
    f.transport, f.deps as any), expected);
  assert.equal(f.puts(), 1);
  assert.equal(f.authorizations(), 2);
  assert.deepEqual(await inspectCurrentNativeStudioAccessOwnerPolicy(f.base,
    f.transport, f.deps as any), expected);
  assert.deepEqual(await reconcileNativeStudioAccessOwnerPolicy(f.mutation,
    f.transport, f.deps as any), expected);
  assert.equal(f.puts(), 1);
  assert.equal([...f.saved.keys()].filter(key => key.includes('policy-reconcile-')).length, 1);
});

test('lost PUT response is read back; unresolved write never retries automatically', async () => {
  const lost = fixture({ lostResponse: true });
  assert.equal((await reconcileNativeStudioAccessOwnerPolicy(lost.mutation,
    lost.transport, lost.deps as any)).policyId, policyId);
  assert.equal(lost.puts(), 1);
  const pending = fixture({ lostResponse: true, omitWrite: true });
  await assert.rejects(reconcileNativeStudioAccessOwnerPolicy(pending.mutation,
    pending.transport, pending.deps as any), /reconciliation_pending/);
  await assert.rejects(reconcileNativeStudioAccessOwnerPolicy(pending.mutation,
    pending.transport, pending.deps as any), /reconciliation_pending/);
  assert.equal(pending.puts(), 1);
});

test('stale members and externally changed policy stop before policy mutation', async () => {
  const changed = fixture({ memberChangeAt: 4 });
  await assert.rejects(reconcileNativeStudioAccessOwnerPolicy(changed.mutation,
    changed.transport, changed.deps as any), /reconciliation_members_changed/);
  assert.equal(changed.puts(), 0);
  const foreign = fixture({ externallyChanged: true });
  await assert.rejects(reconcileNativeStudioAccessOwnerPolicy(foreign.mutation,
    foreign.transport, foreign.deps as any), /reconciliation_unowned_change/);
  assert.equal(foreign.puts(), 0);
  const unbound = fixture();
  unbound.saved.delete('native-studio/access-app-bound-v1.json');
  await assert.rejects(reconcileNativeStudioAccessOwnerPolicy(unbound.mutation,
    unbound.transport, unbound.deps as any), /reconciliation_binding_unverified/);
  assert.equal(unbound.puts(), 0);
});
