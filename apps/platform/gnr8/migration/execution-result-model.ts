import type { ApprovalPackage } from "./approval-package-model";
import type { ExecutionPlan, ExecutionStepId, Phase1TargetArtifact } from "./execution-plan-model";
import type { LinearMigrationPipelineResult } from "./pipeline-contract";
import { createStaticHtmlRenderArtifact } from "./static-html-render-artifact";
import {
  materializeStaticOutputBundle,
  type StaticOutputAssetFileRecord,
  type StaticOutputBundle,
  type StaticOutputPageFileRecord,
} from "./static-output-bundle";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Execution Result (deterministic; simulation + materialize)
 * -----------------------------------------------------------------
 *
 * Execution status rule (normative; fixed & replayable):
 * - `blocked` if executionPlan.eligibility.status === "blocked" OR approvalPackage.eligibility.status === "blocked" OR mode-specific required inputs are missing
 * - `executed` if execution completed and there are no warning codes
 * - `executed_with_warnings` if execution completed and there are warning codes
 * - `failed` for deterministic materialization failure (bundle error codes) or unexpected internal errors
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
  code: "UNEXPECTED_ERROR" | "MATERIALIZATION_FAILED";
  message: string;
};

export type ExecutionMaterializationStatus =
  | "not_run"
  | "blocked"
  | "materialized"
  | "materialized_with_warnings"
  | "materialization_failed";

export type ExecutionOutputLocationRule =
  | "not_applicable"
  | "caller_provided_output_root_v1"
  | "deterministic_default_under_import_root_v1";

export type ExecutionMaterializationSummary = {
  pageFileCount: number;
  writtenPageCount: number;
  nonRenderablePageCount: number;
  failedPageCount: number;
  assetFileCount: number;
  copiedAssetCount: number;
  missingAssetCount: number;
  skippedAssetCount: number;
  failedAssetCount: number;
  warningCount: number;
  errorCount: number;
};

export type ExecutionMaterialization = {
  status: ExecutionMaterializationStatus;
  outputLocationRule: ExecutionOutputLocationRule;
  outputRootPath: string | null;
  bundleRef:
    | {
        kind: StaticOutputBundle["kind"];
        version: StaticOutputBundle["bundleVersion"];
      }
    | null;
  summary: ExecutionMaterializationSummary;
  pageFiles: StaticOutputPageFileRecord[];
  assetFiles: StaticOutputAssetFileRecord[];
  warningCodes: string[];
  errorCodes: string[];
};

