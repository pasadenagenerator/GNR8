import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { getProviderOperatorReviewsByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import { buildRuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import {
  createRuntimeProviderGovernanceSnapshot,
  type RuntimeProviderGovernanceSnapshot,
} from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot";
import {
  createRuntimeProviderWorkerPickupReadinessEvidence,
  type RuntimeProviderWorkerPickupEvidence,
} from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

export type ProviderHandoffReadinessResponse = {
  handoffArtifact: Readonly<{
    handoffId: string;
    artifactId: string;
    siteId: string;
    siteVersionId?: string;
    providerId: string;
    environment: string;
    capability: string;
    operationKind: string;
    approvalStatus: string;
    riskLevel: string;
    handoffStatus: "ready" | "blocked";
    plannedJobIds: string[];
    warnings: string[];
    blockers: string[];
    correlationKey: string;
  }> | null;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence;
  governanceSnapshot: RuntimeProviderGovernanceSnapshot;
  readinessStatus: RuntimeProviderWorkerPickupEvidence["readinessStatus"];
  executionBlocked: true;
  blockedReasons: string[];
  nextAllowedAction: RuntimeProviderWorkerPickupEvidence["nextAllowedAction"];
  diagnostics: string[];
  correlationKey: string;
};

export type ProviderHandoffReadinessRouteDependencies = {
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  createRuntimeProviderWorkerPickupReadinessEvidence: typeof createRuntimeProviderWorkerPickupReadinessEvidence;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForSiteVersion;
  resolveAgencyIdForSite: typeof resolveAgencyIdForSite;
  getProviderOperatorReviewsByHandoffId: typeof getProviderOperatorReviewsByHandoffId;
  buildRuntimeProviderOperatorReviewSummary: typeof buildRuntimeProviderOperatorReviewSummary;
  createRuntimeProviderGovernanceSnapshot: typeof createRuntimeProviderGovernanceSnapshot;
  requireAgencyActionContext: typeof requireAgencyActionContext;
};

const UUID_V4_TO_V8_LOOSE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVALID_SCOPE_DIAGNOSTIC = "PROVIDER_HANDOFF_READINESS_INVALID_SCOPE_IDENTIFIER:FAILED_CLOSED";
const UNRESOLVED_SCOPE_DIAGNOSTIC = "PROVIDER_HANDOFF_READINESS_SCOPE_UNRESOLVED:FAILED_CLOSED";
const DEV_SEED_SCOPE_DIAGNOSTIC = "PROVIDER_HANDOFF_READINESS_DEV_SEED_SCOPE_APPLIED:CONTROL_PLANE_ONLY";
const DEV_SEED_SITE_ID_PREFIX = "dev_readiness_seed_";
const DEV_SEED_AGENCY_ID = "dev_seed_agency";

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuidLike(value: string): boolean {
  return UUID_V4_TO_V8_LOOSE_REGEX.test(value);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function sanitizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return uniqueSorted(values.map((value) => sanitizeToken(value)).filter(Boolean));
}

function sanitizeHandoffArtifact(
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord,
): ProviderHandoffReadinessResponse["handoffArtifact"] {
  return {
    handoffId: sanitizeToken(handoffArtifact.handoffId),
    artifactId: sanitizeToken(handoffArtifact.artifactId),
    siteId: sanitizeToken(handoffArtifact.siteId),
    siteVersionId: sanitizeToken(handoffArtifact.siteVersionId) || undefined,
    providerId: sanitizeToken(handoffArtifact.providerId),
    environment: sanitizeToken(handoffArtifact.environment),
    capability: sanitizeToken(handoffArtifact.capability),
    operationKind: sanitizeToken(handoffArtifact.operationKind),
    approvalStatus: sanitizeToken(handoffArtifact.approvalStatus),
    riskLevel: sanitizeToken(handoffArtifact.riskLevel),
    handoffStatus: handoffArtifact.handoffStatus === "ready" ? "ready" : "blocked",
    plannedJobIds: sanitizeList(handoffArtifact.plannedJobIds),
    warnings: sanitizeList(handoffArtifact.warnings),
    blockers: sanitizeList(handoffArtifact.blockers),
    correlationKey: sanitizeToken(handoffArtifact.correlationKey),
  };
}

function isDeterministicDevSeedHandoff(
  handoffArtifact: NonNullable<ProviderHandoffReadinessResponse["handoffArtifact"]>,
): boolean {
  if (handoffArtifact.siteId.startsWith(DEV_SEED_SITE_ID_PREFIX)) return true;
  return handoffArtifact.correlationKey.startsWith("provider_handoff_readiness_ui_dev_seed_");
}

function isSanitizedHandoffArtifactValid(
  handoffArtifact: ProviderHandoffReadinessResponse["handoffArtifact"],
): handoffArtifact is NonNullable<ProviderHandoffReadinessResponse["handoffArtifact"]> {
  if (!handoffArtifact) return false;
  return (
    handoffArtifact.handoffId.length > 0 &&
    handoffArtifact.artifactId.length > 0 &&
    handoffArtifact.siteId.length > 0 &&
    handoffArtifact.providerId.length > 0 &&
    handoffArtifact.approvalStatus.length > 0 &&
    handoffArtifact.handoffStatus.length > 0 &&
    handoffArtifact.correlationKey.length > 0
  );
}

async function resolveAgencyScope(
  deps: ProviderHandoffReadinessRouteDependencies,
  handoffArtifact: NonNullable<ProviderHandoffReadinessResponse["handoffArtifact"]>,
): Promise<{ agencyId: string | null; diagnostics: string[] }> {
  if (isDeterministicDevSeedHandoff(handoffArtifact)) {
    return { agencyId: DEV_SEED_AGENCY_ID, diagnostics: [DEV_SEED_SCOPE_DIAGNOSTIC] };
  }
  if (handoffArtifact.siteVersionId) {
    if (!isUuidLike(handoffArtifact.siteVersionId)) {
      return { agencyId: null, diagnostics: [INVALID_SCOPE_DIAGNOSTIC, "PROVIDER_HANDOFF_READINESS_INVALID_SITE_VERSION_ID:FAILED_CLOSED"] };
    }
    const agencyId = await deps.resolveAgencyIdForSiteVersion(handoffArtifact.siteVersionId);
    if (agencyId) return { agencyId, diagnostics: [] };
  }
  if (!isUuidLike(handoffArtifact.siteId)) {
    return { agencyId: null, diagnostics: [INVALID_SCOPE_DIAGNOSTIC, "PROVIDER_HANDOFF_READINESS_INVALID_SITE_ID:FAILED_CLOSED"] };
  }
  const agencyId = await deps.resolveAgencyIdForSite(handoffArtifact.siteId);
  if (agencyId) return { agencyId, diagnostics: [] };
  return { agencyId: null, diagnostics: [UNRESOLVED_SCOPE_DIAGNOSTIC, "PROVIDER_HANDOFF_READINESS_SCOPE_UNRESOLVED_SITE_OR_SITE_VERSION:FAILED_CLOSED"] };
}

function buildReadinessResponse(
  handoffArtifact: ProviderHandoffReadinessResponse["handoffArtifact"],
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence,
  governanceSnapshot: RuntimeProviderGovernanceSnapshot,
): ProviderHandoffReadinessResponse {
  return {
    handoffArtifact,
    workerPickupEvidence,
    governanceSnapshot,
    readinessStatus: workerPickupEvidence.readinessStatus,
    executionBlocked: true,
    blockedReasons: sanitizeList(workerPickupEvidence.blockedReasons),
    nextAllowedAction: workerPickupEvidence.nextAllowedAction,
    diagnostics: sanitizeList(workerPickupEvidence.diagnostics),
    correlationKey: sanitizeToken(workerPickupEvidence.correlationKey),
  };
}

export function createProviderHandoffReadinessRouteHandlers(
  deps: Partial<ProviderHandoffReadinessRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffReadinessRouteDependencies = {
    getProviderExecutionHandoffByHandoffId,
    createRuntimeProviderWorkerPickupReadinessEvidence,
    resolveAgencyIdForSiteVersion,
    resolveAgencyIdForSite,
    getProviderOperatorReviewsByHandoffId,
    buildRuntimeProviderOperatorReviewSummary,
    createRuntimeProviderGovernanceSnapshot,
    requireAgencyActionContext,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      try {
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);

        if (!normalizedHandoffId) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: null });
          const governanceSnapshot = resolvedDeps.createRuntimeProviderGovernanceSnapshot({
            workerPickupEvidence,
            reviewSummary: resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: [] }).reviewSummary,
          });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence, governanceSnapshot), { status: 400 });
        }

        const persistedArtifact = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!persistedArtifact) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: null });
          const governanceSnapshot = resolvedDeps.createRuntimeProviderGovernanceSnapshot({
            handoffId: normalizedHandoffId,
            workerPickupEvidence,
            reviewSummary: resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: [] }).reviewSummary,
          });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence, governanceSnapshot), { status: 404 });
        }

        const sanitizedHandoffArtifact = sanitizeHandoffArtifact(persistedArtifact);
        const governanceHandoffArtifact: NonNullable<ProviderHandoffReadinessResponse["handoffArtifact"]> | null =
          sanitizedHandoffArtifact;
        if (!isSanitizedHandoffArtifactValid(sanitizedHandoffArtifact)) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: sanitizedHandoffArtifact });
          const governanceSnapshot = resolvedDeps.createRuntimeProviderGovernanceSnapshot({
            handoffId: governanceHandoffArtifact?.handoffId,
            correlationKey: governanceHandoffArtifact?.correlationKey,
            workerPickupEvidence,
            reviewSummary: resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: [] }).reviewSummary,
          });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence, governanceSnapshot), { status: 422 });
        }

        const scopeResolution = await resolveAgencyScope(resolvedDeps, sanitizedHandoffArtifact);
        const operatorReviews = await resolvedDeps.getProviderOperatorReviewsByHandoffId(sanitizedHandoffArtifact.handoffId);
        const reviewSummaryResult = resolvedDeps.buildRuntimeProviderOperatorReviewSummary({ reviews: operatorReviews.reviews });
        const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({
          handoffArtifact: sanitizedHandoffArtifact,
          executionIntent: "control_plane_simulation_only",
        });
        if (!scopeResolution.agencyId) {
          const failClosedEvidence: RuntimeProviderWorkerPickupEvidence = {
            ...workerPickupEvidence,
            readinessStatus: "failed_closed",
            blockedReasons: uniqueSorted([...workerPickupEvidence.blockedReasons, "agency_scope_unresolved_failed_closed"]),
            diagnostics: uniqueSorted([
              ...workerPickupEvidence.diagnostics,
              "PROVIDER_WORKER_PICKUP_EVIDENCE_FAILED_CLOSED:SCOPE_UNRESOLVED",
              ...scopeResolution.diagnostics,
            ]),
          };
          const governanceSnapshot = resolvedDeps.createRuntimeProviderGovernanceSnapshot({
            handoffId: sanitizedHandoffArtifact.handoffId,
            correlationKey: sanitizedHandoffArtifact.correlationKey,
            workerPickupEvidence: failClosedEvidence,
            reviewSummary: reviewSummaryResult.reviewSummary,
            diagnostics: [...reviewSummaryResult.diagnostics, ...scopeResolution.diagnostics],
          });
          return Response.json(buildReadinessResponse(sanitizedHandoffArtifact, failClosedEvidence, governanceSnapshot), { status: 422 });
        }

        if (!scopeResolution.diagnostics.includes(DEV_SEED_SCOPE_DIAGNOSTIC)) {
          await resolvedDeps.requireAgencyActionContext({
            action: "run_migration",
            requestedAgencyId: scopeResolution.agencyId,
          });
        }

        const successEvidence: RuntimeProviderWorkerPickupEvidence = {
          ...workerPickupEvidence,
          diagnostics: uniqueSorted([...workerPickupEvidence.diagnostics, ...scopeResolution.diagnostics]),
        };
        const governanceSnapshot = resolvedDeps.createRuntimeProviderGovernanceSnapshot({
          handoffId: sanitizedHandoffArtifact.handoffId,
          correlationKey: sanitizedHandoffArtifact.correlationKey,
          workerPickupEvidence: successEvidence,
          reviewSummary: reviewSummaryResult.reviewSummary,
          diagnostics: [...reviewSummaryResult.diagnostics, ...scopeResolution.diagnostics],
        });

        return Response.json(buildReadinessResponse(sanitizedHandoffArtifact, successEvidence, governanceSnapshot), { status: 200 });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message }, { status: mapped.status });
        }
        return Response.json({ error: "provider_handoff_readiness_failed_closed" }, { status: 500 });
      }
    },
  };
}
