import type {
  ImportIntakeStageOutput,
  LayoutPreparationStageOutput,
  LinearMigrationPipelineResult,
  LinearMigrationPipelineStageResult,
  PipelineInput,
  PipelineStageId,
  PipelineStageStatus,
  PreviewGenerationStageOutput,
  RenderPreparationStageOutput,
  StructurePreparationStageOutput,
} from "../pipeline-contract";
import { LINEAR_MIGRATION_PIPELINE_VERSION, LINEAR_MIGRATION_STAGE_ORDER } from "../pipeline-contract";
import type { ImportDiagnosticIssue } from "../../import/import-contract";

import { createPipelineDiagnosticIssue, sortPipelineDiagnosticIssues } from "./diagnostics";
import { createPreparedSiteModel } from "../prepared-site-model";
import { createLayoutPreparationModel } from "../layout-preparation-model";
import { createRenderOutput } from "../render-output-model";
import { createPreviewDocument } from "../preview-document-model";

const STAGE_CONTRACTS: Record<
  PipelineStageId,
  {
    input: string;
    output: string;
  }
> = {
  import_intake: {
    input: "PipelineInput { importOutput: ImportOutput; importManifest: ImportManifest }",
    output: "ImportIntakeStageOutput (ok|blocked)",
  },
  structure_preparation: {
    input: "ImportIntakeStageOutput",
    output: "StructurePreparationStageOutput (ok|skipped) + PreparedSiteModel",
  },
  layout_preparation: {
    input: "StructurePreparationStageOutput",
    output: "LayoutPreparationStageOutput (ok|skipped)",
  },
  render_preparation: {
    input: "LayoutPreparationStageOutput",
    output: "RenderPreparationStageOutput (ok|skipped) + RenderOutput",
  },
  preview_generation: {
    input: "RenderPreparationStageOutput",
    output: "PreviewGenerationStageOutput (ok|skipped) + PreviewDocument",
  },
};

function stageSummary(stageId: PipelineStageId, status: PipelineStageStatus, details: string[]): string {
  const tail = details.length > 0 ? `; ${details.join("; ")}` : "";
  return `${stageId}: ${status}${tail}`;
}

function mapImportDiagnosticsToPipelineStage(
  stageId: "import_intake",
  importIssues: ImportDiagnosticIssue[],
) {
  return importIssues.map((issue) =>
    createPipelineDiagnosticIssue({
      stageId,
      source: "import",
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      location: issue.location,
      details: issue.details,
    }),
  );
}

function runImportIntakeStage(input: PipelineInput): LinearMigrationPipelineStageResult & { stageId: "import_intake" } {
  const importIssues = mapImportDiagnosticsToPipelineStage("import_intake", input.importOutput.importDiagnostics.issues);
  const stageIssues: ReturnType<typeof createPipelineDiagnosticIssue>[] = [];

  const importBlocked = input.importManifest.status === "failed" || input.importOutput.status === "failed";
  const status: PipelineStageStatus = importBlocked ? "failed" : "success";

  if (importBlocked) {
    stageIssues.push(
      createPipelineDiagnosticIssue({
        stageId: "import_intake",
        source: "pipeline",
        severity: "fatal",
        code: "PIPELINE_BLOCKED_BY_IMPORT",
        message: "Pipeline blocked because import was not successful.",
        location: null,
        details: {
          importOutputStatus: input.importOutput.status,
          importManifestStatus: input.importManifest.status,
        },
      }),
    );
  }

  const diagnostics = [...importIssues, ...sortPipelineDiagnosticIssues(stageIssues)];

  const output: ImportIntakeStageOutput = importBlocked
    ? {
        kind: "import_intake_blocked_v0",
        pipelineInput: input,
        canProceed: false,
        blockedReason: "import_failed",
      }
    : {
        kind: "import_intake_ok_v0",
        pipelineInput: input,
        canProceed: true,
        blockedReason: null,
      };

  const counts = input.importOutput.importDiagnostics.summary;
  const details = [
    `importOutput.status=${input.importOutput.status}`,
    `importManifest.status=${input.importManifest.status}`,
    `importDiagnostics(info=${counts.infoCount},warning=${counts.warningCount},error=${counts.errorCount},fatal=${counts.fatalCount})`,
  ];

  return {
    stageId: "import_intake",
    status,
    inputContract: STAGE_CONTRACTS.import_intake.input,
    outputContract: STAGE_CONTRACTS.import_intake.output,
    output,
    diagnostics,
    summary: stageSummary("import_intake", status, details),
  };
}

function runStructurePreparationStage(
  intakeStage: LinearMigrationPipelineStageResult & { stageId: "import_intake" },
): LinearMigrationPipelineStageResult & { stageId: "structure_preparation" } {
  const shouldSkip = intakeStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const preparedSite = createPreparedSiteModel(intakeStage.output.pipelineInput);

  const output: StructurePreparationStageOutput = shouldSkip
    ? {
        kind: "structure_preparation_skipped_v1",
        skippedBecauseStageId: intakeStage.stageId,
        preparedSite,
      }
    : {
        kind: "structure_preparation_ok_v1",
        intake: intakeStage.output,
        preparedSite,
      };

  return {
    stageId: "structure_preparation",
    status,
    inputContract: STAGE_CONTRACTS.structure_preparation.input,
    outputContract: STAGE_CONTRACTS.structure_preparation.output,
    output,
    diagnostics: [],
    summary: stageSummary("structure_preparation", status, shouldSkip ? [`blockedBy=${intakeStage.stageId}`] : ["no-op"]),
  };
}

