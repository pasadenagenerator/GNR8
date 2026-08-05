import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
  normalizePublishActivationMetadataHandoff,
  type PublishActivationMetadataHandoff,
} from "./publish-activation-metadata-handoff";

const HANDOFF_SOURCE = new URL("./publish-activation-metadata-handoff.ts", import.meta.url);

function completeHandoff(overrides: Partial<PublishActivationMetadataHandoff> = {}): PublishActivationMetadataHandoff {
  return {
    sourceType: PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    migrationId: "migration-test",
    candidateSiteVersionRef: {
      role: "candidate_site_version",
      sourceSystem: "gnr8_runtime",
      sourceTable: "gnr8_runtime_site_versions",
      sourceRecordId: "site-version-test",
      sourceRef: "runtime-site-version:site-version-test",
      sourceWatermark: "candidate-watermark-test",
    },
    runtimeArtifactRef: {
      role: "runtime_artifact",
      sourceSystem: "gnr8_runtime",
      sourceTable: "gnr8_runtime_artifacts",
      sourceRecordId: "artifact-test",
      sourceRef: "runtime-artifact:artifact-test",
      sourceWatermark: "artifact-watermark-test",
    },
    publishTargetRef: {
      role: "publish_target",
      sourceSystem: "gnr8_publish_target_truth",
      sourceTable: "gnr8_publish_targets",
      sourceRecordId: "publish-target-test",
      sourceRef: "publish-target:publish-target-test",
      sourceWatermark: "target-watermark-test",
    },
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationRequestRef: {
      id: "request-test",
      ref: "aaf-request:request-test",
      status: "requested",
    },
    publishActivationDecisionRef: {
      id: "decision-test",
      ref: "aaf-decision:decision-test",
      status: "granted",
    },
    gateAttemptResultRef: {
      gateAttemptId: "gate-attempt-test",
      gateResult: "allowed",
      evaluationStatus: "allowed",
      approvalRequestId: "request-test",
      approvalDecisionId: "decision-test",
      publishTargetRef: "publish-target:publish-target-test",
      semanticHandoffWatermark: "handoff-watermark-test",
      semanticGateInputWatermark: "gate-input-watermark-test",
      createdAt: "2026-08-05T00:00:00.000Z",
      completedAt: "2026-08-05T00:00:01.000Z",
    },
    handoffWatermark: "handoff-watermark-test",
    gateInputWatermark: "gate-input-watermark-test",
    limitations: ["limitation-test"],
    ...overrides,
  };
}

test("complete single-site metadata handoff normalizes refs and derives deterministic optional ids", () => {
  const result = normalizePublishActivationMetadataHandoff(completeHandoff(), {
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    publishStage: "production",
  });

  assert.equal(result.diagnostics.complete, true);
  assert.equal(result.normalized?.candidateSiteVersionRef?.sourceRecordId, "site-version-test");
  assert.equal(result.normalized?.runtimeArtifactRef?.sourceRecordId, "artifact-test");
  assert.equal(result.normalized?.publishTargetRef?.sourceRecordId, "publish-target-test");
  assert.equal(result.normalized?.publishActivationRequestRef.id, "request-test");
  assert.equal(result.normalized?.publishActivationDecisionRef.id, "decision-test");
  assert.equal(Array.isArray(result.normalized?.gateAttemptResultRef?.limitations), true);
  assert.equal((result.normalized?.gateAttemptResultRef?.limitations as readonly unknown[])[0], "limitation-test");
  assert.match(result.normalized?.metadataWatermark ?? "", /^single-site-publish-activation-metadata-handoff:[0-9a-f]{64}$/);
  assert.match(result.normalized?.correlationId ?? "", /^mvp48-correlation:[0-9a-f]{64}$/);
  assert.match(result.normalized?.idempotencyKey ?? "", /^mvp48-idempotency:[0-9a-f]{64}$/);
});

test("normalization is deterministic for semantically equivalent trimmed input", () => {
  const first = normalizePublishActivationMetadataHandoff(completeHandoff({ tenantId: " tenant-test " })).normalized;
  const second = normalizePublishActivationMetadataHandoff(completeHandoff({ tenantId: "tenant-test" })).normalized;

  assert.equal(first?.metadataWatermark, second?.metadataWatermark);
  assert.equal(first?.correlationId, second?.correlationId);
  assert.equal(first?.idempotencyKey, second?.idempotencyKey);
});

test("missing required handoff fields returns incomplete diagnostics without throwing", () => {
  const result = normalizePublishActivationMetadataHandoff({
    sourceType: PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
    tenantId: "tenant-test",
  });

  assert.equal(result.diagnostics.status, "incomplete");
  assert.equal(result.diagnostics.complete, false);
  assert.match(result.diagnostics.missingCodes.join(","), /publish_activation_metadata_handoff_client_id_missing/);
  assert.match(result.diagnostics.missingCodes.join(","), /publish_activation_metadata_handoff_gate_attempt_result_ref_missing/);
});

test("intent mismatches make the handoff incomplete for this publish activation", () => {
  const result = normalizePublishActivationMetadataHandoff(completeHandoff(), {
    siteId: "site-test",
    siteVersionId: "different-version",
    runtimeArtifactId: "artifact-test",
    publishStage: "production",
  });

  assert.equal(result.diagnostics.complete, false);
  assert.deepEqual(result.diagnostics.mismatchCodes, ["publish_activation_metadata_handoff_candidate_site_version_ref_mismatch"]);
});

test("metadata helper remains read-only and side-effect free by source audit", () => {
  const source = readFileSync(HANDOFF_SOURCE, "utf8");
  assert.doesNotMatch(source, /from "\.\.\/aaf\/aaf-policy-gate-facade"|publish-activation-gate-evaluator|evaluatePublishActivationGateFromHandoff/);
  assert.doesNotMatch(source, /createApprovalRequest|createApprovalDecision|createActionGateAttempt|insert\s+into|update\s+public|delete\s+from/i);
  assert.doesNotMatch(source, /PASR|pasr.*observer|createDdom|manualSnapshot|checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution/i);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact/);
});
