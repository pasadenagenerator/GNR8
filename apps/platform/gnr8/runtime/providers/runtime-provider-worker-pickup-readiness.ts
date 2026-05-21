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

export type RuntimeProviderWorkerPickupSimulationDiagnosticCode =
  | "WORKER_PICKUP_SIMULATION_STARTED"
  | "WORKER_PICKUP_SIMULATION_READY_BLOCKED"
  | "WORKER_PICKUP_SIMULATION_NOT_READY"
  | "WORKER_PICKUP_SIMULATION_FAILED_CLOSED"
  | "WORKER_PICKUP_SIMULATION_EXECUTION_INTENT_BLOCKED";

export type RuntimeProviderWorkerPickupSimulationDiagnostic = {
  code: RuntimeProviderWorkerPickupSimulationDiagnosticCode;
  reasonCode: string;
};

export type RuntimeProviderWorkerPickupSimulationReadiness = "pickup_ready" | "pickup_not_ready" | "failed_closed";

export type RuntimeProviderWorkerPickupSimulationExecutionIntent = "control_plane_simulation_only" | "execute";

export type RuntimeProviderWorkerPickupSimulationResult = {
  handoffRef: string;
  artifactRef: string;
  providerId: string;
  plannedJobRefs: string[];
  approvalStatus: string;
  handoffStatus: string;
  readinessStatus: RuntimeProviderWorkerPickupSimulationReadiness;
  executionBlocked: true;
  blockedReasons: string[];
  diagnostics: RuntimeProviderWorkerPickupSimulationDiagnostic[];
  nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only";
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

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return uniqueSorted(values.map((value) => sanitizeToken(value)).filter(Boolean));
}

function missingRequiredFields(
  handoffArtifact: Partial<RuntimeProviderExecutionHandoffArtifact> | null | undefined,
): string[] {
  if (!handoffArtifact) return ["handoff_artifact"];

  const missing: string[] = [];
  if (!sanitizeToken(handoffArtifact.handoffId)) missing.push("handoffId");
  if (!sanitizeToken(handoffArtifact.artifactId)) missing.push("artifactId");
  if (!sanitizeToken(handoffArtifact.providerId)) missing.push("providerId");
  if (!sanitizeToken(handoffArtifact.approvalStatus)) missing.push("approvalStatus");
  if (!sanitizeToken(handoffArtifact.handoffStatus)) missing.push("handoffStatus");
  if (!Array.isArray(handoffArtifact.plannedJobIds)) missing.push("plannedJobIds");
  if (!sanitizeToken(handoffArtifact.correlationKey)) missing.push("correlationKey");
  return missing.sort((a, b) => a.localeCompare(b));
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

export function simulateRuntimeProviderWorkerPickupReadiness(input: {
  handoffArtifact: Partial<RuntimeProviderExecutionHandoffArtifact> | null | undefined;
  executionIntent?: RuntimeProviderWorkerPickupSimulationExecutionIntent;
}): RuntimeProviderWorkerPickupSimulationResult {
  const diagnostics: RuntimeProviderWorkerPickupSimulationDiagnostic[] = [
    { code: "WORKER_PICKUP_SIMULATION_STARTED", reasonCode: "SIMULATION_STARTED" },
  ];

  const handoffArtifact = input.handoffArtifact;
  const missingFields = missingRequiredFields(handoffArtifact);
  const fallbackCorrelation = createRuntimeCorrelationKey({
    diagnostic: "WORKER_PICKUP_SIMULATION_FAILED_CLOSED",
    missingFields: missingFields.join(","),
  });

  const handoffRef = sanitizeToken(handoffArtifact?.handoffId) || "missing_handoff_id";
  const artifactRef = sanitizeToken(handoffArtifact?.artifactId) || "missing_artifact_id";
  const providerId = sanitizeToken(handoffArtifact?.providerId) || "missing_provider_id";
  const approvalStatus = sanitizeToken(handoffArtifact?.approvalStatus) || "missing_approval_status";
  const handoffStatus = sanitizeToken(handoffArtifact?.handoffStatus) || "missing_handoff_status";
  const plannedJobRefs = sanitizeList(handoffArtifact?.plannedJobIds);
  const correlationKey = sanitizeToken(handoffArtifact?.correlationKey) || fallbackCorrelation;

  if (missingFields.length > 0) {
    diagnostics.push({
      code: "WORKER_PICKUP_SIMULATION_FAILED_CLOSED",
      reasonCode: `MISSING_REQUIRED_HANDOFF_FIELDS:${missingFields.join(",")}`,
    });
    return {
      handoffRef,
      artifactRef,
      providerId,
      plannedJobRefs,
      approvalStatus,
      handoffStatus,
      readinessStatus: "failed_closed",
      executionBlocked: true,
      blockedReasons: [`missing_required_handoff_fields:${missingFields.join(",")}`],
      diagnostics,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      correlationKey,
    };
  }

  if ((input.executionIntent ?? "control_plane_simulation_only") !== "control_plane_simulation_only") {
    diagnostics.push({
      code: "WORKER_PICKUP_SIMULATION_EXECUTION_INTENT_BLOCKED",
      reasonCode: "EXECUTION_INTENT_NOT_ALLOWED",
    });
    return {
      handoffRef,
      artifactRef,
      providerId,
      plannedJobRefs,
      approvalStatus,
      handoffStatus,
      readinessStatus: "pickup_not_ready",
      executionBlocked: true,
      blockedReasons: ["execution_intent_blocked"],
      diagnostics,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      correlationKey,
    };
  }

  const report = createRuntimeProviderWorkerPickupReadinessReport(handoffArtifact as RuntimeProviderExecutionHandoffArtifact);

  if (report.readinessStatus === "ready_for_worker") {
    diagnostics.push({
      code: "WORKER_PICKUP_SIMULATION_READY_BLOCKED",
      reasonCode: "PICKUP_READY_EXECUTION_BLOCKED_BY_CONTROL_PLANE_BOUNDARY",
    });
    return {
      handoffRef,
      artifactRef,
      providerId,
      plannedJobRefs,
      approvalStatus,
      handoffStatus,
      readinessStatus: "pickup_ready",
      executionBlocked: true,
      blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
      diagnostics,
      nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
      correlationKey,
    };
  }

  diagnostics.push({
    code: "WORKER_PICKUP_SIMULATION_NOT_READY",
    reasonCode: "PICKUP_NOT_READY_FROM_HANDOFF_CONDITIONS",
  });
  return {
    handoffRef,
    artifactRef,
    providerId,
    plannedJobRefs,
    approvalStatus,
    handoffStatus,
    readinessStatus: "pickup_not_ready",
    executionBlocked: true,
    blockedReasons: uniqueSorted([...report.blockers, ...report.missingConditions]),
    diagnostics,
    nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
    correlationKey,
  };
}
