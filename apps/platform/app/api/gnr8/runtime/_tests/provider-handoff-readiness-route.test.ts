import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffReadinessRouteHandlers } from "@/app/api/gnr8/runtime/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-route-handlers";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

function createHandlers(
  overrides: Parameters<typeof createProviderHandoffReadinessRouteHandlers>[0] = {},
) {
  return createProviderHandoffReadinessRouteHandlers({
    getProviderOperatorReviewsByHandoffId: async () => ({ reviews: [], diagnostics: [] }),
    ...overrides,
  });
}

function baseHandoffArtifact(): RuntimeProviderExecutionHandoffArtifactRecord {
  return {
    handoffId: "handoff_1",
    artifactId: "approval_1",
    siteId: "11111111-1111-1111-1111-111111111111",
    siteVersionId: "22222222-2222-2222-2222-222222222222",
    providerId: "openprovider_sandbox",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind: "upsert_dns_records",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "ready",
    plannedJobIds: ["job_2", "job_1"],
    warnings: ["warn_b", "warn_a"],
    blockers: [],
    correlationKey: "corr_1",
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

test("provider handoff readiness route: valid persisted handoff returns deterministic worker pickup evidence", async () => {
  const handoffArtifact = baseHandoffArtifact();
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () => handoffArtifact,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    handoffArtifact: { plannedJobIds: string[]; warnings: string[]; correlationKey: string; providerId: string };
    workerPickupEvidence: { executionBlocked: boolean; readinessStatus: string; blockedReasons: string[]; nextAllowedAction: string };
    executionBlocked: boolean;
    readinessStatus: string;
    blockedReasons: string[];
    diagnostics: string[];
    correlationKey: string;
    governanceSnapshot: {
      readinessStatus: string;
      executionBlocked: boolean;
      diagnostics: string[];
      reviewSummary: { reviewSummaryStatus: string };
      workerPickupEvidence: { readinessStatus: string; executionBlocked: boolean };
    };
  };

  assert.deepEqual(body.handoffArtifact.plannedJobIds, ["job_1", "job_2"]);
  assert.deepEqual(body.handoffArtifact.warnings, ["warn_a", "warn_b"]);
  assert.equal(body.handoffArtifact.providerId, "openprovider_sandbox");
  assert.equal(body.executionBlocked, true);
  assert.equal(body.workerPickupEvidence.executionBlocked, true);
  assert.equal(body.readinessStatus, "pickup_ready");
  assert.equal(body.workerPickupEvidence.readinessStatus, "pickup_ready");
  assert.equal(body.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
  assert.equal(body.blockedReasons.includes("provider_execution_disabled_control_plane_boundary"), true);
  assert.equal(body.diagnostics.some((entry) => entry.startsWith("PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:")), true);
  assert.equal(body.correlationKey.length > 0, true);
  assert.equal(body.handoffArtifact.correlationKey, "corr_1");
  assert.equal(body.governanceSnapshot.executionBlocked, true);
  assert.equal(body.governanceSnapshot.readinessStatus, "pickup_ready");
  assert.equal(body.governanceSnapshot.workerPickupEvidence.readinessStatus, "pickup_ready");
  assert.equal(body.governanceSnapshot.workerPickupEvidence.executionBlocked, true);
  assert.equal(body.governanceSnapshot.reviewSummary.reviewSummaryStatus, "no_reviews");
  assert.equal(body.governanceSnapshot.diagnostics.includes("GOVERNANCE_SNAPSHOT_CREATED"), true);
});

test("provider handoff readiness route: missing handoff returns deterministic fail-closed response", async () => {
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () => null,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/missing/readiness"), {
    params: Promise.resolve({ handoffId: "missing" }),
  });

  assert.equal(response.status, 404);
  const body = (await response.json()) as {
    handoffArtifact: null;
    workerPickupEvidence: { readinessStatus: string; executionBlocked: boolean; blockedReasons: string[] };
    readinessStatus: string;
    executionBlocked: boolean;
    blockedReasons: string[];
    correlationKey: string;
  };

  assert.equal(body.handoffArtifact, null);
  assert.equal(body.readinessStatus, "failed_closed");
  assert.equal(body.workerPickupEvidence.readinessStatus, "failed_closed");
  assert.equal(body.executionBlocked, true);
  assert.equal(body.workerPickupEvidence.executionBlocked, true);
  assert.equal(body.blockedReasons.some((entry) => entry.includes("worker_pickup_evidence_failed_closed")), true);
  assert.equal(body.correlationKey.length > 0, true);
});

test("provider handoff readiness route: invalid handoff shape fails closed", async () => {
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () => ({ ...baseHandoffArtifact(), artifactId: " " }),
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    handoffArtifact: null;
    readinessStatus: string;
    executionBlocked: boolean;
    blockedReasons: string[];
    diagnostics: string[];
  };

  assert.equal(body.handoffArtifact, null);
  assert.equal(body.readinessStatus, "failed_closed");
  assert.equal(body.executionBlocked, true);
  assert.equal(body.blockedReasons.some((entry) => entry.includes("worker_pickup_evidence_failed_closed")), true);
  assert.equal(body.diagnostics.some((entry) => entry.includes("PROVIDER_WORKER_PICKUP_EVIDENCE_FAILED_CLOSED")), true);
});

