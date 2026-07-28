import assert from "node:assert/strict";
import test from "node:test";

import * as readModelModule from "./aaf-publish-shadow-result-read-model";
import {
  buildPublishShadowResultReadModel,
  PUBLISH_SHADOW_STATUS_VALUES,
  type PublishShadowRawDdomSnapshotRow,
  type PublishShadowRawEvidencePackageRow,
  type PublishShadowRawGateAttemptRow,
  type PublishShadowRawSourceRefRow,
  type PublishShadowResultRepositorySnapshot,
} from "./aaf-publish-shadow-result-read-model";

function evidence(overrides: Partial<PublishShadowRawEvidencePackageRow> = {}): PublishShadowRawEvidencePackageRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "tenant-test",
    client_id: "client-test",
    site_id: "site-test",
    site_version_id: "22222222-2222-4222-8222-222222222222",
    package_type: "publish_activation_evidence",
    subject_type: "site_version",
    subject_id: "22222222-2222-4222-8222-222222222222",
    status: "created",
    created_by_actor_type: "human",
    created_by_actor_id: "operator-test",
    created_at: "2026-07-28T08:00:00.000Z",
    source_watermark: "siteVersion:wm|runtimeArtifact:wm|activePointer:wm|publishTarget:wm|domainReadiness:wm",
    freshness_label: "fresh",
    expires_at: null,
    limitations_json: { missingSourceTruth: [], limitations: [], warnings: [] },
    correlation_id: "corr-test",
    causation_id: null,
    idempotency_key: "idem-test",
    request_id: null,
    ...overrides,
  };
}

function sourceRef(key: string, table: string, id: string, overrides: Partial<PublishShadowRawSourceRefRow> = {}): PublishShadowRawSourceRefRow {
  return {
    id: `${id}-ref`,
    evidence_package_id: "11111111-1111-4111-8111-111111111111",
    source_system: "gnr8",
    source_table: table,
    source_record_id: id,
    source_version: "v1",
    source_watermark: `${key}:wm`,
    captured_at: "2026-07-28T08:00:00.000Z",
    query_ref: `aaf_publish_activation_source_reader:v1:${key}`,
    snapshot_ref: `gnr8:${table}:${id}`,
    metadata_json: {
      sourceKey: key,
      freshnessStatus: "fresh",
      staleReason: null,
      watermarkMetadata: { canonicalWatermark: `${key}:wm` },
      limitations: [],
    },
    ...overrides,
  };
}

function sourceRefs(overrides: Partial<Record<string, PublishShadowRawSourceRefRow | null>> = {}): PublishShadowRawSourceRefRow[] {
  const refs: Record<string, PublishShadowRawSourceRefRow | null> = {
    siteVersion: sourceRef("siteVersion", "gnr8_runtime_site_versions", "22222222-2222-4222-8222-222222222222"),
    runtimeArtifact: sourceRef("runtimeArtifact", "gnr8_runtime_artifacts", "33333333-3333-4333-8333-333333333333"),
    activePointer: sourceRef("activePointer", "gnr8_runtime_active_pointers", "site-test"),
    publishTarget: sourceRef("publishTarget", "gnr8_publish_targets", "production"),
    domainReadiness: sourceRef("domainReadiness", "gnr8_ddom_readiness_snapshots", "44444444-4444-4444-8444-444444444444"),
    contentOverridePublishedState: sourceRef("contentOverridePublishedState", "gnr8_content_overrides", "site_version:published"),
    publishActivationApproval: sourceRef("publishActivationApproval", "gnr8_aaf_approval_decisions", "55555555-5555-4555-8555-555555555555"),
    ...overrides,
  };
  return Object.values(refs).filter((row): row is PublishShadowRawSourceRefRow => Boolean(row));
}

function ddom(overrides: Partial<PublishShadowRawDdomSnapshotRow> = {}): PublishShadowRawDdomSnapshotRow {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    readiness_state: "ready",
    readiness_blockers: [],
    readiness_warnings: [],
    freshness_state: "fresh",
    fresh_until: "2026-07-29T08:00:00.000Z",
    stale_reason: null,
    captured_at: "2026-07-28T08:00:00.000Z",
    source_watermark: "domainReadiness:wm",
    created_at: "2026-07-28T08:00:00.000Z",
    ...overrides,
  };
}

