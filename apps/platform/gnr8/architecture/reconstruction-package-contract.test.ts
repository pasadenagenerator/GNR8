import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_EXECUTION_READINESS_VALUES,
  RECONSTRUCTION_INTENT_VALUES,
  RECONSTRUCTION_PACKAGE_STATUSES,
  createReconstructionPackageFromReview,
  summarizeReconstructionPackage,
} from "./reconstruction-package-contract";
import {
  createReconstructionCandidateReviewPackage,
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

test("reconstruction package creation preserves review lineage and contract-only execution lock", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-1",
    discoveryPackageId: "candidate-discovery-package-1",
    planningPackageId: "planning-package-from-review-1",
    siteVersionId: "site-version-1",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
    reviewedAt: "2026-06-13T10:00:00.000Z",
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-1",
    planningPackageId: "planning-package-1",
    createdAt: "2026-06-13T10:05:00.000Z",
  });

  assert.equal(reconstructionPackage.kind, "reconstruction_package_v1");
  assert.equal(reconstructionPackage.contractVersion, "7F-14");
  assert.equal(reconstructionPackage.reconstructionPackageId, "reconstruction-package-1");
  assert.equal(reconstructionPackage.reviewPackageId, "candidate-review-package-1");
  assert.equal(reconstructionPackage.discoveryPackageId, "candidate-discovery-package-1");
  assert.equal(reconstructionPackage.planningPackageId, "planning-package-1");
  assert.equal(reconstructionPackage.siteVersionId, "site-version-1");
  assert.deepEqual(reconstructionPackage.routeScope, routeScope);
  assert.equal(reconstructionPackage.readinessLevel, "HIGH_CONFIDENCE");
  assert.equal(reconstructionPackage.packageStatus, "ready_for_reconstruction");
  assert.equal(reconstructionPackage.executionReadiness, "ready_for_dry_run");
  assert.equal(reconstructionPackage.reconstructionInstructions.executionAllowed, false);
  assert.equal(reconstructionPackage.reconstructionInstructions.outputGenerationAllowed, false);
  assert.equal(reconstructionPackage.createdAt, "2026-06-13T10:05:00.000Z");
});

test("reconstruction package constants are stable", () => {
  assert.deepEqual(RECONSTRUCTION_INTENT_VALUES, [
    "recreate_as_native_block",
    "preserve_as_embed",
    "preserve_as_external_widget",
    "convert_to_runtime_provider",
    "defer",
    "unsupported",
  ]);
  assert.deepEqual(RECONSTRUCTION_PACKAGE_STATUSES, [
    "draft",
    "ready_for_reconstruction",
    "needs_more_evidence",
    "blocked",
    "archived",
  ]);
  assert.deepEqual(RECONSTRUCTION_EXECUTION_READINESS_VALUES, [
    "not_ready",
    "ready_for_dry_run",
    "ready_for_future_execution",
  ]);
});

test("approved review items become approved reconstruction candidates", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-2",
    discoveryPackageId: "candidate-discovery-package-2",
    planningPackageId: "planning-package-2",
    siteVersionId: "site-version-2",
    routeScope,
    readinessLevel: "RECOMMENDED",
    reviewStatus: "approved",
    candidateReviews: [
      approvedHeroReview,
      {
        candidateId: "candidate-map",
        candidateType: "map",
        sourceRoute: "/contact",
        reviewDecision: "approved",
        confidenceLevel: "MEDIUM",
        limitations: [],
        evidenceRefs: ["map-widget-ref", "screenshot-ref"],
        reviewerNotes: [],
      },
    ],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage);

  assert.deepEqual(
    reconstructionPackage.approvedCandidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      reconstructionIntent: candidate.reconstructionIntent,
    })),
    [
      {
        candidateId: "candidate-home-hero",
        reconstructionIntent: "recreate_as_native_block",
      },
      {
        candidateId: "candidate-map",
        reconstructionIntent: "convert_to_runtime_provider",
      },
    ],
  );
  assert.deepEqual(reconstructionPackage.requiredEvidenceRefs, [
    "rendered-dom-ref",
    "screenshot-ref",
    "map-widget-ref",
  ]);
});

test("deferred and unsupported review items map into separate package buckets", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-3",
    discoveryPackageId: "candidate-discovery-package-3",
    planningPackageId: "planning-package-3",
    siteVersionId: "site-version-3",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "partially_reviewed",
    candidateReviews: [
      {
        ...approvedHeroReview,
        candidateId: "candidate-listing",
        candidateType: "article_listing",
        reviewDecision: "defer",
      },
      {
        ...approvedHeroReview,
        candidateId: "candidate-embed",
        candidateType: "widget",
        reviewDecision: "unsupported",
      },
    ],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage);

  assert.deepEqual(
    reconstructionPackage.deferredCandidates.map((candidate) => candidate.candidateId),
    ["candidate-listing"],
  );
  assert.deepEqual(
    reconstructionPackage.unsupportedCandidates.map((candidate) => candidate.candidateId),
    ["candidate-embed"],
  );
  assert.deepEqual(reconstructionPackage.approvedCandidates, []);
  assert.equal(reconstructionPackage.executionReadiness, "not_ready");
});

