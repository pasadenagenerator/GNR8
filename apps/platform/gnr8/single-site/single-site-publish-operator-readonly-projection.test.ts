import assert from "node:assert/strict";
import test from "node:test";

import {
  SingleSitePublishOperatorReadonlyProjectionRepository,
  buildSingleSitePublishOperatorDiagnosticSnapshot,
  buildSingleSitePublishOperatorDiagnosticSnapshotDiff,
  buildSingleSitePublishOperatorReadonlyProjection,
  type SingleSitePublishOperatorAuditRefRow,
} from "./single-site-publish-operator-readonly-projection";
import type { SingleSitePublishOperatorActionAuditRow } from "./single-site-publish-operator-action-audit";

function action(overrides: Partial<SingleSitePublishOperatorActionAuditRow> = {}): SingleSitePublishOperatorActionAuditRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "tenant-mvp58",
    client_id: "client-mvp58",
    site_id: "site-mvp58",
    migration_id: "migration-mvp58",
    mode: "dry_run",
    route_action_source: "api/gnr8/admin/single-site-publish/dry-run",
    actor_id: "superadmin-mvp58",
    actor_type: "human",
    actor_role: "platform_superadmin",
    confirmation_marker: "operator-confirmation:dry_run:abc",
    candidate_site_version_ref: "gnr8:gnr8_runtime_site_versions:site-version-mvp58",
    runtime_artifact_ref: "gnr8:gnr8_runtime_artifacts:artifact-mvp58",
    publish_target_ref: "gnr8:gnr8_publish_targets:production",
    publish_stage: "production",
    publish_environment: "production",
    launch_readiness_evidence_ref: "aaf:evidence_package:evidence-mvp58",
    publish_activation_request_ref: "request-mvp58",
    publish_activation_decision_ref: "decision-mvp58",
    gate_attempt_result_ref: "gate-mvp58",
    handoff_watermark: "handoff-watermark-mvp58",
    gate_input_watermark: `single-site-publish-activation-gate-input:${"a".repeat(64)}`,
    idempotency_key: "idem-mvp58-dry",
    correlation_id: "corr-mvp58-dry",
    semantic_fingerprint: "fingerprint-mvp58",
    status: "dry_run_completed",
    result_summary_json: {
      ok: true,
      mode: "dry_run",
      resolverStatus: "complete",
      wrapperDryRunStatus: "dry_run_ready",
      blockerCodes: [],
      warnings: ["dns_waiting"],
      limitationCodes: ["operator_visibility_only"],
      publishes: false,
      runtimeMutation: false,
      blockingEnforcementApplied: false,
    },
    redacted_diagnostics_json: { status: "ok", reasonCode: "dry_run_ready" },
    limitation_summary_json: {
      blockerCodes: [],
      warningCodes: ["dns_waiting"],
      limitationCodes: ["operator_visibility_only"],
    },
    error_summary_json: {},
    started_at: "2026-08-10T08:00:00.000Z",
    completed_at: "2026-08-10T08:00:01.000Z",
    created_at: "2026-08-10T08:00:00.000Z",
    updated_at: "2026-08-10T08:00:01.000Z",
    privacy_label: "internal_operational",
    retention_class: "compliance_long",
    ...overrides,
  };
}

function ref(overrides: Partial<SingleSitePublishOperatorAuditRefRow> = {}): SingleSitePublishOperatorAuditRefRow {
  return {
    action_id: "00000000-0000-4000-8000-000000000001",
    ref_role: "candidate_site_version",
    source_system: "gnr8",
    source_table: "gnr8_runtime_site_versions",
    source_type: "runtime_site_version",
    source_record_id: "site-version-mvp58",
    source_ref: "gnr8:gnr8_runtime_site_versions:site-version-mvp58",
    source_watermark: "ref-watermark",
    metadata_json: {},
    correlation_id: "corr-mvp58-dry",
    idempotency_key: "idem-mvp58-dry:ref:candidate",
    created_at: "2026-08-10T08:00:00.000Z",
    ...overrides,
  };
}

test("read-only projection maps latest dry-run and shadow-publish audit rows safely", () => {
  const shadow = action({
    id: "00000000-0000-4000-8000-000000000002",
    mode: "shadow_publish",
    route_action_source: "api/gnr8/admin/single-site-publish/shadow-publish",
    status: "shadow_publish_completed",
    idempotency_key: "idem-mvp58-shadow",
    correlation_id: "corr-mvp58-shadow",
    result_summary_json: {
      ok: true,
      mode: "shadow_publish",
      routeStatus: "shadow_publish_completed",
      resolverStatus: "complete",
      wrapperStatus: "published_via_existing_orchestrator",
      publishOrchestratorStatus: "called",
      blockerCodes: [],
      warnings: [],
      limitationCodes: [],
      blockingEnforcementApplied: false,
      publishMayHaveExecuted: true,
    },
    limitation_summary_json: { blockerCodes: [], warningCodes: [], limitationCodes: [] },
    updated_at: "2026-08-10T08:10:01.000Z",
  });

  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp58" },
    actions: [action(), shadow],
    refs: [ref(), ref({ action_id: shadow.id, ref_role: "publish_result", source_type: "publish_result", source_record_id: "wrapper-result", source_ref: "wrapper-result" })],
    generatedAt: "2026-08-10T08:11:00.000Z",
  });

  assert.equal(model.state, "visible");
  assert.equal(model.identity.migrationId, "migration-mvp58");
  assert.equal(model.latestDryRun?.status, "dry_run_completed");
  assert.equal(model.latestShadowPublish?.status, "shadow_publish_completed");
  assert.equal(model.latestShadowPublish?.persistedMutationFlags.publishMayHaveExecuted, true);
  assert.equal(model.flags.publishes, false);
  assert.equal(model.flags.runtimeMutation, false);
  assert.equal(model.flags.enforcementApplied, false);
  assert.equal(model.nextAction, "no_action");
});