function gate(overrides: Partial<PublishShadowRawGateAttemptRow> = {}): PublishShadowRawGateAttemptRow {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    tenant_id: "tenant-test",
    client_id: "client-test",
    site_id: "site-test",
    site_version_id: "22222222-2222-4222-8222-222222222222",
    action_key: "publish.activation",
    scope: "publish_activation",
    subject_type: "site_version",
    subject_id: "22222222-2222-4222-8222-222222222222",
    actor_type: "human",
    actor_id: "operator-test",
    actor_role: "agency_admin",
    policy_evaluation_id: "77777777-7777-4777-8777-777777777777",
    evidence_package_id: "11111111-1111-4111-8111-111111111111",
    approval_request_id: "88888888-8888-4888-8888-888888888888",
    approval_decision_id: "55555555-5555-4555-8555-555555555555",
    pre_action_audit_event_id: "99999999-9999-4999-8999-999999999999",
    outcome_audit_event_id: null,
    gate_result: "allowed",
    fail_closed_reason: null,
    correlation_id: "corr-test",
    causation_id: null,
    idempotency_key: "idem-test",
    request_id: null,
    started_at: "2026-07-28T08:00:00.000Z",
    completed_at: "2026-07-28T08:00:01.000Z",
    created_at: "2026-07-28T08:00:01.000Z",
    ...overrides,
  };
}

function snapshot(overrides: Partial<PublishShadowResultRepositorySnapshot> = {}): PublishShadowResultRepositorySnapshot {
  return {
    capturedAt: "2026-07-28T08:00:00.000Z",
    input: {
      tenantId: "tenant-test",
      clientId: "client-test",
      siteId: "site-test",
      siteVersionId: "22222222-2222-4222-8222-222222222222",
      runtimeArtifactId: "33333333-3333-4333-8333-333333333333",
      intendedPublishTarget: "production",
      intendedPublishStage: "production",
      trustedPublishEnvironment: "production",
      correlationId: "corr-test",
      idempotencyKey: "idem-test",
      shadowEnabledState: "enabled",
      generatedAt: "2026-07-28T08:10:00.000Z",
    },
    evidencePackage: evidence(),
    sourceRefs: sourceRefs(),
    freshnessChecks: [
      {
        id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        evidence_package_id: "11111111-1111-4111-8111-111111111111",
        policy_version: "PASR-2-shadow",
        result: "fresh",
        checked_at: "2026-07-28T08:00:00.000Z",
        stale_reason: null,
        expires_at: null,
        current_source_watermark: "siteVersion:wm|runtimeArtifact:wm|activePointer:wm|publishTarget:wm|domainReadiness:wm",
        audit_event_id: null,
        correlation_id: "corr-test",
        idempotency_key: "idem-test:freshness",
      },
    ],
    gateAttempt: gate(),
    policyEvaluation: {
      id: "77777777-7777-4777-8777-777777777777",
      result: "approval_required",
      policy_version: "PASR-2-shadow",
      scope: "publish_activation",
      action_key: "publish.activation",
      subject_type: "site_version",
      subject_id: "22222222-2222-4222-8222-222222222222",
      approval_request_id: "88888888-8888-4888-8888-888888888888",
      approval_decision_id: "55555555-5555-4555-8555-555555555555",
      evidence_package_id: "11111111-1111-4111-8111-111111111111",
      blocker_codes: [],
      stale_reason: null,
      audit_event_id: "99999999-9999-4999-8999-999999999999",
      evaluated_at: "2026-07-28T08:00:00.000Z",
      correlation_id: "corr-test",
      idempotency_key: "idem-test:policy",
    },
    auditEvent: {
      id: "99999999-9999-4999-8999-999999999999",
      event_name: "aaf.gate.allowed",
      event_family: "publish",
      severity: "notice",
      subject_type: "site_version",
      subject_id: "22222222-2222-4222-8222-222222222222",
      policy_evaluation_id: "77777777-7777-4777-8777-777777777777",
      evidence_package_id: "11111111-1111-4111-8111-111111111111",
      approval_request_id: "88888888-8888-4888-8888-888888888888",
      approval_decision_id: "55555555-5555-4555-8555-555555555555",
      payload_json: { nonExecuting: true, gateResult: "allowed", blockerCodes: [] },
      correlation_id: "corr-test",
      idempotency_key: "idem-test:audit",
      created_at: "2026-07-28T08:00:00.000Z",
    },
    ddomSnapshot: ddom(),
    publishTarget: {
      id: "production",
      environment: "production",
      target_kind: "public_runtime",
      publish_stage: "production",
      status: "active",
      policy_version: "ptt-1",
      requires_aaf: true,
      requires_ddom_snapshot: true,
      requires_launch_signoff: false,
      allowed_artifact_stages: ["production"],
      limitations_json: {},
      source_watermark: "publishTarget:wm",
      created_at: "2026-07-28T08:00:00.000Z",
      updated_at: "2026-07-28T08:00:00.000Z",
    },
    approvalTimeline: {
      approval_request_id: "88888888-8888-4888-8888-888888888888",
      approval_decision_id: "55555555-5555-4555-8555-555555555555",
      scope: "publish_activation",
      subject_type: "site_version",
      subject_id: "22222222-2222-4222-8222-222222222222",
      request_status: "requested",
      request_policy_version: "PASR-2-shadow",
      request_created_at: "2026-07-28T07:00:00.000Z",
      requested_expires_at: null,
      decision_status: "granted",
      decided_at: "2026-07-28T07:10:00.000Z",
      decision_policy_version: "PASR-2-shadow",
      evidence_package_id: "11111111-1111-4111-8111-111111111111",
      policy_evaluation_id: "77777777-7777-4777-8777-777777777777",
      decision_expires_at: null,
      revocations_json: [],
      supersessions_json: [],
      partial_timeline_json: [],
    },
    runtimeContext: {
      siteVersion: {
        id: "22222222-2222-4222-8222-222222222222",
        site_id: "site-test",
        state: "APPROVED",
        artifact_id: "33333333-3333-4333-8333-333333333333",
        updated_at: "2026-07-28T08:00:00.000Z",
      },
      runtimeArtifact: {
        id: "33333333-3333-4333-8333-333333333333",
        site_id: "site-test",
        site_version_id: "22222222-2222-4222-8222-222222222222",
        publish_stage: "production",
        created_at: "2026-07-28T08:00:00.000Z",
      },
      activePointer: {
        site_id: "site-test",
        active_site_version_id: "00000000-0000-4000-8000-000000000000",
        active_artifact_id: "00000000-0000-4000-8000-000000000001",
        updated_at: "2026-07-28T07:00:00.000Z",
      },
    },
    limitations: [],
    ...overrides,
  };
}

