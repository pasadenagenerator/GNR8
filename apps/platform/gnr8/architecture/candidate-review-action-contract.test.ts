import assert from "node:assert/strict";
import test from "node:test";

import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  createCandidateReviewEventFromAction,
  validateCandidateReviewActionRequest,
  type CandidateReviewActionRequest,
} from "./candidate-review-action-contract";
import {
  deriveLatestCandidateReviewDecisions,
  type CandidateReviewEvent,
  type CandidateReviewPackage,
} from "./candidate-review-contract";

function reviewPackage(events: CandidateReviewEvent[] = []): CandidateReviewPackage {
  const latestDecisions = deriveLatestCandidateReviewDecisions(events);
  return {
    reviewPackageId: "candidate-review:candidate-discovery-artifact-1",
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
    createdAt: "2026-06-19T08:00:00.000Z",
  };
}

function action(overrides: Partial<CandidateReviewActionRequest> = {}): CandidateReviewActionRequest {
  return {
    actionId: "action-1",
    actionType: "approve",
    actor: { actorRef: "user-superadmin-1", actorRole: "superadmin" },
    target: {
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
      candidateDiscoveryArtifactId: "candidate-discovery-artifact-1",
      candidateId: "candidate:route:%2F",
      candidateReviewPackageArtifactId: "candidate-review-package-artifact-1",
    },
    rationale: "Reviewed against the linked evidence.",
    requestedAt: "2026-06-19T09:00:00.000Z",
    ...overrides,
  };
}

function existingEvent(): CandidateReviewEvent {
  return {
    reviewEventId: "review-event-previous",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact-1",
    candidateId: "candidate:route:%2F",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    reviewerRef: "user-superadmin-previous",
    decision: "deferred",
    decidedAt: "2026-06-19T08:30:00.000Z",
    supersedesReviewEventId: null,
    rationale: "Needs another look.",
    diagnostics: [],
  };
}

function linkedDiscovery(): CandidateDiscoveryResult {
  return {
    discoveryId: "discovery-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    createdAt: "2026-06-19T07:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: ["route"],
    candidates: [{
      candidateId: "candidate:route:%2F",
      candidateType: "route",
      candidateStatus: "valid",
      confidence: { level: "HIGH", reasons: ["Fixture evidence"] },
      sourceEvidenceRefs: [{ refId: "evidence-1", sourceKind: "evidence_capture_baseline" }],
      sourceDryRunRefs: [{ refId: "dry-run-output-1", sourceKind: "limited_dry_run_output" }],
      limitations: [],
      diagnostics: [],
      routePath: "/",
    }],
    limitations: [],
    diagnostics: [],
  };
}

for (const [actionType, decision] of [
  ["approve", "approved"],
  ["reject", "rejected"],
  ["defer", "deferred"],
] as const) {
  test(`${actionType} creates an immutable ${decision} event`, () => {
    const result = createCandidateReviewEventFromAction(action({ actionType }), reviewPackage());
    assert.equal(result.accepted, true);
    assert.equal(result.candidateReviewEvent?.decision, decision);
    assert.equal(result.candidateReviewEvent?.reviewEventId, "candidate-review-event:action-1");
    assert.equal(result.candidateReviewEvent?.reviewerRef, "user-superadmin-1");
    assert.equal(result.candidateReviewEvent?.decidedAt, "2026-06-19T09:00:00.000Z");
    assert.equal(Object.isFrozen(result.candidateReviewEvent), true);
  });
}

test("supersession points to the current package head", () => {
  const previous = existingEvent();
  const result = createCandidateReviewEventFromAction(action(), reviewPackage([previous]), previous);
  assert.equal(result.accepted, true);
  assert.equal(result.candidateReviewEvent?.supersedesReviewEventId, previous.reviewEventId);
});

test("invalid and forbidden action types are rejected and create no event", () => {
  for (const actionType of [
    "invalid",
    "edit",
    "modify",
    "generate",
    "reconstruct",
    "publish",
    "execute",
    "accept_for_execution",
  ]) {
    const request = action() as unknown as Record<string, unknown>;
    request.actionType = actionType;
    const result = createCandidateReviewEventFromAction(
      request as unknown as CandidateReviewActionRequest,
      reviewPackage(),
    );
    assert.equal(result.accepted, false, actionType);
    assert.equal(result.candidateReviewEvent, null, actionType);
    assert.match(result.diagnostics.join("\n"), /actionType/, actionType);
  }
});

test("non-superadmin actor is rejected", () => {
  const request = action() as unknown as { actor: Record<string, unknown> };
  request.actor.actorRole = "admin";
  const validation = validateCandidateReviewActionRequest(request, reviewPackage());
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /actorRole must be superadmin/);
});

test("package and linked Discovery lineage mismatches are rejected", () => {
  const request = action({ target: { ...action().target, siteVersionId: "site-version-other" } });
  const validation = validateCandidateReviewActionRequest(request, reviewPackage(), {
    linkedCandidateDiscoveryResult: linkedDiscovery(),
  });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /siteVersionId must match/);
});

test("target candidate must exist in a provided linked Discovery result", () => {
  const request = action({ target: { ...action().target, candidateId: "candidate:missing" } });
  const validation = validateCandidateReviewActionRequest(request, reviewPackage(), {
    linkedCandidateDiscoveryResult: linkedDiscovery(),
  });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /candidateId must exist/);
});

test("stale package artifact is rejected when the latest ref is known", () => {
  const validation = validateCandidateReviewActionRequest(action(), reviewPackage(), {
    latestCandidateReviewPackageArtifactId: "candidate-review-package-artifact-2",
  });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /is stale/);
});

test("all forbidden generated, execution, and publishing fields are rejected recursively", () => {
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
    const request = action() as unknown as Record<string, unknown>;
    request.metadata = { nested: { [field]: [] } };
    const validation = validateCandidateReviewActionRequest(request, reviewPackage());
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`metadata\\.nested\\.${field} is forbidden`), field);
  }
});

test("rejected request creates no event and explains the rejection", () => {
  const result = createCandidateReviewEventFromAction(
    action({ rationale: "" }),
    reviewPackage(),
  );
  assert.equal(result.accepted, false);
  assert.equal(result.candidateReviewEvent, null);
  assert.ok(result.diagnostics.length > 0);
});

test("event creation does not mutate the package", () => {
  const previous = existingEvent();
  const packageValue = reviewPackage([previous]);
  const before = structuredClone(packageValue);
  const result = createCandidateReviewEventFromAction(action(), packageValue, previous);
  assert.equal(result.accepted, true);
  assert.deepEqual(packageValue, before);
  assert.equal(packageValue.reviewEvents.length, 1);
});