test("needs_more_evidence review forces package status and execution readiness to not ready", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-4",
    discoveryPackageId: "candidate-discovery-package-4",
    planningPackageId: "planning-package-4",
    siteVersionId: "site-version-4",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "needs_more_evidence",
    candidateReviews: [
      approvedHeroReview,
      {
        candidateId: "candidate-gallery",
        candidateType: "gallery",
        sourceRoute: "/",
        reviewDecision: "needs_more_evidence",
        confidenceLevel: "LOW",
        limitations: ["Missing interaction evidence for carousel controls."],
        evidenceRefs: ["gallery-ref"],
        reviewerNotes: ["Capture settled browser behavior before packaging."],
      },
    ],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage);

  assert.equal(reconstructionPackage.packageStatus, "needs_more_evidence");
  assert.equal(reconstructionPackage.executionReadiness, "not_ready");
  assert.ok(
    reconstructionPackage.limitations.some(
      (limitation) =>
        limitation.sourceCandidateId === "candidate-gallery" &&
        limitation.severity === "blocker",
    ),
  );
});

test("execution readiness requires approved candidates and no blocker limitations", () => {
  const noApprovedReviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-5",
    discoveryPackageId: "candidate-discovery-package-5",
    planningPackageId: "planning-package-5",
    siteVersionId: "site-version-5",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "rejected",
    candidateReviews: [
      {
        ...approvedHeroReview,
        reviewDecision: "rejected",
      },
    ],
  });

  const readyReviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-6",
    discoveryPackageId: "candidate-discovery-package-6",
    planningPackageId: "planning-package-6",
    siteVersionId: "site-version-6",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
  });

  assert.equal(
    createReconstructionPackageFromReview(noApprovedReviewPackage).executionReadiness,
    "not_ready",
  );
  assert.equal(
    createReconstructionPackageFromReview(readyReviewPackage).executionReadiness,
    "ready_for_dry_run",
  );
});

test("summary helper reports counts, status, readiness, blockers, and limitations", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-7",
    discoveryPackageId: "candidate-discovery-package-7",
    planningPackageId: "planning-package-7",
    siteVersionId: "site-version-7",
    routeScope,
    readinessLevel: "RECOMMENDED",
    reviewStatus: "needs_more_evidence",
    notes: ["Rejected candidates are not packaged for reconstruction."],
    candidateReviews: [
      approvedHeroReview,
      {
        ...approvedHeroReview,
        candidateId: "candidate-listing",
        reviewDecision: "defer",
      },
      {
        ...approvedHeroReview,
        candidateId: "candidate-embed",
        reviewDecision: "unsupported",
      },
      {
        ...approvedHeroReview,
        candidateId: "candidate-gallery",
        reviewDecision: "needs_more_evidence",
        limitations: ["Missing responsive screenshot evidence."],
      },
      {
        ...approvedHeroReview,
        candidateId: "candidate-rejected-footer",
        reviewDecision: "rejected",
      },
    ],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage);
  const summary = summarizeReconstructionPackage(reconstructionPackage);

  assert.equal(summary.approvedCount, 1);
  assert.equal(summary.deferredCount, 1);
  assert.equal(summary.unsupportedCount, 1);
  assert.equal(summary.packageStatus, "needs_more_evidence");
  assert.equal(summary.executionReadiness, "not_ready");
  assert.equal(summary.blockerCount, 2);
  assert.equal(summary.limitationCount, 4);
});

test("reconstruction package links backward through review, discovery, and planning IDs", () => {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-linkage",
    discoveryPackageId: "candidate-discovery-package-linkage",
    planningPackageId: "planning-package-linkage",
    siteVersionId: "site-version-linkage",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-linkage",
  });

  assert.equal(reconstructionPackage.reviewPackageId, reviewPackage.reviewPackageId);
  assert.equal(reconstructionPackage.discoveryPackageId, reviewPackage.discoveryPackageId);
  assert.equal(reconstructionPackage.planningPackageId, reviewPackage.planningPackageId);
  assert.equal(reconstructionPackage.siteVersionId, reviewPackage.siteVersionId);
  assert.deepEqual(reconstructionPackage.routeScope, reviewPackage.routeScope);
  assert.equal(reconstructionPackage.readinessLevel, reviewPackage.readinessLevel);
});

test("current reconstruction package builder never enables future execution", () => {
  const readyReviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-future-execution",
    discoveryPackageId: "candidate-discovery-package-future-execution",
    planningPackageId: "planning-package-future-execution",
    siteVersionId: "site-version-future-execution",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
  });

  const reconstructionPackage = createReconstructionPackageFromReview(readyReviewPackage);

  assert.equal(reconstructionPackage.executionReadiness, "ready_for_dry_run");
  assert.notEqual(reconstructionPackage.executionReadiness, "ready_for_future_execution");
  assert.equal(reconstructionPackage.reconstructionInstructions.executionAllowed, false);
  assert.equal(reconstructionPackage.reconstructionInstructions.outputGenerationAllowed, false);
});
