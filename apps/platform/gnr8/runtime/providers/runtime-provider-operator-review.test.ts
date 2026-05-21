import assert from "node:assert/strict";
import test from "node:test";

import {
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
