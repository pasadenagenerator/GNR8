import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { restoreStudioBuildArtifactGit } from '../../../../scripts/stacki/build-artifact-github-restore.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  head: inspectGitHubNativeStudioBranch,
  restore: restoreStudioBuildArtifactGit,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** Read the exact artifact branch with a repository-scoped read token. */
export async function configuredNativeStudioArtifactGitHubRestore(input: {
  scope: NativeStudioScope; client: SupabaseClient; project: string;
  sourceId: string; sourceCommit: string; workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, project, sourceId, sourceCommit, workerId,
    trustedGit } = input;
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const intent = await store.read('native-studio/build-artifact-github-push-v1.json') as
    Record<string, unknown> | null;
  const branch = `gnr8-build-${sourceCommit}`;
  if (!intent || intent.sourceId !== sourceId ||
      intent.sourceCommit !== sourceCommit || intent.workerId !== workerId ||
      intent.branch !== branch || typeof intent.artifactCommit !== 'string')
    throw Error('native_studio_build_git_restore_receipt_conflict');
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_build_git_restore_repository_changed');
  const head = await deps.head({ ...site, branch }, issued.token, transport);
  if (head.repositoryId !== site.repositoryId || head.branch !== branch ||
      head.commit !== intent.artifactCommit)
    throw Error('native_studio_build_git_restore_remote_changed');
  if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_build_git_restore_target_changed');
  const result = await deps.restore({ project, store, scope, site, sourceId,
    sourceCommit, workerId, credential: issued.token, trustedGit });
  if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_build_git_restore_target_changed');
  return result;
}
