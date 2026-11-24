import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Snapshot } from '@vercel/sandbox';
import { configuredNativeStudioCloudflareCredential } from './native-studio-cloudflare-account-credential';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { advanceNativeStudioDetachedImagePush } from './native-studio-detached-image-push';
import { SupabasePublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const HOST = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const defaults = {
  snapshot: Snapshot.get,
  site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  head: inspectGitHubNativeStudioBranch,
  advance: advanceNativeStudioDetachedImagePush,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};
function networkHosts(value: string | undefined) {
  const hosts = value?.split(',').map(host => host.trim()) ?? [];
  if (hosts.length < 2 || hosts.length > 16 ||
      new Set(hosts).size !== hosts.length ||
      !hosts.every(host => host.length <= 253 && HOST.test(host) &&
        !host.includes('..') && !host.startsWith('*.')) ||
      !hosts.includes('api.cloudflare.com') ||
      !hosts.includes('registry.cloudflare.com'))
    throw Error('native_studio_image_push_not_configured');
  return hosts;
}

/** The receiver reads bound receipts and GitHub refs directly. No host Git
 * checkout exists and no repository code runs with Cloudflare credentials. */
export async function configuredNativeStudioImagePushStored(request: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const buildSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '';
  const pushSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT ?? '';
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const dockerPath = env.GNR8_NATIVE_STUDIO_IMAGE_DOCKER_PATH ?? '';
  const wranglerPath = env.GNR8_NATIVE_STUDIO_IMAGE_WRANGLER_PATH ?? '';
  const sandboxTimeoutMs = Number(env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_SANDBOX_TIMEOUT_MS);
  if (env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED !== '1' ||
      !request?.client || !request.scope || !SHA.test(request.sourceId) ||
      !COMMIT.test(request.sourceCommit) || !HEX32.test(request.workerId) ||
      !SNAPSHOT.test(buildSnapshotId) || !SNAPSHOT.test(pushSnapshotId) ||
      buildSnapshotId === pushSnapshotId || !HEX32.test(accountId) ||
      !EXECUTABLE.test(dockerPath) || dockerPath.includes('..') ||
      !EXECUTABLE.test(wranglerPath) || wranglerPath.includes('..') ||
      !Number.isSafeInteger(sandboxTimeoutMs) ||
      sandboxTimeoutMs < 50 * 60_000 || sandboxTimeoutMs > 60 * 60_000)
    throw Error('native_studio_image_push_not_configured');
  const pushNetworkPolicy = { allow: networkHosts(
    env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_NETWORK_HOSTS) };
  const site = await deps.site(request.scope, request.client, env);
  const store = deps.store(request.client, request.scope, env);
  const [reserved, sourcePush, handoff, artifact] = await Promise.all([
    store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT),
    store.read<{ commit: string }>('native-studio/first-github-push-intent-v1.json'),
    store.read<{ sourceId: string; commit: string; workerId: string; scope: NativeStudioScope }>(
      'native-studio/build-handoff-v1.json'),
    store.read<{ sourceId: string; sourceCommit: string; workerId: string;
      branch: string; artifactCommit: string }>(
      'native-studio/build-artifact-github-push-v1.json'),
  ]);
  if (site.accountId !== accountId || !reserved ||
      JSON.stringify(reserved.target?.scope) !== JSON.stringify(request.scope) ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.repository !== site.repository ||
      String(reserved.target?.repositoryId) !== site.repositoryId ||
      reserved.workers?.studio?.id !== request.workerId ||
      sourcePush?.commit !== request.sourceCommit ||
      handoff?.sourceId !== request.sourceId ||
      handoff.commit !== request.sourceCommit ||
      handoff.workerId !== request.workerId ||
      JSON.stringify(handoff.scope) !== JSON.stringify(request.scope) ||
      artifact?.sourceId !== request.sourceId ||
      artifact.sourceCommit !== request.sourceCommit ||
      artifact.workerId !== request.workerId ||
      artifact.branch !== `gnr8-build-${request.sourceCommit}` ||
      !COMMIT.test(artifact.artifactCommit))
    throw Error('native_studio_image_push_target_changed');
  const issued = await deps.token(request.scope, request.client, env, transport,
    deps.site, Date.now(), 'read');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_image_push_repository_changed');
  const [sourceHead, artifactHead] = await Promise.all([
    deps.head(site, issued.token, transport),
    deps.head({ ...site, branch: artifact.branch }, issued.token, transport),
  ]);
  if (sourceHead.repositoryId !== site.repositoryId ||
      sourceHead.branch !== site.branch ||
      sourceHead.commit !== request.sourceCommit ||
      artifactHead.repositoryId !== site.repositoryId ||
      artifactHead.branch !== artifact.branch ||
      artifactHead.commit !== artifact.artifactCommit ||
      JSON.stringify(await deps.site(request.scope, request.client, env)) !==
        JSON.stringify(site))
    throw Error('native_studio_image_push_source_changed');
  if (!await store.read('native-studio/image-push-receiver-intent-v1.json') &&
      !await store.read('native-studio/prebuilt-image-v1.json')) {
    const [buildSnapshot, pushSnapshot] = await Promise.all([
      deps.snapshot({ snapshotId: buildSnapshotId }),
      deps.snapshot({ snapshotId: pushSnapshotId }),
    ]);
    for (const snapshot of [buildSnapshot, pushSnapshot]) {
      if (snapshot.status !== 'created' ||
          (snapshot.expiresAt && snapshot.expiresAt.getTime() <=
            Date.now() + 2 * 60 * 60_000))
        throw Error('native_studio_image_push_snapshot_unavailable');
    }
  }
  return deps.advance({ scope: request.scope, site, store,
    sourceId: request.sourceId, commit: request.sourceCommit,
    workerId: request.workerId, buildSnapshotId, pushSnapshotId,
    pushNetworkPolicy, sandboxTimeoutMs, dockerPath, wranglerPath,
    loadCredential: async () => {
      const cloudflareToken = configuredNativeStudioCloudflareCredential(env, 'DEPLOYER');
      if (!TOKEN.test(cloudflareToken))
        throw Error('native_studio_image_push_credential_unavailable');
      return cloudflareToken;
    },
  });
}
