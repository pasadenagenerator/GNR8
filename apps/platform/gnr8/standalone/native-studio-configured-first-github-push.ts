import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyStudioBuildHandoff } from '../../../../scripts/stacki/build-handoff.mjs';
import { pushVerifiedStudioCommit,
  runFirstStudioGitHubPush } from '../../../../scripts/stacki/first-studio-github-push.mjs';
import { verifyCommittedStudioSource } from '../../../../scripts/stacki/prepare-git-branch.mjs';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;

/** Trusted job entry point after the untrusted build has ended. The stored
 * handoff is verified before the central App key is used. No site build runs
 * while the installation token exists in this job.
 */
export async function configuredFirstStudioGitHubPush(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim'>;
  project: string; sourceId: string; commit: string;
  workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch) {
  const { scope, client, store, project, sourceId, commit, workerId, trustedGit } = input;
  const site = await configuredNativeStudioBootstrapSite(scope, client, env);
  await verifyStudioBuildHandoff({ project, store, sourceId, commit,
    site, scope, workerId });
  const credential = await issueConfiguredNativeStudioGitHubToken(
    scope, client, env, transport);
  return runFirstStudioGitHubPush({ project, store, sourceId, site, scope,
    credential: credential.token, trustedGit }, {
      verifySource: verifyCommittedStudioSource,
      readSite: () => configuredNativeStudioBootstrapSite(scope, client, env),
      inspectRemote: (target: typeof site, token: string) =>
        inspectGitHubNativeStudioBranch(target, token, transport, true),
      transfer: pushVerifiedStudioCommit,
    });
}
