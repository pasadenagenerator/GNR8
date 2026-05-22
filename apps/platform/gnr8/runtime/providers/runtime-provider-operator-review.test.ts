import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRuntimeProviderOperatorReviewSummary,
  createRuntimeProviderOperatorReview,
  type RuntimeProviderOperatorReviewStatus,
} from "@/gnr8/runtime/providers/runtime-provider-operator-review";

function createReview(status: RuntimeProviderOperatorReviewStatus) {
  return createRuntimeProviderOperatorReview({
    handoffRef: {
      handoffId: "handoff_1",
      correlationKey: "handoff_corr_1",
    },
    reviewerRef: "user_1",
    reviewStatus: status,
    reviewReason: "operator validated dry-run evidence",
    createdAt: "2026-05-21T00:00:00.000Z",
  });
}

test("operator review: create pending review", () => {
  const result = createReview("pending_review");

  assert.equal(result.executionBlocked, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.intentOnly, true);
  assert.equal(result.reviewArtifact?.reviewStatus, "pending_review");
  assert.equal(result.reviewArtifact?.reviewId.length > 0, true);
  assert.equal(result.reviewArtifact?.handoffId, "handoff_1");
  assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_CREATED:REVIEW_STATUS_PENDING_REVIEW"), true);
});

test("operator review: approve review without execution", () => {
  const result = createReview("approved_for_future_execution");

  assert.equal(result.executionBlocked, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.intentOnly, true);
  assert.equal(result.reviewArtifact?.reviewStatus, "approved_for_future_execution");
  assert.equal(
    result.blockedReasons.includes("approved_for_future_execution_is_intent_only_not_execution"),
    true,
  );
  assert.equal(
    result.diagnostics.includes("OPERATOR_REVIEW_CREATED:REVIEW_STATUS_APPROVED_FOR_FUTURE_EXECUTION"),
    true,
  );
});

test("operator review: reject review", () => {
  const result = createReview("rejected");

  assert.equal(result.executionBlocked, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.intentOnly, true);
  assert.equal(result.reviewArtifact?.reviewStatus, "rejected");
  assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_REJECTED:REVIEW_REJECTED"), true);
});

test("operator review: needs changes emits deterministic diagnostic", () => {
  const result = createReview("needs_changes");

  assert.equal(result.executionBlocked, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.intentOnly, true);
  assert.equal(result.reviewArtifact?.reviewStatus, "needs_changes");
  assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_NEEDS_CHANGES:REVIEW_NEEDS_CHANGES"), true);
});

test("operator review: missing references fail closed", () => {
  const result = createRuntimeProviderOperatorReview({
    handoffRef: { handoffId: " ", correlationKey: " " },
    reviewerRef: " ",
    reviewStatus: "pending_review",
  });

  assert.equal(result.reviewArtifact, null);
  assert.equal(result.executionBlocked, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.intentOnly, true);
  assert.equal(
    result.blockedReasons.some((reason) => reason.includes("missing_required_operator_review_references")),
    true,
  );
  assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_REJECTED:MISSING_REQUIRED_REFERENCES"), true);
});

test("operator review: execution path remains untouched", () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called by operator review model");
  }) as typeof fetch;

  try {
    const result = createReview("approved_for_future_execution");
    assert.equal(result.executionBlocked, true);
    assert.equal(result.executionAuthorized, false);
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("operator review summary: no reviews => no_reviews", () => {
  const result = buildRuntimeProviderOperatorReviewSummary({ reviews: [] });
  assert.equal(result.reviewSummary.reviewSummaryStatus, "no_reviews");
  assert.equal(result.reviewSummary.reviewCount, 0);
  assert.equal(result.reviewSummary.intentOnly, true);
  assert.equal(result.reviewSummary.executionBlocked, true);
});

test("operator review summary: one review => exact status", () => {
  const review = createReview("needs_changes").reviewArtifact;
  assert.ok(review);
  const result = buildRuntimeProviderOperatorReviewSummary({ reviews: [review] });
  assert.equal(result.reviewSummary.reviewSummaryStatus, "needs_changes");
});

test("operator review summary: conflicting history => mixed_review_state", () => {
  const pending = createRuntimeProviderOperatorReview({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    reviewerRef: "reviewer_a",
    reviewStatus: "pending_review",
    reviewReason: "awaiting",
    createdAt: "2026-05-22T00:00:00.000Z",
  }).reviewArtifact;
  const rejected = createRuntimeProviderOperatorReview({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    reviewerRef: "reviewer_b",
    reviewStatus: "rejected",
    reviewReason: "unsafe",
    createdAt: "2026-05-22T00:00:01.000Z",
  }).reviewArtifact;
  assert.ok(pending);
  assert.ok(rejected);
  const result = buildRuntimeProviderOperatorReviewSummary({ reviews: [pending, rejected] });
  assert.equal(result.reviewSummary.reviewSummaryStatus, "mixed_review_state");
  assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_SUMMARY_MIXED_STATE"), true);
});

test("operator review summary: latest coherent review wins", () => {
  const pending = createRuntimeProviderOperatorReview({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    reviewerRef: "reviewer_a",
    reviewStatus: "pending_review",
    reviewReason: "awaiting",
    createdAt: "2026-05-22T00:00:00.000Z",
  }).reviewArtifact;
  const approved = createRuntimeProviderOperatorReview({
    handoffRef: { handoffId: "handoff_1", correlationKey: "corr_1" },
    reviewerRef: "reviewer_b",
    reviewStatus: "approved_for_future_execution",
    reviewReason: "good",
    createdAt: "2026-05-22T00:00:01.000Z",
  }).reviewArtifact;
  assert.ok(pending);
  assert.ok(approved);
  const result = buildRuntimeProviderOperatorReviewSummary({ reviews: [approved, pending] });
  assert.equal(result.reviewSummary.reviewSummaryStatus, "approved_for_future_execution");
  assert.equal(result.reviewSummary.latestReviewer, "reviewer_b");
});