test("projection redacts unsafe diagnostics instead of surfacing raw internals", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp58" },
    actions: [
      action({
        redacted_diagnostics_json: {
          status: "failed",
          reasonCode: "publish_activation_missing_dns_readiness",
          rawSqlError: "select * from secrets",
          stackTrace: "stack trace with token",
          providerSecret: "OPENAI_API_KEY=abc",
        },
      }),
    ],
  });
  const json = JSON.stringify(model);

  assert.equal(json.includes("publish_activation_missing_dns_readiness"), true);
  assert.equal(json.includes("rawSqlError"), false);
  assert.equal(json.includes("stackTrace"), false);
  assert.equal(json.includes("providerSecret"), false);
  assert.equal(json.includes("OPENAI_API_KEY"), false);
  assert.equal(model.latestDryRun?.redactedDiagnosticSummary.omittedUnsafeDiagnostics, true);
});

test("diagnostic snapshot is deterministic except for generated timestamp and exposes a stable semantic watermark", () => {
  const first = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp62" },
    actions: [action()],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const second = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp62" },
    actions: [action()],
    generatedAt: "2026-08-10T12:05:00.000Z",
  });

  assert.notEqual(first.diagnosticSnapshot.snapshotGeneratedAt, second.diagnosticSnapshot.snapshotGeneratedAt);
  assert.equal(first.diagnosticSnapshot.snapshotWatermark, second.diagnosticSnapshot.snapshotWatermark);
  assert.equal(JSON.stringify({ ...first.diagnosticSnapshot.exportSafeJsonPreview, snapshotGeneratedAt: "ignored" }), JSON.stringify({ ...second.diagnosticSnapshot.exportSafeJsonPreview, snapshotGeneratedAt: "ignored" }));
  assert.equal(first.diagnosticSnapshot.snapshotVersion, "mvp-62-single-site-publish-operator-readonly-diagnostic-snapshot:v1");
  assert.equal(first.diagnosticSnapshot.flags.readOnly, true);
  assert.equal(first.diagnosticSnapshot.flags.exportSafe, true);
  assert.equal(first.diagnosticSnapshot.flags.actionAvailable, false);
  assert.equal(first.diagnosticSnapshot.flags.publishes, false);
  assert.equal(first.diagnosticSnapshot.flags.runtimeMutation, false);
  assert.equal(first.diagnosticSnapshot.flags.enforcementApplied, false);
});

test("diagnostic snapshot includes required summaries safe refs source labels and runbook alignment", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp62" },
    actions: [action({ result_summary_json: { wrapperDryRunStatus: "preflight_blocked", resolverStatus: "incomplete", blockerCodes: ["publish_activation_metadata_incomplete"] } })],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp62", status: "blocked", freshness_status: "stale", semantic_source_watermark: "wm:readiness-mvp62" },
      launchReadinessDimensions: [
        { dimension: "domain_readiness", dimension_status: "blocked", freshness_status: "fresh", required_for_launch_readiness: true },
        { dimension: "publish_target", dimension_status: "missing", freshness_status: "missing", required_for_launch_readiness: true },
      ],
      launchReadinessBlockers: [{ severity: "p0_critical", category: "domain", status: "open", description: "Blocked." }],
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence-mvp62" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp62" },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted_with_limitations", limitation_summary_json: ["dns_waiting_accepted"] },
      publishActivationDecisionEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      gateAttempt: {
        id: "44444444-4444-4444-8444-444444444444",
        gate_result: "blocked",
        causation_id: `mvp44:single-site-publish-activation-gate-input:${"f".repeat(64)}`,
      },
      gatePolicyEvaluation: { blocker_codes: ["gate_policy_blocker"], warning_codes: ["gate_policy_warning"] },
    },
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const snapshot = model.diagnosticSnapshot;

  assert.equal(snapshot.launchReadinessSummary.status, "blocked");
  assert.equal(snapshot.publishActivationRequestSummary.ref, "aaf:approval_request:22222222-2222-4222-8222-222222222222");
  assert.equal(snapshot.publishActivationDecisionSummary.projection, "granted_with_limitations");
  assert.equal(snapshot.gateHandoffSummary.gateResultStatus, "blocked");
  assert.equal(snapshot.metadataResolverSummary.completenessStatus, "complete");
  assert.equal(snapshot.auditSummary.latestDryRunStatus, "dry_run_completed");
  assert.equal(snapshot.runbookSummary.topBlockingReason?.code, model.runbookSummary.topBlockingReason?.code);
  assert.equal(snapshot.topBlockingReason?.code, "LAUNCH_P0_BLOCKER_OPEN");
  assert.deepEqual(snapshot.recommendedInspectionOrder, model.runbookSummary.recommendedInspectionOrder);
  assert.equal(snapshot.safeReferences.some((ref) => ref.key === "launch_readiness_record" && ref.sourceWatermark === "wm:readiness-mvp62"), true);
  assert.equal(snapshot.safeReferences.some((ref) => ref.key === "publish_activation_decision" && ref.ref === "aaf:approval_decision:33333333-3333-4333-8333-333333333333"), true);
  assert.equal(snapshot.sourceLabels.sourceOwnedReads.includes("launch_readiness"), true);
  assert.equal(snapshot.sourceLabels.derivedOnly.includes("metadata_resolver"), true);
  assert.equal(snapshot.freshnessMissingStaleSummary.missingCodes.includes("LAUNCH_REQUIRED_DIMENSIONS_MISSING"), true);
});

