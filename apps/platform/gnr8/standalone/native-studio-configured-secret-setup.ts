import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { CloudflarePublishTokenProvider } from './cloudflare-publish-token-provider';
import { installNativeStudioRuntimeSecrets } from './native-studio-secret-installation';
import { assertNativeStudioSharedSecrets,
  type NativeStudioSharedSecrets } from './native-studio-runtime-secrets';

type Environment = NodeJS.ProcessEnv;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

/** One central secret set serves every site. A missing value fails before any
 * per-site token, vault object or Cloudflare secret can be created.
 */
export function configuredNativeStudioSecretSetup(env: Environment = process.env) {
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  const tokenManager = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_TOKEN_MANAGER ?? '';
  const workerReader = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_READER ?? '';
  const studioInstaller = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_STUDIO_INSTALLER ?? '';
  const vaultKey = env.GNR8_NATIVE_STUDIO_VAULT_KEY ?? '';
  const shared: NativeStudioSharedSecrets = {
    GITHUB_PRIVATE_KEY: env.GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY ?? '',
    GITHUB_CLIENT_SECRET: env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_SECRET ?? '',
    AI_API_KEY: env.GNR8_NATIVE_STUDIO_AI_API_KEY ?? '',
  };
  if (!HEX32.test(accountId) || !HEX32.test(zoneId) ||
      ![tokenManager, workerReader, studioInstaller].every(value => TOKEN.test(value)) ||
      !/^[a-f0-9]{64}$/.test(vaultKey))
    throw Error('native_studio_setup_not_configured');
  assertNativeStudioSharedSecrets(shared);
  return { accountId, zoneId, tokenManager, workerReader, studioInstaller,
    vaultKey, shared };
}

/** Trusted provisioning entry point for a site whose GitHub repository and
 * Cloudflare Workers already exist. This does not mark the Studio ready.
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
  const provider = new CloudflarePublishTokenProvider(setup.accountId,
    setup.tokenManager, setup.workerReader, transport);
  return installNativeStudioRuntimeSecrets(scope, setup.accountId, setup.zoneId,
    store, setup.vaultKey, setup.shared, provider, setup.studioInstaller,
    client, transport);
}
