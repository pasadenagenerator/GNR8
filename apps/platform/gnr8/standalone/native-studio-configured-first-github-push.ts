import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyStudioBuildHandoff } from '../../../../scripts/stacki/build-handoff.mjs';
import { pushVerifiedStudioCommit,
  runFirstStudioGitHubPush,
  verifyStudioCommitParent } from '../../../../scripts/stacki/first-studio-github-push.mjs';
import { verifyCommittedStudioSource } from '../../../../scripts/stacki/prepare-git-branch.mjs';
import { verifyNativeAccessRoleFreshness } from '../../../../scripts/stacki/native-access-role-freshness.mjs';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { assertNativeStudioGitHubTokenCompatible } from './native-studio-upstream-github-compatibility';
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
  let vars: Record<string, unknown>;
  try {
    const config = JSON.parse(await readFile(join(project, 'studio/cloudflare/wrangler.jsonc'), 'utf8'));
    if (!config || typeof config !== 'object' || !config.vars ||
        typeof config.vars !== 'object' || Array.isArray(config.vars)) throw Error();
    vars = config.vars;
  } catch { throw Error('native_studio_push_auth_config_invalid'); }
  const access = vars.AUTH_PROVIDER === 'access';
  if (access ? (vars.EDITOR_ACCESS !== 'roles' ||
      typeof vars.ACCESS_TEAM_DOMAIN !== 'string' || !vars.ACCESS_TEAM_DOMAIN ||
      typeof vars.ACCESS_AUD !== 'string' || !vars.ACCESS_AUD ||
      typeof vars.AUTH_BOOTSTRAP_ADMIN !== 'string') :
    (vars.EDITOR_ACCESS !== 'repository' ||
      ![undefined, 'github'].includes(vars.AUTH_PROVIDER as string | undefined)))
    throw Error('native_studio_push_auth_config_invalid');
  const verifyAccess = access ? async () => {
    const candidates = await readCurrentNativeStudioAccessCandidates(scope, client);
    const principals = candidates.map(candidate => candidate.principal);
    if (!principals.some(principal => principal === vars.AUTH_BOOTSTRAP_ADMIN))
      throw Error('native_studio_push_auth_config_invalid');
    await verifyNativeAccessRoleFreshness({ project, principals });
    // The workspace check alone cannot bind the role file to the exact commit.
    await verifyCommittedStudioSource({ project, store, sourceId, site,
      allowBuildOutputs: true });
  } : undefined;
  if (verifyAccess) await verifyAccess();
  const credential = await issueConfiguredNativeStudioGitHubToken(
    scope, client, env, transport);
  assertNativeStudioGitHubTokenCompatible(credential.token);
  return runFirstStudioGitHubPush({ project, store, sourceId, site, scope,
    credential: credential.token, trustedGit }, {
      verifySource: verifyCommittedStudioSource,
      verifyParent: verifyStudioCommitParent,
      readSite: () => configuredNativeStudioBootstrapSite(scope, client, env),
      inspectRemote: (target: typeof site, token: string) =>
        inspectGitHubNativeStudioBranch(target, token, transport, true),
      verifyAccess,
      transfer: pushVerifiedStudioCommit,
    });
}
