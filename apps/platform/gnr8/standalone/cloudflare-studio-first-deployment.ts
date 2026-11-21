import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId) || !HEX32.test(workerId) || !TOKEN.test(credential) ||
      typeof domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain))
    throw Error('native_studio_first_deployment_setup_invalid');
  const worker = `gnr8-${scope.siteId}-studio`;
  const bucket = `gnr8-${scope.siteId}-drafts`;
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  async function read(path: string, allowMissing = false): Promise<unknown> {
    const response = await transport(`${root}${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json' },
    });
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
    throw Error('native_studio_first_deployment_version_conflict');
  const versionId = latest.versions[0].version_id as string;
  const version = await read(`/workers/scripts/${worker}/versions/${versionId}`);
  if (!object(version) || version.id !== versionId || !object(version.resources) ||
      !object(version.resources.script_runtime) ||
      !object(version.resources.script_runtime.exports) ||
      !object(version.resources.script_runtime.exports.PreviewContainer) ||
      version.resources.script_runtime.exports.PreviewContainer.type !== 'durable-object' ||
      version.resources.script_runtime.exports.PreviewContainer.storage !== 'sqlite' ||
      version.resources.script_runtime.exports.PreviewContainer.state === 'deleted' ||
      version.resources.script_runtime.migration_tag !== 'v1' ||
      !object(version.resources.script) ||
      !Array.isArray(version.resources.script.handlers) ||
      !version.resources.script.handlers.includes('fetch'))
    throw Error('native_studio_first_deployment_version_conflict');
  const container = version.resources.script_runtime.exports.PreviewContainer.container;
  if (typeof container !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(container))
    throw Error('native_studio_first_deployment_container_conflict');
  const settings = await read(`/workers/scripts/${worker}/settings`);
  if (!object(settings) || !Array.isArray(settings.bindings))
    throw Error('native_studio_first_deployment_provider_invalid');
  const bindings: unknown[] = settings.bindings;
  const binding = (name: string) => bindings.filter(value => object(value) && value.name === name);
  const drafts = binding('DRAFTS');
  const preview = binding('PREVIEW');
  const assets = binding('ASSETS');
  const origin = binding('STUDIO_ORIGIN');
  if (drafts.length !== 1 || !object(drafts[0]) || drafts[0].type !== 'r2_bucket' ||
      drafts[0].bucket_name !== bucket || preview.length !== 1 ||
      !object(preview[0]) || preview[0].type !== 'durable_object_namespace' ||
      preview[0].class_name !== 'PreviewContainer' ||
      (preview[0].script_name !== undefined && preview[0].script_name !== worker) ||
      assets.length !== 1 || !object(assets[0]) || assets[0].type !== 'assets' ||
      origin.length !== 1 || !object(origin[0]) || origin[0].type !== 'plain_text' ||
      origin[0].text !== `https://${domain}`)
    throw Error('native_studio_first_deployment_binding_conflict');
  const applications = await read(`/containers/applications?name=${encodeURIComponent(container)}`);
  if (!Array.isArray(applications))
    throw Error('native_studio_first_deployment_provider_invalid');
  if (!applications.length)
    return { state: 'pending' as const, worker, reason: 'container-application-missing' as const };
  if (applications.length !== 1 || !object(applications[0]) ||
      applications[0].name !== container || applications[0].account_id !== accountId ||
      applications[0].scheduling_policy !== 'durable_object' ||
      typeof applications[0].id !== 'string' || !applications[0].id)
    throw Error('native_studio_first_deployment_container_conflict');
  return { state: 'observed-control-plane' as const, worker, workerId,
    deploymentId: latest.id as string, versionId,
    containerApplicationId: applications[0].id as string };
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
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_first_deployment_scope_unverified');
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]);
  if (site.error || !site.data || typeof site.data.domain !== 'string' || !repository)
    throw Error('native_studio_first_deployment_scope_unverified');
  return inspectCloudflareStudioFirstDeployment(scope, accountId, workerId,
    site.data.domain, credential, transport);
}
