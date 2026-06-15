/**
 * Phase 8A-0 reconstruction dry-run boundary contract.
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

export const RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION = "8A-0" as const;

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
  executionStatus: ReconstructionDryRunStatus;
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
  executionStatus?: ReconstructionDryRunStatus;
  simulationStatus?: ReconstructionSimulationStatus;
  simulationArtifacts?: ReconstructionSimulationArtifact[];
  limitations?: ReconstructionDryRunLimitation[];
  warnings?: ReconstructionDryRunWarning[];
  blockers?: ReconstructionDryRunBlocker[];
  generatedOutputs?: ReconstructionGeneratedOutput[];
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

export function createReconstructionDryRunPackage(
  reconstructionPackage: ReconstructionPackage,
  options: CreateReconstructionDryRunPackageOptions = {},
): ReconstructionDryRunPackage {
  const eligibility = evaluateDryRunEligibility(reconstructionPackage);

  return {
    kind: "reconstruction_dry_run_package_v1",
    contractVersion: RECONSTRUCTION_DRY_RUN_CONTRACT_VERSION,
    dryRunId:
      options.dryRunId ?? `${reconstructionPackage.reconstructionPackageId}:dry-run-boundary`,
    reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
    siteVersionId: reconstructionPackage.siteVersionId,
    routeScope: reconstructionPackage.routeScope,
    packageStatus: reconstructionPackage.packageStatus,
    executionStatus:
      options.executionStatus ?? (eligibility.eligible ? "planned" : "blocked"),
    simulationStatus: options.simulationStatus ?? "unavailable",
    simulationArtifacts: options.simulationArtifacts ?? [],
    limitations: options.limitations ?? [],
    warnings: options.warnings ?? [],
    blockers: options.blockers ?? [],
    generatedOutputs: options.generatedOutputs ?? [],
    boundary: RECONSTRUCTION_DRY_RUN_BOUNDARY,
    createdAt: options.createdAt ?? reconstructionPackage.createdAt,
  };
}