test("provider handoff readiness route: no provider or external execution path is invoked and secrets are not exposed", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let openproviderCallCount = 0;
  let externalFetchCallCount = 0;
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () =>
      ({ ...baseHandoffArtifact(), providerPayloadCredentials: "secret_token_value", apiToken: "secret_api_token" } as never),
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
    createRuntimeProviderWorkerPickupReadinessEvidence: (input) => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      openproviderCallCount += 0;
      externalFetchCallCount += 0;
      return {
        handoffRef: "handoff_1",
        providerRef: "openprovider_sandbox",
        jobRefs: ["job_1"],
        approvalRef: "approval_1",
        approvalStatus: "approved",
        readinessStatus: "pickup_ready",
        executionBlocked: true,
        blockedReasons: ["provider_execution_disabled_control_plane_boundary"],
        diagnostics: ["PROVIDER_WORKER_PICKUP_EVIDENCE_CREATED:EVIDENCE_CREATED"],
        nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
        correlationKey: String(input.handoffArtifact?.correlationKey ?? "corr_1"),
      };
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  const asJson = JSON.stringify(body);

  assert.equal(String(body.executionBlocked), "true");
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(openproviderCallCount, 0);
  assert.equal(externalFetchCallCount, 0);
  assert.equal(asJson.includes("secret_token_value"), false);
  assert.equal(asJson.includes("secret_api_token"), false);
  assert.equal(asJson.includes("providerPayloadCredentials"), false);
  assert.equal(asJson.includes("apiToken"), false);
});

test("provider handoff readiness route: invalid non-uuid siteVersionId fails closed with deterministic diagnostic", async () => {
  let resolveBySiteVersionCalls = 0;
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () =>
      ({ ...baseHandoffArtifact(), siteVersionId: "dev_readiness_seed_site_version" }),
    resolveAgencyIdForSiteVersion: async () => {
      resolveBySiteVersionCalls += 1;
      return "agency_1";
    },
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    handoffArtifact: { siteVersionId?: string; siteId: string; correlationKey: string } | null;
    readinessStatus: string;
    diagnostics: string[];
    blockedReasons: string[];
  };

  assert.equal(resolveBySiteVersionCalls, 0);
  assert.ok(body.handoffArtifact);
  assert.equal(body.readinessStatus, "failed_closed");
  assert.equal(body.blockedReasons.some((entry) => entry.includes("agency_scope_unresolved_failed_closed")), true);
  assert.equal(
    body.diagnostics.includes("PROVIDER_HANDOFF_READINESS_INVALID_SCOPE_IDENTIFIER:FAILED_CLOSED"),
    true,
  );
  assert.equal(
    body.diagnostics.includes("PROVIDER_HANDOFF_READINESS_INVALID_SITE_VERSION_ID:FAILED_CLOSED"),
    true,
  );
});

test("provider handoff readiness route: deterministic dev seed scope returns 200 without DB agency lookup", async () => {
  let resolveBySiteVersionCalls = 0;
  let resolveBySiteCalls = 0;
  let requireAgencyCalls = 0;
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        ...baseHandoffArtifact(),
        siteId: "dev_readiness_seed_site",
        siteVersionId: "00000000-0000-0000-0000-00000000d365",
        correlationKey: "provider_handoff_readiness_ui_dev_seed_corr",
      }),
    resolveAgencyIdForSiteVersion: async () => {
      resolveBySiteVersionCalls += 1;
      return "agency_1";
    },
    resolveAgencyIdForSite: async () => {
      resolveBySiteCalls += 1;
      return "agency_1";
    },
    requireAgencyActionContext: async () => {
      requireAgencyCalls += 1;
      return ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never;
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    diagnostics: string[];
    executionBlocked: boolean;
    nextAllowedAction: string;
  };
  assert.equal(resolveBySiteVersionCalls, 0);
  assert.equal(resolveBySiteCalls, 0);
  assert.equal(requireAgencyCalls, 0);
  assert.equal(body.executionBlocked, true);
  assert.equal(body.nextAllowedAction, "control_plane_review_and_dry_run_artifact_inspection_only");
  assert.equal(
    body.diagnostics.includes("PROVIDER_HANDOFF_READINESS_DEV_SEED_SCOPE_APPLIED:CONTROL_PLANE_ONLY"),
    true,
  );
});

test("provider handoff readiness route: governance snapshot preserves mixed review summary", async () => {
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () => baseHandoffArtifact(),
    getProviderOperatorReviewsByHandoffId: async () => ({
      reviews: [
        {
          reviewId: "review_1",
          handoffId: "handoff_1",
          correlationKey: "review_corr_1",
          reviewerRef: "reviewer_a",
          reviewStatus: "approved_for_future_execution",
          reviewReason: "approved",
          createdAt: "2026-05-22T00:00:00.000Z",
        },
        {
          reviewId: "review_2",
          handoffId: "handoff_1",
          correlationKey: "review_corr_2",
          reviewerRef: "reviewer_b",
          reviewStatus: "needs_changes",
          reviewReason: "adjust dry run",
          createdAt: "2026-05-22T00:00:01.000Z",
        },
      ],
      diagnostics: ["OPERATOR_REVIEW_READ"],
    }),
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    governanceSnapshot: { reviewSummary: { reviewSummaryStatus: string }; executionBlocked: boolean };
  };
  assert.equal(body.governanceSnapshot.reviewSummary.reviewSummaryStatus, "mixed_review_state");
  assert.equal(body.governanceSnapshot.executionBlocked, true);
});

test("provider handoff readiness route: unexpected errors are sanitized", async () => {
  const handlers = createHandlers({
    getProviderExecutionHandoffByHandoffId: async () => {
      throw new Error('invalid input syntax for type uuid: "dev_readiness_seed_site_version"');
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/runtime/provider-handoffs/handoff_1/readiness"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 500);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "provider_handoff_readiness_failed_closed");
});
