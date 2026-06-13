/**
 * Phase 7F-11 reconstruction planning gate contract.
 *
 * This module defines metadata-only planning contracts between deterministic
 * Reconstruction Readiness and future AI Reconstruction. It does not generate
 * React, blocks, semantic candidates, reconstruction jobs, approvals, or
 * publishable artifacts. It does not change capture, preview, importer,
 * route discovery, asset rewriting, persistence, worker, or AI behavior.
 */

import type {
  EvidenceCaptureReadinessOptionalEvidence,
  EvidenceCaptureReadinessRequiredField,
} from "./reconstruction-readiness-evaluation";
import type {
  ReconstructionBlocker,
  ReconstructionBlockerId,
  ReconstructionReadinessLevel,
} from "./reconstruction-input-contract";

export const RECONSTRUCTION_PLANNING_CONTRACT_VERSION = "7F-11" as const;

export const RECONSTRUCTION_PLANNING_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ReconstructionPlanningConfidenceLevel =
  (typeof RECONSTRUCTION_PLANNING_CONFIDENCE_LEVELS)[number];

export const RECONSTRUCTION_PLANNING_REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_more_evidence",
] as const;
export type ReconstructionPlanningReviewStatus =
  (typeof RECONSTRUCTION_PLANNING_REVIEW_STATUSES)[number];

export const RECONSTRUCTION_CANDIDATE_TYPES = [
  "page",
  "section",
  "component",
  "widget",
  "navigation",
  "content_collection",
  "form",
  "gallery",
  "map",
  "footer",
  "unknown",
] as const;
export type ReconstructionCandidateType = (typeof RECONSTRUCTION_CANDIDATE_TYPES)[number];

export type ReconstructionPlanningRouteScope = {
  scopeType: "single_route" | "route_set" | "site";
  routes: string[];
};

export type ReconstructionPlanningReadinessSummary = {
  readinessLevel: ReconstructionReadinessLevel;
  minimumReadyReached: boolean;
  blockerCount: number;
  blockerIds: ReconstructionBlockerId[];
  requiredFieldsPresent: EvidenceCaptureReadinessRequiredField[];
  requiredFieldsMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
  optionalEvidenceMissing: EvidenceCaptureReadinessOptionalEvidence[];
  explanation: string;
};

export type ReconstructionPlanningEvidenceSummary = {
  sourceEvidenceRefs: string[];
  requiredFieldsPresent: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
  notes: string[];
};

export type ReconstructionCandidate = {
  candidateId: string;
  candidateType: ReconstructionCandidateType;
  sourceRoute: string;
  sourceEvidenceRefs: string[];
  confidence: ReconstructionPlanningConfidenceLevel;
  limitations: string[];
  notes: string[];
};

export type ReconstructionPlanningPackage = {
  kind: "reconstruction_planning_package_v1";
  contractVersion: typeof RECONSTRUCTION_PLANNING_CONTRACT_VERSION;
  packageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  readinessLevel: ReconstructionReadinessLevel;
  readinessSummary: ReconstructionPlanningReadinessSummary;
  blockers: ReconstructionBlocker[];
  limitations: string[];
  evidenceSummary: ReconstructionPlanningEvidenceSummary;
  reconstructionCandidates: ReconstructionCandidate[];
  confidenceLevel: ReconstructionPlanningConfidenceLevel;
  reviewStatus: ReconstructionPlanningReviewStatus;
};

export type ExistingReconstructionReadinessProjection = {
  readinessLevel: ReconstructionReadinessLevel;
  blockers?: ReconstructionBlocker[];
  blockerIds?: ReconstructionBlockerId[];
  requiredFieldsPresent?: EvidenceCaptureReadinessRequiredField[];
  requiredFieldsMissing?: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent?: EvidenceCaptureReadinessOptionalEvidence[];
  optionalEvidenceMissing?: EvidenceCaptureReadinessOptionalEvidence[];
  readinessExplanation?: string;
  explanation?: string;
};

