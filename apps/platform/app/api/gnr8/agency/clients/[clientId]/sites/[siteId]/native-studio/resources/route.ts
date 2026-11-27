import { requirePublicOutputSite } from '@/gnr8/output-adapters/public-output-access';
import { SiteGitHubRepositoryBinding } from '@/gnr8/stacki/site-github-repository-binding';
import { bindSelectedLegacyGitHubTarget } from '@/gnr8/stacki/stacki-github-config';
import { requireSameOriginJson, readBoundedJson } from '@/gnr8/stacki/stacki-draft-route-handlers';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { inngest } from '@/gnr8/inngest/client';

export const runtime = 'nodejs';
const headers = { 'cache-control': 'private,no-store' };

/** Requeue after a lost import enqueue without repeating the site import.
 * This endpoint only emits the scoped event; the Worker rechecks authority.
 */
export async function POST(request: Request, context: {
  params: Promise<{ clientId: string; siteId: string }>;
}) {
  try {
    if (process.env.GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED !== '1')
      return Response.json({ ok: false, error: 'native_studio_resource_reservation_disabled' },
        { status: 404, headers });
    requireSameOriginJson(request);
    const body = await readBoundedJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).join() !== 'agencyId' ||
        typeof (body as { agencyId?: unknown }).agencyId !== 'string')
      throw Error('native_studio_resource_reservation_request_invalid');
    const scope = { ...await context.params, agencyId: (body as { agencyId: string }).agencyId };
    const actor = await requirePublicOutputSite(scope);
    const client = getSupabaseServiceRoleClient();
    if (!client) throw Error('native_studio_resource_reservation_store_unavailable');
    if (!await new SiteGitHubRepositoryBinding(client).readForPublication(scope)) {
      const bound = await bindSelectedLegacyGitHubTarget(
        { ...scope, siteVersionId: scope.siteId }, client);
      if (!bound)
        throw Error('native_studio_resource_reservation_repository_missing');
      // The Worker reads the verified durable binding; no pilot env is needed there.
    }
    try {
      await inngest.send({ name: 'gnr8/native-studio.resources.reserve.requested',
        data: { scope, actor: actor.userId } });
    } catch { throw Error('native_studio_resource_reservation_queue_failed'); }
    return Response.json({ ok: true, state: 'queued' }, { status: 202, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const explicitStatus = error && typeof error === 'object' && 'status' in error
      ? Number(error.status) : NaN;
    const status = /^4\d\d\|/.test(message) ? Number(message.slice(0, 3))
      : Number.isInteger(explicitStatus) && explicitStatus >= 400 && explicitStatus < 500
        ? explicitStatus
        : message.endsWith('_queue_failed') || message.endsWith('_store_unavailable') ? 503 : 409;
    const code = /^native_studio_[a-z0-9_]+$/.test(message)
      ? message : 'native_studio_resource_reservation_unavailable';
    return Response.json({ ok: false, error: code }, { status, headers });
  }
}
