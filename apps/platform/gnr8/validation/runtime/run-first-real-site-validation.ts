import path from "node:path";

import type { LinearMigrationPipelineStageResult, PipelineStageId, PipelineStageStatus } from "../../migration/pipeline-contract";
import type { RenderOutput } from "../../migration/render-output-model";
import type { PreviewDocument } from "../../migration/preview-document-model";
import type { ExecutionMode } from "../../migration/execution-plan-model";
import type { DesignModel } from "../../design-intelligence/design-model";
import type { AiSuggestionMergeResult } from "../../design-intelligence/ai-suggestion-model";

import type { ImportDiagnosticIssue } from "../../import/import-contract";
import { createImportManifest } from "../../import/import-manifest";
import { isStructuralBlockingImportIssue } from "../../import/import-severity-policy";
import { importStaticSite } from "../../import/runtime/import-static-site";
import { runLinearMigrationPhase1ApproveExecute } from "../../migration/runtime/run-linear-migration-phase1-approve-execute";
import type { PipelineDiagnosticIssue } from "../../migration/pipeline-contract";

import {
  REAL_SITE_VALIDATION_VERSION,
  type ValidationFixtureId,
  type ValidationOverallStatus,
  type ValidationRunResult,
  type ValidationSnapshotWriteSummary,
  type ValidationSummary,
} from "../validation-contract";
import { readValidationFixtureSpec, validationFixtureDirAbs } from "./fixture-spec";
import { writeFirstRealSiteValidationSnapshots } from "./snapshot-writer";

function stageStatusMap(stages: { stageId: PipelineStageId; status: PipelineStageStatus }[]): Record<PipelineStageId, PipelineStageStatus> {
  const out = Object.create(null) as Record<PipelineStageId, PipelineStageStatus>;
  for (const s of stages) out[s.stageId] = s.status;
  return out;
}

function findRenderOutput(pipelineStages: LinearMigrationPipelineStageResult[]): RenderOutput | null {
  const stage = pipelineStages.find((s) => s.stageId === "render_preparation");
  return stage?.output.renderOutput ?? null;
}

function findPreviewDocument(pipelineStages: LinearMigrationPipelineStageResult[]): PreviewDocument | null {
  const stage = pipelineStages.find((s) => s.stageId === "preview_generation");
  return stage?.output.previewDocument ?? null;
}

function findDesignModel(pipelineStages: LinearMigrationPipelineStageResult[]): DesignModel | null {
  const stage = pipelineStages.find((s) => s.stageId === "design_intelligence");
  return stage?.output.designModel ?? null;
}

function findDesignAiMerge(
  pipelineStages: LinearMigrationPipelineStageResult[],
): AiSuggestionMergeResult | null {
  const stage = pipelineStages.find((s) => s.stageId === "design_intelligence");
  if (!stage || !("aiSuggestionMerge" in stage.output)) return null;
  return stage.output.aiSuggestionMerge;
}

