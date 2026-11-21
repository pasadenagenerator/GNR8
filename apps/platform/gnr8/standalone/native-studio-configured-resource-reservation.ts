import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { ensureBoundCloudflareStudioDraftBucket } from './cloudflare-studio-draft-bucket';
import { ensureBoundCloudflareNativeWorkerReservations } from './cloudflare-studio-worker-reservation';

type Environment = NodeJS.ProcessEnv;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

export function configuredNativeStudioResourceReservation(env: Environment = process.env) {
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const r2Manager = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER ?? '';
  const workerCreator = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR ?? '';
  if (!HEX32.test(accountId) || !TOKEN.test(r2Manager) || !TOKEN.test(workerCreator))
    throw Error('native_studio_resource_reservation_not_configured');
  return { accountId, r2Manager, workerCreator };
}

/** Reserve private resources for a persisted site with a bound repository.
 * Neither reservation deploys code, adds routes, nor marks Studio ready.
 */
export async function reserveConfiguredNativeStudioResources(
  scope: NativeStudioScope,
  client: SupabaseClient,
  env: Environment = process.env,
  transport: typeof fetch = fetch,
) {
  const setup = configuredNativeStudioResourceReservation(env);
  const store = new SupabasePublicationStore(client,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
  const draftBucket = await ensureBoundCloudflareStudioDraftBucket(scope, client,
    setup.accountId, setup.r2Manager, store, transport);
  const workers = await ensureBoundCloudflareNativeWorkerReservations(scope, client,
    setup.accountId, setup.workerCreator, store, transport);
  return { draftBucket, workers };
}
