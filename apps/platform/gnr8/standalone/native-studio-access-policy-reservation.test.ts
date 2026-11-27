import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioAccessCandidate } from './native-studio-access-candidates';
import { ensureNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reservation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const zoneId = 'e'.repeat(32);
const appId = '44444444-4444-4444-8444-444444444444';
const previewOrigin = 'https://preview.site.app.pasadenagenerator.com';
const credential = 'read-token-value-1234567890';
const target = { scope, accountId,
  studioOrigin: 'https://site.app.pasadenagenerator.com',
  repository: 'example/site', repositoryId: 42 };
const owner = { userId: '55555555-5555-4555-8555-555555555555',
  principal: 'access:owner@example.com' as const, role: 'owner' as const };
const client = {} as SupabaseClient;

function fixture(options: { lostResponse?: boolean; omitWrite?: boolean;
  existingPolicy?: boolean; beforeIntentChange?: boolean;
  afterClaimChange?: boolean; afterPostChange?: boolean;
  emptyPagesZero?: boolean } = {}) {
  const saved = new Map<string, unknown>([
    ['native-studio/access-app-create-intent-v2.json',
      { identity: 'd'.repeat(64), target }],
    ['native-studio/access-app-bound-v2.json',
      { identity: 'd'.repeat(64), appId, aud: 'b'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com', previewOrigin }],
  ]);
  let principals: NativeStudioAccessCandidate[] = [owner];
  let policy = options.existingPolicy === true;
  let posts = 0;
  let candidateReads = 0;
  const other = { ...owner, userId: '66666666-6666-4666-8666-666666666666',
    principal: 'access:other@example.com' as const };
  const deps = {
    target: async () => target,
    binding: async () => {
      if (saved.has('native-studio/access-app-create-intent-v1.json') ||
          saved.has('native-studio/access-app-bound-v1.json') ||
          !saved.has('native-studio/access-app-create-intent-v2.json') ||
          !saved.has('native-studio/access-app-bound-v2.json'))
        throw Error('native_studio_access_app_v2_binding_unverified');
      return { target, appId, aud: 'b'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com', previewOrigin };
    },
    candidates: async () => {
      candidateReads++;
      if (options.beforeIntentChange && candidateReads >= 2)
        principals = [];
      if (options.afterClaimChange && candidateReads >= 3)
        principals = [];
      if (options.afterPostChange && candidateReads >= 4)
        principals = [other];
      return principals;
    },
    app: async (...args: unknown[]) => {
      assert.equal(args[5], 'studio-and-preview');
      return { state: 'observed-access-app' as const, appId,
      studioOrigin: target.studioOrigin, accountId,
      scope, siteId: scope.siteId, aud: 'b'.repeat(64),
      teamDomain: 'gnr8.cloudflareaccess.com',
      protection: 'studio-and-preview' as const, previewOrigin };
    },
  };
  const store = {
    read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const transport = (async (url: string, init: RequestInit) => {
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/access/apps/${appId}/policies`);
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    if (init.method === 'POST') {
      posts++;
      const body = JSON.parse(String(init.body));
      assert.deepEqual(body, { name: `gnr8-${scope.siteId}-studio-owners`,
        decision: 'allow', include: [{ email: { email: 'owner@example.com' } }] });
      if (!options.omitWrite) policy = true;
      if (options.lostResponse) throw Error('lost response');
      return Response.json({ success: true, result: { id: 'policy' } });
    }
    assert.equal(init.method, 'GET');
    return Response.json({ success: true,
      result: policy ? [{ decision: 'allow',
        include: [{ email: { email: 'owner@example.com' } }] }] : [],
      result_info: { page: 1, count: policy ? 1 : 0,
        total_count: policy ? 1 : 0,
        total_pages: policy ? 1 : options.emptyPagesZero ? 0 : 1 } });
  }) as typeof fetch;
  const input = { scope, client, accountId, zoneId, appId, credential, store };
  return { input, deps, transport, saved, posts: () => posts };
}

test('creates one exact email Allow policy after a single durable intent', async () => {
  const f = fixture({ emptyPagesZero: true });
  assert.deepEqual(await ensureNativeStudioAccessOwnerPolicy(f.input,
    f.transport, f.deps as any), { state: 'observed-exact-access-policy',
    appId, memberCount: 1 });
  assert.equal(f.posts(), 1);
  assert.equal(f.saved.size, 3);
  assert.equal((await ensureNativeStudioAccessOwnerPolicy(f.input,
    f.transport, f.deps as any)).state, 'observed-exact-access-policy');
  assert.equal(f.posts(), 1);
});

test('lost response reconciles once; absent policy stays pending without retry', async () => {
  const created = fixture({ lostResponse: true });
  assert.equal((await ensureNativeStudioAccessOwnerPolicy(created.input,
    created.transport, created.deps as any)).state, 'observed-exact-access-policy');
  assert.equal(created.posts(), 1);
  const absent = fixture({ lostResponse: true, omitWrite: true });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(absent.input,
    absent.transport, absent.deps as any), /native_studio_access_policy_pending/);
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(absent.input,
    absent.transport, absent.deps as any), /native_studio_access_policy_pending/);
  assert.equal(absent.posts(), 1);
});

test('does not adopt an unowned policy or create with changed members', async () => {
  const unbound = fixture();
  unbound.saved.delete('native-studio/access-app-bound-v2.json');
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(unbound.input,
    unbound.transport, unbound.deps as any), /binding_unverified/);
  assert.equal(unbound.posts(), 0);
  const legacy = fixture();
  legacy.saved.set('native-studio/access-app-bound-v1.json', { appId });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(legacy.input,
    legacy.transport, legacy.deps as any), /binding_unverified/);
  assert.equal(legacy.posts(), 0);
  const unowned = fixture({ existingPolicy: true });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(unowned.input,
    unowned.transport, unowned.deps as any), /native_studio_access_policy_unowned/);
  assert.equal(unowned.saved.size, 2);
  const changed = fixture({ beforeIntentChange: true });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(changed.input,
    changed.transport, changed.deps as any), /identity_unverified|members_changed/);
  assert.equal(changed.saved.size, 2);
  assert.equal(changed.posts(), 0);
  const afterClaim = fixture({ afterClaimChange: true });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(afterClaim.input,
    afterClaim.transport, afterClaim.deps as any), /identity_unverified|members_changed/);
  assert.equal(afterClaim.saved.size, 3);
  assert.equal(afterClaim.posts(), 0);
  const afterPost = fixture({ afterPostChange: true });
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(afterPost.input,
    afterPost.transport, afterPost.deps as any), /members_changed/);
  assert.equal(afterPost.posts(), 1);
  await assert.rejects(ensureNativeStudioAccessOwnerPolicy(afterPost.input,
    afterPost.transport, afterPost.deps as any), /intent_conflict/);
  assert.equal(afterPost.posts(), 1);
});
