import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Snapshot, type NetworkPolicy } from '@vercel/sandbox';
import { restoreNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { recordStudioFirstDeployDryRunFromStoredImage } from '../../../../scripts/stacki/first-studio-dry-run.mjs';
import { advanceNativeStudioDetachedImageBuild } from './native-studio-detached-image-build';
import { nativeStudioImageRecoveryStore } from './native-studio-image-recovery';
import { restrictedNativeStudioImageNetwork } from './native-studio-image-drive';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { SupabasePublicationStore } from './publication-store';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  source: readStoredVerifiedAstroStudio,
  restoreOutputs: restoreNativeStudioBuildOutputBytes,
  recordPreflight: recordStudioFirstDeployDryRunFromStoredImage,
  snapshot: Snapshot.get,
  advance: advanceNativeStudioDetachedImageBuild,
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
  sourceCommit: string; workerId: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const buildSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '';
  const pushSnapshotId = env.GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT ?? '';
  const sandboxTimeoutMs = Number(
    env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SANDBOX_TIMEOUT_MS);
  if (env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_ENABLED !== '1' ||
      !input?.client || !SNAPSHOT.test(buildSnapshotId) ||
      !SNAPSHOT.test(pushSnapshotId) || buildSnapshotId === pushSnapshotId ||
      !Number.isSafeInteger(sandboxTimeoutMs) ||
      sandboxTimeoutMs < 60 * 60_000 || sandboxTimeoutMs > 90 * 60_000)
    throw Error('native_studio_image_build_not_configured');
  const buildNetworkPolicy = networkPolicy(
    env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_NETWORK_HOSTS);
  const site = await deps.site(input.scope, input.client, env);
  const validateSnapshots = async () => {
    const snapshots = await Promise.all([buildSnapshotId, pushSnapshotId]
      .map(snapshotId => deps.snapshot({ snapshotId })));
    if (snapshots.some(snapshot => snapshot.status !== 'created' ||
        (snapshot.expiresAt && snapshot.expiresAt.getTime() <=
          Date.now() + 2 * 60 * 60_000)))
      throw Error('native_studio_image_build_snapshot_unavailable');
  };
  const store = await nativeStudioImageRecoveryStore(
    deps.store(input.client, input.scope, env), {
      scope: input.scope, site, sourceId: input.sourceId,
      commit: input.sourceCommit, workerId: input.workerId, buildSnapshotId,
    }, { allowCreate: true, validateNewSnapshot: validateSnapshots });
  const prepared = { site, store, sourceId: input.sourceId,
    commit: input.sourceCommit, workerId: input.workerId };
    // Snapshot availability matters when creating a Sandbox. A live attempt
    // is resumed from its private identity and attested session instead.
    if (!await prepared.store.read('native-studio/image-drive-attempt-v2.json')) {
      await validateSnapshots();
    }
    const source = await deps.source({ store: prepared.store,
      sourceId: prepared.sourceId, site: prepared.site });
    const reservation = await prepared.store.read<NativeStudioResourceReceipt>(
      NATIVE_STUDIO_RESOURCE_RECEIPT);
    const publicWorkerId = reservation?.workers?.publicSite?.id;
    if (!/^[a-f0-9]{32}$/.test(publicWorkerId ?? '') ||
        reservation?.workers?.publicSite?.worker !==
          `gnr8-${input.scope.siteId}-site` ||
        reservation?.target?.accountId !== prepared.site.accountId ||
        reservation?.workers?.studio?.id !== input.workerId ||
        reservation?.target?.repository !== site.repository ||
        String(reservation?.target?.repositoryId) !== site.repositoryId ||
        reservation?.target?.studioOrigin !== site.studioOrigin)
      throw Error('native_studio_image_build_public_target_unverified');
    const outputs = await deps.restoreOutputs({ store: prepared.store,
      scope: input.scope, site: prepared.site, sourceId: prepared.sourceId,
      commit: prepared.commit, workerId: prepared.workerId });
    let progress;
    try {
      const dist = await Promise.all(outputs.files.filter(file =>
        file.path.startsWith('dist/')).map(async file => ({
          path: file.path,
          body: await readFile(join(outputs.artifactDir, file.path)),
        })));
      progress = await deps.advance({ scope: input.scope, site: prepared.site,
        sourceId: prepared.sourceId, commit: prepared.commit,
        workerId: prepared.workerId, publicWorkerId: publicWorkerId!,
        store: prepared.store, buildSnapshotId, pushSnapshotId,
        buildNetworkPolicy, sandboxTimeoutMs,
        files: [...source.files, ...dist],
      });
      if (progress.state === 'complete') {
        await deps.recordPreflight({
        store: prepared.store, sourceId: prepared.sourceId,
        commit: prepared.commit, scope: input.scope,
        site: prepared.site, workerId: prepared.workerId, buildSnapshotId });
      }
      return progress;
    } finally { await outputs.cleanup(); }
}
