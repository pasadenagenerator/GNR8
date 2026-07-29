import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePublishShadowResultAccess,
  redactPublishShadowResultForActor,
  type PublishShadowRedactionContext,
} from "./aaf-publish-shadow-result-redaction";
import type { PublishShadowResultReadModel } from "./aaf-publish-shadow-result-read-model";

const sensitiveValues = [
  "tenant-test",
  "client-test",
  "site-test",
  "site-version-test",
  "artifact-test",
  "publish-attempt-test",
  "ddom-snapshot-id-test",
  "gnr8:gnr8_ddom_readiness_snapshots:ddom-snapshot-id-test",
  "publish-target-test",
  "evidence-package-test",
  "gate-attempt-test",
  "audit-event-test",
  "approval-request-test",
  "approval-decision-test",
  "operator-sensitive-test",
  "corr-sensitive-test",
  "causation-sensitive-test",
  "request-sensitive-test",
  "idem-sensitive-test",
  "shadow-eval-sensitive-test",
  "evidence-idem-sensitive-test",
  "gate-idem-sensitive-test",
  "watermark-sensitive-test",
  "source-record-sensitive-test",
  "source-ref-sensitive-test",
  "raw_provider_failure_sensitive_test",
];

function model(overrides: Partial<PublishShadowResultReadModel> = {}): PublishShadowResultReadModel {
  return {
    derivedOnly: true,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    createsDdomSnapshot: false,
    createsApproval: false,
    mutatesSourceTruth: false,
    readModelVersion: "pasr-4-publish-shadow-result-read-model:v1",
    generatedAt: "2026-07-28T08:10:00.000Z",
    projectionFreshness: "partial",
    projectionLimitations: [
      {
        code: "raw_provider_failure_sensitive_test",
        severity: "high",
        source: "repository",
        detail: "raw_provider_failure_sensitive_test",
      },
    ],
    roleVisibility: "technical_operator",
    shadowStatus: "shadow_missing_ddom_snapshot",
    severity: "high",
    operatorLabel: "Shadow readiness: shadow_missing_ddom_snapshot. Publish was not blocked; result is derived only.",
    recommendedNextAction: {
      actionKey: "run_ddom_manual_trigger_outside_pasr",
      ownerRole: "technical_operator",
      reason: "raw_provider_failure_sensitive_test",
      safeNow: true,
      blocksCurrentPublish: false,
      blocksFutureEnforcementReadiness: true,
      requiredRefs: ["evidence-package-test", "gnr8:gnr8_ddom_readiness_snapshots:ddom-snapshot-id-test", "source-ref-sensitive-test"],
    },
    emptyState: { isEmpty: false, reason: "not_empty" },
    errorState: {
      hasError: true,
      errorCode: "raw_provider_failure_sensitive_test",
      safeMessage: "Shadow evaluation could not be reconstructed completely from persisted records.",
    },
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    publishAttemptRef: "publish-attempt-test",
    intendedPublishTarget: "publish-target-test",
    intendedPublishStage: "production",
    trustedPublishEnvironment: "production",
    actorType: "human",
    actorId: "operator-sensitive-test",
    actorRole: "agency_admin",
    shadowEnabledState: "enabled",
    sourceReadStatus: {
      status: "completed",
      warnings: ["source-reader-warning-sensitive-test"],
      limitations: ["raw_provider_failure_sensitive_test"],
    },
    evidenceBuildStatus: {
      status: "built",
      evidencePackageId: "evidence-package-test",
      missingSourceTruth: ["domainReadiness"],
      staleSourceTruth: ["runtimeArtifact"],
    },
    gateDryRunStatus: {
      dryRunOnly: true,
      actionKey: "publish.activation",
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: "site-version-test",
      status: "evaluated",
      gateResult: "blocked",
      policyResult: "approval_blocked",
      approvalDecisionId: "approval-decision-test",
      gateAttemptId: "gate-attempt-test",
      auditEventId: "audit-event-test",
      gateDryRunIdempotencyKey: "gate-idem-sensitive-test",
      blockedReasons: ["domain_readiness_blocked", "raw_provider_failure_sensitive_test"],
      staleEvidenceReasons: ["watermark-sensitive-test"],
      missingSourceWatermarks: ["watermark-sensitive-test"],
      warnings: ["dry_run_only_no_publish_execution"],
    },
    readinessResult: "not_ready",
    missingSourceTruth: ["domainReadiness"],
    staleSourceTruth: ["runtimeArtifact"],
    sourceTruth: [
      {
        sourceKey: "domainReadiness",
        sourceSystem: "gnr8",
        sourceTable: "gnr8_ddom_readiness_snapshots",
        sourceRecordId: "source-record-sensitive-test",
        sourceRef: "source-ref-sensitive-test",
        sourceVersion: "v1",
        currentWatermark: "watermark-sensitive-test",
        evidenceWatermark: "watermark-sensitive-test",
        freshness: "stale",
        staleReason: "raw_provider_failure_sensitive_test",
        limitations: ["raw_provider_failure_sensitive_test"],
      },
    ],
    sourceWatermarks: {
      domainReadiness: "watermark-sensitive-test",
    },
    sourceTruthSummary: {
      missingCount: 1,
      staleCount: 1,
      availableCount: 1,
    },
    ddomReadiness: {
      status: "missing",
      snapshotId: "ddom-snapshot-id-test",
      snapshotRef: "gnr8:gnr8_ddom_readiness_snapshots:ddom-snapshot-id-test",
      readinessState: "blocked",
      freshnessState: "stale",
      capturedAt: "2026-07-28T08:00:00.000Z",
      freshUntil: "2026-07-29T08:00:00.000Z",
      staleReason: "raw_provider_failure_sensitive_test",
      blockers: ["domain_readiness_blocked", "raw_provider_failure_sensitive_test"],
      warnings: ["run_manual_ddom_readiness_snapshot_trigger_outside_pasr"],
      createsSnapshot: false,
    },
    publishTarget: {
      status: "present",
      publishTargetId: "publish-target-test",
      environment: "production",
      publishStage: "production",
      policyVersion: "policy-sensitive-test",
      sourceRef: "source-ref-sensitive-test",
      sourceWatermark: "watermark-sensitive-test",
      limitations: ["raw_provider_failure_sensitive_test"],
    },
    approval: {
      launchSignoff: "not_required",
      publishActivation: "missing",
      approvalRequestId: "approval-request-test",
      approvalDecisionId: "approval-decision-test",
      decisionStatus: "granted",
      scope: "publish_activation",
      expiresAt: "2026-07-29T08:00:00.000Z",
      createsApproval: false,
      limitations: ["missing_publish_activation_approval"],
    },
    evidence: {
      evidencePackageId: "evidence-package-test",
      packageStatus: "created",
      packageType: "publish_activation_evidence",
      evidenceCreatedAt: "2026-07-28T08:00:00.000Z",
      freshnessLabel: "partial",
      sourceWatermark: "watermark-sensitive-test",
      evidenceIdempotencyKey: "evidence-idem-sensitive-test",
      limitations: ["raw_provider_failure_sensitive_test"],
      sourceRefs: [],
    },
    evidenceRefs: {
      evidencePackageId: "evidence-package-test",
      gateAttemptId: "gate-attempt-test",
      auditEventId: "audit-event-test",
      approvalRequestId: "approval-request-test",
      approvalDecisionId: "approval-decision-test",
      ddomSnapshotRef: "gnr8:gnr8_ddom_readiness_snapshots:ddom-snapshot-id-test",
      publishTargetRef: "source-ref-sensitive-test",
    },
    correlation: {
      correlationId: "corr-sensitive-test",
      causationId: "causation-sensitive-test",
      requestId: "request-sensitive-test",
      idempotencyKey: "idem-sensitive-test",
      shadowEvaluationId: "shadow-eval-sensitive-test",
      evidenceIdempotencyKey: "evidence-idem-sensitive-test",
      gateDryRunIdempotencyKey: "gate-idem-sensitive-test",
      publishAttemptRef: "publish-attempt-test",
      linkageStrategy: "correlation_idempotency_fallback",
    },
    failureReason: "raw_provider_failure_sensitive_test",
    warnings: ["raw_provider_failure_sensitive_test"],
    limitations: ["raw_provider_failure_sensitive_test"],
    ...overrides,
  };
}

