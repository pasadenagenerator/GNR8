import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioAccessSetup } from './native-studio-configured-access-setup';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32), zoneId = 'b'.repeat(32);
const credential = 'access-manager-token-value-1234567890';
const env = { GNR8_NATIVE_STUDIO_ACCESS_SETUP_ENABLED: '1',
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: accountId,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: zoneId,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER: credential };
const client = {} as SupabaseClient;

test('uses one central Access setup for the exact new site', async () => {
  const calls: string[] = [];
  const store = {};
  const deps = {
    store: () => store,
    app: async (input: Record<string, unknown>) => {
      calls.push('app');
      assert.deepEqual(input, { scope, client, accountId, zoneId, credential, store });
      return { state: 'access-app-bound', target: { scope, accountId },
        appId: '44444444-4444-4444-8444-444444444444', aud: 'c'.repeat(64),
        teamDomain: 'gnr8.cloudflareaccess.com' };
    },
    policy: async (input: Record<string, unknown>) => {
      calls.push('policy');
      assert.equal(input.appId, '44444444-4444-4444-8444-444444444444');
      assert.equal(input.store, store);
      return { state: 'observed-exact-access-policy', appId: input.appId,
        memberCount: 2 };
    },
  };
  assert.deepEqual(await configuredNativeStudioAccessSetup(scope, client, env,
    fetch, deps as any), { state: 'access-setup-observed', scope,
    appId: '44444444-4444-4444-8444-444444444444',
    aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com', memberCount: 2 });
  assert.deepEqual(calls, ['app', 'policy']);
});

test('disabled or incomplete central settings stop before any provider work', async () => {
  let calls = 0;
  const deps = { store: () => { calls++; return {}; },
    app: async () => { calls++; throw Error('unexpected'); },
    policy: async () => { calls++; throw Error('unexpected'); } };
  await assert.rejects(configuredNativeStudioAccessSetup(scope, client, {},
    fetch, deps as any), /access_setup_disabled/);
  await assert.rejects(configuredNativeStudioAccessSetup(scope, client,
    { ...env, GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER: '' },
    fetch, deps as any), /access_setup_not_configured/);
  assert.equal(calls, 0);
});
