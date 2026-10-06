import assert from "node:assert/strict";
import test from "node:test";

import { createGeneratedOutputReviewRecord } from "@/gnr8/output-adapters/generated-output-eligibility";

import { createGeneratedOutputReviewRouteHandlers } from "./generated-output-review-route-handlers";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const ARTIFACT_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_ID = "astro_candidate_33333333333343338333333333333333";

test("review route denies unauthenticated requests before approval composition", async () => {
  let called = false;
  const handlers = createGeneratedOutputReviewRouteHandlers({
    requireActor: async () => { throw new Error("Unauthorized"); },
    approve: async () => { called = true; throw new Error("unexpected"); },
    enabled: () => true,
  });
  const response = await handlers.POST(request(), { params: Promise.resolve({ siteVersionId: VERSION_ID }) });
  assert.equal(response.status, 401);
  assert.equal(called, false);
});

test("review route derives reviewer from auth and forwards the exact artifact-bound selection", async () => {
  let received: Record<string, unknown> | null = null;
  const review = createGeneratedOutputReviewRecord({
    reviewId: "generated-output-review-1",
    decision: "APPROVED",
    policyVersion: "gnr8-generated-output-eligibility:v1",
    artifactId: ARTIFACT_ID,
    artifactBundleSha256: "a".repeat(64),
    candidateId: CANDIDATE_ID,
    candidateContentSha256: "b".repeat(64),
    contentManifestSha256: "c".repeat(64),
    technicalEvaluationSha256: "d".repeat(64),
    reviewerActorId: "reviewer-from-auth",
    reviewedAt: "2026-10-01T12:00:00.000Z",
  });
  const handlers = createGeneratedOutputReviewRouteHandlers({
    requireActor: async () => "reviewer-from-auth",
    approve: async (input) => {
      received = input;
      return {
        status: "approved",
        review,
        decision: { activation: "READY_FOR_TARGET_READINESS" } as never,
      };
    },
    enabled: () => true,
  });
  const response = await handlers.POST(request(), { params: Promise.resolve({ siteVersionId: VERSION_ID }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reviewerActorId, "reviewer-from-auth");
  assert.deepEqual(received, {
    siteVersionId: VERSION_ID,
    reviewerActorId: "reviewer-from-auth",
    expectedArtifactId: ARTIFACT_ID,
    expectedArtifactBundleSha256: "a".repeat(64),
    expectedCandidateId: CANDIDATE_ID,
    expectedCandidateContentSha256: "b".repeat(64),
    expectedContentManifestSha256: "c".repeat(64),
    expectedTechnicalEvaluationSha256: "d".repeat(64),
  });
});

function request(): Request {
  return new Request("https://preview.example.test/api/gnr8/admin/generated-output-review/target/approve", {
    method: "POST",
    headers: {
      origin: "https://preview.example.test",
      host: "preview.example.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      confirmation: "approve-exact-generated-output-artifact",
      artifactId: ARTIFACT_ID,
      artifactBundleSha256: "a".repeat(64),
      candidateId: CANDIDATE_ID,
      candidateContentSha256: "b".repeat(64),
      contentManifestSha256: "c".repeat(64),
      technicalEvaluationSha256: "d".repeat(64),
    }),
  });
}
