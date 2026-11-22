import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SiteGitHubRepositoryBinding } from '../stacki/site-github-repository-binding';
import { inspectNativeStudioRecoveryBindings } from './cloudflare-studio-secrets';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Resolve the exact bound site before checking a captured Studio version.
 * This is read-only control-plane evidence, never rollback or Publish proof.
 */
export async function inspectBoundNativeStudioRecoveryCandidate(
  scope: NativeStudioScope,
  client: SupabaseClient,
  accountId: string,
  credential: string,
  previousVersionId: string,
  transport: typeof fetch = fetch,
) {
  if (!scope || [scope.agencyId, scope.clientId, scope.siteId]
      .some(value => typeof value !== 'string' || !UUID.test(value)) ||
      !HEX32.test(accountId) || !UUID.test(previousVersionId) ||
      typeof credential !== 'string' || credential.length < 16 || /\s/.test(credential))
    throw Error('native_studio_recovery_preflight_invalid');
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    new SiteGitHubRepositoryBinding(client).readForPublication(scope),
  ]).catch(() => { throw Error('native_studio_recovery_scope_unverified'); });
  const domain = site.data?.domain;
  if (site.error || typeof domain !== 'string' || !DOMAIN.test(domain) || !repository)
    throw Error('native_studio_recovery_scope_unverified');
  const repositoryName = `${repository.owner}/${repository.repository}`;
  const worker = `gnr8-${scope.siteId}-studio`;
  let response: Response;
  try {
    response = await transport(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/workers/${worker}`,
      { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' } },
    );
  } catch { throw Error('native_studio_recovery_worker_unverified'); }
  if (!response.ok) throw Error('native_studio_recovery_worker_unverified');
  let body: unknown;
  try { body = await response.json(); }
  catch { throw Error('native_studio_recovery_worker_unverified'); }
  if (!object(body) || body.success !== true || !object(body.result) ||
      body.result.name !== worker || typeof body.result.id !== 'string' ||
      !HEX32.test(body.result.id))
    throw Error('native_studio_recovery_worker_unverified');
  const workerId = body.result.id;
  let result: Awaited<ReturnType<typeof inspectNativeStudioRecoveryBindings>>;
  try {
    result = await inspectNativeStudioRecoveryBindings(scope, accountId,
      credential, previousVersionId, { workerId, domain, repository: repositoryName }, transport);
  } catch { throw Error('native_studio_recovery_inspection_failed'); }
  return { ...result, workerId, domain, repository: repositoryName };
}
