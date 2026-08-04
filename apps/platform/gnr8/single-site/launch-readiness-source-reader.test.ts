import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAUNCH_READINESS_SOURCE_DIMENSIONS,
  SingleSiteLaunchReadinessSourceReader,
  hashLaunchReadinessStableValue,
  type ReadSingleSiteLaunchReadinessSourcesInput,
} from "./launch-readiness-source-reader";
import type {
  LaunchReadinessApprovalSourceRow,
  LaunchReadinessClientApprovalSourceRow,
  LaunchReadinessContentApprovalSourceRow,
  LaunchReadinessDdomRefSourceRow,
  LaunchReadinessDdomSnapshotSourceRow,
  LaunchReadinessImprovedReviewSourceRow,
  LaunchReadinessMigrationRefSourceRow,
  LaunchReadinessPublishTargetSourceRow,
  LaunchReadinessRuntimeArtifactSourceRow,
  LaunchReadinessRuntimeSiteVersionSourceRow,
  LaunchReadinessSourceReadClient,
  LaunchReadinessSourceReadRepositoryLike,
} from "./launch-readiness-source-read-repository";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_READER_PATH = path.join(TEST_DIR, "launch-readiness-source-reader.ts");
const SOURCE_REPOSITORY_PATH = path.join(TEST_DIR, "launch-readiness-source-read-repository.ts");
const capturedAt = "2026-08-04T10:00:00.000Z";

type FakeRows = {
  launch: LaunchReadinessApprovalSourceRow | null;
  content: LaunchReadinessContentApprovalSourceRow | null;
  client: LaunchReadinessClientApprovalSourceRow | null;
  improvedReview: LaunchReadinessImprovedReviewSourceRow | null;
  siteVersion: LaunchReadinessRuntimeSiteVersionSourceRow | null;
  artifact: LaunchReadinessRuntimeArtifactSourceRow | null;
  publishTarget: LaunchReadinessPublishTargetSourceRow | null;
  ddom: LaunchReadinessDdomSnapshotSourceRow | null;
  ddomRefs: LaunchReadinessDdomRefSourceRow[];
  migrationRefs: LaunchReadinessMigrationRefSourceRow[];
};

class FakeRepository implements LaunchReadinessSourceReadRepositoryLike {
  readonly calls: string[] = [];

  constructor(readonly rows: FakeRows, readonly fail = false) {}

  async withReadOnlyTransaction<T>(fn: (client: LaunchReadinessSourceReadClient, capturedAt: string) => Promise<T>): Promise<T> {
    this.calls.push("withReadOnlyTransaction");
    if (this.fail) throw new Error("boom");
    return fn({ async query() { return { rows: [], rowCount: 0 }; } }, capturedAt);
  }

  async readLaunchApproval(): Promise<LaunchReadinessApprovalSourceRow | null> {
    this.calls.push("readLaunchApproval");
    return this.rows.launch;
  }

  async readContentApproval(): Promise<LaunchReadinessContentApprovalSourceRow | null> {
    this.calls.push("readContentApproval");
    return this.rows.content;
  }

  async readClientApproval(): Promise<LaunchReadinessClientApprovalSourceRow | null> {
    this.calls.push("readClientApproval");
    return this.rows.client;
  }

  async readImprovedVersionReview(): Promise<LaunchReadinessImprovedReviewSourceRow | null> {
    this.calls.push("readImprovedVersionReview");
    return this.rows.improvedReview;
  }

  async readRuntimeSiteVersion(): Promise<LaunchReadinessRuntimeSiteVersionSourceRow | null> {
    this.calls.push("readRuntimeSiteVersion");
    return this.rows.siteVersion;
  }

  async readRuntimeArtifact(): Promise<LaunchReadinessRuntimeArtifactSourceRow | null> {
    this.calls.push("readRuntimeArtifact");
    return this.rows.artifact;
  }

  async readPublishTarget(): Promise<LaunchReadinessPublishTargetSourceRow | null> {
    this.calls.push("readPublishTarget");
    return this.rows.publishTarget;
  }

