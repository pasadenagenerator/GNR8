import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import type { LinearMigrationPipelineResult, PipelineStageId, PipelineStageStatus } from "../migration/pipeline-contract";
import type { PreviewDocument } from "../migration/preview-document-model";
import type { ApprovalPackage } from "../migration/approval-package-model";
import type { ExecutionPlan } from "../migration/execution-plan-model";
import type { ExecutionResult } from "../migration/execution-result-model";
import type { MigrationRunOverallStatus, MigrationRunReport } from "../migration/migration-run-report";

export const FIRST_REAL_SITE_VALIDATION_VERSION = "1.0.0" as const;

export type ValidationOverallStatus = "passed" | "passed_with_warnings" | "blocked" | "failed";

export type ValidationFixtureId = "real-site-01";

export type ValidationArtifactAvailability = {
  importOutput: boolean;
  importManifest: boolean;
  pipelineResult: boolean;
  previewDocument: boolean;
  approvalPackage: boolean;
  executionPlan: boolean;
  executionResult: boolean;
  migrationRunReport: boolean;
};

export type ValidationSummary = {
  kind: "validation_summary_v1";
  validationVersion: typeof FIRST_REAL_SITE_VALIDATION_VERSION;
  fixtureId: ValidationFixtureId;
  overallStatus: ValidationOverallStatus;

  artifacts: ValidationArtifactAvailability;

  pipeline: {
    status: LinearMigrationPipelineResult["status"];
    stages: Record<PipelineStageId, PipelineStageStatus>;
  };

  approval: {
    status: ApprovalPackage["eligibility"]["status"];
  };

  execution: {
    planEligibility: ExecutionPlan["eligibility"]["status"];
    status: ExecutionResult["status"];
  };

  report: {
    overallStatus: MigrationRunOverallStatus;
  };

  counts: {
    previewPageCount: number;
    renderedPageCount: number;
  };

  diagnostics: {
    keyCodes: string[];
    blockedReasonCodes: string[];
  };
};

export type ValidationSnapshotWriteSummary = {
  enabled: boolean;
  outDirAbs: string | null;
  writtenFiles: string[];
};

export type ValidationRunResult = {
  kind: "validation_run_result_v1";
  validationVersion: typeof FIRST_REAL_SITE_VALIDATION_VERSION;
  fixtureId: ValidationFixtureId;

  importOutput: ImportOutput;
  importManifest: ImportManifest;
  pipelineResult: LinearMigrationPipelineResult;
  previewDocument: PreviewDocument;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
  migrationRunReport: MigrationRunReport;

  validationSummary: ValidationSummary;
  snapshots: ValidationSnapshotWriteSummary;
};

