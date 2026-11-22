import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';

export const NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_JOB_ID =
  'native-studio-first-deploy-preflight-job';
export const NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_EVENT =
  'gnr8/native-studio.first-deploy.preflight.requested';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string; sourceId: string;
  sourceCommit: string; workerId: string; artifactCommit: string };
type ArtifactReceipt = { sourceId: string; sourceCommit: string;
  workerId: string; artifactCommit: string; branch: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const WORKER = /^[a-f0-9]{32}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client, { userId: actor, agencyId, action: 'publish' });
  },
  artifact: async (scope: Scope, client: SupabaseClient) => {
    const { SupabasePublicationStore } = await import('@/gnr8/standalone/publication-store');
    const store = new SupabasePublicationStore(client,
      process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
    return store.read<ArtifactReceipt>('native-studio/build-artifact-github-push-v1.json');
  },
  preflight: async (request: Request, client: SupabaseClient) => {
    const { configuredNativeStudioFirstDeployDryRun } = await import(
      '@/gnr8/standalone/native-studio-configured-first-deploy-dry-run');
    const trustedGit = process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT ?? '';
    const trustedWrangler = process.env.GNR8_NATIVE_STUDIO_TRUSTED_WRANGLER ?? '';
    if (!trustedGit.startsWith('/') || !trustedWrangler.startsWith('/'))
      throw Error('native_studio_first_deploy_preflight_runner_unconfigured');
    return configuredNativeStudioFirstDeployDryRun({ scope: request.scope, client,
      sourceId: request.sourceId, sourceCommit: request.sourceCommit,
      workerId: request.workerId, trustedGit, trustedWrangler });
  },
};

/** Only a verified private artifact ref can start a credential-free dry run.
 * All site and build bytes are recovered and checked by the preflight stage. */
export async function runNativeStudioFirstDeployPreflight(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_first_deploy_preflight_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !==
        'actor,artifactCommit,scope,sourceCommit,sourceId,workerId')
    throw Error('native_studio_first_deploy_preflight_request_invalid');
  const { scope, actor, sourceId, sourceCommit, workerId, artifactCommit } = request as Request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      typeof actor !== 'string' || !UUID.test(actor) ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(
        value => typeof value === 'string' && UUID.test(value)) ||
      typeof sourceId !== 'string' || !SOURCE.test(sourceId) ||
      typeof sourceCommit !== 'string' || !COMMIT.test(sourceCommit) ||
      typeof workerId !== 'string' || !WORKER.test(workerId) ||
      typeof artifactCommit !== 'string' || !COMMIT.test(artifactCommit))
    throw Error('native_studio_first_deploy_preflight_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_first_deploy_preflight_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const artifact = await deps.artifact(scope, client);
  if (!artifact || artifact.sourceId !== sourceId ||
      artifact.sourceCommit !== sourceCommit || artifact.workerId !== workerId ||
      artifact.artifactCommit !== artifactCommit ||
      artifact.branch !== `gnr8-build-${sourceCommit}`)
    throw Error('native_studio_first_deploy_preflight_artifact_unverified');
  return deps.preflight({ scope, actor, sourceId, sourceCommit,
    workerId, artifactCommit }, client);
}

export const nativeStudioFirstDeployPreflightJob = inngest.createFunction({
  id: NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_EVENT },
async ({ event }) => runNativeStudioFirstDeployPreflight(event.data));
