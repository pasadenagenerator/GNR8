import type { JsonValue } from "../import/import-contract";
import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import type { PreparedSiteModel } from "./prepared-site-model";
import type { DesignModel } from "../design-intelligence/design-model";
import type { VisualAnalysisModel } from "../visual-analysis/visual-analysis-model";
import type { AiDesignSuggestionInput, AiSuggestionMergeResult } from "../design-intelligence/ai-suggestion-model";
import type { LayoutPreparationModel } from "./layout-preparation-model";
import type { RenderOutput } from "./render-output-model";
import type { PreviewDocument } from "./preview-document-model";

export const LINEAR_MIGRATION_PIPELINE_VERSION = "1.3.0" as const;

export type PipelineInput = {
  importOutput: ImportOutput;
  importManifest: ImportManifest;
};

export type PipelineStageId =
  | "import_intake"
  | "structure_preparation"
  | "visual_analysis"
  | "design_intelligence"
  | "layout_preparation"
  | "render_preparation"
  | "preview_generation";

export const LINEAR_MIGRATION_STAGE_ORDER: readonly PipelineStageId[] = [
  "import_intake",
  "structure_preparation",
  "visual_analysis",
  "design_intelligence",
  "layout_preparation",
  "render_preparation",
  "preview_generation",
] as const;

export type PipelineStageStatus = "success" | "failed" | "skipped";

export type PipelineDiagnosticSeverity = "info" | "warning" | "error" | "fatal";

export type PipelineDiagnosticLocation = {
  path: string | null;
  position:
    | {
        line: number;
        column: number;
      }
    | null;
  selector: string | null;
};

export type PipelineDiagnosticIssue = {
  /**
   * Deterministic identifier for stable de-duplication.
   */
  id: string;
  stageId: PipelineStageId;
  source: "import" | "pipeline";
  severity: PipelineDiagnosticSeverity;
  code: string;
  message: string;
  location: PipelineDiagnosticLocation | null;
  details: JsonValue | null;
};

export type PipelineStageResult<TStageId extends PipelineStageId, TStageOutput> = {
  stageId: TStageId;
  status: PipelineStageStatus;
  inputContract: string;
  outputContract: string;
  output: TStageOutput;
  diagnostics: PipelineDiagnosticIssue[];
  summary: string;
};

export type PipelineResult<TStageResult extends { stageId: PipelineStageId }> = {
  pipelineVersion: typeof LINEAR_MIGRATION_PIPELINE_VERSION;
  input: PipelineInput;
  stageOrder: readonly PipelineStageId[];
  stages: TStageResult[];
  status: "success" | "failed";
  diagnostics: PipelineDiagnosticIssue[];
  summary: string;
};

export type ImportIntakeStageOutput =
  | {
      kind: "import_intake_ok_v0";
      pipelineInput: PipelineInput;
      canProceed: true;
      blockedReason: null;
    }
  | {
      kind: "import_intake_blocked_v0";
      pipelineInput: PipelineInput;
      canProceed: false;
      blockedReason: "import_failed";
    };

export type StructurePreparationStageOutput =
  | {
      kind: "structure_preparation_ok_v1";
      intake: ImportIntakeStageOutput;
      preparedSite: PreparedSiteModel;
    }
  | {
      kind: "structure_preparation_skipped_v1";
      skippedBecauseStageId: PipelineStageId;
      preparedSite: PreparedSiteModel;
    };

export type LayoutPreparationStageOutput =
  | {
      kind: "layout_preparation_ok_v0";
      designIntelligence: DesignIntelligenceStageOutput;
      layoutModel: LayoutPreparationModel;
    }
  | {
      kind: "layout_preparation_skipped_v0";
      skippedBecauseStageId: PipelineStageId;
      layoutModel: LayoutPreparationModel;
    };

export type VisualAnalysisStageOutput =
  | {
      kind: "visual_analysis_ok_v1";
      structure: StructurePreparationStageOutput;
      visualAnalysis: VisualAnalysisModel;
    }
  | {
      kind: "visual_analysis_skipped_v1";
      skippedBecauseStageId: PipelineStageId;
      structure: StructurePreparationStageOutput;
      visualAnalysis: VisualAnalysisModel;
    };

export type RenderPreparationStageOutput =
  | {
      kind: "render_preparation_ok_v1";
      layout: LayoutPreparationStageOutput;
      renderOutput: RenderOutput;
    }
  | {
      kind: "render_preparation_skipped_v1";
      skippedBecauseStageId: PipelineStageId;
      renderOutput: RenderOutput;
    };

export type DesignIntelligenceStageOutput =
  | {
      kind: "design_intelligence_ok_v2";
      structure: StructurePreparationStageOutput;
      visual: VisualAnalysisStageOutput;
      deterministicDesignModel: DesignModel;
      aiSuggestionInput: AiDesignSuggestionInput | null;
      aiSuggestionMerge: AiSuggestionMergeResult;
      designModel: DesignModel;
    }
  | {
      kind: "design_intelligence_skipped_v2";
      skippedBecauseStageId: PipelineStageId;
      structure: StructurePreparationStageOutput;
      visual: VisualAnalysisStageOutput;
      deterministicDesignModel: DesignModel;
      aiSuggestionInput: AiDesignSuggestionInput | null;
      aiSuggestionMerge: AiSuggestionMergeResult;
      designModel: DesignModel;
    };

export type PreviewGenerationStageOutput =
  | {
      kind: "preview_generation_ok_v1";
      render: RenderPreparationStageOutput;
      previewDocument: PreviewDocument;
    }
  | {
      kind: "preview_generation_skipped_v1";
      skippedBecauseStageId: PipelineStageId;
      previewDocument: PreviewDocument;
    };

export type LinearMigrationPipelineStageResult =
  | PipelineStageResult<"import_intake", ImportIntakeStageOutput>
  | PipelineStageResult<"structure_preparation", StructurePreparationStageOutput>
  | PipelineStageResult<"visual_analysis", VisualAnalysisStageOutput>
  | PipelineStageResult<"design_intelligence", DesignIntelligenceStageOutput>
  | PipelineStageResult<"layout_preparation", LayoutPreparationStageOutput>
  | PipelineStageResult<"render_preparation", RenderPreparationStageOutput>
  | PipelineStageResult<"preview_generation", PreviewGenerationStageOutput>;

export type LinearMigrationPipelineResult = PipelineResult<LinearMigrationPipelineStageResult>;