function runLayoutPreparationStage(
  structureStage: LinearMigrationPipelineStageResult & { stageId: "structure_preparation" },
): LinearMigrationPipelineStageResult & { stageId: "layout_preparation" } {
  const shouldSkip = structureStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const layoutModel = createLayoutPreparationModel(structureStage.output.preparedSite);

  const output: LayoutPreparationStageOutput = shouldSkip
    ? {
        kind: "layout_preparation_skipped_v0",
        skippedBecauseStageId: structureStage.stageId,
        layoutModel,
      }
    : {
        kind: "layout_preparation_ok_v0",
        structure: structureStage.output,
        layoutModel,
      };

  return {
    stageId: "layout_preparation",
    status,
    inputContract: STAGE_CONTRACTS.layout_preparation.input,
    outputContract: STAGE_CONTRACTS.layout_preparation.output,
    output,
    diagnostics: [],
    summary: stageSummary("layout_preparation", status, [
      ...(shouldSkip ? [`blockedBy=${structureStage.stageId}`] : []),
      `pages=${layoutModel.siteSummary.pageCount}`,
      `blocks=${layoutModel.siteSummary.totalBlockCount}`,
      `layoutStatus=${layoutModel.status}`,
    ]),
  };
}

function runRenderPreparationStage(
  layoutStage: LinearMigrationPipelineStageResult & { stageId: "layout_preparation" },
): LinearMigrationPipelineStageResult & { stageId: "render_preparation" } {
  const shouldSkip = layoutStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const renderOutput = createRenderOutput(layoutStage.output.layoutModel);

  const output: RenderPreparationStageOutput = shouldSkip
    ? {
        kind: "render_preparation_skipped_v1",
        skippedBecauseStageId: layoutStage.stageId,
        renderOutput,
      }
    : {
        kind: "render_preparation_ok_v1",
        layout: layoutStage.output,
        renderOutput,
      };

  return {
    stageId: "render_preparation",
    status,
    inputContract: STAGE_CONTRACTS.render_preparation.input,
    outputContract: STAGE_CONTRACTS.render_preparation.output,
    output,
    diagnostics: [],
    summary: stageSummary("render_preparation", status, [
      ...(shouldSkip ? [`blockedBy=${layoutStage.stageId}`] : []),
      `renderStatus=${renderOutput.status}`,
      `pages=${renderOutput.siteSummary.pageCount}`,
      `renderedNodes=${renderOutput.siteSummary.renderedNodeCount}`,
    ]),
  };
}

function runPreviewGenerationStage(
  renderStage: LinearMigrationPipelineStageResult & { stageId: "render_preparation" },
): LinearMigrationPipelineStageResult & { stageId: "preview_generation" } {
  const shouldSkip = renderStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const previewDocument = createPreviewDocument(renderStage.output.renderOutput);

  const output: PreviewGenerationStageOutput = shouldSkip
    ? {
        kind: "preview_generation_skipped_v1",
        skippedBecauseStageId: renderStage.stageId,
        previewDocument,
      }
    : {
        kind: "preview_generation_ok_v1",
        render: renderStage.output,
        previewDocument,
      };

  return {
    stageId: "preview_generation",
    status,
    inputContract: STAGE_CONTRACTS.preview_generation.input,
    outputContract: STAGE_CONTRACTS.preview_generation.output,
    output,
    diagnostics: [],
    summary: stageSummary("preview_generation", status, [
      ...(shouldSkip ? [`blockedBy=${renderStage.stageId}`] : []),
      `previewStatus=${previewDocument.status}`,
      `pages=${previewDocument.siteSummary.pageCount}`,
      `previewablePages=${previewDocument.siteSummary.previewablePageCount}`,
      `previewNodes=${previewDocument.siteSummary.previewNodeCount}`,
    ]),
  };
}

export function runLinearMigrationPipeline(input: PipelineInput): LinearMigrationPipelineResult {
  const stages: LinearMigrationPipelineStageResult[] = [];

  const s1 = runImportIntakeStage(input);
  stages.push(s1);

  const s2 = runStructurePreparationStage(s1);
  stages.push(s2);

  const s3 = runLayoutPreparationStage(s2);
  stages.push(s3);

  const s4 = runRenderPreparationStage(s3);
  stages.push(s4);

  const s5 = runPreviewGenerationStage(s4);
  stages.push(s5);

  const diagnostics = stages.flatMap((s) => s.diagnostics);
  const status: LinearMigrationPipelineResult["status"] = stages.some((s) => s.status === "failed") ? "failed" : "success";

  const stageStatusCounts = { success: 0, failed: 0, skipped: 0 };
  for (const s of stages) stageStatusCounts[s.status]++;

  return {
    pipelineVersion: LINEAR_MIGRATION_PIPELINE_VERSION,
    input,
    stageOrder: LINEAR_MIGRATION_STAGE_ORDER,
    stages,
    status,
    diagnostics,
    summary: `linear_migration_pipeline: ${status}; stages=${stages.length}; success=${stageStatusCounts.success}; failed=${stageStatusCounts.failed}; skipped=${stageStatusCounts.skipped}`,
  };
}
