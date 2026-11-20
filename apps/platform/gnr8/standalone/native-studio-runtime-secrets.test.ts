import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

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
const publishToken = 'site-publish-token-long-enough';

function store() {
  let saved: unknown = null;
  return {
    read: async <T>() => saved as T | null,
    claim: async (_key: string, value: unknown) => {
      if (saved !== null) return false;
      saved = value;
      return true;
    },
    dump: () => JSON.stringify(saved),
  };
}

test('assembles exact native secrets and reuses per-site values on retry', async () => {
  const vault = store();
  const first = await nativeStudioRuntimeSecrets(scope, vault, shared, publishToken, master);
  assert.deepEqual(Object.keys(first).sort(), [
    'AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET', 'GITHUB_PRIVATE_KEY',
    'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET',
  ]);
  assert.deepEqual(await nativeStudioRuntimeSecrets(scope, vault, shared, publishToken, master), first);
  for (const secret of Object.values(first)) assert(!vault.dump().includes(secret));
});

test('missing shared credentials fail before creating per-site values', async () => {
  const vault = store();
  await assert.rejects(nativeStudioRuntimeSecrets(scope, vault,
    { ...shared, AI_API_KEY: '' }, publishToken, master),
  /native_studio_runtime_secrets_not_configured/);
  assert.equal(vault.dump(), 'null');
  await assert.rejects(nativeStudioRuntimeSecrets(scope, vault, shared, '', master),
    /native_studio_runtime_secrets_not_configured/);
  assert.equal(vault.dump(), 'null');
});
