import assert from "node:assert/strict";
import test from "node:test";

import {
  __resetRuntimeUsageCollectorForTest,
  drainRuntimeUsageAggregates,
  getRuntimeUsageAggregateSnapshot,
  incrementRuntimeUsage,
  requeueRuntimeUsageAggregates,
} from "@/gnr8/runtime/runtime-usage-collector";

test("runtime usage collector aggregates per site and drains snapshot", () => {
  __resetRuntimeUsageCollectorForTest();

  incrementRuntimeUsage("site-1", {
    artifactId: "artifact-a",
    requestCount: 1,
    bandwidthBytes: 120,
    computeMs: 9,
    at: new Date("2026-03-27T10:00:00.000Z"),
  });
  incrementRuntimeUsage("site-1", {
    artifactId: "artifact-a",
    requestCount: 2,
    bandwidthBytes: 300,
    computeMs: 15,
    at: new Date("2026-03-27T10:00:20.000Z"),
  });

  const snapshot = getRuntimeUsageAggregateSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0]?.siteId, "site-1");
  assert.equal(snapshot[0]?.artifactId, "artifact-a");
  assert.equal(snapshot[0]?.requestCount, 3);
  assert.equal(snapshot[0]?.bandwidthBytes, 420);
  assert.equal(snapshot[0]?.computeMs, 24);
  assert.equal(snapshot[0]?.periodStart, "2026-03-27T10:00:00.000Z");
  assert.equal(snapshot[0]?.periodEnd, "2026-03-27T10:00:20.000Z");

  const drained = drainRuntimeUsageAggregates();
  assert.equal(drained.length, 1);
  assert.equal(getRuntimeUsageAggregateSnapshot().length, 0);
});

test("runtime usage collector nulls artifact id when multiple artifacts are mixed for same site", () => {
  __resetRuntimeUsageCollectorForTest();

  incrementRuntimeUsage("site-2", {
    artifactId: "artifact-a",
    requestCount: 1,
    at: new Date("2026-03-27T10:00:00.000Z"),
  });
  incrementRuntimeUsage("site-2", {
    artifactId: "artifact-b",
    requestCount: 1,
    at: new Date("2026-03-27T10:00:01.000Z"),
  });

  const snapshot = getRuntimeUsageAggregateSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0]?.artifactId, null);
});

test("runtime usage collector can requeue drained aggregates for retry", () => {
  __resetRuntimeUsageCollectorForTest();
  incrementRuntimeUsage("site-3", {
    artifactId: "artifact-a",
    requestCount: 2,
    bandwidthBytes: 50,
    computeMs: 7,
    at: new Date("2026-03-27T10:00:00.000Z"),
  });

  const drained = drainRuntimeUsageAggregates();
  assert.equal(getRuntimeUsageAggregateSnapshot().length, 0);

  requeueRuntimeUsageAggregates(drained);

  const snapshot = getRuntimeUsageAggregateSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0]?.siteId, "site-3");
  assert.equal(snapshot[0]?.requestCount, 2);
  assert.equal(snapshot[0]?.bandwidthBytes, 50);
  assert.equal(snapshot[0]?.computeMs, 7);
});
