import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_FIRST_DEPLOY_EVENT } from './native-studio-first-deploy-job';
import { imageNextEventId, imageRequest, verifyBaseEvidence,
  verifyTransfer, verifyPrebuilt, verifyImagePushAttempt,
  type Scope, type Request } from './native-studio-image-job-evidence';

export const NATIVE_STUDIO_IMAGE_PUSH_JOB_ID = 'native-studio-image-push-job';
export const NATIVE_STUDIO_IMAGE_PUSH_EVENT = 'gnr8/native-studio.image-push.requested';
const MAX_ADVANCES = 50;
const POLL_INTERVAL = '2m';
type Progress = { state: 'running' | 'complete' | 'pending-review';
  prebuilt?: any; cleanupState?: 'complete' | 'pending-review' };

async function configuredPush(request: Request, client: SupabaseClient) {
  const { configuredNativeStudioImagePush } = await import(
    '@/gnr8/standalone/native-studio-configured-image-push');
  const trustedGit = process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT ?? '';
  if (!trustedGit.startsWith('/'))
    throw Error('native_studio_image_push_runner_unconfigured');
  return configuredNativeStudioImagePush({ scope: request.scope, client,
    sourceId: request.sourceId, sourceCommit: request.sourceCommit,
    workerId: request.workerId, trustedGit });
}

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED === '1',
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
    const [artifact, preflight, resources, transfer, attempt, prebuilt, pushAttempt] =
      await Promise.all([
        store.read<any>('native-studio/build-artifact-github-push-v1.json'),
        store.read<any>('native-studio/first-deploy-dry-run-v1.json'),
        store.read<any>('native-studio/resources-reserved-v1.json'),
        store.read<any>('native-studio/image-drive-transfer-v1.json'),
        store.read<any>('native-studio/image-drive-attempt-v1.json'),
        store.read<any>('native-studio/prebuilt-image-v1.json'),
        store.read<any>('native-studio/image-push-attempt-v1.json'),
      ]);
    return { artifact, preflight, resources, transfer, attempt, prebuilt, pushAttempt };
  },
  push: configuredPush,
  reconcileCleanup: configuredPush,
  chainEnabled: () => process.env.GNR8_NATIVE_STUDIO_FIRST_DEPLOY_ENABLED === '1',
  enqueueDeploy: async (request: Request) => {
    await inngest.send({ id: imageNextEventId('deploy', request),
      name: NATIVE_STUDIO_FIRST_DEPLOY_EVENT, data: request });
  },
};

export async function runNativeStudioImagePush(value: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_image_push_disabled');
  const request = imageRequest(value);
  const client = await deps.client();
  if (!client) throw Error('native_studio_image_push_store_unavailable');
  await deps.authorize(client, request.actor, request.scope.agencyId);
  const evidence = await deps.evidence(request.scope, client);
  const accountId = verifyBaseEvidence(request, evidence);
  verifyTransfer(request, evidence, accountId);
  verifyImagePushAttempt(request, evidence);
  // A completed receipt is safe to resume after an enqueue failure. An
  // attempt without that receipt must never cause a second external push.
  if (evidence.prebuilt) {
    verifyPrebuilt(request, evidence.prebuilt, accountId);
    let cleanupState: 'complete' | 'pending-review' = 'pending-review';
    try {
      const cleanup = await deps.reconcileCleanup(request, client) as Progress;
      if (cleanup?.state === 'complete' &&
          JSON.stringify(cleanup.prebuilt) === JSON.stringify(evidence.prebuilt) &&
          cleanup.cleanupState === 'complete')
        cleanupState = 'complete';
    } catch {
      // A verified registry receipt can proceed while cleanup is reviewed.
    }
    if (deps.chainEnabled()) await deps.enqueueDeploy(request);
    return { state: 'complete' as const, prebuilt: evidence.prebuilt,
      cleanupState };
  }
  const progress = await deps.push(request, client) as Progress;
  if (!progress || !['running', 'complete', 'pending-review'].includes(progress.state) ||
      (progress.cleanupState !== undefined &&
        !['complete', 'pending-review'].includes(progress.cleanupState)))
    throw Error('native_studio_image_push_progress_unverified');
  const refreshed = await deps.evidence(request.scope, client);
  if (verifyBaseEvidence(request, refreshed) !== accountId)
    throw Error('native_studio_image_push_target_changed');
  verifyTransfer(request, refreshed, accountId);
  verifyImagePushAttempt(request, refreshed);
  if (progress.state === 'pending-review')
    return { state: 'pending-review' as const };
  if (progress.state === 'running') {
    if (refreshed.prebuilt)
      throw Error('native_studio_image_push_progress_unverified');
    return { state: 'running' as const };
  }
  verifyPrebuilt(request, progress.prebuilt, accountId);
  if (JSON.stringify(refreshed.prebuilt) !== JSON.stringify(progress.prebuilt))
    throw Error('native_studio_image_push_receipt_unverified');
  if (deps.chainEnabled()) await deps.enqueueDeploy(request);
  return { state: 'complete' as const, prebuilt: progress.prebuilt,
    ...(progress.cleanupState ? { cleanupState: progress.cleanupState } : {}) };
}

export const nativeStudioImagePushJob = inngest.createFunction({
  id: NATIVE_STUDIO_IMAGE_PUSH_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_IMAGE_PUSH_EVENT },
async ({ event, step }) => {
  for (let index = 0; index < MAX_ADVANCES; index++) {
    const result = await step.run(`image-push-advance-${index}`,
      () => runNativeStudioImagePush(event.data));
    if (result.state !== 'running') return result;
    if (index < MAX_ADVANCES - 1)
      await step.sleep(`image-push-poll-${index}`, POLL_INTERVAL);
  }
  return { state: 'pending-review' as const, reason: 'poll-budget-exhausted' };
});
