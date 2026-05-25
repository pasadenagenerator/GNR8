import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import type { RuntimeProviderGovernanceSnapshotRecord } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot-store";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

export type RuntimeProviderGovernanceDecisionPackageRecommendedAction =
  | "remain_blocked"
  | "await_authorization"
  | "governance_ready_execution_disabled"
  | "failed_closed"
  | "continue_review";
type DecisionPackageReadinessStatus = RuntimeProviderWorkerPickupEvidence["readinessStatus"] | "failed_closed";

export type RuntimeProviderGovernanceDecisionPackage = {
  packageId: string;
  handoffId: string;
  correlationKey: string;
  createdAt: string;
  readinessStatus: DecisionPackageReadinessStatus;
  executionBlocked: true;
  intentOnly: true;
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence | null;
  reviewSummary: RuntimeProviderOperatorReviewSummary;
  authorizationSummary: RuntimeProviderGovernanceAuthorizationSummary;
  governanceSnapshotSummary: {
    snapshotId: string;
    readinessStatus: string;
    createdAt: string;
  } | null;
  timelineSummary: {
    snapshotCount: number;
    latestSnapshotId: string;
    latestSnapshotCreatedAt: string;
  };
  decisionSignals: {
    riskLevel: string;
    approvalStatus: string;
    authorizationStatus: string;
    reviewStatus: string;
    recommendedAction: RuntimeProviderGovernanceDecisionPackageRecommendedAction;
  };
  diagnostics: string[];
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function pickLatestSnapshot(
  snapshots: readonly RuntimeProviderGovernanceSnapshotRecord[],
): RuntimeProviderGovernanceSnapshotRecord | null {
  return [...snapshots]
    .sort((a, b) => sanitizeToken(b.createdAt).localeCompare(sanitizeToken(a.createdAt)) || sanitizeToken(b.snapshotId).localeCompare(sanitizeToken(a.snapshotId)))[0] ?? null;
}

function resolveRecommendedAction(input: {
  handoffStatus: string;
  reviewStatus: string;
  authorizationStatus: string;
  hasMissingEvidence: boolean;
}): RuntimeProviderGovernanceDecisionPackageRecommendedAction {
  if (input.handoffStatus === "blocked") return "remain_blocked";
  if (input.reviewStatus === "approved_for_future_execution" && input.authorizationStatus === "pending_authorization") {
    return "await_authorization";
  }
  if (input.authorizationStatus === "authorized_for_future_execution") return "governance_ready_execution_disabled";
  if (input.hasMissingEvidence) return "failed_closed";
  return "continue_review";
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

function defaultAuthorizationSummary(): RuntimeProviderGovernanceAuthorizationSummary {
  return {
    authorizationStatus: "not_requested",
    authorizationReason: "",
    intentOnly: true,
    executionBlocked: true,
    authorizationCount: 0,
    latestAuthorizationId: "",
    latestCreatedAt: "",
  };
}

export function createRuntimeProviderGovernanceDecisionPackage(input: {
  handoffId?: string;
  correlationKey?: string;
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence | null;
  reviewSummary?: RuntimeProviderOperatorReviewSummary;
  authorizationSummary?: RuntimeProviderGovernanceAuthorizationSummary;
  governanceSnapshots?: readonly RuntimeProviderGovernanceSnapshotRecord[];
  createdAt?: string;
}): RuntimeProviderGovernanceDecisionPackage {
  const handoffId = sanitizeToken(input.handoffId) || sanitizeToken(input.handoffArtifact?.handoffId) || sanitizeToken(input.workerPickupEvidence?.handoffRef);
  const correlationKey =
    sanitizeToken(input.correlationKey) || sanitizeToken(input.handoffArtifact?.correlationKey) || sanitizeToken(input.workerPickupEvidence?.correlationKey);
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();

  const reviewSummary = input.reviewSummary ?? defaultReviewSummary();
  const authorizationSummary = input.authorizationSummary ?? defaultAuthorizationSummary();
  const snapshots = Array.isArray(input.governanceSnapshots) ? input.governanceSnapshots : [];
  const latestSnapshot = pickLatestSnapshot(snapshots);

  const hasMissingEvidence =
    !handoffId ||
    !correlationKey ||
    !input.handoffArtifact ||
    !input.workerPickupEvidence ||
    !sanitizeToken(input.handoffArtifact.approvalStatus) ||
    !sanitizeToken(input.handoffArtifact.riskLevel) ||
    !sanitizeToken(input.handoffArtifact.handoffStatus);

  const riskLevel = sanitizeToken(input.handoffArtifact?.riskLevel) || "unknown";
  const approvalStatus = sanitizeToken(input.handoffArtifact?.approvalStatus) || "unknown";
  const handoffStatus = sanitizeToken(input.handoffArtifact?.handoffStatus) || "unknown";
  const reviewStatus = sanitizeToken(reviewSummary.reviewSummaryStatus) || "no_reviews";
  const authorizationStatus = sanitizeToken(authorizationSummary.authorizationStatus) || "not_requested";

  const recommendedAction = resolveRecommendedAction({
    handoffStatus,
    reviewStatus,
    authorizationStatus,
    hasMissingEvidence,
  });

  const readinessStatus: DecisionPackageReadinessStatus = hasMissingEvidence
    ? "failed_closed"
    : ((sanitizeToken(input.workerPickupEvidence?.readinessStatus) || "failed_closed") as DecisionPackageReadinessStatus);

  const baseCorrelationKey = createRuntimeCorrelationKey({
    handoffId,
    correlationKey,
    createdAt,
    readinessStatus,
    recommendedAction,
    reviewStatus,
    authorizationStatus,
    snapshotCount: String(snapshots.length),
    latestSnapshotId: sanitizeToken(latestSnapshot?.snapshotId),
  });

  const packageId = createRuntimeCorrelationKey({
    governanceDecisionPackageCorrelationKey: baseCorrelationKey,
  });

  const diagnostics = uniqueSorted([
    ...(input.workerPickupEvidence?.diagnostics ?? []),
    hasMissingEvidence ? "GOVERNANCE_DECISION_PACKAGE_FAILED_CLOSED" : "GOVERNANCE_DECISION_PACKAGE_CREATED",
    "GOVERNANCE_DECISION_PACKAGE_EVIDENCE_AGGREGATED",
  ]);

  return {
    packageId,
    handoffId: handoffId || "missing_handoff_id",
    correlationKey: correlationKey || createRuntimeCorrelationKey({ diagnostic: "GOVERNANCE_DECISION_PACKAGE_FAILED_CLOSED" }),
    createdAt,
    readinessStatus,
    executionBlocked: true,
    intentOnly: true,
    handoffArtifact: input.handoffArtifact,
    workerPickupEvidence: input.workerPickupEvidence,
    reviewSummary,
    authorizationSummary: {
      ...authorizationSummary,
      intentOnly: true,
      executionBlocked: true,
    },
    governanceSnapshotSummary: latestSnapshot
      ? {
          snapshotId: sanitizeToken(latestSnapshot.snapshotId),
          readinessStatus: sanitizeToken(latestSnapshot.readinessStatus),
          createdAt: sanitizeToken(latestSnapshot.createdAt),
        }
      : null,
    timelineSummary: {
      snapshotCount: snapshots.length,
      latestSnapshotId: sanitizeToken(latestSnapshot?.snapshotId),
      latestSnapshotCreatedAt: sanitizeToken(latestSnapshot?.createdAt),
    },
    decisionSignals: {
      riskLevel,
      approvalStatus,
      authorizationStatus,
      reviewStatus,
      recommendedAction,
    },
    diagnostics,
  };
}
