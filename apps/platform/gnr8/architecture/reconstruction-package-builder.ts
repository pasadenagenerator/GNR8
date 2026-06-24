/**
 * Phase 8E-3 Reconstruction Package builder.
 *
 * Pure deterministic mapping from one exact Candidate Review Package artifact
 * and its linked Candidate Discovery Result into a metadata-only
 * Reconstruction Package. This module does not persist, plan, generate,
 * execute, publish, or call AI systems.
 */

import {
  validateCandidateDiscoveryResult,
  type Candidate,
  type CandidateDiscoveryResult,
  type CandidateLimitation,
} from "./candidate-discovery-contract";
import {
  validateCandidateReviewPackage,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import {
  RECONSTRUCTION_PACKAGE_CONTRACT_VERSION,
  validateReconstructionPackage,
  type ReconstructionPackage,
  type ReconstructionPackageCandidateRef,
  type ReconstructionPackageStatus,
} from "./reconstruction-package-contract";

export type BuildReconstructionPackageInput = {
  readonly candidateReviewPackage: CandidateReviewPackage;
  readonly candidateDiscoveryResult: CandidateDiscoveryResult;
  readonly candidateReviewPackageArtifactId: string;
  readonly latestCandidateReviewPackageArtifactId: string;
  readonly contractVersion?: typeof RECONSTRUCTION_PACKAGE_CONTRACT_VERSION;
};

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function limitationToString(limitation: CandidateLimitation, source: string): string {
  const sourceRef = limitation.sourceRef ? ` sourceRef=${limitation.sourceRef}` : "";
  return `${source}:${limitation.severity}:${limitation.code}:${limitation.limitationId}:${limitation.message}${sourceRef}`;
}

function unknownLimitations(value: unknown, source: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((limitation, index) => {
    if (typeof limitation === "string") return `${source}:${limitation}`;
    if (typeof limitation === "object" && limitation !== null) {
      return `${source}:${JSON.stringify(limitation)}`;
    }
    return `${source}:limitation[${index}]=${String(limitation)}`;
  });
}

function buildSourceCandidateRef(candidateDiscoveryArtifactId: string, candidateId: string): string {
  return `candidate-discovery:${candidateDiscoveryArtifactId}:${candidateId}`;
}

function discoveryLimitationAppliesToCandidate(
  limitation: CandidateLimitation,
  candidate: Candidate,
): boolean {
  if (limitation.sourceRef === undefined) return true;
  const sourceRefs = new Set([
    candidate.candidateId,
    ...candidate.sourceEvidenceRefs.map((ref) => ref.refId),
    ...candidate.sourceDryRunRefs.map((ref) => ref.refId),
    ...candidate.limitations.map((candidateLimitation) => candidateLimitation.sourceRef).filter(Boolean),
  ]);
  return sourceRefs.has(limitation.sourceRef);
}

export function buildReconstructionPackage(
  input: BuildReconstructionPackageInput,
): ReconstructionPackage {
  const {
    candidateReviewPackage,
    candidateDiscoveryResult,
    candidateReviewPackageArtifactId,
    latestCandidateReviewPackageArtifactId,
  } = input;
  const contractVersion = input.contractVersion ?? RECONSTRUCTION_PACKAGE_CONTRACT_VERSION;
  const diagnostics: string[] = [];
  const limitations: string[] = [];

  const reviewValidation = validateCandidateReviewPackage(candidateReviewPackage);
  diagnostics.push(
    `REVIEW_PACKAGE_VALIDATION:${reviewValidation.valid ? "valid" : "invalid"}:errors=${reviewValidation.errors.length}:warnings=${reviewValidation.warnings.length}`,
  );
  diagnostics.push("LATEST_DECISIONS_VALIDATION:validated_by_candidate_review_contract");

  const discoveryValidation = validateCandidateDiscoveryResult(candidateDiscoveryResult);
  diagnostics.push(
    `DISCOVERY_RESULT_VALIDATION:${discoveryValidation.valid ? "valid" : "invalid"}:errors=${discoveryValidation.errors.length}:warnings=${discoveryValidation.warnings.length}`,
  );

  const stale = candidateReviewPackageArtifactId !== latestCandidateReviewPackageArtifactId;
  diagnostics.push(
    `STALE_REVIEW_PACKAGE_CHECK:${stale ? "stale" : "latest"}:candidateReviewPackageArtifactId=${candidateReviewPackageArtifactId}:latestCandidateReviewPackageArtifactId=${latestCandidateReviewPackageArtifactId}`,
  );
  if (stale) {
    limitations.push("builder:blocker:STALE_REVIEW_PACKAGE:Review Package artifact is not the latest package for this lineage.");
  }

  const lineageValid =
    candidateReviewPackage.candidateDiscoveryArtifactId === candidateReviewPackage.latestDecisions[0]?.candidateDiscoveryArtifactId ||
    candidateReviewPackage.latestDecisions.length === 0;
  const discoveryLineageMatches =
    candidateReviewPackage.siteVersionId === candidateDiscoveryResult.siteVersionId &&
    candidateReviewPackage.dryRunId === candidateDiscoveryResult.dryRunId;
  diagnostics.push(`LINEAGE_VALIDATION:${lineageValid && discoveryLineageMatches ? "valid" : "invalid"}`);
  diagnostics.push(
    `DISCOVERY_LINEAGE_MATCH:${discoveryLineageMatches ? "matched" : "mismatch"}:reviewSiteVersionId=${candidateReviewPackage.siteVersionId}:discoverySiteVersionId=${candidateDiscoveryResult.siteVersionId}:reviewDryRunId=${candidateReviewPackage.dryRunId}:discoveryDryRunId=${candidateDiscoveryResult.dryRunId}`,
  );
  if (!lineageValid || !discoveryLineageMatches) {
    limitations.push("builder:blocker:DISCOVERY_LINEAGE_MISMATCH:Review Package and Discovery Result lineage do not match.");
  }

  limitations.push(
    ...unknownLimitations(
      (candidateReviewPackage as unknown as { limitations?: unknown }).limitations,
      "review-package",
    ),
  );

  const reviewedCandidateIds = new Set(candidateReviewPackage.latestDecisions.map((decision) => decision.candidateId));
  const sourceApprovedDecisions = candidateReviewPackage.latestDecisions.filter((decision) => decision.decision === "approved");
  const rejectedCount = candidateReviewPackage.latestDecisions.filter((decision) => decision.decision === "rejected").length;
  const deferredCount = candidateReviewPackage.latestDecisions.filter((decision) => decision.decision === "deferred").length;
  const unreviewedCount = candidateDiscoveryResult.candidates.filter(
    (candidate) => !reviewedCandidateIds.has(candidate.candidateId),
  ).length;
  diagnostics.push(`APPROVED_CANDIDATE_COUNT:source=${sourceApprovedDecisions.length}`);
  diagnostics.push(`EXCLUDED_REJECTED_COUNT:${rejectedCount}`);
  diagnostics.push(`EXCLUDED_DEFERRED_COUNT:${deferredCount}`);
  diagnostics.push(`EXCLUDED_UNREVIEWED_COUNT:${unreviewedCount}`);

  const candidatesById = new Map(candidateDiscoveryResult.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const missingApprovedCandidateIds: string[] = [];
  const approvedCandidateRefs: ReconstructionPackageCandidateRef[] = [];
  const includedCandidates: Candidate[] = [];

  for (const decision of sourceApprovedDecisions) {
    const candidate = candidatesById.get(decision.candidateId);
    if (candidate === undefined) {
      missingApprovedCandidateIds.push(decision.candidateId);
      continue;
    }

    includedCandidates.push(candidate);
    const evidenceRefs = uniqueStrings([
      ...candidate.sourceEvidenceRefs.map((ref) => ref.refId),
      ...candidate.sourceDryRunRefs.map((ref) => ref.refId),
    ]);
    const candidateRef: ReconstructionPackageCandidateRef = {
      candidateId: candidate.candidateId,
      candidateType: candidate.candidateType,
      ...(candidate.routePath ? { routePath: candidate.routePath } : {}),
      decisionReviewEventId: decision.reviewEventId,
      decision: "approved",
      confidence: { level: candidate.confidence.level, reasons: [...candidate.confidence.reasons] },
      sourceCandidateRefs: [buildSourceCandidateRef(candidateReviewPackage.candidateDiscoveryArtifactId, candidate.candidateId)],
      ...(evidenceRefs.length > 0 ? { evidenceRefs } : {}),
    };
    approvedCandidateRefs.push(candidateRef);
  }

  diagnostics.push(
    `MISSING_APPROVED_CANDIDATE_CHECK:${missingApprovedCandidateIds.length === 0 ? "none" : missingApprovedCandidateIds.join(",")}`,
  );
  diagnostics.push(`INCLUDED_APPROVED_CANDIDATE_COUNT:${approvedCandidateRefs.length}`);
  if (missingApprovedCandidateIds.length > 0) {
    limitations.push(
      `builder:blocker:MISSING_APPROVED_CANDIDATE:Approved candidate refs were absent from linked Discovery Result: ${missingApprovedCandidateIds.join(",")}.`,
    );
  }

  const includedCandidateIds = new Set(includedCandidates.map((candidate) => candidate.candidateId));
  const includedSourceRefs = new Set(
    includedCandidates.flatMap((candidate) => [
      candidate.candidateId,
      ...candidate.sourceEvidenceRefs.map((ref) => ref.refId),
      ...candidate.sourceDryRunRefs.map((ref) => ref.refId),
    ]),
  );
  for (const candidate of includedCandidates) {
    for (const limitation of candidate.limitations) {
      limitations.push(limitationToString(limitation, `candidate:${candidate.candidateId}`));
    }
  }
  for (const limitation of candidateDiscoveryResult.limitations) {
    if (
      limitation.sourceRef === undefined ||
      includedSourceRefs.has(limitation.sourceRef) ||
      includedCandidateIds.has(limitation.sourceRef) ||
      includedCandidates.some((candidate) => discoveryLimitationAppliesToCandidate(limitation, candidate))
    ) {
      limitations.push(limitationToString(limitation, "discovery"));
    }
  }

  if (approvedCandidateRefs.length === 0) {
    limitations.push("builder:blocker:NO_APPROVED_CANDIDATES:No approved candidates are eligible for inclusion.");
  }

  let status: ReconstructionPackageStatus = "valid";
  if (!reviewValidation.valid || !discoveryValidation.valid || !lineageValid || !discoveryLineageMatches) {
    status = "invalid";
  } else if (stale) {
    status = "stale";
  } else if (approvedCandidateRefs.length === 0) {
    status = "blocked";
  }

  const reconstructionPackage: ReconstructionPackage = {
    reconstructionPackageId: `reconstruction-package:${candidateReviewPackageArtifactId}:${contractVersion}`,
    reconstructionPackageStatus: status,
    candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: candidateReviewPackage.candidateDiscoveryArtifactId,
    siteVersionId: candidateReviewPackage.siteVersionId,
    dryRunId: candidateReviewPackage.dryRunId,
    contractVersion,
    createdAt: candidateReviewPackage.createdAt,
    lineage: {
      candidateReviewPackageArtifactId,
      candidateReviewPackageId: candidateReviewPackage.reviewPackageId,
      candidateDiscoveryArtifactId: candidateReviewPackage.candidateDiscoveryArtifactId,
      siteVersionId: candidateReviewPackage.siteVersionId,
      dryRunId: candidateReviewPackage.dryRunId,
    },
    approvedCandidateRefs,
    eligibilitySummary: {
      approvedCount: approvedCandidateRefs.length,
      rejectedCount,
      deferredCount,
      unreviewedCount,
      includedCount: approvedCandidateRefs.length,
      excludedCount: rejectedCount + deferredCount + unreviewedCount,
    },
    limitations: uniqueStrings(limitations),
    diagnostics,
  };

  const validation = validateReconstructionPackage(reconstructionPackage);
  const validatedPackage: ReconstructionPackage = {
    ...reconstructionPackage,
    reconstructionPackageStatus: validation.valid ? reconstructionPackage.reconstructionPackageStatus : "invalid",
    diagnostics: [
      ...reconstructionPackage.diagnostics,
      `RECONSTRUCTION_PACKAGE_VALIDATION:${validation.valid ? "valid" : "invalid"}:errors=${validation.errors.length}:warnings=${validation.warnings.length}`,
      ...validation.errors.map((error) => `RECONSTRUCTION_PACKAGE_VALIDATION_ERROR:${error}`),
      ...validation.warnings.map((warning) => `RECONSTRUCTION_PACKAGE_VALIDATION_WARNING:${warning}`),
    ],
    limitations: validation.valid
      ? reconstructionPackage.limitations
      : uniqueStrings([
        ...reconstructionPackage.limitations,
        "builder:blocker:RECONSTRUCTION_PACKAGE_VALIDATION_FAILED:Reconstruction Package contract validation failed.",
      ]),
  };

  return validatedPackage;
}