  async readLatestDdomSnapshot(): Promise<LaunchReadinessDdomSnapshotSourceRow | null> {
    this.calls.push("readLatestDdomSnapshot");
    return this.rows.ddom;
  }

  async readDdomRefs(): Promise<LaunchReadinessDdomRefSourceRow[]> {
    this.calls.push("readDdomRefs");
    return this.rows.ddomRefs;
  }

  async readMigrationRefs(): Promise<LaunchReadinessMigrationRefSourceRow[]> {
    this.calls.push("readMigrationRefs");
    return this.rows.migrationRefs;
  }
}

function input(overrides: Partial<ReadSingleSiteLaunchReadinessSourcesInput> = {}): ReadSingleSiteLaunchReadinessSourcesInput {
  return {
    tenantId: "tenant-test",
    clientId: "11111111-1111-4111-8111-111111111111",
    siteId: "22222222-2222-4222-8222-222222222222",
    migrationId: "33333333-3333-4333-8333-333333333333",
    improvedCandidateSiteVersionRef: "44444444-4444-4444-8444-444444444444",
    improvedRuntimeArtifactRef: "55555555-5555-4555-8555-555555555555",
    launchApprovalDecisionRef: "launch-aaf-decision",
    actor: { actorType: "system", actorId: "reader-test", actorRole: "test" },
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    policy: {
      clientApprovalRequired: true,
      billingSubscriptionRequired: false,
      hostingEntitlementRequired: false,
      rollbackReadinessRequired: false,
      previewSmokeQaRequired: false,
    },
    ...overrides,
  };
}

function launch(overrides: Partial<LaunchReadinessApprovalSourceRow> = {}): LaunchReadinessApprovalSourceRow {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    migration_id: "33333333-3333-4333-8333-333333333333",
    client_id: "11111111-1111-4111-8111-111111111111",
    site_id: "22222222-2222-4222-8222-222222222222",
    content_approval_id: "77777777-7777-4777-8777-777777777777",
    content_approval_status: "approved",
    aaf_content_approval_decision_id: "content-aaf-decision",
    require_client_approval: true,
    client_approval_id: "88888888-8888-4888-8888-888888888888",
    client_approval_status: "approved",
    aaf_client_approval_decision_id: "client-aaf-decision",
    improved_version_review_id: "99999999-9999-4999-8999-999999999999",
    improved_version_review_status: "accepted",
    improved_candidate_site_version_ref: "44444444-4444-4444-8444-444444444444",
    improved_runtime_artifact_ref: "55555555-5555-4555-8555-555555555555",
    domain_readiness_ref: null,
    billing_hosting_entitlement_ref: null,
    rollback_readiness_ref: null,
    publish_target_ref: "production",
    status: "approved",
    decision: "approve",
    readiness_work_ready: true,
    approved_with_limitations: false,
    aaf_launch_approval_request_id: "launch-aaf-request",
    aaf_launch_approval_decision_id: "launch-aaf-decision",
    aaf_launch_approval_scope: "single_site_launch_approval",
    aaf_launch_approval_action: "approve_single_site_launch_readiness",
    aaf_launch_approval_subject_type: "single_site_launch_readiness_review",
    evidence_package_refs_json: [],
    launch_checklist_refs_json: [],
    blocker_refs_json: [],
    smoke_qa_refs_json: [{ runId: "smoke-ok", status: "passed" }],
    limitations_json: [],
    findings_summary_json: {},
    decision_summary_json: {},
    semantic_watermark: "wm-launch",
    payload_hash: "hash-launch",
    created_at: "2026-08-04T08:00:00.000Z",
    updated_at: "2026-08-04T09:00:00.000Z",
    ...overrides,
  };
}

