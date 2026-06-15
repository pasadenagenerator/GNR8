/**
 * Phase 8A-1 reconstruction dry-run boundary contract.
 *
 * This module defines the deterministic metadata boundary between a
 * Reconstruction Package and a future Reconstruction Dry Run. It does not
 * execute a dry run, execute reconstruction, call AI systems, generate React,
 * generate blocks, persist reconstruction, dispatch workers, create live
 * websites, modify domains or DNS, write runtime content, or publish anything.
 */

import type {
  ReconstructionPackage,
  ReconstructionPackageLimitationSeverity,
  ReconstructionPackageStatus,
} from "./reconstruction-package-contract";
import type { ReconstructionPlanningRouteScope } from "./reconstruction-planning-contract";

export const RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION = "8A-1" as const;

export const RECONSTRUCTION_DRY_RUN_STATUSES = [
  "not_started",
  "planned",
  "simulation_ready",
  "simulated",
  "blocked",
] as const;
export type ReconstructionDryRunStatus = (typeof RECONSTRUCTION_DRY_RUN_STATUSES)[number];

export const RECONSTRUCTION_SIMULATION_STATUSES = [
  "unavailable",
  "pending",
  "complete",
  "failed",
] as const;
export type ReconstructionSimulationStatus =
  (typeof RECONSTRUCTION_SIMULATION_STATUSES)[number];

export const RECONSTRUCTION_GENERATED_OUTPUT_TYPES = [
  "route_model",
  "section_model",
  "block_model",
  "content_model",
  "design_token_model",
  "navigation_model",
  "unknown",
] as const;
export type ReconstructionGeneratedOutputType =
  (typeof RECONSTRUCTION_GENERATED_OUTPUT_TYPES)[number];

export const RECONSTRUCTION_DRY_RUN_MAY_RULES = [
  "read_reconstruction_package",
  "read_evidence_capture_artifacts",
  "read_reconstruction_candidates",
  "read_review_decisions",
  "produce_simulation_artifacts",
] as const;
export type ReconstructionDryRunMayRule = (typeof RECONSTRUCTION_DRY_RUN_MAY_RULES)[number];

export const RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES = [
  "publish",
  "modify_source_site",
  "modify_production_content",
  "execute_migrations",
  "create_live_websites",
  "modify_domains",
  "modify_dns",
  "write_runtime_content",
] as const;
export type ReconstructionDryRunMustNotRule =
  (typeof RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES)[number];

export type ReconstructionDryRunBoundary = {
  may: ReconstructionDryRunMayRule[];
  mustNot: ReconstructionDryRunMustNotRule[];
  outputApprovalState: "informational_only";
  futureApprovalRequired: true;
};

export const RECONSTRUCTION_DRY_RUN_BOUNDARY: ReconstructionDryRunBoundary = {
  may: [...RECONSTRUCTION_DRY_RUN_MAY_RULES],
  mustNot: [...RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES],
  outputApprovalState: "informational_only",
  futureApprovalRequired: true,
};

export type ReconstructionSimulationArtifact = {
  artifactId: string;
  artifactType:
    | "route_plan"
    | "output_inventory"
    | "limitation_report"
    | "review_trace"
    | "unknown";
  sourceRefs: string[];
  description: string;
};

export type ReconstructionDryRunLimitation = {
  limitationId: string;
  severity: ReconstructionPackageLimitationSeverity;
  sourceRef: string | null;
  message: string;
};

export type ReconstructionDryRunWarning = {
  warningId: string;
  sourceRef: string | null;
  message: string;
};

export type ReconstructionDryRunBlocker = {
  blockerId: string;
  sourceRef: string | null;
  message: string;
};

export type ReconstructionGeneratedOutput = {
  outputId: string;
  outputType: ReconstructionGeneratedOutputType;
  sourceCandidateId: string | null;
  sourceRoute: string | null;
  evidenceRefs: string[];
  description: string;
  generationState: "not_generated" | "simulation_placeholder";
};

export type ReconstructionDryRunPackage = {
  kind: "reconstruction_dry_run_package_v1";
  contractVersion: typeof RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION;
  dryRunId: string;
  reconstructionPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  packageStatus: ReconstructionPackageStatus;
  status: ReconstructionDryRunStatus;
  simulationStatus: ReconstructionSimulationStatus;
  simulationArtifacts: ReconstructionSimulationArtifact[];
  limitations: ReconstructionDryRunLimitation[];
  warnings: ReconstructionDryRunWarning[];
  blockers: ReconstructionDryRunBlocker[];
  generatedOutputs: ReconstructionGeneratedOutput[];
  boundary: ReconstructionDryRunBoundary;
  createdAt: string;
};

