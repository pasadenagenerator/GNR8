import assert from "node:assert/strict";
import test from "node:test";

import {
  validateReconstructionPackage,
  RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS,
} from "./reconstruction-package-contract";
import { buildReconstructionPackage } from "./reconstruction-package-builder";
import {
  deriveLatestCandidateReviewDecisions,
  type CandidateReviewDecision,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";
import type {
  Candidate,
  CandidateDiscoveryResult,
  CandidateLimitation,
  CandidateType,
} from "./candidate-discovery-contract";

const CANDIDATE_DISCOVERY_ARTIFACT_ID = "candidate_discovery_result_1";
const CANDIDATE_REVIEW_PACKAGE_ARTIFACT_ID = "candidate_review_package_1";

function candidateLimitation(limitationId: string, sourceRef: string): CandidateLimitation {
  return {
    limitationId,
    severity: "warning",
    code: "SOURCE_DRY_RUN_LIMITATION",
    message: `${limitationId} applies.`,
    sourceRef,
  };
}

function candidate(
  candidateId: string,
  candidateType: CandidateType,
  routePath: string | undefined,
  overrides: Partial<Candidate> = {},
): Candidate {
  return {
    candidateId,
    candidateType,
    candidateStatus: "valid",
    confidence: { level: "HIGH", reasons: [`source_confidence:${candidateId}`] },
    sourceEvidenceRefs: [{
      refId: `evidence:${candidateId}`,
      sourceKind: "layout_geometry",
      ...(routePath ? { routePath } : {}),
    }],
    sourceDryRunRefs: [{
      refId: `dry-run:${candidateId}`,
      sourceKind: "limited_dry_run_route_model",
      ...(routePath ? { routePath } : {}),
    }],
    limitations: [],
    diagnostics: [],
    ...(routePath ? { routePath } : {}),
    ...overrides,
  };
}

function discoveryResult(candidates: Candidate[]): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:fixture",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    createdAt: "2026-06-22T10:00:00.000Z",
    candidateCount: candidates.length,
    candidateTypesPresent: ["route", "navigation", "section"].filter((candidateType) =>
      candidates.some((candidate) => candidate.candidateType === candidateType),
    ) as CandidateType[],
    candidates,
    limitations: [
      candidateLimitation("discovery-route-warning", "evidence:candidate:route:/"),
      candidateLimitation("discovery-unrelated-warning", "evidence:unrelated"),
    ],
    diagnostics: [],
  };
}

function reviewEvent(
  reviewEventId: string,
  candidateId: string,
  decision: CandidateReviewDecision,
  decidedAt: string,
  overrides: Partial<CandidateReviewEvent> = {},
): CandidateReviewEvent {
  return {
    reviewEventId,
    candidateDiscoveryArtifactId: CANDIDATE_DISCOVERY_ARTIFACT_ID,
    candidateId,
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    reviewerRef: "reviewer:fixture",
    decision,
    decidedAt,
    supersedesReviewEventId: null,
    rationale: "Fixture rationale.",
    diagnostics: [],
    ...overrides,
  };
}

function reviewPackage(events: readonly CandidateReviewEvent[]): CandidateReviewPackage {
  const latestDecisions = deriveLatestCandidateReviewDecisions(events);
  return {
    reviewPackageId: "candidate-review-package-1",
    candidateDiscoveryArtifactId: CANDIDATE_DISCOVERY_ARTIFACT_ID,
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    reviewEvents: events,
    latestDecisions,
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter((decision) => decision.decision === "approved").length,
    rejectedCount: latestDecisions.filter((decision) => decision.decision === "rejected").length,
    deferredCount: latestDecisions.filter((decision) => decision.decision === "deferred").length,
    diagnostics: [],
    createdAt: "2026-06-22T11:00:00.000Z",
  };
}

