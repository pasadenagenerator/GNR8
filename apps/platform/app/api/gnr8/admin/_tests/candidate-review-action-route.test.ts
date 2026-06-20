import assert from "node:assert/strict";
import test from "node:test";

import { createCandidateReviewActionRouteHandlers } from "../candidate-review/actions/candidate-review-action-route-handlers";
import type { CandidateReviewActionApplicationInput } from "@/gnr8/architecture/candidate-review-action-application";
import type { CandidateDiscoveryResult } from "@/gnr8/architecture/candidate-discovery-contract";
import type { CandidateDiscoveryResultArtifactRecord } from "@/gnr8/architecture/candidate-discovery-persistence";
import type { CandidateReviewEvent, CandidateReviewPackage } from "@/gnr8/architecture/candidate-review-contract";
import type {
  CandidateReviewPackageArtifactRecord,
  CandidateReviewPackageArtifactReference,
} from "@/gnr8/architecture/candidate-review-persistence";

const SITE_VERSION_ID = "site-version-route-test";
const DRY_RUN_ID = "dry-run-route-test";
const DISCOVERY_ARTIFACT_ID = "candidate-discovery-route-test";
const BASE_ARTIFACT_ID = "candidate-review-base";
const CANDIDATE_ID = "candidate:route:%2F";

function discoveryResult(overrides: Partial<CandidateDiscoveryResult> = {}): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery:route-test",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: "2026-06-19T07:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: ["route"],
    candidates: [{
      candidateId: CANDIDATE_ID,
      candidateType: "route",
      candidateStatus: "valid",
      confidence: { level: "HIGH", reasons: ["Fixture evidence"] },
      sourceEvidenceRefs: [{ refId: "evidence-1", sourceKind: "evidence_capture_baseline" }],
      sourceDryRunRefs: [{ refId: "dry-run-1", sourceKind: "limited_dry_run_output" }],
      limitations: [],
      diagnostics: [],
      routePath: "/",
    }],
    limitations: [],
    diagnostics: [],
    ...overrides,
  };
}

function discoveryArtifact(result = discoveryResult()): CandidateDiscoveryResultArtifactRecord {
  return {
    kind: "candidate_discovery_result",
    artifactKind: "candidate_discovery_result",
    artifactVersion: 1,
    artifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: result.siteVersionId,
    dryRunId: result.dryRunId,
    discoveryId: result.discoveryId,
    candidateCount: result.candidateCount,
    candidateTypesPresent: [...result.candidateTypesPresent],
    validationStatus: "valid",
    limitationCount: 0,
    blockerCount: 0,
    contractVersion: "8C-7",
    builderVersion: "8C-5",
    createdAt: result.createdAt,
    persistedAt: "2026-06-19T07:01:00.000Z",
    result,
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: [],
  };
}

function emptyPackage(): CandidateReviewPackage {
  return {
    reviewPackageId: `candidate-review:${DISCOVERY_ARTIFACT_ID}`,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewEvents: [],
    latestDecisions: [],
    reviewedCandidateCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    deferredCount: 0,
    diagnostics: [],
    createdAt: "2026-06-19T08:00:00.000Z",
  };
}

function reviewArtifact(
  packageValue: CandidateReviewPackage = emptyPackage(),
  artifactId = BASE_ARTIFACT_ID,
): CandidateReviewPackageArtifactRecord {
  return {
    kind: "candidate_review_package",
    artifactKind: "candidate_review_package",
    artifactVersion: 1,
    artifactId,
    reviewPackageId: packageValue.reviewPackageId,
    candidateDiscoveryArtifactId: packageValue.candidateDiscoveryArtifactId,
    siteVersionId: packageValue.siteVersionId,
    dryRunId: packageValue.dryRunId,
    reviewedCandidateCount: packageValue.reviewedCandidateCount,
    approvedCount: packageValue.approvedCount,
    rejectedCount: packageValue.rejectedCount,
    deferredCount: packageValue.deferredCount,
    contractVersion: "8D-11",
    createdAt: packageValue.createdAt,
    persistedAt: "2026-06-19T08:01:00.000Z",
    validationStatus: "valid",
    package: structuredClone(packageValue),
    validation: { valid: true, errors: [], warnings: [] },
    diagnostics: [],
  };
}

function reference(artifact: CandidateReviewPackageArtifactRecord): CandidateReviewPackageArtifactReference {
  const { package: _package, ...artifactReference } = artifact;
  return artifactReference;
}

