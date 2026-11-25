/** Fail-closed overlap check for a complete Cloudflare Access app inventory.
 * The exact bound app is checked separately through its GET readback.
 * Cloudflare path precedence: a more specific app replaces inherited rules.
 * https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
 */
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const HOST = /^(?:[a-z0-9*](?:[a-z0-9*-]*[a-z0-9*])?\.)+[a-z]{2,}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function fail(): never { throw Error('native_studio_access_inventory_unverified'); }

type Route = { host: string; path: string };

function routeFromDomain(value: unknown): Route {
  if (typeof value !== 'string' || value.includes('://') ||
      /[?#%:@\\\s]/.test(value)) fail();
  const slash = value.indexOf('/');
  const host = (slash < 0 ? value : value.slice(0, slash)).toLowerCase();
  const path = slash < 0 ? '' : value.slice(slash);
  if (!HOST.test(host) || (path && !/^\/[A-Za-z0-9_./*-]*$/.test(path))) fail();
  return { host, path: path === '/' ? '' : path };
}

function routeFromUri(value: unknown): Route {
  return routeFromDomain(value);
}

function applicationRoutes(app: Record<string, unknown>): Route[] {
  const routes: Route[] = [];
  if (app.domain !== undefined) routes.push(routeFromDomain(app.domain));
  let legacy: Route[] | null = null;
  if (app.self_hosted_domains !== undefined && app.self_hosted_domains !== null) {
    if (!Array.isArray(app.self_hosted_domains)) fail();
    legacy = app.self_hosted_domains.map(routeFromDomain);
  }
  const destinations: Route[] = [];
  if (app.destinations !== undefined) {
    if (!Array.isArray(app.destinations) || !app.destinations.length) fail();
    for (const item of app.destinations) {
      if (!object(item) || (item.type !== undefined && item.type !== 'public') ||
          (item.overrides !== undefined &&
            (!Array.isArray(item.overrides) || item.overrides.length))) fail();
      destinations.push(routeFromUri(item.uri));
    }
  }
  if (legacy?.length && destinations.length &&
      JSON.stringify(legacy.map(route => JSON.stringify(route)).sort()) !==
      JSON.stringify(destinations.map(route => JSON.stringify(route)).sort())) fail();
  routes.push(...(destinations.length ? destinations : legacy ?? []));
  if (!routes.length) fail();
  return routes;
}

function hostMayMatch(pattern: string, host: string): boolean {
  if (pattern === host) return true;
  if (!pattern.includes('*')) return false;
  const labels = pattern.split('.');
  if (labels.length !== host.split('.').length) return false;
  const regex = new RegExp(`^${labels.map(label => label.split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^.]*')).join('\\.')}$`, 'i');
  return regex.test(host);
}

function mayCoverStudio(route: Route, host: string): boolean {
  if (!hostMayMatch(route.host, host)) return false;
  const path = route.path;
  if (!path || path === '/' || path.includes('*')) return true;
  return path === '/studio' || path.startsWith('/studio/') ||
    '/studio'.startsWith(path.endsWith('/') ? path : `${path}/`);
}

/** In account mode, require the exact current app and reject every other
 * overlapping self-hosted app. In zone mode (null app ID), reject every
 * overlapping app. Account and zone inventories must both be checked.
 * The caller must fetch all pages and pass a complete single-page response;
 * this verifier rejects pagination rather than silently missing an override.
 */
export function inspectNativeStudioAccessApplicationInventory(
  body: unknown, currentAppId: string | null, studioHost: string,
  previewHost?: string,
) {
  if ((currentAppId !== null && !APP_ID.test(currentAppId)) || !HOST.test(studioHost) ||
      studioHost.includes('*') || studioHost !== studioHost.toLowerCase() ||
      (previewHost !== undefined && (previewHost !== `preview.${studioHost}` ||
        !HOST.test(previewHost))) ||
      !object(body)) fail();
  const parsed = body as Record<string, unknown>;
  const result = parsed.result;
  const info = parsed.result_info;
  if (parsed.success !== true || !Array.isArray(result) || !object(info) ||
      info.page !== 1 || info.count !== result.length ||
      info.total_count !== result.length ||
      (info.total_pages !== undefined && info.total_pages !== 1)) fail();
  let current = 0;
  for (const item of result) {
    if (!object(item) || typeof item.id !== 'string' || !APP_ID.test(item.id) ||
        typeof item.type !== 'string') fail();
    if (item.id === currentAppId) {
      current++;
      const routes = applicationRoutes(item);
      if (item.type !== 'self_hosted' ||
          (previewHost === undefined ? routes.some(route =>
            route.host !== studioHost || route.path !== '/studio') :
            item.domain !== `${studioHost}/studio` ||
            !Array.isArray(item.destinations) || item.destinations.length !== 2 ||
            routes.length !== 3 ||
            routes.filter(route => route.host === studioHost &&
              route.path === '/studio').length !== 2 ||
            routes.filter(route => route.host === previewHost &&
              route.path === '').length !== 1)) fail();
      continue;
    }
    if (item.type !== 'self_hosted') continue;
    if (applicationRoutes(item).some(route =>
        mayCoverStudio(route, studioHost) ||
        previewHost !== undefined && hostMayMatch(route.host, previewHost))) fail();
  }
  if (current !== (currentAppId === null ? 0 : 1)) fail();
  return { state: 'observed-no-access-overlap' as const, appId: currentAppId,
    studioHost, applicationsChecked: result.length,
    ...(previewHost === undefined ? {} : { previewHost }) };
}
