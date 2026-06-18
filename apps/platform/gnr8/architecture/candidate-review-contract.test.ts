import assert from "node:assert/strict";
import test from "node:test";

import {
  CANDIDATE_REVIEW_DECISIONS,
  createEmptyCandidateReviewPackage,
  deriveLatestCandidateReviewDecisions,
  validateCandidateReviewPackage,
  type CandidateReviewDecision,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";

function reviewEvent(
  reviewEventId: string,
  decision: CandidateReviewDecision,
  decidedAt: string,
  overrides: Partial<CandidateReviewEvent> = {},
): CandidateReviewEvent {
  return {
    reviewEventId,
    candidateDiscoveryArtifactId: "candidate-discovery-artifact-1",
    candidateId: "candidate:route:%2F",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    reviewerRef: "reviewer-1",
    decision,
    decidedAt,
    supersedesReviewEventId: null,
    rationale: "Human review rationale.",
    diagnostics: [],
    ...overrides,
  };
}

function reviewPackage(events: CandidateReviewEvent[]): CandidateReviewPackage {
  const latestDecisions = deriveLatestCandidateReviewDecisions(events);
  return {
    reviewPackageId: "candidate-review-package-1",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    reviewEvents: events,
    latestDecisions,
    reviewedCandidateCount: latestDecisions.length,
    approvedCount: latestDecisions.filter(({ decision }) => decision === "approved").length,
    rejectedCount: latestDecisions.filter(({ decision }) => decision === "rejected").length,
    deferredCount: latestDecisions.filter(({ decision }) => decision === "deferred").length,
    diagnostics: [],
    createdAt: "2026-06-18T10:00:00.000Z",
  };
}

test("empty package is valid", () => {
  const empty = createEmptyCandidateReviewPackage({
    candidateDiscoveryArtifactId: "candidate-discovery-artifact-empty",
    siteVersionId: "site-version-empty",
    dryRunId: "dry-run-empty",
  });
  assert.deepEqual(empty.reviewEvents, []);
  assert.deepEqual(empty.latestDecisions, []);
  assert.equal(empty.reviewedCandidateCount, 0);
  assert.equal(empty.approvedCount, 0);
  assert.equal(empty.rejectedCount, 0);
  assert.equal(empty.deferredCount, 0);
  assert.equal(validateCandidateReviewPackage(empty).valid, true);
});

test("approved, rejected, and deferred events are valid", () => {
  assert.deepEqual(CANDIDATE_REVIEW_DECISIONS, ["approved", "rejected", "deferred"]);
  for (const decision of CANDIDATE_REVIEW_DECISIONS) {
    const validation = validateCandidateReviewPackage(
      reviewPackage([reviewEvent(`review-${decision}`, decision, "2026-06-18T10:00:00.000Z")]),
    );
    assert.deepEqual(validation, { valid: true, errors: [], warnings: [] }, decision);
  }
});

test("invalid and forbidden decision values are rejected", () => {
  for (const decision of [
    "edited",
    "modified",
    "generated",
    "reconstructed",
    "published",
    "accepted_for_execution",
  ]) {
    const event = reviewEvent("review-invalid", "approved", "2026-06-18T10:00:00.000Z") as unknown as Record<string, unknown>;
    event.decision = decision;
    const validation = validateCandidateReviewPackage(reviewPackage([event as unknown as CandidateReviewEvent]));
    assert.equal(validation.valid, false, decision);
    assert.match(validation.errors.join("\n"), /decision must be approved, rejected, or deferred/);
  }
});

test("valid explicit supersession determines the latest decision", () => {
  const first = reviewEvent("review-a", "approved", "2026-06-18T12:00:00.000Z");
  const second = reviewEvent("review-b", "rejected", "2026-06-18T11:00:00.000Z", {
    reviewerRef: "reviewer-2",
    supersedesReviewEventId: "review-a",
  });
  assert.deepEqual(deriveLatestCandidateReviewDecisions([first, second]), [second]);
});

test("latest timestamp wins when events have no supersession relationship", () => {
  const earlier = reviewEvent("review-a", "approved", "2026-06-18T10:00:00.000Z");
  const later = reviewEvent("review-b", "deferred", "2026-06-18T11:00:00.000Z");
  assert.equal(deriveLatestCandidateReviewDecisions([later, earlier])[0].reviewEventId, "review-b");
});

test("reviewEventId deterministically breaks decidedAt ties", () => {
  const timestamp = "2026-06-18T10:00:00.000Z";
  const first = reviewEvent("review-a", "approved", timestamp);
  const second = reviewEvent("review-b", "rejected", timestamp);
  assert.equal(deriveLatestCandidateReviewDecisions([second, first])[0].reviewEventId, "review-b");
});

test("package counts must match derived latest decisions", () => {
  const valid = reviewPackage([
    reviewEvent("review-approved", "approved", "2026-06-18T10:00:00.000Z"),
    reviewEvent("review-rejected", "rejected", "2026-06-18T10:00:00.000Z", {
      candidateId: "candidate:navigation:%2F",
    }),
    reviewEvent("review-deferred", "deferred", "2026-06-18T10:00:00.000Z", {
      candidateId: "candidate:section:%2F:1",
    }),
  ]);
  assert.equal(validateCandidateReviewPackage(valid).valid, true);

  const invalid = { ...valid, approvedCount: 2 };
  const validation = validateCandidateReviewPackage(invalid);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /approvedCount must equal 1/);
});

test("forbidden generated, reconstruction, execution, and publishing fields are rejected recursively", () => {
  for (const field of [
    "reactOutput",
    "generatedOutputs",
    "generatedBlocks",
    "generatedContent",
    "designTokens",
    "publishingArtifacts",
    "reconstructionArtifacts",
    "executionArtifacts",
  ]) {
    const value = reviewPackage([reviewEvent("review-a", "approved", "2026-06-18T10:00:00.000Z")]) as unknown as Record<string, unknown>;
    value.diagnostics = [{ nested: { [field]: {} } }];
    const validation = validateCandidateReviewPackage(value);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});

test("approval preserves attribution and does not imply execution", () => {
  const approved = reviewPackage([
    reviewEvent("review-approved", "approved", "2026-06-18T10:00:00.000Z", {
      reviewerRef: "human:operator-1",
    }),
  ]);
  const latest = approved.latestDecisions[0];
  assert.equal(latest.reviewerRef, "human:operator-1");
  assert.equal(latest.decision, "approved");
  assert.equal("executionArtifacts" in latest, false);
  assert.equal("accepted_for_execution" in latest, false);
  assert.equal(validateCandidateReviewPackage(approved).valid, true);
});
