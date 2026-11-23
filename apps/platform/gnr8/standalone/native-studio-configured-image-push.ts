import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Snapshot } from '@vercel/sandbox';
import type { NativeStudioScope } from './native-studio-binding-store';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import { pushNativeStudioImageDrivePhase } from './native-studio-image-drive-phase';
import { pushNativeStudioDriveImage } from './native-studio-drive-image-push';

type Environment = Record<string, string | undefined>;
type Request = { scope: NativeStudioScope; client: SupabaseClient;
  sourceId: string; sourceCommit: string; workerId: string;
  trustedGit: string };
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const HOST = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const defaults = {
  snapshot: Snapshot.get,
  withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  phase: pushNativeStudioImageDrivePhase,
  push: pushNativeStudioDriveImage,
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

/** Restore the exact scoped checkout and private Drive receipt. The central
 * Cloudflare deployer token is first read inside the receiver's credential
 * callback, after archive and source verification. Runtime site secrets are
 * never loaded by this stage. */
export async function configuredNativeStudioImagePush(request: Request,
  env: Environment = process.env, transport: typeof fetch = fetch,
  deps = defaults) {
  const buildSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '';
  const pushSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT ?? '';
  const accountId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID ?? '';
  const dockerPath = env.GNR8_NATIVE_STUDIO_IMAGE_DOCKER_PATH ?? '';
  const wranglerPath = env.GNR8_NATIVE_STUDIO_IMAGE_WRANGLER_PATH ?? '';
  if (env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED !== '1' ||
      !request?.client || !request.scope ||
      !SNAPSHOT.test(buildSnapshotId) ||
      !SNAPSHOT.test(pushSnapshotId) ||
      buildSnapshotId === pushSnapshotId || !HEX32.test(accountId) ||
      !EXECUTABLE.test(dockerPath) || dockerPath.includes('..') ||
      !EXECUTABLE.test(wranglerPath) || wranglerPath.includes('..'))
    throw Error('native_studio_image_push_not_configured');
  const pushNetworkPolicy = { allow: networkHosts(
    env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_NETWORK_HOSTS) };
  const [buildSnapshot, pushSnapshot] = await Promise.all([
    deps.snapshot({ snapshotId: buildSnapshotId }),
    deps.snapshot({ snapshotId: pushSnapshotId }),
  ]);
  for (const snapshot of [buildSnapshot, pushSnapshot]) {
    if (snapshot.status !== 'created' ||
        (snapshot.expiresAt &&
          snapshot.expiresAt.getTime() <= Date.now() + 30 * 60_000))
      throw Error('native_studio_image_push_snapshot_unavailable');
  }
  return deps.withCheckout(request, async prepared => {
    if (prepared.site.accountId !== accountId ||
        prepared.sourceId !== request.sourceId ||
        prepared.commit !== request.sourceCommit ||
        prepared.workerId !== request.workerId)
      throw Error('native_studio_image_push_target_changed');
    return deps.phase({ scope: request.scope, site: prepared.site,
      store: prepared.store, project: prepared.project,
      sourceId: prepared.sourceId, commit: prepared.commit,
      workerId: prepared.workerId, buildSnapshotId, pushSnapshotId,
      pushNetworkPolicy,
      loadCredential: async () => {
        const token = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER ?? '';
        if (!TOKEN.test(token))
          throw Error('native_studio_image_push_credential_unavailable');
        return token;
      },
      push: (sandbox, archivePath, receipt, credential) =>
        deps.push(sandbox, { archivePath, receipt, store: prepared.store,
          cloudflareCredential: credential, dockerPath, wranglerPath,
          site: prepared.site }),
    });
  }, env, transport);
}
