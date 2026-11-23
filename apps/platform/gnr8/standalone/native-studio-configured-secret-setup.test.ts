import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioSecretPreparation, configuredNativeStudioSecretSetup,
  installConfiguredNativeStudioSecrets,
  prepareConfiguredNativeStudioFirstDeploySecrets } from './native-studio-configured-secret-setup';

const environment = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: 'b'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_TOKEN_MANAGER: 'c'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER: 'g'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_READER: 'd'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_BUILDS_USER_TOKEN: 'h'.repeat(40),
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

test('first-deploy secret preparation needs no active-version installer credential', () => {
  const { GNR8_NATIVE_STUDIO_CLOUDFLARE_STUDIO_INSTALLER: _installer,
    ...beforeDeployment } = environment;
  assert.equal(configuredNativeStudioSecretPreparation(beforeDeployment).accountId,
    environment.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID);
  assert.throws(() => configuredNativeStudioSecretSetup(beforeDeployment),
    /native_studio_setup_not_configured/);
});

test('preparation claims one scoped receipt without an active Worker version', async () => {
  const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333' };
  const { GNR8_NATIVE_STUDIO_CLOUDFLARE_STUDIO_INSTALLER: _installer,
    ...env } = environment;
  const saved = new Map<string, unknown>();
  const calls: string[] = [];
  const store = {
    read: async (key: string) => saved.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const runtime = { ...configuredNativeStudioSecretPreparation(env).shared,
    SESSION_SECRET: 's'.repeat(43), CONTAINER_TOKEN: 't'.repeat(43),
    PUBLISH_CLOUDFLARE_API_TOKEN: 'p'.repeat(40) };
  const deps = {
    store: () => store,
    ensureBucket: async () => { calls.push('bucket'); },
    provider: () => ({}),
    ensureToken: async () => { calls.push('token'); return { value: 'p'.repeat(40) }; },
    runtime: async () => { calls.push('runtime'); return runtime; },
  } as any;
  const input = [scope, {} as SupabaseClient, env,
    (async () => { throw Error('unexpected provider request'); }) as typeof fetch,
    deps] as const;
  const result = await prepareConfiguredNativeStudioFirstDeploySecrets(...input);
  assert.deepEqual(result, { worker: `gnr8-${scope.siteId}-studio`, state: 'prepared' });
  assert.deepEqual(calls, ['bucket', 'token', 'runtime']);
  const receipt = saved.get('native-studio/first-deploy-secrets-prepared-v1.json') as
    { accountId: string; worker: string; identity: string };
  assert.equal(receipt.accountId, env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID);
  assert.match(receipt.identity, /^[a-f0-9]{64}$/);
  assert.equal(saved.size, 1);
  await prepareConfiguredNativeStudioFirstDeploySecrets(...input);
  assert.equal(saved.size, 1);
  await assert.rejects(prepareConfiguredNativeStudioFirstDeploySecrets(
    scope, {} as SupabaseClient, env, input[3], {
      ...deps, runtime: async () => ({ ...runtime, AI_API_KEY: 'changed-secret' }),
    }), /native_studio_deploy_secrets_conflict/);
});

test('missing shared Builds credential fails before storage or provider access', async () => {
  let calls = 0;
  const client = { from() { calls++; throw Error('unexpected storage access'); } } as unknown as SupabaseClient;
  const transport = (async () => { calls++; throw Error('unexpected provider access'); }) as typeof fetch;
  await assert.rejects(installConfiguredNativeStudioSecrets({
    agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333',
  }, client, { ...environment,
    GNR8_NATIVE_STUDIO_CLOUDFLARE_BUILDS_USER_TOKEN: '' },
  transport), /native_studio_setup_not_configured/);
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
