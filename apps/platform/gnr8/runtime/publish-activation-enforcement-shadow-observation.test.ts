import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isPublishActivationEnforcementGateShadowEnabled,
  runPublishActivationEnforcementShadowObservation,
  type PublishActivationEnforcementShadowGuard,
  type PublishActivationEnforcementShadowMetadata,
} from "@/gnr8/runtime/publish-activation-orchestrator";
import type { PublishActivationEnforcementGuardResult } from "@/gnr8/single-site/publish-activation-enforcement-guard";

const ORCHESTRATOR_SOURCE = new URL("./publish-activation-orchestrator.ts", import.meta.url);

function metadata(): PublishActivationEnforcementShadowMetadata {
  return {
    tenantId: "tenant-test",
    clientId: "client-test",
    migrationId: "migration-test",
    publishTargetRef: {
      role: "publish_target",
      sourceSystem: "gnr8_publish_target_truth",
      sourceTable: "gnr8_publish_targets",
      sourceRecordId: "publish-target-test",
      sourceRef: "publish-target:publish-target-test",
    },
    publishEnvironment: "production",
    publishActivationDecisionRef: {
      id: "decision-test",
      ref: "aaf-decision:decision-test",
      status: "granted",
    },
    gateAttemptResultRef: {
      gateAttemptId: "gate-attempt-test",
      gateResult: "allowed",
      evaluationStatus: "allowed",
      approvalDecisionId: "decision-test",
      publishTargetRef: "publish-target:publish-target-test",
      semanticHandoffWatermark: "handoff-watermark-test",
      semanticGateInputWatermark: "gate-input-watermark-test",
      createdAt: "2026-08-05T00:00:00.000Z",
      completedAt: "2026-08-05T00:00:01.000Z",
    },
    handoffWatermark: "handoff-watermark-test",
    gateInputWatermark: "gate-input-watermark-test",
    actorRole: "agency_admin",
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
  };
}

function guardResult(overrides: Partial<PublishActivationEnforcementGuardResult> = {}): PublishActivationEnforcementGuardResult {
  return {
    allowed: true,
    mode: "pass",
    reason: "publish activation persisted gate result matched guard policy",
    blockerCodes: [],
    warnings: ["read_only_guard_evaluated"],
    limitations: [],
    bypassUsed: false,
    matchedRefs: {
      tenantId: "tenant-test",
      clientId: "client-test",
      siteId: "site-test",
      migrationId: "migration-test",
      candidateSiteVersionId: "site-version-test",
      runtimeArtifactId: "artifact-test",
      publishTargetId: "publish-target-test",
      publishStage: "production",
      publishEnvironment: "production",
      publishActivationDecisionId: "decision-test",
      gateAttemptId: "gate-attempt-test",
    },
    freshnessSummary: {
      evaluatedAt: "2026-08-05T00:00:02.000Z",
      gateCompletedAt: "2026-08-05T00:00:01.000Z",
      gateCreatedAt: "2026-08-05T00:00:00.000Z",
      maxGateAgeMs: 86400000,
      ageMs: 1000,
      fresh: true,
    },
    semanticGuardInputWatermark: "guard-watermark-test",
    sourceRefs: {},
    diagnosticRefs: {
      correlationId: "corr-test",
      idempotencyKey: "idem-test",
      gateAttemptId: "gate-attempt-test",
      approvalDecisionId: "decision-test",
    },
    flags: {
      readOnly: true,
      enforcementEvaluated: true,
      enforcementApplied: false,
      publishes: false,
      runtimeMutation: false,
      providerCalls: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      pasrInvoked: false,
      publishActionBlockedWouldBlockIfWired: false,
      publishActionBlocked: false,
      bypassUsed: false,
    },
    ...overrides,
  };
}

test("flag off preserves publish behavior by not calling the MVP-46 guard", async () => {
  let calls = 0;
  const guard: PublishActivationEnforcementShadowGuard = async () => {
    calls += 1;
    return guardResult();
  };
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: false,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata(),
    guard,
  });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("flag on with guard pass remains shadow-only and non-blocking", async () => {
  const received: Parameters<PublishActivationEnforcementShadowGuard>[0][] = [];
  const guard: PublishActivationEnforcementShadowGuard = async (input) => {
    received.push(input);
    return guardResult();
  };
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata(),
    guard,
  });
  assert.equal(received[0]?.tenantId, "tenant-test");
  assert.equal(received[0]?.siteId, "site-test");
  assert.equal(received[0]?.publishStage, "production");
  assert.equal(received[0]?.actor.actorId, "operator-test");
  assert.equal(result?.available, true);
  assert.equal(result?.guardMode, "pass");
  assert.equal(result?.guardAllowed, true);
  assert.equal(result?.shadowOnly, true);
  assert.equal(result?.enforcementApplied, false);
  assert.equal(result?.publishActionBlocked, false);
});

