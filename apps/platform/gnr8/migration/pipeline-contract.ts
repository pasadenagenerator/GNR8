import type { JsonValue } from "../import/import-contract";
import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import type { PreparedSiteModel } from "./prepared-site-model";
import type { LayoutPreparationModel } from "./layout-preparation-model";

export const LINEAR_MIGRATION_PIPELINE_VERSION = "1.0.0" as const;

export type PipelineInput = {
  importOutput: ImportOutput;
  importManifest: ImportManifest;
};

export type PipelineStageId =
  | "import_intake"
  | "structure_preparation"
  | "layout_preparation"
  | "render_preparation";

export const LINEAR_MIGRATION_STAGE_ORDER: readonly PipelineStageId[] = [
  "import_intake",
  "structure_preparation",
  "layout_preparation",
  "render_preparation",
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
      structure: StructurePreparationStageOutput;
      layoutModel: LayoutPreparationModel;
    }
  | {
      kind: "layout_preparation_skipped_v0";
      skippedBecauseStageId: PipelineStageId;
      layoutModel: LayoutPreparationModel;
    };

export type RenderPreparationStageOutput =
  | {
      kind: "render_preparation_ok_v0";
      layout: LayoutPreparationStageOutput;
      renderPreparation: {
        kind: "render_preparation_v0";
        renderPlan: {
          kind: "render_plan_v0";
          nodes: [];
        };
      };
    }
  | {
      kind: "render_preparation_skipped_v0";
      skippedBecauseStageId: PipelineStageId;
      renderPreparation: {
        kind: "render_preparation_v0";
        renderPlan: {
          kind: "render_plan_v0";
          nodes: [];
        };
      };
    };

export type LinearMigrationPipelineStageResult =
  | PipelineStageResult<"import_intake", ImportIntakeStageOutput>
  | PipelineStageResult<"structure_preparation", StructurePreparationStageOutput>
  | PipelineStageResult<"layout_preparation", LayoutPreparationStageOutput>
  | PipelineStageResult<"render_preparation", RenderPreparationStageOutput>;

export type LinearMigrationPipelineResult = PipelineResult<LinearMigrationPipelineStageResult>;
