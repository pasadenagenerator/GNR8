import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { restoreNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { verifyStoredFirstDeployHandoff } from '../../../../scripts/stacki/verify-stored-first-deploy.mjs';
import { inspectBoundCloudflarePublicStudioGateway } from './cloudflare-public-studio-gateway';
import { inspectCloudflareSiteBuildPublicationSeparation } from
  './cloudflare-site-build-configuration';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { advanceNativeStudioDetachedPublicDeploy } from './native-studio-detached-public-deploy';
import { prepareStoredNativeStudioPublicDeployIntent } from './native-studio-stored-public-intent';
import { SupabasePublicationStore } from './publication-store';
import { nativeStudioImageRecoveryStore } from './native-studio-image-recovery';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const SESSION = 'native-studio/first-public-sandbox-session-v1.json';
const SANDBOX_INTENT = 'native-studio/first-public-sandbox-intent-v1.json';
const ATTEMPT = 'native-studio/first-public-deploy-attempt-v1.json';
const STUDIO_INTENT = 'native-studio/first-deploy-intent-v1.json';
const defaults = { site: configuredNativeStudioBootstrapSite,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  verify: verifyStoredFirstDeployHandoff,
  restore: restoreNativeStudioBuildOutputBytes,
  credentials: configuredNativeStudioDeploymentCredentials,
  buildSeparation: inspectCloudflareSiteBuildPublicationSeparation,
  prepareIntent: prepareStoredNativeStudioPublicDeployIntent,
  inspect: inspectBoundCloudflarePublicStudioGateway,
  advance: advanceNativeStudioDetachedPublicDeploy };

/** Restores verified outputs for the one-time package transfer, then resumes
 * the exact public deployment from durable receipts and Cloudflare readback. */
export async function configuredNativeStudioStoredPublicDeploy(input: {
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
    throw Error('native_studio_public_detached_not_configured');
  const site = await deps.site(input.scope, input.client, env);
  const store = await nativeStudioImageRecoveryStore(
    deps.store(input.client, input.scope, env), {
      scope: input.scope, site, sourceId: input.sourceId,
      commit: input.sourceCommit, workerId: input.workerId,
      buildSnapshotId: env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '',
    });
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  const publicWorkerId = reserved?.workers?.publicSite?.id;
  if (!HEX32.test(publicWorkerId ?? '') ||
      reserved?.target?.accountId !== site.accountId ||
      reserved?.target?.repository !== site.repository ||
      String(reserved?.target?.repositoryId) !== site.repositoryId ||
      reserved?.target?.studioOrigin !== site.studioOrigin ||
      reserved?.workers?.studio?.id !== input.workerId ||
      reserved?.workers?.publicSite?.worker !== `gnr8-${site.siteId}-site`)
    throw Error('native_studio_public_detached_resources_unverified');
  const identity = { store, scope: input.scope, site,
    sourceId: input.sourceId, commit: input.sourceCommit,
    workerId: input.workerId };
  await deps.verify(identity);
  const studioIntent = await store.read<{ identity: string; commit: string }>(
    STUDIO_INTENT);
  if (!/^[a-f0-9]{64}$/.test(studioIntent?.identity ?? '') ||
      studioIntent?.commit !== input.sourceCommit)
    throw Error('native_studio_public_detached_studio_intent_unverified');
  const studioTag = `gnr8-first-${studioIntent.identity}`;
  if (!await store.read(ATTEMPT)) {
    const buildsUserCredential =
      env.GNR8_NATIVE_STUDIO_CLOUDFLARE_BUILDS_USER_TOKEN ?? '';
    if (!/^[A-Za-z0-9_-]{40,80}$/.test(buildsUserCredential))
      throw Error('native_studio_public_deploy_build_separation_unconfigured');
    await deps.buildSeparation({ scope: input.scope, accountId: site.accountId,
      repository: site.repository, repositoryId: site.repositoryId,
      branch: site.branch }, buildsUserCredential, transport);
  }
  const needsFiles = !await store.read(SESSION) && !await store.read(SANDBOX_INTENT);
  const restored = needsFiles ? await deps.restore(identity) : null;
  try {
    return await deps.advance({ scope: input.scope, site, store,
      artifactProject: restored?.artifactDir ?? '/vercel/sandbox',
      sourceId: input.sourceId, commit: input.sourceCommit,
      studioWorkerId: input.workerId, publicWorkerId: publicWorkerId!,
      studioTag, snapshotId,
      networkPolicy: { allow: ['api.cloudflare.com'] },
      sandboxTimeoutMs, wranglerPath,
      loadCredential: async () => (await deps.credentials(
        input.scope, store, site.accountId, env)).cloudflareCredential,
      prepareIntent: () => deps.prepareIntent({ scope: input.scope,
        client: input.client, store, sourceId: input.sourceId,
        commit: input.sourceCommit, studioWorkerId: input.workerId,
        publicWorkerId: publicWorkerId! }, env, transport),
      inspect: (credential, tag) => deps.inspect(input.scope, input.client,
        site.accountId, publicWorkerId!, credential, transport, tag),
    });
  } finally { await restored?.cleanup(); }
}
