import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabasePublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import { inspectBoundNativeStudioGitHubRoles,
  reconcileBoundNativeStudioGitHubRoles } from './native-studio-github-role-reconciliation';
import { reconcileNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reconciliation';

type Environment = Record<string, string | undefined>;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;

const defaults = {
  store: (client: SupabaseClient, scope: NativeStudioScope, bucket: string) =>
    new SupabasePublicationStore(client, bucket, scope),
  inspectRoles: inspectBoundNativeStudioGitHubRoles,
  policy: reconcileNativeStudioAccessOwnerPolicy,
  writeRoles: reconcileBoundNativeStudioGitHubRoles,
};

/** Reconcile a changed agency membership against one bound Access v2 studio.
 * Access is made exact before Git roles are changed. Both provider writers use
 * durable intents and readbacks, so an ambiguous response never causes a
 * blind second mutation. This is a trusted job entry point, not a request
 * handler or proof that existing Access sessions have been revoked.
 */
export async function configuredNativeStudioAccessReconciliation(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string; actor: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, actor } = input;
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const credential = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER ?? '';
  if (env.GNR8_NATIVE_STUDIO_ACCESS_RECONCILE_ENABLED !== '1')
    throw Error('native_studio_access_reconciliation_disabled');
  if (!scope || !client || !/^[a-f0-9]{64}$/.test(sourceId) ||
      !HEX32.test(accountId) || !TOKEN.test(credential) ||
      typeof transport !== 'function')
    throw Error('native_studio_access_reconciliation_not_configured');
  const store = deps.store(client, scope,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes');
  const bound = await store.read<{ appId?: string }>(
    'native-studio/access-app-bound-v1.json');
  if (!bound || typeof bound.appId !== 'string' || !APP_ID.test(bound.appId))
    throw Error('native_studio_access_reconciliation_app_unbound');
  const previous = await deps.inspectRoles({ scope, client, store, sourceId, actor },
    env, transport);
  const policyProof = await deps.policy({ scope, client, accountId,
    appId: bound.appId, credential, store, actor,
    previousCommit: previous.headCommit,
    previousPrincipals: previous.previousPrincipals }, transport);
  const roles = await deps.writeRoles({ scope, client, store, sourceId, actor,
    previous, policyProof }, env, transport);
  return { state: roles.state, scope, sourceId,
    accessAppId: bound.appId, policyId: policyProof.policyId,
    commit: roles.commit, principals: policyProof.principals };
}
