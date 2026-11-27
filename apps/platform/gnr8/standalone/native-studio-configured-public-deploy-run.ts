import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { inspectBoundCloudflarePublicStudioGateway } from './cloudflare-public-studio-gateway';
import { inspectCloudflareSiteBuildPublicationSeparation } from
  './cloudflare-site-build-configuration';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { runTrustedNativeStudioPublicDeploy } from './native-studio-trusted-public-deploy';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const ATTEMPT = 'native-studio/first-public-deploy-attempt-v1.json';
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = { withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  credentials: configuredNativeStudioDeploymentCredentials,
  deploy: runTrustedNativeStudioPublicDeploy,
  inspect: inspectBoundCloudflarePublicStudioGateway,
  buildSeparation: inspectCloudflareSiteBuildPublicationSeparation };

/** Consume a separately prepared public intent in one trusted deployment job.
 * Reconcile an ambiguous response from the tagged active version, never retry.
 */
export async function runConfiguredNativeStudioPublicDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
  trustedWrangler: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { trustedWrangler, ...checkoutInput } = input ?? {};
  if (typeof trustedWrangler !== 'string' || !trustedWrangler)
    throw Error('native_studio_public_deploy_input_invalid');
  return deps.withCheckout(checkoutInput, async prepared => {
    const reserved = await prepared.store.read<NativeStudioResourceReceipt>(
      NATIVE_STUDIO_RESOURCE_RECEIPT);
    const publicWorkerId = reserved?.workers?.publicSite?.id;
    if (!HEX32.test(publicWorkerId ?? '') ||
        reserved?.workers?.publicSite?.worker !==
          `gnr8-${checkoutInput.scope.siteId}-site`)
      throw Error('native_studio_public_deploy_resources_unverified');
    const { cloudflareCredential, secrets } = await deps.credentials(
      checkoutInput.scope, prepared.store, prepared.site.accountId, env);
    const studioTag = firstStudioDeployIdentity({ scope: checkoutInput.scope,
      accountId: prepared.site.accountId, workerId: prepared.workerId,
      sourceId: prepared.sourceId, site: prepared.site,
      token: cloudflareCredential, secrets, commit: prepared.commit }).tag;
    const domain = new URL(prepared.site.studioOrigin).hostname;
    const receipt = { identity: fingerprint({ scope: checkoutInput.scope,
      accountId: prepared.site.accountId, sourceId: prepared.sourceId,
      commit: prepared.commit, publicWorkerId,
      studioTag, domain, repository: prepared.site.repository }),
    commit: prepared.commit, publicWorkerId };
    if (JSON.stringify(await prepared.store.read(PUBLIC_INTENT)) !==
        JSON.stringify(receipt))
      throw Error('native_studio_public_deploy_intent_unverified');
    const tag = `gnr8-public-first-${receipt.identity}`;
    const observe = async () => {
      let result;
      try {
        result = await deps.inspect(checkoutInput.scope, checkoutInput.client,
          prepared.site.accountId, publicWorkerId!, cloudflareCredential,
          transport, tag);
      } catch (error) {
        if (!(error instanceof Error) ||
            error.message !== 'native_studio_public_gateway_provider_unavailable')
          throw error;
        return { state: 'pending-review' as const, commit: prepared.commit,
          observation: 'readback-unavailable' };
      }
      return { state: result.state === 'observed-control-plane'
        ? 'first-open-required' as const : 'pending-review' as const,
        commit: prepared.commit, observation: result.state };
    };
    const previous = await prepared.store.read(ATTEMPT);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(receipt))
        throw Error('native_studio_public_deploy_attempt_conflict');
      return observe();
    }
    const buildsUserCredential =
      env.GNR8_NATIVE_STUDIO_CLOUDFLARE_BUILDS_USER_TOKEN ?? '';
    if (!/^[A-Za-z0-9_-]{40,80}$/.test(buildsUserCredential))
      throw Error('native_studio_public_deploy_build_separation_unconfigured');
    await deps.buildSeparation({ scope: checkoutInput.scope,
      accountId: prepared.site.accountId,
      repository: prepared.site.repository,
      repositoryId: prepared.site.repositoryId,
      branch: prepared.site.branch }, buildsUserCredential, transport);
    try {
      await deps.deploy({ scope: checkoutInput.scope, client: checkoutInput.client,
        store: prepared.store, project: prepared.project,
        sourceId: prepared.sourceId, commit: prepared.commit,
        studioWorkerId: prepared.workerId, publicWorkerId: publicWorkerId!,
        studioTag, trustedWrangler, cloudflareCredential }, env, transport);
    } catch (error) {
      if (JSON.stringify(await prepared.store.read(ATTEMPT)) !==
          JSON.stringify(receipt)) throw error;
    }
    if (JSON.stringify(await prepared.store.read(ATTEMPT)) !==
        JSON.stringify(receipt))
      throw Error('native_studio_public_deploy_attempt_unverified');
    return observe();
  }, env, transport);
}
