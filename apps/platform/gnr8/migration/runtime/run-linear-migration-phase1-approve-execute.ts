import type { PipelineInput } from "../pipeline-contract";
import type { LinearMigrationPipelineResult } from "../pipeline-contract";
import type { ApprovalPackage } from "../approval-package-model";
import type { ExecutionPlan } from "../execution-plan-model";
import type { ExecutionResult } from "../execution-result-model";
import type { MigrationRunReport } from "../migration-run-report";

import { runLinearMigrationPipeline } from "./run-linear-migration-pipeline";
import { createApprovalPackage } from "../approval-package-model";
import { createExecutionPlan } from "../execution-plan-model";
import { executePhase1ApplySimulation } from "../execution-result-model";
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

/**
 * Deterministic phase-1 approve → execute skeleton.
 *
 * - Runs the linear migration pipeline (through PreviewDocument generation).
 * - Derives ApprovalPackage deterministically from pipeline outputs.
 * - Derives ExecutionPlan deterministically from pipeline + approval.
 * - Executes a phase-1 simulation-only apply and returns structured ExecutionResult.
 */
export function runLinearMigrationPhase1ApproveExecute(input: PipelineInput): LinearMigrationPhase1ApproveExecuteResult {
  const pipeline = runLinearMigrationPipeline(input);
  const approvalPackage = createApprovalPackage(pipeline);
  const executionPlan = createExecutionPlan({ pipeline, approvalPackage });
  const executionResult = executePhase1ApplySimulation({ approvalPackage, executionPlan });
  const report = createMigrationRunReport({ pipeline, approvalPackage, executionPlan, executionResult });

  return {
    kind: "linear_migration_phase1_approve_execute_result_v1",
    pipeline,
    approvalPackage,
    executionPlan,
    executionResult,
    report,
    summary: `linear_migration_phase1_approve_execute: pipelineStatus=${pipeline.status}; approval=${approvalPackage.eligibility.status}; executionPlan=${executionPlan.eligibility.status}; execution=${executionResult.status}`,
  };
}
