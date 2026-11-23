import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { readNativeStudioBindingForScope, type NativeStudioScope } from './native-studio-binding-store';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { SupabasePublicationStore, type PublicationStore } from './publication-store';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { inspectBoundCloudflarePublicStudioGateway } from './cloudflare-public-studio-gateway';
import { inspectGitHubNativeStudioHead } from './github-native-studio-head';
import { assertNativeStudioGitHubTokenCompatible } from './native-studio-upstream-github-compatibility';
import { verifyPublicStudioEntry } from '../../../../scripts/stacki/verify-studio-health.mjs';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectBoundNativeStudioAccessEntry } from './native-studio-access-entry';

const KEY = 'native-studio/first-open-v1.json';
const HANDOFF = 'native-studio/build-handoff-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TAG = /^gnr8-first-[a-f0-9]{64}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const APP_INTENT = 'native-studio/access-app-create-intent-v1.json';
const APP_BOUND = 'native-studio/access-app-bound-v1.json';
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Site = Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
type Receipt = { scope: NativeStudioScope; target: {
  siteId: string; repository: string; repositoryId: string; branch: string;
  studioOrigin: string; accountId: string;
}; sourceId: string; commit: string; tag: string;
  studioWorkerId: string; studioVersionId: string;
  publicWorkerId: string; publicVersionId: string; domainId: string;
  verifiedAt: string };

function target(site: Site): Receipt['target'] {
  return { siteId: site.siteId, repository: site.repository,
    repositoryId: site.repositoryId, branch: site.branch,
    studioOrigin: site.studioOrigin, accountId: site.accountId };
}

function validReceipt(value: unknown, scope: NativeStudioScope, site: Site): value is Receipt {
  if (!object(value) || !same(value.scope, scope) || !same(value.target, target(site)) ||
      !SHA.test(value.sourceId as string) || !COMMIT.test(value.commit as string) ||
      !TAG.test(value.tag as string) || !HEX32.test(value.studioWorkerId as string) ||
      !HEX32.test(value.publicWorkerId as string) ||
      !UUID.test(value.studioVersionId as string) ||
      !UUID.test(value.publicVersionId as string) ||
      !HEX32.test(value.domainId as string) ||
      typeof value.verifiedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.verifiedAt)) ||
      Date.parse(value.verifiedAt) > Date.now()) return false;
  return true;
}

const defaults = {
  site: configuredNativeStudioBootstrapSite,
  studio: inspectBoundCloudflareStudioFirstDeployment,
  gateway: inspectBoundCloudflarePublicStudioGateway,
  entry: verifyPublicStudioEntry,
  githubHead: inspectGitHubNativeStudioHead,
  source: readStoredVerifiedAstroStudio,
  candidates: readCurrentNativeStudioAccessCandidates,
  accessEntry: inspectBoundNativeStudioAccessEntry,
};

/** Run only after an isolated first deployment and a verified Git/build handoff.
 * This permits native first sign-in; it does not certify the editor or write
 * the final ready binding. No provider mutation occurs here.
 */
