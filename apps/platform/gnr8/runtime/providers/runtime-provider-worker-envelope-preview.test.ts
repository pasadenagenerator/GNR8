import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderWorkerEnvelopePreview } from "@/gnr8/runtime/providers/runtime-provider-worker-envelope-preview";

function buildHandoff() {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "openprovider_sandbox",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind: "upsert_dns_record",
    approvalStatus: "approved",
    riskLevel: "low",
    handoffStatus: "blocked" as const,
    plannedJobIds: [],
    warnings: [],
    blockers: [],
    correlationKey: "corr_1",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
  };
}

test("worker envelope preview: intent-only blocked contract is always enforced", () => {
  const preview = createRuntimeProviderWorkerEnvelopePreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff(),
  });
  assert.equal(preview.executionAllowed, false);
  assert.equal(preview.executionBlocked, true);
  assert.equal(preview.intentOnly, true);
  assert.equal(preview.envelope.queueTarget, "provider-control-plane");
  assert.equal(preview.envelope.workerTarget, "provider-execution-worker");
  assert.equal(preview.envelope.payload.payloadVersion, "v1");
  assert.equal(preview.envelope.payload.executionIntent, "control_plane_simulation_only");
  assert.equal(preview.envelope.payload.executionBlocked, true);
  assert.equal(preview.envelope.payload.executionAllowed, false);
  assert.equal(preview.envelope.diagnostics.includes("PROVIDER_WORKER_ENVELOPE_PREVIEW_CREATED"), true);
  assert.equal(preview.diagnostics.includes("PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY"), true);
});

test("worker envelope preview: deterministic previewId from handoffId + correlationKey", () => {
  const previewA = createRuntimeProviderWorkerEnvelopePreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff(),
  });
  const previewB = createRuntimeProviderWorkerEnvelopePreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff(),
  });
  assert.equal(previewA.previewId, previewB.previewId);
});
