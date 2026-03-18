import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import { hasStructuralImportBlockers } from "../import/import-severity-policy";
import type { ApprovalPackage } from "./approval-package-model";
import type { ExecutionPlan } from "./execution-plan-model";
import type { ExecutionResult } from "./execution-result-model";
import type { LinearMigrationPipelineResult, PipelineDiagnosticIssue, PipelineDiagnosticSeverity, PipelineStageId } from "./pipeline-contract";
import type { PreparedSiteModel } from "./prepared-site-model";
import type { LayoutPreparationModel } from "./layout-preparation-model";
import type { RenderOutput } from "./render-output-model";
import type { PreviewDocument } from "./preview-document-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Migration Run Report (deterministic; observability surface)
 * ------------------------------------------------------------------
 *
 * Determinism rules (normative):
 * - Derived purely from existing runtime artifacts (pipeline + approval + execution + input artifacts).
 * - No timestamps, durations, random IDs, environment metadata, or additional parsing passes.
 * - All lists are canonicalized with explicit ordering rules.
 */

export const MIGRATION_RUN_REPORT_VERSION = "1.0.0" as const;

export type MigrationRunOverallStatus = "success" | "success_with_warnings" | "blocked" | "failed";

export type MigrationRunArtifactKey =
  | "import_output"
  | "import_manifest"
  | "prepared_site_model"
  | "layout_preparation_model"
  | "render_output"
  | "preview_document"
  | "approval_package"
  | "execution_plan"
  | "execution_result";

export type MigrationRunStageId =
  | "run"
  | "import"
  | PipelineStageId
  | "approval"
  | "execution_plan"
  | "execution_simulation";

export type MigrationRunStageStatus = "success" | "success_with_warnings" | "blocked" | "failed" | "skipped";

export type MigrationRunArtifactAvailability = {
  artifactKey: MigrationRunArtifactKey;
  present: boolean;
  ref:
    | {
        kind: string;
        version: string | null;
        status: string | null;
      }
    | null;
  summary: string;
};

export type MigrationRunDiagnosticsSummary = {
  countsBySeverity: Record<PipelineDiagnosticSeverity, number>;
  uniqueCodes: string[];
};

export type MigrationRunStageFacts = {
  stageId: MigrationRunStageId;
  status: MigrationRunStageStatus;
  summaryToken: "STAGE_SUCCESS" | "STAGE_SUCCESS_WITH_WARNINGS" | "STAGE_BLOCKED" | "STAGE_FAILED" | "STAGE_SKIPPED";
  artifactKeys: MigrationRunArtifactKey[];
  diagnosticCodes: string[];
  facts: Record<string, string | number | boolean | null>;
};

export type MigrationRunEventKind = "artifact_presence_v1" | "stage_summary_v1";

export type MigrationRunEvent = {
  eventId: string;
  ordinal: number;
  stageId: MigrationRunStageId;
  kind: MigrationRunEventKind;
  status: MigrationRunStageStatus;
  sourceArtifactKey: MigrationRunArtifactKey | null;
  summaryToken: "ARTIFACT_PRESENT" | "ARTIFACT_MISSING" | MigrationRunStageFacts["summaryToken"];
  diagnosticCodes: string[];
};

