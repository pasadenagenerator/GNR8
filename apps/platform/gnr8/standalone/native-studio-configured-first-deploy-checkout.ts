import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { disposeVerifiedStudioCheckout } from '../../../../scripts/stacki/verified-studio-checkout.mjs';
import { materializeStudioImageSite } from '../../../../scripts/stacki/materialize-studio-image-site.mjs';
import { configuredNativeStudioArtifactGitHubRestore } from './native-studio-configured-artifact-github-restore';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioDeploymentCheckout } from './native-studio-configured-source-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  checkout: configuredNativeStudioDeploymentCheckout,
  restore: configuredNativeStudioArtifactGitHubRestore,
  materialize: materializeStudioImageSite,
  dispose: disposeVerifiedStudioCheckout,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

/** Hold a fresh, verified checkout only while the trusted deploy stage uses it.
 * No build command or Cloudflare credential is used in this transfer stage.
 */
export async function withConfiguredNativeStudioFirstDeployCheckout<T>(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
}, use: (prepared: { project: string; store: SupabasePublicationStore;
  site: Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
  sourceId: string; commit: string; workerId: string; files: number }) => Promise<T>,
env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults): Promise<T> {
  const { scope, client, sourceId, sourceCommit, workerId, trustedGit } = input ?? {};
  if (!scope || !client || !SHA.test(sourceId) ||
      !COMMIT.test(sourceCommit) || !HEX32.test(workerId) ||
      typeof trustedGit !== 'string' || !trustedGit ||
      typeof use !== 'function')
    throw Error('native_studio_deploy_checkout_input_invalid');
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
    throw Error('native_studio_deploy_checkout_resources_unverified');
  const checkout = await deps.checkout({ scope, client, sourceId, trustedGit },
    env, transport);
  try {
    if (checkout.commit !== sourceCommit)
      throw Error('native_studio_deploy_checkout_source_changed');
    const restored = await deps.restore({ scope, client,
      project: checkout.project, sourceId, sourceCommit, workerId, trustedGit },
    env, transport);
    if (!restored || restored.sourceId !== sourceId ||
        restored.commit !== sourceCommit ||
        !Number.isSafeInteger(restored.files) || restored.files < 2)
      throw Error('native_studio_deploy_checkout_artifact_unverified');
    const image = await deps.materialize({ project: checkout.project, store,
      sourceId, commit: sourceCommit, site });
    if (image.sourceId !== sourceId || image.commit !== sourceCommit ||
        image.files !== 2)
      throw Error('native_studio_deploy_checkout_image_unverified');
    if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
      throw Error('native_studio_deploy_checkout_target_changed');
    return await use({ project: checkout.project, store, site,
      sourceId, commit: sourceCommit, workerId, files: restored.files });
  } finally {
    await deps.dispose(checkout.root);
  }
}