function content(overrides: Partial<LaunchReadinessContentApprovalSourceRow> = {}): LaunchReadinessContentApprovalSourceRow {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    migration_id: "33333333-3333-4333-8333-333333333333",
    client_id: "11111111-1111-4111-8111-111111111111",
    site_id: "22222222-2222-4222-8222-222222222222",
    improved_version_review_id: "99999999-9999-4999-8999-999999999999",
    improved_version_review_status: "accepted",
    improved_candidate_site_version_ref: "44444444-4444-4444-8444-444444444444",
    improved_runtime_artifact_ref: "55555555-5555-4555-8555-555555555555",
    status: "approved",
    decision: "approve",
    content_approval_ready: true,
    approved_with_limitations: false,
    aaf_content_approval_request_id: "content-aaf-request",
    aaf_content_approval_decision_id: "content-aaf-decision",
    aaf_content_approval_scope: "single_site_content_approval",
    aaf_content_approval_action: "approve_single_site_content",
    aaf_content_approval_subject_type: "single_site_improved_version_review",
    evidence_package_refs_json: [],
    rendered_snapshot_refs_json: [],
    content_snapshot_refs_json: [],
    metadata_snapshot_refs_json: [],
    caveat_refs_json: [],
    limitations_json: [],
    unresolved_not_applied_recommendations_json: [],
    findings_summary_json: {},
    semantic_watermark: "wm-content",
    payload_hash: "hash-content",
    created_at: "2026-08-04T08:00:00.000Z",
    updated_at: "2026-08-04T09:01:00.000Z",
    ...overrides,
  };
}

function client(overrides: Partial<LaunchReadinessClientApprovalSourceRow> = {}): LaunchReadinessClientApprovalSourceRow {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    migration_id: "33333333-3333-4333-8333-333333333333",
    client_id: "11111111-1111-4111-8111-111111111111",
    site_id: "22222222-2222-4222-8222-222222222222",
    content_approval_id: "77777777-7777-4777-8777-777777777777",
    content_approval_status: "approved",
    aaf_content_approval_decision_id: "content-aaf-decision",
    improved_version_review_id: "99999999-9999-4999-8999-999999999999",
    improved_version_review_status: "accepted",
    improved_candidate_site_version_ref: "44444444-4444-4444-8444-444444444444",
    improved_runtime_artifact_ref: "55555555-5555-4555-8555-555555555555",
    status: "approved",
    decision: "approve",
    client_approval_ready: true,
    approved_with_limitations: false,
    aaf_client_approval_request_id: "client-aaf-request",
    aaf_client_approval_decision_id: "client-aaf-decision",
    aaf_client_approval_scope: "single_site_client_approval",
    aaf_client_approval_action: "approve_single_site_client_acceptance",
    aaf_client_approval_subject_type: "single_site_improved_candidate_client_acceptance",
    evidence_package_refs_json: [],
    rendered_snapshot_refs_json: [],
    client_facing_summary_refs_json: [],
    limitations_json: [],
    deferred_or_not_applied_recommendation_refs_json: [],
    findings_summary_json: {},
    semantic_watermark: "wm-client",
    payload_hash: "hash-client",
    created_at: "2026-08-04T08:00:00.000Z",
    updated_at: "2026-08-04T09:02:00.000Z",
    ...overrides,
  };
}

function improvedReview(overrides: Partial<LaunchReadinessImprovedReviewSourceRow> = {}): LaunchReadinessImprovedReviewSourceRow {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    migration_id: "33333333-3333-4333-8333-333333333333",
    client_id: "11111111-1111-4111-8111-111111111111",
    site_id: "22222222-2222-4222-8222-222222222222",
    improved_candidate_site_version_ref: "44444444-4444-4444-8444-444444444444",
    improved_runtime_artifact_ref: "55555555-5555-4555-8555-555555555555",
    review_status: "accepted",
    review_decision: "accept",
    content_approval_ready: true,
    accepted_with_limitations: false,
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    diagnostics_json: {},
    semantic_watermark: "wm-review",
    payload_hash: "hash-review",
    created_at: "2026-08-04T08:00:00.000Z",
    updated_at: "2026-08-04T09:03:00.000Z",
    ...overrides,
  };
}

