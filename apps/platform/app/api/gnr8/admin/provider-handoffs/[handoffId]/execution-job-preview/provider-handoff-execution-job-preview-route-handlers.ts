import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { createRuntimeProviderExecutionJobPreview } from "@/gnr8/runtime/providers/runtime-provider-execution-job-preview";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

const UUID_V4_TO_V8_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProviderHandoffExecutionJobPreviewRouteDeps = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  createRuntimeProviderExecutionJobPreview: typeof createRuntimeProviderExecutionJobPreview;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForSiteVersion;
  resolveAgencyIdForSite: typeof resolveAgencyIdForSite;
  requireAgencyActionContext: typeof requireAgencyActionContext;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuidLike(value: string): boolean {
  return UUID_V4_TO_V8_LOOSE_REGEX.test(value);
}

function isDeterministicDevSeedHandoff(handoff: { siteId?: string | null; siteVersionId?: string | null; correlationKey?: string | null }): boolean {
  const siteId = sanitizeToken(handoff.siteId);
  const siteVersionId = sanitizeToken(handoff.siteVersionId);
  const correlationKey = sanitizeToken(handoff.correlationKey);
  if (siteId.startsWith("dev_readiness_seed_")) return true;
  if (siteVersionId.startsWith("dev_readiness_seed_")) return true;
  return correlationKey.startsWith("provider_handoff_readiness_ui_dev_seed_");
}

export function createProviderHandoffExecutionJobPreviewRouteHandlers(deps: Partial<ProviderHandoffExecutionJobPreviewRouteDeps> = {}) {
  const resolvedDeps: ProviderHandoffExecutionJobPreviewRouteDeps = {
    requireSuperadminUserId,
    getProviderExecutionHandoffByHandoffId,
    createRuntimeProviderExecutionJobPreview,
    resolveAgencyIdForSiteVersion,
    resolveAgencyIdForSite,
    requireAgencyActionContext,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        const handoffArtifact = normalizedHandoffId
          ? await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId)
          : null;

        if (handoffArtifact && !isDeterministicDevSeedHandoff(handoffArtifact)) {
          const siteVersionId = sanitizeToken(handoffArtifact.siteVersionId);
          const siteId = sanitizeToken(handoffArtifact.siteId);
          const agencyId = siteVersionId && isUuidLike(siteVersionId)
            ? await resolvedDeps.resolveAgencyIdForSiteVersion(siteVersionId)
            : isUuidLike(siteId)
              ? await resolvedDeps.resolveAgencyIdForSite(siteId)
              : null;
          if (agencyId) {
            await resolvedDeps.requireAgencyActionContext({ action: "run_migration", requestedAgencyId: agencyId });
          }
        }

        const executionJobPreview = resolvedDeps.createRuntimeProviderExecutionJobPreview({
          handoffId: normalizedHandoffId,
          handoffArtifact,
        });
        const status = !normalizedHandoffId ? 400 : !handoffArtifact ? 404 : 200;
        return Response.json({ executionJobPreview, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status: mapped.status });
        }
        const executionJobPreview = resolvedDeps.createRuntimeProviderExecutionJobPreview({
          handoffId: "",
          handoffArtifact: null,
        });
        return Response.json({ executionJobPreview, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status: 500 });
      }
    },
  };
}
