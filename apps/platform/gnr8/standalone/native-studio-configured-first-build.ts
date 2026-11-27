import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { disposeVerifiedStudioCheckout } from '../../../../scripts/stacki/verified-studio-checkout.mjs';
import { configuredNativeStudioArtifactGitHubPush } from './native-studio-configured-artifact-github-push';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioBuildHandoff } from './native-studio-configured-build-handoff';
import { configuredFirstStudioGitHubPush } from './native-studio-configured-first-github-push';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioSourceCheckout } from './native-studio-configured-source-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  checkout: configuredNativeStudioSourceCheckout,
  build: configuredNativeStudioBuildHandoff,
  push: configuredFirstStudioGitHubPush,
  artifactPush: configuredNativeStudioArtifactGitHubPush,
  dispose: disposeVerifiedStudioCheckout,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** Trusted predeployment stage. Both the editable source and artifact-only
 * build ref are durable in the exact site repository before checkout cleanup.
 */
export async function configuredNativeStudioFirstBuild(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  trustedGit: string; author: { name: string; email: string };
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, trustedGit, author } = input;
  if (!scope || !client || !SHA.test(sourceId) || !trustedGit || !author)
    throw Error('native_studio_first_build_input_invalid');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  // Site import and confirmed-source preparation can finish in either order.
  // An absent reservation can be observed later without opening a checkout;
  // a present but mismatched receipt must never be treated as temporary.
  if (!reserved) throw Error('native_studio_first_build_resources_pending');
  const workerId = reserved?.workers?.studio?.id;
  if (!workerId || !HEX32.test(workerId) ||
      reserved.target?.scope?.siteId !== scope.siteId ||
      reserved.target?.repository !== site.repository ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.studioOrigin !== site.studioOrigin ||
      String(reserved.target?.repositoryId) !== site.repositoryId)
    throw Error('native_studio_first_build_resources_unverified');
  const checkout = await deps.checkout({ scope, client, sourceId,
    trustedGit, author }, env, transport);
  try {
    const built = await deps.build({ scope, client, project: checkout.project,
      sourceId, commit: checkout.commit, workerId }, env);
    if (!built || typeof built !== 'object')
      throw Error('native_studio_first_build_handoff_invalid');
    if ('state' in built && built.state !== 'complete') return built;
    if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
      throw Error('native_studio_first_build_target_changed');
    const pushed = await deps.push({ scope, client, store,
      project: checkout.project, sourceId, commit: checkout.commit,
      workerId, trustedGit }, env, transport);
    if (pushed.state !== 'verified' || pushed.commit !== checkout.commit)
      throw Error('native_studio_first_build_push_pending');
    const artifact = await deps.artifactPush({ scope, client, store,
      project: checkout.project, sourceId, sourceCommit: checkout.commit,
      workerId, trustedGit }, env, transport);
    if (artifact.state !== 'verified' || artifact.sourceCommit !== checkout.commit)
      throw Error('native_studio_first_build_artifact_pending');
    return { sourceId, commit: checkout.commit, workerId,
      artifactBranch: artifact.branch, artifactCommit: artifact.commit };
  } finally {
    await deps.dispose(checkout.root);
  }
}
