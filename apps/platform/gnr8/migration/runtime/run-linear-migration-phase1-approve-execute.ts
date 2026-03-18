import type { PipelineInput } from "../pipeline-contract";
import type { LinearMigrationPipelineResult } from "../pipeline-contract";
import type { ApprovalPackage } from "../approval-package-model";
import type { ExecutionMode, ExecutionPlan } from "../execution-plan-model";
import type { ExecutionResult } from "../execution-result-model";
import type { MigrationRunReport } from "../migration-run-report";

import { runLinearMigrationPipeline } from "./run-linear-migration-pipeline";
import { createApprovalPackage } from "../approval-package-model";
import { createExecutionPlan } from "../execution-plan-model";
import { executePhase1Apply } from "../execution-result-model";
import { createMigrationRunReport } from "../migration-run-report";

export type LinearMigrationPhase1ApproveExecuteResult = {
  kind: "linear_migration_phase1_approve_execute_result_v1";
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
  report: MigrationRunReport;
  summary: string;
};

export type RunLinearMigrationPhase1ApproveExecuteOptions = {
  executionMode?: ExecutionMode;
  importRootDir?: string;
  outputRootDir?: string;
  cleanOutputRoot?: boolean;
};

/**
 * Deterministic phase-1 approve → execute skeleton.
 *
 * - Runs the linear migration pipeline (through PreviewDocument generation).
 * - Derives ApprovalPackage deterministically from pipeline outputs.
 * - Derives ExecutionPlan deterministically from pipeline + approval.
 * - Executes phase-1 apply in explicit mode (`simulation` or `materialize`) and returns structured ExecutionResult.
 */
export async function runLinearMigrationPhase1ApproveExecute(
  input: PipelineInput,
  options?: RunLinearMigrationPhase1ApproveExecuteOptions,
): Promise<LinearMigrationPhase1ApproveExecuteResult> {
  const executionMode = options?.executionMode ?? "simulation";
  const pipeline = runLinearMigrationPipeline(input);
  const approvalPackage = createApprovalPackage(pipeline);
  const executionPlan = createExecutionPlan({ pipeline, approvalPackage, executionMode });
  const executionResult = await executePhase1Apply({
    approvalPackage,
    executionPlan,
    ...(executionMode === "materialize"
      ? {
          pipeline,
          importRootDir: options?.importRootDir,
          outputRootDir: options?.outputRootDir,
          cleanOutputRoot: options?.cleanOutputRoot,
        }
      : {}),
  });
  const report = createMigrationRunReport({ pipeline, approvalPackage, executionPlan, executionResult });

  return {
    kind: "linear_migration_phase1_approve_execute_result_v1",
    pipeline,
    approvalPackage,
    executionPlan,
    executionResult,
    report,
    summary: `linear_migration_phase1_approve_execute: mode=${executionMode}; pipelineStatus=${pipeline.status}; approval=${approvalPackage.eligibility.status}; executionPlan=${executionPlan.eligibility.status}; execution=${executionResult.status}`,
  };
}
