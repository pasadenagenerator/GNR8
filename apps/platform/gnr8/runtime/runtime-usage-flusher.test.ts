import assert from "node:assert/strict";
import test from "node:test";

import { __resetRuntimeUsageCollectorForTest, getRuntimeUsageAggregateSnapshot, incrementRuntimeUsage } from "@/gnr8/runtime/runtime-usage-collector";
import {
  __resetRuntimeUsageFlusherForTest,
  __setRuntimeUsageFlusherDependenciesForTest,
  flushRuntimeUsageNow,
} from "@/gnr8/runtime/runtime-usage-flusher";

test("runtime usage flusher writes aggregate when billing context resolves", async () => {
  __resetRuntimeUsageCollectorForTest();
  __resetRuntimeUsageFlusherForTest();

  const writes: Array<Record<string, unknown>> = [];
  const warnings: Array<Record<string, unknown>> = [];

  const restoreDeps = __setRuntimeUsageFlusherDependenciesForTest({
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
    logRuntimeUsageEvent: async (input) => {
      writes.push(input as unknown as Record<string, unknown>);
      return {
        id: "evt",
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
    warn: (_message, payload) => {
      warnings.push(payload);
    },
  });

  try {
    incrementRuntimeUsage("00000000-0000-4000-8000-000000000004", {
      artifactId: "00000000-0000-4000-8000-000000000005",
      requestCount: 3,
      bandwidthBytes: 420,
      computeMs: 21,
      at: new Date("2026-03-27T10:00:00.000Z"),
    });

    const result = await flushRuntimeUsageNow();
    assert.equal(result.drainedCount, 1);
    assert.equal(result.writtenCount, 1);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.failedCount, 0);
    assert.equal(writes.length, 1);
    assert.equal(warnings.length, 0);
    assert.equal(getRuntimeUsageAggregateSnapshot().length, 0);
  } finally {
    restoreDeps();
    __resetRuntimeUsageCollectorForTest();
    __resetRuntimeUsageFlusherForTest();
  }
});

test("runtime usage flusher skips aggregate when billing context is missing", async () => {
  __resetRuntimeUsageCollectorForTest();
  __resetRuntimeUsageFlusherForTest();

  const warnings: Array<{ message: string; payload: Record<string, unknown> }> = [];
  const restoreDeps = __setRuntimeUsageFlusherDependenciesForTest({
    resolveBillingContextForSite: async () => null,
    warn: (message, payload) => {
      warnings.push({ message, payload });
    },
  });

  try {
    incrementRuntimeUsage("00000000-0000-4000-8000-000000000010", {
      requestCount: 1,
      bandwidthBytes: 100,
      computeMs: 5,
    });
    const result = await flushRuntimeUsageNow();
    assert.equal(result.drainedCount, 1);
    assert.equal(result.writtenCount, 0);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.failedCount, 0);
    assert.equal(getRuntimeUsageAggregateSnapshot().length, 0);
    assert.ok(warnings.some((entry) => entry.message.includes("billing context")));
  } finally {
    restoreDeps();
    __resetRuntimeUsageCollectorForTest();
    __resetRuntimeUsageFlusherForTest();
  }
});

test("runtime usage flusher requeues aggregate when persistence fails", async () => {
  __resetRuntimeUsageCollectorForTest();
  __resetRuntimeUsageFlusherForTest();

  let writeAttempts = 0;
  const restoreDeps = __setRuntimeUsageFlusherDependenciesForTest({
    resolveBillingContextForSite: async () =>
      ({
        billingAccountId: "00000000-0000-4000-8000-000000000011",
        agencyId: "00000000-0000-4000-8000-000000000012",
        clientId: null,
        siteId: "00000000-0000-4000-8000-000000000013",
        costCenterIds: {
          agencyCostCenterId: null,
          clientCostCenterId: null,
          siteCostCenterId: null,
        },
      }) as never,
    logRuntimeUsageEvent: async () => {
      writeAttempts += 1;
      throw new Error("db down");
    },
  });

  try {
    incrementRuntimeUsage("00000000-0000-4000-8000-000000000013", {
      requestCount: 2,
      bandwidthBytes: 200,
      computeMs: 6,
      at: new Date("2026-03-27T10:00:00.000Z"),
    });

    const result = await flushRuntimeUsageNow();
    assert.equal(result.drainedCount, 1);
    assert.equal(result.writtenCount, 0);
    assert.equal(result.skippedCount, 0);
    assert.equal(result.failedCount, 1);
    assert.equal(writeAttempts, 1);

    const requeued = getRuntimeUsageAggregateSnapshot();
    assert.equal(requeued.length, 1);
    assert.equal(requeued[0]?.siteId, "00000000-0000-4000-8000-000000000013");
    assert.equal(requeued[0]?.requestCount, 2);
  } finally {
    restoreDeps();
    __resetRuntimeUsageCollectorForTest();
    __resetRuntimeUsageFlusherForTest();
  }
});