export type ReconstructionPlanningEligibility =
  | {
      eligible: true;
      status: "eligible";
      readinessLevel: Exclude<ReconstructionReadinessLevel, "NOT_READY">;
      reason: string;
    }
  | {
      eligible: false;
      status: "not_eligible";
      readinessLevel: "NOT_READY";
      blockers: ReconstructionBlocker[];
      reason: string;
    };

export type CreateReconstructionPlanningPackageInput = {
  packageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  readinessProjection: ExistingReconstructionReadinessProjection;
  limitations?: string[];
  evidenceSummary?: Partial<ReconstructionPlanningEvidenceSummary>;
  reconstructionCandidates?: ReconstructionCandidate[];
  confidenceLevel: ReconstructionPlanningConfidenceLevel;
  reviewStatus?: ReconstructionPlanningReviewStatus;
};

function asBlockerIds(input: ExistingReconstructionReadinessProjection): ReconstructionBlockerId[] {
  return input.blockerIds ?? input.blockers?.map((blocker) => blocker.id) ?? [];
}

function summarizeReadinessProjection(
  input: ExistingReconstructionReadinessProjection,
): ReconstructionPlanningReadinessSummary {
  const blockerIds = asBlockerIds(input);

  return {
    readinessLevel: input.readinessLevel,
    minimumReadyReached: input.readinessLevel !== "NOT_READY",
    blockerCount: blockerIds.length,
    blockerIds,
    requiredFieldsPresent: input.requiredFieldsPresent ?? [],
    requiredFieldsMissing: input.requiredFieldsMissing ?? [],
    optionalEvidencePresent: input.optionalEvidencePresent ?? [],
    optionalEvidenceMissing: input.optionalEvidenceMissing ?? [],
    explanation: input.explanation ?? input.readinessExplanation ?? "",
  };
}

export function createReconstructionPlanningPackage(
  input: CreateReconstructionPlanningPackageInput,
): ReconstructionPlanningPackage {
  const readinessSummary = summarizeReadinessProjection(input.readinessProjection);

  return {
    kind: "reconstruction_planning_package_v1",
    contractVersion: RECONSTRUCTION_PLANNING_CONTRACT_VERSION,
    packageId: input.packageId,
    siteVersionId: input.siteVersionId,
    routeScope: input.routeScope,
    readinessLevel: input.readinessProjection.readinessLevel,
    readinessSummary,
    blockers: input.readinessProjection.blockers ?? [],
    limitations: input.limitations ?? [],
    evidenceSummary: {
      sourceEvidenceRefs: input.evidenceSummary?.sourceEvidenceRefs ?? [],
      requiredFieldsPresent:
        input.evidenceSummary?.requiredFieldsPresent ?? readinessSummary.requiredFieldsPresent,
      optionalEvidencePresent:
        input.evidenceSummary?.optionalEvidencePresent ?? readinessSummary.optionalEvidencePresent,
      notes: input.evidenceSummary?.notes ?? [],
    },
    reconstructionCandidates: input.reconstructionCandidates ?? [],
    confidenceLevel: input.confidenceLevel,
    reviewStatus: input.reviewStatus ?? "pending",
  };
}

export function evaluateReconstructionPlanningEligibility(
  readinessProjection: Pick<ExistingReconstructionReadinessProjection, "readinessLevel" | "blockers">,
): ReconstructionPlanningEligibility {
  if (readinessProjection.readinessLevel === "NOT_READY") {
    return {
      eligible: false,
      status: "not_eligible",
      readinessLevel: "NOT_READY",
      blockers: readinessProjection.blockers ?? [],
      reason: "Reconstruction planning is blocked until Reconstruction Readiness is at least MINIMUM_READY.",
    };
  }

  return {
    eligible: true,
    status: "eligible",
    readinessLevel: readinessProjection.readinessLevel,
    reason: `${readinessProjection.readinessLevel} is eligible for metadata-only reconstruction planning.`,
  };
}
