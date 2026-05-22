import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

export type RuntimeProviderGovernanceSnapshotDiagnosticCode =
  | "GOVERNANCE_SNAPSHOT_CREATED"
  | "GOVERNANCE_SNAPSHOT_FAILED_CLOSED";

export type RuntimeProviderGovernanceSnapshot = {
  snapshotId: string;
  handoffId: string;
  correlationKey: string;
  readinessStatus: RuntimeProviderWorkerPickupEvidence["readinessStatus"];
  executionBlocked: true;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence;
  reviewSummary: RuntimeProviderOperatorReviewSummary;
  diagnostics: string[];
  createdAt: string;
};

type GovernanceSnapshotInput = {
  handoffId?: string;
  correlationKey?: string;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence;
  reviewSummary: RuntimeProviderOperatorReviewSummary;
  diagnostics?: string[];
  createdAt?: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function defaultReviewSummary(): RuntimeProviderOperatorReviewSummary {
  return {
    reviewSummaryStatus: "no_reviews",
    reviewCount: 0,
    latestReviewer: "",
    latestCreatedAt: "",
    latestReason: "",
    intentOnly: true,
    executionBlocked: true,
  };
}

export function createRuntimeProviderGovernanceSnapshot(
  input: GovernanceSnapshotInput,
): RuntimeProviderGovernanceSnapshot {
  const handoffId = sanitizeToken(input.handoffId) || sanitizeToken(input.workerPickupEvidence.handoffRef);
  const baseCorrelationKey = sanitizeToken(input.correlationKey) || sanitizeToken(input.workerPickupEvidence.correlationKey);
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();
  const reviewSummary = input.reviewSummary ?? defaultReviewSummary();
  const baseDiagnostics = uniqueSorted(input.diagnostics ?? []);

  const missingRequired = uniqueSorted([
    handoffId ? "" : "handoffId",
    baseCorrelationKey ? "" : "correlationKey",
    sanitizeToken(input.workerPickupEvidence.handoffRef) ? "" : "workerPickupEvidence.handoffRef",
    sanitizeToken(input.workerPickupEvidence.correlationKey) ? "" : "workerPickupEvidence.correlationKey",
    sanitizeToken(input.workerPickupEvidence.readinessStatus) ? "" : "workerPickupEvidence.readinessStatus",
  ]);

  if (missingRequired.length > 0) {
    const failedCorrelationKey = createRuntimeCorrelationKey({
      diagnostic: "GOVERNANCE_SNAPSHOT_FAILED_CLOSED",
      missingRequired: missingRequired.join(","),
      handoffId,
      correlationKey: baseCorrelationKey,
    });
    const snapshotId = createRuntimeCorrelationKey({
      governanceSnapshotCorrelationKey: failedCorrelationKey,
    });
    return {
      snapshotId,
      handoffId: handoffId || "missing_handoff_id",
      correlationKey: failedCorrelationKey,
      readinessStatus: "failed_closed",
      executionBlocked: true,
      workerPickupEvidence: input.workerPickupEvidence,
      reviewSummary,
      diagnostics: uniqueSorted([
        ...baseDiagnostics,
        ...input.workerPickupEvidence.diagnostics,
        "GOVERNANCE_SNAPSHOT_FAILED_CLOSED",
      ]),
      createdAt,
    };
  }

  const correlationKey = createRuntimeCorrelationKey({
    governanceSnapshotDiagnostic: "GOVERNANCE_SNAPSHOT_CREATED",
    handoffId,
    baseCorrelationKey,
    readinessStatus: input.workerPickupEvidence.readinessStatus,
    reviewSummaryStatus: reviewSummary.reviewSummaryStatus,
    reviewCount: String(reviewSummary.reviewCount),
    workerPickupEvidenceCorrelationKey: input.workerPickupEvidence.correlationKey,
    workerPickupEvidenceDiagnostics: uniqueSorted(input.workerPickupEvidence.diagnostics).join(","),
    diagnostics: baseDiagnostics.join(","),
    createdAt,
  });
  const snapshotId = createRuntimeCorrelationKey({
    governanceSnapshotCorrelationKey: correlationKey,
  });

  return {
    snapshotId,
    handoffId,
    correlationKey,
    readinessStatus: input.workerPickupEvidence.readinessStatus,
    executionBlocked: true,
    workerPickupEvidence: input.workerPickupEvidence,
    reviewSummary,
    diagnostics: uniqueSorted([...baseDiagnostics, "GOVERNANCE_SNAPSHOT_CREATED"]),
    createdAt,
  };
}