function siteVersion(overrides: Partial<LaunchReadinessRuntimeSiteVersionSourceRow> = {}): LaunchReadinessRuntimeSiteVersionSourceRow {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    site_id: "22222222-2222-4222-8222-222222222222",
    version_no: 3,
    state: "APPROVED",
    source: "migration",
    actor: "system",
    renderer_compatibility_version: "runtime-v1",
    import_provenance_summary: {},
    artifact_id: "55555555-5555-4555-8555-555555555555",
    created_at: "2026-08-04T08:30:00.000Z",
    updated_at: "2026-08-04T09:04:00.000Z",
    ...overrides,
  };
}

function artifact(overrides: Partial<LaunchReadinessRuntimeArtifactSourceRow> = {}): LaunchReadinessRuntimeArtifactSourceRow {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    site_id: "22222222-2222-4222-8222-222222222222",
    site_version_id: "44444444-4444-4444-8444-444444444444",
    renderer_compatibility_version: "runtime-v1",
    bundle_sha256: "bundle-ready",
    html_path_count: "2",
    asset_fingerprint_count: "4",
    manifest: { routes: ["/"] },
    publish_stage: "production",
    shadow_restricted: false,
    artifact_governance: { immutable: true },
    created_at: "2026-08-04T09:05:00.000Z",
    ...overrides,
  };
}

function target(overrides: Partial<LaunchReadinessPublishTargetSourceRow> = {}): LaunchReadinessPublishTargetSourceRow {
  return {
    id: "production",
    environment: "production",
    target_kind: "public_runtime",
    publish_stage: "production",
    status: "active",
    policy_version: "ptt-1",
    requires_aaf: true,
    requires_ddom_snapshot: true,
    requires_launch_signoff: true,
    allowed_artifact_stages: ["production"],
    limitations_json: {},
    source_watermark: "ptt-1:gnr8_publish_targets:production",
    created_at: "2026-08-04T08:00:00.000Z",
    updated_at: "2026-08-04T09:06:00.000Z",
    ...overrides,
  };
}

function ddom(overrides: Partial<LaunchReadinessDdomSnapshotSourceRow> = {}): LaunchReadinessDdomSnapshotSourceRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    tenant_id: "tenant-test",
    client_id: "11111111-1111-4111-8111-111111111111",
    site_id: "22222222-2222-4222-8222-222222222222",
    site_version_id: "44444444-4444-4444-8444-444444444444",
    domain_binding_id: null,
    host_binding_id: null,
    domain: "example.test",
    internal_host: null,
    intended_launch_domain: "example.test",
    readiness_state: "ready",
    readiness_blockers: [],
    readiness_warnings: [],
    freshness_state: "fresh",
    fresh_until: "2026-08-04T12:00:00.000Z",
    stale_reason: null,
    captured_at: "2026-08-04T09:07:00.000Z",
    source_watermark: "ddom-ready-watermark",
    source_watermark_json: {},
    snapshot_json: {},
    created_at: "2026-08-04T09:07:01.000Z",
    ...overrides,
  };
}

function ddomRef(role: string, overrides: Partial<LaunchReadinessDdomRefSourceRow> = {}): LaunchReadinessDdomRefSourceRow {
  return {
    id: `ddom-ref-${role}`,
    snapshot_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ref_role: role,
    ref_type: role,
    source_system: "gnr8",
    source_table: `stored_${role}`,
    source_record_id: `stored-${role}`,
    source_version: "v1",
    source_watermark: `wm-${role}`,
    captured_at: "2026-08-04T09:07:00.000Z",
    metadata_json: {},
    created_at: "2026-08-04T09:07:01.000Z",
    ...overrides,
  };
}

