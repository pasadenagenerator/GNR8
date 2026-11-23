import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { reserveNativeStudioAccessApp } from './native-studio-access-app-reservation';
import { ensureNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reservation';

type Environment = Record<string, string | undefined>;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;

const defaults = {
  store: (client: SupabaseClient, scope: NativeStudioScope, bucket: string) =>
    new SupabasePublicationStore(client, bucket, scope),
  app: reserveNativeStudioAccessApp,
  policy: ensureNativeStudioAccessOwnerPolicy,
};

/** One central Access credential configures every new site's exact editor
 * application and current owner policy. Failure leaves the app default-deny
 * or pending; it never declares the native editor ready.
 */
export async function configuredNativeStudioAccessSetup(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env, transport: typeof fetch = fetch,
  deps = defaults,
) {
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  const credential = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER ?? '';
  if (env.GNR8_NATIVE_STUDIO_ACCESS_SETUP_ENABLED !== '1')
    throw Error('native_studio_access_setup_disabled');
  if (!client || !HEX32.test(accountId) || !HEX32.test(zoneId) ||
      !TOKEN.test(credential) || typeof transport !== 'function')
    throw Error('native_studio_access_setup_not_configured');
  const store = deps.store(client, scope,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes');
  const app = await deps.app({ scope, client, accountId, zoneId, credential,
    store }, transport);
  if (app.state !== 'access-app-bound' || app.target.scope.siteId !== scope.siteId ||
      app.target.accountId !== accountId)
    throw Error('native_studio_access_setup_app_unverified');
  const policy = await deps.policy({ scope, client, accountId, zoneId,
    appId: app.appId, credential, store }, transport);
  if (policy.state !== 'observed-exact-access-policy' ||
      policy.appId !== app.appId || policy.memberCount < 1)
    throw Error('native_studio_access_setup_policy_unverified');
  return { state: 'access-setup-observed' as const, scope,
    appId: app.appId, aud: app.aud, teamDomain: app.teamDomain,
    memberCount: policy.memberCount };
}
