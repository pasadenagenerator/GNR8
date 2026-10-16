import assert from "node:assert/strict";
import test from "node:test";

import { createAstroSuccessorPublicationRouteHandlers } from "./astro-successor-publication-route-handlers";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_ID = "astro_candidate_22222222222242228222222222222222";
const SOURCE_ARTIFACT_ID = "33333333-3333-4333-8333-333333333333";
const ACTIVE_VERSION_ID = "44444444-4444-4444-8444-444444444444";
const ACTIVE_ARTIFACT_ID = "55555555-5555-4555-8555-555555555555";
const SUCCESSOR_VERSION_ID = "66666666-6666-4666-8666-666666666666";
const SUCCESSOR_ARTIFACT_ID = "77777777-7777-4777-8777-777777777777";
const URL = `https://preview.example/api/gnr8/admin/astro-candidates/${SITE_VERSION_ID}/${CANDIDATE_ID}/publish-successor`;

test("authenticates before parsing or loading publication dependencies", async () => {
  const calls: string[] = [];
  const handlers = createAstroSuccessorPublicationRouteHandlers({
    requireSuperadminUserId: async () => {
      calls.push("auth");
      throw new Error("Unauthorized");
    },
    isFeatureEnabled: () => {
      calls.push("feature");
      return true;
    },
    loadPublicationOperation: async () => {
      calls.push("operation");
      throw new Error("not expected");
    },
  });
  const response = await handlers.POST(request(), context());
  assert.equal(response.status, 401);
  assert.deepEqual(calls, ["auth"]);
});

test("requires same-origin JSON, exact confirmation, and expected pointer selection", async (t) => {
  let operationCalls = 0;
  const handlers = createAstroSuccessorPublicationRouteHandlers({
    requireSuperadminUserId: async () => "real-superadmin-actor",
    isFeatureEnabled: () => true,
    loadPublicationOperation: async () => async () => {
      operationCalls += 1;
      return successResult();
    },
  });
  await t.test("cross origin", async () => {
    const response = await handlers.POST(request({ origin: "https://attacker.example" }), context());
    assert.equal(response.status, 403);
  });
  await t.test("missing confirmation", async () => {
    const response = await handlers.POST(request({ body: { ...body(), confirmation: "" } }), context());
    assert.equal(response.status, 422);
  });
  await t.test("unknown field", async () => {
    const response = await handlers.POST(request({ body: { ...body(), externalPublish: true } }), context());
    assert.equal(response.status, 422);
  });
  assert.equal(operationCalls, 0);
});

test("derives actor from auth and invokes only internal shadow publication", async () => {
  let received: unknown = null;
  const handlers = createAstroSuccessorPublicationRouteHandlers({
    requireSuperadminUserId: async () => "real-superadmin-actor",
    isFeatureEnabled: () => true,
    loadPublicationOperation: async () => async (input) => {
      received = input;
      return successResult();
    },
  });
  const response = await handlers.POST(request(), context());
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    actorUserId: "real-superadmin-actor",
    runtimeSiteId: "runtime-site-astro-successor",
    sourceSiteVersionId: SITE_VERSION_ID,
    sourceCandidateId: CANDIDATE_ID,
    sourceArtifactId: SOURCE_ARTIFACT_ID,
    expectedSourceContentSha256: "a".repeat(64),
    expectedSourceStorageSha256: "b".repeat(64),
    expectedActivePointer: { siteVersionId: ACTIVE_VERSION_ID, artifactId: ACTIVE_ARTIFACT_ID },
    expectedInternalHost: "seed-runtime-coverage.staging.gnr8.test",
    stage: "shadow",
  });
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.ok, true);
  assert.equal(payload.internalPublicationOnly, true);
  assert.equal(payload.externalDomainPublished, false);
  assert.equal(payload.providerExecutionPerformed, false);
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
    mode: "shadow_publish",
    confirmation: "publish-generated-astro-successor-to-shadow",
    runtimeSiteId: "runtime-site-astro-successor",
    sourceArtifactId: SOURCE_ARTIFACT_ID,
    sourceContentSha256: "a".repeat(64),
    sourceStorageSha256: "b".repeat(64),
    expectedActiveSiteVersionId: ACTIVE_VERSION_ID,
    expectedActiveArtifactId: ACTIVE_ARTIFACT_ID,
    expectedInternalHost: "seed-runtime-coverage.staging.gnr8.test",
  };
}

function context() {
  return { params: Promise.resolve({ siteVersionId: SITE_VERSION_ID, candidateId: CANDIDATE_ID }) };
}

function successResult() {
  return {
    operationVersion: "gnr8-astro-successor-publication:v1" as const,
    status: "published" as const,
    stage: "shadow" as const,
    source: {
      siteVersionId: SITE_VERSION_ID,
      artifactId: SOURCE_ARTIFACT_ID,
      candidateId: CANDIDATE_ID,
      contentSha256: "a".repeat(64),
      storageSha256: "b".repeat(64),
    },
    successor: {
      siteVersionId: SUCCESSOR_VERSION_ID,
      versionNo: 5,
      artifactId: SUCCESSOR_ARTIFACT_ID,
      candidateId: "astro_candidate_88888888888848888888888888888888",
      candidateContentSha256: "c".repeat(64),
      candidateStorageSha256: "d".repeat(64),
      state: "PUBLISHED" as const,
    },
    lineage: {
      producerKind: "astro_successor_candidate_rebind" as const,
      producerVersion: "v1" as const,
      producerRef: CANDIDATE_ID,
      htmlPreservedExactly: true as const,
      cssPreservedExactly: true as const,
    },
    governance: {
      status: "evaluated" as const,
      decision: "REVIEW_ONLY",
      blockerCodes: [],
      pageStructuralConfidence: 0.98,
      pageGateDecision: "pass",
      shadowEnforcementDecision: "REVIEW_ONLY",
    },
    approval: { readyForReview: true as const, approved: true as const, actorUserId: "real-superadmin-actor" },
    pointer: {
      before: { siteVersionId: ACTIVE_VERSION_ID, artifactId: ACTIVE_ARTIFACT_ID },
      after: { siteVersionId: SUCCESSOR_VERSION_ID, artifactId: SUCCESSOR_ARTIFACT_ID },
      firstPublishSwitch: "atomic_site_pointer_reassignment",
      idempotentRepeat: "PUBLISH_ALREADY_ACTIVE_SAFE_NOOP" as const,
    },
    artifact: {
      bundleSha256: "e".repeat(64),
      publishStage: "shadow" as const,
      artifactSource: "astro_candidate_materialization" as const,
      fallbackUsed: false as const,
    },
    servingRecovery: {
      baselineRestorationPerformed: false,
      hostBindingBefore: "shadow",
      hostBindingAfter: "shadow" as const,
    },
  };
}