test("flag on with guard block remains diagnostics only", async () => {
  const guard: PublishActivationEnforcementShadowGuard = async () =>
    guardResult({
      allowed: false,
      mode: "block",
      reason: "publish activation guard blocked",
      blockerCodes: ["publish_activation_gate_blocked"],
      warnings: ["would_block_if_wired"],
      flags: {
        ...guardResult().flags,
        publishActionBlockedWouldBlockIfWired: true,
        publishActionBlocked: true,
      },
    });
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata(),
    guard,
  });
  assert.equal(result?.available, true);
  assert.equal(result?.guardMode, "block");
  assert.equal(result?.guardAllowed, false);
  assert.deepEqual(result?.blockerCodes, ["publish_activation_gate_blocked"]);
  assert.equal(result?.enforcementApplied, false);
  assert.equal(result?.publishActionBlocked, false);
});

test("flag on with guard error fails open and preserves publish behavior", async () => {
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata(),
    async guard() {
      throw new Error("synthetic guard failure");
    },
  });
  assert.equal(result?.available, false);
  assert.equal(result?.guardMode, "error");
  assert.equal(result?.guardReason, "publish activation enforcement shadow guard error");
  assert.deepEqual(result?.blockerCodes, ["publish_activation_enforcement_shadow_guard_error"]);
  assert.equal(result?.publishActionBlocked, false);
});

test("missing MVP-43/MVP-44 metadata reports shadow unavailable and does not call guard", async () => {
  let calls = 0;
  const guard: PublishActivationEnforcementShadowGuard = async () => {
    calls += 1;
    return guardResult();
  };
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: {
      tenantId: "tenant-test",
    },
    guard,
  });
  assert.equal(calls, 0);
  assert.equal(result?.available, false);
  assert.match(result?.blockerCodes.join(","), /publish_activation_enforcement_shadow_client_id_missing/);
  assert.equal(result?.publishActionBlocked, false);
});

test("feature flag accepts only documented enabled values", () => {
  const previous = process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW;
  try {
    for (const value of ["1", "true", "enabled", "on", "shadow"]) {
      process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW = value;
      assert.equal(isPublishActivationEnforcementGateShadowEnabled(), true);
    }
    process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW = "disabled";
    assert.equal(isPublishActivationEnforcementGateShadowEnabled(), false);
    delete process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW;
    assert.equal(isPublishActivationEnforcementGateShadowEnabled(), false);
  } finally {
    if (previous === undefined) delete process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW;
    else process.env.GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW = previous;
  }
});

test("orchestrator source keeps MVP-47 before active pointer mutation without forbidden side effects", () => {
  const source = readFileSync(ORCHESTRATOR_SOURCE, "utf8");
  assert.equal((source.match(/switchActivePointer\(\{/g) ?? []).length, 3);
  assert.match(
    source,
    /runPublishActivationEnforcementShadowObservation\(\{[\s\S]*?runtimeArtifactId: siteVersion\.artifactId,[\s\S]*?\}\);[\s\S]*?switchActivePointer\(\{[\s\S]*?siteId: siteVersion\.siteId,[\s\S]*?siteVersionId: siteVersion\.id,[\s\S]*?artifactId: siteVersion\.artifactId,[\s\S]*?dbClient: input\.dbClient,/,
  );
  assert.match(
    source,
    /runPublishActivationEnforcementShadowObservation\(\{[\s\S]*?runtimeArtifactId: artifact\.artifactId,[\s\S]*?\}\);[\s\S]*?switchActivePointer\(\{[\s\S]*?siteId: siteVersion\.siteId,[\s\S]*?siteVersionId: siteVersion\.id,[\s\S]*?artifactId: artifact\.artifactId,[\s\S]*?dbClient: input\.dbClient,/,
  );
  assert.doesNotMatch(source, /publish-activation-gate-evaluator|evaluatePublishActivationGateFromHandoff|SingleSitePublishActivationGateEvaluator/);
  assert.doesNotMatch(source, /createApprovalRequest|createApprovalDecision|createActionGateAttempt|createDdom|manualSnapshot|checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution/i);
});
