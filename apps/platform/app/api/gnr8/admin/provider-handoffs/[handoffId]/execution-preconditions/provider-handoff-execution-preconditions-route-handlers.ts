import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { buildRuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import { getProviderGovernanceAuthorizationsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization-repository";
import { createRuntimeProviderExecutionPreconditionsLedger } from "@/gnr8/runtime/providers/runtime-provider-execution-preconditions-ledger";
import { buildRuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import { getProviderOperatorReviewsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

const UUID_V4_TO_V8_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProviderHandoffExecutionPreconditionsRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderOperatorReviewsByHandoffId: typeof getProviderOperatorReviewsByHandoffId;
  buildRuntimeProviderOperatorReviewSummary: typeof buildRuntimeProviderOperatorReviewSummary;
  getProviderGovernanceAuthorizationsByHandoffId: typeof getProviderGovernanceAuthorizationsByHandoffId;
  buildRuntimeProviderGovernanceAuthorizationSummary: typeof buildRuntimeProviderGovernanceAuthorizationSummary;
  createRuntimeProviderExecutionPreconditionsLedger: typeof createRuntimeProviderExecutionPreconditionsLedger;
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

export function createProviderHandoffExecutionPreconditionsRouteHandlers(
  deps: Partial<ProviderHandoffExecutionPreconditionsRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffExecutionPreconditionsRouteDependencies = {
    requireSuperadminUserId,
    getProviderExecutionHandoffByHandoffId,
    getProviderOperatorReviewsByHandoffId,
    buildRuntimeProviderOperatorReviewSummary,
    getProviderGovernanceAuthorizationsByHandoffId,
    buildRuntimeProviderGovernanceAuthorizationSummary,
    createRuntimeProviderExecutionPreconditionsLedger,
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

        const [reviews, authorizations] = handoffArtifact
          ? await Promise.all([
              resolvedDeps.getProviderOperatorReviewsByHandoffId(handoffArtifact.handoffId),
              resolvedDeps.getProviderGovernanceAuthorizationsByHandoffId(handoffArtifact.handoffId),
            ])
          : [{ reviews: [], diagnostics: [] }, { authorizations: [], diagnostics: [] }];

        const reviewSummary = resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: reviews.reviews }).reviewSummary;
        const authorizationSummary = resolvedDeps.buildRuntimeProviderGovernanceAuthorizationSummary({ artifacts: authorizations.authorizations }).summary;
        const executionPreconditionsLedger = resolvedDeps.createRuntimeProviderExecutionPreconditionsLedger({
          handoffArtifact,
          reviewSummary,
          authorizationSummary,
          sandboxGateReady: true,
          globalExecutionBoundaryActive: true,
        });

        const status = !normalizedHandoffId ? 400 : !handoffArtifact ? 404 : 200;
        return Response.json({ executionPreconditionsLedger, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status: mapped.status });
        }
        const executionPreconditionsLedger = resolvedDeps.createRuntimeProviderExecutionPreconditionsLedger({
          handoffArtifact: null,
          reviewSummary: null,
          authorizationSummary: null,
          sandboxGateReady: true,
          globalExecutionBoundaryActive: true,
        });
        return Response.json({ executionPreconditionsLedger, executionAllowed: false, executionBlocked: true, intentOnly: true }, { status: 500 });
      }
    },
  };
}
