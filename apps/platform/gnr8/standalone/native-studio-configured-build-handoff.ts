import 'server-only';
import { lstat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordStudioSandboxBuildArtifact } from '../../../../scripts/stacki/build-artifact-transfer.mjs';
import { recordNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { verifyCommittedStudioSource } from '../../../../scripts/stacki/prepare-git-branch.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioSandboxBuild } from './native-studio-configured-sandbox-build';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  build: configuredNativeStudioSandboxBuild,
  verifySource: verifyCommittedStudioSource,
  record: recordStudioSandboxBuildArtifact,
  recordBytes: recordNativeStudioBuildOutputBytes,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** A trusted, credential-free coordinator for one source/commit/Worker tuple.
 * The site build runs only in the stopped Sandbox. This job records its output
 * but never receives a Cloudflare or GitHub deployment credential.
 */
export async function configuredNativeStudioBuildHandoff(input: {
  scope: NativeStudioScope; client: SupabaseClient; project: string;
  sourceId: string; commit: string; workerId: string;
}, env: Environment = process.env, deps = defaults) {
  const { scope, client, project, sourceId, commit, workerId } = input ?? {};
  if (!scope || !client || typeof project !== 'string' || !project ||
      !SHA.test(sourceId) || !COMMIT.test(commit) || !HEX32.test(workerId))
    throw Error('native_studio_build_handoff_input_invalid');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  if (!reserved || JSON.stringify(reserved.target?.scope) !== JSON.stringify(scope) ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.repository !== site.repository ||
      String(reserved.target?.repositoryId) !== site.repositoryId ||
      reserved.target?.studioOrigin !== site.studioOrigin ||
      reserved.workers?.studio?.worker !== `gnr8-${scope.siteId}-studio` ||
      reserved.workers?.studio?.id !== workerId ||
      reserved.workers?.publicSite?.worker !== `gnr8-${scope.siteId}-site` ||
      !HEX32.test(reserved.workers.publicSite.id) ||
      reserved.draftBucket?.bucket !== `gnr8-${scope.siteId}-drafts` ||
      !HEX32.test(reserved.draftBucket.bucketId))
    throw Error('native_studio_build_handoff_resources_unverified');
  const checked = await deps.verifySource({ project, store, sourceId, site });
  if (checked.sourceId !== sourceId || checked.commit !== commit ||
      checked.repository !== site.repository || checked.branch !== site.branch)
    throw Error('native_studio_build_handoff_source_unverified');
  const built = await deps.build(scope, client, sourceId, env);
  if (built.state !== 'complete') return built;
  const artifactDir = resolve(built.artifactDir);
  const artifactInfo = await lstat(artifactDir);
  if (dirname(artifactDir) !== resolve(tmpdir()) ||
      !/^gnr8-native-build-artifact-[A-Za-z0-9]{6}$/.test(basename(artifactDir)) ||
      !artifactInfo.isDirectory() || artifactInfo.isSymbolicLink())
    throw Error('native_studio_build_handoff_artifact_invalid');
  try {
    const current = await deps.site(scope, client, env);
    if (JSON.stringify(current) !== JSON.stringify(site))
      throw Error('native_studio_build_handoff_target_changed');
    if (built.sourceId !== sourceId)
      throw Error('native_studio_build_handoff_source_unverified');
    const handoff = await deps.record({ project, artifactDir,
      files: built.files, store, sourceId, commit, scope, site, workerId });
    await deps.recordBytes({ artifactDir, files: built.files,
      store, sourceId, commit, scope, site, workerId });
    return handoff;
  } finally {
    await rm(artifactDir, { recursive: true, force: true });
  }
}