function request(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request("https://admin.example.test/api/gnr8/admin/candidate-review/actions", {
    method: "POST",
    headers: {
      origin: "https://admin.example.test",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    siteVersionId: SITE_VERSION_ID,
    candidateId: CANDIDATE_ID,
    actionType: "approve",
    rationale: "Looks correct.",
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    candidateReviewPackageArtifactId: BASE_ARTIFACT_ID,
    ...overrides,
  };
}

function acceptedApplication(input: CandidateReviewActionApplicationInput, replayed = false) {
  const decision = { approve: "approved", reject: "rejected", defer: "deferred" }[input.request.actionType];
  const event: CandidateReviewEvent = {
    reviewEventId: `candidate-review-event:${input.request.actionId}`,
    candidateDiscoveryArtifactId: DISCOVERY_ARTIFACT_ID,
    candidateId: CANDIDATE_ID,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: input.request.actor.actorRef,
    decision,
    decidedAt: input.request.requestedAt,
    supersedesReviewEventId: null,
    rationale: input.request.rationale,
    diagnostics: [],
  };
  const packageValue: CandidateReviewPackage = {
    ...emptyPackage(),
    reviewEvents: [event],
    latestDecisions: [event],
    reviewedCandidateCount: 1,
    approvedCount: decision === "approved" ? 1 : 0,
    rejectedCount: decision === "rejected" ? 1 : 0,
    deferredCount: decision === "deferred" ? 1 : 0,
  };
  const artifact = reviewArtifact(packageValue, "candidate-review-result");
  return {
    artifact,
    result: {
      actionResult: {
        actionId: input.request.actionId,
        accepted: true,
        validation: { valid: true, errors: [], warnings: [] },
        candidateReviewEvent: event,
        diagnostics: [],
      },
      candidateReviewPackage: packageValue,
      baseCandidateReviewPackageArtifactId: BASE_ARTIFACT_ID,
      resultingCandidateReviewPackageArtifact: reference(artifact),
      replayed,
    },
  };
}

function successHarness(actionResultOverride?: (input: CandidateReviewActionApplicationInput) => ReturnType<typeof acceptedApplication>["result"]) {
  const base = reviewArtifact();
  let canonical = base;
  let appliedInput: CandidateReviewActionApplicationInput | null = null;
  let loadCount = 0;
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    now: () => "2026-06-19T09:00:00.000Z",
    loadCandidateDiscoveryResultById: async () => discoveryArtifact(),
    loadLatestCandidateReviewPackage: async () => {
      loadCount += 1;
      return loadCount === 1 ? base : canonical;
    },
    applyCandidateReviewAction: async (input) => {
      appliedInput = input;
      const result = actionResultOverride?.(input) ?? acceptedApplication(input).result;
      if (result.candidateReviewPackage && result.resultingCandidateReviewPackageArtifact) {
        canonical = reviewArtifact(result.candidateReviewPackage, result.resultingCandidateReviewPackageArtifact.artifactId);
      }
      return result;
    },
  });
  return { handlers, get appliedInput() { return appliedInput; }, get loadCount() { return loadCount; } };
}

test("candidate review action route rejects anonymous requests without loading state", async () => {
  let loaded = false;
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => { throw new Error("Unauthorized"); },
    loadCandidateDiscoveryResultById: async () => { loaded = true; return null; },
  });
  const response = await handlers.POST(request(payload()));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).errorCode, "UNAUTHORIZED");
  assert.equal(loaded, false);
});

test("candidate review action route rejects authenticated non-superadmins", async () => {
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => { throw new Error("Forbidden: superadmin only"); },
  });
  const response = await handlers.POST(request(payload()));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).errorCode, "FORBIDDEN");
});

for (const [actionType, decision] of [
  ["approve", "approved"],
  ["reject", "rejected"],
  ["defer", "deferred"],
] as const) {
  test(`candidate review action route applies ${actionType} and returns metadata only`, async () => {
    const harness = successHarness();
    const response = await harness.handlers.POST(request(payload({ actionType })));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.decision, decision);
    assert.equal(body.candidateReviewPackageArtifactId, "candidate-review-result");
    assert.equal(body.counts.reviewedCandidateCount, 1);
    assert.equal(harness.appliedInput?.request.actor.actorRef, "superadmin-1");
    assert.equal(harness.appliedInput?.request.actor.actorRole, "superadmin");
    assert.equal(harness.appliedInput?.request.requestedAt, "2026-06-19T09:00:00.000Z");
    assert.equal(harness.appliedInput?.request.target.dryRunId, DRY_RUN_ID);
    assert.equal("candidateReviewPackage" in body, false);
    assert.equal("candidateDiscoveryResult" in body, false);
  });
}

test("candidate review action route rejects a stale package before application", async () => {
  let applied = false;
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    loadCandidateDiscoveryResultById: async () => discoveryArtifact(),
    loadLatestCandidateReviewPackage: async () => reviewArtifact(emptyPackage(), "newer-package"),
    applyCandidateReviewAction: async () => { applied = true; throw new Error("must not run"); },
  });
  const response = await handlers.POST(request(payload()));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).errorCode, "STALE_REVIEW_PACKAGE");
  assert.equal(applied, false);
});