test("diagnostic snapshot redacts unsafe values and empty states stay export-safe", () => {
  const unsafe = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { candidateSiteVersionRef: "OPENAI_API_KEY=abc" },
    actions: [
      action({
        tenant_id: "DATABASE_URL=postgres://secret",
        client_id: "client-safe",
        candidate_site_version_ref: "OPENAI_API_KEY=abc",
        status: "preflight_failed",
        result_summary_json: { wrapperDryRunStatus: "preflight_blocked", resolverStatus: "incomplete", blockerCodes: ["preflight_failed"] },
        limitation_summary_json: { blockerCodes: ["preflight_failed"], warningCodes: [], limitationCodes: [] },
        redacted_diagnostics_json: { reasonCode: "safe_code", rawSql: "select * from secrets", stackTrace: "token stack trace" },
      }),
    ],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const unsafeJson = JSON.stringify(unsafe.diagnosticSnapshot);

  assert.equal(unsafeJson.includes("OPENAI_API_KEY"), false);
  assert.equal(unsafeJson.includes("DATABASE_URL"), false);
  assert.equal(unsafeJson.includes("select * from secrets"), false);
  assert.equal(unsafeJson.includes("stack trace"), false);
  assert.equal(unsafeJson.includes("preflight_failed"), true);

  const empty = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: {},
    actions: [],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const rebuilt = buildSingleSitePublishOperatorDiagnosticSnapshot(
    (({ diagnosticSnapshot: _diagnosticSnapshot, ...projection }) => projection)(empty),
    { snapshotGeneratedAt: "2026-08-10T12:10:00.000Z" },
  );

  assert.equal(empty.state, "lookup_required");
  assert.equal(empty.diagnosticSnapshot.flags.exportSafe, true);
  assert.equal(empty.diagnosticSnapshot.safeReferences.length, 10);
  assert.equal(empty.diagnosticSnapshot.topBlockingReason?.code, "LAUNCH_READINESS_RECORD_MISSING");
  assert.equal(rebuilt.snapshotWatermark, empty.diagnosticSnapshot.snapshotWatermark);
});

test("snapshot diff returns safe unknown state when no comparable baseline exists", () => {
  const current = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: {},
    actions: [],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const diff = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: current.diagnosticSnapshot,
    missingBaselineReason: "no comparable baseline in test",
  });

  assert.equal(diff.diffSchemaVersion, "mvp-63-single-site-publish-operator-readonly-snapshot-diff:v1");
  assert.equal(diff.baseline.type, "none");
  assert.equal(diff.severity, "unknown");
  assert.equal(diff.summaryCounts.unknown, 1);
  assert.equal(diff.readOnly, true);
  assert.equal(diff.actionAvailable, false);
  assert.equal(diff.mutatesSourceTruth, false);
});

test("snapshot diff classifies blockers added and removed", () => {
  const clean = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [action({ limitation_summary_json: { blockerCodes: [], warningCodes: [], limitationCodes: [] } })],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const blocked = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [
      action({
        result_summary_json: { wrapperDryRunStatus: "preflight_blocked", resolverStatus: "complete", blockerCodes: ["gate_policy_blocker"] },
        limitation_summary_json: { blockerCodes: ["gate_policy_blocker"], warningCodes: [], limitationCodes: [] },
      }),
    ],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });

  const added = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: blocked.diagnosticSnapshot,
    previousSnapshot: clean.diagnosticSnapshot,
  });
  const removed = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: clean.diagnosticSnapshot,
    previousSnapshot: blocked.diagnosticSnapshot,
  });

  assert.deepEqual(added.addedBlockerCodes, ["gate_policy_blocker"]);
  assert.equal(added.severity, "regressed");
  assert.equal(added.topRegression?.category, "blocker_codes");
  assert.deepEqual(removed.removedBlockerCodes, ["gate_policy_blocker"]);
  assert.equal(removed.topImprovement?.category, "blocker_codes");
});

test("snapshot diff treats stale or missing metadata resolved as improved", () => {
  const missing = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [action({ launch_readiness_evidence_ref: "unknown", publish_activation_decision_ref: "unknown", gate_attempt_result_ref: "unknown", result_summary_json: { resolverStatus: "incomplete" } })],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const complete = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [action()],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh", improved_candidate_site_version_ref: "gnr8:gnr8_runtime_site_versions:site-version-mvp58", improved_runtime_artifact_ref: "gnr8:gnr8_runtime_artifacts:artifact-mvp58" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      publishActivationDecisionEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      gateAttempt: { id: "44444444-4444-4444-8444-444444444444", gate_result: "allowed", causation_id: `mvp44:single-site-publish-activation-gate-input:${"e".repeat(64)}` },
      publishTarget: { id: "production", publish_stage: "production", environment: "production" },
    },
    generatedAt: "2026-08-10T12:00:00.000Z",
  });

  const diff = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: complete.diagnosticSnapshot,
    previousSnapshot: missing.diagnosticSnapshot,
  });

  assert.equal(diff.staleOrMissingChanges.removedCodes.length > 0, true);
  assert.equal(diff.staleOrMissingChanges.severity, "improved");
  assert.equal(diff.metadataCompletenessChange.severity, "improved");
});

