import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';
import { saveNativeStudioPublishToken } from './native-studio-secret-vault';
import { installNativeStudioSecrets } from './cloudflare-studio-secrets';

const scope = {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
};
const master = 'f'.repeat(64);
const shared = {
  GITHUB_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nexample\n-----END RSA PRIVATE KEY-----\n',
  GITHUB_CLIENT_SECRET: 'github-client-secret-long-enough',
  AI_API_KEY: 'openai-api-key-long-enough',
};
const accountId = 'a'.repeat(32);
const publishToken = { accountId, tokenId: 'b'.repeat(32),
  worker: `gnr8-${scope.siteId}-site`, value: 'cfat_' + 'P'.repeat(45) };

function store() {
  const saved = new Map<string, unknown>();
  return {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value);
      return true;
    },
    dump: () => JSON.stringify([...saved.values()]),
  };
}

test('assembles exact native secrets and reuses per-site values on retry', async () => {
  const vault = store();
  await saveNativeStudioPublishToken(scope, vault, publishToken, master);
  const first = await nativeStudioRuntimeSecrets(scope, vault, shared, accountId, master);
  assert.deepEqual(Object.keys(first).sort(), [
    'AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET', 'GITHUB_PRIVATE_KEY',
    'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET',
  ]);
  assert.deepEqual(await nativeStudioRuntimeSecrets(scope, vault, shared, accountId, master), first);
  assert.equal(first.PUBLISH_CLOUDFLARE_API_TOKEN, publishToken.value);
  for (const secret of Object.values(first)) assert(!vault.dump().includes(secret));
});

test('missing shared credentials fail before creating per-site values', async () => {
  const vault = store();
  await assert.rejects(nativeStudioRuntimeSecrets(scope, vault,
    { ...shared, AI_API_KEY: '' }, accountId, master),
  /native_studio_runtime_secrets_not_configured/);
  assert.equal(vault.dump(), '[]');
  await assert.rejects(nativeStudioRuntimeSecrets(scope, vault, shared, accountId, master),
    /native_studio_publish_token_missing/);
  assert.equal(vault.dump(), '[]');
});

test('saved provider token reaches only the matching Worker secret patch', async () => {
  const vault = store();
  await saveNativeStudioPublishToken(scope, vault, publishToken, master);
  const runtime = await nativeStudioRuntimeSecrets(scope, vault, shared, accountId, master);
  let patched: unknown;
  const transport = (async (url: string, init: RequestInit) => {
    if (init.method === 'PATCH') {
      patched = JSON.parse(String(init.body));
      return Response.json({ success: true, result: {} });
    }
    return Response.json({ success: true, result:
      url.endsWith('/deployments?per_page=1')
        ? { deployments: [{ versions: [{ version_id: patched
          ? '44444444-4444-4444-8444-444444444444'
          : '33333333-3333-4333-8333-333333333333', percentage: 100 }] }] }
        : { id: url.endsWith('/versions/33333333-3333-4333-8333-333333333333')
          ? '33333333-3333-4333-8333-333333333333'
          : '44444444-4444-4444-8444-444444444444',
          resources: { bindings: patched ? Object.keys(runtime)
            .map(name => ({ name, type: 'secret_text' })) : [] } } });
  }) as typeof fetch;
  const result = await installNativeStudioSecrets(scope, accountId,
    'central-cloudflare-setup-token', runtime, transport);
  assert.equal(result.worker, `gnr8-${scope.siteId}-studio`);
  assert.equal((patched as { secrets: Record<string, { text: string }> }).secrets
    .PUBLISH_CLOUDFLARE_API_TOKEN.text, publishToken.value);
});
