import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioSecretSetup,
  installConfiguredNativeStudioSecrets } from './native-studio-configured-secret-setup';

const environment = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: 'b'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_TOKEN_MANAGER: 'c'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER: 'g'.repeat(40),
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
  assert.equal(setup.r2Manager, environment.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER);
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

test('draft bucket verification precedes publish-token and Studio secret writes', async () => {
  const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333' };
  let bucketReads = 0;
  let otherProviderCalls = 0;
  let bucketAccessible = false;
  const client = {
    storage: {
      getBucket: async () => ({ data: { public: false }, error: null }),
      from: () => ({ download: async () => ({ data: null,
        error: { status: 404, statusCode: 'NoSuchKey' } }) }),
    },
    from(name: string) {
      const filters: Record<string, string> = {};
      const query = { eq(key: string, value: string) { filters[key] = value; return query; },
        async maybeSingle() {
          assert.equal(filters.site_id ?? filters.id, scope.siteId);
          assert.equal(filters.agency_id, scope.agencyId);
          assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
          return { error: null, data: name === 'sites'
            ? { domain: 'site.app.pasadenagenerator.com' }
            : { github_owner: 'pasadenagenerator', github_owner_id: 123,
                github_owner_kind: 'User', repository: 'gnr8-site-3333',
                repository_id: 456, binding_state: 'bound' } };
        } };
      return { select: () => query };
    },
  } as unknown as SupabaseClient;
  const transport = (async (url: string, options: RequestInit) => {
    if (new URL(url).pathname.endsWith(`/r2/buckets/gnr8-${scope.siteId}-drafts`)) {
      bucketReads++;
      assert.equal(new Headers(options.headers).get('authorization'),
        `Bearer ${environment.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER}`);
      return bucketAccessible
        ? Response.json({ success: true, result: {
            name: `gnr8-${scope.siteId}-drafts`, jurisdiction: 'default' } })
        : new Response(null, { status: 403 });
    }
    if (new URL(url).pathname.endsWith('/domains/managed'))
      return Response.json({ success: true, result: { bucketId: '9'.repeat(32), enabled: false } });
    if (new URL(url).pathname.endsWith('/domains/custom'))
      return Response.json({ success: true, result: { domains: [] } });
    if (new URL(url).pathname.endsWith(`/workers/workers/gnr8-${scope.siteId}-site`)) {
      otherProviderCalls++;
      return new Response(null, { status: 403 });
    }
    throw Error('unexpected provider call');
  }) as typeof fetch;
  await assert.rejects(installConfiguredNativeStudioSecrets(scope, client,
    environment, transport), /native_studio_draft_bucket_provider_unavailable/);
  assert.equal(bucketReads, 1);
  assert.equal(otherProviderCalls, 0);
  bucketAccessible = true;
  await assert.rejects(installConfiguredNativeStudioSecrets(scope, client,
    environment, transport), /native_studio_publish_provider_request_failed/);
  assert.equal(bucketReads, 2);
  assert.equal(otherProviderCalls, 1);
});