function mapReportStatusToValidation(status: "success" | "success_with_warnings" | "blocked" | "failed"): ValidationOverallStatus {
  if (status === "success") return "passed";
  if (status === "success_with_warnings") return "passed_with_warnings";
  if (status === "blocked") return "blocked";
  return "failed";
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function computeValidationSummary(input: {
  fixtureId: ValidationRunResult["fixtureId"];
  pipelineStages: { stageId: PipelineStageId; status: PipelineStageStatus; output: unknown }[];
  pipelineStatus: ValidationRunResult["pipelineResult"]["status"];
  approvalStatus: ValidationRunResult["approvalPackage"]["eligibility"]["status"];
  executionPlanEligibility: ValidationRunResult["executionPlan"]["eligibility"]["status"];
  executionStatus: ValidationRunResult["executionResult"]["status"];
  reportStatus: ValidationRunResult["migrationRunReport"]["overallStatus"];
  importDiagnostics: ImportDiagnosticIssue[];
  pipelineDiagnostics: PipelineDiagnosticIssue[];
  reportWarningCodes: string[];
  reportBlockingCodes: string[];
  designModel: DesignModel | null;
  designAiMerge: AiSuggestionMergeResult | null;
  previewDocument: PreviewDocument;
  renderOutput: RenderOutput | null;
}): ValidationSummary {
  const overallStatus = mapReportStatusToValidation(input.reportStatus);

  const importDiagnosticCodes = uniqueSortedStrings(input.importDiagnostics.map((d) => d.code));
  const pipelineDiagnosticCodes = uniqueSortedStrings(input.pipelineDiagnostics.map((d) => d.code));

  const keyCodes = uniqueSortedStrings([
    ...importDiagnosticCodes,
    ...pipelineDiagnosticCodes,
    ...input.reportWarningCodes,
    ...input.reportBlockingCodes,
  ]);

  const importBlockingCodes = uniqueSortedStrings(input.importDiagnostics.filter(isStructuralBlockingImportIssue).map((d) => d.code));
  const pipelineBlockingCodes = uniqueSortedStrings(
    input.pipelineDiagnostics.filter((d) => d.severity === "fatal" || d.severity === "error").map((d) => d.code),
  );

  const blockedReasonCodes =
    overallStatus === "blocked" || overallStatus === "failed"
      ? uniqueSortedStrings([...input.reportBlockingCodes, ...pipelineBlockingCodes, ...importBlockingCodes])
      : [];

  const previewPageCount = input.previewDocument.siteSummary.pageCount;
  const renderedPageCount = input.renderOutput?.siteSummary.pageCount ?? 0;

  return {
    kind: "validation_summary_v1",
    validationVersion: REAL_SITE_VALIDATION_VERSION,
    fixtureId: input.fixtureId,
    overallStatus,
    artifacts: {
      importOutput: true,
      importManifest: true,
      pipelineResult: true,
      designModel: input.designModel !== null,
      previewDocument: true,
      approvalPackage: true,
      executionPlan: true,
      executionResult: true,
      migrationRunReport: true,
    },
    pipeline: {
      status: input.pipelineStatus,
      stages: stageStatusMap(input.pipelineStages),
    },
    design: {
      status: input.designModel ? "available" : "missing",
      layoutStrategy: input.designModel?.layoutStrategy ?? null,
      mergedLayoutStrategy: input.designModel?.layoutStrategy ?? null,
      pageType: input.designModel?.pageType ?? null,
      sectionDecisionCount: input.designModel?.sectionDecisions.length ?? 0,
      aiSuggestionStatus: input.designAiMerge?.status ?? null,
      aiAcceptedCount: input.designAiMerge?.acceptedCount ?? 0,
      aiRejectedCount: input.designAiMerge?.rejectedCount ?? 0,
      aiIgnoredCount: input.designAiMerge?.ignoredCount ?? 0,
      rationaleSummary: (input.designModel?.rationale ?? []).map((r) => r.summary),
      diagnosticCodes: input.designModel?.diagnostics.codes ?? [],
      semanticSummary: {
        keySectionClassifications: (input.designModel?.sectionDecisions ?? []).slice(0, 8).map((decision) => ({
          sectionId: decision.sectionId,
          semanticType: decision.semanticType,
          confidence: decision.confidence,
        })),
        hasHero: Boolean((input.designModel?.sectionDecisions ?? []).some((d) => d.semanticType === "hero")),
        hasNavigationOrHeader: Boolean((input.designModel?.sectionDecisions ?? []).some((d) => d.semanticType === "header")),
        hasFooter: Boolean((input.designModel?.sectionDecisions ?? []).some((d) => d.semanticType === "footer")),
        hasPrimaryCta: Boolean((input.designModel?.sectionDecisions ?? []).some((d) => d.semanticType === "cta" && d.emphasis === "primary")),
        brandSignalSummary: {
          primaryColorHint: input.designModel?.colorSystem.primaryHint ?? null,
          secondaryColorHint: input.designModel?.colorSystem.secondaryHint ?? null,
          typographyHint: input.designModel?.typographyScale.profile ?? null,
          visualTone: input.designModel?.colorSystem.tone ?? null,
        },
        confidenceSummary: {
          high: (input.designModel?.sectionDecisions ?? []).filter((d) => d.confidence >= 0.8).length,
          medium: (input.designModel?.sectionDecisions ?? []).filter((d) => d.confidence >= 0.55 && d.confidence < 0.8).length,
          low: (input.designModel?.sectionDecisions ?? []).filter((d) => d.confidence < 0.55).length,
        },
      },
    },
    approval: {
      status: input.approvalStatus,
    },
    execution: {
      planEligibility: input.executionPlanEligibility,
      status: input.executionStatus,
    },
    report: {
      overallStatus: input.reportStatus,
    },
    counts: {
      previewPageCount,
      renderedPageCount,
    },
    diagnostics: {
      keyCodes,
      blockedReasonCodes,
    },
    comparison: {
      fixtureId: input.fixtureId,
      overallValidationStatus: overallStatus,
      pipelineStatus: input.pipelineStatus,
      previewPageCount,
      renderedPageCount,
      keyDiagnosticCodes: keyCodes,
      runReportOverallStatus: input.reportStatus,
    },
  };
}

export async function runRealSiteValidation(options?: {
  fixtureId?: ValidationFixtureId;
  writeSnapshots?: boolean;
  snapshotOutDirAbs?: string;
  requestId?: string;
  executionMode?: ExecutionMode;
  outputRootDir?: string;
  cleanOutputRoot?: boolean;
}): Promise<ValidationRunResult> {
  const fixtureId = options?.fixtureId ?? "real-site-01";
  const fixture = readValidationFixtureSpec(fixtureId);
  const fixtureRootDirAbs = validationFixtureDirAbs(fixtureId);
  const defaultSnapshotOutDirAbs = path.resolve(fixtureRootDirAbs, "..", "..", ".out");

  const importOutput = await importStaticSite({
    rootDir: fixtureRootDirAbs,
    requestId: options?.requestId ?? `validation-${fixtureId}`,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: fixture.entryHtmlPath,
      ...(fixture.assetsDirPath ? { assetsDirPath: fixture.assetsDirPath } : {}),
    },
  });
  const importManifest = createImportManifest(importOutput);

  const executionMode = options?.executionMode ?? "simulation";
  const phase1 = await runLinearMigrationPhase1ApproveExecute(
    { importOutput, importManifest },
    {
      executionMode,
      ...(executionMode === "materialize"
        ? {
            importRootDir: fixtureRootDirAbs,
            outputRootDir: options?.outputRootDir,
            cleanOutputRoot: options?.cleanOutputRoot,
          }
        : {}),
    },
  );
  const previewDocument = findPreviewDocument(phase1.pipeline.stages);
  if (!previewDocument) {
    throw new Error("internal_error: pipeline missing preview_generation previewDocument");
  }
  const renderOutput = findRenderOutput(phase1.pipeline.stages);
  const designModel = findDesignModel(phase1.pipeline.stages);
  const designAiMerge = findDesignAiMerge(phase1.pipeline.stages);

  const importDiagnostics = importOutput.importDiagnostics.issues;
  const pipelineDiagnostics = phase1.pipeline.diagnostics;
  const reportWarningCodes = phase1.report.diagnostics.warnings.codes;
  const reportBlockingCodes = phase1.report.diagnostics.blocking.codes;

  const validationSummary = computeValidationSummary({
    fixtureId: fixture.fixtureId,
    pipelineStages: phase1.pipeline.stages,
    pipelineStatus: phase1.pipeline.status,
    approvalStatus: phase1.approvalPackage.eligibility.status,
    executionPlanEligibility: phase1.executionPlan.eligibility.status,
    executionStatus: phase1.executionResult.status,
    reportStatus: phase1.report.overallStatus,
    importDiagnostics,
    pipelineDiagnostics,
    reportWarningCodes,
    reportBlockingCodes,
    designModel,
    designAiMerge,
    previewDocument,
    renderOutput,
  });

  let snapshots: ValidationSnapshotWriteSummary = {
    enabled: Boolean(options?.writeSnapshots || options?.snapshotOutDirAbs),
    outDirAbs: null,
    writtenFiles: [],
  };

  const snapshotOutDirAbs = options?.snapshotOutDirAbs ?? (options?.writeSnapshots ? defaultSnapshotOutDirAbs : null);
  if (snapshots.enabled && snapshotOutDirAbs) {
    // Write after summary is computed so snapshotting is not required for core runtime flow.
    const res: ValidationRunResult = {
      kind: "validation_run_result_v1",
      validationVersion: REAL_SITE_VALIDATION_VERSION,
      fixtureId: fixture.fixtureId,
      importOutput,
      importManifest,
      pipelineResult: phase1.pipeline,
      previewDocument,
      approvalPackage: phase1.approvalPackage,
      executionPlan: phase1.executionPlan,
      executionResult: phase1.executionResult,
      migrationRunReport: phase1.report,
      validationSummary,
      snapshots,
    };
    const written = writeFirstRealSiteValidationSnapshots({ outDirAbs: snapshotOutDirAbs, result: res });
    snapshots = { enabled: true, outDirAbs: written.outDirAbs, writtenFiles: written.writtenFiles };
    return { ...res, snapshots };
  }

  return {
    kind: "validation_run_result_v1",
    validationVersion: REAL_SITE_VALIDATION_VERSION,
    fixtureId: fixture.fixtureId,
    importOutput,
    importManifest,
    pipelineResult: phase1.pipeline,
    previewDocument,
    approvalPackage: phase1.approvalPackage,
    executionPlan: phase1.executionPlan,
    executionResult: phase1.executionResult,
    migrationRunReport: phase1.report,
    validationSummary,
    snapshots,
  };
}

export async function runFirstRealSiteValidation(options?: {
  writeSnapshots?: boolean;
  snapshotOutDirAbs?: string;
  requestId?: string;
  executionMode?: ExecutionMode;
  outputRootDir?: string;
  cleanOutputRoot?: boolean;
}): Promise<ValidationRunResult> {
  return runRealSiteValidation({ ...options, fixtureId: "real-site-01" });
}
