import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Read-only control-plane gate for the public Worker that serves /studio.
 * An empty reserved Worker or unattached domain is pending, never ready.
 */
export async function inspectCloudflarePublicStudioGateway(
  scope: NativeStudioScope, accountId: string, workerId: string,
  domain: string, credential: string, transport: typeof fetch = fetch,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
    !HEX32.test(accountId) || !HEX32.test(workerId) ||
    !DOMAIN.test(domain) || !TOKEN.test(credential))
    throw Error('native_studio_public_gateway_setup_invalid');
  const worker = `gnr8-${scope.siteId}-site`;
  const studio = `gnr8-${scope.siteId}-studio`;
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  async function read(path: string, missing = false): Promise<unknown> {
    const response = await transport(`${root}${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json' },
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_public_gateway_provider_unavailable');
    let body: unknown;
    try { body = await response.json(); }
    catch { throw Error('native_studio_public_gateway_provider_invalid'); }
    if (!object(body) || body.success !== true)
      throw Error('native_studio_public_gateway_provider_invalid');
    return body.result;
  }
  const identity = await read(`/workers/workers/${worker}`);
  if (!object(identity) || identity.name !== worker || identity.id !== workerId ||
      !object(identity.subdomain) || identity.subdomain.enabled !== false ||
      identity.subdomain.previews_enabled !== false)
    throw Error('native_studio_public_gateway_worker_conflict');
  const deployed = await read(`/workers/scripts/${worker}/deployments?per_page=1`, true);
  if (deployed === null) return { state: 'pending' as const, reason: 'no-deployment' as const, worker };
  if (!object(deployed) || !Array.isArray(deployed.deployments))
    throw Error('native_studio_public_gateway_provider_invalid');
  const active = deployed.deployments[0];
  if (!active) return { state: 'pending' as const, reason: 'no-deployment' as const, worker };
  if (!object(active) || !UUID.test(active.id as string) ||
      !Array.isArray(active.versions) || active.versions.length !== 1 ||
      !object(active.versions[0]) || active.versions[0].percentage !== 100 ||
      !UUID.test(active.versions[0].version_id as string))
    throw Error('native_studio_public_gateway_version_conflict');
  const versionId = active.versions[0].version_id as string;
  const version = await read(`/workers/scripts/${worker}/versions/${versionId}`);
  if (!object(version) || version.id !== versionId || !object(version.resources) ||
      !object(version.resources.script) ||
      !Array.isArray(version.resources.script.handlers) ||
      !version.resources.script.handlers.includes('fetch') ||
      !Array.isArray(version.resources.bindings))
    throw Error('native_studio_public_gateway_version_conflict');
  const bindings: unknown[] = version.resources.bindings;
  const named = (name: string) => bindings.filter(value => object(value) && value.name === name);
  const assets = named('ASSETS'), service = named('STUDIO'), siteVersion = named('SITE_VERSION');
  if (assets.length !== 1 || !object(assets[0]) || assets[0].type !== 'assets' ||
      service.length !== 1 || !object(service[0]) || service[0].type !== 'service' ||
      service[0].service !== studio ||
      (service[0].environment !== undefined && service[0].environment !== 'production') ||
      service[0].entrypoint !== undefined ||
      siteVersion.length !== 1 || !object(siteVersion[0]) ||
      siteVersion[0].type !== 'json' || !object(siteVersion[0].json) ||
      typeof siteVersion[0].json.tag !== 'string')
    throw Error('native_studio_public_gateway_binding_conflict');
  const domains = await read(`/workers/domains?hostname=${encodeURIComponent(domain)}`);
  if (!Array.isArray(domains)) throw Error('native_studio_public_gateway_provider_invalid');
  if (!domains.length) return { state: 'pending' as const, reason: 'domain-unattached' as const, worker };
  if (domains.length !== 1 || !object(domains[0]) ||
      domains[0].hostname !== domain || domains[0].service !== worker ||
      domains[0].enabled !== true || domains[0].previews_enabled !== false ||
      typeof domains[0].id !== 'string' || !HEX32.test(domains[0].id))
    throw Error('native_studio_public_gateway_domain_conflict');
  return { state: 'observed-control-plane' as const, worker, workerId,
    deploymentId: active.id as string, versionId, domainId: domains[0].id as string };
}

/** Resolve the current scoped site and repository before and after readback. */
export async function inspectBoundCloudflarePublicStudioGateway(
  scope: NativeStudioScope, client: SupabaseClient, accountId: string,
  workerId: string, credential: string, transport: typeof fetch = fetch,
) {
  const before = await readNativeStudioBootstrapTarget(scope, client, accountId);
  const result = await inspectCloudflarePublicStudioGateway(scope, accountId, workerId,
    new URL(before.studioOrigin).hostname, credential, transport);
  const after = await readNativeStudioBootstrapTarget(scope, client, accountId);
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error('native_studio_public_gateway_target_changed');
  return result;
}
