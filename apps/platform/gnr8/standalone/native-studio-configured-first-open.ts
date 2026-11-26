import 'server-only';
import { configuredNativeStudioCloudflareCredential } from './native-studio-cloudflare-account-credential';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { recordNativeStudioFirstOpen } from './native-studio-first-open';
import { nativeStudioImageRecoveryStore } from './native-studio-image-recovery';
import { assertNativeStudioGitHubTokenCompatible } from './native-studio-upstream-github-compatibility';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';

type Environment = Record<string, string | undefined>;
const HANDOFF = 'native-studio/build-handoff-v1.json';
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const PUBLIC_INTENT = 'native-studio/first-public-deploy-intent-v1.json';
const PUBLIC_ATTEMPT = 'native-studio/first-public-deploy-attempt-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  credentials: configuredNativeStudioDeploymentCredentials,
  githubToken: issueConfiguredNativeStudioGitHubToken,
  record: recordNativeStudioFirstOpen,
};

/** Resolve all first-open inputs from durable site evidence and central keys.
 * This is read-only at providers; the recorder writes only a scoped receipt.
 */
export async function recordConfiguredNativeStudioFirstOpen(
  scope: NativeStudioScope,
  client: SupabaseClient,
  env: Environment = process.env,
  transport: typeof fetch = fetch,
  deps = defaults,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) || !client)
    throw Error('native_studio_configured_first_open_input_invalid');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const [reserved, built] = await Promise.all([
    store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT),
    store.read<{ scope: NativeStudioScope; site: unknown; sourceId: string;
      commit: string; workerId: string; files: unknown[] }>(HANDOFF),
  ]);
  const studioWorkerId = reserved?.workers?.studio?.id;
  const publicWorkerId = reserved?.workers?.publicSite?.id;
  if (JSON.stringify(reserved?.target?.scope) !== JSON.stringify(scope) ||
      reserved?.target?.accountId !== site.accountId ||
      reserved?.target?.repository !== site.repository ||
      String(reserved?.target?.repositoryId) !== site.repositoryId ||
      reserved?.target?.studioOrigin !== site.studioOrigin ||
      reserved?.draftBucket?.bucket !== `gnr8-${scope.siteId}-drafts` ||
      !HEX32.test(reserved?.draftBucket?.bucketId ?? '') ||
      reserved?.workers?.studio?.worker !== `gnr8-${scope.siteId}-studio` ||
      !HEX32.test(studioWorkerId ?? '') ||
      reserved?.workers?.publicSite?.worker !== `gnr8-${scope.siteId}-site` ||
      !HEX32.test(publicWorkerId ?? '') ||
      !built || JSON.stringify(built.scope) !== JSON.stringify(scope) ||
      !SHA.test(built.sourceId) || !COMMIT.test(built.commit) ||
      built.workerId !== studioWorkerId ||
      JSON.stringify(built.site) !== JSON.stringify({ siteId: site.siteId,
        repository: site.repository, branch: site.branch,
        studioOrigin: site.studioOrigin, accountId: site.accountId }) ||
      !Array.isArray(built.files) || built.files.length === 0)
    throw Error('native_studio_configured_first_open_evidence_unverified');
  const recoveredStore = await nativeStudioImageRecoveryStore(store, {
    scope, site, sourceId: built.sourceId, commit: built.commit,
    workerId: studioWorkerId!, buildSnapshotId:
      env.GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT ?? '',
  });
  const { cloudflareCredential, secrets } = await deps.credentials(scope,
    recoveredStore, site.accountId, env);
  const { identity, tag } = firstStudioDeployIdentity({ scope,
    accountId: site.accountId, workerId: studioWorkerId,
    sourceId: built.sourceId, site, token: cloudflareCredential,
    secrets, commit: built.commit });
  const [intent, attempt] = await Promise.all([
    recoveredStore.read<{ identity: string; commit: string }>(INTENT),
    recoveredStore.read<{ identity: string; commit: string }>(ATTEMPT),
  ]);
  if (intent?.identity !== identity || intent.commit !== built.commit ||
      attempt?.identity !== identity || attempt.commit !== built.commit)
    throw Error('native_studio_configured_first_open_deploy_unverified');
  const domain = new URL(site.studioOrigin).hostname;
  const publicReceipt = { identity: fingerprint({ scope,
    accountId: site.accountId, sourceId: built.sourceId,
    commit: built.commit, publicWorkerId, studioTag: tag,
    domain, repository: site.repository }),
  commit: built.commit, publicWorkerId };
  const [publicIntent, publicAttempt] = await Promise.all([
    recoveredStore.read(PUBLIC_INTENT), recoveredStore.read(PUBLIC_ATTEMPT),
  ]);
  if (JSON.stringify(publicIntent) !== JSON.stringify(publicReceipt) ||
      JSON.stringify(publicAttempt) !== JSON.stringify(publicReceipt))
    throw Error('native_studio_configured_first_open_public_unverified');
  const github = await deps.githubToken(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (github.repositoryId !== site.repositoryId)
    throw Error('native_studio_configured_first_open_github_unverified');
  assertNativeStudioGitHubTokenCompatible(github.token);
  if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_configured_first_open_target_changed');
  return deps.record({ scope, client, store: recoveredStore,
    sourceId: built.sourceId, commit: built.commit, tag,
    publicTag: `gnr8-public-first-${publicReceipt.identity}`,
    studioWorkerId: studioWorkerId!, publicWorkerId: publicWorkerId!,
    studioCredential: cloudflareCredential,
    publicCredential: cloudflareCredential,
    githubCredential: github.token,
    accessZoneId: env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID,
    accessCredential: configuredNativeStudioCloudflareCredential(env, 'ACCESS_MANAGER') });
}
