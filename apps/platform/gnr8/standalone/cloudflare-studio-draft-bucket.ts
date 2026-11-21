import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';

const INTENT = 'native-studio/draft-bucket-create-intent-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Creates only the deterministic draft bucket for a verified site. The
 * append-only intent prevents a second create after an ambiguous response.
 * Existing buckets must be in the default jurisdiction and have no public
 * managed or custom domain; no access setting is changed here.
 */
export async function ensureCloudflareStudioDraftBucket(
  scope: NativeStudioScope,
  accountId: string,
  credential: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  transport: typeof fetch = fetch,
): Promise<{ bucket: string; bucketId: string }> {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId) || !TOKEN.test(credential))
    throw Error('native_studio_draft_bucket_setup_invalid');
  const bucket = `gnr8-${scope.siteId}-drafts`;
  const root = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
  async function request(path: string, method = 'GET', body?: unknown,
    missing = false): Promise<unknown> {
    const response = await transport(`${root}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw Error('native_studio_draft_bucket_provider_unavailable');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw Error('native_studio_draft_bucket_provider_invalid'); }
    if (!object(data) || data.success !== true)
      throw Error('native_studio_draft_bucket_provider_invalid');
    return data.result;
  }
  async function privateBucket(): Promise<{ bucket: string; bucketId: string } | null> {
    const details = await request(`/${bucket}`, 'GET', undefined, true);
    if (!details) return null;
    if (!object(details) || details.name !== bucket ||
        (details.jurisdiction !== undefined && details.jurisdiction !== 'default'))
      throw Error('native_studio_draft_bucket_conflict');
    const [managed, custom] = await Promise.all([
      request(`/${bucket}/domains/managed`),
      request(`/${bucket}/domains/custom`),
    ]);
    if (!object(managed) || !HEX32.test(managed.bucketId as string) ||
        managed.enabled !== false || !object(custom) ||
        !Array.isArray(custom.domains) || custom.domains.some(domain =>
          !object(domain) || domain.enabled !== false))
      throw Error('native_studio_draft_bucket_not_private');
    return { bucket, bucketId: managed.bucketId as string };
  }

  const identity = fingerprint({ scope, accountId, bucket });
  let intent = await store.read<{ identity: string }>(INTENT);
  if (intent && (!object(intent) || Object.keys(intent).join() !== 'identity' ||
      intent.identity !== identity))
    throw Error('native_studio_draft_bucket_conflict');
  const live = await privateBucket();
  if (live) return live;
  if (!intent) {
    const won = await store.claim(INTENT, { identity });
    intent = await store.read<{ identity: string }>(INTENT);
    if (!intent || !object(intent) || Object.keys(intent).join() !== 'identity' ||
        intent.identity !== identity)
      throw Error('native_studio_draft_bucket_conflict');
    if (!won) throw Error('native_studio_draft_bucket_pending');
    try { await request('', 'POST', { name: bucket }); }
    catch { /* Reconcile the exact name; a lost response may mean creation won. */ }
  }
  const confirmed = await privateBucket();
  if (!confirmed) throw Error('native_studio_draft_bucket_pending');
  return confirmed;
}

/** A hosted caller must read the current site and bound repository before
 * any R2 request; neither can be chosen by an event payload.
 */
export async function ensureBoundCloudflareStudioDraftBucket(
  scope: NativeStudioScope,
  client: SupabaseClient,
  accountId: string,
  credential: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  transport: typeof fetch = fetch,
) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)))
    throw Error('native_studio_draft_bucket_scope_unverified');
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]);
  if (site.error || !site.data ||
      typeof site.data.domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(site.data.domain) ||
      !repository)
    throw Error('native_studio_draft_bucket_scope_unverified');
  return ensureCloudflareStudioDraftBucket(scope, accountId, credential,
    store, transport);
}