test("snapshot diff classifies decision revoked or rejected as regressed", () => {
  const granted = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
    },
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const revoked = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted", revoked: true },
    },
    generatedAt: "2026-08-10T12:00:00.000Z",
  });

  const diff = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: revoked.diagnosticSnapshot,
    previousSnapshot: granted.diagnosticSnapshot,
  });

  assert.equal(diff.decisionStatusChange.severity, "regressed");
  assert.equal(diff.changedCategories.includes("decision_status"), true);
});

test("snapshot diff classifies gate blocked after allowed as regressed", () => {
  const allowed = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      gateAttempt: { id: "44444444-4444-4444-8444-444444444444", gate_result: "allowed" },
    },
  });
  const blocked = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      gateAttempt: { id: "44444444-4444-4444-8444-444444444444", gate_result: "blocked" },
    },
  });

  const diff = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: blocked.diagnosticSnapshot,
    previousSnapshot: allowed.diagnosticSnapshot,
  });

  assert.equal(diff.gateStatusChange.severity, "regressed");
});

test("snapshot diff classifies metadata completeness improved and watermark-only changes as changed", () => {
  const incomplete = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [action({ result_summary_json: { resolverStatus: "incomplete" } })],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const complete = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp63" },
    actions: [action()],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp63", status: "ready", freshness_status: "fresh", improved_candidate_site_version_ref: "gnr8:gnr8_runtime_site_versions:site-version-mvp58", improved_runtime_artifact_ref: "gnr8:gnr8_runtime_artifacts:artifact-mvp58", semantic_source_watermark: "wm:current" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version" },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      publishActivationDecisionEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      gateAttempt: { id: "44444444-4444-4444-8444-444444444444", gate_result: "allowed", causation_id: `mvp44:single-site-publish-activation-gate-input:${"e".repeat(64)}` },
      publishTarget: { id: "production", publish_stage: "production", environment: "production" },
    },
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const improved = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: complete.diagnosticSnapshot,
    previousSnapshot: incomplete.diagnosticSnapshot,
  });
  const watermarkOnlyBaseline = {
    ...complete.diagnosticSnapshot,
    snapshotWatermark: `single-site-publish-operator-diagnostic-snapshot:${"b".repeat(64)}`,
    sourceWatermarks: { ...complete.diagnosticSnapshot.sourceWatermarks, launch_readiness_record: "wm:previous" },
  };
  const changed = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: complete.diagnosticSnapshot,
    previousSnapshot: watermarkOnlyBaseline,
  });

  assert.equal(improved.metadataCompletenessChange.severity, "improved");
  assert.equal(changed.severity, "changed");
  assert.equal(changed.sourceWatermarkChanges.some((change) => change.category === "source_watermark:launch_readiness_record"), true);
});

test("snapshot diff redacts unsafe values and is deterministic", () => {
  const unsafe = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { candidateSiteVersionRef: "OPENAI_API_KEY=abc" },
    actions: [
      action({
        tenant_id: "DATABASE_URL=postgres://secret",
        candidate_site_version_ref: "OPENAI_API_KEY=abc",
        result_summary_json: { resolverStatus: "incomplete", blockerCodes: ["safe_blocker"], rawPayload: "token secret" },
        limitation_summary_json: { blockerCodes: ["safe_blocker"], warningCodes: [], limitationCodes: [] },
        redacted_diagnostics_json: { reasonCode: "safe_reason", rawSql: "select * from secrets", stackTrace: "token stack trace" },
      }),
    ],
    generatedAt: "2026-08-10T12:00:00.000Z",
  });
  const first = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: unsafe.diagnosticSnapshot,
    baselineAuditAttempt: unsafe.latestDryRun,
  });
  const second = buildSingleSitePublishOperatorDiagnosticSnapshotDiff({
    currentSnapshot: unsafe.diagnosticSnapshot,
    baselineAuditAttempt: unsafe.latestDryRun,
  });
  const json = JSON.stringify(first);

  assert.deepEqual(first, second);
  assert.equal(json.includes("OPENAI_API_KEY"), false);
  assert.equal(json.includes("DATABASE_URL"), false);
  assert.equal(json.includes("select * from secrets"), false);
  assert.equal(json.includes("stack trace"), false);
  assert.equal(json.includes("safe_blocker"), true);
});

test("source diagnostics expose only safe codes", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: {
        id: "readiness-mvp59",
        status: "ready",
        freshness_status: "fresh",
        semantic_source_watermark: "wm:readiness",
      },
      launchReadinessDimensions: [
        {
          dimension: "domain_readiness",
          dimension_status: "ready",
          freshness_status: "fresh",
          diagnostics_json: {
            rawSqlError: "select * from secrets",
            providerSecret: "OPENAI_API_KEY=abc",
            safeCode: "domain_ready",
          },
          required_for_launch_readiness: true,
        },
      ],
      activePublishActivationDecisionCount: 2,
    },
  });
  const json = JSON.stringify(model);

  assert.equal(json.includes("rawSqlError"), false);
  assert.equal(json.includes("OPENAI_API_KEY"), false);
  assert.equal(model.metadataResolver.safeDiagnostics.includes("conflicting_active_publish_activation_decisions"), true);
});

