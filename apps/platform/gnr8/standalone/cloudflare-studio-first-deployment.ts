import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import type { PublicationStore } from './publication-store';
import type { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const FIRST_DEPLOY_TAG = /^gnr8-first-[a-f0-9]{64}$/;
const SECRET_NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
type AccessBinding = { version: 2; provider: 'access'; aud: string;
  teamDomain: string; admins: string[] };
type SourceProof = { store: Pick<PublicationStore, 'read' | 'getBytes'>;
  sourceId: string; commit: string;
  site: Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>> };

/** Read only control-plane evidence for the first real Studio deployment.
 * A reserved Worker alone is pending, not an installed or ready Studio.
 */
export async function inspectCloudflareStudioFirstDeployment(
  scope: NativeStudioScope,
  accountId: string,
  workerId: string,
  domain: string,
  credential: string,
  transport: typeof fetch = fetch,
  expectedTag?: string,
  expectedRepository?: string,
  requireSecrets = false,
  expectedAccess?: AccessBinding,
  expectedImage?: string,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId) || !HEX32.test(workerId) || !TOKEN.test(credential) ||
      (expectedTag !== undefined && !FIRST_DEPLOY_TAG.test(expectedTag)) ||
      (expectedRepository !== undefined &&
        !/^[A-Za-z0-9-]{1,39}\/[a-z0-9][a-z0-9-]{0,62}$/.test(expectedRepository)) ||
      (expectedImage !== undefined &&
        !new RegExp(`^registry\\.cloudflare\\.com/${accountId}/gnr8-${scope.siteId}-studio@sha256:[a-f0-9]{64}$`)
          .test(expectedImage)) ||
      (expectedAccess !== undefined && (expectedAccess.version !== 2 ||
        expectedAccess.provider !== 'access' ||
        !/^[a-f0-9]{64}$/.test(expectedAccess.aud) ||
        !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(expectedAccess.teamDomain) ||
        !Array.isArray(expectedAccess.admins) ||
        !expectedAccess.admins.length)) ||
      typeof requireSecrets !== 'boolean' ||
      typeof domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))
    throw Error('native_studio_first_deployment_setup_invalid');
  const worker = `gnr8-${scope.siteId}-studio`;
  const bucket = `gnr8-${scope.siteId}-drafts`;
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  async function read(path: string, allowMissing = false): Promise<unknown> {
    let response: Response;
    try {
      response = await transport(`${root}${path}`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' },
      });
    } catch {
      throw Error('native_studio_first_deployment_transport_failed');
    }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_first_deployment_provider_unavailable');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_first_deployment_provider_invalid'); }
    if (!object(data) || data.success !== true)
      throw Error('native_studio_first_deployment_provider_invalid');
    return data.result;
  }
  const identity = await read(`/workers/workers/${worker}`);
  if (!object(identity) || identity.name !== worker || identity.id !== workerId ||
      !object(identity.subdomain) || identity.subdomain.enabled !== false ||
      identity.subdomain.previews_enabled !== false)
    throw Error('native_studio_first_deployment_worker_conflict');
  const deploymentResult = await read(`/workers/scripts/${worker}/deployments?per_page=1`, true);
  if (!deploymentResult) return { state: 'pending' as const, worker, reason: 'no-deployment' as const };
  if (!object(deploymentResult) || !Array.isArray(deploymentResult.deployments))
    throw Error('native_studio_first_deployment_provider_invalid');
  const latest = deploymentResult.deployments[0];
  if (!latest) return { state: 'pending' as const, worker, reason: 'no-deployment' as const };
  if (!object(latest) || !UUID.test(latest.id as string) ||
      !Array.isArray(latest.versions) || latest.versions.length !== 1 ||
      !object(latest.versions[0]) || latest.versions[0].percentage !== 100 ||
      !UUID.test(latest.versions[0].version_id as string))
    throw Error('native_studio_first_deployment_traffic_conflict');
  const versionId = latest.versions[0].version_id as string;
  if (expectedTag) {
    const taggedVersion = await read(`/workers/workers/${worker}/versions/${versionId}`);
    if (!object(taggedVersion) || taggedVersion.id !== versionId ||
        !object(taggedVersion.annotations) ||
        taggedVersion.annotations['workers/tag'] !== expectedTag)
      throw Error('native_studio_first_deployment_source_conflict');
  }
  const version = await read(`/workers/scripts/${worker}/versions/${versionId}`);
  if (!object(version) || version.id !== versionId || !object(version.resources))
    throw Error('native_studio_first_deployment_version_shape_conflict');
  if (!object(version.resources.script_runtime))
    throw Error('native_studio_first_deployment_runtime_missing');
  const exports = version.resources.script_runtime.exports;
  // Cloudflare may omit the optional exports map on a version read. In that
  // case the active PREVIEW namespace and its Container application provide
  // the same site-scoped relationship without inferring an application name.
  if (exports !== undefined) {
    if (!object(exports) || !object(exports.PreviewContainer))
      throw Error('native_studio_first_deployment_preview_export_missing');
    if (exports.PreviewContainer.type !== 'durable-object')
      throw Error('native_studio_first_deployment_export_type_conflict');
    if (exports.PreviewContainer.storage !== 'sqlite')
      throw Error('native_studio_first_deployment_export_storage_conflict');
    if (exports.PreviewContainer.state === 'deleted')
      throw Error('native_studio_first_deployment_export_deleted');
  }
  // Cloudflare documents both fields as optional in a version read. Their
  // absence does not contradict the tagged, active Durable Object export.
  if (version.resources.script_runtime.migration_tag !== undefined &&
      version.resources.script_runtime.migration_tag !== 'v1')
    throw Error('native_studio_first_deployment_migration_conflict');
  if (version.resources.script !== undefined &&
      (!object(version.resources.script) ||
        version.resources.script.handlers !== undefined &&
        (!Array.isArray(version.resources.script.handlers) ||
          !version.resources.script.handlers.includes('fetch'))))
    throw Error('native_studio_first_deployment_handler_conflict');
  const container = object(exports) && object(exports.PreviewContainer)
    ? exports.PreviewContainer.container : undefined;
  if (exports !== undefined && (typeof container !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(container)))
    throw Error('native_studio_first_deployment_container_conflict');
  if (!Array.isArray(version.resources.bindings))
    throw Error('native_studio_first_deployment_provider_invalid');
  const bindings: unknown[] = version.resources.bindings;
  const binding = (name: string) => bindings.filter(value => object(value) && value.name === name);
  if (requireSecrets && !SECRET_NAMES.every(name => {
    const values = binding(name);
    return values.length === 1 && object(values[0]) && values[0].type === 'secret_text';
  })) throw Error('native_studio_first_deployment_secret_conflict');
  const drafts = binding('DRAFTS');
  const preview = binding('PREVIEW');
  const assets = binding('ASSETS');
  const origin = binding('STUDIO_ORIGIN');
  const plain = (name: string, expected: string) => {
    const values = binding(name);
    return values.length === 1 && object(values[0]) &&
      values[0].type === 'plain_text' && values[0].text === expected;
  };
  if (drafts.length !== 1 || !object(drafts[0]) || drafts[0].type !== 'r2_bucket' ||
      drafts[0].bucket_name !== bucket || preview.length !== 1 ||
      !object(preview[0]) || preview[0].type !== 'durable_object_namespace' ||
      preview[0].class_name !== 'PreviewContainer' ||
      (preview[0].script_name !== undefined && preview[0].script_name !== worker) ||
      assets.length !== 1 || !object(assets[0]) || assets[0].type !== 'assets' ||
      origin.length !== 1 || !object(origin[0]) || origin[0].type !== 'plain_text' ||
      origin[0].text !== `https://${domain}` ||
      !plain('PREVIEW_ORIGIN', `https://preview.${domain}`) ||
      !plain('SITE_DEPLOYMENT_URL', `https://${domain}/__studio-deployment`) ||
      !plain('EDITOR_ACCESS', expectedAccess ? 'roles' : 'repository') ||
      !plain('EDITOR_GITHUB_IDS', '') ||
      (expectedAccess === undefined &&
        ['AUTH_PROVIDER', 'ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'AUTH_BOOTSTRAP_ADMIN']
          .some(name => binding(name).length !== 0)) ||
      (expectedAccess !== undefined && (!plain('AUTH_PROVIDER', 'access') ||
        !plain('ACCESS_TEAM_DOMAIN', expectedAccess.teamDomain) ||
        !plain('ACCESS_AUD', expectedAccess.aud) ||
        !plain('AUTH_BOOTSTRAP_ADMIN', expectedAccess.admins[0]))) ||
      (expectedRepository !== undefined && !plain('GITHUB_REPOSITORY', expectedRepository)))
    throw Error('native_studio_first_deployment_binding_conflict');
  const namespaceId = object(preview[0]) ? preview[0].namespace_id : undefined;
  if (exports === undefined && (typeof namespaceId !== 'string' ||
      !HEX32.test(namespaceId)))
    throw Error('native_studio_first_deployment_namespace_conflict');
  const applications = await read(typeof container === 'string'
    ? `/containers/applications?name=${encodeURIComponent(container)}`
    : '/containers/applications');
  if (!Array.isArray(applications))
    throw Error('native_studio_first_deployment_provider_invalid');
  const matching = container ? applications : applications.filter(value =>
    object(value) && object(value.durable_objects) &&
    value.durable_objects.namespace_id === namespaceId);
  if (!matching.length)
    return { state: 'pending' as const, worker, reason: 'container-application-missing' as const };
  if (matching.length !== 1 || !object(matching[0]) ||
      (container ? matching[0].name !== container :
        typeof matching[0].name !== 'string' || !matching[0].name) ||
      matching[0].account_id !== accountId ||
      !['default', 'durable_object'].includes(String(matching[0].scheduling_policy)) ||
      (matching[0].scheduling_policy === 'default' &&
        (!expectedImage || !object(matching[0].configuration) ||
          matching[0].configuration.image !== expectedImage)) ||
      (namespaceId !== undefined && (!object(matching[0].durable_objects) ||
        matching[0].durable_objects.namespace_id !== namespaceId)) ||
      typeof matching[0].id !== 'string' || !matching[0].id)
    throw Error('native_studio_first_deployment_container_conflict');
  return { state: expectedTag ? 'verified-source-control-plane' as const
    : 'observed-control-plane' as const, worker, workerId,
    deploymentId: latest.id as string, versionId,
    containerApplicationId: matching[0].id as string };
}

