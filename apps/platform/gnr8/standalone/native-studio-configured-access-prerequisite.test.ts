import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureConfiguredNativeStudioAccessBeforeSource } from './native-studio-configured-access-prerequisite';

const agencyId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const legacySiteId = '2e7146cd-e516-4088-94ad-6cac90cb17f4';
const newSiteId = '33333333-3333-4333-8333-333333333333';
const client = {} as SupabaseClient;
const env = { GNR8_NATIVE_STUDIO_ACCESS_SETUP_ENABLED: '1',
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: 'b'.repeat(32) };

function fixture(scope: { agencyId: string; clientId: string; siteId: string }) {
  const stored = new Map<string, unknown>();
  const calls: string[] = [];
  const deps = {
    store: () => ({ read: async (key: string) => stored.get(key) ?? null }),
    target: async (receivedScope: typeof scope, receivedClient: SupabaseClient,
      accountId: string) => {
      calls.push('target');
      assert.deepEqual(receivedScope, scope);
      assert.equal(receivedClient, client);
      assert.equal(accountId, env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID);
      return { scope, accountId,
        studioOrigin: 'https://site.app.pasadenagenerator.com' };
    },
    setup: async (receivedScope: typeof scope, receivedClient: SupabaseClient,
      receivedEnv: typeof env, receivedTransport: typeof fetch) => {
      assert.deepEqual(receivedScope, scope);
      assert.equal(receivedClient, client);
      assert.equal(receivedEnv, env);
      assert.equal(receivedTransport, fetch);
      calls.push('setup');
      return { state: 'access-setup-observed' as const, scope,
        appId: '4'.repeat(32), aud: 'a'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com', memberCount: 1 };
    },
    binding: async () => {
      calls.push('binding');
      return { target: { scope, accountId: env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
        studioOrigin: 'https://site.app.pasadenagenerator.com' },
        appId: '4'.repeat(32), aud: 'a'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com',
        previewOrigin: 'https://preview.site.app.pasadenagenerator.com' };
    },
  };
  return { stored, calls, deps };
}

test('new site always completes Access setup before source preparation', async () => {
  const scope = { agencyId, clientId, siteId: newSiteId };
  const f = fixture(scope);
  assert.equal((await ensureConfiguredNativeStudioAccessBeforeSource(
    scope, client, env, fetch, f.deps as any)).state, 'access-setup-observed');
  assert.deepEqual(f.calls, ['target', 'setup', 'binding']);
});

test('only a retained site without any Access evidence keeps repository mode', async () => {
  const scope = { agencyId, clientId, siteId: legacySiteId };
  const f = fixture(scope);
  assert.deepEqual(await ensureConfiguredNativeStudioAccessBeforeSource(
    scope, client, env, fetch, f.deps as any),
  { state: 'retained-repository-source', scope });
  assert.deepEqual(f.calls, []);
  f.stored.set('native-studio/access-app-create-intent-v1.json', { identity: 'started' });
  await assert.rejects(ensureConfiguredNativeStudioAccessBeforeSource(
    scope, client, env, fetch, f.deps as any), /legacy_conflict/);
  assert.deepEqual(f.calls, []);
  f.stored.delete('native-studio/access-app-create-intent-v1.json');
  f.stored.set('native-studio/access-app-create-intent-v2.json', { identity: 'started' });
  assert.equal((await ensureConfiguredNativeStudioAccessBeforeSource(
    scope, client, env, fetch, f.deps as any)).state, 'access-setup-observed');
  assert.deepEqual(f.calls, ['target', 'setup', 'binding']);
});

test('invalid scope or incomplete setup fails before source preparation', async () => {
  const scope = { agencyId, clientId, siteId: newSiteId };
  const f = fixture(scope);
  await assert.rejects(ensureConfiguredNativeStudioAccessBeforeSource(
    { ...scope, siteId: 'bad' }, client, env, fetch, f.deps as any),
  /native_studio_access_prerequisite_input_invalid/);
  assert.deepEqual(f.calls, []);
  await assert.rejects(ensureConfiguredNativeStudioAccessBeforeSource(
    scope, client, env, fetch, { ...f.deps,
      setup: async () => ({ state: 'access-setup-observed' as const,
        scope, memberCount: 0 }),
    } as any), /native_studio_access_prerequisite_unverified/);
  assert.deepEqual(f.calls, ['target']);
});