test("next-action derivation is deterministic across source states", () => {
  const readySource = {
    launchReadinessRecord: { id: "readiness-mvp59", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
    launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
  };
  assert.equal(buildSingleSitePublishOperatorReadonlyProjection({ lookup: { migrationId: "migration-mvp59" }, actions: [], sourceSnapshot: readySource }).nextAction, "request_publish_activation_approval");
  assert.equal(buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      ...readySource,
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp59" },
    },
  }).nextAction, "await_publish_activation_decision");
  assert.equal(buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      ...readySource,
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp59" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "rejected" },
    },
  }).nextAction, "review_rejected_publish_activation");
});

test("missing metadata produces blocked guidance rather than throwing", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { siteId: "site-mvp58" },
    actions: [
      action({
        launch_readiness_evidence_ref: "unknown",
        publish_activation_decision_ref: "unknown",
        gate_attempt_result_ref: "unknown",
        result_summary_json: {
          ok: false,
          resolverStatus: "incomplete",
          wrapperDryRunStatus: "preflight_blocked",
          blockerCodes: ["publish_activation_metadata_incomplete"],
        },
        limitation_summary_json: { blockerCodes: ["publish_activation_metadata_incomplete"], warningCodes: [], limitationCodes: [] },
      }),
    ],
  });

  assert.equal(model.readinessState, "blocked");
  assert.equal(model.governedPublishChain.launchReadinessEvidence.status, "missing");
  assert.equal(model.staleOrMissingMetadataIndicators.includes("launch_readiness_evidence_ref_missing"), true);
  assert.equal(model.nextAction, "collect_launch_readiness_evidence");
});

test("lookup with no audit rows recommends an internal dry-run", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { candidateSiteVersionRef: "site-version-mvp58" },
    actions: [],
  });

  assert.equal(model.state, "empty");
  assert.equal(model.nextAction, "run_internal_dry_run");
  assert.equal(model.timeline.length, 0);
});

test("repository uses select-only queries for action, ref, and event reads", async () => {
  const queries: string[] = [];
  const repository = new SingleSitePublishOperatorReadonlyProjectionRepository({
    async query(sql: string) {
      queries.push(sql);
      if (queries.length === 1) return { rows: [action()] as unknown as Record<string, unknown>[] };
      return { rows: [] };
    },
  });

  const model = await repository.read({ migrationId: "migration-mvp58" });

  assert.equal(model.state, "visible");
  assert.equal(queries.length, 7);
  assert.equal(queries.every((sql) => sql.trim().toLowerCase().startsWith("select")), true);
  assert.equal(queries.some((sql) => /\binsert\b|\bupdate\b|\bdelete\b|\bcreate\b/i.test(sql)), false);
});

test("launch readiness source records enrich the model", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: {
        id: "readiness-mvp59",
        tenant_id: "tenant-mvp59",
        client_id: "client-mvp59",
        site_id: "site-mvp59",
        migration_id: "migration-mvp59",
        status: "ready_with_limitations",
        freshness_status: "fresh",
        semantic_source_watermark: "wm:readiness",
        improved_candidate_site_version_ref: "gnr8:gnr8_runtime_site_versions:candidate-mvp59",
        improved_runtime_artifact_ref: "gnr8:gnr8_runtime_artifacts:artifact-mvp59",
        limitation_summary_json: [{ code: "dns_waiting_accepted" }],
      },
      launchReadinessDimensions: [
        { dimension: "domain_readiness", dimension_status: "ready_with_limitations", freshness_status: "fresh", limitations_json: ["dns_waiting_accepted"], required_for_launch_readiness: true },
      ],
      launchReadinessEvidencePackage: {
        id: "11111111-1111-4111-8111-111111111111",
        status: "created",
        source_watermark: "wm:evidence",
      },
    },
    generatedAt: "2026-08-10T10:00:00.000Z",
  });

  assert.equal(model.state, "visible");
  assert.equal(model.identity.tenantId, "tenant-mvp59");
  assert.equal(model.launchReadiness.status, "ready_with_limitations");
  assert.equal(model.launchReadiness.flags.readyWithLimitations, true);
  assert.equal(model.launchReadiness.evidencePackageRef, "aaf:evidence_package:11111111-1111-4111-8111-111111111111");
  assert.equal(model.nextAction, "request_publish_activation_approval");
});

test("publish activation request and decision enrich the model", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp59", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: {
        id: "22222222-2222-4222-8222-222222222222",
        status: "requested",
        scope: "publish_activation",
        action_key: "publish.activation",
        subject_type: "site_version",
        subject_id: "candidate-mvp59",
        policy_version: "mvp-41",
      },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: {
        id: "33333333-3333-4333-8333-333333333333",
        status: "granted_with_limitations",
        limitation_summary_json: ["dns_waiting_accepted"],
      },
    },
    generatedAt: "2026-08-10T10:00:00.000Z",
  });

  assert.equal(model.publishActivationRequest.ref, "aaf:approval_request:22222222-2222-4222-8222-222222222222");
  assert.equal(model.publishActivationDecision.projection, "granted_with_limitations");
  assert.equal(model.publishActivationDecision.grantedWithLimitations, true);
  assert.equal(model.nextAction, "prepare_gate_evaluation");
});