function context(role: string, overrides: Partial<PublishShadowRedactionContext> = {}): PublishShadowRedactionContext {
  return {
    actor: {
      actorId: "viewer-test",
      role,
      tenantIds: ["tenant-test"],
      clientIds: ["client-test"],
      siteIds: ["site-test"],
      siteVersionIds: ["site-version-test"],
      supportDebugAuthorized: role === "support_debug_operator",
    },
    surface: "command_center",
    ...overrides,
  };
}

function assertBoundaryFlags(result: ReturnType<typeof redactPublishShadowResultForActor>) {
  assert.equal(result.derivedOnly, true);
  assert.equal(result.shadowOnly, true);
  assert.equal(result.enforcementApplied, false);
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.createsDdomSnapshot, false);
  assert.equal(result.createsApproval, false);
  assert.equal(result.mutatesSourceTruth, false);
  assert.equal(result.recommendedNextAction.blocksCurrentPublish, false);
}

function assertNoSensitiveLeak(result: unknown, allowed: readonly string[] = []) {
  const serialized = JSON.stringify(result);
  for (const value of sensitiveValues) {
    if (!allowed.includes(value)) assert.equal(serialized.includes(value), false, `leaked ${value}`);
  }
}

test("platform superadmin receives full internal debug visibility", () => {
  const result = redactPublishShadowResultForActor(model(), context("platform_superadmin", { surface: "internal_debug" }));
  assert.equal(result.access.allowed, true);
  assert.equal(result.visibility, "full");
  assert.equal(result.subject.siteId.value, "site-test");
  assert.equal(result.ddomReadiness.snapshot.ref, "gnr8:gnr8_ddom_readiness_snapshots:ddom-snapshot-id-test");
  assert.equal(result.evidence.evidencePackage.ref, "evidence-package-test");
  assert.equal(result.correlation.idempotencyKey.value, "idem-sensitive-test");
  assert.equal(result.approval.actor.value?.actorId, "operator-sensitive-test");
  assert.equal(result.recommendedNextAction.actionKey, "run_ddom_manual_trigger_outside_pasr");
  assertBoundaryFlags(result);
});