function migrationRef(role: string, overrides: Partial<LaunchReadinessMigrationRefSourceRow> = {}): LaunchReadinessMigrationRefSourceRow {
  return {
    id: `migration-ref-${role}`,
    migration_id: "33333333-3333-4333-8333-333333333333",
    ref_role: role,
    ref_type: role,
    source_system: "gnr8",
    source_table: `stored_${role}`,
    source_record_id: `stored-${role}`,
    source_version: "v1",
    source_watermark: `wm-${role}`,
    semantic_watermark: null,
    content_hash: null,
    captured_at: "2026-08-04T09:08:00.000Z",
    fresh_until: "2026-08-04T12:00:00.000Z",
    evidence_only: true,
    metadata_json: {},
    created_at: "2026-08-04T09:08:01.000Z",
    ...overrides,
  };
}

function completeRows(overrides: Partial<FakeRows> = {}): FakeRows {
  return {
    launch: launch(),
    content: content(),
    client: client(),
    improvedReview: improvedReview(),
    siteVersion: siteVersion(),
    artifact: artifact(),
    publishTarget: target(),
    ddom: ddom(),
    ddomRefs: [ddomRef("manual_completion_evidence"), ddomRef("dns_instruction_snapshot"), ddomRef("vercel_snapshot")],
    migrationRefs: [migrationRef("subscription"), migrationRef("hosting_entitlement"), migrationRef("rollback_target"), migrationRef("pasr_shadow_result"), migrationRef("aaf_audit_event")],
    ...overrides,
  };
}

async function read(rows: Partial<FakeRows> = {}, inputOverrides: Partial<ReadSingleSiteLaunchReadinessSourcesInput> = {}) {
  const repo = new FakeRepository(completeRows(rows));
  const result = await new SingleSiteLaunchReadinessSourceReader(repo).readSingleSiteLaunchReadinessSources(input(inputOverrides));
  return { result, repo };
}

test("happy path returns every required dimension with deterministic source package flags", async () => {
  const { result } = await read();

  assert.deepEqual(Object.keys(result.dimensions).sort(), [...LAUNCH_READINESS_SOURCE_DIMENSIONS].sort());
  assert.equal(result.overallSourceStatus, "ready");
  assert.equal(result.freshnessStatus, "fresh");
  assert.equal(result.derivedOnly, true);
  assert.equal(result.mutatesSourceTruth, false);
  assert.equal(result.nonEnforcing, true);
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.publishActivationApproved, false);
  assert.equal(result.dimensions.launch_approval.status, "ready");
  assert.equal(result.dimensions.content_approval.status, "ready");
  assert.equal(result.dimensions.client_approval.status, "ready");
  assert.equal(result.dimensions.improved_candidate.status, "ready");
  assert.equal(result.dimensions.publish_target.status, "ready");
  assert.equal(result.dimensions.domain_readiness.status, "ready");
  assert.equal(result.dimensions.dns_operator_evidence.status, "ready");
  assert.equal(result.dimensions.vercel_custom_domain_ssl.status, "ready");
  assert.equal(result.dimensions.billing_subscription.status, "ready");
  assert.equal(result.dimensions.hosting_entitlement.status, "ready");
  assert.equal(result.dimensions.stripe_payment.status, "not_applicable");
  assert.equal(result.dimensions.rollback_readiness.status, "ready");
  assert.equal(result.dimensions.preview_smoke_qa.status, "ready");
  assert.equal(result.dimensions.audit_timeline.status, "ready");
  assert.equal(result.dimensions.pasr_shadow_diagnostics.status, "ready");
});

test("ready_with_limitations path aggregates approval and DDOM limitations", async () => {
  const { result } = await read({
    content: content({ status: "approved_with_limitations", decision: "approve_with_limitations", approved_with_limitations: true, limitations_json: ["copy_caveat"] }),
    client: client({ status: "approved_with_limitations", decision: "approve_with_limitations", approved_with_limitations: true, limitations_json: ["client_deferred_copy"] }),
    ddom: ddom({ readiness_state: "ready_with_warnings", readiness_warnings: ["dns_ttl_high"] }),
  });

  assert.equal(result.overallSourceStatus, "ready_with_limitations");
  assert.equal(result.dimensions.content_approval.status, "ready_with_limitations");
  assert.equal(result.dimensions.client_approval.status, "ready_with_limitations");
  assert.equal(result.dimensions.domain_readiness.status, "ready_with_limitations");
  assert.ok(result.limitations.includes("copy_caveat"));
  assert.ok(result.limitations.includes("domain_readiness_ready_with_warnings"));
  assert.ok(result.warnings.includes("dns_ttl_high"));
});

