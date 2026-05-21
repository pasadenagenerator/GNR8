import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
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
  requireAgencyActionContext: typeof requireAgencyActionContext;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
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

async function resolveAgencyScope(deps: ProviderHandoffReadinessRouteDependencies, handoffArtifact: NonNullable<ProviderHandoffReadinessResponse["handoffArtifact"]>): Promise<string | null> {
  if (handoffArtifact.siteVersionId) {
    const agencyId = await deps.resolveAgencyIdForSiteVersion(handoffArtifact.siteVersionId);
    if (agencyId) return agencyId;
  }
  return deps.resolveAgencyIdForSite(handoffArtifact.siteId);
}

function buildReadinessResponse(
  handoffArtifact: ProviderHandoffReadinessResponse["handoffArtifact"],
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence,
): ProviderHandoffReadinessResponse {
  return {
    handoffArtifact,
    workerPickupEvidence,
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
          return Response.json(buildReadinessResponse(null, workerPickupEvidence), { status: 400 });
        }

        const persistedArtifact = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!persistedArtifact) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: null });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence), { status: 404 });
        }

        const sanitizedHandoffArtifact = sanitizeHandoffArtifact(persistedArtifact);
        if (!isSanitizedHandoffArtifactValid(sanitizedHandoffArtifact)) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: sanitizedHandoffArtifact });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence), { status: 422 });
        }

        const agencyId = await resolveAgencyScope(resolvedDeps, sanitizedHandoffArtifact);
        if (!agencyId) {
          const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({ handoffArtifact: sanitizedHandoffArtifact });
          return Response.json(buildReadinessResponse(null, workerPickupEvidence), { status: 403 });
        }

        await resolvedDeps.requireAgencyActionContext({
          action: "run_migration",
          requestedAgencyId: agencyId,
        });

        const workerPickupEvidence = resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence({
          handoffArtifact: sanitizedHandoffArtifact,
          executionIntent: "control_plane_simulation_only",
        });

        return Response.json(buildReadinessResponse(sanitizedHandoffArtifact, workerPickupEvidence), { status: 200 });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message }, { status: mapped.status });
        }
        const message = error instanceof Error ? error.message : "Internal server error";
        return Response.json({ error: message }, { status: 500 });
      }
    },
  };
}
