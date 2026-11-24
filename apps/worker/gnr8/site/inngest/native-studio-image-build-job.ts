import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_IMAGE_PUSH_EVENT } from './native-studio-image-push-job';
import { imageNextEventId, imageRequest, verifyBaseEvidence, verifyImageAttempt, verifyTransfer,
  type Scope, type Request } from './native-studio-image-job-evidence';

export const NATIVE_STUDIO_IMAGE_BUILD_JOB_ID = 'native-studio-image-build-job';
export const NATIVE_STUDIO_IMAGE_BUILD_EVENT = 'gnr8/native-studio.image-build.requested';
const MAX_ADVANCES = 50;
const POLL_INTERVAL = '2m';
type Progress = { state: 'running' | 'complete' | 'pending-review';
  transfer?: any };

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_ENABLED === '1',
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
    const [artifact, preflight, resources, transfer, attempt] = await Promise.all([
      store.read<any>('native-studio/build-artifact-github-push-v1.json'),
      store.read<any>('native-studio/first-deploy-dry-run-v1.json'),
      store.read<any>('native-studio/resources-reserved-v1.json'),
      store.read<any>('native-studio/image-drive-transfer-v1.json'),
      store.read<any>('native-studio/image-drive-attempt-v1.json'),
    ]);
    return { artifact, preflight, resources, transfer, attempt };
  },
  build: async (request: Request, client: SupabaseClient) => {
    const { configuredNativeStudioImageBuild } = await import(
      '@/gnr8/standalone/native-studio-configured-image-build');
    return configuredNativeStudioImageBuild({ scope: request.scope, client,
      sourceId: request.sourceId, sourceCommit: request.sourceCommit,
      workerId: request.workerId });
  },
  chainEnabled: () => process.env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED === '1',
  enqueuePush: async (request: Request) => {
    await inngest.send({ id: imageNextEventId('push', request),
      name: NATIVE_STUDIO_IMAGE_PUSH_EVENT, data: request });
  },
};

export async function runNativeStudioImageBuild(value: unknown,
  deps: typeof defaults = defaults) {
  if (!deps.enabled()) throw Error('native_studio_image_build_disabled');
  const request = imageRequest(value);
  const client = await deps.client();
  if (!client) throw Error('native_studio_image_build_store_unavailable');
  await deps.authorize(client, request.actor, request.scope.agencyId);
  const evidence = await deps.evidence(request.scope, client);
  const accountId = verifyBaseEvidence(request, evidence, false);
  if (evidence.preflight) verifyBaseEvidence(request, evidence);
  // A complete transfer may still need its attested preflight receipt recorded
  // after an interrupted response. The configured builder resumes read-only.
  if (evidence.transfer) verifyTransfer(request, evidence, accountId);
  if (evidence.attempt) verifyImageAttempt(request, evidence.attempt, accountId);
  // The detached Platform lifecycle, rather than this event, decides whether
  // an existing attempt is safely pollable or needs review.
  const progress = await deps.build(request, client) as Progress;
  if (!progress || !['running', 'complete', 'pending-review'].includes(progress.state))
    throw Error('native_studio_image_build_progress_unverified');
  const refreshed = await deps.evidence(request.scope, client);
  if (verifyBaseEvidence(request, refreshed, false) !== accountId)
    throw Error('native_studio_image_build_target_changed');
  if (refreshed.preflight) verifyBaseEvidence(request, refreshed);
  if (progress.state === 'pending-review')
    return { state: 'pending-review' as const };
  if (progress.state === 'running') {
    verifyImageAttempt(request, refreshed.attempt, accountId);
    if (refreshed.transfer)
      throw Error('native_studio_image_build_progress_unverified');
    return { state: 'running' as const };
  }
  verifyTransfer(request, { ...refreshed, transfer: progress.transfer }, accountId);
  if (verifyBaseEvidence(request, refreshed) !== accountId)
    throw Error('native_studio_image_build_preflight_unverified');
  if (JSON.stringify(refreshed.transfer) !== JSON.stringify(progress.transfer))
    throw Error('native_studio_image_build_transfer_unverified');
  if (deps.chainEnabled()) await deps.enqueuePush(request);
  return { state: 'complete' as const, transfer: progress.transfer };
}

export const nativeStudioImageBuildJob = inngest.createFunction({
  id: NATIVE_STUDIO_IMAGE_BUILD_JOB_ID, retries: 1,
  concurrency: { limit: 1, key: 'event.data.scope.siteId' },
}, { event: NATIVE_STUDIO_IMAGE_BUILD_EVENT },
async ({ event, step }) => {
  for (let index = 0; index < MAX_ADVANCES; index++) {
    const result = await step.run(`image-build-advance-${index}`,
      () => runNativeStudioImageBuild(event.data));
    if (result.state !== 'running') return result;
    if (index < MAX_ADVANCES - 1)
      await step.sleep(`image-build-poll-${index}`, POLL_INTERVAL);
  }
  return { state: 'pending-review' as const, reason: 'poll-budget-exhausted' };
});