export type ExecutionResult = {
  kind: "execution_result_v1";
  resultVersion: typeof EXECUTION_RESULT_VERSION;
  executionResultId: string;

  executionMode: ExecutionPlan["executionMode"];
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
   * Deterministic target artifact records (traceability references).
   */
  targetArtifacts: Phase1TargetArtifact[];

  materialization: ExecutionMaterialization;

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

function emptyMaterialization(input: {
  status: ExecutionMaterializationStatus;
  outputLocationRule?: ExecutionOutputLocationRule;
}): ExecutionMaterialization {
  return {
    status: input.status,
    outputLocationRule: input.outputLocationRule ?? "not_applicable",
    outputRootPath: null,
    bundleRef: null,
    summary: {
      pageFileCount: 0,
      writtenPageCount: 0,
      nonRenderablePageCount: 0,
      failedPageCount: 0,
      assetFileCount: 0,
      copiedAssetCount: 0,
      missingAssetCount: 0,
      skippedAssetCount: 0,
      failedAssetCount: 0,
      warningCount: 0,
      errorCount: 0,
    },
    pageFiles: [],
    assetFiles: [],
    warningCodes: [],
    errorCodes: [],
  };
}

function findRenderOutput(pipeline: LinearMigrationPipelineResult | undefined) {
  if (!pipeline) return null;
  const stage = pipeline.stages.find((s) => s.stageId === "render_preparation");
  return stage?.output.renderOutput ?? null;
}

function buildBlockedResult(input: {
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  stepOrder: ExecutionStepId[];
  blockingReasons: string[];
  warningCodes: string[];
  materialization: ExecutionMaterialization;
}): ExecutionResult {
  const base: Omit<ExecutionResult, "executionResultId"> = {
    kind: "execution_result_v1",
    resultVersion: EXECUTION_RESULT_VERSION,
    executionMode: input.executionPlan.executionMode,
    status: "blocked",
    trace: {
      approvalPackageId: input.approvalPackage.approvalPackageId,
      executionPlanId: input.executionPlan.executionPlanId,
    },
    executedSteps: [],
    skippedSteps: input.stepOrder.map((stepId) => ({
      stepId,
      reasonCode: "BLOCKED",
      reasonMessage: "Execution did not proceed due to blocked eligibility.",
    })),
    blockingReasons: input.blockingReasons,
    warningCodes: input.warningCodes,
    targetArtifacts: [],
    materialization: input.materialization,
    summary: `phase1_apply: blocked; mode=${input.executionPlan.executionMode}; steps=${input.stepOrder.length}; blockingReasons=${input.blockingReasons.length}; warnings=${input.warningCodes.length}`,
    failure: null,
  };

  return { ...base, executionResultId: executionResultIdFor(base) };
}

function outputLocationRuleFor(input: { outputRootDir: string | undefined }): ExecutionOutputLocationRule {
  return input.outputRootDir ? "caller_provided_output_root_v1" : "deterministic_default_under_import_root_v1";
}

export async function executePhase1Apply(input: {
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  pipeline?: LinearMigrationPipelineResult;
  importRootDir?: string;
  outputRootDir?: string;
  cleanOutputRoot?: boolean;
}): Promise<ExecutionResult> {
  const stepOrder = canonicalStepIdOrder(input.executionPlan.steps);
  const baseWarningCodes = input.executionPlan.eligibility.warningCodes;

  const blockingReasons = uniqueSortedStrings([
    ...(input.approvalPackage.eligibility.blockingReasons.map((r) => r.code) ?? []),
    ...(input.executionPlan.eligibility.blockingReasons.map((r) => r.code) ?? []),
  ]);

  const materializationRule =
    input.executionPlan.executionMode === "materialize"
      ? outputLocationRuleFor({ outputRootDir: input.outputRootDir })
      : "not_applicable";

  const modeSpecificBlockingReasons = new Set<string>();
  if (input.executionPlan.executionMode === "materialize") {
    if (!input.importRootDir) modeSpecificBlockingReasons.add("MISSING_IMPORT_ROOT_DIR");
    if (!input.pipeline) modeSpecificBlockingReasons.add("MISSING_PIPELINE_CONTEXT");
    if (!findRenderOutput(input.pipeline)) modeSpecificBlockingReasons.add("MISSING_RENDER_OUTPUT");
  }

  const allBlockingReasons = uniqueSortedStrings([...blockingReasons, ...modeSpecificBlockingReasons]);
  const blocked =
    input.approvalPackage.eligibility.status === "blocked" ||
    input.executionPlan.eligibility.status === "blocked" ||
    allBlockingReasons.length > 0;

  if (blocked) {
    return buildBlockedResult({
      approvalPackage: input.approvalPackage,
      executionPlan: input.executionPlan,
      stepOrder,
      blockingReasons: allBlockingReasons,
      warningCodes: baseWarningCodes,
      materialization: emptyMaterialization({
        status: input.executionPlan.executionMode === "materialize" ? "blocked" : "not_run",
        outputLocationRule: materializationRule,
      }),
    });
  }

  try {
    const executedSteps: ExecutedStepRecord[] = [];
    const skippedSteps: SkippedStepRecord[] = [];

    executedSteps.push({
      stepId: "validate_approval_package_v1",
      summary: `approvalStatus=${input.approvalPackage.eligibility.status}`,
    });

    executedSteps.push({
      stepId: "enumerate_preview_pages_v1",
      summary: `previewPages=${input.executionPlan.previewPages.length}`,
    });

    const targetArtifacts: Phase1TargetArtifact[] = [...input.executionPlan.targetArtifacts];
    executedSteps.push({
      stepId: "compute_target_artifacts_v1",
      summary: `targetArtifacts=${targetArtifacts.length}`,
    });

    let materialization = emptyMaterialization({ status: "not_run" });
    const warningCodes = new Set<string>(baseWarningCodes);
    let failure: ExecutionFailure | null = null;

    if (input.executionPlan.executionMode === "materialize") {
      const renderOutput = findRenderOutput(input.pipeline);
      if (!renderOutput || !input.importRootDir) {
        return buildBlockedResult({
          approvalPackage: input.approvalPackage,
          executionPlan: input.executionPlan,
          stepOrder,
          blockingReasons: uniqueSortedStrings([
            ...allBlockingReasons,
            ...(!input.importRootDir ? ["MISSING_IMPORT_ROOT_DIR"] : []),
            ...(!renderOutput ? ["MISSING_RENDER_OUTPUT"] : []),
          ]),
          warningCodes: [...warningCodes],
          materialization: emptyMaterialization({ status: "blocked", outputLocationRule: materializationRule }),
        });
      }

      const staticHtmlArtifact = createStaticHtmlRenderArtifact(renderOutput);
      const bundle = await materializeStaticOutputBundle({
        staticHtmlArtifact,
        importOutput: input.pipeline!.input.importOutput,
        importRootDir: input.importRootDir,
        ...(input.outputRootDir ? { outputRootDir: input.outputRootDir } : {}),
        cleanOutputRoot: input.cleanOutputRoot,
      });

      materialization = {
        status:
          bundle.status === "failed"
            ? "materialization_failed"
            : bundle.status === "ready_with_warnings"
              ? "materialized_with_warnings"
              : "materialized",
        outputLocationRule: materializationRule,
        outputRootPath: bundle.outputRootPath,
        bundleRef: {
          kind: bundle.kind,
          version: bundle.bundleVersion,
        },
        summary: { ...bundle.summary },
        pageFiles: [...bundle.pageFiles],
        assetFiles: [...bundle.assetFiles],
        warningCodes: [...bundle.diagnostics.warnings.codes],
        errorCodes: [...bundle.diagnostics.errors.codes],
      };

      for (const code of materialization.warningCodes) warningCodes.add(code);

      if (materialization.status === "materialization_failed") {
        failure = {
          code: "MATERIALIZATION_FAILED",
          message: `Static output materialization reported errors: ${materialization.errorCodes.join(", ") || "unknown_error"}`,
        };
      }

      executedSteps.push({
        stepId: "materialize_static_output_bundle_v1",
        summary: `bundleStatus=${bundle.status}; outputRoot=${bundle.outputRootPath}`,
      });
    }

    executedSteps.push({
      stepId: "emit_execution_result_v1",
      summary: "structured_result_emitted",
    });

    for (const stepId of stepOrder) {
      if (executedSteps.some((s) => s.stepId === stepId)) continue;
      skippedSteps.push({
        stepId,
        reasonCode: "FAILED",
        reasonMessage: "Step missing from execution apply flow (internal consistency error).",
      });
    }

    const warningCodeList = uniqueSortedStrings([...warningCodes]);
    const status: ExecutionStatus =
      failure !== null ? "failed" : warningCodeList.length > 0 ? "executed_with_warnings" : "executed";

    const base: Omit<ExecutionResult, "executionResultId"> = {
      kind: "execution_result_v1",
      resultVersion: EXECUTION_RESULT_VERSION,
      executionMode: input.executionPlan.executionMode,
      status,
      trace: {
        approvalPackageId: input.approvalPackage.approvalPackageId,
        executionPlanId: input.executionPlan.executionPlanId,
      },
      executedSteps,
      skippedSteps,
      blockingReasons: [],
      warningCodes: warningCodeList,
      targetArtifacts,
      materialization,
      summary: `phase1_apply: ${status}; mode=${input.executionPlan.executionMode}; executedSteps=${executedSteps.length}; skippedSteps=${skippedSteps.length}; targetArtifacts=${targetArtifacts.length}; warnings=${warningCodeList.length}`,
      failure,
    };

    return { ...base, executionResultId: executionResultIdFor(base) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const base: Omit<ExecutionResult, "executionResultId"> = {
      kind: "execution_result_v1",
      resultVersion: EXECUTION_RESULT_VERSION,
      executionMode: input.executionPlan.executionMode,
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
      warningCodes: baseWarningCodes,
      targetArtifacts: [],
      materialization: emptyMaterialization({
        status: input.executionPlan.executionMode === "materialize" ? "materialization_failed" : "not_run",
        outputLocationRule: materializationRule,
      }),
      summary: `phase1_apply: failed; mode=${input.executionPlan.executionMode}; steps=${stepOrder.length}; warnings=${baseWarningCodes.length}`,
      failure: { code: "UNEXPECTED_ERROR", message },
    };

    return { ...base, executionResultId: executionResultIdFor(base) };
  }
}

/**
 * Executes phase-1 apply simulation only. No real writes. Always returns structured output.
 */
export function executePhase1ApplySimulation(input: { approvalPackage: ApprovalPackage; executionPlan: ExecutionPlan }): ExecutionResult {
  if (input.executionPlan.executionMode !== "simulation") {
    throw new Error("executePhase1ApplySimulation requires executionPlan.executionMode === 'simulation'");
  }

  const stepOrder = canonicalStepIdOrder(input.executionPlan.steps);
  const warningCodes = input.executionPlan.eligibility.warningCodes;

  const blocked =
    input.approvalPackage.eligibility.status === "blocked" || input.executionPlan.eligibility.status === "blocked";

  const blockingReasons = uniqueSortedStrings([
    ...(input.approvalPackage.eligibility.blockingReasons.map((r) => r.code) ?? []),
    ...(input.executionPlan.eligibility.blockingReasons.map((r) => r.code) ?? []),
  ]);

  if (blocked) {
    return buildBlockedResult({
      approvalPackage: input.approvalPackage,
      executionPlan: input.executionPlan,
      stepOrder,
      blockingReasons,
      warningCodes,
      materialization: emptyMaterialization({ status: "not_run" }),
    });
  }

  const executedSteps: ExecutedStepRecord[] = [
    {
      stepId: "validate_approval_package_v1",
      summary: `approvalStatus=${input.approvalPackage.eligibility.status}`,
    },
    {
      stepId: "enumerate_preview_pages_v1",
      summary: `previewPages=${input.executionPlan.previewPages.length}`,
    },
    {
      stepId: "compute_target_artifacts_v1",
      summary: `targetArtifacts=${input.executionPlan.targetArtifacts.length}`,
    },
    {
      stepId: "emit_execution_result_v1",
      summary: "structured_result_emitted",
    },
  ];

  const skippedSteps: SkippedStepRecord[] = [];
  for (const stepId of stepOrder) {
    if (executedSteps.some((s) => s.stepId === stepId)) continue;
    skippedSteps.push({
      stepId,
      reasonCode: "FAILED",
      reasonMessage: "Step missing from execution simulation (internal consistency error).",
    });
  }

  const status: ExecutionStatus = warningCodes.length > 0 ? "executed_with_warnings" : "executed";

  const base: Omit<ExecutionResult, "executionResultId"> = {
    kind: "execution_result_v1",
    resultVersion: EXECUTION_RESULT_VERSION,
    executionMode: input.executionPlan.executionMode,
    status,
    trace: {
      approvalPackageId: input.approvalPackage.approvalPackageId,
      executionPlanId: input.executionPlan.executionPlanId,
    },
    executedSteps,
    skippedSteps,
    blockingReasons: [],
    warningCodes,
    targetArtifacts: [...input.executionPlan.targetArtifacts],
    materialization: emptyMaterialization({ status: "not_run" }),
    summary: `phase1_apply: ${status}; mode=simulation; executedSteps=${executedSteps.length}; skippedSteps=${skippedSteps.length}; targetArtifacts=${input.executionPlan.targetArtifacts.length}; warnings=${warningCodes.length}`,
    failure: null,
  };

  return { ...base, executionResultId: executionResultIdFor(base) };
}
