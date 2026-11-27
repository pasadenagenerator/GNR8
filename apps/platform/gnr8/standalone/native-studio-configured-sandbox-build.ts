import 'server-only';
import { rm } from 'node:fs/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Snapshot } from '@vercel/sandbox';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { advanceNativeStudioDetachedSourceBuild } from './native-studio-detached-source-build';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  snapshot: Snapshot.get,
  source: readStoredVerifiedAstroStudio,
  build: advanceNativeStudioDetachedSourceBuild,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** The coordinator keeps its service-role store outside the Sandbox. Only
 * verified source bytes cross into the credential-free build environment.
 */
export async function configuredNativeStudioSandboxBuild(
  scope: NativeStudioScope, client: SupabaseClient, sourceId: string,
  env: Environment = process.env, deps = defaults,
) {
  const snapshotId = env.GNR8_NATIVE_STUDIO_BUILD_SNAPSHOT ?? '';
  if (!client || typeof sourceId !== 'string' || !SHA.test(sourceId) ||
      !/^snap_[A-Za-z0-9]+$/.test(snapshotId))
    throw Error('native_studio_sandbox_build_not_configured');
  const snapshot = await deps.snapshot({ snapshotId });
  if (snapshot.status !== 'created' ||
      (snapshot.expiresAt && snapshot.expiresAt.getTime() <= Date.now() + 30 * 60_000))
    throw Error('native_studio_sandbox_build_snapshot_unavailable');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const prepared = await deps.source({ store, sourceId, site });
  const result = await deps.build({ siteId: scope.siteId, sourceId,
    snapshotId, files: prepared.files, store });
  let current;
  try { current = await deps.site(scope, client, env); }
  catch {
    if (result.state === 'complete')
      await rm(result.artifactDir, { recursive: true, force: true });
    throw Error('native_studio_sandbox_build_target_unavailable');
  }
  if (JSON.stringify(current) !== JSON.stringify(site)) {
    if (result.state === 'complete')
      await rm(result.artifactDir, { recursive: true, force: true });
    throw Error('native_studio_sandbox_build_target_changed');
  }
  return result;
}
