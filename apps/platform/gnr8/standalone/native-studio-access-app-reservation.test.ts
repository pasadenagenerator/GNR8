import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectNativeStudioAccessApplicationInventory } from './cloudflare-studio-access-inventory';
import { ACCESS_APP_V2_BOUND, ACCESS_APP_V2_INTENT,
  readVerifiedNativeStudioAccessAppV2Binding,
  reserveNativeStudioAccessApp } from './native-studio-access-app-reservation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32), zoneId = 'b'.repeat(32);
const credential = 'read-token-value-1234567890';
const appId = '44444444-4444-4444-8444-444444444444';
const target = { scope, accountId,
  studioOrigin: 'https://site.app.pasadenagenerator.com',
  repository: 'example/site', repositoryId: 42 };
const domain = 'site.app.pasadenagenerator.com/studio';
const previewDomain = 'preview.site.app.pasadenagenerator.com';
const previewOrigin = `https://${previewDomain}`;
const name = `gnr8-${scope.siteId}-studio-access`;
const app = { id: appId, name, type: 'self_hosted', domain,
  destinations: [{ type: 'public', uri: `${target.studioOrigin}/studio` },
    { type: 'public', uri: `${previewOrigin}/` }] };
const client = {} as SupabaseClient;

function inventory(result: unknown[]) {
  return { success: true, result, result_info: { page: 1,
    count: result.length, total_count: result.length, total_pages: 1 } };
}

function fixture(options: { created?: boolean; lostAfterCreate?: boolean;
  noCreate?: boolean; broadPolicy?: boolean } = {}) {
  const saved = new Map<string, unknown>();
  let created = options.created ?? false;
  let posts = 0;
  let current = target;
  const store = { read: async (key: string) => saved.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    } };
  const deps = {
    target: async () => current,
    inventory: async (kind: string) => inventory(kind === 'accounts' && created ? [app] : []),
    overlap: inspectNativeStudioAccessApplicationInventory,
    app: async () => ({ state: 'observed-access-app' as const,
      appId, siteId: scope.siteId, studioOrigin: target.studioOrigin,
      accountId, scope, aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com',
      protection: 'studio-and-preview' as const, previewOrigin }),
  };
  const transport = (async (url: string, init: RequestInit) => {
    if (init.method === 'POST') {
      posts++;
      assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`);
      assert.deepEqual(JSON.parse(String(init.body)), { type: 'self_hosted', name, domain,
        destinations: app.destinations });
      if (!options.noCreate) created = true;
      if (options.lostAfterCreate) throw Error('lost response');
      return Response.json({ success: true, result: app });
    }
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/access/apps/${appId}/policies`);
    return Response.json(options.broadPolicy ? { success: true, result: [{ decision: 'allow' }],
      result_info: { page: 1, count: 1, total_count: 1 } } :
      { success: true, result: [], result_info: {
        page: 1, count: 0, total_count: 0, total_pages: 0 } });
  }) as typeof fetch;
  const input = { scope, client, accountId, zoneId, credential, store: store as any };
  return { input, transport, deps, saved, posts: () => posts,
    setTarget: (value: typeof target) => { current = value; } };
}

test('creates a default-deny app once and re-verifies its bound receipt', async () => {
  const f = fixture();
  const first = await reserveNativeStudioAccessApp(f.input, f.transport, f.deps as any);
  assert.equal(first.state, 'access-app-bound');
  assert.equal(first.appId, appId);
  assert.equal(f.posts(), 1);
  assert.equal(f.saved.size, 2);
  assert.deepEqual(await reserveNativeStudioAccessApp(f.input, f.transport, f.deps as any), first);
  assert.equal(f.posts(), 1);
});

test('reconciles a lost create response without a second POST', async () => {
  const f = fixture({ lostAfterCreate: true });
  assert.equal((await reserveNativeStudioAccessApp(f.input, f.transport,
    f.deps as any)).appId, appId);
  assert.equal(f.posts(), 1);
  const pending = fixture({ noCreate: true });
  await assert.rejects(reserveNativeStudioAccessApp(pending.input,
    pending.transport, pending.deps as any), /reservation_pending/);
  await assert.rejects(reserveNativeStudioAccessApp(pending.input,
    pending.transport, pending.deps as any), /reservation_pending/);
  assert.equal(pending.posts(), 1);
});

test('refuses unowned apps, broad policies and changed site bindings', async () => {
  const unowned = fixture({ created: true });
  await assert.rejects(reserveNativeStudioAccessApp(unowned.input,
    unowned.transport, unowned.deps as any), /reservation_unowned/);
  assert.equal(unowned.posts(), 0);
  const broad = fixture({ broadPolicy: true });
  await assert.rejects(reserveNativeStudioAccessApp(broad.input,
    broad.transport, broad.deps as any), /policy_unverified/);
  assert.equal(broad.saved.size, 1);
  const changed = fixture();
  changed.deps.app = async () => {
    changed.setTarget({ ...target, repositoryId: 43 });
    return { state: 'observed-access-app' as const,
      appId, siteId: scope.siteId, studioOrigin: target.studioOrigin,
      accountId, scope, aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com',
      protection: 'studio-and-preview' as const, previewOrigin };
  };
  await assert.rejects(reserveNativeStudioAccessApp(changed.input,
    changed.transport, changed.deps as any), /target_changed/);
  assert.equal(changed.saved.size, 1);
  const forged = fixture({ created: true });
  forged.saved.set('native-studio/access-app-bound-v2.json',
    { identity: 'unrelated', appId });
  await assert.rejects(reserveNativeStudioAccessApp(forged.input,
    forged.transport, forged.deps as any), /binding_conflict/);
  assert.equal(forged.posts(), 0);
});

test('v2 binding is exact and never promotes a legacy receipt', async () => {
  const f = fixture();
  await reserveNativeStudioAccessApp(f.input, f.transport, f.deps as any);
  const bindingInput = { scope, client, accountId, zoneId, store: f.input.store };
  const deps = { target: f.deps.target };
  const bound = await readVerifiedNativeStudioAccessAppV2Binding(bindingInput, deps);
  assert.deepEqual(bound, { target, appId, aud: 'c'.repeat(64),
    teamDomain: 'gnr8.cloudflareaccess.com', previewOrigin, domain, previewDomain,
    name, identity: (f.saved.get(ACCESS_APP_V2_INTENT) as { identity: string }).identity });
  f.saved.set('native-studio/access-app-bound-v1.json', { appId });
  await assert.rejects(readVerifiedNativeStudioAccessAppV2Binding(bindingInput, deps),
    /legacy_conflict/);
  await assert.rejects(reserveNativeStudioAccessApp(f.input, f.transport, f.deps as any),
    /legacy_conflict/);
  f.saved.delete('native-studio/access-app-bound-v1.json');
  f.saved.set(ACCESS_APP_V2_BOUND, { ...(f.saved.get(ACCESS_APP_V2_BOUND) as object),
    previewOrigin: 'https://other.example.com' });
  await assert.rejects(readVerifiedNativeStudioAccessAppV2Binding(bindingInput, deps),
    /binding_unverified/);
});