/** A hosted caller must resolve the current site and repository from the
 * authoritative tables before a Cloudflare read. Event data cannot choose a
 * domain or repository for this inspection.
 */
export async function inspectBoundCloudflareStudioFirstDeployment(
  scope: NativeStudioScope,
  client: SupabaseClient,
  accountId: string,
  workerId: string,
  credential: string,
  transport: typeof fetch = fetch,
  expectedTag?: string,
  requireSecrets = false,
  sourceProof?: SourceProof,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_first_deployment_scope_unverified');
  const [site, repository] = await Promise.all([
      client.from('sites').select('domain').eq('id', scope.siteId)
        .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
      new SiteGitHubRepositoryBinding(client).readForPublication(scope),
    ]).catch(() => {
    throw Error('native_studio_first_deployment_scope_unverified');
  });
  if (site.error || !site.data || typeof site.data.domain !== 'string' || !repository)
    throw Error('native_studio_first_deployment_scope_unverified');
  let expectedAccess: AccessBinding | undefined;
  let expectedImage: string | undefined;
  if (sourceProof !== undefined) {
    if (!sourceProof || !sourceProof.store ||
        typeof sourceProof.store.read !== 'function' ||
        typeof sourceProof.store.getBytes !== 'function' ||
        sourceProof.site?.siteId !== scope.siteId ||
        !SHA.test(sourceProof.sourceId) || !COMMIT.test(sourceProof.commit) ||
        sourceProof.site.accountId !== accountId ||
        sourceProof.site.studioOrigin !== `https://${site.data.domain}` ||
        sourceProof.site.repository !== `${repository.owner}/${repository.repository}` ||
        sourceProof.site.repositoryId !== String(repository.repositoryId))
      throw Error('native_studio_first_deployment_source_unverified');
    let saved;
    try { saved = await readStoredVerifiedAstroStudio(sourceProof); }
    catch { throw Error('native_studio_first_deployment_source_unverified'); }
    expectedAccess = saved.receipt.format === 'gnr8-native-studio-source:v2'
      ? saved.receipt.access as AccessBinding : undefined;
    let prebuilt: unknown;
    try { prebuilt = await sourceProof.store.read('native-studio/prebuilt-image-v1.json'); }
    catch { throw Error('native_studio_first_deployment_source_unverified'); }
    if (!object(prebuilt) || Object.keys(prebuilt).sort().join() !==
        'accountId,commit,digest,siteId,sourceId,workerId' ||
        prebuilt.accountId !== accountId || prebuilt.siteId !== scope.siteId ||
        prebuilt.sourceId !== sourceProof.sourceId ||
        prebuilt.commit !== sourceProof.commit || prebuilt.workerId !== workerId ||
        typeof prebuilt.digest !== 'string' || !SHA.test(prebuilt.digest))
      throw Error('native_studio_first_deployment_source_unverified');
    expectedImage = `registry.cloudflare.com/${accountId}/gnr8-${scope.siteId}-studio@sha256:${prebuilt.digest}`;
  }
  return inspectCloudflareStudioFirstDeployment(scope, accountId, workerId,
    site.data.domain, credential, transport, expectedTag,
    `${repository.owner}/${repository.repository}`, requireSecrets, expectedAccess,
    expectedImage);
}
