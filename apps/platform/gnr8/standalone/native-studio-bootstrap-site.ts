import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuration } from '../../../../scripts/stacki/prepare-native-studio.mjs';
import { readNativeStudioBindingForScope,
  type NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';

type Environment = Record<string, string | undefined>;
const BRANCH = 'codex/native-stacki';
const HEX32 = /^[a-f0-9]{32}$/;
const POSITIVE_ID = /^[1-9][0-9]*$/;
const CLIENT_ID = /^[A-Za-z0-9._-]+$/;

/** Prepare a new site's native configuration from current GNR8 bindings and
 * one centrally configured GitHub App installation. No provider call occurs.
 * The later Git checkout gate must prove this exact branch and repository.
 */
export async function configuredNativeStudioBootstrapSite(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env,
) {
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const appId = env.GNR8_NATIVE_STUDIO_GITHUB_APP_ID ?? '';
  const installationId = env.GNR8_NATIVE_STUDIO_GITHUB_INSTALLATION_ID ?? '';
  const clientId = env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_ID ?? '';
  if (!client || !HEX32.test(accountId) || !POSITIVE_ID.test(appId) ||
      !POSITIVE_ID.test(installationId) || !CLIENT_ID.test(clientId))
    throw Error('native_studio_bootstrap_site_not_configured');
  const target = await readNativeStudioBootstrapTarget(scope, client, accountId);
  try {
    return configuration({ siteId: scope.siteId, repository: target.repository,
      repositoryId: String(target.repositoryId), branch: BRANCH,
      studioOrigin: target.studioOrigin, accountId,
      appId, installationId, clientId }).site as {
        siteId: string; repository: string; repositoryId: string; branch: string;
        studioOrigin: string; accountId: string; appId: string;
        installationId: string; clientId: string;
      };
  } catch { throw Error('native_studio_bootstrap_site_invalid'); }
}

/** Existing ready bindings retain precedence. The explicit bootstrap flag
 * only admits a new site without a ready binding into source preparation.
 */
export async function configuredNativeStudioDirectSourceSite(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env,
) {
  if (env.GNR8_NATIVE_STUDIO_PREPARE_ENABLED !== '1')
    throw Error('native_studio_disabled');
  if (env.GNR8_NATIVE_STUDIO_BOOTSTRAP_ENABLED !== '1')
    return readNativeStudioBindingForScope(scope, client, env.GNR8_NATIVE_STUDIO_SITES);
  try {
    return await readNativeStudioBindingForScope(scope, client, env.GNR8_NATIVE_STUDIO_SITES);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'native_studio_binding_missing')
      throw error;
  }
  return configuredNativeStudioBootstrapSite(scope, client, env);
}
