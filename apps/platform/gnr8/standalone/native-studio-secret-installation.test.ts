import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { installNativeStudioRuntimeSecrets } from './native-studio-secret-installation';
import type { PublishTokenMetadata, PublishTokenProvider,
  PublishTokenTarget } from './native-studio-publish-token-issuer';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const zoneId = 'b'.repeat(32);
const tokenId = 'c'.repeat(32);
const value = 'cfat_' + 'P'.repeat(45);
const versionId = '44444444-4444-4444-8444-444444444444';
const previousVersionId = '33333333-3333-4333-8333-333333333333';
const nextVersionId = '55555555-5555-4555-8555-555555555555';
const master = 'f'.repeat(64);
const shared = {
  GITHUB_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nexample\n-----END RSA PRIVATE KEY-----\n',
  GITHUB_CLIENT_SECRET: 'github-client-secret-long-enough',
  AI_API_KEY: 'openai-api-key-long-enough',
};

function siteClient(bound = true) {
  return { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        assert.equal(filters.site_id ?? filters.id, scope.siteId);
        assert.equal(filters.agency_id, scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
        return { error: null, data: name === 'sites'
          ? { domain: 'site.app.pasadenagenerator.com' }
          : { github_owner: 'example', repository: 'site', repository_id: 123,
              binding_state: bound ? 'bound' : 'creating' } };
      } };
    assert(['sites', 'gnr8_site_github_repository_bindings'].includes(name));
    return { select: () => query };
  } } as unknown as SupabaseClient;
}

function fixture() {
  const saved = new Map<string, unknown>();
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, data: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, data);
      return true;
    },
  };
  let live: PublishTokenMetadata | null = null;
  let creates = 0;
  let patches = 0;
  let patched: Record<string, { text: string }> = {};
  const provider: PublishTokenProvider = {
    assertWorker: async () => {},
    findByName: async () => live ? [live] : [],
    create: async (target: PublishTokenTarget) => {
      creates++;
      live = { ...target, id: tokenId, status: 'active',
        permissions: ['Workers Routes Write', 'Individual Workers Editor'] };
      return { id: tokenId, value };
    },
    roll: async () => { throw Error('unexpected roll'); },
    verifyValue: async (_target, id, candidate) => id === tokenId && candidate === value,
  };
  const transport = (async (url: string, init: RequestInit) => {
    assert(url.includes(`/accounts/${accountId}/workers/scripts/gnr8-${scope.siteId}-studio/`));
    if (init.method === 'PATCH') {
      patches++;
      patched = (JSON.parse(String(init.body)) as { secrets: Record<string, { text: string }> }).secrets;
      return Response.json({ success: true, result: {} });
    }
    const result = url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: patches === 0 ? previousVersionId
        : patches === 1 ? versionId : nextVersionId, percentage: 100 }] }] }
      : { id: patches === 1 ? versionId : nextVersionId,
        resources: { bindings: Object.keys(patched)
        .map(name => ({ name, type: 'secret_text' })) } };
    return Response.json({ success: true, result });
  }) as typeof fetch;
  return { store, saved, provider, transport,
    creates: () => creates, patches: () => patches, patched: () => patched };
}

test('one step issues, seals, installs, reads back and reuses native secrets', async () => {
  const f = fixture();
  const first = await installNativeStudioRuntimeSecrets(scope, accountId, zoneId,
    f.store, master, shared, f.provider, 'cloudflare-studio-setup-token', siteClient(), f.transport);
  assert.equal(first.worker, `gnr8-${scope.siteId}-studio`);
  assert.equal(first.versionId, versionId);
  assert.equal(f.patched().PUBLISH_CLOUDFLARE_API_TOKEN?.text, value);
  assert.equal(f.creates(), 1);
  assert.equal(f.patches(), 1);
  assert(!JSON.stringify([...f.saved.values()]).includes(value));
  const original = f.patched();
  const second = await installNativeStudioRuntimeSecrets(scope, accountId, zoneId,
    f.store, master, shared, f.provider, 'cloudflare-studio-setup-token', siteClient(), f.transport);
  assert.deepEqual(second.secretNames, first.secretNames);
  assert.equal(second.versionId, nextVersionId);
  assert.deepEqual(f.patched(), original);
  assert.equal(f.creates(), 1);
  assert.equal(f.patches(), 2);
});

test('missing shared or installer credential stops before token issuance', async () => {
  const f = fixture();
  await assert.rejects(installNativeStudioRuntimeSecrets(scope, accountId, zoneId,
    f.store, master, { ...shared, AI_API_KEY: '' }, f.provider,
    'cloudflare-studio-setup-token', siteClient(), f.transport),
  /native_studio_runtime_secrets_not_configured/);
  await assert.rejects(installNativeStudioRuntimeSecrets(scope, accountId, zoneId,
    f.store, master, shared, f.provider, '', siteClient(), f.transport),
  /native_studio_secret_install_invalid/);
  assert.equal(f.creates(), 0);
  assert.equal(f.patches(), 0);
  assert.equal(f.saved.size, 0);
});

test('an unbound repository stops before token issuance or secret upload', async () => {
  const f = fixture();
  await assert.rejects(installNativeStudioRuntimeSecrets(scope, accountId, zoneId,
    f.store, master, shared, f.provider, 'cloudflare-studio-setup-token',
    siteClient(false), f.transport), /native_studio_site_not_bound/);
  assert.equal(f.creates(), 0);
  assert.equal(f.patches(), 0);
  assert.equal(f.saved.size, 0);
});
