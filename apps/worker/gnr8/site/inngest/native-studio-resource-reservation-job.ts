import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_RESOURCE_RESERVATION_JOB_ID = 'native-studio-resource-reservation-job';
export const NATIVE_STUDIO_RESOURCE_RESERVATION_EVENT = 'gnr8/native-studio.resources.reserve.requested';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client,
      { userId: actor, agencyId, action: 'publish' });
  },
  reserve: async (scope: Scope, client: SupabaseClient) => {
    const { reserveConfiguredNativeStudioResources } = await import(
      '@/gnr8/standalone/native-studio-configured-resource-reservation');
    return reserveConfiguredNativeStudioResources(scope, client);
  },
  chainEnabled: () => process.env.GNR8_NATIVE_STUDIO_SECRET_SETUP_ENABLED === '1',
  enqueueSecretSetup: async (scope: Scope, actor: string) => {
    await inngest.send({ name: 'gnr8/native-studio.secrets.install.requested',
      data: { scope, actor } });
  },
};

/** Event data selects only the scoped site and actor. The site, bound GitHub
 * repository and central Cloudflare configuration are rechecked in the job.
 */
export async function runNativeStudioResourceReservation(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_resource_reservation_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !== 'actor,scope')
    throw Error('native_studio_resource_reservation_request_invalid');
  const { scope, actor } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_resource_reservation_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_resource_reservation_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const reserved = await deps.reserve(scope, client);
  if (deps.chainEnabled())
    await deps.enqueueSecretSetup(scope, actor);
  return reserved;
}

export const nativeStudioResourceReservationJob = inngest.createFunction({
  id: NATIVE_STUDIO_RESOURCE_RESERVATION_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_RESOURCE_RESERVATION_EVENT },
async ({ event }) => runNativeStudioResourceReservation(event.data));