export type MigrationRunReport = {
  kind: "migration_run_report_v1";
  reportVersion: typeof MIGRATION_RUN_REPORT_VERSION;

  /**
   * Stable run identifier derived from import fingerprints + pipeline version.
   */
  runId: string;

  overallStatus: MigrationRunOverallStatus;

  source: {
    import: {
      importContractVersion: ImportOutput["contractVersion"];
      importManifestVersion: ImportManifest["manifestVersion"];
      importOutputStatus: ImportOutput["status"];
      importManifestStatus: ImportManifest["status"];
      requestId: string | null;
      fingerprints: ImportOutput["documentMeta"]["fingerprints"];
    };
    pipeline: {
      pipelineVersion: LinearMigrationPipelineResult["pipelineVersion"];
      pipelineStatus: LinearMigrationPipelineResult["status"];
      stageOrder: readonly PipelineStageId[];
    };
    approval: {
      approvalPackageId: string;
      approvalStatus: ApprovalPackage["eligibility"]["status"];
    };
    execution: {
      executionPlanId: string;
      executionPlanEligibility: ExecutionPlan["eligibility"]["status"];
      executionResultId: string;
      executionStatus: ExecutionResult["status"];
    };
  };

  stageExecutionOrder: readonly MigrationRunStageId[];
  stages: MigrationRunStageFacts[];

  artifacts: {
    availability: MigrationRunArtifactAvailability[];
  };

  diagnostics: {
    pipeline: MigrationRunDiagnosticsSummary;
    byStage: { stageId: MigrationRunStageId; summary: MigrationRunDiagnosticsSummary }[];
    warnings: {
      codes: string[];
      sources: { source: string; codes: string[] }[];
    };
    blocking: {
      codes: string[];
      sources: { source: string; codes: string[] }[];
    };
  };

  approval: {
    status: ApprovalPackage["eligibility"]["status"];
    blockingReasonCodes: string[];
    warningCodes: string[];
    pageCounts: {
      total: number;
      previewable: number;
      notPreviewable: number;
    };
  };

  execution: {
    plan: {
      eligibility: ExecutionPlan["eligibility"]["status"];
      blockingReasonCodes: string[];
      warningCodes: string[];
      stepCount: number;
      targetArtifactCount: number;
    };
    result: {
      status: ExecutionResult["status"];
      executedStepCount: number;
      skippedStepCount: number;
      blockingReasonCodes: string[];
      warningCodes: string[];
      targetArtifactCount: number;
      failureCode: string | null;
    };
    trace: ExecutionResult["trace"];
  };

  events: MigrationRunEvent[];
  summary: string;
};

