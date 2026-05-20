import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifact } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff";

export type RuntimeProviderWorkerPickupReadinessStatus = "ready_for_worker" | "not_ready" | "blocked";

export type RuntimeProviderWorkerPickupReadinessReport = {
  handoffId: string;
  providerId: string;
  environment: string;
  capability: string;
  operationKind: string;

  readinessStatus: RuntimeProviderWorkerPickupReadinessStatus;

  requiredConditions: string[];
  satisfiedConditions: string[];
  missingConditions: string[];

  warnings: string[];
  blockers: string[];

  correlationKey: string;
};

const REQUIRED_CONDITIONS = [
  "handoff_status_ready",
  "non_live_environment",
  "has_planned_jobs",
  "approval_status_approved",
] as const;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function isExecutableProviderHandoff(handoffArtifact: RuntimeProviderExecutionHandoffArtifact): boolean {
  return handoffArtifact.providerId !== "manual";
}

export function createRuntimeProviderWorkerPickupReadinessReport(
  handoffArtifact: RuntimeProviderExecutionHandoffArtifact,
): RuntimeProviderWorkerPickupReadinessReport {
  const conditions = {
    handoff_status_ready: handoffArtifact.handoffStatus === "ready",
    non_live_environment: handoffArtifact.environment !== "live",
    has_planned_jobs: handoffArtifact.plannedJobIds.length > 0,
    approval_status_approved: handoffArtifact.approvalStatus === "approved",
  } as const;

  const satisfiedConditions = REQUIRED_CONDITIONS.filter((condition) => conditions[condition]);
  const missingConditions = REQUIRED_CONDITIONS.filter((condition) => !conditions[condition]);

  const warnings: string[] = [];
  const blockers: string[] = [];

  if (handoffArtifact.environment === "live") {
    blockers.push("live_environment_provider_execution_blocked");
  }

  if (handoffArtifact.handoffStatus === "blocked") {
    blockers.push("handoff_status_blocked");
  }

  if (handoffArtifact.approvalStatus !== "approved" && handoffArtifact.handoffStatus === "blocked") {
    blockers.push("approval_status_not_approved_when_handoff_blocked");
  }

  if (isExecutableProviderHandoff(handoffArtifact) && handoffArtifact.plannedJobIds.length === 0) {
    blockers.push("executable_provider_handoff_has_no_planned_jobs");
  }

  if (handoffArtifact.approvalStatus !== "approved" && handoffArtifact.handoffStatus !== "blocked") {
    warnings.push("approval_status_not_approved");
  }

  if (handoffArtifact.handoffStatus !== "ready" && handoffArtifact.handoffStatus !== "blocked") {
    warnings.push("handoff_status_not_ready");
  }

  const uniqueWarnings = uniqueSorted(warnings);
  const uniqueBlockers = uniqueSorted(blockers);

  const readinessStatus: RuntimeProviderWorkerPickupReadinessStatus =
    uniqueBlockers.length > 0 ? "blocked" : missingConditions.length === 0 ? "ready_for_worker" : "not_ready";

  const correlationKey = createRuntimeCorrelationKey({
    handoffArtifactCorrelationKey: handoffArtifact.correlationKey,
    handoffId: handoffArtifact.handoffId,
    providerId: handoffArtifact.providerId,
    environment: handoffArtifact.environment,
    capability: handoffArtifact.capability,
    operationKind: handoffArtifact.operationKind,
    readinessStatus,
    requiredConditions: REQUIRED_CONDITIONS.join(","),
    satisfiedConditions: satisfiedConditions.join(","),
    missingConditions: missingConditions.join(","),
    warnings: uniqueWarnings.join(","),
    blockers: uniqueBlockers.join(","),
  });

  return {
    handoffId: handoffArtifact.handoffId,
    providerId: handoffArtifact.providerId,
    environment: handoffArtifact.environment,
    capability: handoffArtifact.capability,
    operationKind: handoffArtifact.operationKind,
    readinessStatus,
    requiredConditions: [...REQUIRED_CONDITIONS],
    satisfiedConditions,
    missingConditions,
    warnings: uniqueWarnings,
    blockers: uniqueBlockers,
    correlationKey,
  };
}
