import assert from "node:assert/strict";
import test from "node:test";

import { __setRuntimeUsageEventLoggerDependenciesForTest, persistRuntimeUsageEvent } from "@/gnr8/runtime/runtime-usage-event-logger";

test("runtime usage event logger writes event when billing context resolves", async () => {
  const writes: Array<Record<string, unknown>> = [];
  const restore = __setRuntimeUsageEventLoggerDependenciesForTest({
    resolveBillingContextForSite: async () =>
      ({
        billingAccountId: "00000000-0000-4000-8000-000000000001",
        agencyId: "00000000-0000-4000-8000-000000000002",
        clientId: "00000000-0000-4000-8000-000000000003",
        siteId: "00000000-0000-4000-8000-000000000004",
        costCenterIds: {
          agencyCostCenterId: null,
          clientCostCenterId: null,
          siteCostCenterId: null,
        },
      }) as never,
    logRuntimeUsageEventWithAttribution: async (input) => {
      writes.push(input as unknown as Record<string, unknown>);
      return {
        id: "evt_1",
        createdAt: new Date().toISOString(),
        attribution: {
          billingAccountId: "00000000-0000-4000-8000-000000000001",
          agencyId: "00000000-0000-4000-8000-000000000002",
          clientId: "00000000-0000-4000-8000-000000000003",
          siteId: "00000000-0000-4000-8000-000000000004",
          costCenterIds: {
            agencyCostCenterId: null,
            clientCostCenterId: null,
            siteCostCenterId: null,
          },
        },
      };
    },
  });

  try {
    const result = await persistRuntimeUsageEvent({
      siteId: "00000000-0000-4000-8000-000000000004",
      artifactId: "00000000-0000-4000-8000-000000000005",
      requestCount: 1,
      bandwidthBytes: 512,
      computeMs: 4,
      periodStart: new Date("2026-03-27T10:00:00.000Z"),
      periodEnd: new Date("2026-03-27T10:00:00.500Z"),
    });

    assert.deepEqual(result, { status: "written" });
    assert.equal(writes.length, 1);
    assert.equal(writes[0]?.estimatedCost, 0);
    assert.equal(writes[0]?.requestCount, 1);
  } finally {
    restore();
  }
});

test("runtime usage event logger skips when billing context is missing", async () => {
  const warnings: Array<{ message: string; payload: Record<string, unknown> }> = [];
  const restore = __setRuntimeUsageEventLoggerDependenciesForTest({
    resolveBillingContextForSite: async () => null,
    warn: (message, payload) => {
      warnings.push({ message, payload });
    },
  });

  try {
    const result = await persistRuntimeUsageEvent({
      siteId: "00000000-0000-4000-8000-000000000010",
      requestCount: 1,
      bandwidthBytes: 64,
      computeMs: 2,
      periodStart: new Date("2026-03-27T10:00:00.000Z"),
      periodEnd: new Date("2026-03-27T10:00:00.100Z"),
    });

    assert.deepEqual(result, { status: "skipped", reason: "missing_billing_context" });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]?.message ?? "", /billing context/);
  } finally {
    restore();
  }
});

test("runtime usage event logger warns and returns failed when persistence throws", async () => {
  const warnings: Array<{ message: string; payload: Record<string, unknown> }> = [];
  const restore = __setRuntimeUsageEventLoggerDependenciesForTest({
    resolveBillingContextForSite: async () =>
      ({
        billingAccountId: "00000000-0000-4000-8000-000000000021",
        agencyId: "00000000-0000-4000-8000-000000000022",
        clientId: null,
        siteId: "00000000-0000-4000-8000-000000000023",
        costCenterIds: {
          agencyCostCenterId: null,
          clientCostCenterId: null,
          siteCostCenterId: null,
        },
      }) as never,
    logRuntimeUsageEventWithAttribution: async () => {
      throw new Error("write failed");
    },
    warn: (message, payload) => {
      warnings.push({ message, payload });
    },
  });

  try {
    const result = await persistRuntimeUsageEvent({
      siteId: "00000000-0000-4000-8000-000000000023",
      requestCount: 1,
      bandwidthBytes: 10,
      computeMs: 1,
      periodStart: new Date("2026-03-27T10:00:00.000Z"),
      periodEnd: new Date("2026-03-27T10:00:00.020Z"),
    });

    assert.deepEqual(result, { status: "failed", reason: "persist_error" });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0]?.message ?? "", /Failed to persist/);
  } finally {
    restore();
  }
});
