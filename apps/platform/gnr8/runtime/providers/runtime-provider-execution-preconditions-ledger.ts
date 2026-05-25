import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import type { RuntimeProviderGovernanceAuthorizationSummary } from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import type { RuntimeProviderOperatorReviewSummary } from "@/gnr8/runtime/providers/runtime-provider-operator-review";

export type RuntimeProviderExecutionPreconditionCategory = "governance" | "approval" | "execution" | "provider" | "safety";
export type RuntimeProviderExecutionPreconditionStatus = "satisfied" | "missing" | "blocked";
export type RuntimeProviderExecutionPreconditionsOverallStatus =
  | "incomplete"
  | "satisfied_but_execution_disabled"
  | "blocked";

export type RuntimeProviderExecutionPreconditionRequirement = {
  requirementId: string;
  category: RuntimeProviderExecutionPreconditionCategory;
  name: string;
  status: RuntimeProviderExecutionPreconditionStatus;
  reason: string;
};

export type RuntimeProviderExecutionPreconditionsLedger = {
  ledgerId: string;
  handoffId: string;
  correlationKey: string;
  overallStatus: RuntimeProviderExecutionPreconditionsOverallStatus;
  executionAllowed: false;
  executionBlocked: true;
  requirements: RuntimeProviderExecutionPreconditionRequirement[];
  missingRequirements: RuntimeProviderExecutionPreconditionRequirement[];
  blockedRequirements: RuntimeProviderExecutionPreconditionRequirement[];
  diagnostics: string[];
  createdAt: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusDiagnostic(status: RuntimeProviderExecutionPreconditionsOverallStatus): string {
  if (status === "blocked") return "EXECUTION_PRECONDITIONS_BLOCKED";
  if (status === "incomplete") return "EXECUTION_PRECONDITIONS_INCOMPLETE";
  return "EXECUTION_PRECONDITIONS_EXECUTION_DISABLED";
}

export function createRuntimeProviderExecutionPreconditionsLedger(input: {
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
  reviewSummary: RuntimeProviderOperatorReviewSummary | null;
  authorizationSummary: RuntimeProviderGovernanceAuthorizationSummary | null;
  sandboxGateReady?: boolean;
  globalExecutionBoundaryActive?: boolean;
  createdAt?: string;
}): RuntimeProviderExecutionPreconditionsLedger {
  const handoffId = sanitizeToken(input.handoffArtifact?.handoffId) || "missing_handoff_id";
  const createdAt = sanitizeToken(input.createdAt) || new Date(0).toISOString();
  const sandboxGateReady = input.sandboxGateReady !== false;
  const globalExecutionBoundaryActive = input.globalExecutionBoundaryActive !== false;
  const approvalStatus = sanitizeToken(input.handoffArtifact?.approvalStatus);
  const handoffStatus = sanitizeToken(input.handoffArtifact?.handoffStatus);
  const plannedJobCount = Array.isArray(input.handoffArtifact?.plannedJobIds) ? input.handoffArtifact!.plannedJobIds.length : 0;
  const reviewStatus = sanitizeToken(input.reviewSummary?.reviewSummaryStatus);
  const authorizationStatus = sanitizeToken(input.authorizationSummary?.authorizationStatus);

  const requirements: RuntimeProviderExecutionPreconditionRequirement[] = [
    {
      requirementId: "governance_review_approved_for_future_execution",
      category: "governance",
      name: "review approved_for_future_execution",
      status: reviewStatus === "approved_for_future_execution" ? "satisfied" : "missing",
      reason:
        reviewStatus === "approved_for_future_execution"
          ? "Review is approved for future execution."
          : `Review summary status is ${reviewStatus || "missing"}.`,
    },
    {
      requirementId: "governance_authorization_authorized_for_future_execution",
      category: "governance",
      name: "authorization authorized_for_future_execution",
      status: authorizationStatus === "authorized_for_future_execution" ? "satisfied" : "missing",
      reason:
        authorizationStatus === "authorized_for_future_execution"
          ? "Authorization is approved for future execution."
          : `Authorization status is ${authorizationStatus || "missing"}.`,
    },
    {
      requirementId: "approval_status_not_blocked",
      category: "approval",
      name: "approval_status not blocked",
      status: approvalStatus === "blocked" ? "blocked" : approvalStatus ? "satisfied" : "missing",
      reason:
        approvalStatus === "blocked"
          ? "Approval status is blocked."
          : approvalStatus
            ? `Approval status is ${approvalStatus} (not blocked).`
            : "Approval status is missing.",
    },
    {
      requirementId: "execution_planned_jobs_present",
      category: "execution",
      name: "planned jobs present",
      status: plannedJobCount > 0 ? "satisfied" : "missing",
      reason: plannedJobCount > 0 ? `${plannedJobCount} planned jobs are present.` : "No planned jobs are present.",
    },
    {
      requirementId: "execution_handoff_status_not_blocked",
      category: "execution",
      name: "handoff status not blocked",
      status: handoffStatus === "blocked" ? "blocked" : handoffStatus ? "satisfied" : "missing",
      reason:
        handoffStatus === "blocked"
          ? "Handoff status is blocked."
          : handoffStatus
            ? `Handoff status is ${handoffStatus} (not blocked).`
            : "Handoff status is missing.",
    },
    {
      requirementId: "provider_sandbox_gate_ready",
      category: "provider",
      name: "sandbox gate ready",
      status: sandboxGateReady ? "satisfied" : "missing",
      reason: sandboxGateReady ? "Sandbox gate is ready." : "Sandbox gate is not ready.",
    },
    {
      requirementId: "safety_global_execution_boundary_active",
      category: "safety",
      name: "global execution boundary active",
      status: globalExecutionBoundaryActive ? "satisfied" : "blocked",
      reason: globalExecutionBoundaryActive
        ? "Global execution boundary is active."
        : "Global execution boundary is not active; fail-closed blocked.",
    },
  ];

  const blockedRequirements = requirements.filter((requirement) => requirement.status === "blocked");
  const missingRequirements = requirements.filter((requirement) => requirement.status === "missing");

  const overallStatus: RuntimeProviderExecutionPreconditionsOverallStatus =
    blockedRequirements.length > 0
      ? "blocked"
      : missingRequirements.length > 0
        ? "incomplete"
        : "satisfied_but_execution_disabled";

  const baseCorrelationKey = sanitizeToken(input.handoffArtifact?.correlationKey) || "missing_handoff_correlation_key";
  const correlationKey = createRuntimeCorrelationKey({
    baseCorrelationKey,
    handoffId,
    overallStatus,
    blockedRequirements: blockedRequirements.map((requirement) => requirement.requirementId).join(","),
    missingRequirements: missingRequirements.map((requirement) => requirement.requirementId).join(","),
    createdAt,
  });
  const ledgerId = createRuntimeCorrelationKey({ executionPreconditionsLedgerCorrelationKey: correlationKey });
  const diagnostics = uniqueSorted(["EXECUTION_PRECONDITIONS_LEDGER_CREATED", statusDiagnostic(overallStatus)]);

  return {
    ledgerId,
    handoffId,
    correlationKey,
    overallStatus,
    executionAllowed: false,
    executionBlocked: true,
    requirements,
    missingRequirements,
    blockedRequirements,
    diagnostics,
    createdAt,
  };
}
