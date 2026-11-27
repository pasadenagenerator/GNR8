import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import type { NativeStudioScope } from './native-studio-binding-store';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { inspectGitHubNativeStudioHead } from './github-native-studio-head';
import { assertNativeStudioGitHubTokenCompatible } from './native-studio-upstream-github-compatibility';

type Environment = Record<string, string | undefined>;
const defaults = { site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  head: inspectGitHubNativeStudioHead };

/** Fresh, repository-scoped read token for the final deploy head gate. */
export async function inspectConfiguredNativeStudioGitHubHead(
  scope: NativeStudioScope, client: SupabaseClient,
  env: Environment = process.env, transport: typeof fetch = fetch,
  deps = defaults,
) {
  const site = await deps.site(scope, client, env);
  const credential = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (credential.repositoryId !== site.repositoryId)
    throw Error('native_studio_configured_github_head_unverified');
  assertNativeStudioGitHubTokenCompatible(credential.token);
  const head = await deps.head(site, credential.token, transport);
  if (head.repositoryId !== site.repositoryId || head.branch !== site.branch)
    throw Error('native_studio_configured_github_head_unverified');
  const current = await deps.site(scope, client, env);
  if (JSON.stringify(current) !== JSON.stringify(site))
    throw Error('native_studio_configured_github_head_target_changed');
  return head;
}
