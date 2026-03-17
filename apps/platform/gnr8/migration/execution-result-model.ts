import type { ApprovalPackage } from "./approval-package-model";
import type { ExecutionPlan, ExecutionStepId, Phase1TargetArtifact } from "./execution-plan-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Execution Result (deterministic; simulation-only)
 * --------------------------------------------------------
 *
 * Execution status rule (normative; fixed & replayable):
 * - `blocked` if executionPlan.eligibility.status === "blocked" OR approvalPackage.eligibility.status === "blocked"
 * - `executed` if simulation executed and there are no warning codes
 * - `executed_with_warnings` if simulation executed and there are warning codes
 * - `failed` only for unexpected internal errors (captured, no throw for normal blocked cases)
 */

export const EXECUTION_RESULT_VERSION = "1.0.0" as const;

export type ExecutionStatus = "executed" | "executed_with_warnings" | "blocked" | "failed";

export type ExecutedStepRecord = {
  stepId: ExecutionStepId;
  summary: string;
};

export type SkippedStepRecord = {
  stepId: ExecutionStepId;
  reasonCode: "BLOCKED" | "FAILED";
  reasonMessage: string;
};

export type ExecutionFailure = {
  code: "UNEXPECTED_ERROR";
  message: string;
};

export type ExecutionResult = {
  kind: "execution_result_v1";
  resultVersion: typeof EXECUTION_RESULT_VERSION;
  executionResultId: string;

  status: ExecutionStatus;

  trace: {
    approvalPackageId: string;
    executionPlanId: string;
  };

  executedSteps: ExecutedStepRecord[];
  skippedSteps: SkippedStepRecord[];

  blockingReasons: string[];
  warningCodes: string[];

  /**
   * Deterministic target artifact records (simulation only; no writes).
   */
  targetArtifacts: Phase1TargetArtifact[];

  summary: string;
  failure: ExecutionFailure | null;
};

function executionResultIdFor(payload: Omit<ExecutionResult, "executionResultId">): string {
  return sha256Hex(stableStringify(payload as unknown as Parameters<typeof stableStringify>[0]));
}

function canonicalStepIdOrder(steps: { stepId: ExecutionStepId }[]): ExecutionStepId[] {
  // ExecutionPlan steps are already canonical and stable; preserve their order.
  return steps.map((s) => s.stepId);
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/**
 * Executes phase-1 apply simulation. No real writes. Always returns structured output.
 */
export function executePhase1ApplySimulation(input: { approvalPackage: ApprovalPackage; executionPlan: ExecutionPlan }): ExecutionResult {
  const stepOrder = canonicalStepIdOrder(input.executionPlan.steps);
  const warningCodes = input.executionPlan.eligibility.warningCodes;

  const blocked =
    input.approvalPackage.eligibility.status === "blocked" || input.executionPlan.eligibility.status === "blocked";

  const blockingReasons = uniqueSortedStrings([
    ...(input.approvalPackage.eligibility.blockingReasons.map((r) => r.code) ?? []),
    ...(input.executionPlan.eligibility.blockingReasons.map((r) => r.code) ?? []),
  ]);

  if (blocked) {
    const base: Omit<ExecutionResult, "executionResultId"> = {
      kind: "execution_result_v1",
      resultVersion: EXECUTION_RESULT_VERSION,
      status: "blocked",
      trace: {
        approvalPackageId: input.approvalPackage.approvalPackageId,
        executionPlanId: input.executionPlan.executionPlanId,
      },
      executedSteps: [],
      skippedSteps: stepOrder.map((stepId) => ({
        stepId,
        reasonCode: "BLOCKED",
        reasonMessage: "Execution did not proceed due to blocked eligibility.",
      })),
      blockingReasons,
      warningCodes,
      targetArtifacts: [],
      summary: `phase1_apply_simulation: blocked; steps=${stepOrder.length}; blockingReasons=${blockingReasons.length}; warnings=${warningCodes.length}`,
      failure: null,
    };

    return { ...base, executionResultId: executionResultIdFor(base) };
  }

  try {
    const executedSteps: ExecutedStepRecord[] = [];
    const skippedSteps: SkippedStepRecord[] = [];

    // Step 1: validate approval package (already checked eligibility above)
    executedSteps.push({
      stepId: "validate_approval_package_v1",
      summary: `approvalStatus=${input.approvalPackage.eligibility.status}`,
    });

    // Step 2: enumerate preview pages (plan already carries canonical references)
    executedSteps.push({
      stepId: "enumerate_preview_pages_v1",
      summary: `previewPages=${input.executionPlan.previewPages.length}`,
    });

    // Step 3: compute target artifacts (simulation-only; use plan artifacts deterministically)
    const targetArtifacts: Phase1TargetArtifact[] = [...input.executionPlan.targetArtifacts];
    executedSteps.push({
      stepId: "compute_target_artifacts_v1",
      summary: `targetArtifacts=${targetArtifacts.length}`,
    });

    // Step 4: emit result
    executedSteps.push({
      stepId: "emit_simulation_result_v1",
      summary: "structured_result_emitted",
    });

    for (const stepId of stepOrder) {
      if (executedSteps.some((s) => s.stepId === stepId)) continue;
      skippedSteps.push({
        stepId,
        reasonCode: "FAILED",
        reasonMessage: "Step missing from execution simulation (internal consistency error).",
      });
    }

    const status: ExecutionStatus =
      warningCodes.length > 0 ? "executed_with_warnings" : "executed";

    const base: Omit<ExecutionResult, "executionResultId"> = {
      kind: "execution_result_v1",
      resultVersion: EXECUTION_RESULT_VERSION,
      status,
      trace: {
        approvalPackageId: input.approvalPackage.approvalPackageId,
        executionPlanId: input.executionPlan.executionPlanId,
      },
      executedSteps,
      skippedSteps,
      blockingReasons: [],
      warningCodes,
      targetArtifacts,
      summary: `phase1_apply_simulation: ${status}; executedSteps=${executedSteps.length}; skippedSteps=${skippedSteps.length}; targetArtifacts=${targetArtifacts.length}; warnings=${warningCodes.length}`,
      failure: null,
    };

    return { ...base, executionResultId: executionResultIdFor(base) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const base: Omit<ExecutionResult, "executionResultId"> = {
      kind: "execution_result_v1",
      resultVersion: EXECUTION_RESULT_VERSION,
      status: "failed",
      trace: {
        approvalPackageId: input.approvalPackage.approvalPackageId,
        executionPlanId: input.executionPlan.executionPlanId,
      },
      executedSteps: [],
      skippedSteps: stepOrder.map((stepId) => ({
        stepId,
        reasonCode: "FAILED",
        reasonMessage: "Execution failed due to an unexpected internal error.",
      })),
      blockingReasons: [],
      warningCodes,
      targetArtifacts: [],
      summary: `phase1_apply_simulation: failed; steps=${stepOrder.length}; warnings=${warningCodes.length}`,
      failure: { code: "UNEXPECTED_ERROR", message },
    };

    return { ...base, executionResultId: executionResultIdFor(base) };
  }
}

