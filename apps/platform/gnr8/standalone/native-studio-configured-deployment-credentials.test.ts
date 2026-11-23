import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { getOrCreateNativeStudioSiteSecrets,
  saveNativeStudioPublishToken } from './native-studio-secret-vault';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32), zoneId = 'b'.repeat(32);
const vaultKey = 'c'.repeat(64);
const worker = `gnr8-${scope.siteId}-studio`;
const env = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: accountId,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID: zoneId,
  GNR8_NATIVE_STUDIO_VAULT_KEY: vaultKey,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER: 'd'.repeat(40),
  GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\n' + 'e'.repeat(32) + '\n-----END PRIVATE KEY-----',
  GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET: 'f'.repeat(20),
  GNR8_NATIVE_STUDIO_AI_API_KEY: 'g'.repeat(20),
};

function vault() {
  const saved = new Map<string, unknown>();
  return { saved,
    async read<T>(key: string): Promise<T | null> { return saved.get(key) as T ?? null; },
    async claim(key: string, value: unknown) {
      if (saved.has(key)) return false;
      saved.set(key, value);
      return true;
    },
  };
}

async function installed() {
  const store = vault();
  const site = await getOrCreateNativeStudioSiteSecrets(scope, store, vaultKey);
  const publish = { accountId, tokenId: '1'.repeat(32),
    worker: `gnr8-${scope.siteId}-site`, value: 'p'.repeat(40) };
  await saveNativeStudioPublishToken(scope, store, publish, vaultKey);
  const runtime = { GITHUB_PRIVATE_KEY: env.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY,
    GITHUB_CLIENT_SECRET: env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET,
    AI_API_KEY: env.GNR8_NATIVE_STUDIO_AI_API_KEY, ...site,
    PUBLISH_CLOUDFLARE_API_TOKEN: publish.value };
  const identity = createHmac('sha256', Buffer.from(vaultKey, 'hex'))
    .update(JSON.stringify({ scope, accountId, zoneId, runtime })).digest('hex');
  store.saved.set('native-studio/first-deploy-secrets-prepared-v1.json',
    { accountId, worker, identity });
  return { store, runtime };
}

test('first deploy reads prepared site secrets and central deploy credential', async () => {
  const { store, runtime } = await installed();
  const before = store.saved.size;
  assert.deepEqual(await configuredNativeStudioDeploymentCredentials(
    scope, store, accountId, env),
  { cloudflareCredential: env.GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER,
    secrets: runtime });
  assert.equal(store.saved.size, before);
});

test('first deploy accepts the central account token without a deployer alias', async () => {
  const { store, runtime } = await installed();
  const central = 'z'.repeat(40);
  assert.deepEqual(await configuredNativeStudioDeploymentCredentials(
    scope, store, accountId, { ...env,
      GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER: '',
      GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_TOKEN: central }),
  { cloudflareCredential: central, secrets: runtime });
});

test('missing preparation, changed shared secret and foreign account fail closed', async () => {
  const { store } = await installed();
  store.saved.delete('native-studio/first-deploy-secrets-prepared-v1.json');
  await assert.rejects(configuredNativeStudioDeploymentCredentials(
    scope, store, accountId, env), /secrets_unverified/);
  const { store: installedStore } = await installed();
  await assert.rejects(configuredNativeStudioDeploymentCredentials(
    scope, installedStore, accountId,
    { ...env, GNR8_NATIVE_STUDIO_AI_API_KEY: 'h'.repeat(20) }),
  /secrets_unverified/);
  await assert.rejects(configuredNativeStudioDeploymentCredentials(
    scope, installedStore, '0'.repeat(32), env), /not_configured/);
});
