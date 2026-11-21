import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
type Role = 'studio' | 'site';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reserve an empty Worker without a deployment, custom domain or public
 * workers.dev URL. A later trusted runner must deploy the real site/Studio.
 * This does not create a ready binding or replace an existing Worker.
 */
export async function ensureCloudflareNativeWorkerReservation(
  scope: NativeStudioScope,
  accountId: string,
  role: Role,
  credential: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  transport: typeof fetch = fetch,
): Promise<{ worker: string; id: string }> {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId) || !['studio', 'site'].includes(role) ||
      !TOKEN.test(credential))
    throw Error('native_studio_worker_reservation_setup_invalid');
  const worker = `gnr8-${scope.siteId}-${role}`;
  const intentKey = `native-studio/${role}-worker-create-intent-v1.json`;
  const identity = fingerprint({ scope, accountId, worker });
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/workers`;
  async function request(path: string, method = 'GET', body?: unknown,
    missing = false): Promise<unknown> {
    const response = await transport(`${root}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_worker_reservation_provider_unavailable');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_worker_reservation_provider_invalid'); }
    if (!object(data) || data.success !== true)
      throw Error('native_studio_worker_reservation_provider_invalid');
    return data.result;
  }
  async function exactWorker(): Promise<{ worker: string; id: string } | null> {
    const result = await request(`/${worker}`, 'GET', undefined, true);
    if (!result) return null;
    if (!object(result) || result.name !== worker || !HEX32.test(result.id as string) ||
        !object(result.subdomain) || result.subdomain.enabled !== false ||
        result.subdomain.previews_enabled !== false)
      throw Error('native_studio_worker_reservation_conflict');
    return { worker, id: result.id as string };
  }

  let intent = await store.read<{ identity: string }>(intentKey);
  if (intent && (!object(intent) || Object.keys(intent).join() !== 'identity' ||
      intent.identity !== identity))
    throw Error('native_studio_worker_reservation_conflict');
  const live = await exactWorker();
  if (live) {
    if (!intent) {
      await store.claim(intentKey, { identity });
      intent = await store.read<{ identity: string }>(intentKey);
      if (!intent || !object(intent) || Object.keys(intent).join() !== 'identity' ||
          intent.identity !== identity)
        throw Error('native_studio_worker_reservation_conflict');
    }
    return live;
  }
  if (!intent) {
    const won = await store.claim(intentKey, { identity });
    intent = await store.read<{ identity: string }>(intentKey);
    if (!intent || !object(intent) || Object.keys(intent).join() !== 'identity' ||
        intent.identity !== identity)
      throw Error('native_studio_worker_reservation_conflict');
    if (!won) throw Error('native_studio_worker_reservation_pending');
    try {
      await request('', 'POST', { name: worker,
        subdomain: { enabled: false, previews_enabled: false } });
    } catch { /* The next GET reconciles a create whose response was lost. */ }
  }
  const confirmed = await exactWorker();
  if (!confirmed) throw Error('native_studio_worker_reservation_pending');
  return confirmed;
}

/** Only a bound repository and current scoped site can reserve Workers. The
 * Cloudflare account and credential are central configuration, not event data.
 */
export async function ensureBoundCloudflareNativeWorkerReservations(
  scope: NativeStudioScope,
  client: SupabaseClient,
  accountId: string,
  credential: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  transport: typeof fetch = fetch,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_worker_reservation_scope_unverified');
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]);
  if (site.error || !site.data || typeof site.data.domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(site.data.domain) ||
      !repository)
    throw Error('native_studio_worker_reservation_scope_unverified');
  const studio = await ensureCloudflareNativeWorkerReservation(scope,
    accountId, 'studio', credential, store, transport);
  const publicSite = await ensureCloudflareNativeWorkerReservation(scope,
    accountId, 'site', credential, store, transport);
  return { studio, publicSite };
}
