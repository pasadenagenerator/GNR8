import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { inspectCloudflarePublicStudioGatewayVacancy } from './cloudflare-public-studio-gateway';
import { inspectConfiguredNativeStudioGitHubHead } from './native-studio-configured-github-head';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const STUDIO_INTENT = 'native-studio/first-deploy-intent-v1.json';
const STUDIO_ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const HEX32 = /^[a-f0-9]{32}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const defaults = { site: configuredNativeStudioBootstrapSite,
  credentials: configuredNativeStudioDeploymentCredentials,
  head: inspectConfiguredNativeStudioGitHubHead,
  studio: inspectBoundCloudflareStudioFirstDeployment,
  vacancy: inspectCloudflarePublicStudioGatewayVacancy };

/** Recheck GitHub head, live Studio and exact domain vacancy before the
 * public deployment attempt. No local Git checkout is involved. */
export async function prepareStoredNativeStudioPublicDeployIntent(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim' | 'getBytes'>;
  sourceId: string; commit: string; studioWorkerId: string;
  publicWorkerId: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, store, sourceId, commit,
    studioWorkerId, publicWorkerId } = input;
  const site = await deps.site(scope, client, env);
  const reservation = await store.read<NativeStudioResourceReceipt>(
    NATIVE_STUDIO_RESOURCE_RECEIPT);
  if (!HEX32.test(publicWorkerId) || !HEX32.test(studioWorkerId) ||
      reservation?.workers?.publicSite?.id !== publicWorkerId ||
      reservation?.workers?.publicSite?.worker !== `gnr8-${scope.siteId}-site` ||
      reservation?.workers?.studio?.id !== studioWorkerId ||
      reservation?.target?.accountId !== site.accountId ||
      reservation?.target?.repository !== site.repository ||
      String(reservation?.target?.repositoryId) !== site.repositoryId ||
      reservation?.target?.studioOrigin !== site.studioOrigin) throw Error(
        'native_studio_public_deploy_resources_unverified');
  const { cloudflareCredential, secrets } = await deps.credentials(
    scope, store, site.accountId, env);
  const studio = firstStudioDeployIdentity({ scope,
    accountId: site.accountId, workerId: studioWorkerId,
    sourceId, site, token: cloudflareCredential, secrets, commit });
  const [studioIntent, studioAttempt, head] = await Promise.all([
    store.read<{ identity: string; commit: string }>(STUDIO_INTENT),
    store.read<{ identity: string; commit: string }>(STUDIO_ATTEMPT),
    deps.head(scope, client, env, transport),
  ]);
  if (studioIntent?.identity !== studio.identity ||
      studioIntent.commit !== commit ||
      studioAttempt?.identity !== studio.identity ||
      studioAttempt.commit !== commit ||
      head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== commit) throw Error(
        'native_studio_public_deploy_studio_unverified');
  const active = await deps.studio(scope, client, site.accountId,
    studioWorkerId, cloudflareCredential, transport, studio.tag, true,
    { store, sourceId, site });
  if (active.state !== 'verified-source-control-plane' ||
      active.workerId !== studioWorkerId) throw Error(
        'native_studio_public_deploy_studio_unverified');
  const domain = new URL(site.studioOrigin).hostname;
  const vacant = await deps.vacancy(scope, site.accountId,
    publicWorkerId, domain, cloudflareCredential, transport);
  if (vacant.state !== 'vacant' || vacant.workerId !== publicWorkerId ||
      vacant.domain !== domain ||
      !same(await deps.site(scope, client, env), site)) throw Error(
        'native_studio_public_deploy_target_changed');
  const receipt = { identity: fingerprint({ scope,
    accountId: site.accountId, sourceId, commit, publicWorkerId,
    studioTag: studio.tag, domain, repository: site.repository }),
    commit, publicWorkerId };
  const prior = await store.read(PUBLIC_INTENT);
  if (prior && !same(prior, receipt)) throw Error(
    'native_studio_public_deploy_intent_conflict');
  if (!prior) await store.claim(PUBLIC_INTENT, receipt);
  if (!same(await store.read(PUBLIC_INTENT), receipt)) throw Error(
    'native_studio_public_deploy_intent_conflict');
  return { state: 'prepared' as const, sourceId, commit,
    publicWorkerId, studioTag: studio.tag };
}
