import type { PipelineDiagnosticIssue, PipelineDiagnosticSeverity, PipelineStageId } from "./pipeline-contract";
import type { LinearMigrationPipelineResult } from "./pipeline-contract";
import type { PreviewDocument, PreviewPageSummary } from "./preview-document-model";
import type { RenderOutput } from "./render-output-model";
import { sha256Hex, stableStringify } from "./runtime/diagnostics";

/**
 * Phase-1 Approval Package (deterministic; explicit approval boundary)
 * -------------------------------------------------------------------
 *
 * Purpose:
 * - Provide a pure deterministic "approval boundary" derived only from existing pipeline outputs.
 * - Capture eligibility (blocked vs approvable) and stable, inspectable references for an operator/UI.
 *
 * Approval status rule (normative; fixed & replayable):
 * - `blocked` if:
 *   - `pipeline.status === "failed"`, OR
 *   - `previewDocument.status === "blocked"`, OR
 *   - any pipeline diagnostic has severity `fatal` or `error`.
 * - `approvable_with_warnings` if not blocked AND there exist any warning codes.
 * - `approvable` otherwise.
 *
 * Warning codes are derived only from:
 * - pipeline diagnostics with severity `warning`
 * - renderOutput diagnostics warning codes
 * - previewDocument diagnostics warning codes
 *
 * Non-goals (phase-1):
 * - No UI workflow, no multi-user approval, no signatures, no timestamps.
 */

export const APPROVAL_PACKAGE_VERSION = "1.0.0" as const;

export type ApprovalEligibilityStatus = "approvable" | "approvable_with_warnings" | "blocked";

export type ApprovalBlockingReason = {
  code:
    | "PIPELINE_STATUS_FAILED"
    | "PREVIEW_DOCUMENT_BLOCKED"
    | "PIPELINE_DIAGNOSTIC_FATAL"
    | "PIPELINE_DIAGNOSTIC_ERROR"
    | "MISSING_REQUIRED_ARTIFACT";
  message: string;
  stageId: PipelineStageId | null;
  diagnosticId: string | null;
};

export type ApprovalSourceReferences = {
  pipeline: {
    pipelineVersion: LinearMigrationPipelineResult["pipelineVersion"];
    pipelineStatus: LinearMigrationPipelineResult["status"];
    stageOrder: readonly PipelineStageId[];
    stageSummaries: { stageId: PipelineStageId; status: string; summary: string }[];
    diagnosticCountsBySeverity: Record<PipelineDiagnosticSeverity, number>;
  };
  artifacts: {
    renderOutput: {
      kind: RenderOutput["kind"];
      modelVersion: RenderOutput["modelVersion"];
      status: RenderOutput["status"];
    } | null;
    previewDocument: {
      kind: PreviewDocument["kind"];
      modelVersion: PreviewDocument["modelVersion"];
      status: PreviewDocument["status"];
    } | null;
    fingerprints:
      | {
          importContractVersion: PreviewDocument["source"]["importContractVersion"];
          importManifestVersion: PreviewDocument["source"]["importManifestVersion"];
          fingerprints: PreviewDocument["source"]["fingerprints"];
        }
      | null;
  };
};

export type ApprovalSummary = {
  pages: {
    totalCount: number;
    previewableCount: number;
    notPreviewableCount: number;
    previewable: PreviewPageSummary[];
    notPreviewable: PreviewPageSummary[];
  };
};

export type ApprovalPackage = {
  kind: "approval_package_v1";
  packageVersion: typeof APPROVAL_PACKAGE_VERSION;

  /**
   * Deterministic id derived from the package payload (no random ids, no timestamps).
   */
  approvalPackageId: string;

  eligibility: {
    status: ApprovalEligibilityStatus;
    blockingReasons: ApprovalBlockingReason[];
    warningCodes: string[];
  };

  source: ApprovalSourceReferences;
  summary: ApprovalSummary;
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function diagnosticCounts(issues: PipelineDiagnosticIssue[]): Record<PipelineDiagnosticSeverity, number> {
  const out: Record<PipelineDiagnosticSeverity, number> = { fatal: 0, error: 0, warning: 0, info: 0 };
  for (const issue of issues) out[issue.severity]++;
  return out;
}

function canonicalPageSummaries(p: PreviewDocument): { previewable: PreviewPageSummary[]; notPreviewable: PreviewPageSummary[] } {
  const summaries = [...p.pageSummaries].sort((a, b) => {
    if (a.sourcePath !== b.sourcePath) return stringCmp(a.sourcePath, b.sourcePath);
    if (a.sourcePageId !== b.sourcePageId) return stringCmp(a.sourcePageId, b.sourcePageId);
    if (a.previewPageId !== b.previewPageId) return stringCmp(a.previewPageId, b.previewPageId);
    return 0;
  });

  const previewable: PreviewPageSummary[] = [];
  const notPreviewable: PreviewPageSummary[] = [];
  for (const s of summaries) {
    if (s.previewEligibility === "previewable") previewable.push(s);
    else notPreviewable.push(s);
  }
  return { previewable, notPreviewable };
}

function collectWarningCodes(input: {
  pipelineDiagnostics: PipelineDiagnosticIssue[];
  renderOutput: RenderOutput | null;
  previewDocument: PreviewDocument | null;
}): string[] {
  const codes = new Set<string>();

  for (const d of input.pipelineDiagnostics) {
    if (d.severity === "warning") codes.add(d.code);
  }
  for (const c of input.renderOutput?.diagnostics.renderer.warnings.codes ?? []) codes.add(c);
  for (const c of input.previewDocument?.diagnostics.preview.warnings.codes ?? []) codes.add(c);

  return [...codes].sort((a, b) => a.localeCompare(b));
}

function computeBlockingReasons(input: {
  pipeline: LinearMigrationPipelineResult;
  previewDocument: PreviewDocument | null;
}): ApprovalBlockingReason[] {
  const reasons: ApprovalBlockingReason[] = [];

  if (input.pipeline.status === "failed") {
    reasons.push({
      code: "PIPELINE_STATUS_FAILED",
      message: "Pipeline did not complete successfully.",
      stageId: null,
      diagnosticId: null,
    });
  }

  if (input.previewDocument?.status === "blocked") {
    reasons.push({
      code: "PREVIEW_DOCUMENT_BLOCKED",
      message: "Preview document is blocked (not previewable).",
      stageId: "preview_generation",
      diagnosticId: null,
    });
  }

  for (const d of input.pipeline.diagnostics) {
    if (d.severity === "fatal") {
      reasons.push({
        code: "PIPELINE_DIAGNOSTIC_FATAL",
        message: "Pipeline emitted fatal diagnostics.",
        stageId: d.stageId,
        diagnosticId: d.id,
      });
      break;
    }
  }

  for (const d of input.pipeline.diagnostics) {
    if (d.severity === "error") {
      reasons.push({
        code: "PIPELINE_DIAGNOSTIC_ERROR",
        message: "Pipeline emitted error diagnostics.",
        stageId: d.stageId,
        diagnosticId: d.id,
      });
      break;
    }
  }

  if (input.previewDocument === null) {
    reasons.push({
      code: "MISSING_REQUIRED_ARTIFACT",
      message: "Missing PreviewDocument (required for approval).",
      stageId: "preview_generation",
      diagnosticId: null,
    });
  }

  return reasons.sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const aStage = a.stageId ?? "";
    const bStage = b.stageId ?? "";
    if (aStage !== bStage) return aStage < bStage ? -1 : 1;
    const aDiag = a.diagnosticId ?? "";
    const bDiag = b.diagnosticId ?? "";
    return aDiag < bDiag ? -1 : aDiag > bDiag ? 1 : 0;
  });
}

