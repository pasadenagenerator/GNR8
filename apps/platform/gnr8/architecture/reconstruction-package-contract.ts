/**
 * Phase 7F-14 reconstruction package contract.
 *
 * This module defines the deterministic metadata package handed from future
 * Candidate Review into future Reconstruction. It does not execute
 * reconstruction, approve execution, call AI systems, generate React, generate
 * blocks, persist reconstruction, dispatch workers, change capture, change
 * preview, or change publishing behavior.
 */

import type { ReconstructionPlanningRouteScope } from "./reconstruction-planning-contract";
import type { ReconstructionReadinessLevel } from "./reconstruction-input-contract";
import type {
  ReconstructionCandidateConfidenceLevel,
  ReconstructionCandidateType,
} from "./reconstruction-candidate-discovery-contract";
import type {
  ReconstructionCandidateReviewItem,
  ReconstructionCandidateReviewPackage,
} from "./reconstruction-candidate-review-contract";

export const RECONSTRUCTION_PACKAGE_CONTRACT_VERSION = "7F-14" as const;

export const RECONSTRUCTION_INTENT_VALUES = [
  "recreate_as_native_block",
  "preserve_as_embed",
  "preserve_as_external_widget",
  "convert_to_runtime_provider",
  "defer",
  "unsupported",
] as const;
export type ReconstructionIntent = (typeof RECONSTRUCTION_INTENT_VALUES)[number];

export const RECONSTRUCTION_PACKAGE_STATUSES = [
  "draft",
  "ready_for_reconstruction",
  "needs_more_evidence",
  "blocked",
  "archived",
] as const;
export type ReconstructionPackageStatus = (typeof RECONSTRUCTION_PACKAGE_STATUSES)[number];

export const RECONSTRUCTION_EXECUTION_READINESS_VALUES = [
  "not_ready",
  "ready_for_dry_run",
  "ready_for_future_execution",
] as const;
export type ReconstructionExecutionReadiness =
  (typeof RECONSTRUCTION_EXECUTION_READINESS_VALUES)[number];

export type ReconstructionPackageLimitationSeverity = "note" | "warning" | "blocker";

export type ReconstructionPackageLimitation = {
  limitationId: string;
  severity: ReconstructionPackageLimitationSeverity;
  sourceCandidateId: string | null;
  message: string;
};

export type ApprovedReconstructionCandidate = {
  candidateId: string;
  candidateType: ReconstructionCandidateType;
  sourceRoute: string;
  evidenceRefs: string[];
  confidenceLevel: ReconstructionCandidateConfidenceLevel;
  limitations: string[];
  reviewerNotes: string[];
  reconstructionIntent: ReconstructionIntent;
};

export type PackagedReviewedReconstructionCandidate = {
  candidateId: string;
  candidateType: ReconstructionCandidateType;
  sourceRoute: string;
  evidenceRefs: string[];
  confidenceLevel: ReconstructionCandidateConfidenceLevel;
  limitations: string[];
  reviewerNotes: string[];
};

export type ReconstructionPackageInstructions = {
  instructionSet: "reconstruction_package_contract_only_v1";
  dryRunBoundary: "future_dry_run_only";
  executionAllowed: false;
  outputGenerationAllowed: false;
  notes: string[];
};

export type ReconstructionPackage = {
  kind: "reconstruction_package_v1";
  contractVersion: typeof RECONSTRUCTION_PACKAGE_CONTRACT_VERSION;
  reconstructionPackageId: string;
  reviewPackageId: string;
  discoveryPackageId: string;
  planningPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  readinessLevel: ReconstructionReadinessLevel;
  packageStatus: ReconstructionPackageStatus;
  approvedCandidates: ApprovedReconstructionCandidate[];
  deferredCandidates: PackagedReviewedReconstructionCandidate[];
  unsupportedCandidates: PackagedReviewedReconstructionCandidate[];
  requiredEvidenceRefs: string[];
  limitations: ReconstructionPackageLimitation[];
  reconstructionInstructions: ReconstructionPackageInstructions;
  executionReadiness: ReconstructionExecutionReadiness;
  createdAt: string;
};

