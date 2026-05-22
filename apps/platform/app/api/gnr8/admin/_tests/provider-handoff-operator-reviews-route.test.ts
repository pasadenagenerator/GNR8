import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffOperatorReviewsRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/reviews/provider-handoff-operator-reviews-route-handlers";

test("provider handoff operator reviews route: returns deterministic review list and intentOnly/executionBlocked", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        artifactId: "approval_1",
        siteId: "11111111-1111-1111-1111-111111111111",
        siteVersionId: "22222222-2222-2222-2222-222222222222",
      }) as never,
    getProviderOperatorReviewsByHandoffId: async () => ({
      reviews: [
        {
          reviewId: "review_2",
          handoffId: "handoff_1",
          correlationKey: "corr_2",
          reviewerRef: "reviewer_2",
          reviewStatus: "approved_for_future_execution",
          reviewReason: "ready for future execution intent",
          createdAt: "2026-05-22T00:00:01.000Z",
        },
        {
          reviewId: "review_1",
          handoffId: "handoff_1",
          correlationKey: "corr_1",
          reviewerRef: "reviewer_1",
          reviewStatus: "pending_review",
          reviewReason: "awaiting governance pass",
          createdAt: "2026-05-22T00:00:00.000Z",
        },
      ],
      diagnostics: ["OPERATOR_REVIEW_READ"],
    }),
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    reviews: Array<{ reviewId: string; reviewStatus: string }>;
    executionBlocked: boolean;
    intentOnly: boolean;
    diagnostics: string[];
  };

  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
  assert.deepEqual(
    body.reviews.map((review) => review.reviewId),
    ["review_2", "review_1"],
  );
  assert.equal(
    body.reviews.some((review) => review.reviewStatus === "approved_for_future_execution"),
    true,
  );
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_READ"), true);
});

test("provider handoff operator reviews route: fails closed on missing handoff id", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers();
  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs//reviews"), {
    params: Promise.resolve({ handoffId: " " }),
  });
  assert.equal(response.status, 400);
  const body = (await response.json()) as { executionBlocked: boolean; intentOnly: boolean; diagnostics: string[] };
  assert.equal(body.executionBlocked, true);
  assert.equal(body.intentOnly, true);
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_FAILED_CLOSED:MISSING_HANDOFF_ID"), true);
});

test("provider handoff operator reviews route: no provider execution path and no secrets exposed", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let externalCallCount = 0;
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        artifactId: "approval_1",
        siteId: "11111111-1111-1111-1111-111111111111",
        siteVersionId: "22222222-2222-2222-2222-222222222222",
      }) as never,
    getProviderOperatorReviewsByHandoffId: async () => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      externalCallCount += 0;
      return {
        reviews: [
          {
            reviewId: "review_1",
            handoffId: "handoff_1",
            correlationKey: "corr_1",
            reviewerRef: "reviewer_1",
            reviewStatus: "pending_review",
            reviewReason: "apiToken=secret_123",
            createdAt: "2026-05-22T00:00:00.000Z",
          },
        ],
        diagnostics: ["OPERATOR_REVIEW_READ"],
      };
    },
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });
  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  const asJson = JSON.stringify(body);
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(externalCallCount, 0);
  assert.equal(String(body.executionBlocked), "true");
  assert.equal(String(body.intentOnly), "true");
  assert.equal(asJson.includes("secret_123"), false);
});
