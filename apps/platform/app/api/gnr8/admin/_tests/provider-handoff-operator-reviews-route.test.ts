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
    reviewSummary: { reviewSummaryStatus: string; reviewCount: number; intentOnly: boolean; executionBlocked: boolean };
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
  assert.equal(body.reviewSummary.reviewSummaryStatus, "approved_for_future_execution");
  assert.equal(body.reviewSummary.reviewCount, 2);
  assert.equal(body.reviewSummary.intentOnly, true);
  assert.equal(body.reviewSummary.executionBlocked, true);
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_READ"), true);
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_SUMMARY_CREATED"), true);
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

test("provider handoff operator reviews route: conflicting reviews summarize as mixed state", async () => {
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
          reviewId: "review_1",
          handoffId: "handoff_1",
          correlationKey: "corr_1",
          reviewerRef: "reviewer_1",
          reviewStatus: "pending_review",
          reviewReason: "awaiting",
          createdAt: "2026-05-22T00:00:00.000Z",
        },
        {
          reviewId: "review_2",
          handoffId: "handoff_1",
          correlationKey: "corr_2",
          reviewerRef: "reviewer_2",
          reviewStatus: "rejected",
          reviewReason: "blocked",
          createdAt: "2026-05-22T00:00:01.000Z",
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
  const body = (await response.json()) as { reviewSummary: { reviewSummaryStatus: string }; diagnostics: string[] };
  assert.equal(response.status, 200);
  assert.equal(body.reviewSummary.reviewSummaryStatus, "mixed_review_state");
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_SUMMARY_MIXED_STATE"), true);
});

test("provider handoff operator reviews route POST: anonymous/non-superadmin rejected", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "pending_review", reviewReason: "intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  assert.equal(response.status, 403);
});

test("provider handoff operator reviews route POST: invalid status rejected", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        correlationKey: "corr_1",
      }) as never,
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "not_valid", reviewReason: "intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  assert.equal(response.status, 400);
});

test("provider handoff operator reviews route POST: valid review persisted", async () => {
  let persistedCount = 0;
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        correlationKey: "corr_1",
      }) as never,
    createProviderOperatorReviewArtifacts: async (input) => {
      persistedCount += input.length;
      return [...input];
    },
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "pending_review", reviewReason: "intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; diagnostics: string[]; review: { reviewStatus: string } };
  assert.equal(body.ok, true);
  assert.equal(body.review.reviewStatus, "pending_review");
  assert.equal(persistedCount, 1);
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_PERSISTED"), true);
});

test("provider handoff operator reviews route POST: approved_for_future_execution persists as intent-only", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        correlationKey: "corr_1",
      }) as never,
    createProviderOperatorReviewArtifacts: async (input) => [...input],
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "approved_for_future_execution", reviewReason: "future intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  const body = (await response.json()) as { intentOnly: boolean; executionBlocked: boolean; review: { reviewStatus: string } };
  assert.equal(response.status, 200);
  assert.equal(body.review.reviewStatus, "approved_for_future_execution");
  assert.equal(body.intentOnly, true);
  assert.equal(body.executionBlocked, true);
});

test("provider handoff operator reviews route POST: missing/nonexistent handoff fails closed", async () => {
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => null,
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_missing/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "pending_review", reviewReason: "intent only" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_missing" }) },
  );
  assert.equal(response.status, 404);
  const body = (await response.json()) as { diagnostics: string[] };
  assert.equal(body.diagnostics.includes("OPERATOR_REVIEW_CREATE_FAILED_CLOSED:HANDOFF_NOT_FOUND"), true);
});

test("provider handoff operator reviews route POST: no provider/DNS/external execution path invoked", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let externalCallCount = 0;
  const handlers = createProviderHandoffOperatorReviewsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        correlationKey: "corr_1",
      }) as never,
    createProviderOperatorReviewArtifacts: async (input) => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      externalCallCount += 0;
      return [...input];
    },
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewStatus: "pending_review", reviewReason: "token=secret_123" }),
    }),
    { params: Promise.resolve({ handoffId: "handoff_1" }) },
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  const asJson = JSON.stringify(body);
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(externalCallCount, 0);
  assert.equal(asJson.includes("secret_123"), false);
});
