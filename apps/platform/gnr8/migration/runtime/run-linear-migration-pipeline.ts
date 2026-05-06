import type {
  DesignIntelligenceStageOutput,
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
  VisualAnalysisStageOutput,
} from "../pipeline-contract";
import { LINEAR_MIGRATION_PIPELINE_VERSION, LINEAR_MIGRATION_STAGE_ORDER } from "../pipeline-contract";
import type { ImportDiagnosticIssue } from "../../import/import-contract";
import { hasStructuralImportBlockers, isNonStructuralDegradedImportCode } from "../../import/import-severity-policy";

import { createPipelineDiagnosticIssue, sortPipelineDiagnosticIssues } from "./diagnostics";
import { createPreparedSiteModel } from "../prepared-site-model";
import { createDesignIntelligenceResult } from "../../design-intelligence/design-intelligence-service";
import { createLayoutPreparationModel } from "../layout-preparation-model";
import { createRenderOutput } from "../render-output-model";
import { createPreviewDocument } from "../preview-document-model";
import type { VisualAnalysisDiagnostic, VisualScreenshotInput } from "../../visual-analysis/visual-analysis-model";
import type { VisualAnalysisInterpreterProvider } from "../../visual-analysis/visual-analysis-ai-hook";
import { createVisualAnalysisModel } from "../../visual-analysis/visual-analysis-service";
import { extractStyleSignalModel, type StyleSignalModel } from "../../style-signals";
import type { ComputedStyleSample } from "../../import-rendered-capture";

export type RunLinearMigrationPipelineOptions = {
  visualAnalysisInput?: VisualScreenshotInput | null;
  resolveVisualAnalysisInput?: (input: { structure: StructurePreparationStageOutput }) => VisualScreenshotInput | null | undefined;
  visualInterpreterProvider?: VisualAnalysisInterpreterProvider | null;
  styleSignals?: StyleSignalModel | null;
  computedStyleSamples?: ComputedStyleSample[] | null;
  renderedCaptureContext?: {
    status?: "available" | "partial" | "failed" | null;
    quality?: "strong" | "weak" | "unusable" | null;
  } | null;
};

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
  visual_analysis: {
    input: "StructurePreparationStageOutput + VisualScreenshotInput(optional)",
    output: "VisualAnalysisStageOutput (ok|skipped) + VisualAnalysisModel",
  },
  design_intelligence: {
    input: "StructurePreparationStageOutput + VisualAnalysisStageOutput + PreparedSiteModel semantic context",
    output: "DesignIntelligenceStageOutput (ok|skipped) + DeterministicDesignModel + AiSuggestionMerge + DesignModel",
  },
  layout_preparation: {
    input: "DesignIntelligenceStageOutput + DesignModel",
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
    // Non-structural asset issues stay visible but are carried as warnings in pipeline flow.
    createPipelineDiagnosticIssue({
      stageId,
      source: "import",
      severity: issue.severity === "error" && isNonStructuralDegradedImportCode(issue.code) ? "warning" : issue.severity,
      code: issue.code,
      message: issue.message,
      location: issue.location,
      details: issue.details,
    }),
  );
}

function mapVisualDiagnosticsToPipelineStage(issue: VisualAnalysisDiagnostic) {
  return createPipelineDiagnosticIssue({
    stageId: "visual_analysis",
    source: "pipeline",
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    location: null,
    details: {
      pageId: issue.pageId,
      sectionId: issue.sectionId,
    },
  });
}