export type CreateReconstructionPackageFromReviewOptions = {
  reconstructionPackageId?: string;
  /**
   * Compatibility override for older review-package fixtures. Current review
   * packages carry planningPackageId directly so the control-plane chain can
   * link backward without synthetic IDs.
   */
  planningPackageId?: string;
  createdAt?: string;
  reconstructionInstructions?: Partial<Pick<ReconstructionPackageInstructions, "notes">>;
};

export type ReconstructionPackageSummary = {
  approvedCount: number;
  deferredCount: number;
  unsupportedCount: number;
  packageStatus: ReconstructionPackageStatus;
  executionReadiness: ReconstructionExecutionReadiness;
  blockerCount: number;
  limitationCount: number;
};

function reviewedCandidateFromItem(
  review: ReconstructionCandidateReviewItem,
): PackagedReviewedReconstructionCandidate {
  return {
    candidateId: review.candidateId,
    candidateType: review.candidateType,
    sourceRoute: review.sourceRoute,
    evidenceRefs: review.evidenceRefs,
    confidenceLevel: review.confidenceLevel,
    limitations: review.limitations,
    reviewerNotes: review.reviewerNotes,
  };
}

function defaultReconstructionIntent(
  review: ReconstructionCandidateReviewItem,
): ReconstructionIntent {
  if (review.candidateType === "map") {
    return "convert_to_runtime_provider";
  }

  if (review.candidateType === "widget") {
    return "preserve_as_external_widget";
  }

  if (review.candidateType === "unknown") {
    return "defer";
  }

  return "recreate_as_native_block";
}

function approvedCandidateFromItem(
  review: ReconstructionCandidateReviewItem,
): ApprovedReconstructionCandidate {
  return {
    ...reviewedCandidateFromItem(review),
    reconstructionIntent: defaultReconstructionIntent(review),
  };
}

function uniqueEvidenceRefs(candidates: ApprovedReconstructionCandidate[]): string[] {
  return Array.from(new Set(candidates.flatMap((candidate) => candidate.evidenceRefs)));
}

function limitationsFromReviewPackage(
  reviewPackage: ReconstructionCandidateReviewPackage,
): ReconstructionPackageLimitation[] {
  const limitations: ReconstructionPackageLimitation[] = [];

  for (const review of reviewPackage.candidateReviews) {
    for (const [index, limitation] of review.limitations.entries()) {
      limitations.push({
        limitationId: `${review.candidateId}:limitation:${index + 1}`,
        severity: review.reviewDecision === "needs_more_evidence" ? "blocker" : "warning",
        sourceCandidateId: review.candidateId,
        message: limitation,
      });
    }

    if (review.reviewDecision === "needs_more_evidence") {
      limitations.push({
        limitationId: `${review.candidateId}:needs_more_evidence`,
        severity: "blocker",
        sourceCandidateId: review.candidateId,
        message: "Candidate review requires more evidence before reconstruction packaging can proceed.",
      });
    }

    if (review.reviewDecision === "rejected") {
      limitations.push({
        limitationId: `${review.candidateId}:rejected`,
        severity: "note",
        sourceCandidateId: review.candidateId,
        message: "Rejected review decision excluded this candidate from reconstruction packaging.",
      });
    }
  }

  for (const [index, note] of reviewPackage.notes.entries()) {
    limitations.push({
      limitationId: `${reviewPackage.reviewPackageId}:review_note:${index + 1}`,
      severity: "note",
      sourceCandidateId: null,
      message: note,
    });
  }

  return limitations;
}