export async function recordNativeStudioFirstOpen(input: {
  scope: NativeStudioScope; client: SupabaseClient; store: Pick<PublicationStore, 'read' | 'claim' | 'getBytes'>;
  sourceId: string; commit: string; tag: string;
  publicTag?: string;
  studioWorkerId: string; publicWorkerId: string;
  studioCredential: string; publicCredential: string; githubCredential: string;
  accessZoneId?: string; accessCredential?: string;
}, deps = defaults) {
  const { scope, client, store, sourceId, commit, tag, publicTag,
    studioWorkerId, publicWorkerId, studioCredential, publicCredential,
    githubCredential } = input;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !client || !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || !SHA.test(sourceId) || !COMMIT.test(commit) ||
      !TAG.test(tag) ||
      (publicTag !== undefined &&
        !/^gnr8-public-first-[a-f0-9]{64}$/.test(publicTag)) ||
      !HEX32.test(studioWorkerId) || !HEX32.test(publicWorkerId) ||
      typeof githubCredential !== 'string' || !githubCredential)
    throw Error('native_studio_first_open_input_invalid');
  assertNativeStudioGitHubTokenCompatible(githubCredential);
  const site = await deps.site(scope, client);
  const built = await store.read<Record<string, unknown>>(HANDOFF);
  if (!object(built) || built.sourceId !== sourceId || built.commit !== commit ||
      !same(built.scope, scope) || built.workerId !== studioWorkerId ||
      !same(built.site, { siteId: site.siteId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin, accountId: site.accountId }) ||
      !Array.isArray(built.files) || !built.files.length)
    throw Error('native_studio_first_open_source_unverified');
  const source = await deps.source({ store, sourceId, site });
  if (source.receipt.identitySha256 !== sourceId ||
      !['gnr8-native-studio-source:v1', 'gnr8-native-studio-source:v2']
        .includes(source.receipt.format))
    throw Error('native_studio_first_open_source_unverified');
  const access = source.receipt.format === 'gnr8-native-studio-source:v2'
    ? source.receipt.access : null;
  if (source.receipt.format === 'gnr8-native-studio-source:v2' && !object(access))
    throw Error('native_studio_first_open_source_unverified');
  if (access) {
    if (!HEX32.test(input.accessZoneId ?? '') ||
        typeof input.accessCredential !== 'string' || !input.accessCredential)
      throw Error('native_studio_first_open_access_unconfigured');
    const [intent, bound, before] = await Promise.all([
      store.read<Record<string, unknown>>(APP_INTENT),
      store.read<Record<string, unknown>>(APP_BOUND),
      deps.candidates(scope, client),
    ]);
    const expectedAdmins = before.map(member => member.principal).sort();
    const domain = new URL(site.studioOrigin).hostname;
    if (!object(access) || access.version !== 2 || access.provider !== 'access' ||
        !Array.isArray(access.admins) || !same(access.admins, expectedAdmins) ||
        !object(intent) || !object(intent.target) || !same(intent.target.scope, scope) ||
        intent.target.accountId !== site.accountId ||
        intent.target.studioOrigin !== site.studioOrigin ||
        intent.target.repository !== site.repository ||
        String(intent.target.repositoryId) !== site.repositoryId ||
        intent.zoneId !== input.accessZoneId ||
        intent.name !== `gnr8-${scope.siteId}-studio-access` ||
        intent.domain !== `${domain}/studio` ||
        !object(bound) || bound.identity !== intent.identity ||
        typeof bound.appId !== 'string' || !APP_ID.test(bound.appId) ||
        bound.aud !== access.aud || bound.teamDomain !== access.teamDomain)
      throw Error('native_studio_first_open_access_unverified');
    const entry = await deps.accessEntry({ scope, client, accountId: site.accountId,
      zoneId: input.accessZoneId!, appId: bound.appId,
      credential: input.accessCredential! });
    const after = await deps.candidates(scope, client);
    if (entry.state !== 'observed-access-entry' || entry.appId !== bound.appId ||
        entry.aud !== access.aud || entry.teamDomain !== access.teamDomain ||
        entry.studioOrigin !== site.studioOrigin ||
        entry.memberCount !== expectedAdmins.length ||
        !same(after.map(member => member.principal).sort(), expectedAdmins))
      throw Error('native_studio_first_open_access_unverified');
  }
  const [studio, publicSite, entry, githubHead] = await Promise.all([
    deps.studio(scope, client, site.accountId, studioWorkerId,
      studioCredential, fetch, tag, true, { store, sourceId, site }),
    deps.gateway(scope, client, site.accountId, publicWorkerId,
      publicCredential, fetch, publicTag),
    access ? Promise.resolve({ state: 'access-studio-challenge-observed' as const,
      studioOrigin: site.studioOrigin }) : deps.entry({ studioOrigin: site.studioOrigin }),
    deps.githubHead(site, githubCredential),
  ]);
  if (studio.state !== 'verified-source-control-plane' ||
      studio.workerId !== studioWorkerId || !UUID.test(studio.versionId) ||
      publicSite.state !== 'observed-control-plane' ||
      publicSite.workerId !== publicWorkerId || !UUID.test(publicSite.versionId) ||
      !HEX32.test(publicSite.domainId) ||
      entry.state !== (access ? 'access-studio-challenge-observed' : 'public-studio-entry-healthy') ||
      entry.studioOrigin !== site.studioOrigin ||
      githubHead.repositoryId !== site.repositoryId ||
      githubHead.branch !== site.branch || githubHead.commit !== commit)
    throw Error('native_studio_first_open_unverified');
  const current = await deps.site(scope, client);
  if (!same(target(current), target(site)))
    throw Error('native_studio_first_open_target_changed');
  const receipt: Receipt = { scope, target: target(site), sourceId, commit, tag,
    studioWorkerId, studioVersionId: studio.versionId,
    publicWorkerId, publicVersionId: publicSite.versionId,
    domainId: publicSite.domainId, verifiedAt: new Date().toISOString() };
  const previous = await store.read<Receipt>(KEY);
  if (previous) {
    const { verifiedAt: _oldTime, ...old } = previous;
    const { verifiedAt: _newTime, ...fresh } = receipt;
    if (!validReceipt(previous, scope, site) || !same(old, fresh))
      throw Error('native_studio_first_open_conflict');
    return previous;
  }
  await store.claim(KEY, receipt);
  const saved = await store.read<Receipt>(KEY);
  if (!saved || !same(saved, receipt)) throw Error('native_studio_first_open_conflict');
  return saved;
}

/** Ready bindings retain precedence. A first-open receipt permits only a
 * clearly labelled native sign-in link, never a fully ready claim.
 */
export async function readNativeStudioLaunchForScope(scope: NativeStudioScope,
  client: SupabaseClient | null = getSupabaseServiceRoleClient(),
  env: Record<string, string | undefined> = process.env,
  deps: Pick<typeof defaults, 'site'> & {
    store: (client: SupabaseClient, scope: NativeStudioScope) => Pick<PublicationStore, 'read'>;
    ready: typeof readNativeStudioBindingForScope;
  } = { site: configuredNativeStudioBootstrapSite,
    store: (db, targetScope) => new SupabasePublicationStore(db,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', targetScope),
    ready: readNativeStudioBindingForScope }) {
  if (!client) return null;
  try {
    const ready = await deps.ready(scope, client, env.GNR8_NATIVE_STUDIO_SITES);
    return { kind: 'ready' as const, url: `${ready.studioOrigin}/studio` };
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'native_studio_binding_missing')
      return null;
  }
  if (env.GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED !== '1') return null;
  try {
    const site = await deps.site(scope, client, env);
    const receipt = await deps.store(client, scope).read<Receipt>(KEY);
    if (!validReceipt(receipt, scope, site)) return null;
    return { kind: 'first-open' as const, url: `${site.studioOrigin}/studio` };
  } catch { return null; }
}