export type ReconstructionDryRunEligibilityReason =
  | "ready_for_dry_run"
  | "not_ready"
  | "needs_more_evidence"
  | "blocked"
  | "not_dry_run_boundary";

export type ReconstructionDryRunEligibility = {
  eligibility: "eligible" | "not_eligible";
  eligible: boolean;
  reason: ReconstructionDryRunEligibilityReason;
  reconstructionPackageId: string;
};

export type CreateReconstructionDryRunPackageOptions = {
  dryRunId?: string;
  createdAt?: string;
};

export type ReconstructionDryRunPackageValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function evaluateDryRunEligibility(
  reconstructionPackage: ReconstructionPackage,
): ReconstructionDryRunEligibility {
  if (reconstructionPackage.packageStatus === "needs_more_evidence") {
    return {
      eligibility: "not_eligible",
      eligible: false,
      reason: "needs_more_evidence",
      reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    };
  }

  if (reconstructionPackage.packageStatus === "blocked") {
    return {
      eligibility: "not_eligible",
      eligible: false,
      reason: "blocked",
      reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    };
  }

  if (reconstructionPackage.executionReadiness === "not_ready") {
    return {
      eligibility: "not_eligible",
      eligible: false,
      reason: "not_ready",
      reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    };
  }

  if (reconstructionPackage.executionReadiness === "ready_for_dry_run") {
    return {
      eligibility: "eligible",
      eligible: true,
      reason: "ready_for_dry_run",
      reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    };
  }

  return {
    eligibility: "not_eligible",
    eligible: false,
    reason: "not_dry_run_boundary",
    reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
  };
}

function blockersForIneligiblePackage(
  reconstructionPackage: ReconstructionPackage,
  eligibility: ReconstructionDryRunEligibility,
): ReconstructionDryRunBlocker[] {
  const blockers: ReconstructionDryRunBlocker[] = [];

  if (reconstructionPackage.packageStatus === "needs_more_evidence") {
    blockers.push({
      blockerId: `${reconstructionPackage.reconstructionPackageId}:needs-more-evidence`,
      sourceRef: reconstructionPackage.reconstructionPackageId,
      message: "Reconstruction Package needs more evidence before dry-run package planning.",
    });
  }

  if (reconstructionPackage.packageStatus === "blocked") {
    blockers.push({
      blockerId: `${reconstructionPackage.reconstructionPackageId}:package-blocked`,
      sourceRef: reconstructionPackage.reconstructionPackageId,
      message: "Reconstruction Package is blocked before dry-run package planning.",
    });
  }

  if (reconstructionPackage.executionReadiness === "not_ready") {
    blockers.push({
      blockerId: `${reconstructionPackage.reconstructionPackageId}:execution-not-ready`,
      sourceRef: reconstructionPackage.reconstructionPackageId,
      message: "Reconstruction Package executionReadiness is not_ready.",
    });
  }

  if (reconstructionPackage.executionReadiness === "ready_for_future_execution") {
    blockers.push({
      blockerId: `${reconstructionPackage.reconstructionPackageId}:outside-dry-run-boundary`,
      sourceRef: reconstructionPackage.reconstructionPackageId,
      message: "Reconstruction Package is outside the dry-run-only boundary.",
    });
  }

  if (blockers.length === 0) {
    blockers.push({
      blockerId: `${reconstructionPackage.reconstructionPackageId}:${eligibility.reason}`,
      sourceRef: reconstructionPackage.reconstructionPackageId,
      message: `Reconstruction Package is not eligible for dry-run package planning: ${eligibility.reason}.`,
    });
  }

  return blockers;
}

