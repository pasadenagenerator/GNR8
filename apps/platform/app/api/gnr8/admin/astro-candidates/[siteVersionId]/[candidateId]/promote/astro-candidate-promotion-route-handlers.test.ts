import assert from "node:assert/strict";
import test from "node:test";

import { createAstroCandidatePromotionRouteHandlers } from "./astro-candidate-promotion-route-handlers";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_ID = "astro_candidate_22222222222242228222222222222222";
const URL = `https://preview.example/api/gnr8/admin/astro-candidates/${SITE_VERSION_ID}/${CANDIDATE_ID}/promote`;

test("authenticates before selectors, origin, feature gate, or promotion dependencies", async () => {
  const calls: string[] = [];
  const handlers = createAstroCandidatePromotionRouteHandlers({
    requireSuperadminUserId: async () => {
      calls.push("auth");
      throw new Error("Unauthorized");
    },
    isFeatureEnabled: () => {
      calls.push("feature");
      return true;
    },
    loadPromotionOperation: async () => {
      calls.push("operation");
      throw new Error("not expected");
    },
  });
  const response = await handlers.POST(request(), context());
  assert.equal(response.status, 401);
  assert.deepEqual(calls, ["auth"]);
});

test("requires same-origin JSON with exact immutable selection hashes", async (t) => {
  let operationCalls = 0;
  const handlers = createAstroCandidatePromotionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp20",
    isFeatureEnabled: () => true,
    loadPromotionOperation: async () => async () => {
      operationCalls += 1;
      return successResult();
    },
  });
  await t.test("cross origin", async () => {
    const response = await handlers.POST(request({ origin: "https://attacker.example" }), context());
    assert.equal(response.status, 403);
  });
  await t.test("unknown field", async () => {
    const response = await handlers.POST(request({ body: { ...body(), publish: true } }), context());
    assert.equal(response.status, 422);
  });
  await t.test("stale shape", async () => {
    const response = await handlers.POST(request({ body: { contentSha256: "a".repeat(64) } }), context());
    assert.equal(response.status, 422);
  });
  assert.equal(operationCalls, 0);
});

test("POST invokes exact selection and reports materialization without publication", async () => {
  let received: unknown = null;
  const handlers = createAstroCandidatePromotionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp20",
    isFeatureEnabled: () => true,
    loadPromotionOperation: async () => async (input) => {
      received = input;
      return successResult();
    },
  });
  const response = await handlers.POST(request(), context());
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    actorUserId: "superadmin-mvp20",
    siteVersionId: SITE_VERSION_ID,
    candidateId: CANDIDATE_ID,
    expectedContentSha256: "a".repeat(64),
    expectedStorageSha256: "b".repeat(64),
    idempotencyKey: "promotion-mvp20",
  });
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.ok, true);
  assert.equal(payload.published, false);
  assert.equal(payload.activePointerChanged, false);
  assert.equal(payload.previewBindingsChanged, false);
  assert.match(String(payload.label), /not published/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

function request(input: { origin?: string; body?: Record<string, unknown> } = {}): Request {
  return new Request(URL, {
    method: "POST",
    headers: {
      origin: input.origin ?? "https://preview.example",
      host: "preview.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(input.body ?? body()),
  });
}

function body() {
  return {
    contentSha256: "a".repeat(64),
    storageSha256: "b".repeat(64),
    idempotencyKey: "promotion-mvp20",
  };
}

function context() {
  return { params: Promise.resolve({ siteVersionId: SITE_VERSION_ID, candidateId: CANDIDATE_ID }) };
}

function successResult() {
  return {
    status: "materialized" as const,
    candidateId: CANDIDATE_ID,
    siteId: "runtime-site-mvp20",
    siteVersionId: SITE_VERSION_ID,
    runtimeArtifactId: "33333333-3333-4333-8333-333333333333",
    runtimeBundleSha256: "c".repeat(64),
    candidateContentSha256: "a".repeat(64),
    candidateStorageSha256: "b".repeat(64),
    sourceSnapshotSha256: "d".repeat(64),
    exportSha256: "e".repeat(64),
    convertedArtifactSha256: "a".repeat(64),
    htmlPreservedExactly: true as const,
    cssPreservedExactly: true as const,
    materialization: "complete" as const,
    persistence: "complete" as const,
    governance: { status: "blocked" as const, decision: null, blockerCodes: ["page_migration_governance_missing"] },
    workflowHandoff: {
      recognized: true as const,
      approvalState: "ARCHIVED",
      publishStage: "shadow" as const,
      servingEligible: false,
      servingEligibilityReason: "artifact_missing_governance_metadata",
      readyForShadowActivation: false,
      blockerCodes: ["page_migration_governance_missing", "site_version_state_archived"],
    },
    activePointerChanged: false as const,
    previewBindingsChanged: false as const,
    published: false as const,
  };
}
