import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_DRY_RUN_BOUNDARY,
  RECONSTRUCTION_DRY_RUN_MAY_RULES,
  RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES,
  RECONSTRUCTION_DRY_RUN_STATUSES,
  RECONSTRUCTION_GENERATED_OUTPUT_TYPES,
  RECONSTRUCTION_SIMULATION_STATUSES,
  createReconstructionDryRunPackage,
  evaluateDryRunEligibility,
  type ReconstructionGeneratedOutput,
} from "./reconstruction-dry-run-contract";
import {
  createReconstructionPackageFromReview,
  type ReconstructionPackage,
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
  reviewerNotes: ["Candidate has enough evidence for future dry-run boundary planning."],
};

function readyReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-ready",
    discoveryPackageId: "candidate-discovery-package-dry-run-ready",
    planningPackageId: "planning-package-dry-run-ready",
    siteVersionId: "site-version-dry-run-ready",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
    reviewedAt: "2026-06-15T10:00:00.000Z",
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-ready",
    createdAt: "2026-06-15T10:05:00.000Z",
  });
}

function notReadyReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-not-ready",
    discoveryPackageId: "candidate-discovery-package-dry-run-not-ready",
    planningPackageId: "planning-package-dry-run-not-ready",
    siteVersionId: "site-version-dry-run-not-ready",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "rejected",
    candidateReviews: [
      {
        ...approvedHeroReview,
        reviewDecision: "rejected",
      },
    ],
    reviewedAt: "2026-06-15T10:10:00.000Z",
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-not-ready",
  });
}

function needsMoreEvidenceReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-needs-evidence",
    discoveryPackageId: "candidate-discovery-package-dry-run-needs-evidence",
    planningPackageId: "planning-package-dry-run-needs-evidence",
    siteVersionId: "site-version-dry-run-needs-evidence",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "needs_more_evidence",
    candidateReviews: [
      {
        ...approvedHeroReview,
        reviewDecision: "needs_more_evidence",
        limitations: ["Missing interaction evidence for dry-run planning."],
      },
    ],
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-needs-evidence",
  });
}

test("dry run package creation preserves reconstruction package lineage and does not simulate", () => {
  const reconstructionPackage = readyReconstructionPackage();

  const dryRunPackage = createReconstructionDryRunPackage(reconstructionPackage, {
    dryRunId: "dry-run-package-1",
    createdAt: "2026-06-15T10:15:00.000Z",
  });

  assert.equal(dryRunPackage.kind, "reconstruction_dry_run_package_v1");
  assert.equal(dryRunPackage.contractVersion, "8A-0");
  assert.equal(dryRunPackage.dryRunId, "dry-run-package-1");
  assert.equal(
    dryRunPackage.reconstructionPackageId,
    reconstructionPackage.reconstructionPackageId,
  );
  assert.equal(dryRunPackage.siteVersionId, reconstructionPackage.siteVersionId);
  assert.deepEqual(dryRunPackage.routeScope, reconstructionPackage.routeScope);
  assert.equal(dryRunPackage.packageStatus, reconstructionPackage.packageStatus);
  assert.equal(dryRunPackage.executionStatus, "planned");
  assert.equal(dryRunPackage.simulationStatus, "unavailable");
  assert.deepEqual(dryRunPackage.simulationArtifacts, []);
  assert.deepEqual(dryRunPackage.generatedOutputs, []);
  assert.equal(dryRunPackage.boundary.outputApprovalState, "informational_only");
  assert.equal(dryRunPackage.boundary.futureApprovalRequired, true);
  assert.equal(dryRunPackage.createdAt, "2026-06-15T10:15:00.000Z");
});

test("dry run status constants are stable", () => {
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_STATUSES, [
    "not_started",
    "planned",
    "simulation_ready",
    "simulated",
    "blocked",
  ]);
  assert.deepEqual(RECONSTRUCTION_SIMULATION_STATUSES, [
    "unavailable",
    "pending",
    "complete",
    "failed",
  ]);
});

test("generated output type constants are stable and represent shape only", () => {
  assert.deepEqual(RECONSTRUCTION_GENERATED_OUTPUT_TYPES, [
    "route_model",
    "section_model",
    "block_model",
    "content_model",
    "design_token_model",
    "navigation_model",
    "unknown",
  ]);

  const placeholderOutput: ReconstructionGeneratedOutput = {
    outputId: "simulated-output-shape-1",
    outputType: "route_model",
    sourceCandidateId: "candidate-home-hero",
    sourceRoute: "/",
    evidenceRefs: ["rendered-dom-ref"],
    description: "Future simulated route model output shape.",
    generationState: "simulation_placeholder",
  };

  assert.equal(placeholderOutput.outputType, "route_model");
  assert.equal(placeholderOutput.generationState, "simulation_placeholder");
});

test("eligibility helper maps ready_for_dry_run to eligible", () => {
  const result = evaluateDryRunEligibility(readyReconstructionPackage());

  assert.deepEqual(result, {
    eligibility: "eligible",
    eligible: true,
    reason: "ready_for_dry_run",
    reconstructionPackageId: "reconstruction-package-dry-run-ready",
  });
});

test("eligibility helper maps not_ready to not eligible", () => {
  const result = evaluateDryRunEligibility(notReadyReconstructionPackage());

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "not_ready");
});

test("eligibility helper maps needs_more_evidence to not eligible", () => {
  const result = evaluateDryRunEligibility(needsMoreEvidenceReconstructionPackage());

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "needs_more_evidence");
});

test("eligibility helper maps blocked package status to not eligible", () => {
  const blockedPackage: ReconstructionPackage = {
    ...readyReconstructionPackage(),
    packageStatus: "blocked",
    executionReadiness: "not_ready",
  };

  const result = evaluateDryRunEligibility(blockedPackage);

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "blocked");
});

test("dry run boundary rules are explicit and approval-gated", () => {
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_MAY_RULES, [
    "read_reconstruction_package",
    "read_evidence_capture_artifacts",
    "read_reconstruction_candidates",
    "read_review_decisions",
    "produce_simulation_artifacts",
  ]);
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES, [
    "publish",
    "modify_source_site",
    "modify_production_content",
    "execute_migrations",
    "create_live_websites",
    "modify_domains",
    "modify_dns",
    "write_runtime_content",
  ]);
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_BOUNDARY, {
    may: [...RECONSTRUCTION_DRY_RUN_MAY_RULES],
    mustNot: [...RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES],
    outputApprovalState: "informational_only",
    futureApprovalRequired: true,
  });
});
