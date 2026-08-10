import assert from "node:assert/strict";
import test from "node:test";

import {
  SingleSitePublishOperatorReadonlyProjectionRepository,
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
  assert.equal(model.nextAction, "refresh_launch_readiness");
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
  assert.equal(queries.length, 3);
  assert.equal(queries.every((sql) => sql.trim().toLowerCase().startsWith("select")), true);
  assert.equal(queries.some((sql) => /\binsert\b|\bupdate\b|\bdelete\b|\bcreate\b/i.test(sql)), false);
});