test("missing required launch approval blocks fail-closed source readiness while other truth can still be read", async () => {
  const { result } = await read({ launch: null });

  assert.equal(result.dimensions.launch_approval.status, "missing");
  assert.ok(result.blockerSummaries.includes("missing_required_launch_approval"));
  assert.equal(result.overallSourceStatus, "missing");
});

test("missing required content approval is explicit", async () => {
  const { result } = await read({ content: null });

  assert.equal(result.dimensions.content_approval.status, "missing");
  assert.ok(result.blockerSummaries.includes("missing_required_content_approval"));
});

test("required client approval missing blocks and client approval not required maps not_applicable", async () => {
  const required = await read({ client: null }, { policy: { ...input().policy, clientApprovalRequired: true } });
  assert.equal(required.result.dimensions.client_approval.status, "missing");
  assert.ok(required.result.blockerSummaries.includes("missing_required_client_approval"));

  const notRequired = await read({ client: null, launch: launch({ require_client_approval: false, client_approval_id: null, client_approval_status: null, aaf_client_approval_decision_id: null }) }, {
    policy: { ...input().policy, clientApprovalRequired: false },
  });
  assert.equal(notRequired.result.dimensions.client_approval.status, "not_applicable");
  assert.equal(notRequired.repo.calls.includes("readClientApproval"), false);
});

test("publish target missing, disabled, retired, stage mismatch, and disallowed artifact stage are blockers", async () => {
  assert.equal((await read({ publishTarget: null })).result.dimensions.publish_target.status, "missing");
  assert.ok((await read({ publishTarget: target({ status: "disabled" }) })).result.blockerSummaries.includes("disabled_publish_target"));
  assert.ok((await read({ publishTarget: target({ status: "retired" }) })).result.blockerSummaries.includes("retired_publish_target"));
  assert.ok((await read({ publishTarget: target({ publish_stage: "shadow" }) })).result.blockerSummaries.includes("publish_target_stage_mismatch"));
  assert.ok((await read({ publishTarget: target({ allowed_artifact_stages: ["shadow"] }) })).result.blockerSummaries.includes("artifact_stage_not_allowed_by_target"));
});

test("DDOM ready, stale, and missing snapshots map to expected launch readiness states", async () => {
  assert.equal((await read({ ddom: ddom({ readiness_state: "ready" }) })).result.dimensions.domain_readiness.status, "ready");

  const stale = await read({ ddom: ddom({ readiness_state: "stale", freshness_state: "stale", stale_reason: "expired" }) });
  assert.equal(stale.result.dimensions.domain_readiness.status, "stale");
  assert.ok(stale.result.staleSourceTruth.includes("domain_readiness"));
  assert.ok(stale.result.blockerSummaries.includes("domain_readiness_stale"));

  const missing = await read({ ddom: null, ddomRefs: [] });
  assert.equal(missing.result.dimensions.domain_readiness.status, "missing");
  assert.ok(missing.result.blockerSummaries.includes("missing_ddom_snapshot"));
});

test("missing billing and hosting source truth are explicit unsupported gaps", async () => {
  const { result } = await read({ migrationRefs: [migrationRef("rollback_target"), migrationRef("pasr_shadow_result")] }, {
    policy: { ...input().policy, billingSubscriptionRequired: true, hostingEntitlementRequired: true },
  });

  assert.equal(result.dimensions.billing_subscription.status, "missing");
  assert.equal(result.dimensions.hosting_entitlement.status, "missing");
  assert.ok(result.blockerSummaries.includes("missing_billing_subscription_source_truth"));
  assert.ok(result.blockerSummaries.includes("missing_site_scoped_hosting_entitlement_truth"));
  assert.ok(result.unsupportedSourceTruth.includes("site_scoped_billing_subscription_truth_absent"));
  assert.ok(result.unsupportedSourceTruth.includes("site_scoped_hosting_entitlement_truth_absent"));
});

