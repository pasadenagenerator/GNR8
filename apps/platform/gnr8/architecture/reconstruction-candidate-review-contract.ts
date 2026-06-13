/**
 * Phase 7F-13 reconstruction candidate review contract.
 *
 * This module defines the deterministic control-plane shape for future
 * human/operator review of Reconstruction Candidates. It does not discover
 * candidates, review candidates, approve execution, call AI systems, generate
 * React, generate blocks, execute reconstruction, persist reviews, dispatch
 * workers, change capture, change preview, or change publishing behavior.
 */

import type { ReconstructionReadinessLevel } from "./reconstruction-input-contract";
import type { ReconstructionPlanningRouteScope } from "./reconstruction-planning-contract";
import type {
  ReconstructionCandidateConfidenceLevel,
  ReconstructionCandidateDiscoveryStatus,
  ReconstructionCandidateType,
} from "./reconstruction-candidate-discovery-contract";

export const RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT_VERSION = "7F-13" as const;

export const RECONSTRUCTION_CANDIDATE_REVIEW_DECISIONS = [
  "approved",
  "rejected",
  "needs_more_evidence",
  "defer",
  "unsupported",
] as const;
export type ReconstructionCandidateReviewDecision =
  (typeof RECONSTRUCTION_CANDIDATE_REVIEW_DECISIONS)[number];

export const RECONSTRUCTION_CANDIDATE_REVIEW_PACKAGE_STATUSES = [
  "pending",
  "partially_reviewed",
  "approved",
  "rejected",
  "needs_more_evidence",
] as const;
export type ReconstructionCandidateReviewPackageStatus =
  (typeof RECONSTRUCTION_CANDIDATE_REVIEW_PACKAGE_STATUSES)[number];

export type ReconstructionCandidateReviewItem = {
  candidateId: string;
  candidateType: ReconstructionCandidateType;
  sourceRoute: string;
  reviewDecision: ReconstructionCandidateReviewDecision;
  confidenceLevel: ReconstructionCandidateConfidenceLevel;
  limitations: string[];
  evidenceRefs: string[];
  reviewerNotes: string[];
};

export type ReconstructionCandidateReviewPackage = {
  kind: "reconstruction_candidate_review_package_v1";
  contractVersion: typeof RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT_VERSION;
  reviewPackageId: string;
  discoveryPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  reviewStatus: ReconstructionCandidateReviewPackageStatus;
  candidateReviews: ReconstructionCandidateReviewItem[];
  reviewerRef: string | null;
  reviewedAt: string | null;
  notes: string[];
};

export type CandidateReviewDiscoveryPackageOutput = {
  discoveryPackageId?: string;
  packageId?: string;
  discoveryStatus: ReconstructionCandidateDiscoveryStatus;
  candidateCount: number;
  readinessLevel: ReconstructionReadinessLevel;
};

export type ReconstructionCandidateReviewEligibility =
  | {
      eligible: true;
      status: "eligible";
      discoveryStatus: "discovery_complete";
      candidateCount: number;
      readinessLevel: ReconstructionReadinessLevel;
      reason: string;
    }
  | {
      eligible: false;
      status: "not_eligible";
      discoveryStatus: ReconstructionCandidateDiscoveryStatus;
      candidateCount: number;
      readinessLevel: ReconstructionReadinessLevel;
      reason: string;
    };

export type ReconstructionCandidateReviewSummary = {
  totalCandidates: number;
  approvedCount: number;
  rejectedCount: number;
  needsMoreEvidenceCount: number;
  deferredCount: number;
  unsupportedCount: number;
  overallStatus: ReconstructionCandidateReviewPackageStatus;
};

export type CreateReconstructionCandidateReviewPackageInput = {
  reviewPackageId: string;
  discoveryPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  reviewStatus?: ReconstructionCandidateReviewPackageStatus;
  candidateReviews?: ReconstructionCandidateReviewItem[];
  reviewerRef?: string | null;
  reviewedAt?: string | null;
  notes?: string[];
};