export type Phase1MigrationRunArtifacts = {
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function pipelineDiagnosticCounts(issues: PipelineDiagnosticIssue[]): Record<PipelineDiagnosticSeverity, number> {
  const out: Record<PipelineDiagnosticSeverity, number> = { fatal: 0, error: 0, warning: 0, info: 0 };
  for (const d of issues) out[d.severity]++;
  return out;
}

function pipelineDiagnosticCodes(issues: PipelineDiagnosticIssue[]): string[] {
  return uniqueSortedStrings(issues.map((d) => d.code));
}

function stageToken(status: MigrationRunStageStatus): MigrationRunStageFacts["summaryToken"] {
  if (status === "success") return "STAGE_SUCCESS";
  if (status === "success_with_warnings") return "STAGE_SUCCESS_WITH_WARNINGS";
  if (status === "blocked") return "STAGE_BLOCKED";
  if (status === "failed") return "STAGE_FAILED";
  return "STAGE_SKIPPED";
}

function mapPipelineStageStatus(status: LinearMigrationPipelineResult["stages"][number]["status"]): MigrationRunStageStatus {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  return "skipped";
}

function findPreparedSite(pipeline: LinearMigrationPipelineResult): PreparedSiteModel | null {
  const stage = pipeline.stages.find((s) => s.stageId === "structure_preparation");
  return stage ? stage.output.preparedSite : null;
}

function findLayoutModel(pipeline: LinearMigrationPipelineResult): LayoutPreparationModel | null {
  const stage = pipeline.stages.find((s) => s.stageId === "layout_preparation");
  return stage ? stage.output.layoutModel : null;
}

function findRenderOutput(pipeline: LinearMigrationPipelineResult): RenderOutput | null {
  const stage = pipeline.stages.find((s) => s.stageId === "render_preparation");
  return stage ? stage.output.renderOutput : null;
}

function findPreviewDocument(pipeline: LinearMigrationPipelineResult): PreviewDocument | null {
  const stage = pipeline.stages.find((s) => s.stageId === "preview_generation");
  return stage ? stage.output.previewDocument : null;
}

function importStageStatus(input: { importOutput: ImportOutput; importManifest: ImportManifest }): MigrationRunStageStatus {
  if (input.importManifest.status === "failed" || hasStructuralImportBlockers(input.importOutput)) return "failed";
  if (input.importManifest.status === "success_with_warnings") return "success_with_warnings";
  return "success";
}

function approvalStageStatus(status: ApprovalPackage["eligibility"]["status"]): MigrationRunStageStatus {
  if (status === "blocked") return "blocked";
  if (status === "approvable_with_warnings") return "success_with_warnings";
  return "success";
}

function executionPlanStageStatus(status: ExecutionPlan["eligibility"]["status"], hasWarnings: boolean): MigrationRunStageStatus {
  if (status === "blocked") return "blocked";
  return hasWarnings ? "success_with_warnings" : "success";
}

function executionResultStageStatus(status: ExecutionResult["status"]): MigrationRunStageStatus {
  if (status === "blocked") return "blocked";
  if (status === "failed") return "failed";
  if (status === "executed_with_warnings") return "success_with_warnings";
  return "success";
}

function computeOverallRunStatus(input: {
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
  warningsPresent: boolean;
}): MigrationRunOverallStatus {
  if (input.pipeline.status === "failed") return "failed";
  if (input.executionResult.status === "failed") return "failed";
  if (
    input.approvalPackage.eligibility.status === "blocked" ||
    input.executionPlan.eligibility.status === "blocked" ||
    input.executionResult.status === "blocked"
  ) {
    return "blocked";
  }
  if (input.warningsPresent) return "success_with_warnings";
  return "success";
}

function runIdFor(input: {
  pipelineVersion: LinearMigrationPipelineResult["pipelineVersion"];
  importContractVersion: ImportOutput["contractVersion"];
  importManifestVersion: ImportManifest["manifestVersion"];
  fingerprints: ImportOutput["documentMeta"]["fingerprints"];
}): string {
  return sha256Hex(
    stableStringify({
      kind: "migration_run_id_v1",
      pipelineVersion: input.pipelineVersion,
      importContractVersion: input.importContractVersion,
      importManifestVersion: input.importManifestVersion,
      fingerprints: input.fingerprints,
    }),
  );
}

function canonicalStageOrder(pipeline: LinearMigrationPipelineResult): MigrationRunStageId[] {
  return ["run", "import", ...pipeline.stageOrder, "approval", "execution_plan", "execution_simulation"];
}

function canonicalArtifactAvailability(input: {
  importOutput: ImportOutput;
  importManifest: ImportManifest;
  preparedSite: PreparedSiteModel | null;
  layoutModel: LayoutPreparationModel | null;
  renderOutput: RenderOutput | null;
  previewDocument: PreviewDocument | null;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
}): MigrationRunArtifactAvailability[] {
  const entries: MigrationRunArtifactAvailability[] = [
    {
      artifactKey: "import_output",
      present: true,
      ref: { kind: "import_output", version: input.importOutput.contractVersion, status: input.importOutput.status },
      summary: `importOutput: ${input.importOutput.status}; contract=${input.importOutput.contractVersion}`,
    },
    {
      artifactKey: "import_manifest",
      present: true,
      ref: { kind: "import_manifest", version: input.importManifest.manifestVersion, status: input.importManifest.status },
      summary: `importManifest: ${input.importManifest.status}; version=${input.importManifest.manifestVersion}`,
    },
    {
      artifactKey: "prepared_site_model",
      present: input.preparedSite !== null,
      ref:
        input.preparedSite === null
          ? null
          : { kind: input.preparedSite.kind, version: input.preparedSite.modelVersion, status: input.preparedSite.status },
      summary:
        input.preparedSite === null
          ? "preparedSiteModel: missing"
          : `preparedSiteModel: ${input.preparedSite.status}; version=${input.preparedSite.modelVersion}`,
    },
    {
      artifactKey: "layout_preparation_model",
      present: input.layoutModel !== null,
      ref:
        input.layoutModel === null
          ? null
          : { kind: input.layoutModel.kind, version: input.layoutModel.modelVersion, status: input.layoutModel.status },
      summary:
        input.layoutModel === null
          ? "layoutPreparationModel: missing"
          : `layoutPreparationModel: ${input.layoutModel.status}; version=${input.layoutModel.modelVersion}`,
    },
    {
      artifactKey: "render_output",
      present: input.renderOutput !== null,
      ref:
        input.renderOutput === null
          ? null
          : { kind: input.renderOutput.kind, version: input.renderOutput.modelVersion, status: input.renderOutput.status },
      summary:
        input.renderOutput === null
          ? "renderOutput: missing"
          : `renderOutput: ${input.renderOutput.status}; version=${input.renderOutput.modelVersion}`,
    },
    {
      artifactKey: "preview_document",
      present: input.previewDocument !== null,
      ref:
        input.previewDocument === null
          ? null
          : { kind: input.previewDocument.kind, version: input.previewDocument.modelVersion, status: input.previewDocument.status },
      summary:
        input.previewDocument === null
          ? "previewDocument: missing"
          : `previewDocument: ${input.previewDocument.status}; version=${input.previewDocument.modelVersion}`,
    },
    {
      artifactKey: "approval_package",
      present: true,
      ref: { kind: input.approvalPackage.kind, version: input.approvalPackage.packageVersion, status: input.approvalPackage.eligibility.status },
      summary: `approvalPackage: ${input.approvalPackage.eligibility.status}; id=${input.approvalPackage.approvalPackageId}`,
    },
    {
      artifactKey: "execution_plan",
      present: true,
      ref: { kind: input.executionPlan.kind, version: input.executionPlan.planVersion, status: input.executionPlan.eligibility.status },
      summary: `executionPlan: ${input.executionPlan.eligibility.status}; id=${input.executionPlan.executionPlanId}`,
    },
    {
      artifactKey: "execution_result",
      present: true,
      ref: { kind: input.executionResult.kind, version: input.executionResult.resultVersion, status: input.executionResult.status },
      summary: `executionResult: ${input.executionResult.status}; id=${input.executionResult.executionResultId}`,
    },
  ];

  return entries;
}

function buildStageFacts(input: {
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
}): MigrationRunStageFacts[] {
  const pipeline = input.pipeline;
  const importOutput = pipeline.input.importOutput;
  const importManifest = pipeline.input.importManifest;

  const preparedSite = findPreparedSite(pipeline);
  const layoutModel = findLayoutModel(pipeline);
  const renderOutput = findRenderOutput(pipeline);
  const previewDocument = findPreviewDocument(pipeline);

  const pipelineByStage = new Map<PipelineStageId, PipelineDiagnosticIssue[]>();
  for (const stage of pipeline.stages) {
    pipelineByStage.set(stage.stageId, stage.diagnostics);
  }

  const stageOrder = canonicalStageOrder(pipeline);
  const out: MigrationRunStageFacts[] = [];

  const importStatus = importStageStatus({ importOutput, importManifest });
  const approvalStatus = approvalStageStatus(input.approvalPackage.eligibility.status);
  const executionPlanStatus = executionPlanStageStatus(
    input.executionPlan.eligibility.status,
    input.executionPlan.eligibility.warningCodes.length > 0,
  );
  const executionStatus = executionResultStageStatus(input.executionResult.status);

  const stageStatusById: Record<MigrationRunStageId, MigrationRunStageStatus> = Object.create(null);
  stageStatusById.import = importStatus;
  stageStatusById.approval = approvalStatus;
  stageStatusById.execution_plan = executionPlanStatus;
  stageStatusById.execution_simulation = executionStatus;
  for (const s of pipeline.stages) stageStatusById[s.stageId] = mapPipelineStageStatus(s.status);

  // run stage mirrors overall status and is filled by caller; placeholder here.
  stageStatusById.run = "success";

  for (const stageId of stageOrder) {
    const status = stageStatusById[stageId] ?? "failed";
    const diagnosticCodes =
      typeof stageId === "string" && (stageId === "run" || stageId === "import" || stageId === "approval" || stageId === "execution_plan" || stageId === "execution_simulation")
        ? []
        : pipelineDiagnosticCodes(pipelineByStage.get(stageId as PipelineStageId) ?? []);

    const facts: Record<string, string | number | boolean | null> = Object.create(null);
    const artifactKeys: MigrationRunArtifactKey[] = [];

    if (stageId === "run") {
      // Populated after overall status is computed.
    } else if (stageId === "import") {
      artifactKeys.push("import_output", "import_manifest");
      const counts = importOutput.importDiagnostics.summary;
      facts.importOutputStatus = importOutput.status;
      facts.importManifestStatus = importManifest.status;
      facts.importDiagnosticsInfo = counts.infoCount;
      facts.importDiagnosticsWarning = counts.warningCount;
      facts.importDiagnosticsError = counts.errorCount;
      facts.importDiagnosticsFatal = counts.fatalCount;
      facts.importManifestDiagnosticCodes = importManifest.diagnostics.codes.length;
      facts.domDocuments = importManifest.dom.documentCount;
      facts.assetsReferenced = importManifest.assets.totalAssets;
    } else if (stageId === "import_intake") {
      artifactKeys.push("import_output", "import_manifest");
      const stage = pipeline.stages.find((s) => s.stageId === "import_intake");
      facts.pipelineStageStatus = stage?.status ?? null;
      facts.canProceed = stage?.output.canProceed ?? null;
      facts.blockedReason = stage?.output.blockedReason ?? null;
      facts.diagnosticsCount = (stage?.diagnostics.length ?? 0);
    } else if (stageId === "structure_preparation") {
      artifactKeys.push("prepared_site_model");
      facts.preparedSiteStatus = preparedSite?.status ?? null;
      facts.documentCount = preparedSite?.siteSummary.documentCount ?? null;
      facts.documentsWithDom = preparedSite?.siteSummary.documentsWithDomCount ?? null;
      facts.totalNodeCount = preparedSite?.siteSummary.totalNodeCount ?? null;
      facts.importDiagnosticCodes = preparedSite?.diagnostics.import.codes.length ?? null;
    } else if (stageId === "layout_preparation") {
      artifactKeys.push("layout_preparation_model");
      facts.layoutStatus = layoutModel?.status ?? null;
      facts.pages = layoutModel?.siteSummary.pageCount ?? null;
      facts.eligiblePages = layoutModel?.siteSummary.eligiblePageCount ?? null;
      facts.blocks = layoutModel?.siteSummary.totalBlockCount ?? null;
    } else if (stageId === "render_preparation") {
      artifactKeys.push("render_output");
      facts.renderStatus = renderOutput?.status ?? null;
      facts.pages = renderOutput?.siteSummary.pageCount ?? null;
      facts.eligiblePages = renderOutput?.siteSummary.eligiblePageCount ?? null;
      facts.renderedNodes = renderOutput?.siteSummary.renderedNodeCount ?? null;
      facts.rendererWarningCodes = renderOutput?.diagnostics.renderer.warnings.codes.length ?? null;
    } else if (stageId === "preview_generation") {
      artifactKeys.push("preview_document");
      facts.previewStatus = previewDocument?.status ?? null;
      facts.pages = previewDocument?.siteSummary.pageCount ?? null;
      facts.previewablePages = previewDocument?.siteSummary.previewablePageCount ?? null;
      facts.previewNodes = previewDocument?.siteSummary.previewNodeCount ?? null;
      facts.previewWarningCodes = previewDocument?.diagnostics.preview.warnings.codes.length ?? null;
    } else if (stageId === "approval") {
      artifactKeys.push("approval_package");
      facts.approvalStatus = input.approvalPackage.eligibility.status;
      facts.blockingReasons = input.approvalPackage.eligibility.blockingReasons.length;
      facts.warningCodes = input.approvalPackage.eligibility.warningCodes.length;
      facts.totalPages = input.approvalPackage.summary.pages.totalCount;
      facts.previewablePages = input.approvalPackage.summary.pages.previewableCount;
    } else if (stageId === "execution_plan") {
      artifactKeys.push("execution_plan");
      facts.eligibility = input.executionPlan.eligibility.status;
      facts.blockingReasons = input.executionPlan.eligibility.blockingReasons.length;
      facts.warningCodes = input.executionPlan.eligibility.warningCodes.length;
      facts.steps = input.executionPlan.steps.length;
      facts.targetArtifacts = input.executionPlan.targetArtifacts.length;
    } else if (stageId === "execution_simulation") {
      artifactKeys.push("execution_result");
      facts.executionStatus = input.executionResult.status;
      facts.executedSteps = input.executionResult.executedSteps.length;
      facts.skippedSteps = input.executionResult.skippedSteps.length;
      facts.warningCodes = input.executionResult.warningCodes.length;
      facts.blockingReasons = input.executionResult.blockingReasons.length;
      facts.targetArtifacts = input.executionResult.targetArtifacts.length;
      facts.failure = input.executionResult.failure?.code ?? null;
    }

    out.push({
      stageId,
      status,
      summaryToken: stageToken(status),
      artifactKeys,
      diagnosticCodes,
      facts,
    });
  }

  return out;
}

function setRunStageStatus(stages: MigrationRunStageFacts[], overallStatus: MigrationRunOverallStatus): void {
  const stage = stages.find((s) => s.stageId === "run");
  if (!stage) return;
  const mapped: MigrationRunStageStatus =
    overallStatus === "success"
      ? "success"
      : overallStatus === "success_with_warnings"
        ? "success_with_warnings"
        : overallStatus === "blocked"
          ? "blocked"
          : "failed";
  stage.status = mapped;
  stage.summaryToken = stageToken(mapped);
  stage.facts.overallStatus = overallStatus;
}

function buildEvents(input: {
  stageExecutionOrder: readonly MigrationRunStageId[];
  stages: MigrationRunStageFacts[];
  availability: MigrationRunArtifactAvailability[];
}): MigrationRunEvent[] {
  const stageFacts = new Map<MigrationRunStageId, MigrationRunStageFacts>();
  for (const s of input.stages) stageFacts.set(s.stageId, s);

  const availabilityByKey = new Map<MigrationRunArtifactKey, MigrationRunArtifactAvailability>();
  for (const a of input.availability) availabilityByKey.set(a.artifactKey, a);

  const events: MigrationRunEvent[] = [];
  let ordinal = 0;

  function pushEvent(e: Omit<MigrationRunEvent, "ordinal" | "eventId">) {
    const eventId = `evt_${String(ordinal).padStart(4, "0")}_${e.stageId}_${e.kind}`;
    events.push({ ...e, ordinal, eventId });
    ordinal++;
  }

  // Canonical rule:
  // - For each stage in stageExecutionOrder:
  //   1) emit artifact presence events for stage artifactKeys (in key order)
  //   2) emit exactly one stage summary event
  for (const stageId of input.stageExecutionOrder) {
    const stage = stageFacts.get(stageId);
    const artifactKeys = stage ? [...stage.artifactKeys].sort((a, b) => stringCmp(a, b)) : [];
    for (const artifactKey of artifactKeys) {
      const a = availabilityByKey.get(artifactKey);
      const present = a?.present ?? false;
      pushEvent({
        stageId,
        kind: "artifact_presence_v1",
        status: stage?.status ?? "failed",
        sourceArtifactKey: artifactKey,
        summaryToken: present ? "ARTIFACT_PRESENT" : "ARTIFACT_MISSING",
        diagnosticCodes: [],
      });
    }

    if (!stage) {
      pushEvent({
        stageId,
        kind: "stage_summary_v1",
        status: "failed",
        sourceArtifactKey: null,
        summaryToken: "STAGE_FAILED",
        diagnosticCodes: [],
      });
      continue;
    }

    pushEvent({
      stageId,
      kind: "stage_summary_v1",
      status: stage.status,
      sourceArtifactKey: null,
      summaryToken: stage.summaryToken,
      diagnosticCodes: stage.diagnosticCodes,
    });
  }

  return events;
}

function canonicalizeWarningAndBlockingDiagnostics(input: {
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;
  renderOutput: RenderOutput | null;
  previewDocument: PreviewDocument | null;
}): MigrationRunReport["diagnostics"] {
  const pipelineWarningCodes = input.pipeline.diagnostics.filter((d) => d.severity === "warning").map((d) => d.code);
  const renderWarningCodes = input.renderOutput?.diagnostics.renderer.warnings.codes ?? [];
  const previewWarningCodes = input.previewDocument?.diagnostics.preview.warnings.codes ?? [];
  const approvalWarningCodes = input.approvalPackage.eligibility.warningCodes;
  const executionWarningCodes = input.executionResult.warningCodes;

  const warningSources = [
    { source: "pipeline_diagnostics", codes: uniqueSortedStrings(pipelineWarningCodes) },
    { source: "render_output", codes: uniqueSortedStrings(renderWarningCodes) },
    { source: "preview_document", codes: uniqueSortedStrings(previewWarningCodes) },
    { source: "approval_package", codes: uniqueSortedStrings(approvalWarningCodes) },
    { source: "execution_result", codes: uniqueSortedStrings(executionWarningCodes) },
  ].filter((s) => s.codes.length > 0);

  const blockingSources = [
    { source: "approval_package", codes: uniqueSortedStrings(input.approvalPackage.eligibility.blockingReasons.map((r) => r.code)) },
    { source: "execution_plan", codes: uniqueSortedStrings(input.executionPlan.eligibility.blockingReasons.map((r) => r.code)) },
    { source: "execution_result", codes: uniqueSortedStrings(input.executionResult.blockingReasons) },
  ].filter((s) => s.codes.length > 0);

  const byStage: { stageId: MigrationRunStageId; summary: MigrationRunDiagnosticsSummary }[] = [];
  for (const stageId of input.pipeline.stageOrder) {
    const stage = input.pipeline.stages.find((s) => s.stageId === stageId);
    const issues = stage?.diagnostics ?? [];
    byStage.push({
      stageId,
      summary: {
        countsBySeverity: pipelineDiagnosticCounts(issues),
        uniqueCodes: pipelineDiagnosticCodes(issues),
      },
    });
  }

  return {
    pipeline: {
      countsBySeverity: pipelineDiagnosticCounts(input.pipeline.diagnostics),
      uniqueCodes: pipelineDiagnosticCodes(input.pipeline.diagnostics),
    },
    byStage,
    warnings: {
      codes: uniqueSortedStrings(warningSources.flatMap((s) => s.codes)),
      sources: warningSources.sort((a, b) => stringCmp(a.source, b.source)),
    },
    blocking: {
      codes: uniqueSortedStrings(blockingSources.flatMap((s) => s.codes)),
      sources: blockingSources.sort((a, b) => stringCmp(a.source, b.source)),
    },
  };
}

/**
 * Deterministically derives a phase-1 MigrationRunReport from existing runtime artifacts.
 * No writes, no timestamps, no randomness, no additional parsing passes.
 */
export function createMigrationRunReport(input: Phase1MigrationRunArtifacts): MigrationRunReport {
  const pipeline = input.pipeline;
  const importOutput = pipeline.input.importOutput;
  const importManifest = pipeline.input.importManifest;

  const preparedSite = findPreparedSite(pipeline);
  const layoutModel = findLayoutModel(pipeline);
  const renderOutput = findRenderOutput(pipeline);
  const previewDocument = findPreviewDocument(pipeline);

  const diagnostics = canonicalizeWarningAndBlockingDiagnostics({
    pipeline,
    approvalPackage: input.approvalPackage,
    executionPlan: input.executionPlan,
    executionResult: input.executionResult,
    renderOutput,
    previewDocument,
  });

  const warningsPresent =
    diagnostics.warnings.codes.length > 0 ||
    importManifest.status === "success_with_warnings" ||
    input.approvalPackage.eligibility.status === "approvable_with_warnings" ||
    input.executionResult.status === "executed_with_warnings";

  const overallStatus = computeOverallRunStatus({
    pipeline,
    approvalPackage: input.approvalPackage,
    executionPlan: input.executionPlan,
    executionResult: input.executionResult,
    warningsPresent,
  });

  const runId = runIdFor({
    pipelineVersion: pipeline.pipelineVersion,
    importContractVersion: importOutput.contractVersion,
    importManifestVersion: importManifest.manifestVersion,
    fingerprints: importOutput.documentMeta.fingerprints,
  });

  const stageExecutionOrder = canonicalStageOrder(pipeline);
  const stages = buildStageFacts(input);
  setRunStageStatus(stages, overallStatus);

  const availability = canonicalArtifactAvailability({
    importOutput,
    importManifest,
    preparedSite,
    layoutModel,
    renderOutput,
    previewDocument,
    approvalPackage: input.approvalPackage,
    executionPlan: input.executionPlan,
    executionResult: input.executionResult,
  });

  const events = buildEvents({ stageExecutionOrder, stages, availability });

  const approvalBlockingReasonCodes = uniqueSortedStrings(input.approvalPackage.eligibility.blockingReasons.map((r) => r.code));
  const executionPlanBlockingReasonCodes = uniqueSortedStrings(input.executionPlan.eligibility.blockingReasons.map((r) => r.code));
  const executionResultBlockingReasonCodes = uniqueSortedStrings(input.executionResult.blockingReasons);

  return {
    kind: "migration_run_report_v1",
    reportVersion: MIGRATION_RUN_REPORT_VERSION,
    runId,
    overallStatus,
    source: {
      import: {
        importContractVersion: importOutput.contractVersion,
        importManifestVersion: importManifest.manifestVersion,
        importOutputStatus: importOutput.status,
        importManifestStatus: importManifest.status,
        requestId: importOutput.documentMeta.execution.requestId,
        fingerprints: importOutput.documentMeta.fingerprints,
      },
      pipeline: {
        pipelineVersion: pipeline.pipelineVersion,
        pipelineStatus: pipeline.status,
        stageOrder: pipeline.stageOrder,
      },
      approval: {
        approvalPackageId: input.approvalPackage.approvalPackageId,
        approvalStatus: input.approvalPackage.eligibility.status,
      },
      execution: {
        executionPlanId: input.executionPlan.executionPlanId,
        executionPlanEligibility: input.executionPlan.eligibility.status,
        executionResultId: input.executionResult.executionResultId,
        executionStatus: input.executionResult.status,
      },
    },
    stageExecutionOrder,
    stages,
    artifacts: {
      availability,
    },
    diagnostics,
    approval: {
      status: input.approvalPackage.eligibility.status,
      blockingReasonCodes: approvalBlockingReasonCodes,
      warningCodes: [...input.approvalPackage.eligibility.warningCodes],
      pageCounts: {
        total: input.approvalPackage.summary.pages.totalCount,
        previewable: input.approvalPackage.summary.pages.previewableCount,
        notPreviewable: input.approvalPackage.summary.pages.notPreviewableCount,
      },
    },
    execution: {
      plan: {
        eligibility: input.executionPlan.eligibility.status,
        blockingReasonCodes: executionPlanBlockingReasonCodes,
        warningCodes: [...input.executionPlan.eligibility.warningCodes],
        stepCount: input.executionPlan.steps.length,
        targetArtifactCount: input.executionPlan.targetArtifacts.length,
      },
      result: {
        status: input.executionResult.status,
        executedStepCount: input.executionResult.executedSteps.length,
        skippedStepCount: input.executionResult.skippedSteps.length,
        blockingReasonCodes: executionResultBlockingReasonCodes,
        warningCodes: [...input.executionResult.warningCodes],
        targetArtifactCount: input.executionResult.targetArtifacts.length,
        failureCode: input.executionResult.failure?.code ?? null,
      },
      trace: input.executionResult.trace,
    },
    events,
    summary: `migration_run_report: ${overallStatus}; runId=${runId}; stages=${stageExecutionOrder.length}; events=${events.length}; warnings=${diagnostics.warnings.codes.length}; blocking=${diagnostics.blocking.codes.length}`,
  };
}