function packageStatusForReview(
  reviewPackage: ReconstructionCandidateReviewPackage,
  approvedCandidates: ApprovedReconstructionCandidate[],
  limitations: ReconstructionPackageLimitation[],
): ReconstructionPackageStatus {
  if (reviewPackage.reviewStatus === "needs_more_evidence") {
    return "needs_more_evidence";
  }

  if (reviewPackage.candidateReviews.some((review) => review.reviewDecision === "needs_more_evidence")) {
    return "needs_more_evidence";
  }

  if (limitations.some((limitation) => limitation.severity === "blocker")) {
    return "blocked";
  }

  if (approvedCandidates.length > 0) {
    return "ready_for_reconstruction";
  }

  return "draft";
}

function executionReadinessForPackage(input: {
  approvedCandidates: ApprovedReconstructionCandidate[];
  limitations: ReconstructionPackageLimitation[];
  hasNeedsMoreEvidenceReview: boolean;
}): ReconstructionExecutionReadiness {
  if (input.approvedCandidates.length === 0) {
    return "not_ready";
  }

  if (input.hasNeedsMoreEvidenceReview) {
    return "not_ready";
  }

  if (input.limitations.some((limitation) => limitation.severity === "blocker")) {
    return "not_ready";
  }

  return "ready_for_dry_run";
}

export function createReconstructionPackageFromReview(
  reviewPackage: ReconstructionCandidateReviewPackage,
  options: CreateReconstructionPackageFromReviewOptions = {},
): ReconstructionPackage {
  const approvedCandidates = reviewPackage.candidateReviews
    .filter((review) => review.reviewDecision === "approved")
    .map(approvedCandidateFromItem);
  const deferredCandidates = reviewPackage.candidateReviews
    .filter((review) => review.reviewDecision === "defer")
    .map(reviewedCandidateFromItem);
  const unsupportedCandidates = reviewPackage.candidateReviews
    .filter((review) => review.reviewDecision === "unsupported")
    .map(reviewedCandidateFromItem);
  const limitations = limitationsFromReviewPackage(reviewPackage);
  const hasNeedsMoreEvidenceReview = reviewPackage.candidateReviews.some(
    (review) => review.reviewDecision === "needs_more_evidence",
  );

  const packageStatus = packageStatusForReview(reviewPackage, approvedCandidates, limitations);

  return {
    kind: "reconstruction_package_v1",
    contractVersion: RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
    reconstructionPackageId:
      options.reconstructionPackageId ?? `${reviewPackage.reviewPackageId}:reconstruction-package`,
    reviewPackageId: reviewPackage.reviewPackageId,
    discoveryPackageId: reviewPackage.discoveryPackageId,
    planningPackageId:
      options.planningPackageId ?? reviewPackage.planningPackageId,
    siteVersionId: reviewPackage.siteVersionId,
    routeScope: reviewPackage.routeScope,
    readinessLevel: reviewPackage.readinessLevel,
    packageStatus,
    approvedCandidates,
    deferredCandidates,
    unsupportedCandidates,
    requiredEvidenceRefs: uniqueEvidenceRefs(approvedCandidates),
    limitations,
    reconstructionInstructions: {
      instructionSet: "reconstruction_package_contract_only_v1",
      dryRunBoundary: "future_dry_run_only",
      executionAllowed: false,
      outputGenerationAllowed: false,
      notes: options.reconstructionInstructions?.notes ?? [],
    },
    executionReadiness: executionReadinessForPackage({
      approvedCandidates,
      limitations,
      hasNeedsMoreEvidenceReview,
    }),
    createdAt: options.createdAt ?? reviewPackage.reviewedAt ?? "",
  };
}

export function summarizeReconstructionPackage(
  reconstructionPackage: ReconstructionPackage,
): ReconstructionPackageSummary {
  return {
    approvedCount: reconstructionPackage.approvedCandidates.length,
    deferredCount: reconstructionPackage.deferredCandidates.length,
    unsupportedCount: reconstructionPackage.unsupportedCandidates.length,
    packageStatus: reconstructionPackage.packageStatus,
    executionReadiness: reconstructionPackage.executionReadiness,
    blockerCount: reconstructionPackage.limitations.filter(
      (limitation) => limitation.severity === "blocker",
    ).length,
    limitationCount: reconstructionPackage.limitations.length,
  };
}