export function createReconstructionDryRunPackage(
  reconstructionPackage: ReconstructionPackage,
  options: CreateReconstructionDryRunPackageOptions = {},
): ReconstructionDryRunPackage {
  const eligibility = evaluateDryRunEligibility(reconstructionPackage);
  const planned = eligibility.eligible;

  return {
    kind: "reconstruction_dry_run_package_v1",
    contractVersion: RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION,
    dryRunId:
      options.dryRunId ?? `${reconstructionPackage.reconstructionPackageId}:dry-run-boundary`,
    reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    siteVersionId: reconstructionPackage.siteVersionId,
    routeScope: reconstructionPackage.routeScope,
    packageStatus: reconstructionPackage.packageStatus,
    status: planned ? "planned" : "blocked",
    simulationStatus: planned ? "pending" : "unavailable",
    simulationArtifacts: [],
    limitations: reconstructionPackage.limitations.map((limitation) => ({
      limitationId: limitation.limitationId,
      severity: limitation.severity,
      sourceRef: limitation.sourceCandidateId,
      message: limitation.message,
    })),
    warnings: [],
    blockers: planned ? [] : blockersForIneligiblePackage(reconstructionPackage, eligibility),
    generatedOutputs: [],
    boundary: RECONSTRUCTION_DRY_RUN_BOUNDARY,
    createdAt: options.createdAt ?? reconstructionPackage.createdAt,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function isKnownDryRunStatus(value: unknown): value is ReconstructionDryRunStatus {
  return (
    typeof value === "string" &&
    RECONSTRUCTION_DRY_RUN_STATUSES.includes(value as ReconstructionDryRunStatus)
  );
}

function isKnownSimulationStatus(value: unknown): value is ReconstructionSimulationStatus {
  return (
    typeof value === "string" &&
    RECONSTRUCTION_SIMULATION_STATUSES.includes(value as ReconstructionSimulationStatus)
  );
}

export function validateReconstructionDryRunPackage(
  dryRunPackage: unknown,
): ReconstructionDryRunPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(dryRunPackage)) {
    return {
      valid: false,
      errors: ["dry-run package must be an object"],
      warnings,
    };
  }

  if (dryRunPackage.kind !== "reconstruction_dry_run_package_v1") {
    warnings.push("kind should be reconstruction_dry_run_package_v1");
  }

  if (dryRunPackage.contractVersion !== RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION) {
    warnings.push(`contractVersion should be ${RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION}`);
  }

  if (!hasNonEmptyString(dryRunPackage.dryRunId)) {
    errors.push("dryRunId is required");
  }

  if (!hasNonEmptyString(dryRunPackage.reconstructionPackageId)) {
    errors.push("reconstructionPackageId is required");
  }

  if (!hasNonEmptyString(dryRunPackage.siteVersionId)) {
    errors.push("siteVersionId is required");
  }

  if (!isObject(dryRunPackage.routeScope)) {
    errors.push("routeScope is required");
  }

  if (!isKnownDryRunStatus(dryRunPackage.status)) {
    errors.push("status must be a known ReconstructionDryRunStatus");
  }

  if (dryRunPackage.status === "simulated") {
    errors.push("builder-created dry-run packages must not be marked simulated");
  }

  if (!isKnownSimulationStatus(dryRunPackage.simulationStatus)) {
    errors.push("simulationStatus must be a known ReconstructionSimulationStatus");
  }

  if (dryRunPackage.simulationStatus === "complete") {
    errors.push("builder-created dry-run packages must not mark simulation complete");
  }

  if (!Array.isArray(dryRunPackage.blockers)) {
    errors.push("blockers must be an array");
  } else if (dryRunPackage.status === "blocked" && dryRunPackage.blockers.length === 0) {
    errors.push("blocked dry-run packages must include blockers");
  }

  if (!Array.isArray(dryRunPackage.generatedOutputs)) {
    errors.push("generatedOutputs must be an array");
  } else if (dryRunPackage.generatedOutputs.length > 0) {
    errors.push("generatedOutputs must be empty at dry-run package creation time");
  }

  if (dryRunPackage.status === "planned" && Array.isArray(dryRunPackage.generatedOutputs)) {
    if (dryRunPackage.generatedOutputs.length > 0) {
      errors.push("planned dry-run packages must not have generated outputs");
    }
  }

  if (!Array.isArray(dryRunPackage.simulationArtifacts)) {
    errors.push("simulationArtifacts must be an array");
  } else if (dryRunPackage.simulationArtifacts.length > 0) {
    errors.push("simulationArtifacts must be empty before dry-run execution exists");
  }

  if (!isObject(dryRunPackage.boundary)) {
    errors.push("boundary is required");
  } else {
    if (dryRunPackage.boundary.outputApprovalState !== "informational_only") {
      errors.push("boundary outputApprovalState must remain informational_only");
    }

    if (dryRunPackage.boundary.futureApprovalRequired !== true) {
      errors.push("boundary futureApprovalRequired must remain true");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
