import 'server-only';
import { createHmac } from 'node:crypto';
import type { PublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioPublishToken, readNativeStudioSiteSecrets } from './native-studio-secret-vault';
import { assertNativeStudioSharedSecrets,
  type NativeStudioRuntimeSecrets, type NativeStudioSharedSecrets } from './native-studio-runtime-secrets';

type Environment = Record<string, string | undefined>;
const RECEIPT = 'native-studio/first-deploy-secrets-prepared-v1.json';
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

/** A read-only handoff from prepared vault secrets to first deployment. */
export async function configuredNativeStudioDeploymentCredentials(
  scope: NativeStudioScope,
  store: Pick<PublicationStore, 'read'>,
  accountId: string,
  env: Environment = process.env,
): Promise<{ cloudflareCredential: string; secrets: NativeStudioRuntimeSecrets }> {
  const configuredAccount = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  const vaultKey = env.GNR8_NATIVE_STUDIO_VAULT_KEY ?? '';
  const cloudflareCredential = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER ?? '';
  const shared: NativeStudioSharedSecrets = {
    GITHUB_PRIVATE_KEY: env.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY ?? '',
    GITHUB_CLIENT_SECRET: env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET ?? '',
    AI_API_KEY: env.GNR8_NATIVE_STUDIO_AI_API_KEY ?? '',
  };
  if (!HEX32.test(accountId) || configuredAccount !== accountId ||
      !HEX32.test(zoneId) || !/^[a-f0-9]{64}$/.test(vaultKey) ||
      !TOKEN.test(cloudflareCredential))
    throw Error('native_studio_deploy_credentials_not_configured');
  assertNativeStudioSharedSecrets(shared);
  const receipt = await store.read<{ accountId: string;
    identity: string; worker: string }>(RECEIPT);
  const worker = `gnr8-${scope.siteId}-studio`;
  if (!receipt || Object.keys(receipt).sort().join() !==
      'accountId,identity,worker' || receipt.accountId !== accountId ||
      receipt.worker !== worker)
    throw Error('native_studio_deploy_secrets_unverified');
  const [publish, site] = await Promise.all([
    readNativeStudioPublishToken(scope, store, accountId, vaultKey),
    readNativeStudioSiteSecrets(scope, store, vaultKey),
  ]);
  if (!publish || !site) throw Error('native_studio_deploy_secrets_unverified');
  const secrets = { ...shared, ...site,
    PUBLISH_CLOUDFLARE_API_TOKEN: publish.value };
  const identity = createHmac('sha256', Buffer.from(vaultKey, 'hex'))
    .update(JSON.stringify({ scope, accountId, zoneId, runtime: secrets }))
    .digest('hex');
  if (identity !== receipt.identity)
    throw Error('native_studio_deploy_secrets_unverified');
  return { cloudflareCredential, secrets };
}
