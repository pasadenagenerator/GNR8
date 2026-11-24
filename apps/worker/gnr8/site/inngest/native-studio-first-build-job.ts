import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_EVENT } from
  './native-studio-first-deploy-preflight-job';

export const NATIVE_STUDIO_FIRST_BUILD_JOB_ID = 'native-studio-first-build-job';
export const NATIVE_STUDIO_FIRST_BUILD_EVENT = 'gnr8/native-studio.first-build.requested';
const MAX_RESOURCE_OBSERVATIONS = 15;
const MAX_BUILD_OBSERVATIONS = 60;
const RESOURCE_OBSERVATION_INTERVAL = '1m';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string; requestId: string; sourceId: string;
  attemptId?: string };
type SourceResult = { requestId: string; sourceId: string;
  sourceManifestSha256: string; studioVersion: string; files: number; hosted: false;
  attemptId?: string };
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
  sourceResult: async (scope: Scope, client: SupabaseClient, requestId: string,
    attemptId?: string) => {
    const { SupabasePublicationStore } = await import('@/gnr8/standalone/publication-store');
    const store = new SupabasePublicationStore(client,
      process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
    return store.read<SourceResult>(`native-requests/${requestId}` +
      `${attemptId ? `-${attemptId}` : ''}-result.json`);
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
  chainEnabled: () =>
    process.env.GNR8_NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_ENABLED === '1',
  enqueuePreflight: async (request: { scope: Scope; actor: string;
    sourceId: string; sourceCommit: string; workerId: string;
    artifactCommit: string }) => {
    await inngest.send({ name: NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_EVENT,
      data: request });
  },
};

/** The event contains identities only. The original source result and actor
 * permission are rechecked before the isolated build can start. */
export async function runNativeStudioFirstBuild(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_first_build_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      !['actor,requestId,scope,sourceId',
        'actor,attemptId,requestId,scope,sourceId'].includes(Object.keys(request).sort().join()))
    throw Error('native_studio_first_build_request_invalid');
  const { scope, actor, requestId, sourceId, attemptId } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(
        value => typeof value === 'string' && UUID.test(value)) ||
      typeof requestId !== 'string' || !SHA.test(requestId) ||
      (attemptId !== undefined && (typeof attemptId !== 'string' || !UUID.test(attemptId))) ||
      typeof sourceId !== 'string' || !SHA.test(sourceId))
    throw Error('native_studio_first_build_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_first_build_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const result = await deps.sourceResult(scope, client, requestId, attemptId);
  if (!result || result.requestId !== requestId || result.sourceId !== sourceId ||
      result.attemptId !== attemptId ||
      !SHA.test(result.sourceManifestSha256) ||
      typeof result.studioVersion !== 'string' || !result.studioVersion ||
      !Number.isSafeInteger(result.files) || result.files < 1 || result.hosted !== false)
    throw Error('native_studio_first_build_source_unverified');
  const built = await deps.build({ scope, actor, requestId, sourceId }, client);
  if ('state' in built &&
      (built.state === 'running' || built.state === 'pending-review'))
    return { state: built.state };
  if (built.sourceId !== sourceId || !/^[a-f0-9]{40,64}$/.test(built.commit) ||
      !/^[a-f0-9]{32}$/.test(built.workerId) ||
      built.artifactBranch !== `gnr8-build-${built.commit}` ||
      !/^[a-f0-9]{40,64}$/.test(built.artifactCommit))
    throw Error('native_studio_first_build_result_unverified');
  if (deps.chainEnabled()) await deps.enqueuePreflight({ scope, actor,
    sourceId, sourceCommit: built.commit, workerId: built.workerId,
    artifactCommit: built.artifactCommit });
  return built;
}

export const nativeStudioFirstBuildJob = inngest.createFunction({
  id: NATIVE_STUDIO_FIRST_BUILD_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_FIRST_BUILD_EVENT },
async ({ event, step }) => settleNativeStudioFirstBuild(event.data, step));

/** Site import may still be reserving resources after source preparation.
 * Recheck only an absent reservation; a mismatched receipt, GitHub push or
 * build failure is never retried by this observation loop. */
export async function settleNativeStudioFirstBuild(
  request: unknown,
  steps: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (id: string, duration: string) => Promise<unknown> },
  run: typeof runNativeStudioFirstBuild = runNativeStudioFirstBuild,
) {
  let resourceObservations = 0;
  for (let index = 0; index < MAX_BUILD_OBSERVATIONS; index++) {
    try {
      const result = await steps.run(`first-build-resource-observe-${index}`,
        () => run(request)) as Awaited<ReturnType<typeof runNativeStudioFirstBuild>>;
      if (!('state' in result) || result.state !== 'running') return result;
    } catch (error) {
      if (!(error instanceof Error) ||
          error.message !== 'native_studio_first_build_resources_pending' ||
          ++resourceObservations >= MAX_RESOURCE_OBSERVATIONS)
        throw error;
    }
    if (index === MAX_BUILD_OBSERVATIONS - 1) break;
    await steps.sleep(`first-build-resource-wait-${index}`,
      RESOURCE_OBSERVATION_INTERVAL);
  }
  throw Error('native_studio_first_build_observation_exhausted');
}