test("gate result and handoff enrich the model", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [action({ status: "dry_run_completed" })],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp59", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp59" },
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      gateAttempt: {
        id: "44444444-4444-4444-8444-444444444444",
        gate_result: "allowed",
        approval_request_id: "22222222-2222-4222-8222-222222222222",
        approval_decision_id: "33333333-3333-4333-8333-333333333333",
        evidence_package_id: "11111111-1111-4111-8111-111111111111",
        causation_id: `mvp44:single-site-publish-activation-gate-input:${"c".repeat(64)}`,
      },
    },
  });

  assert.equal(model.gateHandoffEvaluation.handoffReadinessStatus, "handoff_ready");
  assert.equal(model.gateHandoffEvaluation.gateResultStatus, "allowed");
  assert.equal(model.metadataResolver.completenessStatus, "complete");
  assert.equal(model.nextAction, "shadow_publish_available");
});

test("stale, missing, and blocked source data fails closed with deterministic next action", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp59" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp59", status: "stale", freshness_status: "stale", semantic_source_watermark: "wm:readiness" },
      launchReadinessDimensions: [
        { dimension: "publish_target", dimension_status: "missing", freshness_status: "missing", required_for_launch_readiness: true },
        { dimension: "domain_readiness", dimension_status: "blocked", freshness_status: "fresh", required_for_launch_readiness: true },
      ],
      launchReadinessBlockers: [{ severity: "p1_major", category: "domain", status: "open", description: "Domain readiness is blocked." }],
    },
  });

  assert.equal(model.readinessState, "blocked");
  assert.deepEqual(model.launchReadiness.requiredMissingDimensions, ["publish_target"]);
  assert.deepEqual(model.launchReadiness.blockedDimensions, ["domain_readiness"]);
  assert.equal(model.nextAction, "resolve_launch_readiness_blockers");
});

test("drilldown projection groups dimensions blockers activation gate metadata and audit events", () => {
  const dryRun = action({
    id: "00000000-0000-4000-8000-000000000011",
    updated_at: "2026-08-10T11:00:00.000Z",
  });
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp60" },
    actions: [dryRun],
    events: [
      {
        action_id: dryRun.id,
        event_action: "completed",
        status: "dry_run_completed",
        actor_id: "superadmin-mvp60",
        actor_type: "human",
        actor_role: "platform_superadmin",
        result_summary_json: { wrapperDryRunStatus: "dry_run_ready", reasonCode: "dry_run_ready", rawSql: "select * from secrets" },
        redacted_diagnostics_json: { reasonCode: "safe_event_code", stackTrace: "token stack trace" },
        error_summary_json: {},
        correlation_id: "corr-mvp60",
        causation_id: null,
        idempotency_key: "idem-mvp60:event",
        occurred_at: "2026-08-10T11:00:02.000Z",
        created_at: "2026-08-10T11:00:02.000Z",
      },
    ],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp60", status: "stale", freshness_status: "stale", semantic_source_watermark: "wm:readiness" },
      launchReadinessDimensions: [
        { id: "dim-ready", dimension: "content_readiness", dimension_status: "ready", freshness_status: "fresh", required_for_launch_readiness: true, semantic_source_watermark: "wm:content" },
        { id: "dim-stale", dimension: "metadata_snapshot", dimension_status: "ready", freshness_status: "stale", required_for_launch_readiness: true, source_ref: "gnr8:metadata:stale" },
        { id: "dim-missing", dimension: "publish_target", dimension_status: "missing", freshness_status: "missing", required_for_launch_readiness: true },
        { id: "dim-optional", dimension: "optional_dns_note", dimension_status: "missing", freshness_status: "missing", required_for_launch_readiness: false },
      ],
      launchReadinessBlockers: [
        { severity: "p1_major", category: "domain", status: "open", description: "Domain blocker." },
        { severity: "p1_major", category: "metadata", status: "accepted_limitation", description: "Accepted metadata limitation." },
      ],
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp60" },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted_with_limitations", limitation_summary_json: ["accepted_dns_wait"], revoked: true },
      publishActivationDecisionEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      gateAttempt: {
        id: "44444444-4444-4444-8444-444444444444",
        gate_result: "blocked",
        approval_request_id: "22222222-2222-4222-8222-222222222222",
        approval_decision_id: "33333333-3333-4333-8333-333333333333",
        evidence_package_id: "different-evidence",
        causation_id: `mvp44:single-site-publish-activation-gate-input:${"d".repeat(64)}`,
      },
      gatePolicyEvaluation: { blocker_codes: ["gate_policy_blocker"], warning_codes: ["gate_policy_warning"] },
      conflictingNewerGateAttempts: [{ id: "55555555-5555-4555-8555-555555555555", gate_result: "allowed" }],
      readFailureCodes: ["source_table_unavailable"],
    },
    generatedAt: "2026-08-10T11:01:00.000Z",
  });
  const json = JSON.stringify(model);

  assert.deepEqual(model.launchReadiness.dimensionGroups.ready, ["content_readiness"]);
  assert.deepEqual(model.launchReadiness.dimensionGroups.stale, ["metadata_snapshot"]);
  assert.deepEqual(model.launchReadiness.dimensionGroups.missing, ["publish_target"]);
  assert.deepEqual(model.launchReadiness.dimensionGroups.optional, ["optional_dns_note"]);
  assert.deepEqual(model.launchReadiness.blockerCountBySeverity, [{ key: "p1_major", count: 2 }]);
  assert.deepEqual(model.launchReadiness.blockerCountByCategory, [{ key: "domain", count: 1 }, { key: "metadata", count: 1 }]);
  assert.deepEqual(model.publishActivationRequest.evidenceRefs, ["aaf:evidence_package:11111111-1111-4111-8111-111111111111"]);
  assert.deepEqual(model.publishActivationDecision.evidenceRefs, ["aaf:evidence_package:11111111-1111-4111-8111-111111111111"]);
  assert.deepEqual(model.publishActivationDecision.indicators, ["decision_invalid", "decision_revoked"]);
  assert.equal(model.gateHandoffEvaluation.conflictDetails.some((row) => row.code === "gate_evidence_mismatch"), true);
  assert.equal(model.gateHandoffEvaluation.conflictDetails.some((row) => row.code === "publish_activation_gate_conflict"), true);
  assert.equal(model.metadataResolver.detailRows.some((row) => row.code === "source_table_unavailable"), true);
  assert.equal(model.operatorAudit.recentEvents[0].reasonCodes.includes("safe_event_code"), true);
  assert.equal(model.operatorAudit.timelineSummaries[0].label, "dry_run");
  assert.equal(json.includes("rawSql"), false);
  assert.equal(json.includes("stackTrace"), false);
  assert.equal(json.includes("token stack trace"), false);
});