test("agency admin scoped visibility summarizes and redacts diagnostics", () => {
  const result = redactPublishShadowResultForActor(model(), context("agency_admin"));
  assert.equal(result.access.allowed, true);
  assert.equal(result.status.shadowStatus.value, "shadow_missing_ddom_snapshot");
  assert.equal(result.subject.siteId.visibility, "summarized");
  assert.equal(result.ddomReadiness.snapshot.visibility, "redacted");
  assert.equal(result.evidence.evidencePackage.visibility, "redacted");
  assert.equal(result.correlation.correlationId.visibility, "redacted");
  assert.equal(result.diagnostics.failureReason.visibility, "redacted");
  assertNoSensitiveLeak(result);
});

test("agency operator receives scoped summary without raw evidence or audit refs", () => {
  const result = redactPublishShadowResultForActor(model(), context("agency_operator"));
  assert.equal(result.access.allowed, true);
  assert.equal(result.evidence.evidencePackage.visibility, "hidden");
  assert.equal(result.gateDryRunStatus.auditEvent.visibility, "hidden");
  assert.equal(result.recommendedNextAction.actionKey, "technical_follow_up_required");
  assertNoSensitiveLeak(result);
});

test("technical operator receives scoped diagnostic visibility", () => {
  const result = redactPublishShadowResultForActor(model(), context("technical_operator", { surface: "internal_debug" }));
  assert.equal(result.access.allowed, true);
  assert.equal(result.ddomReadiness.blockers.value?.includes("domain_readiness_blocked"), true);
  assert.equal(result.gateDryRunStatus.blockedReasons.value?.includes("raw_provider_failure_sensitive_test"), true);
  assert.equal(result.diagnostics.failureReason.value, "raw_provider_failure_sensitive_test");
  assert.equal(result.correlation.correlationId.value, "corr-sensitive-test");
  assert.equal(result.correlation.idempotencyKey.visibility, "redacted");
});

test("account manager receives client-safe internal summary only", () => {
  const result = redactPublishShadowResultForActor(model(), context("account_manager"));
  assert.equal(result.access.allowed, true);
  assert.equal(result.visibility, "summarized");
  assert.equal(result.status.shadowStatus.visibility, "summarized");
  assert.equal(result.publishTarget.visibility, "hidden");
  assert.equal(result.approval.actor.visibility, "hidden");
  assert.equal(result.evidence.evidencePackage.visibility, "hidden");
  assertNoSensitiveLeak(result);
});

test("client reviewer is denied and hidden in MVP", () => {
  const result = redactPublishShadowResultForActor(model(), context("client_reviewer", { surface: "client_portal" }));
  assert.equal(result.access.allowed, false);
  assert.equal(result.access.denialReason, "client_reviewer_forbidden_mvp");
  assert.equal(result.visibility, "forbidden");
  assertNoSensitiveLeak(result);
  assertBoundaryFlags(result);
});

test("read-only auditor sees audit-export refs without raw idempotency or actor detail", () => {
  const result = redactPublishShadowResultForActor(model(), context("read_only_auditor", { surface: "audit_export" }));
  assert.equal(result.access.allowed, true);
  assert.equal(result.evidence.evidencePackage.ref, "evidence-package-test");
  assert.equal(result.gateDryRunStatus.auditEvent.ref, "audit-event-test");
  assert.equal(result.approval.approvalDecision.ref, "approval-decision-test");
  assert.equal(result.approval.actor.visibility, "redacted");
  assert.equal(result.correlation.correlationId.value, "corr-sensitive-test");
  assert.equal(result.correlation.idempotencyKey.visibility, "redacted");
});

