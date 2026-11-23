import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_ACCESS_RECONCILIATION_JOB_ID =
  'native-studio-access-reconciliation-job';
export const NATIVE_STUDIO_ACCESS_RECONCILIATION_EVENT =
  'gnr8/native-studio.access.reconcile.requested';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string };
type Handoff = { scope: Scope; sourceId: string; commit: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_ACCESS_RECONCILE_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client, { userId: actor, agencyId, action: 'publish' });
  },
  handoff: async (scope: Scope, client: SupabaseClient) => {
    const { SupabasePublicationStore } = await import('@/gnr8/standalone/publication-store');
    const store = new SupabasePublicationStore(client,
      process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
    return store.read<Handoff>('native-studio/build-handoff-v1.json');
  },
  reconcile: async (input: { scope: Scope; client: SupabaseClient;
    sourceId: string; actor: string }) => {
    const { configuredNativeStudioAccessReconciliation } = await import(
      '@/gnr8/standalone/native-studio-configured-access-reconciliation');
    return configuredNativeStudioAccessReconciliation(input);
  },
};

/** Event data supplies no source, repository, application, or credential.
 * The current actor and exact scoped handoff are checked before the trusted
 * reconciler obtains narrow provider credentials and rechecks membership. */
export async function runNativeStudioAccessReconciliation(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_access_reconciliation_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !== 'actor,scope')
    throw Error('native_studio_access_reconciliation_request_invalid');
  const { scope, actor } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(
        value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_access_reconciliation_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_access_reconciliation_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const handoff = await deps.handoff(scope, client);
  if (!handoff || JSON.stringify(handoff.scope) !== JSON.stringify(scope) ||
      !SOURCE.test(handoff.sourceId) || !COMMIT.test(handoff.commit))
    throw Error('native_studio_access_reconciliation_handoff_unverified');
  const result = await deps.reconcile({ scope, client,
    sourceId: handoff.sourceId, actor });
  if (result.scope.agencyId !== scope.agencyId ||
      result.scope.clientId !== scope.clientId ||
      result.scope.siteId !== scope.siteId ||
      result.sourceId !== handoff.sourceId ||
      !['verified', 'pending-review'].includes(result.state))
    throw Error('native_studio_access_reconciliation_result_unverified');
  return result;
}

export const nativeStudioAccessReconciliationJob = inngest.createFunction({
  id: NATIVE_STUDIO_ACCESS_RECONCILIATION_JOB_ID, retries: 2,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_ACCESS_RECONCILIATION_EVENT },
async ({ event, step }) => step.run('access-reconcile',
  () => runNativeStudioAccessReconciliation(event.data)));