function statusFor(overrides: Partial<PublishShadowResultRepositorySnapshot>) {
  return buildPublishShadowResultReadModel(snapshot(overrides));
}

test("implements the PASR-3 status vocabulary", () => {
  assert.deepEqual(PUBLISH_SHADOW_STATUS_VALUES, [
    "shadow_not_enabled",
    "shadow_not_available",
    "shadow_ready",
    "shadow_ready_with_warnings",
    "shadow_missing_source_truth",
    "shadow_stale_source_truth",
    "shadow_missing_ddom_snapshot",
    "shadow_stale_ddom_snapshot",
    "shadow_missing_publish_target",
    "shadow_missing_publish_activation_approval",
    "shadow_gate_not_ready",
    "shadow_evaluation_failed",
  ]);
});

test("shadow not enabled and no records found stay empty and non-enforcing", () => {
  const result = statusFor({
    input: { siteId: "site-test", siteVersionId: "22222222-2222-4222-8222-222222222222", shadowEnabledState: "disabled" },
    evidencePackage: null,
    sourceRefs: [],
    freshnessChecks: [],
    gateAttempt: null,
    policyEvaluation: null,
    auditEvent: null,
    ddomSnapshot: null,
    publishTarget: null,
    approvalTimeline: null,
    limitations: ["shadow_observation_records_not_found"],
  });
  assert.equal(result.shadowStatus, "shadow_not_enabled");
  assert.equal(result.emptyState.reason, "shadow_disabled");
  assert.equal(result.derivedOnly, true);
  assert.equal(result.enforcementApplied, false);
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.createsDdomSnapshot, false);
  assert.equal(result.createsApproval, false);
  assert.equal(result.mutatesSourceTruth, false);
});

test("complete persisted shadow rows produce a ready derived result", () => {
  const result = statusFor({});
  assert.equal(result.shadowStatus, "shadow_ready");
  assert.equal(result.severity, "low");
  assert.equal(result.readinessResult, "ready");
  assert.equal(result.recommendedNextAction.actionKey, "none");
  assert.equal(result.evidenceRefs.evidencePackageId, "11111111-1111-4111-8111-111111111111");
  assert.equal(result.correlation.linkageStrategy, "correlation_idempotency_fallback");
});

test("ready with warnings recommends operator warning review", () => {
  const result = statusFor({
    ddomSnapshot: ddom({ readiness_state: "ready_with_warnings", readiness_warnings: ["domain_readiness_ready_with_warnings"] }),
  });
  assert.equal(result.shadowStatus, "shadow_ready_with_warnings");
  assert.equal(result.recommendedNextAction.actionKey, "review_warnings");
});

