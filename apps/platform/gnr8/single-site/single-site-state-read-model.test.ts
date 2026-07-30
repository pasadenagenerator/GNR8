import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSingleSiteMigrationReadModel,
  type SingleSiteMigrationReadRepositorySnapshot,
  type SingleSiteRawBlockerRow,
} from "./single-site-state-read-model";
import type {
  SingleSiteCloneReviewItemRow,
  SingleSiteCloneReviewRefRow,
  SingleSiteCloneReviewRow,
  SingleSiteMigrationRefRow,
  SingleSiteMigrationRow,
  SingleSiteSourceEvidenceReviewRow,
} from "./single-site-state-writer-repository";
import type { SingleSiteMigrationState } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const CLONE_REVIEW_ID = "66666666-6666-4666-8666-666666666666";

function migration(state: SingleSiteMigrationState, overrides: Partial<SingleSiteMigrationRow> = {}): SingleSiteMigrationRow {
  const now = "2026-07-29T12:00:00.000Z";
  return {
    id: MIGRATION_ID,
    tenant_id: "tenant-read-model",
    client_id: "33333333-3333-4333-8333-333333333333",
    site_id: "44444444-4444-4444-8444-444444444444",
    ownership_site_id: null,
    runtime_site_id: null,
    site_version_id: null,
    runtime_site_version_id: null,
    source_url: "https://example.test",
    canonical_source_url: "https://example.test/",
    intended_launch_domain: "example.test",
    current_state: state,
    current_stage:
      state === "migration_closed_out" || state === "migration_failed" || state === "migration_cancelled"
        ? "terminal"
        : state === "source_evidence_review_required"
          ? "source_evidence_review"
          : state.startsWith("source_capture")
            ? "source_capture"
            : state.startsWith("clone")
              ? "clone"
              : state.startsWith("improvement_proposal")
                ? "proposal"
                : state.startsWith("improvement_") || state.startsWith("improved_") || state.startsWith("content_")
                  ? "improvement_content"
                  : state.startsWith("domain_") || state.startsWith("subscription") || state === "hosting_entitlement_ready"
                    ? "domain_commercial_readiness"
                    : state === "launch_approval_required" || state === "publish_ready" || state === "published" || state === "rollback_available"
                      ? "launch_publish_recovery"
                      : "intake",
    state_version: 1,
    operator_owner_actor_id: null,
    current_blocker_count: 0,
    latest_source_evidence_review_id: null,
    latest_state_event_id: null,
    latest_aaf_evidence_package_id: null,
    latest_aaf_audit_event_id: null,
    source_capture_refs_json: {},
    runtime_refs_json: {},
    proposal_refs_json: {},
    aaf_approval_refs_json: {},
    aaf_evidence_refs_json: {},
    aaf_audit_refs_json: {},
    ddom_snapshot_refs_json: {},
    ptt_publish_target_refs_json: {},
    billing_subscription_refs_json: {},
    hosting_entitlement_refs_json: {},
    rollback_refs_json: {},
    closeout_refs_json: {},
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    source_watermark: null,
    payload_hash: null,
    validation_site_number: null,
    created_by_actor_type: "human",
    created_by_actor_id: "operator",
    created_by_actor_display_label: null,
    correlation_id: "corr-read-model",
    causation_id: null,
    idempotency_key: "idem-read-model",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    terminal_at: state === "migration_closed_out" || state === "migration_failed" || state === "migration_cancelled" ? now : null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function review(overrides: Partial<SingleSiteSourceEvidenceReviewRow> = {}): SingleSiteSourceEvidenceReviewRow {
  const now = "2026-07-29T12:00:00.000Z";
  return {
    id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    tenant_id: "tenant-read-model",
    client_id: "33333333-3333-4333-8333-333333333333",
    site_id: "44444444-4444-4444-8444-444444444444",
    ownership_site_id: null,
    runtime_site_id: null,
    site_version_id: null,
    source_url: "https://example.test",
    canonical_source_url: null,
    capture_run_id: "capture-1",
    render_job_id: null,
    source_evidence_package_key: "package-1",
    source_watermark: "watermark-1",
    source_hash: null,
    capture_started_at: now,
    capture_completed_at: now,
    evidence_captured_at: now,
    fresh_until: null,
    completeness_status: "complete",
    review_status: "ready_for_review",
    review_decision: null,
    accepted_degraded_capture: false,
    retry_required: false,
    clone_generation_allowed: false,
    review_limitations_json: [],
    missing_evidence_json: [],
    warnings_json: [],
    blockers_json: [],
    diagnostics_json: {},
    reviewer_actor_type: null,
    reviewer_actor_id: null,
    reviewer_actor_role: null,
    reviewer_actor_display_label: null,
    review_started_at: null,
    reviewed_at: null,
    supersedes_review_id: null,
    superseded_by_review_id: null,
    aaf_evidence_package_id: null,
    aaf_approval_request_id: null,
    aaf_approval_decision_id: null,
    aaf_audit_event_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    correlation_id: "corr-review",
    causation_id: null,
    idempotency_key: "idem-review",
    request_id: null,
    metadata_json: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function migrationRef(role: SingleSiteMigrationRefRow["ref_role"], sourceRecordId = `${role}-1`): SingleSiteMigrationRefRow {
  return {
    id: `${role}-ref`,
    migration_id: MIGRATION_ID,
    state_event_id: null,
    ref_role: role,
    ref_type: role,
    source_system: "gnr8",
    source_table: null,
    source_record_id: sourceRecordId,
    source_version: null,
    source_watermark: null,
    payload_hash: null,
    captured_at: null,
    fresh_until: null,
    superseded_by_ref_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    correlation_id: "corr-ref",
    idempotency_key: `idem-ref-${role}`,
    metadata_json: {},
    created_at: "2026-07-29T12:00:00.000Z",
  };
}

function cloneReview(overrides: Partial<SingleSiteCloneReviewRow> = {}): SingleSiteCloneReviewRow {
  const now = "2026-07-29T12:00:00.000Z";
  return {
    id: CLONE_REVIEW_ID,
    migration_id: MIGRATION_ID,
    client_id: "33333333-3333-4333-8333-333333333333",
    site_id: "44444444-4444-4444-8444-444444444444",
    clone_site_version_ref: "clone-version-1",
    runtime_artifact_ref: "runtime-artifact-1",
    source_evidence_review_id: REVIEW_ID,
    clone_generation_ref: "clone-generation-1",
    clone_generation_event_id: null,
    review_status: "draft",
    review_decision: null,
    proposal_planning_allowed: false,
    retry_required: false,
    accepted_with_limitations: false,
    fidelity_summary_json: {},
    limitations_json: [],
    warnings_json: [],
    blockers_json: [],
    diagnostics_json: {},
    reviewer_actor_type: null,
    reviewer_actor_id: null,
    reviewer_actor_role: null,
    reviewer_actor_display_label: null,
    review_started_at: null,
    reviewed_at: null,
    supersedes_review_id: null,
    superseded_by_review_id: null,
    correlation_id: "corr-clone-review",
    causation_id: null,
    idempotency_key: "idem-clone-review",
    request_id: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function cloneFinding(overrides: Partial<SingleSiteCloneReviewItemRow> = {}): SingleSiteCloneReviewItemRow {
  const now = "2026-07-29T12:00:00.000Z";
  return {
    id: "clone-finding-1",
    review_id: CLONE_REVIEW_ID,
    migration_id: MIGRATION_ID,
    item_key: "layout-header",
    fidelity_category: "layout",
    severity: "p2_minor",
    status: "open",
    blocks_acceptance: false,
    accepted_limitation: false,
    finding_summary: "Header spacing differs slightly",
    ref_ids_json: [],
    limitation_json: {},
    details_json: {},
    reviewer_actor_type: "human",
    reviewer_actor_id: "operator",
    reviewer_actor_display_label: null,
    correlation_id: "corr-clone-finding",
    idempotency_key: "idem-clone-finding",
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    metadata_json: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function cloneRef(role: SingleSiteCloneReviewRefRow["ref_role"], sourceRecordId = `${role}-1`): SingleSiteCloneReviewRefRow {
  return {
    id: `${role}-clone-ref`,
    review_id: CLONE_REVIEW_ID,
    migration_id: MIGRATION_ID,
    ref_role: role,
    ref_type: role,
    source_system: "gnr8",
    source_table: null,
    source_record_id: sourceRecordId,
    source_version: null,
    source_watermark: null,
    content_hash: null,
    media_type: null,
    captured_at: null,
    fresh_until: null,
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    correlation_id: "corr-clone-ref",
    idempotency_key: `idem-clone-ref-${role}`,
    metadata_json: {},
    created_at: "2026-07-29T12:00:00.000Z",
  };
}

function blocker(overrides: Partial<SingleSiteRawBlockerRow> = {}): SingleSiteRawBlockerRow {
  return {
    id: "blocker-1",
    migration_id: MIGRATION_ID,
    state_event_id: null,
    blocker_key: "source-evidence-missing",
    blocker_type: "source_evidence_missing",
    severity: "p1",
    status: "open",
    owner_role: "migration_operator",
    opened_at: "2026-07-29T12:00:00.000Z",
    resolved_at: null,
    resolution_state_event_id: null,
    resolution_aaf_audit_event_id: null,
    resolution_aaf_approval_decision_id: null,
    source_ref_json: {},
    details_json: { reason: "missing screenshot" },
    ops_inbox_projection_key: null,
    correlation_id: "corr-blocker",
    idempotency_key: "idem-blocker",
    privacy_label: "client_confidential",
    retention_class: "compliance_long",
    created_at: "2026-07-29T12:00:00.000Z",
    updated_at: "2026-07-29T12:00:00.000Z",
    ...overrides,
  };
}

function snapshot(state: SingleSiteMigrationState, overrides: Partial<SingleSiteMigrationReadRepositorySnapshot> = {}): SingleSiteMigrationReadRepositorySnapshot {
  const header = overrides.migration ?? migration(state);
  return {
    capturedAt: "2026-07-29T12:00:00.000Z",
    migration: header,
    stateEvents: [
      {
        id: "event-1",
        migration_id: MIGRATION_ID,
        event_index: 1,
        from_state: null,
        to_state: "site_candidate_created",
        from_stage: null,
        to_stage: "intake",
        transition_key: "migration.created",
        transition_reason: null,
        required_refs_json: {},
        missing_requirements_json: [],
        before_ref_json: {},
        after_ref_json: {},
        actor_type: "human",
        actor_id: "operator",
        actor_role: "migration_operator",
        actor_display_label: null,
        aaf_audit_event_id: null,
        aaf_evidence_package_id: null,
        aaf_approval_request_id: null,
        aaf_approval_decision_id: null,
        source_watermark: null,
        payload_hash: null,
        correlation_id: "corr-event",
        causation_id: null,
        idempotency_key: "idem-event",
        request_id: null,
        privacy_label: "client_confidential",
        retention_class: "compliance_long",
        metadata_json: {},
        occurred_at: "2026-07-29T12:00:00.000Z",
        created_at: "2026-07-29T12:00:00.000Z",
      },
    ],
    refs: [],
    stageSummaries: [],
    blockers: [],
    closeout: null,
    sourceEvidenceReviews: [],
    latestSourceEvidenceReview: null,
    sourceEvidenceItems: [],
    sourceEvidenceRefs: [],
    sourceEvidenceEvents: [],
    cloneReviews: [],
    latestCloneReview: null,
    cloneReviewItems: [],
    cloneReviewRefs: [],
    cloneReviewEvents: [],
    ...overrides,
  };
}

function model(state: SingleSiteMigrationState, overrides: Partial<SingleSiteMigrationReadRepositorySnapshot> = {}) {
  return buildSingleSiteMigrationReadModel(snapshot(state, overrides));
}

test("new migration recommends start capture and preserves boundary flags", () => {
  const readModel = model("site_candidate_created");
  assert.equal(readModel.recommendedNextAction.actionKey, "start_capture");
  assert.equal(readModel.derivedOnly, true);
  assert.equal(readModel.sourceTruth, "gnr8_single_site_state_spine");
  assert.equal(readModel.mutatesSourceTruth, false);
  assert.equal(readModel.nonEnforcing, true);
});

test("capture completed with no evidence review recommends source evidence review", () => {
  assert.equal(model("source_capture_completed").recommendedNextAction.actionKey, "review_source_evidence");
});

test("accepted source evidence recommends clone generation", () => {
  const latest = review({ review_status: "accepted", review_decision: "accept", clone_generation_allowed: true, reviewed_at: "2026-07-29T12:00:00.000Z" });
  const readModel = model("source_evidence_review_required", {
    migration: migration("source_evidence_review_required", { latest_source_evidence_review_id: REVIEW_ID }),
    sourceEvidenceReviews: [latest],
    latestSourceEvidenceReview: latest,
    refs: [migrationRef("source_evidence_review"), migrationRef("source_evidence_package")],
  });
  assert.equal(readModel.recommendedNextAction.actionKey, "start_clone_generation");
  assert.equal(readModel.workflowReadiness.cloneGenerationAllowed, true);
});

test("evidence accepted with limitations preserves limitations", () => {
  const latest = review({
    review_status: "accepted_with_limitations",
    review_decision: "accept_with_limitations",
    accepted_degraded_capture: true,
    clone_generation_allowed: true,
    review_limitations_json: [{ category: "font", reason: "remote font blocked" }],
    aaf_approval_decision_id: "55555555-5555-4555-8555-555555555555",
    reviewed_at: "2026-07-29T12:00:00.000Z",
  });
  const readModel = model("source_evidence_review_required", {
    migration: migration("source_evidence_review_required", { latest_source_evidence_review_id: REVIEW_ID }),
    sourceEvidenceReviews: [latest],
    latestSourceEvidenceReview: latest,
  });
  assert.equal(readModel.sourceEvidenceReview.acceptedWithLimitations, true);
  assert.deepEqual(readModel.sourceEvidenceReview.limitations, [{ category: "font", reason: "remote font blocked" }]);
});

test("state-specific next actions are projected without enforcing transitions", () => {
  assert.equal(model("clone_review_required").recommendedNextAction.actionKey, "review_clone");
  assert.equal(model("improvement_proposal_ready").recommendedNextAction.actionKey, "approve_or_reject_proposal");
  assert.equal(model("domain_readiness_required").recommendedNextAction.actionKey, "prepare_domain_readiness");
  assert.equal(model("subscription_required").recommendedNextAction.actionKey, "prepare_subscription_hosting");
  assert.equal(model("publish_ready", { refs: [migrationRef("publish_target"), migrationRef("rollback_target"), migrationRef("aaf_approval_decision")] }).recommendedNextAction.actionKey, "prepare_publish");
  assert.equal(model("published").recommendedNextAction.actionKey, "confirm_rollback_readiness");
  assert.equal(model("rollback_available").recommendedNextAction.actionKey, "close_out_migration");
});

test("clone review projection gates proposal readiness and carries limitations", () => {
  const accepted = cloneReview({
    review_status: "accepted_with_limitations",
    review_decision: "accept_with_limitations",
    proposal_planning_allowed: true,
    accepted_with_limitations: true,
    limitations_json: [{ category: "font", reason: "accepted fallback" }],
    reviewed_at: "2026-07-29T12:00:00.000Z",
  });
  const readModel = model("clone_review_required", {
    cloneReviews: [accepted],
    latestCloneReview: accepted,
    cloneReviewItems: [cloneFinding()],
    cloneReviewRefs: [cloneRef("runtime_site_version_clone"), cloneRef("runtime_artifact_clone"), cloneRef("source_evidence_review")],
    refs: [migrationRef("clone_review", CLONE_REVIEW_ID)],
  });
  assert.equal(readModel.cloneReview.reviewStatus, "accepted_with_limitations");
  assert.equal(readModel.cloneReview.findingCountsBySeverity.p2_minor, 1);
  assert.equal(readModel.cloneReview.findingCountsByCategory.layout, 1);
  assert.deepEqual(readModel.cloneReview.limitations, [{ category: "font", reason: "accepted fallback" }]);
  assert.equal(readModel.cloneReview.cloneAcceptanceReady, true);
  assert.equal(readModel.workflowReadiness.cloneProposalPlanningAllowed, true);
  assert.equal(readModel.recommendedNextAction.actionKey, "prepare_improvement_proposal_with_limitations");
});

test("retry and rejected clone reviews block proposal planning", () => {
  const retry = cloneReview({ review_status: "retry_required", review_decision: "retry_clone", retry_required: true, reviewed_at: "2026-07-29T12:00:00.000Z" });
  const rejected = cloneReview({ review_status: "rejected", review_decision: "reject_clone", reviewed_at: "2026-07-29T12:00:00.000Z" });
  assert.equal(model("clone_review_required", { cloneReviews: [retry], latestCloneReview: retry }).recommendedNextAction.actionKey, "retry_clone_generation");
  assert.equal(model("clone_review_required", { cloneReviews: [rejected], latestCloneReview: rejected }).recommendedNextAction.actionKey, "resolve_clone_blockers");
});

test("closed out, failed, and cancelled states are terminal", () => {
  const closed = model("migration_closed_out");
  const failed = model("migration_failed");
  const cancelled = model("migration_cancelled");
  assert.equal(closed.recommendedNextAction.actionKey, "no_action_required");
  assert.equal(closed.currentState.closedOut, true);
  assert.equal(failed.currentState.failed, true);
  assert.equal(failed.currentState.terminal, true);
  assert.equal(cancelled.currentState.cancelled, true);
  assert.equal(cancelled.currentState.terminal, true);
});

test("blockers affect severity and next action", () => {
  const readModel = model("source_evidence_review_required", { blockers: [blocker()] });
  assert.equal(readModel.blockers.openCount, 1);
  assert.equal(readModel.blockers.highestSeverity, "p1");
  assert.equal(readModel.recommendedNextAction.actionKey, "investigate_blocker");
  assert.equal(readModel.recommendedNextAction.blocksWorkflowProgress, true);
});

test("builder does not mutate input", () => {
  const input = snapshot("source_capture_completed", { blockers: [blocker()] });
  const before = JSON.stringify(input);
  buildSingleSiteMigrationReadModel(input);
  assert.equal(JSON.stringify(input), before);
});
