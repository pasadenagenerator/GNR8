import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  runPublishActivationEnforcementShadowObservation,
  type PublishActivationEnforcementShadowGuard,
  type PublishActivationEnforcementShadowMetadata,
  type PublishActivationMetadataResolverShadow,
  type PublishActivationMetadataResolverShadowInput,
} from "@/gnr8/runtime/publish-activation-orchestrator";
import type { PublishActivationEnforcementGuardResult } from "@/gnr8/single-site/publish-activation-enforcement-guard";
import {
  PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
  normalizePublishActivationMetadataHandoff,
} from "@/gnr8/single-site/publish-activation-metadata-handoff";
import {
  PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
  type PublishActivationMetadataResolverResult,
} from "@/gnr8/single-site/publish-activation-metadata-resolver";

const ORCHESTRATOR_SOURCE = new URL("./publish-activation-orchestrator.ts", import.meta.url);

function metadata(overrides: Partial<PublishActivationEnforcementShadowMetadata> = {}): PublishActivationEnforcementShadowMetadata {
  return {
    sourceType: PUBLISH_ACTIVATION_METADATA_HANDOFF_SOURCE_TYPE,
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    migrationId: "migration-test",
    candidateSiteVersionRef: "runtime-site-version:site-version-test",
    runtimeArtifactRef: "runtime-artifact:artifact-test",
    publishTargetRef: "publish-target:publish-target-test",
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationRequestRef: { id: "request-test", ref: "aaf-request:request-test", status: "requested" },
    publishActivationDecisionRef: { id: "decision-test", ref: "aaf-decision:decision-test", status: "granted" },
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
    ...overrides,
  };
}

function resolverIdentity(overrides: Partial<PublishActivationMetadataResolverShadowInput> = {}): PublishActivationMetadataResolverShadowInput {
  return {
    tenantId: "tenant-test",
    clientId: "client-test",
    migrationId: "migration-test",
    publishEnvironment: "production",
    actorRole: "agency_admin",
    correlationId: "corr-resolver",
    idempotencyKey: "idem-resolver",
    ...overrides,
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
      correlationId: "corr-guard",
      idempotencyKey: "idem-guard",
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

function resolverResult(inputMetadata: PublishActivationEnforcementShadowMetadata, complete = true): PublishActivationMetadataResolverResult {
  const normalized = normalizePublishActivationMetadataHandoff(inputMetadata, {
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    publishStage: "production",
  });
  return {
    resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
    publishActivationMetadataHandoff: complete ? normalized.normalized : null,
    diagnostics: {
      status: complete ? "complete" : "incomplete",
      complete,
      blockerCodes: complete ? [] : ["publish_activation_gate_blocked"],
      missingCodes: complete ? [] : ["publish_activation_gate_missing"],
      mismatchCodes: [],
      staleCodes: [],
      warningCodes: [],
      transactionCapturedAt: "2026-08-05T00:00:02.000Z",
      safeIds: {
        siteId: "site-test",
        siteVersionId: "site-version-test",
        runtimeArtifactId: "artifact-test",
        publishTargetId: "publish-target-test",
        publishActivationRequestId: "request-test",
        publishActivationDecisionId: "decision-test",
        gateAttemptId: "gate-attempt-test",
      },
    },
    metadataWatermark: normalized.normalized?.metadataWatermark ?? "resolver-watermark-test",
    flags: PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  };
}

test("flag off does not call resolver or guard", async () => {
  let resolverCalls = 0;
  let guardCalls = 0;
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: false,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async () => {
      resolverCalls += 1;
      return resolverResult(metadata());
    },
    guard: async () => {
      guardCalls += 1;
      return guardResult();
    },
  });
  assert.equal(result, null);
  assert.equal(resolverCalls, 0);
  assert.equal(guardCalls, 0);
});

test("explicit complete metadata bypasses resolver and reaches guard", async () => {
  let resolverCalls = 0;
  const received: Parameters<PublishActivationEnforcementShadowGuard>[0][] = [];
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata(),
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async () => {
      resolverCalls += 1;
      return resolverResult(metadata());
    },
    guard: async (input) => {
      received.push(input);
      return guardResult();
    },
  });
  assert.equal(resolverCalls, 0);
  assert.equal(received.length, 1);
  assert.equal(received[0]?.tenantId, "tenant-test");
  assert.equal(result?.metadataSource, "explicit");
  assert.equal(result?.resolverStatus, "not_needed");
  assert.equal(result?.available, true);
});