test("support debug operator requires explicit scoped support authorization", () => {
  const denied = redactPublishShadowResultForActor(
    model(),
    context("support_debug_operator", {
      surface: "internal_debug",
      actor: {
        actorId: "viewer-test",
        role: "support_debug_operator",
        tenantIds: ["tenant-test"],
        clientIds: ["client-test"],
        siteIds: ["site-test"],
        supportDebugAuthorized: false,
      },
    }),
  );
  assert.equal(denied.access.allowed, false);
  assert.equal(denied.access.denialReason, "support_debug_scope_required");
  assertNoSensitiveLeak(denied);

  const allowed = redactPublishShadowResultForActor(model(), context("support_debug_operator", { surface: "internal_debug" }));
  assert.equal(allowed.access.allowed, true);
  assert.equal(allowed.diagnostics.failureReason.value, "raw_provider_failure_sensitive_test");
  assert.equal(allowed.correlation.idempotencyKey.value, "idem-sensitive-test");
});

test("AI operator receives summarized advisory output with no raw ids", () => {
  const result = redactPublishShadowResultForActor(model(), context("ai_operator", { surface: "ai_advisory" }));
  assert.equal(result.access.allowed, true);
  assert.equal(result.visibility, "summarized");
  assert.equal(result.subject.siteId.visibility, "redacted");
  assert.equal(result.evidence.evidencePackage.visibility, "redacted");
  assert.equal(result.correlation.correlationId.visibility, "redacted");
  assert.equal(result.correlation.idempotencyKey.visibility, "hidden");
  assert.equal(result.recommendedNextAction.actionKey, "technical_follow_up_required");
  assertNoSensitiveLeak(result);
});

test("unsupported role, unsupported surface, and missing actor fail closed", () => {
  assert.equal(redactPublishShadowResultForActor(model(), context("unknown_role")).access.denialReason, "unsupported_role");
  assert.equal(redactPublishShadowResultForActor(model(), context("agency_admin", { surface: "unknown_surface" })).access.denialReason, "unsupported_surface");
  assert.equal(redactPublishShadowResultForActor(model(), { actor: null, surface: "command_center" }).access.denialReason, "actor_missing");
});

test("scope mismatch and missing required scope fail closed", () => {
  const mismatch = redactPublishShadowResultForActor(
    model(),
    context("agency_admin", {
      actor: {
        role: "agency_admin",
        tenantIds: ["tenant-other"],
        clientIds: ["client-test"],
        siteIds: ["site-test"],
      },
    }),
  );
  assert.equal(mismatch.access.allowed, false);
  assert.equal(mismatch.access.denialReason, "scope_mismatch");

  const missing = redactPublishShadowResultForActor(
    model(),
    context("technical_operator", {
      actor: {
        role: "technical_operator",
        tenantIds: ["tenant-test"],
        clientIds: ["client-test"],
      },
    }),
  );
  assert.equal(missing.access.allowed, false);
  assert.equal(missing.access.denialReason, "scope_unresolved");
  assertNoSensitiveLeak(missing);
});

test("denied projection leaks no refs, correlation, idempotency, source refs, or approval actors", () => {
  const result = redactPublishShadowResultForActor(model(), context("agency_admin", { actor: { role: "agency_admin", tenantIds: ["tenant-other"] } }));
  assert.equal(result.access.allowed, false);
  assertNoSensitiveLeak(result);
  assert.equal(result.evidenceRefs.length, 0);
  assert.equal(result.recommendedNextAction.requiredRefs.length, 0);
});

test("input model is not mutated", () => {
  const input = model();
  const before = JSON.stringify(input);
  redactPublishShadowResultForActor(input, context("agency_operator"));
  assert.equal(JSON.stringify(input), before);
});

test("DDOM, evidence, source, audit, approval, technical failure, and next action redaction are role-safe", () => {
  const result = redactPublishShadowResultForActor(model(), context("account_manager"));
  assert.equal(result.ddomReadiness.snapshot.visibility, "hidden");
  assert.equal(result.sourceTruth.refs.length, 0);
  assert.equal(result.evidence.evidencePackage.visibility, "hidden");
  assert.equal(result.gateDryRunStatus.auditEvent.visibility, "hidden");
  assert.equal(result.approval.approvalDecision.visibility, "hidden");
  assert.equal(result.approval.actor.visibility, "hidden");
  assert.equal(result.diagnostics.failureReason.visibility, "summarized");
  assert.equal(result.recommendedNextAction.actionKey, "technical_follow_up_required");
  assertBoundaryFlags(result);
});

test("pure access evaluator returns visibility profile without transforming model", () => {
  const decision = evaluatePublishShadowResultAccess(model(), context("agency_operator"));
  assert.equal(decision.allowed, true);
  assert.equal(decision.scopeMatch.site, "matched");
  assert.equal(decision.visibilityProfile.evidenceRefs, "hidden");
});
