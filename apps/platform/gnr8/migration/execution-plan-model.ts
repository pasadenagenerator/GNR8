import type { LinearMigrationPipelineResult, PipelineStageId } from "./pipeline-contract";
import type { PreviewDocument, PreviewPageSummary } from "./preview-document-model";
import type { ApprovalPackage, ApprovalEligibilityStatus } from "./approval-package-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Execution Plan (deterministic; mode-explicit)
 * ----------------------------------------------------
 *
 * Purpose:
 * - Describe the exact deterministic intent of "phase-1 apply".
 * - Provide an explicit, ordered, replayable execution plan derived from existing artifacts.
 *
 * Execution eligibility rule (normative; fixed & replayable):
 * - `blocked` if:
 *   - approvalPackage.eligibility.status === "blocked", OR
 *   - PreviewDocument is missing, OR
 *   - PreviewDocument has 0 previewable pages.
 * - `eligible` otherwise.
 */

export const EXECUTION_PLAN_VERSION = "1.0.0" as const;

export type ExecutionMode = "simulation" | "materialize";

export type ExecutionEligibilityStatus = "eligible" | "blocked";

export type ExecutionStepId =
  | "validate_approval_package_v1"
  | "enumerate_preview_pages_v1"
  | "compute_target_artifacts_v1"
  | "materialize_static_output_bundle_v1"
  | "emit_execution_result_v1";

export type ExecutionStep = {
  stepId: ExecutionStepId;
  summary: string;
  /**
   * Stable references used by this step (phase-1 is preview-page driven).
   */
  sourcePreviewPageIds: string[];
};

export type Phase1TargetArtifact = {
  artifactId: string;
  kind: "phase1_target_artifact_placeholder_v1";
  /**
   * Stable placeholder reference for later real apply/export stages.
   * (Phase-1 simulation does not write.)
   */
  targetRef: {
    kind: "placeholder";
    namespace: "gnr8_phase1_apply_execution";
    key: string;
  };
  source: {
    previewPageId: string;
    sourcePath: string;
  };
};

export type ExecutionBlockingReason = {
  code: "APPROVAL_BLOCKED" | "PREVIEW_DOCUMENT_MISSING" | "NO_PREVIEWABLE_PAGES" | "MISSING_REQUIRED_ARTIFACT";
  message: string;
  stageId: PipelineStageId | null;
};

export type ExecutionPlan = {
  kind: "execution_plan_v1";
  planVersion: typeof EXECUTION_PLAN_VERSION;
  executionPlanId: string;

  executionMode: ExecutionMode;

  eligibility: {
    status: ExecutionEligibilityStatus;
    blockingReasons: ExecutionBlockingReason[];
    /**
     * Carried warning codes (for operators); eligibility can still be eligible with warnings.
     */
    warningCodes: string[];
    approvalStatus: ApprovalEligibilityStatus;
  };

  source: {
    approvalPackageId: string;
    previewDocument: {
      kind: PreviewDocument["kind"];
      modelVersion: PreviewDocument["modelVersion"];
      status: PreviewDocument["status"];
    } | null;
  };

  /**
   * Stable, canonical list of preview pages referenced by this plan.
   */
  previewPages: PreviewPageSummary[];

  /**
   * Deterministic target artifacts that would be materialized in later phases.
   * (Phase-1 simulation produces records only.)
   */
  targetArtifacts: Phase1TargetArtifact[];

  /**
   * Fixed ordered execution steps (canonical and stable).
   */
  steps: ExecutionStep[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function findPreviewDocument(pipeline: LinearMigrationPipelineResult): PreviewDocument | null {
  const stage = pipeline.stages.find((s) => s.stageId === "preview_generation");
  if (!stage) return null;
  return stage.output.previewDocument;
}

function canonicalPreviewPages(previewDocument: PreviewDocument): PreviewPageSummary[] {
  return [...previewDocument.pageSummaries].sort((a, b) => {
    if (a.sourcePath !== b.sourcePath) return stringCmp(a.sourcePath, b.sourcePath);
    if (a.sourcePageId !== b.sourcePageId) return stringCmp(a.sourcePageId, b.sourcePageId);
    if (a.previewPageId !== b.previewPageId) return stringCmp(a.previewPageId, b.previewPageId);
    return 0;
  });
}

function phase1TargetArtifactIdFor(input: { previewPageId: string; sourcePath: string }): string {
  return sha256Hex(
    stableStringify({
      kind: "phase1_target_artifact_id_v1",
      previewPageId: input.previewPageId,
      sourcePath: input.sourcePath,
    }),
  );
}

function buildPhase1TargetArtifacts(previewPages: PreviewPageSummary[]): Phase1TargetArtifact[] {
  const out: Phase1TargetArtifact[] = [];
  for (const page of previewPages) {
    if (page.previewEligibility !== "previewable") continue;
    const artifactId = phase1TargetArtifactIdFor({ previewPageId: page.previewPageId, sourcePath: page.sourcePath });
    out.push({
      artifactId,
      kind: "phase1_target_artifact_placeholder_v1",
      targetRef: {
        kind: "placeholder",
        namespace: "gnr8_phase1_apply_execution",
        key: `preview_page/${page.sourcePath}`,
      },
      source: { previewPageId: page.previewPageId, sourcePath: page.sourcePath },
    });
  }
  return out.sort((a, b) => {
    if (a.source.sourcePath !== b.source.sourcePath) return stringCmp(a.source.sourcePath, b.source.sourcePath);
    return stringCmp(a.source.previewPageId, b.source.previewPageId);
  });
}

function computeBlockingReasons(input: { approval: ApprovalPackage; previewDocument: PreviewDocument | null }): ExecutionBlockingReason[] {
  const reasons: ExecutionBlockingReason[] = [];
  if (input.approval.eligibility.status === "blocked") {
    reasons.push({
      code: "APPROVAL_BLOCKED",
      message: "Execution blocked because approval package is not eligible.",
      stageId: null,
    });
  }

  if (input.previewDocument === null) {
    reasons.push({
      code: "PREVIEW_DOCUMENT_MISSING",
      message: "Execution blocked because PreviewDocument is missing.",
      stageId: "preview_generation",
    });
    return reasons;
  }

  const previewableCount = input.previewDocument.siteSummary.previewablePageCount;
  if (previewableCount === 0) {
    reasons.push({
      code: "NO_PREVIEWABLE_PAGES",
      message: "Execution blocked because there are no previewable pages.",
      stageId: "preview_generation",
    });
  }

  return reasons.sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const aStage = a.stageId ?? "";
    const bStage = b.stageId ?? "";
    return aStage < bStage ? -1 : aStage > bStage ? 1 : 0;
  });
}

