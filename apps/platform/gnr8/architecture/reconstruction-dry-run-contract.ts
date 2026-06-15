/**
 * Phase 8A reconstruction dry-run boundary contract.
 *
 * This module defines the deterministic metadata boundary between a
 * Reconstruction Package, a future Reconstruction Dry Run, and a planning-only
 * Simulation Plan. It does not execute a dry run, execute simulation, execute
 * reconstruction, call AI systems, generate React, generate blocks, persist
 * reconstruction, dispatch workers, create live websites, modify domains or
 * DNS, write runtime content, or publish anything.
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

export const RECONSTRUCTION_SIMULATION_PLAN_STATUSES = [
  "not_started",
  "planned",
  "blocked",
] as const;
export type ReconstructionSimulationPlanStatus =
  (typeof RECONSTRUCTION_SIMULATION_PLAN_STATUSES)[number];

export const RECONSTRUCTION_SIMULATION_STEP_TYPES = [
  "validate_package",
  "load_evidence",
  "map_candidates",
  "plan_route_model",
  "plan_section_model",
  "plan_block_model",
  "plan_content_model",
  "plan_design_tokens",
  "plan_navigation",
  "produce_simulation_summary",
] as const;
export type ReconstructionSimulationStepType =
  (typeof RECONSTRUCTION_SIMULATION_STEP_TYPES)[number];

export const RECONSTRUCTION_SIMULATION_EXPECTED_OUTPUT_DESCRIPTOR_TYPES = [
  "package_validation_descriptor",
  "evidence_loading_descriptor",
  "candidate_mapping_descriptor",
  "route_model_descriptor",
  "section_model_descriptor",
  "block_model_descriptor",
  "content_model_descriptor",
  "design_token_descriptor",
  "navigation_descriptor",
  "simulation_summary_descriptor",
] as const;
export type ReconstructionSimulationExpectedOutputDescriptorType =
  (typeof RECONSTRUCTION_SIMULATION_EXPECTED_OUTPUT_DESCRIPTOR_TYPES)[number];

export type ReconstructionSimulationRequiredInput = {
  inputId: string;
  inputType:
    | "dry_run_package"
    | "reconstruction_package"
    | "route_scope"
    | "evidence_capture_artifacts"
    | "reconstruction_candidates"
    | "review_decisions";
  sourceRef: string | null;
  description: string;
};

export type ReconstructionSimulationExpectedOutputDescriptor = {
  outputId: string;
  descriptorType: ReconstructionSimulationExpectedOutputDescriptorType;
  outputState: "planned_descriptor";
  description: string;
};

export type ReconstructionSimulationStep = {
  stepId: string;
  stepType: ReconstructionSimulationStepType;
  status: ReconstructionSimulationPlanStatus;
  requiredInputs: ReconstructionSimulationRequiredInput[];
  expectedOutputs: ReconstructionSimulationExpectedOutputDescriptor[];
  blockers: ReconstructionDryRunBlocker[];
  notes: string[];
};

export type ReconstructionSimulationPlan = {
  simulationPlanId: string;
  dryRunId: string;
  reconstructionPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  planStatus: ReconstructionSimulationPlanStatus;
  plannedSteps: ReconstructionSimulationStep[];
  requiredInputs: ReconstructionSimulationRequiredInput[];
  expectedOutputs: ReconstructionSimulationExpectedOutputDescriptor[];
  limitations: ReconstructionDryRunLimitation[];
  blockers: ReconstructionDryRunBlocker[];
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

export type CreateReconstructionSimulationPlanOptions = {
  simulationPlanId?: string;
  createdAt?: string;
};

export type ReconstructionSimulationPlanValidationResult = {
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

const BASE_SIMULATION_PLAN_REQUIRED_INPUTS = [
  {
    inputType: "dry_run_package",
    description: "Dry Run Package metadata that gates future simulation planning.",
  },
  {
    inputType: "reconstruction_package",
    description: "Approved Reconstruction Package metadata referenced by the Dry Run Package.",
  },
  {
    inputType: "route_scope",
    description: "Route scope carried from the Reconstruction Package.",
  },
  {
    inputType: "evidence_capture_artifacts",
    description: "Evidence Capture artifact references available to future simulation.",
  },
  {
    inputType: "reconstruction_candidates",
    description: "Reviewed Reconstruction Candidate references available to future simulation.",
  },
  {
    inputType: "review_decisions",
    description: "Candidate Review decision metadata available to future simulation.",
  },
] as const satisfies readonly {
  inputType: ReconstructionSimulationRequiredInput["inputType"];
  description: string;
}[];

const SIMULATION_STEP_DEFINITIONS = [
  {
    stepType: "validate_package",
    inputTypes: ["dry_run_package", "reconstruction_package"],
    descriptorType: "package_validation_descriptor",
    outputDescription: "Planned descriptor for package validation checks.",
    notes: ["Plans validation of package metadata only."],
  },
  {
    stepType: "load_evidence",
    inputTypes: ["evidence_capture_artifacts", "route_scope"],
    descriptorType: "evidence_loading_descriptor",
    outputDescription: "Planned descriptor for evidence references that would be loaded.",
    notes: ["Plans evidence reference loading without reading or transforming evidence."],
  },
  {
    stepType: "map_candidates",
    inputTypes: ["reconstruction_candidates", "review_decisions"],
    descriptorType: "candidate_mapping_descriptor",
    outputDescription: "Planned descriptor for mapping approved candidates to route scope.",
    notes: ["Plans candidate mapping without executing reconstruction."],
  },
  {
    stepType: "plan_route_model",
    inputTypes: ["route_scope", "reconstruction_candidates"],
    descriptorType: "route_model_descriptor",
    outputDescription: "Planned descriptor for a future route model simulation target.",
    notes: ["Plans route model shape only; no route model is generated."],
  },
  {
    stepType: "plan_section_model",
    inputTypes: ["evidence_capture_artifacts", "reconstruction_candidates"],
    descriptorType: "section_model_descriptor",
    outputDescription: "Planned descriptor for future section model simulation targets.",
    notes: ["Plans section model shape only; no section model is generated."],
  },
  {
    stepType: "plan_block_model",
    inputTypes: ["evidence_capture_artifacts", "reconstruction_candidates"],
    descriptorType: "block_model_descriptor",
    outputDescription: "Planned descriptor for future block model simulation targets.",
    notes: ["Plans block model shape only; no block model is generated."],
  },
  {
    stepType: "plan_content_model",
    inputTypes: ["evidence_capture_artifacts", "review_decisions"],
    descriptorType: "content_model_descriptor",
    outputDescription: "Planned descriptor for future content model simulation targets.",
    notes: ["Plans content model shape only; no content model is generated."],
  },
  {
    stepType: "plan_design_tokens",
    inputTypes: ["evidence_capture_artifacts", "review_decisions"],
    descriptorType: "design_token_descriptor",
    outputDescription: "Planned descriptor for future design token simulation targets.",
    notes: ["Plans design token shape only; no design tokens are generated."],
  },
  {
    stepType: "plan_navigation",
    inputTypes: ["route_scope", "evidence_capture_artifacts"],
    descriptorType: "navigation_descriptor",
    outputDescription: "Planned descriptor for future navigation model simulation targets.",
    notes: ["Plans navigation shape only; no navigation model is generated."],
  },
  {
    stepType: "produce_simulation_summary",
    inputTypes: ["dry_run_package", "route_scope", "review_decisions"],
    descriptorType: "simulation_summary_descriptor",
    outputDescription: "Planned descriptor for a future simulation summary.",
    notes: ["Plans summary shape only; no simulation summary artifact is produced."],
  },
] as const satisfies readonly {
  stepType: ReconstructionSimulationStepType;
  inputTypes: readonly ReconstructionSimulationRequiredInput["inputType"][];
  descriptorType: ReconstructionSimulationExpectedOutputDescriptorType;
  outputDescription: string;
  notes: readonly string[];
}[];

function simulationPlanRequiredInputs(
  dryRunPackage: ReconstructionDryRunPackage,
): ReconstructionSimulationRequiredInput[] {
  return BASE_SIMULATION_PLAN_REQUIRED_INPUTS.map((input) => ({
    inputId: `${dryRunPackage.dryRunId}:input:${input.inputType}`,
    inputType: input.inputType,
    sourceRef:
      input.inputType === "dry_run_package"
        ? dryRunPackage.dryRunId
        : dryRunPackage.reconstructionPackageId,
    description: input.description,
  }));
}

function inputsForStep(
  allInputs: ReconstructionSimulationRequiredInput[],
  inputTypes: readonly ReconstructionSimulationRequiredInput["inputType"][],
): ReconstructionSimulationRequiredInput[] {
  return inputTypes
    .map((inputType) => allInputs.find((input) => input.inputType === inputType))
    .filter((input): input is ReconstructionSimulationRequiredInput => Boolean(input));
}

function createPlannedSimulationSteps(
  dryRunPackage: ReconstructionDryRunPackage,
  allInputs: ReconstructionSimulationRequiredInput[],
): ReconstructionSimulationStep[] {
  return SIMULATION_STEP_DEFINITIONS.map((definition, index) => {
    const stepNumber = String(index + 1).padStart(2, "0");
    const stepId = `${dryRunPackage.dryRunId}:simulation-step-${stepNumber}:${definition.stepType}`;

    return {
      stepId,
      stepType: definition.stepType,
      status: "planned",
      requiredInputs: inputsForStep(allInputs, definition.inputTypes),
      expectedOutputs: [
        {
          outputId: `${stepId}:expected-output`,
          descriptorType: definition.descriptorType,
          outputState: "planned_descriptor",
          description: definition.outputDescription,
        },
      ],
      blockers: [],
      notes: [...definition.notes],
    };
  });
}

export function createReconstructionSimulationPlan(
  dryRunPackage: ReconstructionDryRunPackage,
  options: CreateReconstructionSimulationPlanOptions = {},
): ReconstructionSimulationPlan {
  const planStatus: ReconstructionSimulationPlanStatus =
    dryRunPackage.status === "planned"
      ? "planned"
      : dryRunPackage.status === "blocked"
        ? "blocked"
        : "not_started";
  const requiredInputs = simulationPlanRequiredInputs(dryRunPackage);
  const plannedSteps =
    planStatus === "planned" ? createPlannedSimulationSteps(dryRunPackage, requiredInputs) : [];

  return {
    simulationPlanId:
      options.simulationPlanId ?? `${dryRunPackage.dryRunId}:simulation-plan`,
    dryRunId: dryRunPackage.dryRunId,
    reconstructionPackageId: dryRunPackage.reconstructionPackageId,
    siteVersionId: dryRunPackage.siteVersionId,
    routeScope: dryRunPackage.routeScope,
    planStatus,
    plannedSteps,
    requiredInputs,
    expectedOutputs: plannedSteps.flatMap((step) => step.expectedOutputs),
    limitations: [...dryRunPackage.limitations],
    blockers: planStatus === "blocked" ? [...dryRunPackage.blockers] : [],
    createdAt: options.createdAt ?? dryRunPackage.createdAt,
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

function isKnownSimulationPlanStatus(
  value: unknown,
): value is ReconstructionSimulationPlanStatus {
  return (
    typeof value === "string" &&
    RECONSTRUCTION_SIMULATION_PLAN_STATUSES.includes(
      value as ReconstructionSimulationPlanStatus,
    )
  );
}

function isKnownSimulationStepType(
  value: unknown,
): value is ReconstructionSimulationStepType {
  return (
    typeof value === "string" &&
    RECONSTRUCTION_SIMULATION_STEP_TYPES.includes(value as ReconstructionSimulationStepType)
  );
}

function isKnownExpectedOutputDescriptorType(
  value: unknown,
): value is ReconstructionSimulationExpectedOutputDescriptorType {
  return (
    typeof value === "string" &&
    RECONSTRUCTION_SIMULATION_EXPECTED_OUTPUT_DESCRIPTOR_TYPES.includes(
      value as ReconstructionSimulationExpectedOutputDescriptorType,
    )
  );
}

function isExecutionState(value: unknown): boolean {
  return (
    value === "running" ||
    value === "executed" ||
    value === "completed" ||
    value === "complete" ||
    value === "simulated"
  );
}

function validateExpectedOutputDescriptors(
  expectedOutputs: unknown,
  path: string,
  errors: string[],
): void {
  if (!Array.isArray(expectedOutputs)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, expectedOutput] of expectedOutputs.entries()) {
    const outputPath = `${path}[${index}]`;

    if (!isObject(expectedOutput)) {
      errors.push(`${outputPath} must be an object`);
      continue;
    }

    if (!hasNonEmptyString(expectedOutput.outputId)) {
      errors.push(`${outputPath}.outputId is required`);
    }

    if (!isKnownExpectedOutputDescriptorType(expectedOutput.descriptorType)) {
      errors.push(`${outputPath}.descriptorType must be a known planned descriptor type`);
    }

    if (expectedOutput.outputState !== "planned_descriptor") {
      errors.push(`${outputPath}.outputState must be planned_descriptor`);
    }

    if ("generationState" in expectedOutput) {
      errors.push(`${outputPath} must not include generationState`);
    }

    if ("artifactId" in expectedOutput) {
      errors.push(`${outputPath} must not include artifactId`);
    }
  }
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

export function validateReconstructionSimulationPlan(
  simulationPlan: unknown,
): ReconstructionSimulationPlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(simulationPlan)) {
    return {
      valid: false,
      errors: ["simulation plan must be an object"],
      warnings,
    };
  }

  if (!hasNonEmptyString(simulationPlan.simulationPlanId)) {
    errors.push("simulationPlanId is required");
  }

  if (!hasNonEmptyString(simulationPlan.dryRunId)) {
    errors.push("dryRunId is required");
  }

  if (!hasNonEmptyString(simulationPlan.reconstructionPackageId)) {
    errors.push("reconstructionPackageId is required");
  }

  if (!hasNonEmptyString(simulationPlan.siteVersionId)) {
    errors.push("siteVersionId is required");
  }

  if (!isObject(simulationPlan.routeScope)) {
    errors.push("routeScope is required");
  }

  if (isExecutionState(simulationPlan.planStatus)) {
    errors.push("planStatus must not be an executed, running, completed, or simulated state");
  }

  if (!isKnownSimulationPlanStatus(simulationPlan.planStatus)) {
    errors.push("planStatus must be a known ReconstructionSimulationPlanStatus");
  }

  if (!Array.isArray(simulationPlan.plannedSteps)) {
    errors.push("plannedSteps must be an array");
  } else {
    if (simulationPlan.planStatus === "planned" && simulationPlan.plannedSteps.length === 0) {
      errors.push("planned simulation plans must include planned steps");
    }

    for (const [index, step] of simulationPlan.plannedSteps.entries()) {
      const stepPath = `plannedSteps[${index}]`;

      if (!isObject(step)) {
        errors.push(`${stepPath} must be an object`);
        continue;
      }

      if (!hasNonEmptyString(step.stepId)) {
        errors.push(`${stepPath}.stepId is required`);
      }

      if (!isKnownSimulationStepType(step.stepType)) {
        errors.push(`${stepPath}.stepType must be a known ReconstructionSimulationStepType`);
      }

      if (isExecutionState(step.status)) {
        errors.push(
          `${stepPath}.status must not be an executed, running, completed, or simulated state`,
        );
      }

      if (!isKnownSimulationPlanStatus(step.status)) {
        errors.push(`${stepPath}.status must be a known ReconstructionSimulationPlanStatus`);
      }

      if (!Array.isArray(step.requiredInputs)) {
        errors.push(`${stepPath}.requiredInputs must be an array`);
      }

      validateExpectedOutputDescriptors(
        step.expectedOutputs,
        `${stepPath}.expectedOutputs`,
        errors,
      );

      if (!Array.isArray(step.blockers)) {
        errors.push(`${stepPath}.blockers must be an array`);
      }

      if (!Array.isArray(step.notes)) {
        errors.push(`${stepPath}.notes must be an array`);
      }
    }
  }

  if (!Array.isArray(simulationPlan.requiredInputs)) {
    errors.push("requiredInputs must be an array");
  }

  validateExpectedOutputDescriptors(simulationPlan.expectedOutputs, "expectedOutputs", errors);

  if (!Array.isArray(simulationPlan.blockers)) {
    errors.push("blockers must be an array");
  } else if (simulationPlan.planStatus === "blocked" && simulationPlan.blockers.length === 0) {
    errors.push("blocked simulation plans must include blockers");
  }

  if (!Array.isArray(simulationPlan.limitations)) {
    errors.push("limitations must be an array");
  }

  if (
    Array.isArray((simulationPlan as { generatedOutputs?: unknown }).generatedOutputs) &&
    (simulationPlan as { generatedOutputs: unknown[] }).generatedOutputs.length > 0
  ) {
    errors.push("simulation plans must not include generatedOutputs");
  }

  if (
    Array.isArray((simulationPlan as { simulationArtifacts?: unknown }).simulationArtifacts) &&
    (simulationPlan as { simulationArtifacts: unknown[] }).simulationArtifacts.length > 0
  ) {
    errors.push("simulation plans must not include simulationArtifacts");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
