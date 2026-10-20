import { createPublicOutputService, listPublicOutputVersions, type PublicOutputSelection } from './public-output-service';
import { parseAgencyActionContextError } from '@/app/api/gnr8/agency/_lib/agency-action-access';
import { createAstroProductionCandidatePreviewRouteHandlers } from '@/app/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview/astro-candidate-preview-route-handlers';
import { isCanonicalUuid } from './astro-production-candidate-record';
import type { PublicOutputScope } from './public-output-access';

type Context = { params: Promise<{ clientId: string; siteId: string }> };
const headers = { 'cache-control': 'private, no-store' };
function selection(body: Record<string, unknown>): PublicOutputSelection {
  if (!isCanonicalUuid(body.siteVersionId) || !isCanonicalUuid(body.artifactId) || !/^[a-f0-9]{64}$/.test(String(body.artifactBundleSha256)))
    throw new Error('422|PUBLIC_OUTPUT_SELECTION_REQUIRED');
  return { siteVersionId: String(body.siteVersionId), artifactId: String(body.artifactId), artifactBundleSha256: String(body.artifactBundleSha256) };
}
function failure(error: unknown): Response {
  const mapped = parseAgencyActionContextError(error);
  const known = ['public_preparation_domain_not_ready', 'public_preparation_pointer_baseline_changed',
    'public_output_selection_stale', 'public_preparation_source_technical_blocked', 'public_preparation_invalid_host'];
  const nestedReason = known.find(reason => mapped.message.includes(reason));
  const reason = nestedReason ?? mapped.message.match(/^(?:PUBLIC_OUTPUT_[A-Z_]+|public_preparation_[a-z_]+)/)?.[0] ?? 'PUBLIC_OUTPUT_BLOCKED';
  const messages: Record<string, string> = {
    public_preparation_domain_not_ready: 'Connect and verify the selected domain before publishing. The current website is unchanged.',
    public_preparation_pointer_baseline_changed: 'The active publication changed. This preparation cannot replace it.',
    public_preparation_source_technical_blocked: 'The retained generated source has technical blockers. Review its status before preparing.',
    public_preparation_invalid_host: 'Enter a valid hostname without a URL path or wildcard.',
    PUBLIC_OUTPUT_SELECTION_STALE: 'The selected artifact or its evidence changed. Reload and review the exact version again.',
    PUBLIC_OUTPUT_RECIPIENT_CONFIRMATION_REQUIRED: 'Enter a valid recipient and explicitly confirm it.',
    PUBLIC_OUTPUT_ACTIVE_CONTACT_REQUIRED: 'Select the currently active public artifact with a native contact form. Refresh if publication changed.',
    PUBLIC_OUTPUT_HOST_MISMATCH: 'The domain must match the prepared artifact.',
  };
  const blockerCodes = error && typeof error === 'object' && 'blockerCodes' in error && Array.isArray(error.blockerCodes)
    ? error.blockerCodes.filter((code): code is string => typeof code === 'string' && /^[a-z_]+$/.test(code)) : [];
  return Response.json({ ok: false, error: messages[reason] ?? 'The selected public version could not be processed. Refresh its status and retry.', reason,
    ...(blockerCodes.length ? { blockers: blockerCodes } : {}) }, { status: mapped.status === 500 ? 409 : mapped.status, headers });
}
export function createPublicOutputRouteHandlers(deps: {
  service: ReturnType<typeof createPublicOutputService>;
  list: typeof listPublicOutputVersions;
  preview?: typeof createAstroProductionCandidatePreviewRouteHandlers;
} = { service: createPublicOutputService(), list: listPublicOutputVersions }) {
  async function scope(request: Request, context: Context): Promise<PublicOutputScope> {
    return { ...await context.params, agencyId: new URL(request.url).searchParams.get('agencyId') ?? '' };
  }
  return {
    async GET(request: Request, context: Context) {
      try {
        const s = await scope(request, context);
        const query = Object.fromEntries(new URL(request.url).searchParams);
        const data = query.siteVersionId ? await deps.service.read(s, selection(query)) : await deps.list(s);
        return Response.json({ ok: true, data }, { headers });
      } catch (error) { return failure(error); }
    },
    async POST(request: Request, context: Context) {
      try {
        if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('403|PUBLIC_OUTPUT_ORIGIN_INVALID');
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['siteVersionId','artifactId','artifactBundleSha256','action','host','confirmation','technicalEvaluationSha256','recipient'].includes(k)))
          throw new Error('422|PUBLIC_OUTPUT_REQUEST_INVALID');
        const data = await deps.service.act(await scope(request, context), { ...selection(body), action: body.action, host: body.host, confirmation: body.confirmation, technicalEvaluationSha256: body.technicalEvaluationSha256, recipient: body.recipient });
        return Response.json({ ok: true, data }, { headers });
      } catch (error) { return failure(error); }
    },
    async preview(request: Request, context: Context) {
      try {
        const query = Object.fromEntries(new URL(request.url).searchParams);
        const model = await deps.service.read(await scope(request, context), selection(query));
        if (!model.publicPreparation) throw new Error('404|PUBLIC_OUTPUT_NOT_PREPARED');
        const base = new URL(request.url); base.searchParams.delete('path');
        // A separate owner-scoped entry point; the admin feature gate stays intact.
        const handlers = (deps.preview ?? createAstroProductionCandidatePreviewRouteHandlers)({ requireSuperadminUserId: async () => 'authorized-site-owner',
          isFeatureEnabled: () => true, previewBase: `${base.pathname}${base.search}` });
        const renderUrl = new URL(request.url);
        renderUrl.search = '';
        renderUrl.searchParams.set('path', query.path ?? '/');
        return handlers.GET(new Request(renderUrl, { headers: request.headers }), { params: Promise.resolve({ siteVersionId: model.siteVersionId, candidateId: model.candidateId }) });
      } catch (error) { return failure(error); }
    },
  };
}
