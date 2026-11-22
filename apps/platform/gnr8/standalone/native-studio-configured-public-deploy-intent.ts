import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { inspectCloudflarePublicStudioGatewayVacancy } from './cloudflare-public-studio-gateway';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const STUDIO_INTENT = 'native-studio/first-deploy-intent-v1.json';
const STUDIO_ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
export const PUBLIC_INTENT = 'native-studio/first-public-deploy-intent-v1.json';
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = { withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  site: configuredNativeStudioBootstrapSite,
  credentials: configuredNativeStudioDeploymentCredentials,
  studio: inspectBoundCloudflareStudioFirstDeployment,
  vacancy: inspectCloudflarePublicStudioGatewayVacancy };

/** Bind the first public-domain deploy to the verified source and a live
 * Studio version. This claims an intent only; the deploy job must recheck.
 */
export async function prepareConfiguredNativeStudioPublicDeployIntent(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  return deps.withCheckout(input, async prepared => {
    const reserved = await prepared.store.read<NativeStudioResourceReceipt>(
      NATIVE_STUDIO_RESOURCE_RECEIPT);
    const publicWorkerId = reserved?.workers?.publicSite?.id;
    if (!HEX32.test(publicWorkerId ?? '') ||
        reserved?.workers?.publicSite?.worker !==
          `gnr8-${input.scope.siteId}-site`)
      throw Error('native_studio_public_deploy_resources_unverified');
    const { cloudflareCredential, secrets } = await deps.credentials(
      input.scope, prepared.store, prepared.site.accountId, env);
    const studio = firstStudioDeployIdentity({ scope: input.scope,
      accountId: prepared.site.accountId, workerId: prepared.workerId,
      sourceId: prepared.sourceId, site: prepared.site,
      token: cloudflareCredential, secrets, commit: prepared.commit });
    const [intent, attempt] = await Promise.all([
      prepared.store.read<{ identity: string; commit: string }>(STUDIO_INTENT),
      prepared.store.read<{ identity: string; commit: string }>(STUDIO_ATTEMPT),
    ]);
    if (intent?.identity !== studio.identity ||
        intent.commit !== prepared.commit ||
        attempt?.identity !== studio.identity ||
        attempt.commit !== prepared.commit)
      throw Error('native_studio_public_deploy_studio_unverified');
    const active = await deps.studio(input.scope, input.client,
      prepared.site.accountId, prepared.workerId, cloudflareCredential,
      transport, studio.tag, true);
    if (active.state !== 'verified-source-control-plane' ||
        active.workerId !== prepared.workerId)
      throw Error('native_studio_public_deploy_studio_unverified');
    const domain = new URL(prepared.site.studioOrigin).hostname;
    const vacant = await deps.vacancy(input.scope, prepared.site.accountId,
      publicWorkerId!, domain, cloudflareCredential, transport);
    if (vacant.state !== 'vacant' || vacant.workerId !== publicWorkerId ||
        vacant.domain !== domain ||
        JSON.stringify(await deps.site(input.scope, input.client, env)) !==
          JSON.stringify(prepared.site))
      throw Error('native_studio_public_deploy_target_changed');
    const receipt = { identity: fingerprint({ scope: input.scope,
      accountId: prepared.site.accountId, sourceId: prepared.sourceId,
      commit: prepared.commit, publicWorkerId,
      studioTag: studio.tag, domain, repository: prepared.site.repository }),
    commit: prepared.commit, publicWorkerId };
    const previous = await prepared.store.read<typeof receipt>(PUBLIC_INTENT);
    if (previous && JSON.stringify(previous) !== JSON.stringify(receipt))
      throw Error('native_studio_public_deploy_intent_conflict');
    if (!previous) await prepared.store.claim(PUBLIC_INTENT, receipt);
    if (JSON.stringify(await prepared.store.read(PUBLIC_INTENT)) !==
        JSON.stringify(receipt))
      throw Error('native_studio_public_deploy_intent_conflict');
    return { state: 'prepared' as const, sourceId: prepared.sourceId,
      commit: prepared.commit, publicWorkerId, studioTag: studio.tag };
  }, env, transport);
}
