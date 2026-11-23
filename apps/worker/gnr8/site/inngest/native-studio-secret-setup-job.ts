import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_SECRET_SETUP_JOB_ID = 'native-studio-secret-setup-job';
export const NATIVE_STUDIO_SECRET_SETUP_EVENT = 'gnr8/native-studio.secrets.install.requested';
const MAX_PENDING_OBSERVATIONS = 8;
const PENDING_OBSERVATION_INTERVAL = '1m';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

/** A secret-install event cannot skip the exact resource reservation. */
export async function requireNativeStudioResourceReservation(
  scope: Scope, client: SupabaseClient) {
  const { SupabasePublicationStore } = await import(
    '@/gnr8/standalone/publication-store');
  const { NATIVE_STUDIO_RESOURCE_RECEIPT,
    readNativeStudioBootstrapTarget } = await import(
    '@/gnr8/standalone/native-studio-configured-resource-reservation');
  const store = new SupabasePublicationStore(client,
    process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ??
      'gnr8-astro-candidate-routes', scope);
  const target = await readNativeStudioBootstrapTarget(scope, client,
    process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '');
  const receipt = await store.read<{ target?: typeof target;
    draftBucket?: { bucket?: string; bucketId?: string };
    workers?: { studio?: { worker?: string; id?: string };
      publicSite?: { worker?: string; id?: string } } }>(
      NATIVE_STUDIO_RESOURCE_RECEIPT);
  if (JSON.stringify(receipt?.target) !== JSON.stringify(target) ||
      receipt?.draftBucket?.bucket !== `gnr8-${scope.siteId}-drafts` ||
      !/^[a-f0-9]{32}$/.test(receipt?.draftBucket?.bucketId ?? '') ||
      receipt?.workers?.studio?.worker !== `gnr8-${scope.siteId}-studio` ||
      !/^[a-f0-9]{32}$/.test(receipt?.workers?.studio?.id ?? '') ||
      receipt?.workers?.publicSite?.worker !== `gnr8-${scope.siteId}-site` ||
      !/^[a-f0-9]{32}$/.test(receipt?.workers?.publicSite?.id ?? ''))
    throw Error('native_studio_secret_setup_reservation_missing');
}

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_SECRET_SETUP_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client,
      { userId: actor, agencyId, action: 'publish' });
  },
  requireReservation: requireNativeStudioResourceReservation,
  install: async (scope: Scope, client: SupabaseClient) => {
    const { prepareConfiguredNativeStudioFirstDeploySecrets } = await import(
      '@/gnr8/standalone/native-studio-configured-secret-setup');
    return prepareConfiguredNativeStudioFirstDeploySecrets(scope, client);
  },
};

/** This stage prepares the per-site publish token and sealed first-deploy
 * secrets. Wrangler installs them with the first Worker deployment.
 * It neither creates Workers nor writes a ready-Studio binding.
 * Event data names only the scoped site and actor; all provider targets are
 * re-read by the trusted installer from current authoritative bindings.
 */
export async function runNativeStudioSecretSetup(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_secret_setup_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !== 'actor,scope')
    throw Error('native_studio_secret_setup_request_invalid');
  const { scope, actor } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_secret_setup_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_secret_setup_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  await deps.requireReservation(scope, client);
  return deps.install(scope, client);
}

export const nativeStudioSecretSetupJob = inngest.createFunction({
  id: NATIVE_STUDIO_SECRET_SETUP_JOB_ID, retries: 0,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_SECRET_SETUP_EVENT },
async ({ event, step }) => settleNativeStudioSecretSetup(event.data, step));

/** A creation intent is already durable before either provider can report
 * pending. Observe that same intent while Cloudflare catches up; all scope,
 * authorization and provider-conflict errors remain terminal. */
export async function settleNativeStudioSecretSetup(
  request: unknown,
  steps: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (id: string, duration: string) => Promise<unknown> },
  run: typeof runNativeStudioSecretSetup = runNativeStudioSecretSetup,
) {
  for (let index = 0; index < MAX_PENDING_OBSERVATIONS; index++) {
    try {
      return await steps.run(`secret-setup-observe-${index}`,
        () => run(request)) as Awaited<ReturnType<typeof runNativeStudioSecretSetup>>;
    } catch (error) {
      if (!(error instanceof Error) ||
          !['native_studio_draft_bucket_pending',
            'native_studio_publish_token_pending'].includes(error.message) ||
          index === MAX_PENDING_OBSERVATIONS - 1)
        throw error;
    }
    await steps.sleep(`secret-setup-wait-${index}`,
      PENDING_OBSERVATION_INTERVAL);
  }
  throw Error('native_studio_secret_setup_observation_exhausted');
}