function runImportIntakeStage(input: PipelineInput): LinearMigrationPipelineStageResult & { stageId: "import_intake" } {
  const importIssues = mapImportDiagnosticsToPipelineStage("import_intake", input.importOutput.importDiagnostics.issues);
  const stageIssues: ReturnType<typeof createPipelineDiagnosticIssue>[] = [];

  const htmlByteLength = input.importOutput.rawDomSnapshot.documents.reduce((sum, doc) => sum + Math.max(0, doc.byteLength), 0);
  const rawHtmlAvailable = htmlByteLength > 0;
  const importStrictlyBlocked = input.importManifest.status === "failed" || hasStructuralImportBlockers(input.importOutput);
  const fallbackActivated = importStrictlyBlocked && rawHtmlAvailable;
  const importBlocked = importStrictlyBlocked && !rawHtmlAvailable;
  const status: PipelineStageStatus = importBlocked ? "failed" : "success";

  if (fallbackActivated) {
    stageIssues.push(
      createPipelineDiagnosticIssue({
        stageId: "import_intake",
        source: "pipeline",
        severity: "warning",
        code: "SITE_IMPORT_FALLBACK_ACTIVATED",
        message: "Import intake activated raw HTML fallback mode to continue pipeline execution.",
        location: null,
        details: {
          htmlByteLength,
          rawHtmlAvailable,
        },
      }),
      createPipelineDiagnosticIssue({
        stageId: "import_intake",
        source: "pipeline",
        severity: "warning",
        code: "SITE_IMPORT_FALLBACK_REASON",
        message: "Import intake reported strict-mode blockers; continuing in degraded HTML fallback mode.",
        location: null,
        details: {
          reasonCode: "import_failed",
        },
      }),
      createPipelineDiagnosticIssue({
        stageId: "import_intake",
        source: "pipeline",
        severity: "warning",
        code: "SITE_IMPORT_PIPELINE_CONTINUED_WITH_RAW_HTML",
        message: "Pipeline continued with available raw HTML despite strict intake failure.",
        location: null,
        details: {
          htmlByteLength,
          rawHtmlAvailable,
        },
      }),
    );
  }

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
          rawHtmlAvailable,
          htmlByteLength,
        },
      }),
    );
  }

  const diagnostics = [...importIssues, ...sortPipelineDiagnosticIssues(stageIssues)];

  const output: ImportIntakeStageOutput = importBlocked
    ? {
        kind: "import_intake_blocked_v0",
        pipelineInput: input,
        pipelineMode: "strict",
        canProceed: false,
        blockedReason: "import_failed",
      }
    : {
        kind: "import_intake_ok_v0",
        pipelineInput: input,
        pipelineMode: fallbackActivated ? "degraded_html_fallback" : "strict",
        canProceed: true,
        blockedReason: null,
      };

  const counts = input.importOutput.importDiagnostics.summary;
  const details = [
    `importOutput.status=${input.importOutput.status}`,
    `importManifest.status=${input.importManifest.status}`,
    `pipelineMode=${fallbackActivated ? "degraded_html_fallback" : "strict"}`,
    `rawHtmlAvailable=${rawHtmlAvailable}`,
    `htmlByteLength=${htmlByteLength}`,
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
    summary: stageSummary(
      "structure_preparation",
      status,
      shouldSkip
        ? [`blockedBy=${intakeStage.stageId}`]
        : [
            `docs=${preparedSite.documents.length}`,
            `semanticDocs=${preparedSite.documents.filter((doc) => doc.semantic !== null).length}`,
            `consolidatedSections=${preparedSite.documents.reduce((sum, doc) => sum + (doc.semantic?.consolidation.outputSectionCount ?? 0), 0)}`,
          ],
    ),
  };
}

function runVisualAnalysisStage(
  structureStage: LinearMigrationPipelineStageResult & { stageId: "structure_preparation" },
  options?: RunLinearMigrationPipelineOptions,
): LinearMigrationPipelineStageResult & { stageId: "visual_analysis" } {
  const shouldSkip = structureStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const visualInput =
    shouldSkip
      ? null
      : options?.resolveVisualAnalysisInput?.({
          structure: structureStage.output,
        }) ?? options?.visualAnalysisInput ?? null;

  const visualAnalysis = createVisualAnalysisModel(visualInput, {
    interpreterProvider: options?.visualInterpreterProvider ?? null,
  });
  const diagnostics = visualAnalysis.diagnostics.map((issue) => mapVisualDiagnosticsToPipelineStage(issue));

  const output: VisualAnalysisStageOutput = shouldSkip
    ? {
        kind: "visual_analysis_skipped_v1",
        skippedBecauseStageId: structureStage.stageId,
        structure: structureStage.output,
        visualAnalysis,
      }
    : {
        kind: "visual_analysis_ok_v1",
        structure: structureStage.output,
        visualAnalysis,
      };

  return {
    stageId: "visual_analysis",
    status,
    inputContract: STAGE_CONTRACTS.visual_analysis.input,
    outputContract: STAGE_CONTRACTS.visual_analysis.output,
    output,
    diagnostics: sortPipelineDiagnosticIssues(diagnostics),
    summary: stageSummary("visual_analysis", status, [
      ...(shouldSkip ? [`blockedBy=${structureStage.stageId}`] : []),
      `visualStatus=${visualAnalysis.status}`,
      `confidence=${visualAnalysis.confidence}`,
      `hero=${visualAnalysis.pageObservations.heroProminence}`,
      `density=${visualAnalysis.pageObservations.visualDensity}`,
      `style=${visualAnalysis.pageObservations.dominantVisualStyleFamily}`,
      `diagnostics=${visualAnalysis.diagnostics.length}`,
    ]),
  };
}

