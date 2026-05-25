import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeProviderExecutionJobPreview } from "@/gnr8/runtime/providers/runtime-provider-execution-job-preview";

function buildHandoff(operationKind: string) {
  return {
    handoffId: "handoff_1",
    artifactId: "artifact_1",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    providerId: "openprovider_sandbox",
    environment: "sandbox",
    capability: "domain_dns",
    operationKind,
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

test("execution job preview: intent-only blocked contract is always enforced", () => {
  const preview = createRuntimeProviderExecutionJobPreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("upsert_dns_record"),
  });
  assert.equal(preview.executionAllowed, false);
  assert.equal(preview.executionBlocked, true);
  assert.equal(preview.intentOnly, true);
  assert.equal(preview.jobs[0]?.simulatedStatus, "preview_only");
  assert.equal(preview.jobs[0]?.queueTarget, "provider-control-plane");
  assert.equal(preview.jobs[0]?.workerTarget, "provider-execution-worker");
  assert.equal(preview.diagnostics.includes("EXECUTION_JOB_PREVIEW_CREATED"), true);
  assert.equal(preview.diagnostics.includes("EXECUTION_JOB_PREVIEW_INTENT_ONLY"), true);
});

test("execution job preview: deterministic jobId from handoffId + jobType + correlationKey", () => {
  const previewA = createRuntimeProviderExecutionJobPreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("upsert_dns_record"),
  });
  const previewB = createRuntimeProviderExecutionJobPreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("upsert_dns_record"),
  });
  assert.equal(previewA.jobs[0]?.jobId, previewB.jobs[0]?.jobId);
});

test("execution job preview: payload shape describes future execution payload only", () => {
  const preview = createRuntimeProviderExecutionJobPreview({
    handoffId: "handoff_1",
    handoffArtifact: buildHandoff("attach_domain"),
  });
  assert.deepEqual(preview.jobs[0]?.payloadShape, {
    providerId: "openprovider_sandbox",
    operationKind: "attach_domain",
    siteId: "site_1",
    siteVersionId: "site_version_1",
    correlationKey: "corr_1",
  });
});

test("execution job preview: missing handoff remains deterministic and non-executable", () => {
  const preview = createRuntimeProviderExecutionJobPreview({
    handoffId: "handoff_missing",
    handoffArtifact: null,
  });
  assert.equal(preview.executionAllowed, false);
  assert.equal(preview.executionBlocked, true);
  assert.equal(preview.intentOnly, true);
  assert.equal(preview.jobs.length, 0);
  assert.equal(preview.summary, "No deterministic execution jobs could be previewed.");
});
