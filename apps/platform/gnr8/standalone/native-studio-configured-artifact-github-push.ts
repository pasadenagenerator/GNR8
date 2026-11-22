import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareStudioBuildArtifactGitCommit } from '../../../../scripts/stacki/build-artifact-git-commit.mjs';
import { publishStudioBuildArtifactGit } from '../../../../scripts/stacki/build-artifact-github-push.mjs';
import { pushVerifiedStudioCommit,
  verifyStudioCommitParent } from '../../../../scripts/stacki/first-studio-github-push.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const defaults = { site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  head: inspectGitHubNativeStudioBranch,
  prepare: prepareStudioBuildArtifactGitCommit,
  publish: publishStudioBuildArtifactGit,
  verifyParent: verifyStudioCommitParent,
  transfer: pushVerifiedStudioCommit };

/** The build ref is separate from Stacki's editable source branch. Only the
 * exact bound repository receives a short-lived contents:write credential.
 */
export async function configuredNativeStudioArtifactGitHubPush(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim'>;
  project: string; sourceId: string; sourceCommit: string;
  workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, store, project, sourceId, sourceCommit,
    workerId, trustedGit } = input;
  const site = await deps.site(scope, client, env);
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'write');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_build_git_push_repository_changed');
  return deps.publish({ project, store, scope, site, sourceId,
    sourceCommit, workerId, credential: issued.token, trustedGit }, {
      readSite: () => deps.site(scope, client, env),
      inspectRemote: (artifactSite: typeof site, credential: string) =>
        deps.head(artifactSite, credential, transport),
      prepare: deps.prepare,
      verifyParent: deps.verifyParent,
      transfer: deps.transfer,
    });
}