function computeApprovalEligibilityStatus(input: {
  blockingReasons: ApprovalBlockingReason[];
  warningCodes: string[];
}): ApprovalEligibilityStatus {
  if (input.blockingReasons.length > 0) return "blocked";
  if (input.warningCodes.length > 0) return "approvable_with_warnings";
  return "approvable";
}

function approvalPackageIdFor(payload: Omit<ApprovalPackage, "approvalPackageId">): string {
  return sha256Hex(stableStringify(payload as unknown as Parameters<typeof stableStringify>[0]));
}

function stageSummaryRefs(pipeline: LinearMigrationPipelineResult): { stageId: PipelineStageId; status: string; summary: string }[] {
  return pipeline.stages.map((s) => ({ stageId: s.stageId, status: s.status, summary: s.summary }));
}

function findRenderOutput(pipeline: LinearMigrationPipelineResult): RenderOutput | null {
  const stage = pipeline.stages.find((s) => s.stageId === "render_preparation");
  if (!stage) return null;
  return stage.output.renderOutput;
}

function findPreviewDocument(pipeline: LinearMigrationPipelineResult): PreviewDocument | null {
  const stage = pipeline.stages.find((s) => s.stageId === "preview_generation");
  if (!stage) return null;
  return stage.output.previewDocument;
}

/**
 * Deterministically derives ApprovalPackage from the existing pipeline outputs.
 * No new parsing passes. No heuristics.
 */
export function createApprovalPackage(pipeline: LinearMigrationPipelineResult): ApprovalPackage {
  const renderOutput = findRenderOutput(pipeline);
  const previewDocument = findPreviewDocument(pipeline);

  const warningCodes = collectWarningCodes({ pipelineDiagnostics: pipeline.diagnostics, renderOutput, previewDocument });
  const blockingReasons = computeBlockingReasons({ pipeline, previewDocument });
  const status = computeApprovalEligibilityStatus({ blockingReasons, warningCodes });

  const pages = previewDocument ? canonicalPageSummaries(previewDocument) : { previewable: [], notPreviewable: [] };

  const base: Omit<ApprovalPackage, "approvalPackageId"> = {
    kind: "approval_package_v1",
    packageVersion: APPROVAL_PACKAGE_VERSION,
    eligibility: {
      status,
      blockingReasons,
      warningCodes,
    },
    source: {
      pipeline: {
        pipelineVersion: pipeline.pipelineVersion,
        pipelineStatus: pipeline.status,
        stageOrder: pipeline.stageOrder,
        stageSummaries: stageSummaryRefs(pipeline),
        diagnosticCountsBySeverity: diagnosticCounts(pipeline.diagnostics),
      },
      artifacts: {
        renderOutput:
          renderOutput === null
            ? null
            : { kind: renderOutput.kind, modelVersion: renderOutput.modelVersion, status: renderOutput.status },
        previewDocument:
          previewDocument === null
            ? null
            : { kind: previewDocument.kind, modelVersion: previewDocument.modelVersion, status: previewDocument.status },
        fingerprints:
          previewDocument === null
            ? null
            : {
                importContractVersion: previewDocument.source.importContractVersion,
                importManifestVersion: previewDocument.source.importManifestVersion,
                fingerprints: previewDocument.source.fingerprints,
              },
      },
    },
    summary: {
      pages: {
        totalCount: pages.previewable.length + pages.notPreviewable.length,
        previewableCount: pages.previewable.length,
        notPreviewableCount: pages.notPreviewable.length,
        previewable: pages.previewable,
        notPreviewable: pages.notPreviewable,
      },
    },
  };

  return {
    ...base,
    approvalPackageId: approvalPackageIdFor(base),
  };
}