test("absent metadata invokes resolver when enough identity exists and resolved metadata reaches guard", async () => {
  const resolverInputs: Parameters<PublishActivationMetadataResolverShadow>[0][] = [];
  const guardInputs: Parameters<PublishActivationEnforcementShadowGuard>[0][] = [];
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async (input) => {
      resolverInputs.push(input);
      return resolverResult(metadata({ correlationId: input.correlationId, idempotencyKey: input.idempotencyKey }));
    },
    guard: async (input) => {
      guardInputs.push(input);
      return guardResult();
    },
  });
  assert.equal(resolverInputs.length, 1);
  assert.equal(resolverInputs[0]?.candidateSiteVersionRef, "runtime-site-version:site-version-test");
  assert.equal(resolverInputs[0]?.runtimeArtifactRef, "runtime-artifact:artifact-test");
  assert.equal(resolverInputs[0]?.actor.actorId, "operator-test");
  assert.equal(guardInputs.length, 1);
  assert.equal(result?.metadataSource, "resolved");
  assert.equal(result?.resolverStatus, "complete");
  assert.equal(result?.publishActionBlocked, false);
});

test("incomplete explicit metadata invokes resolver fallback when enough identity exists", async () => {
  let resolverCalls = 0;
  let guardCalls = 0;
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: metadata({ gateAttemptResultRef: null, handoffWatermark: null, gateInputWatermark: null }),
    metadataResolver: async () => {
      resolverCalls += 1;
      return resolverResult(metadata());
    },
    guard: async () => {
      guardCalls += 1;
      return guardResult();
    },
  });
  assert.equal(resolverCalls, 1);
  assert.equal(guardCalls, 1);
  assert.equal(result?.metadataSource, "resolved");
});

test("resolver incomplete does not call guard and publish shadow continues", async () => {
  let guardCalls = 0;
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async () => resolverResult(metadata(), false),
    guard: async () => {
      guardCalls += 1;
      return guardResult();
    },
  });
  assert.equal(guardCalls, 0);
  assert.equal(result?.available, false);
  assert.equal(result?.resolverStatus, "incomplete");
  assert.equal(result?.publishActionBlocked, false);
  assert.ok(result?.missingMetadataCodes.includes("publish_activation_gate_missing"));
});

test("resolver error does not call guard and publish shadow continues", async () => {
  let guardCalls = 0;
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async () => {
      throw new Error("resolver unavailable");
    },
    guard: async () => {
      guardCalls += 1;
      return guardResult();
    },
  });
  assert.equal(guardCalls, 0);
  assert.equal(result?.metadataSource, "resolver_error");
  assert.equal(result?.resolverStatus, "error");
  assert.equal(result?.publishActionBlocked, false);
});

test("missing identity does not call resolver or guard and publish shadow continues", async () => {
  let resolverCalls = 0;
  let guardCalls = 0;
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity({ migrationId: null }),
    metadataResolver: async () => {
      resolverCalls += 1;
      return resolverResult(metadata());
    },
    guard: async () => {
      guardCalls += 1;
      return guardResult();
    },
  });
  assert.equal(resolverCalls, 0);
  assert.equal(guardCalls, 0);
  assert.equal(result?.metadataSource, "missing");
  assert.equal(result?.resolverStatus, "not_available");
  assert.ok(result?.missingMetadataCodes.includes("publish_activation_metadata_resolver_shadow_migration_id_missing"));
  assert.equal(result?.publishActionBlocked, false);
});

test("guard block after resolved metadata is diagnostic only", async () => {
  const result = await runPublishActivationEnforcementShadowObservation({
    enabled: true,
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    actor: "operator-test",
    publishStage: "production",
    metadata: null,
    metadataResolverInput: resolverIdentity(),
    metadataResolver: async () => resolverResult(metadata()),
    guard: async () =>
      guardResult({
        allowed: false,
        mode: "block",
        reason: "publish activation guard blocked",
        blockerCodes: ["publish_activation_gate_blocked"],
        flags: {
          ...guardResult().flags,
          publishActionBlockedWouldBlockIfWired: true,
          publishActionBlocked: true,
        },
      }),
  });
  assert.equal(result?.metadataSource, "resolved");
  assert.equal(result?.guardMode, "block");
  assert.equal(result?.guardAllowed, false);
  assert.equal(result?.enforcementApplied, false);
  assert.equal(result?.publishActionBlocked, false);
});

test("resolver shadow integration keeps publish boundaries source-clean", () => {
  const source = readFileSync(ORCHESTRATOR_SOURCE, "utf8");
  assert.equal((source.match(/switchActivePointer\(\{/g) ?? []).length, 3);
  assert.doesNotMatch(source, /publish-activation-gate-evaluator|evaluatePublishActivationGateFromHandoff|SingleSitePublishActivationGateEvaluator/);
  assert.doesNotMatch(source, /createApprovalRequest|createApprovalDecision|createActionGateAttempt|insert\s+into\s+public\.gnr8_aaf|update\s+public\.gnr8_aaf|delete\s+from\s+public\.gnr8_aaf/i);
  assert.doesNotMatch(source, /PublishActivationSourceReader|createDdomReadinessSnapshot|manualSnapshot|checkDomainStatus|openprovider|vercel\.|stripe\.|new Stripe|ai_execution/i);
});
