import 'server-only';
import type { NativeStudioScope } from './native-studio-binding-store';
import { exactStudioInternalOverride } from './native-studio-access-internal-route';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX32 = /^[a-f0-9]{32}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const AUD = /^[a-f0-9]{64}$/;
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

type Target = { siteId: string; studioOrigin: string; accountId: string };

function expectedPath(scope: NativeStudioScope, site: Target) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(id =>
      typeof id === 'string' && UUID.test(id)) ||
      !site || site.siteId !== scope.siteId || !HEX32.test(site.accountId))
    throw Error('native_studio_access_app_input_invalid');
  let origin: URL;
  try { origin = new URL(site.studioOrigin); }
  catch { throw Error('native_studio_access_app_input_invalid'); }
  if (origin.origin !== site.studioOrigin || origin.protocol !== 'https:' ||
      !HOST.test(origin.hostname) || origin.port || origin.username || origin.password)
    throw Error('native_studio_access_app_input_invalid');
  const previewOrigin = `https://preview.${origin.hostname}`;
  return { domain: `${origin.hostname}/studio`, uri: `${origin.hostname}/studio`,
    previewOrigin, previewUri: `preview.${origin.hostname}` };
}

async function readJson(url: string, credential: string, transport: typeof fetch) {
  const response = await transport(url, { method: 'GET', redirect: 'error',
    headers: { authorization: `Bearer ${credential}`, accept: 'application/json' },
    signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw Error('native_studio_access_app_readback_failed');
  let body: unknown;
  try { body = await response.json(); }
  catch { throw Error('native_studio_access_app_readback_failed'); }
  if (!object(body) || body.success !== true || !object(body.result))
    throw Error('native_studio_access_app_readback_failed');
  return body.result;
}

/** Read-only evidence for the exact site route and Access audience. This does
 * not prove the application's policy or an authenticated owner's session.
 * Caller must first resolve `site` from current scoped GNR8 bindings.
 * Cloudflare API: GET /accounts/{id}/access/apps/{app_id} and
 * GET /accounts/{id}/access/organizations.
 */
export async function inspectCloudflareStudioAccessApp(
  scope: NativeStudioScope, site: Target, appId: string, credential: string,
  transport: typeof fetch = fetch,
  expectedProtection: 'studio-only' | 'studio-and-preview' = 'studio-only',
) {
  const path = expectedPath(scope, site);
  if (typeof appId !== 'string' || !APP_ID.test(appId) ||
      typeof credential !== 'string' || credential.length < 16 ||
      /\s/.test(credential) || typeof transport !== 'function' ||
      !['studio-only', 'studio-and-preview'].includes(expectedProtection))
    throw Error('native_studio_access_app_input_invalid');
  const prefix = `https://api.cloudflare.com/client/v4/accounts/${site.accountId}`;
  let app: Record<string, unknown>, organization: Record<string, unknown>;
  try {
    [app, organization] = await Promise.all([
      readJson(`${prefix}/access/apps/${appId}`, credential, transport),
      readJson(`${prefix}/access/organizations`, credential, transport),
    ]);
  } catch { throw Error('native_studio_access_app_readback_failed'); }
  const destinations = app.destinations;
  const hasDestinations = Array.isArray(destinations);
  const expectedUris = expectedProtection === 'studio-and-preview' ?
    [path.uri, path.previewUri] : [path.uri];
  const exactDestinations = hasDestinations &&
    destinations.length === expectedUris.length &&
    destinations.every((destination: unknown) => object(destination) &&
      typeof destination.uri === 'string' &&
      (destination.type === undefined || destination.type === 'public') &&
      (expectedProtection === 'studio-and-preview' && destination.uri === path.uri ?
        exactStudioInternalOverride(destination.overrides) :
        destination.overrides === undefined ||
          Array.isArray(destination.overrides) && destination.overrides.length === 0)) &&
    destinations.map((destination: Record<string, unknown>) => (destination.uri as string).replace(/\/$/, '')).sort()
      .join('\n') === [...expectedUris].sort().join('\n');
  const legacy = app.self_hosted_domains;
  const exactLegacy = legacy === undefined || legacy === null ||
    Array.isArray(legacy) && legacy.every((uri: unknown) => typeof uri === 'string') &&
    legacy.map((uri: string) => uri.replace(/\/$/, '')).sort().join('\n') ===
    [...expectedUris].sort().join('\n');
  if (app.id !== appId || app.type !== 'self_hosted' ||
      app.domain !== path.domain || !AUD.test(String(app.aud ?? '')) ||
      !exactLegacy ||
      (expectedProtection === 'studio-and-preview' && !exactDestinations) ||
      (expectedProtection === 'studio-only' && destinations !== undefined &&
        !exactDestinations) ||
      typeof organization.auth_domain !== 'string' ||
      !HOST.test(organization.auth_domain))
    throw Error('native_studio_access_app_unverified');
  return { state: 'observed-access-app' as const, scope,
    siteId: site.siteId, studioOrigin: site.studioOrigin,
    accountId: site.accountId, appId, aud: app.aud as string,
    teamDomain: organization.auth_domain,
    ...(expectedProtection === 'studio-and-preview' ?
      { protection: 'studio-and-preview' as const,
        previewOrigin: path.previewOrigin } : {}) };
}
