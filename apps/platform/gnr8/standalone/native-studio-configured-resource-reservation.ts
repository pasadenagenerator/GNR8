import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { ensureBoundCloudflareStudioDraftBucket } from './cloudflare-studio-draft-bucket';
import { ensureBoundCloudflareNativeWorkerReservations } from './cloudflare-studio-worker-reservation';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';

type Environment = Record<string, string | undefined>;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const reservations = { draft: ensureBoundCloudflareStudioDraftBucket,
  workers: ensureBoundCloudflareNativeWorkerReservations };

/** Re-read the target from current scoped GNR8 rows. An event may supply only
 * scope and actor; it cannot select a domain, repository or Cloudflare account.
 */
export async function readNativeStudioBootstrapTarget(scope: NativeStudioScope,
  client: SupabaseClient, accountId: string) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId))
    throw Error('native_studio_bootstrap_target_invalid');
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]);
  if (site.error || !site.data || typeof site.data.domain !== 'string' ||
      !DOMAIN.test(site.data.domain) || !repository)
    throw Error('native_studio_bootstrap_target_unverified');
  return { scope, accountId, studioOrigin: `https://${site.data.domain}`,
    repository: `${repository.owner}/${repository.repository}`,
    repositoryId: repository.repositoryId };
}

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
  deps = reservations,
) {
  const setup = configuredNativeStudioResourceReservation(env);
  const target = await readNativeStudioBootstrapTarget(scope, client, setup.accountId);
  const store = new SupabasePublicationStore(client,
    env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
  const draftBucket = await deps.draft(scope, client,
    setup.accountId, setup.r2Manager, store, transport);
  const workers = await deps.workers(scope, client,
    setup.accountId, setup.workerCreator, store, transport);
  const current = await readNativeStudioBootstrapTarget(scope, client, setup.accountId);
  if (JSON.stringify(current) !== JSON.stringify(target))
    throw Error('native_studio_bootstrap_target_changed');
  return { draftBucket, workers, target };
}
