import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Snapshot, type NetworkPolicy } from '@vercel/sandbox';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { buildNativeStudioDriveImage } from './native-studio-drive-image-build';
import { buildNativeStudioImageDrivePhase } from './native-studio-image-drive-phase';
import { restrictedNativeStudioImageNetwork } from './native-studio-image-drive';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { NativeStudioImageArchiveReceipt } from './native-studio-image-drive-handoff';

type Environment = Record<string, string | undefined>;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const defaults = {
  withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  source: readStoredVerifiedAstroStudio,
  snapshot: Snapshot.get,
  phase: buildNativeStudioImageDrivePhase,
  build: buildNativeStudioDriveImage,
};

function networkPolicy(raw: string | undefined): NetworkPolicy {
  const hosts = raw?.split(',').map(value => value.trim()) ?? [];
  if (!hosts.length || hosts.length > 24 ||
      hosts.some(host => !HOST.test(host)) ||
      new Set(hosts).size !== hosts.length)
    throw Error('native_studio_image_build_network_unconfigured');
  const policy: NetworkPolicy = { allow: hosts };
  if (!restrictedNativeStudioImageNetwork(policy))
    throw Error('native_studio_image_build_network_unconfigured');
  return policy;
}

/** Obtain bytes from the verified private source for the exact checked-out
 * commit. The build Sandbox receives no credential or service-role store. */
export async function configuredNativeStudioImageBuild(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const buildSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '';
  const pushSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT ?? '';
  if (env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_ENABLED !== '1' ||
      !input?.client || !SNAPSHOT.test(buildSnapshotId) ||
      !SNAPSHOT.test(pushSnapshotId) || buildSnapshotId === pushSnapshotId)
    throw Error('native_studio_image_build_not_configured');
  const buildNetworkPolicy = networkPolicy(
    env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_NETWORK_HOSTS);
  const snapshots = await Promise.all([buildSnapshotId, pushSnapshotId]
    .map(snapshotId => deps.snapshot({ snapshotId })));
  if (snapshots.some(snapshot => snapshot.status !== 'created' ||
      (snapshot.expiresAt &&
        snapshot.expiresAt.getTime() <= Date.now() + 2 * 60 * 60_000)))
    throw Error('native_studio_image_build_snapshot_unavailable');
  return deps.withCheckout(input, async prepared => {
    if (prepared.sourceId !== input.sourceId ||
        prepared.commit !== input.sourceCommit ||
        prepared.workerId !== input.workerId ||
        prepared.site.siteId !== input.scope.siteId)
      throw Error('native_studio_image_build_checkout_unverified');
    const source = await deps.source({ store: prepared.store,
      sourceId: prepared.sourceId, site: prepared.site });
    return deps.phase({ scope: input.scope, site: prepared.site,
      sourceId: prepared.sourceId, commit: prepared.commit,
      workerId: prepared.workerId, store: prepared.store,
      buildSnapshotId, pushSnapshotId, buildNetworkPolicy,
      build: (sandbox, archivePath) => deps.build(sandbox, archivePath, {
        scope: input.scope, site: prepared.site,
        sourceId: prepared.sourceId, commit: prepared.commit,
        workerId: prepared.workerId, files: source.files,
      }) as Promise<NativeStudioImageArchiveReceipt>,
    });
  }, env, transport);
}
