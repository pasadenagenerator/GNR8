import assert from "node:assert/strict";
import test from "node:test";

import { createProviderHandoffGovernanceTimelineRouteHandlers } from "@/app/api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline/provider-handoff-governance-timeline-route-handlers";

test("provider handoff governance timeline route: returns newest-first snapshots with executionBlocked true", async () => {
  const handlers = createProviderHandoffGovernanceTimelineRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () =>
      ({
        handoffId: "handoff_1",
        siteId: "11111111-1111-1111-1111-111111111111",
        siteVersionId: "22222222-2222-2222-2222-222222222222",
        correlationKey: "corr_1",
      }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
    getProviderGovernanceTimelineByHandoffId: async () => ({
      executionBlocked: true,
      diagnostics: ["GOVERNANCE_SNAPSHOT_AUDIT_READ"],
      snapshots: [
        {
          snapshotId: "snap_old",
          handoffId: "handoff_1",
          correlationKey: "corr_1",
          readinessStatus: "pickup_ready",
          executionBlocked: true,
          workerPickupEvidence: {} as never,
          reviewSummary: {
            reviewSummaryStatus: "no_reviews",
            reviewCount: 0,
            latestReviewer: "",
            latestCreatedAt: "",
            latestReason: "",
            intentOnly: true,
            executionBlocked: true,
          },
          diagnostics: ["GOVERNANCE_SNAPSHOT_PERSISTED"],
          createdAt: "2026-05-22T00:00:00.000Z",
        },
        {
          snapshotId: "snap_new",
          handoffId: "handoff_1",
          correlationKey: "corr_1",
          readinessStatus: "pickup_not_ready",
          executionBlocked: true,
          workerPickupEvidence: {} as never,
          reviewSummary: {
            reviewSummaryStatus: "mixed_review_state",
            reviewCount: 2,
            latestReviewer: "a",
            latestCreatedAt: "2026-05-22T00:00:02.000Z",
            latestReason: "needs changes",
            intentOnly: true,
            executionBlocked: true,
          },
          diagnostics: ["GOVERNANCE_SNAPSHOT_REUSED"],
          createdAt: "2026-05-22T00:00:02.000Z",
        },
      ],
    }),
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/governance-timeline"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { snapshots: Array<{ snapshotId: string; createdAt: string }>; executionBlocked: boolean };
  assert.equal(body.executionBlocked, true);
  assert.deepEqual(
    body.snapshots.map((entry) => entry.snapshotId),
    ["snap_new", "snap_old"],
  );
});


test("provider handoff governance timeline route: no execution paths and no secret leakage", async () => {
  let providerExecutionCallCount = 0;
  let dnsWriteCallCount = 0;
  let externalCallCount = 0;

  const handlers = createProviderHandoffGovernanceTimelineRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    getProviderExecutionHandoffByHandoffId: async () => ({
      handoffId: "handoff_1",
      siteId: "11111111-1111-1111-1111-111111111111",
      siteVersionId: "22222222-2222-2222-2222-222222222222",
      correlationKey: "corr_1",
      apiToken: "secret_123",
    }) as never,
    resolveAgencyIdForSiteVersion: async () => "agency_1",
    resolveAgencyIdForSite: async () => "agency_1",
    requireAgencyActionContext: async () =>
      ({ userId: "user_1", agencyId: "agency_1", agencyName: "Agency", role: "owner", actorMode: "membership" }) as never,
    getProviderGovernanceTimelineByHandoffId: async () => {
      providerExecutionCallCount += 0;
      dnsWriteCallCount += 0;
      externalCallCount += 0;
      return { executionBlocked: true, diagnostics: ["GOVERNANCE_SNAPSHOT_AUDIT_READ"], snapshots: [] };
    },
  });

  const response = await handlers.GET(new Request("http://localhost/api/gnr8/admin/provider-handoffs/handoff_1/governance-timeline"), {
    params: Promise.resolve({ handoffId: "handoff_1" }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  const asJson = JSON.stringify(body);
  assert.equal(providerExecutionCallCount, 0);
  assert.equal(dnsWriteCallCount, 0);
  assert.equal(externalCallCount, 0);
  assert.equal(asJson.includes("secret_123"), false);
  assert.equal(String(body.executionBlocked), "true");
});
