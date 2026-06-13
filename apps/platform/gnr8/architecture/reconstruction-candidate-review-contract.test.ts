import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_CANDIDATE_REVIEW_DECISIONS,
  RECONSTRUCTION_CANDIDATE_REVIEW_PACKAGE_STATUSES,
  createReconstructionCandidateReviewPackage,
  evaluateCandidateReviewEligibility,
  summarizeCandidateReviewPackage,
  type ReconstructionCandidateReviewItem,
} from "./reconstruction-candidate-review-contract";

const routeScope = {
  scopeType: "single_route" as const,
  routes: ["/"],
};

const approvedHeroReview: ReconstructionCandidateReviewItem = {
  candidateId: "candidate-home-hero",
  candidateType: "hero",
  sourceRoute: "/",
  reviewDecision: "approved",
  confidenceLevel: "HIGH",
  limitations: [],
  evidenceRefs: ["rendered-dom-ref", "screenshot-ref"],
  reviewerNotes: ["Candidate has enough evidence for future reconstruction planning."],
};

test("candidate review package creation preserves contract-only review shape", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-1",
    discoveryPackageId: "candidate-discovery-package-1",
    siteVersionId: "site-version-1",
    routeScope,
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
    reviewerRef: "operator-1",
    reviewedAt: "2026-06-13T10:00:00.000Z",
    notes: ["Contract fixture only; no reconstruction approval has run."],
  });

  assert.equal(reviewPackage.kind, "reconstruction_candidate_review_package_v1");
  assert.equal(reviewPackage.contractVersion, "7F-13");
  assert.equal(reviewPackage.reviewPackageId, "candidate-review-package-1");
  assert.equal(reviewPackage.discoveryPackageId, "candidate-discovery-package-1");
  assert.equal(reviewPackage.siteVersionId, "site-version-1");
  assert.deepEqual(reviewPackage.routeScope, routeScope);
  assert.equal(reviewPackage.reviewStatus, "approved");
  assert.deepEqual(reviewPackage.candidateReviews, [approvedHeroReview]);
  assert.equal(reviewPackage.reviewerRef, "operator-1");
  assert.equal(reviewPackage.reviewedAt, "2026-06-13T10:00:00.000Z");
});

test("candidate review package defaults remain pending and unreviewed", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-2",
    discoveryPackageId: "candidate-discovery-package-2",
    siteVersionId: "site-version-2",
    routeScope,
  });

  assert.equal(reviewPackage.reviewStatus, "pending");
  assert.deepEqual(reviewPackage.candidateReviews, []);
  assert.equal(reviewPackage.reviewerRef, null);
  assert.equal(reviewPackage.reviewedAt, null);
  assert.deepEqual(reviewPackage.notes, []);
});

test("candidate review decisions are stable", () => {
  assert.deepEqual(RECONSTRUCTION_CANDIDATE_REVIEW_DECISIONS, [
    "approved",
    "rejected",
    "needs_more_evidence",
    "defer",
    "unsupported",
  ]);
});

test("candidate review package status values are stable", () => {
  assert.deepEqual(RECONSTRUCTION_CANDIDATE_REVIEW_PACKAGE_STATUSES, [
    "pending",
    "partially_reviewed",
    "approved",
    "rejected",
    "needs_more_evidence",
  ]);
});

test("candidate review eligibility follows discovery status and candidate count only", () => {
  const notStarted = evaluateCandidateReviewEligibility({
    discoveryStatus: "not_started",
    candidateCount: 0,
    readinessLevel: "MINIMUM_READY",
  });
  const contractOnly = evaluateCandidateReviewEligibility({
    discoveryStatus: "contract_only",
    candidateCount: 0,
    readinessLevel: "MINIMUM_READY",
  });
  const discoveryReady = evaluateCandidateReviewEligibility({
    discoveryStatus: "discovery_ready",
    candidateCount: 0,
    readinessLevel: "RECOMMENDED",
  });
  const completeWithoutCandidates = evaluateCandidateReviewEligibility({
    discoveryStatus: "discovery_complete",
    candidateCount: 0,
    readinessLevel: "HIGH_CONFIDENCE",
  });
  const completeWithCandidates = evaluateCandidateReviewEligibility({
    discoveryStatus: "discovery_complete",
    candidateCount: 2,
    readinessLevel: "HIGH_CONFIDENCE",
  });

  assert.equal(notStarted.eligible, false);
  assert.equal(contractOnly.eligible, false);
  assert.equal(discoveryReady.eligible, false);
  assert.equal(completeWithoutCandidates.eligible, false);
  assert.equal(completeWithCandidates.eligible, true);
});

test("candidate review summary counts decisions and derives overall status", () => {
  const summary = summarizeCandidateReviewPackage({
    candidateReviews: [
      approvedHeroReview,
      {
        candidateId: "candidate-footer",
        candidateType: "footer",
        sourceRoute: "/",
        reviewDecision: "rejected",
        confidenceLevel: "MEDIUM",
        limitations: ["Footer evidence conflicts across routes."],
        evidenceRefs: ["route-root"],
        reviewerNotes: [],
      },
      {
        candidateId: "candidate-map",
        candidateType: "map",
        sourceRoute: "/contact",
        reviewDecision: "needs_more_evidence",
        confidenceLevel: "LOW",
        limitations: ["Widget inventory is incomplete."],
        evidenceRefs: ["widget-signal-ref"],
        reviewerNotes: ["Capture expanded widget evidence before reconstruction."],
      },
      {
        candidateId: "candidate-listing",
        candidateType: "article_listing",
        sourceRoute: "/blog",
        reviewDecision: "defer",
        confidenceLevel: "MEDIUM",
        limitations: [],
        evidenceRefs: ["route-blog"],
        reviewerNotes: [],
      },
      {
        candidateId: "candidate-embed",
        candidateType: "widget",
        sourceRoute: "/",
        reviewDecision: "unsupported",
        confidenceLevel: "LOW",
        limitations: ["Unsupported third-party embed."],
        evidenceRefs: ["embed-ref"],
        reviewerNotes: [],
      },
    ],
  });

  assert.equal(summary.totalCandidates, 5);
  assert.equal(summary.approvedCount, 1);
  assert.equal(summary.rejectedCount, 1);
  assert.equal(summary.needsMoreEvidenceCount, 1);
  assert.equal(summary.deferredCount, 1);
  assert.equal(summary.unsupportedCount, 1);
  assert.equal(summary.overallStatus, "needs_more_evidence");
});

test("candidate review summary derives terminal package statuses", () => {
  assert.equal(
    summarizeCandidateReviewPackage({ candidateReviews: [] }).overallStatus,
    "pending",
  );
  assert.equal(
    summarizeCandidateReviewPackage({ candidateReviews: [approvedHeroReview] }).overallStatus,
    "approved",
  );
  assert.equal(
    summarizeCandidateReviewPackage({
      candidateReviews: [
        {
          ...approvedHeroReview,
          reviewDecision: "rejected",
        },
      ],
    }).overallStatus,
    "rejected",
  );
  assert.equal(
    summarizeCandidateReviewPackage({
      candidateReviews: [
        {
          ...approvedHeroReview,
          reviewDecision: "unsupported",
        },
      ],
    }).overallStatus,
    "rejected",
  );
  assert.equal(
    summarizeCandidateReviewPackage({
      candidateReviews: [
        approvedHeroReview,
        {
          ...approvedHeroReview,
          candidateId: "candidate-footer",
          reviewDecision: "rejected",
        },
      ],
    }).overallStatus,
    "partially_reviewed",
  );
});
