import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { buildRuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import { getProviderGovernanceAuthorizationsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization-repository";
import { createRuntimeProviderGovernanceDecisionPackage } from "@/gnr8/runtime/providers/runtime-provider-governance-decision-package";
import { getProviderGovernanceTimelineByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot-repository";
import { buildRuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import { getProviderOperatorReviewsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import { createRuntimeProviderWorkerPickupReadinessEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

const UUID_V4_TO_V8_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProviderHandoffDecisionPackageRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderOperatorReviewsByHandoffId: typeof getProviderOperatorReviewsByHandoffId;
  buildRuntimeProviderOperatorReviewSummary: typeof buildRuntimeProviderOperatorReviewSummary;
  getProviderGovernanceAuthorizationsByHandoffId: typeof getProviderGovernanceAuthorizationsByHandoffId;
  buildRuntimeProviderGovernanceAuthorizationSummary: typeof buildRuntimeProviderGovernanceAuthorizationSummary;
  getProviderGovernanceTimelineByHandoffId: typeof getProviderGovernanceTimelineByHandoffId;
  createRuntimeProviderWorkerPickupReadinessEvidence: typeof createRuntimeProviderWorkerPickupReadinessEvidence;
  createRuntimeProviderGovernanceDecisionPackage: typeof createRuntimeProviderGovernanceDecisionPackage;
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

export function createProviderHandoffDecisionPackageRouteHandlers(
  deps: Partial<ProviderHandoffDecisionPackageRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffDecisionPackageRouteDependencies = {
    requireSuperadminUserId,
    getProviderExecutionHandoffByHandoffId,
    getProviderOperatorReviewsByHandoffId,
    buildRuntimeProviderOperatorReviewSummary,
    getProviderGovernanceAuthorizationsByHandoffId,
    buildRuntimeProviderGovernanceAuthorizationSummary,
    getProviderGovernanceTimelineByHandoffId,
    createRuntimeProviderWorkerPickupReadinessEvidence,
    createRuntimeProviderGovernanceDecisionPackage,
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
        if (!normalizedHandoffId) {
          const decisionPackage = resolvedDeps.createRuntimeProviderGovernanceDecisionPackage({
            handoffId: normalizedHandoffId,
            handoffArtifact: null,
            workerPickupEvidence: null,
          });
          return Response.json({ decisionPackage, executionBlocked: true, intentOnly: true }, { status: 400 });
        }

        const handoffArtifact = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoffArtifact) {
          const decisionPackage = resolvedDeps.createRuntimeProviderGovernanceDecisionPackage({
            handoffId: normalizedHandoffId,
            handoffArtifact: null,
            workerPickupEvidence: null,
          });
          return Response.json({ decisionPackage, executionBlocked: true, intentOnly: true }, { status: 404 });
        }

        if (!isDeterministicDevSeedHandoff(handoffArtifact)) {
          const siteVersionId = sanitizeToken(handoffArtifact.siteVersionId);
          const siteId = sanitizeToken(handoffArtifact.siteId);
          const agencyId = siteVersionId && isUuidLike(siteVersionId)
            ? await resolvedDeps.resolveAgencyIdForSiteVersion(siteVersionId)
            : isUuidLike(siteId)
              ? await resolvedDeps.resolveAgencyIdForSite(siteId)
              : null;
          if (!agencyId) {
            const decisionPackage = resolvedDeps.createRuntimeProviderGovernanceDecisionPackage({
              handoffId: normalizedHandoffId,
              correlationKey: handoffArtifact.correlationKey,
              handoffArtifact,
              workerPickupEvidence: resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({
                handoffArtifact,
                executionIntent: "control_plane_simulation_only",
              }),
            });
            return Response.json({ decisionPackage, executionBlocked: true, intentOnly: true }, { status: 422 });
          }
          await resolvedDeps.requireAgencyActionContext({ action: "run_migration", requestedAgencyId: agencyId });
        }

        const [reviews, authorizations, timeline] = await Promise.all([
          resolvedDeps.getProviderOperatorReviewsByHandoffId(normalizedHandoffId),
          resolvedDeps.getProviderGovernanceAuthorizationsByHandoffId(normalizedHandoffId),
          resolvedDeps.getProviderGovernanceTimelineByHandoffId(normalizedHandoffId),
        ]);

        const reviewSummary = resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: reviews.reviews }).reviewSummary;
        const authorizationSummary = resolvedDeps.buildRuntimeProviderGovernanceAuthorizationSummary({ artifacts: authorizations.authorizations }).summary;
        const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({
          handoffArtifact,
          executionIntent: "control_plane_simulation_only",
        });

        const decisionPackage = resolvedDeps.createRuntimeProviderGovernanceDecisionPackage({
          handoffId: normalizedHandoffId,
          correlationKey: handoffArtifact.correlationKey,
          handoffArtifact,
          workerPickupEvidence,
          reviewSummary,
          authorizationSummary,
          governanceSnapshots: timeline.snapshots,
        });

        return Response.json({ decisionPackage, executionBlocked: true, intentOnly: true }, { status: 200 });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message }, { status: mapped.status });
        }
        const decisionPackage = resolvedDeps.createRuntimeProviderGovernanceDecisionPackage({
          handoffArtifact: null,
          workerPickupEvidence: null,
        });
        return Response.json({ decisionPackage, executionBlocked: true, intentOnly: true }, { status: 500 });
      }
    },
  };
}
