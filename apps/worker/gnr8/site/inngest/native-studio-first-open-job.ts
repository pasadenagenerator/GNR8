import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_FIRST_OPEN_JOB_ID = 'native-studio-first-open-job';
export const NATIVE_STUDIO_FIRST_OPEN_EVENT = 'gnr8/native-studio.first-open.requested';
const MAX_ENTRY_OBSERVATIONS = 15;
const ENTRY_OBSERVATION_INTERVAL = '1m';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string; sourceId: string; sourceCommit: string };
type Handoff = { scope: Scope; sourceId: string; commit: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED === '1',
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
  record: async (scope: Scope, client: SupabaseClient) => {
    const { recordConfiguredNativeStudioFirstOpen } = await import(
      '@/gnr8/standalone/native-studio-configured-first-open');
    return recordConfiguredNativeStudioFirstOpen(scope, client);
  },
};

/** No event field supplies a URL, Worker or credential. The configured recorder
 * derives those from current scoped receipts and verifies provider readback. */
export async function runNativeStudioFirstOpen(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_first_open_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !== 'actor,scope,sourceCommit,sourceId')
    throw Error('native_studio_first_open_request_invalid');
  const { scope, actor, sourceId, sourceCommit } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(
        value => typeof value === 'string' && UUID.test(value)) ||
      typeof sourceId !== 'string' || !SOURCE.test(sourceId) ||
      typeof sourceCommit !== 'string' || !COMMIT.test(sourceCommit))
    throw Error('native_studio_first_open_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_first_open_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const handoff = await deps.handoff(scope, client);
  if (JSON.stringify(handoff?.scope) !== JSON.stringify(scope) ||
      handoff?.sourceId !== sourceId || handoff.commit !== sourceCommit)
    throw Error('native_studio_first_open_handoff_unverified');
  const receipt = await deps.record(scope, client);
  if (JSON.stringify(receipt.scope) !== JSON.stringify(scope) ||
      receipt.sourceId !== sourceId || receipt.commit !== sourceCommit)
    throw Error('native_studio_first_open_result_unverified');
  return receipt;
}

export const nativeStudioFirstOpenJob = inngest.createFunction({
  id: NATIVE_STUDIO_FIRST_OPEN_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_FIRST_OPEN_EVENT },
async ({ event, step }) => settleNativeStudioFirstOpen(event.data, step));

/** A temporary DNS/network failure at the public Stacki entry may clear
 * after the public gateway is active. Wrong content or identity is terminal. */
export async function settleNativeStudioFirstOpen(
  request: unknown,
  steps: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (id: string, duration: string) => Promise<unknown> },
  run: typeof runNativeStudioFirstOpen = runNativeStudioFirstOpen,
) {
  for (let index = 0; index < MAX_ENTRY_OBSERVATIONS; index++) {
    try {
      return await steps.run(`first-open-entry-${index}`,
        () => run(request)) as Awaited<ReturnType<typeof runNativeStudioFirstOpen>>;
    } catch (error) {
      if (!(error instanceof Error) ||
          error.message !== 'native_studio_public_entry_unavailable' ||
          index === MAX_ENTRY_OBSERVATIONS - 1)
        throw error;
    }
    await steps.sleep(`first-open-wait-${index}`, ENTRY_OBSERVATION_INTERVAL);
  }
  throw Error('native_studio_first_open_entry_observation_exhausted');
}
