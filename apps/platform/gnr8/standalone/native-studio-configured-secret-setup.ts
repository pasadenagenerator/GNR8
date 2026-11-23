import 'server-only';
import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { ensureBoundCloudflareStudioDraftBucket } from './cloudflare-studio-draft-bucket';
import { CloudflarePublishTokenProvider } from './cloudflare-publish-token-provider';
import { ensureNativeStudioPublishToken } from './native-studio-publish-token-issuer';
import { installNativeStudioRuntimeSecrets } from './native-studio-secret-installation';
import { assertNativeStudioSharedSecrets,
  nativeStudioRuntimeSecrets, type NativeStudioSharedSecrets } from './native-studio-runtime-secrets';

type Environment = NodeJS.ProcessEnv;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const preparationDeps = {
  store: (client: SupabaseClient, bucket: string, scope: NativeStudioScope) =>
    new SupabasePublicationStore(client, bucket, scope),
  ensureBucket: ensureBoundCloudflareStudioDraftBucket,
  provider: (accountId: string, tokenManager: string, workerReader: string,
    transport: typeof fetch) => new CloudflarePublishTokenProvider(accountId,
      tokenManager, workerReader, transport),
  ensureToken: ensureNativeStudioPublishToken,
  runtime: nativeStudioRuntimeSecrets,
};

/** One central secret set serves every site. A missing value fails before any
 * per-site token, vault object or Cloudflare secret can be created.
 */
export function configuredNativeStudioSecretPreparation(env: Environment = process.env) {
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  const tokenManager = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_TOKEN_MANAGER ?? '';
  const r2Manager = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER ?? '';
  const workerReader = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_READER ?? '';
  const buildsUserToken = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_BUILDS_USER_TOKEN ?? '';
  const vaultKey = env.GNR8_NATIVE_STUDIO_VAULT_KEY ?? '';
  const shared: NativeStudioSharedSecrets = {
    GITHUB_PRIVATE_KEY: env.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY ?? '',
    GITHUB_CLIENT_SECRET: env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET ?? '',
    AI_API_KEY: env.GNR8_NATIVE_STUDIO_AI_API_KEY ?? '',
  };
  if (!HEX32.test(accountId) || !HEX32.test(zoneId) ||
      ![tokenManager, r2Manager, workerReader, buildsUserToken]
        .every(value => TOKEN.test(value)) ||
      !/^[a-f0-9]{64}$/.test(vaultKey))
    throw Error('native_studio_setup_not_configured');
  assertNativeStudioSharedSecrets(shared);
  return { accountId, zoneId, tokenManager, r2Manager, workerReader,
    vaultKey, shared };
}

export function configuredNativeStudioSecretSetup(env: Environment = process.env) {
  const prepared = configuredNativeStudioSecretPreparation(env);
  const studioInstaller = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_STUDIO_INSTALLER ?? '';
  if (!TOKEN.test(studioInstaller)) throw Error('native_studio_setup_not_configured');
  return { ...prepared, studioInstaller };
}

/** Prepare the six secrets for Wrangler's first deploy, without requiring an
 * active Worker version. A matching append-only receipt unlocks deploy reads.
 */
export async function prepareConfiguredNativeStudioFirstDeploySecrets(
  scope: NativeStudioScope,
  client: SupabaseClient,
  env: Environment = process.env,
  transport: typeof fetch = fetch,
  deps = preparationDeps,
) {
  const setup = configuredNativeStudioSecretPreparation(env);
  const store = deps.store(client,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
  await deps.ensureBucket(scope, client, setup.accountId,
    setup.r2Manager, store, transport);
  const provider = deps.provider(setup.accountId,
    setup.tokenManager, setup.workerReader, transport);
  const publish = await deps.ensureToken(scope, setup.accountId,
    setup.zoneId, store, setup.vaultKey, provider);
  const runtime = await deps.runtime(scope, store,
    setup.shared, setup.accountId, setup.vaultKey);
  if (runtime.PUBLISH_CLOUDFLARE_API_TOKEN !== publish.value)
    throw Error('native_studio_deploy_secrets_unverified');
  const identity = createHmac('sha256', Buffer.from(setup.vaultKey, 'hex'))
    .update(JSON.stringify({ scope, accountId: setup.accountId,
      zoneId: setup.zoneId, runtime })).digest('hex');
  const receipt = { accountId: setup.accountId,
    worker: `gnr8-${scope.siteId}-studio`, identity };
  const key = 'native-studio/first-deploy-secrets-prepared-v1.json';
  const previous = await store.read<typeof receipt>(key);
  if (previous && JSON.stringify(previous) !== JSON.stringify(receipt))
    throw Error('native_studio_deploy_secrets_conflict');
  if (!previous) await store.claim(key, receipt);
  if (JSON.stringify(await store.read<typeof receipt>(key)) !== JSON.stringify(receipt))
    throw Error('native_studio_deploy_secrets_conflict');
  return { worker: receipt.worker, state: 'prepared' as const };
}

/** Trusted provisioning entry point for a site whose GitHub repository and
 * Cloudflare Workers already exist. It confirms a private draft bucket before
 * issuing a publish token or installing Worker secrets. It does not mark ready.
 */
export async function installConfiguredNativeStudioSecrets(
  scope: NativeStudioScope,
  client: SupabaseClient,
  env: Environment = process.env,
  transport: typeof fetch = fetch,
) {
  const setup = configuredNativeStudioSecretSetup(env);
  const store = new SupabasePublicationStore(client,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
  await ensureBoundCloudflareStudioDraftBucket(scope, client, setup.accountId,
    setup.r2Manager, store, transport);
  const provider = new CloudflarePublishTokenProvider(setup.accountId,
    setup.tokenManager, setup.workerReader, transport);
  return installNativeStudioRuntimeSecrets(scope, setup.accountId, setup.zoneId,
    store, setup.vaultKey, setup.shared, provider, setup.studioInstaller,
    client, transport);
}