function build(
  candidateReviewPackage = reviewPackage([
    reviewEvent("review-route-approved", "candidate:route:/", "approved", "2026-06-22T10:00:00.000Z"),
  ]),
  candidateDiscoveryResult = discoveryResult([
    candidate("candidate:route:/", "route", "/", {
      limitations: [candidateLimitation("candidate-route-warning", "dry-run:candidate:route:/")],
    }),
  ]),
  latestCandidateReviewPackageArtifactId = CANDIDATE_REVIEW_PACKAGE_ARTIFACT_ID,
) {
  return buildReconstructionPackage({
    candidateReviewPackage,
    candidateDiscoveryResult,
    candidateReviewPackageArtifactId: CANDIDATE_REVIEW_PACKAGE_ARTIFACT_ID,
    latestCandidateReviewPackageArtifactId,
  });
}

test("builds valid package with one approved route", () => {
  const result = build();

  assert.equal(result.reconstructionPackageStatus, "valid");
  assert.deepEqual(result.approvedCandidateRefs, [{
    candidateId: "candidate:route:/",
    candidateType: "route",
    routePath: "/",
    decisionReviewEventId: "review-route-approved",
    decision: "approved",
    confidence: { level: "HIGH", reasons: ["source_confidence:candidate:route:/"] },
    sourceCandidateRefs: [`candidate-discovery:${CANDIDATE_DISCOVERY_ARTIFACT_ID}:candidate:route:/`],
    evidenceRefs: ["evidence:candidate:route:/", "dry-run:candidate:route:/"],
  }]);
  assert.equal(validateReconstructionPackage(result).valid, true);
});

test("excludes rejected, deferred, unreviewed, and superseded candidates", () => {
  const supersededApproval = reviewEvent(
    "review-section-approved-old",
    "candidate:section:/hero",
    "approved",
    "2026-06-22T10:00:00.000Z",
  );
  const result = build(
    reviewPackage([
      reviewEvent("review-route-approved", "candidate:route:/", "approved", "2026-06-22T10:01:00.000Z"),
      reviewEvent("review-nav-rejected", "candidate:navigation:/main", "rejected", "2026-06-22T10:02:00.000Z"),
      reviewEvent("review-section-deferred", "candidate:section:/story", "deferred", "2026-06-22T10:03:00.000Z"),
      supersededApproval,
      reviewEvent("review-section-rejected-latest", "candidate:section:/hero", "rejected", "2026-06-22T10:04:00.000Z", {
        supersedesReviewEventId: supersededApproval.reviewEventId,
      }),
    ]),
    discoveryResult([
      candidate("candidate:route:/", "route", "/"),
      candidate("candidate:navigation:/main", "navigation", "/"),
      candidate("candidate:section:/story", "section", "/"),
      candidate("candidate:section:/hero", "section", "/"),
      candidate("candidate:section:/footer", "section", "/"),
    ]),
  );

  assert.equal(result.reconstructionPackageStatus, "valid");
  assert.deepEqual(result.approvedCandidateRefs.map((candidateRef) => candidateRef.candidateId), ["candidate:route:/"]);
  assert.deepEqual(result.eligibilitySummary, {
    approvedCount: 1,
    rejectedCount: 2,
    deferredCount: 1,
    unreviewedCount: 1,
    includedCount: 1,
    excludedCount: 4,
  });
});

test("produces blocked package when no approved candidates are included", () => {
  const result = build(
    reviewPackage([
      reviewEvent("review-nav-rejected", "candidate:navigation:/main", "rejected", "2026-06-22T10:00:00.000Z"),
      reviewEvent("review-section-deferred", "candidate:section:/story", "deferred", "2026-06-22T10:01:00.000Z"),
    ]),
    discoveryResult([
      candidate("candidate:navigation:/main", "navigation", "/"),
      candidate("candidate:section:/story", "section", "/"),
      candidate("candidate:route:/", "route", "/"),
    ]),
  );

  assert.equal(result.reconstructionPackageStatus, "blocked");
  assert.deepEqual(result.approvedCandidateRefs, []);
  assert.deepEqual(result.eligibilitySummary, {
    approvedCount: 0,
    rejectedCount: 1,
    deferredCount: 1,
    unreviewedCount: 1,
    includedCount: 0,
    excludedCount: 3,
  });
  assert.equal(result.limitations.some((limitation) => limitation.includes("NO_APPROVED_CANDIDATES")), true);
  assert.equal(validateReconstructionPackage(result).valid, true);
});

