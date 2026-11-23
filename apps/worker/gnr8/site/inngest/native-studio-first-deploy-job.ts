import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_PUBLIC_GATEWAY_EVENT } from './native-studio-public-gateway-job';

export const NATIVE_STUDIO_FIRST_DEPLOY_JOB_ID = 'native-studio-first-deploy-job';
export const NATIVE_STUDIO_FIRST_DEPLOY_EVENT = 'gnr8/native-studio.first-deploy.requested';
const MAX_OBSERVATIONS = 15;
const OBSERVATION_INTERVAL = '1m';

type Scope = { agencyId: string; clientId: string; siteId: string };
type Request = { scope: Scope; actor: string; sourceId: string;
  sourceCommit: string; workerId: string; artifactCommit: string };
type Artifact = { sourceId: string; sourceCommit: string; workerId: string;
  artifactCommit: string; branch: string };
type Preflight = { identity: string; sourceId: string; commit: string;
  workerId: string; files: number };
type Prebuilt = { accountId: string; commit: string; digest: string;
  siteId: string; sourceId: string; workerId: string };
type Resources = { target: { scope: Scope; accountId: string };
  workers: { studio: { id: string } } };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const WORKER = /^[a-f0-9]{32}$/;

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_FIRST_DEPLOY_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  authorize: async (client: SupabaseClient, actor: string, agencyId: string) => {
    const { requireAgencyBackgroundActor } = await import('@/src/auth/agency-background-action');
    await requireAgencyBackgroundActor(client, { userId: actor, agencyId, action: 'publish' });
  },
  evidence: async (scope: Scope, client: SupabaseClient) => {
    const { SupabasePublicationStore } = await import('@/gnr8/standalone/publication-store');
    const store = new SupabasePublicationStore(client,
      process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope);
    const [artifact, preflight, prebuilt, resources] = await Promise.all([
      store.read<Artifact>('native-studio/build-artifact-github-push-v1.json'),
      store.read<Preflight>('native-studio/first-deploy-dry-run-v1.json'),
      store.read<Prebuilt>('native-studio/prebuilt-image-v1.json'),
      store.read<Resources>('native-studio/resources-reserved-v1.json'),
    ]);
    return { artifact, preflight, prebuilt, resources };
  },
  deploy: async (request: Request, client: SupabaseClient) => {
    const { runConfiguredNativeStudioFirstDeploy } = await import(
      '@/gnr8/standalone/native-studio-configured-first-deploy-run');
    const trustedGit = process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT ?? '';
    const trustedWrangler = process.env.GNR8_NATIVE_STUDIO_TRUSTED_WRANGLER ?? '';
    if (!trustedGit.startsWith('/') || !trustedWrangler.startsWith('/'))
      throw Error('native_studio_first_deploy_runner_unconfigured');
    return runConfiguredNativeStudioFirstDeploy({ scope: request.scope, client,
      sourceId: request.sourceId, sourceCommit: request.sourceCommit,
      workerId: request.workerId, trustedGit, trustedWrangler });
  },
  chainEnabled: () => process.env.GNR8_NATIVE_STUDIO_PUBLIC_GATEWAY_ENABLED === '1',
  enqueuePublicGateway: async (request: Request) => {
    const identity = [request.scope.agencyId, request.scope.clientId,
      request.scope.siteId, request.sourceId, request.sourceCommit,
      request.workerId, request.artifactCommit];
    const id = `gnr8-native-studio-gateway-${createHash('sha256')
      .update(JSON.stringify(identity)).digest('hex')}`;
    await inngest.send({ id, name: NATIVE_STUDIO_PUBLIC_GATEWAY_EVENT,
      data: request });
  },
};

/** The separate trusted job receives identities only. It checks the scoped
 * artifact, dry-run and registry image before opening deploy secrets. */
export async function runNativeStudioFirstDeploy(request: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_first_deploy_disabled');
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).sort().join() !==
        'actor,artifactCommit,scope,sourceCommit,sourceId,workerId')
    throw Error('native_studio_first_deploy_request_invalid');
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
    throw Error('native_studio_first_deploy_request_invalid');
  const client = await deps.client();
  if (!client) throw Error('native_studio_first_deploy_store_unavailable');
  await deps.authorize(client, actor, scope.agencyId);
  const { artifact, preflight, prebuilt, resources } = await deps.evidence(scope, client);
  if (artifact?.sourceId !== sourceId || artifact.sourceCommit !== sourceCommit ||
      artifact.workerId !== workerId || artifact.artifactCommit !== artifactCommit ||
      artifact.branch !== `gnr8-build-${sourceCommit}` ||
      preflight?.sourceId !== sourceId || preflight.commit !== sourceCommit ||
      preflight.workerId !== workerId || !SOURCE.test(preflight.identity) ||
      !Number.isSafeInteger(preflight.files) || preflight.files < 2 ||
      !prebuilt || Object.keys(prebuilt).sort().join() !==
        'accountId,commit,digest,siteId,sourceId,workerId' ||
      !WORKER.test(prebuilt.accountId) || !SOURCE.test(prebuilt.digest) ||
      prebuilt.siteId !== scope.siteId || prebuilt.sourceId !== sourceId ||
      prebuilt.commit !== sourceCommit || prebuilt.workerId !== workerId ||
      !resources || JSON.stringify(resources.target?.scope) !==
        JSON.stringify(scope) ||
      resources.target.accountId !== prebuilt.accountId ||
      resources.workers?.studio?.id !== workerId)
    throw Error('native_studio_first_deploy_evidence_unverified');
  const verified = { scope, actor, sourceId, sourceCommit,
    workerId, artifactCommit };
  const result = await deps.deploy(verified, client);
  if (result.commit !== sourceCommit)
    throw Error('native_studio_first_deploy_result_unverified');
  if (deps.chainEnabled() && result.state === 'reconcile-required' &&
      result.observation === 'verified-source-control-plane')
    await deps.enqueuePublicGateway(verified);
  return result;
}

export const nativeStudioFirstDeployJob = inngest.createFunction({
  id: NATIVE_STUDIO_FIRST_DEPLOY_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_FIRST_DEPLOY_EVENT },
async ({ event, step }) => settleNativeStudioFirstDeploy(event.data, step));

/** A completed deploy attempt is observed again without repeating the
 * external write. Only transient control-plane lag gets another readback. */
export async function settleNativeStudioFirstDeploy(
  request: unknown,
  steps: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sleep: (id: string, duration: string) => Promise<unknown> },
  run: typeof runNativeStudioFirstDeploy = runNativeStudioFirstDeploy,
) {
  for (let index = 0; index < MAX_OBSERVATIONS; index++) {
    const result = await steps.run(`first-deploy-observe-${index}`,
      () => run(request)) as Awaited<ReturnType<typeof runNativeStudioFirstDeploy>>;
    if (result.state !== 'pending-review' ||
        !['pending', 'readback-unavailable'].includes(result.observation) ||
        index === MAX_OBSERVATIONS - 1)
      return result;
    await steps.sleep(`first-deploy-wait-${index}`, OBSERVATION_INTERVAL);
  }
  throw Error('native_studio_first_deploy_observation_exhausted');
}
