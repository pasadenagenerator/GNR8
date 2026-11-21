import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_SECRET_SETUP_JOB_ID = 'native-studio-secret-setup-job';
export const NATIVE_STUDIO_SECRET_SETUP_EVENT = 'gnr8/native-studio.secrets.install.requested';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

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
  install: async (scope: Scope, client: SupabaseClient) => {
    const { installConfiguredNativeStudioSecrets } = await import(
      '@/gnr8/standalone/native-studio-configured-secret-setup');
    return installConfiguredNativeStudioSecrets(scope, client);
  },
};

/** This stage installs an existing site's private draft bucket and Worker
 * secrets. It neither creates Workers nor writes a ready-Studio binding.
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
  return deps.install(scope, client);
}

export const nativeStudioSecretSetupJob = inngest.createFunction({
  id: NATIVE_STUDIO_SECRET_SETUP_JOB_ID, retries: 0,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_SECRET_SETUP_EVENT },
async ({ event }) => runNativeStudioSecretSetup(event.data));