test("marks package stale when supplied review artifact is not latest", () => {
  const result = build(undefined, undefined, "candidate_review_package_newer");

  assert.equal(result.reconstructionPackageStatus, "stale");
  assert.match(result.diagnostics.join("\n"), /STALE_REVIEW_PACKAGE_CHECK:stale/);
  assert.equal(validateReconstructionPackage(result).valid, true);
});

test("records missing approved candidates without including guessed refs", () => {
  const result = build(
    reviewPackage([
      reviewEvent("review-missing-approved", "candidate:route:/missing", "approved", "2026-06-22T10:00:00.000Z"),
    ]),
    discoveryResult([]),
  );

  assert.equal(result.reconstructionPackageStatus, "blocked");
  assert.deepEqual(result.approvedCandidateRefs, []);
  assert.match(result.diagnostics.join("\n"), /MISSING_APPROVED_CANDIDATE_CHECK:candidate:route:\/missing/);
  assert.equal(result.limitations.some((limitation) => limitation.includes("MISSING_APPROVED_CANDIDATE")), true);
  assert.equal(validateReconstructionPackage(result).valid, true);
});

test("uses deterministic identity from review artifact and contract version", () => {
  const first = build();
  const second = build();

  assert.equal(first.reconstructionPackageId, "reconstruction-package:candidate_review_package_1:8E-1");
  assert.deepEqual(second, first);
});

test("validates count arithmetic for included and excluded candidates", () => {
  const result = build(
    reviewPackage([
      reviewEvent("review-route-approved", "candidate:route:/", "approved", "2026-06-22T10:00:00.000Z"),
      reviewEvent("review-nav-rejected", "candidate:navigation:/main", "rejected", "2026-06-22T10:01:00.000Z"),
      reviewEvent("review-section-deferred", "candidate:section:/story", "deferred", "2026-06-22T10:02:00.000Z"),
    ]),
    discoveryResult([
      candidate("candidate:route:/", "route", "/"),
      candidate("candidate:navigation:/main", "navigation", "/"),
      candidate("candidate:section:/story", "section", "/"),
      candidate("candidate:section:/footer", "section", "/"),
      candidate("candidate:section:/aside", "section", "/"),
    ]),
  );

  assert.deepEqual(result.eligibilitySummary, {
    approvedCount: 1,
    rejectedCount: 1,
    deferredCount: 1,
    unreviewedCount: 2,
    includedCount: 1,
    excludedCount: 4,
  });
  assert.equal(validateReconstructionPackage(result).valid, true);
});

test("forbidden fields remain absent from builder output", () => {
  const serialized = JSON.stringify(build());
  for (const field of RECONSTRUCTION_PACKAGE_FORBIDDEN_FIELDS) {
    assert.equal(serialized.includes(`"${field}"`), false, field);
  }
});

test("validation passes for valid output and propagated limitations are deterministic", () => {
  const result = build();

  assert.deepEqual(validateReconstructionPackage(result), { valid: true, errors: [], warnings: [] });
  assert.deepEqual(result.limitations, [
    "candidate:candidate:route:/:warning:SOURCE_DRY_RUN_LIMITATION:candidate-route-warning:candidate-route-warning applies. sourceRef=dry-run:candidate:route:/",
    "discovery:warning:SOURCE_DRY_RUN_LIMITATION:discovery-route-warning:discovery-route-warning applies. sourceRef=evidence:candidate:route:/",
  ]);
  assert.deepEqual(result.diagnostics.filter((diagnostic) => diagnostic.includes("VALIDATION")), [
    "REVIEW_PACKAGE_VALIDATION:valid:errors=0:warnings=0",
    "LATEST_DECISIONS_VALIDATION:validated_by_candidate_review_contract",
    "DISCOVERY_RESULT_VALIDATION:valid:errors=0:warnings=0",
    "LINEAGE_VALIDATION:valid",
    "RECONSTRUCTION_PACKAGE_VALIDATION:valid:errors=0:warnings=0",
  ]);
});
