import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { disposeVerifiedStudioCheckout,
  prepareVerifiedStudioCheckout } from '../../../../scripts/stacki/verified-studio-checkout.mjs';
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
  checkout: prepareVerifiedStudioCheckout,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** Read-only GitHub access prepares the first source commit. The returned
 * checkout is credential-free and must be removed by its trusted caller.
 */
export async function configuredNativeStudioSourceCheckout(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  trustedGit: string; author: { name: string; email: string };
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, trustedGit, author } = input;
  const site = await deps.site(scope, client, env);
  const token = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (token.repositoryId !== site.repositoryId)
    throw Error('native_studio_checkout_repository_changed');
  const head = await deps.head(site, token.token, transport, true);
  if (head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== null ||
      typeof head.baseCommit !== 'string')
    throw Error('native_studio_checkout_branch_conflict');
  if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_checkout_target_changed');
  const store = deps.store(client, scope, env);
  const prepared = await deps.checkout({ site, sourceId,
    baseCommit: head.baseCommit, store, credential: token.token,
    trustedGit, author });
  try {
    if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
      throw Error('native_studio_checkout_target_changed');
    return prepared;
  } catch (error) {
    await disposeVerifiedStudioCheckout(prepared.root);
    throw error;
  }
}

/** Recover the exact source commit in a fresh deployment job. */
export async function configuredNativeStudioDeploymentCheckout(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, trustedGit } = input;
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const intent = await store.read('native-studio/first-github-push-intent-v1.json') as
    Record<string, unknown> | null;
  if (!intent || typeof intent.commit !== 'string' ||
      typeof intent.baseCommit !== 'string')
    throw Error('native_studio_deploy_source_intent_missing');
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_deploy_repository_changed');
  const head = await deps.head(site, issued.token, transport);
  if (head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== intent.commit)
    throw Error('native_studio_deploy_source_changed');
  if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_deploy_target_changed');
  const prepared = await deps.checkout({ site, sourceId,
    baseCommit: intent.baseCommit, existingCommit: intent.commit,
    store, credential: issued.token, trustedGit });
  try {
    if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
      throw Error('native_studio_deploy_target_changed');
    return { ...prepared, site, store };
  } catch (error) {
    await disposeVerifiedStudioCheckout(prepared.root);
    throw error;
  }
}
