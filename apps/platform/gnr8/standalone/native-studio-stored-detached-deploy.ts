import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { restoreNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { verifyStoredFirstDeployHandoff } from '../../../../scripts/stacki/verify-stored-first-deploy.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { configuredFirstStudioDeployIntent } from './native-studio-configured-first-deploy-intent';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { advanceNativeStudioDetachedDeploy } from './native-studio-detached-deploy';
import { nativeStudioImageRecoveryStore } from './native-studio-image-recovery';
import { SupabasePublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const SESSION = 'native-studio/first-deploy-sandbox-session-v1.json';
const SANDBOX_INTENT = 'native-studio/first-deploy-sandbox-intent-v1.json';
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  verify: verifyStoredFirstDeployHandoff,
  restore: restoreNativeStudioBuildOutputBytes,
  credentials: configuredNativeStudioDeploymentCredentials,
  prepareIntent: configuredFirstStudioDeployIntent,
  inspect: inspectBoundCloudflareStudioFirstDeployment,
  advance: advanceNativeStudioDetachedDeploy,
};

/** Restore verified build outputs only for first staging; resume from receipts. */
export async function configuredNativeStudioStoredDetachedDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const snapshotId = env.GNR8_NATIVE_STUDIO_DEPLOY_SNAPSHOT ?? '';
  const wranglerPath = env.GNR8_NATIVE_STUDIO_DEPLOY_WRANGLER_PATH ?? '';
  const sandboxTimeoutMs = Number(env.GNR8_NATIVE_STUDIO_DEPLOY_SANDBOX_TIMEOUT_MS);
  if (!input?.scope || !input.client || !SHA.test(input.sourceId) ||
      !COMMIT.test(input.sourceCommit) || !HEX32.test(input.workerId) ||
      !SNAPSHOT.test(snapshotId) || !EXECUTABLE.test(wranglerPath) ||
      wranglerPath.includes('..') || !Number.isSafeInteger(sandboxTimeoutMs) ||
      sandboxTimeoutMs < 30 * 60_000 || sandboxTimeoutMs > 90 * 60_000)
    throw Error('native_studio_detached_deploy_not_configured');
  const site = await deps.site(input.scope, input.client, env);
  const store = await nativeStudioImageRecoveryStore(
    deps.store(input.client, input.scope, env), {
      scope: input.scope, site, sourceId: input.sourceId,
      commit: input.sourceCommit, workerId: input.workerId,
      buildSnapshotId: env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '',
    });
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  if (!reserved || JSON.stringify(reserved.target?.scope) !== JSON.stringify(input.scope) ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.repository !== site.repository ||
      String(reserved.target?.repositoryId) !== site.repositoryId ||
      reserved.target?.studioOrigin !== site.studioOrigin ||
      reserved.workers?.studio?.worker !== `gnr8-${input.scope.siteId}-studio` ||
      reserved.workers?.studio?.id !== input.workerId ||
      reserved.workers?.publicSite?.worker !== `gnr8-${input.scope.siteId}-site` ||
      !HEX32.test(reserved.workers.publicSite.id) ||
      reserved.draftBucket?.bucket !== `gnr8-${input.scope.siteId}-drafts` ||
      !HEX32.test(reserved.draftBucket.bucketId))
    throw Error('native_studio_detached_deploy_resources_unverified');
  const identity = { store, scope: input.scope, site,
    sourceId: input.sourceId, commit: input.sourceCommit,
    workerId: input.workerId };
  const proof = await deps.verify(identity);
  if (JSON.stringify(proof.preflight) !== JSON.stringify({
    sourceId: input.sourceId, commit: input.sourceCommit,
    workerId: input.workerId, files: proof.handoff.files.length }))
    throw Error('native_studio_detached_deploy_preflight_unverified');
  const needsFiles = !await store.read(SESSION) && !await store.read(SANDBOX_INTENT);
  const restored = needsFiles ? await deps.restore(identity) : null;
  try {
    if (restored && JSON.stringify(restored.files) !==
        JSON.stringify(proof.handoff.files))
      throw Error('native_studio_detached_deploy_artifact_unverified');
    return await deps.advance({ scope: input.scope, site, store,
      artifactProject: restored?.artifactDir ?? '/vercel/sandbox',
      sourceId: input.sourceId, commit: input.sourceCommit,
      workerId: input.workerId, snapshotId,
      networkPolicy: { allow: ['api.cloudflare.com'] },
      sandboxTimeoutMs, wranglerPath,
      loadCredentials: () => deps.credentials(input.scope, store,
        site.accountId, env),
      prepareIntent: async credentials => {
        const intent = await deps.prepareIntent({
          scope: input.scope, client: input.client, store,
          project: restored?.artifactDir ?? '/vercel/sandbox',
          sourceId: input.sourceId, commit: input.sourceCommit,
          workerId: input.workerId,
          cloudflareCredential: credentials.cloudflareCredential,
          secrets: credentials.secrets }, env, transport);
        if (intent.state !== 'prepared' && intent.state !== 'pending-review')
          throw Error('native_studio_detached_deploy_intent_unverified');
        return { state: intent.state, commit: intent.commit, tag: intent.tag };
      },
      inspect: (credential, tag) => deps.inspect(input.scope,
        input.client, site.accountId, input.workerId,
        credential, transport, tag, true,
        { store, sourceId: input.sourceId,
          commit: input.sourceCommit, site }),
    });
  } finally { await restored?.cleanup(); }
}
