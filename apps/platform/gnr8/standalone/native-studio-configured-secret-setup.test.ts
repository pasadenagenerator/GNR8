import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioSecretSetup,
  installConfiguredNativeStudioSecrets } from './native-studio-configured-secret-setup';

const environment = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: 'b'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_TOKEN_MANAGER: 'c'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_READER: 'd'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_STUDIO_INSTALLER: 'e'.repeat(40),
  GNR8_NATIVE_STUDIO_VAULT_KEY: 'f'.repeat(64),
  GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY:
    '-----BEGIN RSA PRIVATE KEY-----\nexample\n-----END RSA PRIVATE KEY-----\n',
  GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET: 'github-client-secret-long-enough',
  GNR8_NATIVE_STUDIO_AI_API_KEY: 'openai-api-key-long-enough',
};

test('one central configuration supplies the exact installer inputs', () => {
  const setup = configuredNativeStudioSecretSetup(environment);
  assert.equal(setup.accountId, environment.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID);
  assert.equal(setup.zoneId, environment.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID);
  assert.deepEqual(setup.shared, {
    GITHUB_PRIVATE_KEY: environment.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY,
    GITHUB_CLIENT_SECRET: environment.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET,
    AI_API_KEY: environment.GNR8_NATIVE_STUDIO_AI_API_KEY,
  });
  for (const key of Object.keys(environment)) {
    const incomplete = { ...environment, [key]: '' };
    assert.throws(() => configuredNativeStudioSecretSetup(incomplete),
      /native_studio_(?:setup_not_configured|runtime_secrets_not_configured)/);
  }
});

test('missing central setup fails before storage or provider access', async () => {
  let calls = 0;
  const client = { from() { calls++; throw Error('unexpected storage access'); } } as unknown as SupabaseClient;
  const transport = (async () => { calls++; throw Error('unexpected provider access'); }) as typeof fetch;
  await assert.rejects(installConfiguredNativeStudioSecrets({
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333',
  }, client, {}, transport), /native_studio_setup_not_configured/);
  assert.equal(calls, 0);
});
