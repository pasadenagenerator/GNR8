import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePublicationStore } from './publication-store';
import { isRetainedLegacyNativeStudioSite, type NativeStudioScope } from './native-studio-binding-store';
import { configuredNativeStudioAccessSetup } from './native-studio-configured-access-setup';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readVerifiedNativeStudioAccessAppV2Binding,
  ACCESS_APP_V2_INTENT, ACCESS_APP_V2_BOUND } from './native-studio-access-app-reservation';

type Environment = Record<string, string | undefined>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX32 = /^[a-f0-9]{32}$/;
const LEGACY_APP_INTENT = 'native-studio/access-app-create-intent-v1.json';
const LEGACY_APP_BOUND = 'native-studio/access-app-bound-v1.json';
const POLICY_INTENT = 'native-studio/access-policy-create-intent-v1.json';

const defaults = {
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  target: readNativeStudioBootstrapTarget,
  setup: configuredNativeStudioAccessSetup,
  binding: readVerifiedNativeStudioAccessAppV2Binding,
};

/** Complete the site's Access app and exact owner policy before preparing
 * immutable source. Only the four retained sites with no Access intent or
 * binding keep their existing repository-mode source. The setup itself uses
 * append-only intents and provider readback to reconcile ambiguous writes.
 * Caller must first reauthorize the event actor and confirm the current
 * selected site/version; an event payload alone cannot authorize provider work.
 */
export async function ensureConfiguredNativeStudioAccessBeforeSource(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env, transport: typeof fetch = fetch,
  deps = defaults,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
      typeof value === 'string' && UUID.test(value)) || !client ||
      typeof transport !== 'function')
    throw Error('native_studio_access_prerequisite_input_invalid');
  const store = deps.store(client, scope, env);
  const [legacyIntent, legacyBound, intent, bound, policy] = await Promise.all([
    store.read(LEGACY_APP_INTENT), store.read(LEGACY_APP_BOUND),
    store.read(ACCESS_APP_V2_INTENT), store.read(ACCESS_APP_V2_BOUND),
    store.read(POLICY_INTENT),
  ]);
  if (legacyIntent || legacyBound)
    throw Error('native_studio_access_prerequisite_legacy_conflict');
  if (isRetainedLegacyNativeStudioSite(scope.siteId) && !intent && !bound && !policy)
    return { state: 'retained-repository-source' as const, scope };
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  if (!HEX32.test(accountId) || !HEX32.test(zoneId))
    throw Error('native_studio_access_prerequisite_account_unverified');
  const target = await deps.target(scope, client, accountId);
  if (target.scope.agencyId !== scope.agencyId ||
      target.scope.clientId !== scope.clientId ||
      target.scope.siteId !== scope.siteId || target.accountId !== accountId)
    throw Error('native_studio_access_prerequisite_target_unverified');
  const result = await deps.setup(scope, client, env, transport);
  if (result.state !== 'access-setup-observed' ||
      result.scope.agencyId !== scope.agencyId ||
      result.scope.clientId !== scope.clientId ||
      result.scope.siteId !== scope.siteId ||
      !Number.isSafeInteger(result.memberCount) || result.memberCount < 1)
    throw Error('native_studio_access_prerequisite_unverified');
  const binding = await deps.binding({ scope, client, accountId, zoneId, store },
    { target: deps.target });
  if (binding.appId !== result.appId || binding.aud !== result.aud ||
      binding.teamDomain !== result.teamDomain ||
      binding.target.studioOrigin !== target.studioOrigin)
    throw Error('native_studio_access_prerequisite_binding_unverified');
  return result;
}