export function createReconstructionCandidateReviewPackage(
  input: CreateReconstructionCandidateReviewPackageInput,
): ReconstructionCandidateReviewPackage {
  return {
    kind: "reconstruction_candidate_review_package_v1",
    contractVersion: RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT_VERSION,
    reviewPackageId: input.reviewPackageId,
    discoveryPackageId: input.discoveryPackageId,
    siteVersionId: input.siteVersionId,
    routeScope: input.routeScope,
    reviewStatus: input.reviewStatus ?? "pending",
    candidateReviews: input.candidateReviews ?? [],
    reviewerRef: input.reviewerRef ?? null,
    reviewedAt: input.reviewedAt ?? null,
    notes: input.notes ?? [],
  };
}

export function evaluateCandidateReviewEligibility(
  discoveryPackageOutput: CandidateReviewDiscoveryPackageOutput,
): ReconstructionCandidateReviewEligibility {
  if (discoveryPackageOutput.discoveryStatus !== "discovery_complete") {
    const reason =
      discoveryPackageOutput.discoveryStatus === "discovery_ready"
        ? "Candidate review is blocked until candidate discovery output exists."
        : "Candidate review is blocked until candidate discovery is complete.";

    return {
      eligible: false,
      status: "not_eligible",
      discoveryStatus: discoveryPackageOutput.discoveryStatus,
      candidateCount: discoveryPackageOutput.candidateCount,
      readinessLevel: discoveryPackageOutput.readinessLevel,
      reason,
    };
  }

  if (discoveryPackageOutput.candidateCount <= 0) {
    return {
      eligible: false,
      status: "not_eligible",
      discoveryStatus: discoveryPackageOutput.discoveryStatus,
      candidateCount: discoveryPackageOutput.candidateCount,
      readinessLevel: discoveryPackageOutput.readinessLevel,
      reason: "Candidate review is blocked because discovery completed without candidates.",
    };
  }

  return {
    eligible: true,
    status: "eligible",
    discoveryStatus: "discovery_complete",
    candidateCount: discoveryPackageOutput.candidateCount,
    readinessLevel: discoveryPackageOutput.readinessLevel,
    reason: "Discovery is complete and contains candidates eligible for human review.",
  };
}

function summarizeOverallReviewStatus(
  totalCandidates: number,
  approvedCount: number,
  rejectedCount: number,
  needsMoreEvidenceCount: number,
  deferredCount: number,
  unsupportedCount: number,
): ReconstructionCandidateReviewPackageStatus {
  if (totalCandidates === 0) {
    return "pending";
  }

  if (needsMoreEvidenceCount > 0) {
    return "needs_more_evidence";
  }

  if (deferredCount > 0) {
    return "partially_reviewed";
  }

  if (approvedCount === totalCandidates) {
    return "approved";
  }

  if (rejectedCount + unsupportedCount === totalCandidates) {
    return "rejected";
  }

  return "partially_reviewed";
}

export function summarizeCandidateReviewPackage(
  reviewPackage: Pick<ReconstructionCandidateReviewPackage, "candidateReviews">,
): ReconstructionCandidateReviewSummary {
  const totalCandidates = reviewPackage.candidateReviews.length;
  const approvedCount = reviewPackage.candidateReviews.filter(
    (review) => review.reviewDecision === "approved",
  ).length;
  const rejectedCount = reviewPackage.candidateReviews.filter(
    (review) => review.reviewDecision === "rejected",
  ).length;
  const needsMoreEvidenceCount = reviewPackage.candidateReviews.filter(
    (review) => review.reviewDecision === "needs_more_evidence",
  ).length;
  const deferredCount = reviewPackage.candidateReviews.filter(
    (review) => review.reviewDecision === "defer",
  ).length;
  const unsupportedCount = reviewPackage.candidateReviews.filter(
    (review) => review.reviewDecision === "unsupported",
  ).length;

  return {
    totalCandidates,
    approvedCount,
    rejectedCount,
    needsMoreEvidenceCount,
    deferredCount,
    unsupportedCount,
    overallStatus: summarizeOverallReviewStatus(
      totalCandidates,
      approvedCount,
      rejectedCount,
      needsMoreEvidenceCount,
      deferredCount,
      unsupportedCount,
    ),
  };
}