function executionPlanIdFor(payload: Omit<ExecutionPlan, "executionPlanId">): string {
  return sha256Hex(stableStringify(payload as unknown as Parameters<typeof stableStringify>[0]));
}

function buildSteps(previewPages: PreviewPageSummary[], executionMode: ExecutionMode): ExecutionStep[] {
  const previewableIds = previewPages.filter((p) => p.previewEligibility === "previewable").map((p) => p.previewPageId);
  const allIds = previewPages.map((p) => p.previewPageId);

  const stepRefs: Record<ExecutionStepId, string[]> = {
    validate_approval_package_v1: [],
    enumerate_preview_pages_v1: allIds,
    compute_target_artifacts_v1: previewableIds,
    materialize_static_output_bundle_v1: previewableIds,
    emit_execution_result_v1: [],
  };

  const stepSummaries: Record<ExecutionStepId, string> = {
    validate_approval_package_v1: "Validate approval package eligibility for phase-1 apply execution.",
    enumerate_preview_pages_v1: "Enumerate preview pages referenced by the preview artifact.",
    compute_target_artifacts_v1: "Compute deterministic target artifact placeholders for previewable pages (traceability only).",
    materialize_static_output_bundle_v1: "Materialize deterministic static output bundle for previewable pages when execution mode is materialize.",
    emit_execution_result_v1: "Emit deterministic structured execution result.",
  };

  const orderedStepIds: ExecutionStepId[] =
    executionMode === "materialize"
      ? [
          "validate_approval_package_v1",
          "enumerate_preview_pages_v1",
          "compute_target_artifacts_v1",
          "materialize_static_output_bundle_v1",
          "emit_execution_result_v1",
        ]
      : [
          "validate_approval_package_v1",
          "enumerate_preview_pages_v1",
          "compute_target_artifacts_v1",
          "emit_execution_result_v1",
        ];

  return orderedStepIds.map((stepId) => ({
    stepId,
    summary: stepSummaries[stepId],
    sourcePreviewPageIds: stepRefs[stepId],
  }));
}

/**
 * Deterministically derives ExecutionPlan from ApprovalPackage + existing pipeline outputs.
 * No writes. No timestamps. No random ids.
 */
export function createExecutionPlan(input: {
  pipeline: LinearMigrationPipelineResult;
  approvalPackage: ApprovalPackage;
  executionMode?: ExecutionMode;
}): ExecutionPlan {
  const executionMode = input.executionMode ?? "simulation";
  const previewDocument = findPreviewDocument(input.pipeline);
  const previewPages = previewDocument ? canonicalPreviewPages(previewDocument) : [];
  const targetArtifacts = buildPhase1TargetArtifacts(previewPages);
  const blockingReasons = computeBlockingReasons({ approval: input.approvalPackage, previewDocument });

  const base: Omit<ExecutionPlan, "executionPlanId"> = {
    kind: "execution_plan_v1",
    planVersion: EXECUTION_PLAN_VERSION,
    executionMode,
    eligibility: {
      status: blockingReasons.length > 0 ? "blocked" : "eligible",
      blockingReasons,
      warningCodes: input.approvalPackage.eligibility.warningCodes,
      approvalStatus: input.approvalPackage.eligibility.status,
    },
    source: {
      approvalPackageId: input.approvalPackage.approvalPackageId,
      previewDocument:
        previewDocument === null
          ? null
          : { kind: previewDocument.kind, modelVersion: previewDocument.modelVersion, status: previewDocument.status },
    },
    previewPages,
    targetArtifacts,
    steps: buildSteps(previewPages, executionMode),
  };

  return {
    ...base,
    executionPlanId: executionPlanIdFor(base),
  };
}