function runbookEntry(
  model: ReturnType<typeof buildSingleSitePublishOperatorReadonlyProjection>,
  code: string,
) {
  return model.runbookEntries.find((entry) => entry.code === code);
}

test("runbook maps launch readiness blockers stale missing P0 and limitations", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp61", status: "ready_with_limitations", freshness_status: "stale", semantic_source_watermark: "wm:readiness" },
      launchReadinessDimensions: [
        { dimension: "domain_readiness", dimension_status: "blocked", freshness_status: "fresh", required_for_launch_readiness: true },
        { dimension: "content_readiness", dimension_status: "missing", freshness_status: "missing", required_for_launch_readiness: true },
        { dimension: "metadata_snapshot", dimension_status: "ready", freshness_status: "stale", required_for_launch_readiness: true },
      ],
      launchReadinessBlockers: [
        { severity: "p0_critical", category: "domain", status: "open", description: "Critical domain blocker." },
      ],
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
    },
  });

  assert.equal(runbookEntry(model, "LAUNCH_P0_BLOCKER_OPEN")?.severity, "critical");
  assert.equal(runbookEntry(model, "LAUNCH_P0_BLOCKER_OPEN")?.sourceOwner, "launch_readiness");
  assert.equal(runbookEntry(model, "LAUNCH_READINESS_BLOCKED")?.blocking, true);
  assert.equal(runbookEntry(model, "LAUNCH_READINESS_STALE")?.stale, true);
  assert.equal(runbookEntry(model, "LAUNCH_REQUIRED_DIMENSIONS_MISSING")?.missing, true);
  assert.equal(runbookEntry(model, "LAUNCH_READY_WITH_LIMITATIONS")?.severity, "warning");
  assert.equal(model.runbookSummary.topBlockingReason?.code, "LAUNCH_P0_BLOCKER_OPEN");
  assert.equal(model.runbookSummary.recommendedInspectionOrder[0], "launch_readiness");
});

test("runbook maps publish activation request gaps and scope conflicts", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp61", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: {
        id: "22222222-2222-4222-8222-222222222222",
        status: "pending",
        scope: "content_approval",
        action_key: "content.approve",
        subject_type: "migration",
        subject_id: "migration-mvp61",
      },
    },
  });

  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_PENDING")?.severity, "warning");
  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_PENDING")?.blocking, true);
  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_SCOPE_MISMATCH")?.sourceOwner, "publish_activation_request");
  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_SCOPE_MISMATCH")?.conflict, true);
  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_EVIDENCE_MISSING")?.missing, true);
});

test("runbook maps missing request and decision states", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp61", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
    },
  });

  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_REQUEST_MISSING")?.severity, "blocked");
  assert.equal(runbookEntry(model, "PUBLISH_ACTIVATION_DECISION_MISSING")?.severity, "blocked");
});

test("runbook maps rejected revoked superseded expired and limited decisions", () => {
  const baseSnapshot = {
    launchReadinessRecord: { id: "readiness-mvp61", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
    launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
    publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp61" },
    publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
  };
  const rejected = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: { ...baseSnapshot, publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "rejected" } },
  });
  const invalid = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      ...baseSnapshot,
      publishActivationDecision: {
        id: "33333333-3333-4333-8333-333333333333",
        status: "granted_with_limitations",
        revoked: true,
        superseded: true,
        expires_at: "2026-08-01T00:00:00.000Z",
        limitation_summary_json: ["limited_dns_window"],
      },
    },
    generatedAt: "2026-08-10T00:00:00.000Z",
  });
  const limited = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      ...baseSnapshot,
      publishActivationDecision: {
        id: "33333333-3333-4333-8333-333333333333",
        status: "granted_with_limitations",
        limitation_summary_json: ["limited_dns_window"],
      },
    },
    generatedAt: "2026-08-10T00:00:00.000Z",
  });

  assert.equal(runbookEntry(rejected, "PUBLISH_ACTIVATION_DECISION_REJECTED")?.blocking, true);
  assert.equal(runbookEntry(invalid, "PUBLISH_ACTIVATION_DECISION_REVOKED")?.severity, "blocked");
  assert.equal(runbookEntry(invalid, "PUBLISH_ACTIVATION_DECISION_SUPERSEDED")?.conflict, true);
  assert.equal(runbookEntry(invalid, "PUBLISH_ACTIVATION_DECISION_EXPIRED")?.stale, true);
  assert.equal(runbookEntry(limited, "PUBLISH_ACTIVATION_GRANTED_WITH_LIMITATIONS")?.severity, "warning");
});