test("missing rollback and smoke QA evidence are explicit when required", async () => {
  const { result } = await read({ migrationRefs: [migrationRef("subscription"), migrationRef("hosting_entitlement")], launch: launch({ smoke_qa_refs_json: [] }) }, {
    policy: { ...input().policy, rollbackReadinessRequired: true, previewSmokeQaRequired: true },
  });

  assert.equal(result.dimensions.rollback_readiness.status, "missing");
  assert.equal(result.dimensions.preview_smoke_qa.status, "missing");
  assert.ok(result.blockerSummaries.includes("missing_rollback_readiness_evidence"));
  assert.ok(result.blockerSummaries.includes("missing_preview_smoke_qa_evidence"));
});

test("PASR diagnostics are non-enforcing and do not block directly", async () => {
  const { result } = await read({ migrationRefs: [migrationRef("subscription"), migrationRef("hosting_entitlement"), migrationRef("rollback_target")] });

  assert.equal(result.dimensions.pasr_shadow_diagnostics.status, "unknown");
  assert.equal(result.dimensions.pasr_shadow_diagnostics.requiredForLaunchReadiness, false);
  assert.equal(result.overallSourceStatus, "ready_with_limitations");
  assert.equal(result.blockerSummaries.includes("pasr_shadow_diagnostics_missing"), false);
  assert.equal(result.limitations.includes("pasr_shadow_diagnostics_missing"), true);
});

test("deterministic watermarks exclude actor/correlation/idempotency read trace", async () => {
  const first = await read();
  const second = await read({}, {
    actor: { actorType: "human", actorId: "different-actor", actorRole: "operator" },
    correlationId: "corr-different",
    idempotencyKey: "idem-different",
  });

  assert.equal(first.result.semanticSourceWatermark, second.result.semanticSourceWatermark);
  assert.equal(hashLaunchReadinessStableValue({ b: 2, a: 1 }), hashLaunchReadinessStableValue({ a: 1, b: 2 }));
});

test("read failure fails closed and does not mark readiness ready", async () => {
  const repo = new FakeRepository(completeRows(), true);
  const result = await new SingleSiteLaunchReadinessSourceReader(repo).readSingleSiteLaunchReadinessSources(input());

  assert.equal(result.overallSourceStatus, "blocked");
  assert.equal(result.diagnostics.failClosed, true);
  assert.ok(result.blockerSummaries.includes("launch_readiness_source_reader_failed_closed"));
});

test("source reader and repository do not contain source-truth mutation statements or provider calls", () => {
  const source = `${fs.readFileSync(SOURCE_READER_PATH, "utf8")}\n${fs.readFileSync(SOURCE_REPOSITORY_PATH, "utf8")}`;

  assert.doesNotMatch(source, /\binsert\s+into\s+public\.gnr8_single_site_launch_readiness_/i);
  assert.doesNotMatch(source, /\bupdate\s+public\.gnr8_single_site_launch_readiness_/i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\.gnr8_single_site_launch_readiness_/i);
  assert.doesNotMatch(source, /\bgnr8_ddom_readiness_snapshot_writer\b|manual.*snapshot.*trigger/i);
  assert.doesNotMatch(source, /\bcreateEvidencePackage\b|\bcreateApprovalRequest\b|\bcreateGateAttempt\b/i);
  assert.doesNotMatch(source, /\bvercelFetch\b|\bopenprovider\b|\bresolveTxt\b|\bresolveCname\b|\bStripe\b|\bfetch\s*\(/i);
  assert.doesNotMatch(source, /\bactivate\b|\bpublishActivation\b|\bswitchActivePointer\b|\brollbackSwitch\b/i);
});