test("candidate review action route rejects a missing candidate", async () => {
  const result = discoveryResult({ candidates: [], candidateCount: 0, candidateTypesPresent: [] });
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    loadCandidateDiscoveryResultById: async () => discoveryArtifact(result),
  });
  const response = await handlers.POST(request(payload()));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).errorCode, "MISSING_CANDIDATE");
});

test("candidate review action route rejects invalid Discovery and Review Package lineage", async () => {
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    loadCandidateDiscoveryResultById: async () => discoveryArtifact(discoveryResult({ dryRunId: "other-dry-run" })),
    loadLatestCandidateReviewPackage: async () => reviewArtifact(),
  });
  const response = await handlers.POST(request(payload()));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).errorCode, "INVALID_LINEAGE");
});

test("candidate review action route replays the deterministic action with its original trusted time", async () => {
  let canonical = reviewArtifact();
  let calls = 0;
  let firstActionId = "";
  const handlers = createCandidateReviewActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-1",
    now: () => calls === 0 ? "2026-06-19T09:00:00.000Z" : "2026-06-19T10:00:00.000Z",
    loadCandidateDiscoveryResultById: async () => discoveryArtifact(),
    loadLatestCandidateReviewPackage: async () => canonical,
    applyCandidateReviewAction: async (input) => {
      calls += 1;
      if (calls === 1) firstActionId = input.request.actionId;
      if (calls === 2) {
        assert.equal(input.request.actionId, firstActionId);
        assert.equal(input.request.requestedAt, "2026-06-19T09:00:00.000Z");
      }
      const accepted = acceptedApplication(input, calls === 2);
      canonical = accepted.artifact;
      return accepted.result;
    },
  });
  assert.equal((await handlers.POST(request(payload()))).status, 200);
  const replay = await handlers.POST(request(payload()));
  assert.equal(replay.status, 200);
  assert.deepEqual((await replay.json()).diagnostics, ["CANDIDATE_REVIEW_ACTION_REPLAYED"]);
  assert.equal(calls, 2);
});

test("candidate review action route maps application identity conflicts", async () => {
  const harness = successHarness((input) => ({
    actionResult: {
      actionId: input.request.actionId,
      accepted: false,
      validation: { valid: false, errors: ["CANDIDATE_REVIEW_ACTION_IDEMPOTENCY_CONFLICT"], warnings: [] },
      candidateReviewEvent: null,
      diagnostics: ["CANDIDATE_REVIEW_ACTION_IDEMPOTENCY_CONFLICT"],
    },
    candidateReviewPackage: null,
    baseCandidateReviewPackageArtifactId: BASE_ARTIFACT_ID,
    resultingCandidateReviewPackageArtifact: null,
    replayed: false,
  }));
  const response = await harness.handlers.POST(request(payload()));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).errorCode, "IDEMPOTENCY_CONFLICT");
});

test("candidate review action route rejects forbidden client-controlled fields", async () => {
  for (const field of [
    "actorRef", "actorRole", "requestedAt", "actionId", "dryRunId",
    "generatedOutputs", "generatedBlocks", "generatedContent", "reactOutput", "designTokens",
    "publishingArtifacts", "reconstructionArtifacts", "executionArtifacts",
  ]) {
    const handlers = createCandidateReviewActionRouteHandlers({
      requireSuperadminUserId: async () => "superadmin-1",
    });
    const response = await handlers.POST(request(payload({ [field]: "forbidden" })));
    const body = await response.json();
    assert.equal(response.status, 422, field);
    assert.equal(body.errorCode, "VALIDATION_FAILED", field);
    assert.deepEqual(body.diagnostics, [`FORBIDDEN_REQUEST_FIELD:${field}`], field);
  }
});

test("candidate review action route rejects invalid action type, origin, and content type", async () => {
  const handlers = createCandidateReviewActionRouteHandlers({ requireSuperadminUserId: async () => "superadmin-1" });
  const invalidAction = await handlers.POST(request(payload({ actionType: "publish" })));
  assert.equal((await invalidAction.json()).errorCode, "INVALID_ACTION_TYPE");
  const invalidOrigin = await handlers.POST(request(payload(), { origin: "https://attacker.example" }));
  assert.equal((await invalidOrigin.json()).errorCode, "FORBIDDEN");
  const invalidContent = await handlers.POST(request(payload(), { "content-type": "text/plain" }));
  assert.equal((await invalidContent.json()).errorCode, "VALIDATION_FAILED");
});