test("missing and stale DDOM snapshots map to DDOM-specific actions", () => {
  const missing = statusFor({
    evidencePackage: evidence({ limitations_json: { missingSourceTruth: ["domainReadiness"], limitations: ["missing_source_truth_present"] } }),
    sourceRefs: sourceRefs({ domainReadiness: null }),
    ddomSnapshot: null,
  });
  assert.equal(missing.shadowStatus, "shadow_missing_ddom_snapshot");
  assert.equal(missing.recommendedNextAction.actionKey, "run_ddom_manual_trigger_outside_pasr");

  const stale = statusFor({
    sourceRefs: sourceRefs({
      domainReadiness: sourceRef("domainReadiness", "gnr8_ddom_readiness_snapshots", "44444444-4444-4444-8444-444444444444", {
        metadata_json: {
          sourceKey: "domainReadiness",
          freshnessStatus: "stale",
          staleReason: "domain_readiness_stale",
          watermarkMetadata: { canonicalWatermark: "domainReadiness:wm" },
        },
      }),
    }),
    ddomSnapshot: ddom({ readiness_state: "stale", freshness_state: "stale", stale_reason: "domain_readiness_stale" }),
  });
  assert.equal(stale.shadowStatus, "shadow_stale_ddom_snapshot");
  assert.equal(stale.recommendedNextAction.actionKey, "refresh_stale_ddom_snapshot_outside_pasr");
});

test("missing publish target and missing approval are classified distinctly", () => {
  const missingTarget = statusFor({
    evidencePackage: evidence({ limitations_json: { missingSourceTruth: ["publishTarget"], limitations: ["missing_source_truth_present"] } }),
    sourceRefs: sourceRefs({ publishTarget: null }),
    publishTarget: null,
  });
  assert.equal(missingTarget.shadowStatus, "shadow_missing_publish_target");
  assert.equal(missingTarget.recommendedNextAction.actionKey, "configure_verify_publish_target_source_truth");

  const missingApproval = statusFor({
    gateAttempt: gate({ gate_result: "approval_required", approval_request_id: null, approval_decision_id: null }),
    policyEvaluation: {
      ...snapshot({}).policyEvaluation!,
      result: "approval_required",
      approval_request_id: null,
      approval_decision_id: null,
      blocker_codes: ["approval_missing"],
    },
    approvalTimeline: null,
  });
  assert.equal(missingApproval.shadowStatus, "shadow_missing_publish_activation_approval");
  assert.equal(missingApproval.recommendedNextAction.actionKey, "request_publish_activation_approval");
});

test("gate not ready and evaluation failures stay shadow-only", () => {
  const blocked = statusFor({
    gateAttempt: gate({ gate_result: "blocked", fail_closed_reason: null }),
    policyEvaluation: {
      ...snapshot({}).policyEvaluation!,
      result: "approval_blocked",
      blocker_codes: ["domain_readiness_blocked"],
    },
  });
  assert.equal(blocked.shadowStatus, "shadow_gate_not_ready");
  assert.equal(blocked.recommendedNextAction.actionKey, "review_gate_dry_run_failure");
  assert.equal(blocked.publishActionBlocked, false);

  const failed = statusFor({
    evidencePackage: evidence({ status: "invalid", freshness_label: "failed" }),
  });
  assert.equal(failed.shadowStatus, "shadow_evaluation_failed");
  assert.equal(failed.recommendedNextAction.actionKey, "review_evidence_builder_failure");
});

test("missing and stale generic source refs map to source truth statuses", () => {
  const missing = statusFor({
    evidencePackage: evidence({ limitations_json: { missingSourceTruth: ["runtimeArtifact"], limitations: ["missing_source_truth_present"] } }),
    sourceRefs: sourceRefs({ runtimeArtifact: null }),
  });
  assert.equal(missing.shadowStatus, "shadow_missing_source_truth");

  const stale = statusFor({
    sourceRefs: sourceRefs({
      runtimeArtifact: sourceRef("runtimeArtifact", "gnr8_runtime_artifacts", "33333333-3333-4333-8333-333333333333", {
        metadata_json: {
          sourceKey: "runtimeArtifact",
          freshnessStatus: "stale",
          staleReason: "runtime_artifact_watermark_mismatch",
          watermarkMetadata: { canonicalWatermark: "runtimeArtifact:wm-new" },
        },
      }),
    }),
  });
  assert.equal(stale.shadowStatus, "shadow_stale_source_truth");
});

test("builder exports no mutation-oriented methods", () => {
  const mutationExports = Object.keys(readModelModule).filter((key) => /^(create|update|delete|mutate|write|insert)/i.test(key));
  assert.deepEqual(mutationExports, []);
});
