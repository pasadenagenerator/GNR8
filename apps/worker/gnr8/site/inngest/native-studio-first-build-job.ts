import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_FIRST_BUILD_JOB_ID = 'native-studio-first-build-job';
export const NATIVE_STUDIO_FIRST_BUILD_EVENT = 'gnr8/native-studio.first-build.requested';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string; requestId: string; sourceId: string };
type SourceResult = { requestId: string; sourceId: string;
  sourceManifestSha256: string; studioVersion: string; files: number; hosted: false };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_FIRST_BUILD_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client, { userId: actor, agencyId, action: 'publish' });
  },
  sourceResult: async (scope: Scope, client: SupabaseClient, requestId: string) => {
    const { SupabasePublicationStore } = await import('@/gnr8/standalone/publication-store');
    const store = new SupabasePublicationStore(client,
      process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
    return store.read<SourceResult>(`native-requests/${requestId}-result.json`);
  },
  build: async (request: Request, client: SupabaseClient) => {
    const { configuredNativeStudioFirstBuild } = await import(
      '@/gnr8/standalone/native-studio-configured-first-build');
    const trustedGit = process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT ?? '';
    const name = process.env.GNR8_NATIVE_STUDIO_GIT_AUTHOR_NAME ?? '';
    const email = process.env.GNR8_NATIVE_STUDIO_GIT_AUTHOR_EMAIL ?? '';
    if (!trustedGit.startsWith('/') || !name.trim() || !/^[^\s@]+@[^\s@]+$/.test(email))
      throw Error('native_studio_first_build_runner_unconfigured');
    return configuredNativeStudioFirstBuild({ scope: request.scope, client,
      sourceId: request.sourceId, trustedGit, author: { name, email } });
  },
};

/** The event contains identities only. The original source result and actor
 * permission are rechecked before the isolated build can start. */
export async function runNativeStudioFirstBuild(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_first_build_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !== 'actor,requestId,scope,sourceId')
    throw Error('native_studio_first_build_request_invalid');
  const { scope, actor, requestId, sourceId } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(
        value => typeof value === 'string' && UUID.test(value)) ||
      typeof requestId !== 'string' || !SHA.test(requestId) ||
      typeof sourceId !== 'string' || !SHA.test(sourceId))
    throw Error('native_studio_first_build_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_first_build_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const result = await deps.sourceResult(scope, client, requestId);
  if (!result || result.requestId !== requestId || result.sourceId !== sourceId ||
      !SHA.test(result.sourceManifestSha256) ||
      typeof result.studioVersion !== 'string' || !result.studioVersion ||
      !Number.isSafeInteger(result.files) || result.files < 1 || result.hosted !== false)
    throw Error('native_studio_first_build_source_unverified');
  return deps.build({ scope, actor, requestId, sourceId }, client);
}

export const nativeStudioFirstBuildJob = inngest.createFunction({
  id: NATIVE_STUDIO_FIRST_BUILD_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_FIRST_BUILD_EVENT },
async ({ event }) => runNativeStudioFirstBuild(event.data));
