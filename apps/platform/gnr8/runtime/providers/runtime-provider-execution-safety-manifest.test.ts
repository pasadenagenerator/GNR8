import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderExecutionSafetyManifest } from "@/gnr8/runtime/providers/runtime-provider-execution-safety-manifest";

test("provider execution safety manifest: execution is always impossible with active barriers", () => {
  const manifest = createRuntimeProviderExecutionSafetyManifest({
    handoffId: "handoff_1",
    correlationKey: "corr_1",
  });

  assert.equal(manifest.executionAllowed, false);
  assert.equal(manifest.executionBlocked, true);
  assert.equal(manifest.overallStatus, "execution_impossible");
  assert.equal(manifest.barriers.length, 6);
  assert.deepEqual(
    manifest.barriers.map((barrier) => barrier.barrierId),
    [
      "governance_boundary_active",
      "worker_dispatch_disabled",
      "queue_allocation_disabled",
      "provider_execution_disabled",
      "secret_resolution_disabled",
      "runtime_execution_boundary_active",
    ],
  );
  assert.equal(manifest.diagnostics.includes("EXECUTION_SAFETY_MANIFEST_CREATED"), true);
  assert.equal(manifest.diagnostics.includes("EXECUTION_SAFETY_BOUNDARY_PROVEN"), true);
});

test("provider execution safety manifest: deterministic manifestId for same input", () => {
  const a = createRuntimeProviderExecutionSafetyManifest({ handoffId: "handoff_1", correlationKey: "corr_1" });
  const b = createRuntimeProviderExecutionSafetyManifest({ handoffId: "handoff_1", correlationKey: "corr_1" });
  assert.equal(a.manifestId, b.manifestId);
});
