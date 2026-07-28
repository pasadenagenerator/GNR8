import assert from "node:assert/strict";
import test from "node:test";

import {
  runPublishActivationShadowGateObservation,
  type PublishActivationShadowObserver,
} from "@/gnr8/runtime/publish-activation-orchestrator";
import type { PublishActivationShadowResult } from "@/gnr8/aaf/aaf-publish-activation-shadow-observer";

function shadowResult(): PublishActivationShadowResult {
  return {
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    sourceReadStatus: { status: "completed", limitations: [], warnings: [] },
    evidenceBuildStatus: { status: "built", evidencePackageId: "evidence-test", missingSourceTruth: [], staleSourceTruth: [] },
    gateDryRunStatus: {
      status: "evaluated",
      gateResult: "approval_required",
      gateAttemptId: "gate-attempt-test",
      auditEventId: "audit-event-test",
      blockedReasons: ["approval_missing"],
      staleEvidenceReasons: [],
    },
    readinessResult: "not_ready",
    missingSourceTruth: [],
    staleSourceTruth: [],
    ddomReadinessSnapshotStatus: { status: "present", snapshotRef: "ddom-test", blockers: [], warnings: [] },
    approvalStatusSummary: { launchSignoff: "not_required", publishActivation: "missing" },
    publishTargetStatusSummary: { status: "present", sourceRecordId: "production", policyVersion: "ptt-1" },
    domainReadinessImplication: "domain_readiness_shadow_observed_without_publish_authorization",
    evidenceRefs: { evidencePackageId: "evidence-test", gateAttemptId: "gate-attempt-test", auditEventId: "audit-event-test" },
    sourceRefs: {},
    watermarks: {},
    limitations: ["publish_action_not_blocked_by_shadow_gate"],
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    shadowEvaluationId: "shadow-test",
    failureReason: null,
  };
}

test("disabled shadow flag preserves original publish behavior by not calling observer", async () => {
  let calls = 0;
  const observer: PublishActivationShadowObserver = async () => {
    calls += 1;
    return shadowResult();
  };
  const result = await runPublishActivationShadowGateObservation({
    enabled: false,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    scope: { tenantId: "tenant-test", clientId: "client-test" },
    observer,
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("enabled shadow flag observes but does not change publish outcome", async () => {
  let calls = 0;
  const observer: PublishActivationShadowObserver = async () => {
    calls += 1;
    return shadowResult();
  };
  const result = await runPublishActivationShadowGateObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    scope: { tenantId: "tenant-test", clientId: "client-test" },
    observer,
  });
  assert.equal(calls, 1);
  assert.equal(result?.shadowOnly, true);
  assert.equal(result?.publishActionBlocked, false);
});

test("enabled shadow observer failure fails open", async () => {
  const result = await runPublishActivationShadowGateObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    scope: { tenantId: "tenant-test", clientId: "client-test" },
    async observer() {
      throw new Error("synthetic shadow observer failure");
    },
  });
  assert.equal(result, null);
});