test("runbook maps gate blocked warnings conflicts and watermark mismatches", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [action({ handoff_watermark: "handoff-watermark-a" })],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp61", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      launchReadinessEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", status: "created", source_watermark: "wm:evidence" },
      publishActivationRequest: { id: "22222222-2222-4222-8222-222222222222", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "candidate-mvp61" },
      publishActivationRequestEvidenceLinks: [{ evidence_package_id: "11111111-1111-4111-8111-111111111111" }],
      publishActivationDecision: { id: "33333333-3333-4333-8333-333333333333", status: "granted" },
      gateAttempt: {
        id: "44444444-4444-4444-8444-444444444444",
        gate_result: "blocked",
        approval_request_id: "22222222-2222-4222-8222-222222222222",
        approval_decision_id: "different-decision",
        evidence_package_id: "different-evidence",
        causation_id: `mvp44:single-site-publish-activation-gate-input:${"e".repeat(64)}`,
        created_at: "2026-08-10T12:00:00.000Z",
      },
      gatePolicyEvaluation: { blocker_codes: ["gate_policy_blocker"], warning_codes: ["gate_policy_warning"] },
      conflictingNewerGateAttempts: [{ id: "55555555-5555-4555-8555-555555555555", gate_result: "allowed" }],
    },
  });

  assert.equal(runbookEntry(model, "GATE_EVALUATION_BLOCKED")?.sourceOwner, "gate_evaluation");
  assert.equal(runbookEntry(model, "GATE_WARNING_WITH_LIMITATIONS")?.severity, "warning");
  assert.equal(runbookEntry(model, "GATE_NEWER_CONFLICT")?.severity, "critical");
  assert.equal(runbookEntry(model, "GATE_HANDOFF_WATERMARK_MISMATCH")?.conflict, true);
});

test("runbook maps metadata incomplete identity gaps target gaps and read failures", () => {
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-mvp61", status: "ready", freshness_status: "fresh", semantic_source_watermark: "wm:readiness" },
      readFailureCodes: ["source_table_unavailable"],
    },
  });

  assert.equal(runbookEntry(model, "RUNTIME_CANDIDATE_METADATA_MISSING")?.sourceOwner, "runtime_candidate");
  assert.equal(runbookEntry(model, "PUBLISH_TARGET_METADATA_MISSING")?.sourceOwner, "publish_target");
  assert.equal(runbookEntry(model, "METADATA_RESOLVER_INCOMPLETE")?.missing, true);
  assert.equal(runbookEntry(model, "METADATA_STRICT_IDENTITY_MISSING")?.severity, "blocked");
  assert.equal(runbookEntry(model, "METADATA_RESOLVER_READ_FAILURE")?.sourceOwner, "metadata_resolver");
});

test("runbook maps audit dry-run shadow publish and redacts unsafe refs", () => {
  const failedDryRun = action({
    candidate_site_version_ref: "OPENAI_API_KEY=abc",
    status: "preflight_failed",
    result_summary_json: { wrapperDryRunStatus: "preflight_blocked", resolverStatus: "incomplete", blockerCodes: ["preflight_failed"] },
    limitation_summary_json: { blockerCodes: ["preflight_failed"], warningCodes: [], limitationCodes: [] },
    redacted_diagnostics_json: { reasonCode: "safe_preflight_code", stackTrace: "stack trace with token" },
  });
  const failedShadow = action({
    id: "00000000-0000-4000-8000-000000000099",
    mode: "shadow_publish",
    status: "shadow_publish_failed",
    result_summary_json: { wrapperStatus: "shadow_publish_failed", blockerCodes: ["shadow_failed"] },
    limitation_summary_json: { blockerCodes: ["shadow_failed"], warningCodes: [], limitationCodes: [] },
    updated_at: "2026-08-10T08:20:01.000Z",
  });
  const model = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [failedDryRun, failedShadow],
  });
  const json = JSON.stringify(model.runbookEntries);

  assert.equal(runbookEntry(model, "AUDIT_LATEST_DRY_RUN_FAILED")?.blocking, true);
  assert.equal(runbookEntry(model, "AUDIT_LATEST_SHADOW_PUBLISH_FAILED")?.severity, "blocked");
  assert.equal(json.includes("safe_preflight_code"), true);
  assert.equal(json.includes("OPENAI_API_KEY"), false);
  assert.equal(json.includes("stack trace"), false);

  const completed = buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-mvp61" },
    actions: [action(), action({ id: "00000000-0000-4000-8000-000000000100", mode: "shadow_publish", status: "shadow_publish_completed", updated_at: "2026-08-10T08:30:01.000Z" })],
  });
  assert.equal(runbookEntry(completed, "AUDIT_SHADOW_PUBLISH_COMPLETED")?.severity, "info");
});
