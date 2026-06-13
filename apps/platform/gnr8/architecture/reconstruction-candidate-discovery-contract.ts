/**
 * Phase 7F-12 reconstruction candidate discovery contract.
 *
 * This module defines the deterministic control-plane shape for future
 * Reconstruction Candidate Discovery from Evidence Capture. It does not
 * discover candidates, call AI systems, generate React, generate blocks,
 * execute reconstruction, persist candidates, approve candidates, dispatch
 * workers, change capture, change preview, or change publishing behavior.
 */

import type { ReconstructionBlocker, ReconstructionReadinessLevel } from "./reconstruction-input-contract";
import type { ReconstructionPlanningRouteScope } from "./reconstruction-planning-contract";

export const RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT_VERSION = "7F-12" as const;

export const RECONSTRUCTION_CANDIDATE_DISCOVERY_STATUSES = [
  "not_started",
  "contract_only",
  "discovery_ready",
  "discovery_complete",
] as const;
export type ReconstructionCandidateDiscoveryStatus =
  (typeof RECONSTRUCTION_CANDIDATE_DISCOVERY_STATUSES)[number];

export const RECONSTRUCTION_CANDIDATE_TYPES = [
  "page",
  "navigation",
  "hero",
  "section",
  "content_collection",
  "article_listing",
  "article_detail",
  "card_group",
  "gallery",
  "form",
  "map",
  "widget",
  "footer",
  "layout_region",
  "design_token_group",
  "unknown",
] as const;
export type ReconstructionCandidateType = (typeof RECONSTRUCTION_CANDIDATE_TYPES)[number];

export const RECONSTRUCTION_CANDIDATE_CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type ReconstructionCandidateConfidenceLevel =
  (typeof RECONSTRUCTION_CANDIDATE_CONFIDENCE_LEVELS)[number];

export const RECONSTRUCTION_CANDIDATE_EVIDENCE_COVERAGE_STATUSES = [
  "unknown",
  "insufficient",
  "partial",
  "sufficient",
] as const;
export type ReconstructionCandidateEvidenceCoverageStatus =
  (typeof RECONSTRUCTION_CANDIDATE_EVIDENCE_COVERAGE_STATUSES)[number];

export type ReconstructionCandidateEvidence = {
  evidenceRefs: string[];
  routeRefs: string[];
  widgetRefs: string[];
  mediaRefs: string[];
  fontRefs: string[];
  limitationRefs: string[];
};

export type ReconstructionCandidateConfidence = {
  confidenceLevel: ReconstructionCandidateConfidenceLevel;
  confidenceReasoning: string[];
  evidenceCoverageStatus: ReconstructionCandidateEvidenceCoverageStatus;
};

export type ReconstructionDiscoveredCandidate = {
  candidateId: string;
  candidateType: ReconstructionCandidateType;
  sourceRoutes: string[];
  evidence: ReconstructionCandidateEvidence;
  confidence: ReconstructionCandidateConfidence;
  limitations: string[];
  notes: string[];
};

export type ReconstructionCandidateDiscoveryPackage = {
  kind: "reconstruction_candidate_discovery_package_v1";
  contractVersion: typeof RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT_VERSION;
  packageId: string;
  siteVersionId: string;
  planningPackageId: string;
  readinessLevel: ReconstructionReadinessLevel;
  routeScope: ReconstructionPlanningRouteScope;
  discoveryStatus: ReconstructionCandidateDiscoveryStatus;
  candidateCount: number;
  candidates: ReconstructionDiscoveredCandidate[];
  limitations: string[];
  notes: string[];
};

export type CandidateDiscoveryPlanningGateOutput = {
  planningPackageId?: string;
  packageId?: string;
  readinessLevel: ReconstructionReadinessLevel;
  blockers?: ReconstructionBlocker[];
};

export type ReconstructionCandidateDiscoveryEligibility =
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

export type CreateReconstructionCandidateDiscoveryPackageInput = {
  packageId: string;
  siteVersionId: string;
  planningPackageId: string;
  readinessLevel: ReconstructionReadinessLevel;
  routeScope: ReconstructionPlanningRouteScope;
  discoveryStatus?: ReconstructionCandidateDiscoveryStatus;
  candidates?: ReconstructionDiscoveredCandidate[];
  limitations?: string[];
  notes?: string[];
};

export function createReconstructionCandidateDiscoveryPackage(
  input: CreateReconstructionCandidateDiscoveryPackageInput,
): ReconstructionCandidateDiscoveryPackage {
  const candidates = input.candidates ?? [];

  return {
    kind: "reconstruction_candidate_discovery_package_v1",
    contractVersion: RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT_VERSION,
    packageId: input.packageId,
    siteVersionId: input.siteVersionId,
    planningPackageId: input.planningPackageId,
    readinessLevel: input.readinessLevel,
    routeScope: input.routeScope,
    discoveryStatus: input.discoveryStatus ?? "contract_only",
    candidateCount: candidates.length,
    candidates,
    limitations: input.limitations ?? [],
    notes: input.notes ?? [],
  };
}

export function evaluateCandidateDiscoveryEligibility(
  planningGateOutput: CandidateDiscoveryPlanningGateOutput,
): ReconstructionCandidateDiscoveryEligibility {
  if (planningGateOutput.readinessLevel === "NOT_READY") {
    return {
      eligible: false,
      status: "not_eligible",
      readinessLevel: "NOT_READY",
      blockers: planningGateOutput.blockers ?? [],
      reason: "Candidate discovery is blocked until Reconstruction Readiness is at least MINIMUM_READY.",
    };
  }

  return {
    eligible: true,
    status: "eligible",
    readinessLevel: planningGateOutput.readinessLevel,
    reason: `${planningGateOutput.readinessLevel} is eligible for candidate discovery.`,
  };
}