function runLayoutPreparationStage(
  designStage: LinearMigrationPipelineStageResult & { stageId: "design_intelligence" },
): LinearMigrationPipelineStageResult & { stageId: "layout_preparation" } {
  const shouldSkip = designStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const layoutModel = createLayoutPreparationModel(designStage.output.structure.preparedSite, designStage.output.designModel);

  const output: LayoutPreparationStageOutput = shouldSkip
    ? {
        kind: "layout_preparation_skipped_v0",
        skippedBecauseStageId: designStage.stageId,
        layoutModel,
      }
    : {
        kind: "layout_preparation_ok_v0",
        designIntelligence: designStage.output,
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
      ...(shouldSkip ? [`blockedBy=${designStage.stageId}`] : []),
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

function runDesignIntelligenceStage(
  visualStage: LinearMigrationPipelineStageResult & { stageId: "visual_analysis" },
  options?: RunLinearMigrationPipelineOptions,
): LinearMigrationPipelineStageResult & { stageId: "design_intelligence" } {
  const shouldSkip = visualStage.status !== "success";
  const status: PipelineStageStatus = shouldSkip ? "skipped" : "success";

  const resolvedStyleSignals =
    options?.computedStyleSamples && options.computedStyleSamples.length > 0
      ? extractStyleSignalModel({
          computedStyleSamples: options.computedStyleSamples,
          preparedSite: visualStage.output.structure.preparedSite,
          visualAnalysis: visualStage.output.visualAnalysis,
          renderedCaptureContext: options.renderedCaptureContext ?? null,
        })
      : options?.styleSignals ?? null;

  const designResult = createDesignIntelligenceResult(visualStage.output.structure.preparedSite, {
    visualAnalysis: visualStage.output.visualAnalysis,
    styleSignals: resolvedStyleSignals,
  });
  const designModel = designResult.designModel;
  const stageIssues = designModel.diagnostics.issues.map((issue) =>
    createPipelineDiagnosticIssue({
      stageId: "design_intelligence",
      source: "pipeline",
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      location: null,
      details: {
        pageId: issue.pageId,
      },
    }),
  );

  const output: DesignIntelligenceStageOutput = shouldSkip
    ? {
        kind: "design_intelligence_skipped_v2",
        skippedBecauseStageId: visualStage.stageId,
        structure: visualStage.output.structure,
        visual: visualStage.output,
        deterministicDesignModel: designResult.deterministicDesignModel,
        aiSuggestionInput: designResult.aiSuggestionInput,
        aiSuggestionMerge: designResult.aiSuggestionMerge,
        designModel,
      }
    : {
        kind: "design_intelligence_ok_v2",
        structure: visualStage.output.structure,
        visual: visualStage.output,
        deterministicDesignModel: designResult.deterministicDesignModel,
        aiSuggestionInput: designResult.aiSuggestionInput,
        aiSuggestionMerge: designResult.aiSuggestionMerge,
        designModel,
      };

  return {
    stageId: "design_intelligence",
    status,
    inputContract: STAGE_CONTRACTS.design_intelligence.input,
    outputContract: STAGE_CONTRACTS.design_intelligence.output,
    output,
    diagnostics: sortPipelineDiagnosticIssues(stageIssues),
    summary: stageSummary("design_intelligence", status, [
      ...(shouldSkip ? [`blockedBy=${visualStage.stageId}`] : []),
      `strategy=${designModel.layoutStrategy}`,
      `pageType=${designModel.pageType}`,
      `sectionDecisions=${designModel.sectionDecisions.length}`,
      `aiStatus=${designResult.aiSuggestionMerge.status}`,
      `aiAccepted=${designResult.aiSuggestionMerge.acceptedCount}`,
      `aiRejected=${designResult.aiSuggestionMerge.rejectedCount}`,
      `diagnostics=${designModel.diagnostics.codes.length}`,
    ]),
  };
}

export function runLinearMigrationPipeline(input: PipelineInput, options?: RunLinearMigrationPipelineOptions): LinearMigrationPipelineResult {
  const stages: LinearMigrationPipelineStageResult[] = [];

  const s1 = runImportIntakeStage(input);
  stages.push(s1);

  const s2 = runStructurePreparationStage(s1);
  stages.push(s2);

  const s3 = runVisualAnalysisStage(s2, options);
  stages.push(s3);

  const s4 = runDesignIntelligenceStage(s3, options);
  stages.push(s4);

  const s5 = runLayoutPreparationStage(s4);
  stages.push(s5);

  const s6 = runRenderPreparationStage(s5);
  stages.push(s6);

  const s7 = runPreviewGenerationStage(s6);
  stages.push(s7);

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
