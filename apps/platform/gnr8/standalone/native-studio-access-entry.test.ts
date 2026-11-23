import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectBoundNativeStudioAccessEntry } from './native-studio-access-entry';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32), zoneId = 'c'.repeat(32);
const appId = '44444444-4444-4444-8444-444444444444';
const credential = 'read-token-value-1234567890';
const studioOrigin = 'https://site.app.pasadenagenerator.com';
const target = { siteId: scope.siteId, studioOrigin, accountId,
  repository: 'example/site', repositoryId: 42 };
const members = [{ userId: '55555555-5555-4555-8555-555555555555',
  principal: 'access:owner@example.com' as const, role: 'owner' as const }];
const client = {} as SupabaseClient;

function fixture() {
  let currentTarget = target;
  let currentMembers = members;
  const calls: string[] = [];
  const transport = (async (url: string, init: RequestInit) => {
    calls.push(url);
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/access/apps/${appId}/policies`);
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    return Response.json({ success: true, result_info: { page: 1, count: 1,
      total_count: 1, total_pages: 1 }, result: [{ decision: 'allow',
      include: [{ email: { email: 'owner@example.com' } }] }] });
  }) as typeof fetch;
  const deps = {
    target: async () => currentTarget,
    candidates: async () => currentMembers,
    app: async () => ({ state: 'observed-access-app' as const,
      scope, siteId: scope.siteId, studioOrigin, accountId, appId,
      aud: 'b'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com' }),
    inventoryRead: async (kind: string, id: string) => {
      assert.equal(id, kind === 'accounts' ? accountId : zoneId);
      return { success: true, result: [], result_info: { page: 1, count: 0,
        total_count: 0, total_pages: 1 } };
    },
    inventory: (_body: unknown, currentId: string | null, host: string) => {
      assert.equal(host, new URL(studioOrigin).hostname);
      assert(currentId === appId || currentId === null);
      return { state: 'observed-no-access-overlap' as const,
        appId: currentId, studioHost: host, applicationsChecked: 0 };
    },
    policy: (body: unknown, principals: readonly string[]) => {
      assert.deepEqual(principals, ['access:owner@example.com']);
      assert.equal((body as { success: boolean }).success, true);
      return { state: 'observed-exact-access-policy' as const, memberCount: 1 };
    },
    challenge: async () => ({ state: 'access-studio-challenge-observed' as const,
      studioOrigin }),
  };
  return { calls, transport, deps,
    setTarget: (value: typeof target) => { currentTarget = value; },
    setMembers: (value: typeof members) => { currentMembers = value; } };
}

test('combines scoped Access app, exact current policy and login challenge', async () => {
  const f = fixture();
  assert.deepEqual(await inspectBoundNativeStudioAccessEntry({ scope, client,
    accountId, zoneId, appId, credential }, f.transport, f.deps as any), {
    state: 'observed-access-entry', scope, studioOrigin,
    repository: target.repository, appId, aud: 'b'.repeat(64),
    teamDomain: 'gnr8.cloudflareaccess.com', memberCount: 1,
  });
  assert.equal(f.calls.length, 1);
});

test('rejects a changed site or membership after provider readback', async () => {
  const changedSite = fixture();
  changedSite.deps.challenge = async () => {
    changedSite.setTarget({ ...target, repository: 'other/site' });
    return { state: 'access-studio-challenge-observed' as const, studioOrigin };
  };
  await assert.rejects(inspectBoundNativeStudioAccessEntry({ scope, client,
    accountId, zoneId, appId, credential }, changedSite.transport,
  changedSite.deps as any), /target_changed/);
  const changedMember = fixture();
  changedMember.deps.challenge = async () => {
    changedMember.setMembers([]);
    return { state: 'access-studio-challenge-observed' as const, studioOrigin };
  };
  await assert.rejects(inspectBoundNativeStudioAccessEntry({ scope, client,
    accountId, zoneId, appId, credential }, changedMember.transport,
  changedMember.deps as any), /target_changed/);
});
