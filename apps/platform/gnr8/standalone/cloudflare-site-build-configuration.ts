import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';

const INTENT = 'native-studio/site-build-config-intent-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

export type SiteBuildTarget = Readonly<{
  scope: NativeStudioScope; accountId: string; githubOwner: string;
  githubOwnerId: number; repository: string; repositoryId: number;
  branch: string; buildTokenUuid: string;
}>;

function assertTarget(target: SiteBuildTarget) {
  const { scope } = target ?? {} as SiteBuildTarget;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value => UUID.test(value)) ||
      !HEX32.test(target.accountId) ||
      !/^[A-Za-z0-9-]{1,39}$/.test(target.githubOwner) ||
      !Number.isSafeInteger(target.githubOwnerId) || target.githubOwnerId < 1 ||
      !/^[a-z0-9][a-z0-9-]{0,62}$/.test(target.repository) ||
      !Number.isSafeInteger(target.repositoryId) || target.repositoryId < 1 ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(target.branch) ||
      target.branch.includes('..') || target.branch.split('/').some(part =>
        !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock')) ||
      !UUID.test(target.buildTokenUuid))
    throw Error('native_studio_site_build_target_invalid');
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function expected(target: SiteBuildTarget, tag: string) {
  return {
    script_tag: tag,
    git_repository: {
      provider_type: 'github', provider_account_id: String(target.githubOwnerId),
      provider_account_name: target.githubOwner, repo_id: String(target.repositoryId),
      repo_name: target.repository, branch: target.branch,
    },
    production_settings: {
      build_command: 'npm run build',
      deploy_command: 'npx wrangler versions upload',
      build_token_uuid: target.buildTokenUuid,
      root_directory: '/',
    },
    previews_enabled: false,
  };
}

function exactConfiguration(value: unknown, desired: ReturnType<typeof expected>) {
  if (!object(value) || !object(value.git_repository) ||
      !object(value.production_settings)) return false;
  const repo = value.git_repository, settings = value.production_settings;
  return value.script_tag === desired.script_tag &&
    value.previews_enabled === false &&
    Object.entries(desired.git_repository).every(([key, match]) => repo[key] === match) &&
    Object.entries(desired.production_settings).every(([key, match]) => settings[key] === match);
}

/** Connects an already created public Worker to its exact repository. Pushes
 * upload an inactive version; native Stacki Publish remains the live action.
 * A durable intent prevents repeating an ambiguous provider create.
 */
export async function ensureCloudflareSiteBuildConfiguration(
  target: SiteBuildTarget,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  buildsCredential: string,
  workerReadCredential: string,
  transport: typeof fetch = fetch,
): Promise<{ worker: string; tag: string }> {
  assertTarget(target);
  if (!TOKEN.test(buildsCredential) || !TOKEN.test(workerReadCredential))
    throw Error('native_studio_site_build_setup_invalid');
  const worker = `gnr8-${target.scope.siteId}-site`;
  const root = `https://api.cloudflare.com/client/v4/accounts/${target.accountId}`;
  async function request(path: string, credential: string, method = 'GET', body?: unknown,
    missing = false): Promise<unknown> {
    const response = await transport(`${root}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_site_build_provider_unavailable');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_site_build_provider_invalid'); }
    if (!object(data) || data.success !== true)
      throw Error('native_studio_site_build_provider_invalid');
    return data.result;
  }
  const scripts = await request('/workers/scripts', workerReadCredential);
  if (!Array.isArray(scripts)) throw Error('native_studio_site_build_worker_unverified');
  const matches = scripts.filter(item => object(item) && item.id === worker);
  if (matches.length !== 1 || !HEX32.test((matches[0] as Record<string, unknown>).tag as string))
    throw Error('native_studio_site_build_worker_unverified');
  const tag = (matches[0] as Record<string, string>).tag;
  const desired = expected(target, tag);
  const path = `/builds/workers/${tag}`;
  const live = await request(path, buildsCredential, 'GET', undefined, true);
  if (live) {
    if (!exactConfiguration(live, desired))
      throw Error('native_studio_site_build_conflict');
    return { worker, tag };
  }
  const identity = fingerprint(desired);
  let intent = await store.read<{ identity: string }>(INTENT);
  if (intent && (Object.keys(intent).join() !== 'identity' || intent.identity !== identity))
    throw Error('native_studio_site_build_conflict');
  if (!intent) {
    const won = await store.claim(INTENT, { identity });
    intent = await store.read<{ identity: string }>(INTENT);
    if (!intent || Object.keys(intent).join() !== 'identity' || intent.identity !== identity)
      throw Error('native_studio_site_build_conflict');
    if (!won) throw Error('native_studio_site_build_pending');
    try { await request('/builds/workers', buildsCredential, 'POST', desired); }
    catch { /* A lost response may still mean the provider connected the Worker. */ }
  }
  const confirmed = await request(path, buildsCredential, 'GET', undefined, true);
  if (!confirmed) throw Error('native_studio_site_build_pending');
  if (!exactConfiguration(confirmed, desired))
    throw Error('native_studio_site_build_conflict');
  return { worker, tag };
}

/** Production boundary: repository identity comes from the scoped, verified
 * GitHub binding rather than the event payload or a caller-supplied name.
 */
export async function ensureBoundCloudflareSiteBuildConfiguration(
  scope: NativeStudioScope,
  client: SupabaseClient,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  accountId: string,
  branch: string,
  buildTokenUuid: string,
  buildsCredential: string,
  workerReadCredential: string,
  transport: typeof fetch = fetch,
) {
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]);
  if (site.error || !site.data ||
      typeof site.data.domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(site.data.domain) ||
      !repository)
    throw Error('native_studio_site_build_scope_unverified');
  return ensureCloudflareSiteBuildConfiguration({ scope, accountId,
    githubOwner: repository.owner, githubOwnerId: repository.ownerId,
    repository: repository.repository, repositoryId: repository.repositoryId,
    branch, buildTokenUuid }, store, buildsCredential, workerReadCredential,
  transport);
}
