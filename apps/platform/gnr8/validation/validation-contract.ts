import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import type { LinearMigrationPipelineResult, PipelineStageId, PipelineStageStatus } from "../migration/pipeline-contract";
import type { PreviewDocument } from "../migration/preview-document-model";
import type { ApprovalPackage } from "../migration/approval-package-model";
import type { ExecutionPlan } from "../migration/execution-plan-model";
import type { ExecutionResult } from "../migration/execution-result-model";
import type { MigrationRunOverallStatus, MigrationRunReport } from "../migration/migration-run-report";

export const FIRST_REAL_SITE_VALIDATION_VERSION = "1.0.0" as const;
export const REAL_SITE_VALIDATION_VERSION = FIRST_REAL_SITE_VALIDATION_VERSION;

export type ValidationOverallStatus = "passed" | "passed_with_warnings" | "blocked" | "failed";

export type ValidationFixtureId = "real-site-01" | "real-site-02" | "real-site-03" | "friend-site-01";

export type ValidationComparisonSlice = {
  fixtureId: ValidationFixtureId;
  overallValidationStatus: ValidationOverallStatus;
  pipelineStatus: LinearMigrationPipelineResult["status"];
  previewPageCount: number;
  renderedPageCount: number;
  keyDiagnosticCodes: string[];
  runReportOverallStatus: MigrationRunOverallStatus;
};

export type ValidationArtifactAvailability = {
  importOutput: boolean;
  importManifest: boolean;
  pipelineResult: boolean;
  visualAnalysis: boolean;
  designModel: boolean;
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
  design: {
    status: "available" | "missing";
    layoutStrategy: string | null;
    mergedLayoutStrategy: string | null;
    pageType: string | null;
    sectionDecisionCount: number;
    aiSuggestionStatus: "unavailable" | "no_suggestion" | "suggested" | "merged" | "rejected" | null;
    aiAcceptedCount: number;
    aiRejectedCount: number;
    aiIgnoredCount: number;
    rationaleSummary: string[];
    diagnosticCodes: string[];
    semanticSummary: {
      keySectionClassifications: Array<{ sectionId: string; semanticType: string; confidence: number }>;
      hasHero: boolean;
      hasNavigationOrHeader: boolean;
      hasFooter: boolean;
      hasPrimaryCta: boolean;
      brandSignalSummary: {
        primaryColorHint: string | null;
        secondaryColorHint: string | null;
        typographyHint: string | null;
        visualTone: string | null;
      };
      styleSignalSummary: {
        sourceMode: string | null;
        backgroundTone: string | null;
        primaryAccent: string | null;
        headingCategory: string | null;
        bodyCategory: string | null;
        spacingRhythm: string | null;
        layoutDensity: string | null;
        ctaStyle: string | null;
        ctaProminence: string | null;
        diagnostics: string[];
      };
      confidenceSummary: {
        high: number;
        medium: number;
        low: number;
      };
    };
  };
  visual: {
    status: "available" | "unavailable";
    confidence: "low" | "medium" | "high" | null;
    dominantVisualStyleFamily: string | null;
    heroProminence: "low" | "medium" | "high" | null;
    visualDensity: "low" | "medium" | "high" | null;
    spacingRhythm: "tight" | "balanced" | "airy" | null;
    readabilityTendency: "calm" | "balanced" | "dense" | null;
    ctaProminence: "low" | "medium" | "high" | null;
    diagnostics: string[];
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

  comparison: ValidationComparisonSlice;
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
