import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import type { RuntimeProviderGovernanceDecisionPackage } from "@/gnr8/runtime/providers/runtime-provider-governance-decision-package";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";
import type { RuntimeProviderWorkerPickupEvidence } from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

export type RuntimeProviderExecutionReadinessGateStatus =
  | "execution_disabled"
  | "blocked"
  | "missing_requirements"
  | "theoretically_ready_but_disabled";

export type RuntimeProviderExecutionReadinessGateCondition = {
  condition: string;
  status: "passed" | "failed" | "not_applicable";
  reason: string;
};

export type RuntimeProviderExecutionReadinessGate = {
  gateId: string;
  handoffId: string;
  correlationKey: string;
  gateStatus: RuntimeProviderExecutionReadinessGateStatus;
  executionAllowed: false;
  executionBlocked: true;
  requiredConditions: RuntimeProviderExecutionReadinessGateCondition[];
  blockingReasons: string[];
  diagnostics: string[];
  createdAt: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function resolveConditionStatus(passed: boolean): "passed" | "failed" {
  return passed ? "passed" : "failed";
}

function resolveGateStatus(input: {
  handoffBlocked: boolean;
  approvalBlocked: boolean;
  hasPlannedJobs: boolean;
  reviewApproved: boolean;
  authorizationApproved: boolean;
}): RuntimeProviderExecutionReadinessGateStatus {
  if (input.handoffBlocked || input.approvalBlocked) return "blocked";
  if (!input.hasPlannedJobs || !input.reviewApproved || !input.authorizationApproved) return "missing_requirements";
  return "theoretically_ready_but_disabled";
}

function diagnosticForStatus(status: RuntimeProviderExecutionReadinessGateStatus): string {
  if (status === "blocked") return "EXECUTION_READINESS_GATE_BLOCKED";
  if (status === "missing_requirements") return "EXECUTION_READINESS_GATE_MISSING_REQUIREMENTS";
  if (status === "theoretically_ready_but_disabled") return "EXECUTION_READINESS_GATE_THEORETICALLY_READY_DISABLED";
  return "EXECUTION_READINESS_GATE_CREATED";
}

export function createRuntimeProviderExecutionReadinessGate(input: {
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence | null;
  reviewSummary: RuntimeProviderOperatorReviewSummary | null;
  authorizationSummary: RuntimeProviderGovernanceAuthorizationSummary | null;
  decisionPackage: RuntimeProviderGovernanceDecisionPackage | null;
  createdAt?: string;
}): RuntimeProviderExecutionReadinessGate {
  const handoffId =
    sanitizeToken(input.handoffArtifact?.handoffId) ||
    sanitizeToken(input.workerPickupEvidence?.handoffRef) ||
    sanitizeToken(input.decisionPackage?.handoffId) ||
    "missing_handoff_id";

  const baseCorrelationKey =
    sanitizeToken(input.handoffArtifact?.correlationKey) ||
    sanitizeToken(input.workerPickupEvidence?.correlationKey) ||
    sanitizeToken(input.decisionPackage?.correlationKey) ||
    createRuntimeCorrelationKey({ handoffId, boundary: "execution_disabled" });

  const handoffBlocked = sanitizeToken(input.handoffArtifact?.handoffStatus) === "blocked";
  const approvalBlocked = sanitizeToken(input.handoffArtifact?.approvalStatus) === "blocked";
  const hasPlannedJobs = Array.isArray(input.handoffArtifact?.plannedJobIds) && input.handoffArtifact!.plannedJobIds.length > 0;
  const reviewApproved = sanitizeToken(input.reviewSummary?.reviewSummaryStatus) === "approved_for_future_execution";
  const authorizationApproved = sanitizeToken(input.authorizationSummary?.authorizationStatus) === "authorized_for_future_execution";

  const gateStatus = resolveGateStatus({
    handoffBlocked,
    approvalBlocked,
    hasPlannedJobs,
    reviewApproved,
    authorizationApproved,
  });

  const requiredConditions: RuntimeProviderExecutionReadinessGateCondition[] = [
    {
      condition: "global_execution_boundary_active",
      status: "not_applicable",
      reason: "Execution is globally disabled by control-plane boundary policy.",
    },
    {
      condition: "handoff_status_not_blocked",
      status: resolveConditionStatus(!handoffBlocked),
      reason: handoffBlocked ? "Handoff status is blocked." : "Handoff is not blocked.",
    },
    {
      condition: "approval_status_not_blocked",
      status: resolveConditionStatus(!approvalBlocked),
      reason: approvalBlocked ? "Approval status is blocked." : "Approval is not blocked.",
    },
    {
      condition: "planned_jobs_present",
      status: resolveConditionStatus(hasPlannedJobs),
      reason: hasPlannedJobs ? "Planned jobs are present." : "No planned jobs were provided.",
    },
    {
      condition: "review_approved_for_future_execution",
      status: resolveConditionStatus(reviewApproved),
      reason: reviewApproved ? "Review is approved for future execution." : "Review is not approved for future execution.",
    },
    {
      condition: "authorization_authorized_for_future_execution",
      status: resolveConditionStatus(authorizationApproved),
      reason: authorizationApproved
        ? "Authorization is approved for future execution."
        : "Authorization is not approved for future execution.",
    },
  ];

  const blockingReasons = uniqueSorted([
    "global_execution_boundary_active",
    ...(handoffBlocked ? ["handoff_status_blocked"] : []),
    ...(approvalBlocked ? ["approval_status_blocked"] : []),
    ...(!hasPlannedJobs ? ["no_planned_jobs"] : []),
    ...(!reviewApproved ? ["review_not_approved"] : []),
    ...(!authorizationApproved ? ["authorization_not_authorized"] : []),
  ]);

  const diagnostics = uniqueSorted([
    "EXECUTION_READINESS_GATE_CREATED",
    diagnosticForStatus(gateStatus),
  ]);

  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();
  const correlationKey = createRuntimeCorrelationKey({
    baseCorrelationKey,
    handoffId,
    gateStatus,
    blockingReasons: blockingReasons.join(","),
    reviewStatus: sanitizeToken(input.reviewSummary?.reviewSummaryStatus),
    authorizationStatus: sanitizeToken(input.authorizationSummary?.authorizationStatus),
    decisionPackageId: sanitizeToken(input.decisionPackage?.packageId),
    createdAt,
  });

  const gateId = createRuntimeCorrelationKey({ executionReadinessGateCorrelationKey: correlationKey });

  return {
    gateId,
    handoffId,
    correlationKey,
    gateStatus,
    executionAllowed: false,
    executionBlocked: true,
    requiredConditions,
    blockingReasons,
    diagnostics,
    createdAt,
  };
}
