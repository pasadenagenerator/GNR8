import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSingleSiteMvpOperatorChecklist,
  deriveSingleSiteMvpNextOperation,
  readSingleSiteMvpOrchestrationStatus,
  type SingleSiteMvpOrchestrationInput,
} from "./single-site-mvp-orchestration-service";
import {
  buildSingleSitePublishOperatorReadonlyProjection,
  type SingleSitePublishOperatorReadonlyProjection,
} from "./single-site-publish-operator-readonly-projection";
import type { SingleSitePublishOperatorActionAuditRow } from "./single-site-publish-operator-action-audit";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";

const INPUT: SingleSiteMvpOrchestrationInput = {
  tenantId: "tenant-cutline-2",
  clientId: "client-cutline-2",
  siteId: "site-cutline-2",
  migrationId: "migration-cutline-2",
  correlationId: "corr-cutline-2",
  actor: { actorType: "human", actorId: "operator-cutline-2", actorRole: "platform_superadmin" },
};

function state(overrides: Partial<Record<string, unknown>> = {}): SingleSiteMigrationReadModel {
  const base = {
    readModelVersion: "mvp-7-single-site-state-read-model:v1",
    migration: {
      migrationId: "migration-cutline-2",
      tenantId: "tenant-cutline-2",
      clientId: "client-cutline-2",
      siteId: "site-cutline-2",
      runtimeSiteId: "runtime-site-cutline-2",
      sourceUrl: "https://source.example.test",
    },
    currentState: { state: "site_candidate_created", lifecycle: "active" },
    sourceEvidenceReview: {
      reviewId: null,
      reviewStatus: "missing",
      accepted: false,
      acceptedWithLimitations: false,
      retryRequired: false,
      rejected: false,
      blockers: [],
      warnings: [],
      limitations: [],
    },
    cloneReview: {
      reviewId: null,
      reviewStatus: "missing",
      cloneSiteVersionRef: null,
      runtimeArtifactRef: null,
      proposalPlanningAllowed: false,
      blockers: [],
      warnings: [],
      limitations: [],
    },
    improvementProposalPlanning: {
      latestProposalPlanId: null,
      proposalStatus: "not_started",
      implementationAuthorizationReady: false,
      implementationAuthorizationStatus: "not_required_yet",
      proposalReadiness: { approved: false },
      limitations: [],
    },
    improvementExecution: {
      latestExecutionAttemptId: null,
      executionStatus: "not_started",
      readinessFlags: { readyToStart: false },
      improvedCandidateRefs: { siteVersionRef: null, runtimeArtifactRef: null },
      limitationsCarriedForward: [],
    },
    improvedVersionReview: {
      latestReviewId: null,
      reviewStatus: "missing",
      reviewedCandidateSiteVersionRef: null,
      reviewedRuntimeArtifactRef: null,
      limitations: [],
    },
    contentApproval: { latestContentApprovalId: null, status: "missing", aafRefs: { decisionId: null }, unresolvedBlockerCount: 0, limitations: [] },
    clientApproval: { latestClientApprovalId: null, status: "missing", aafRefs: { decisionId: null }, unresolvedBlockerCount: 0, limitations: [] },
    launchApproval: { latestLaunchApprovalId: null, status: "missing", aafRefs: { decisionId: null }, unresolvedBlockerCount: 0, limitations: [] },
    blockers: { hasBlockingOpenIssue: false, items: [] },
    closeout: { present: false, closeoutId: null, finalUrl: null, exceptions: [] },
    freshness: { latestReviewWatermark: null },
    diagnostics: [],
    recommendedNextAction: { actionKey: "no_action" },
    ...overrides,
  };
  return base as unknown as SingleSiteMigrationReadModel;
}

function action(overrides: Partial<SingleSitePublishOperatorActionAuditRow> = {}): SingleSitePublishOperatorActionAuditRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tenant_id: "tenant-cutline-2",
    client_id: "client-cutline-2",
    site_id: "site-cutline-2",
    migration_id: "migration-cutline-2",
    mode: "dry_run",
    route_action_source: "api/gnr8/admin/single-site-publish/dry-run",
    actor_id: "operator-cutline-2",
    actor_type: "human",
    actor_role: "platform_superadmin",
    confirmation_marker: "operator-confirmation",
    candidate_site_version_ref: "gnr8:gnr8_runtime_site_versions:improved-version",
    runtime_artifact_ref: "gnr8:gnr8_runtime_artifacts:improved-artifact",
    publish_target_ref: "gnr8:gnr8_publish_targets:production",
    publish_stage: "shadow",
    publish_environment: "production",
    launch_readiness_evidence_ref: "aaf:evidence_package:evidence-cutline-2",
    publish_activation_request_ref: "aaf:approval_request:request-cutline-2",
    publish_activation_decision_ref: "aaf:approval_decision:decision-cutline-2",
    gate_attempt_result_ref: "aaf:gate_attempt:gate-cutline-2",
    handoff_watermark: "handoff-watermark-cutline-2",
    gate_input_watermark: `single-site-publish-activation-gate-input:${"a".repeat(64)}`,
    idempotency_key: "idem-cutline-2",
    correlation_id: "corr-cutline-2",
    semantic_fingerprint: "fingerprint-cutline-2",
    status: "dry_run_completed",
    result_summary_json: { ok: true, blockerCodes: [], warnings: [], limitationCodes: [], publishes: false, runtimeMutation: false },
    redacted_diagnostics_json: {},
    limitation_summary_json: {},
    error_summary_json: {},
    started_at: "2026-08-13T10:00:00.000Z",
    completed_at: "2026-08-13T10:00:01.000Z",
    created_at: "2026-08-13T10:00:00.000Z",
    updated_at: "2026-08-13T10:00:01.000Z",
    privacy_label: "internal_operational",
    retention_class: "compliance_long",
    ...overrides,
  };
}

function publishProjection(overrides: { blockedReadiness?: boolean; gateAllowed?: boolean; dryRun?: boolean; shadow?: boolean } = {}): SingleSitePublishOperatorReadonlyProjection {
  return buildSingleSitePublishOperatorReadonlyProjection({
    lookup: { migrationId: "migration-cutline-2", siteId: "site-cutline-2", candidateSiteVersionRef: "improved-version" },
    actions: [
      ...(overrides.dryRun ? [action()] : []),
      ...(overrides.shadow
        ? [
            action({
              id: "00000000-0000-4000-8000-000000000002",
              mode: "shadow_publish",
              route_action_source: "api/gnr8/admin/single-site-publish/shadow-publish",
              status: "shadow_publish_completed",
              idempotency_key: "idem-cutline-2-shadow",
              correlation_id: "corr-cutline-2-shadow",
              result_summary_json: { ok: true, blockerCodes: [], warnings: [], limitationCodes: [], publishMayHaveExecuted: true },
              updated_at: "2026-08-13T10:05:01.000Z",
            }),
          ]
        : []),
    ],
    sourceSnapshot: {
      launchReadinessRecord: { id: "readiness-cutline-2", status: overrides.blockedReadiness ? "blocked" : "ready", freshness_status: "fresh" },
      launchReadinessDimensions: overrides.blockedReadiness
        ? [{ dimension: "domain_readiness", dimension_status: "blocked", freshness_status: "fresh", required_for_launch_readiness: true }]
        : [],
      launchReadinessBlockers: overrides.blockedReadiness ? [{ severity: "p0_critical", category: "domain", status: "open", description: "domain missing" }] : [],
      launchReadinessEvidencePackage: { id: "evidence-cutline-2", status: "created", source_watermark: "wm:evidence-cutline-2" },
      publishActivationRequest: { id: "request-cutline-2", status: "requested", scope: "publish_activation", action_key: "publish.activation", subject_type: "site_version", subject_id: "improved-version" },
      publishActivationDecision: { id: "decision-cutline-2", status: "granted" },
      gateAttempt: overrides.gateAllowed
        ? { id: "gate-cutline-2", gate_result: "allowed", causation_id: `mvp44:single-site-publish-activation-gate-input:${"a".repeat(64)}` }
        : null,
      gatePolicyEvaluation: overrides.gateAllowed ? { blocker_codes: [], warning_codes: [] } : null,
      publishTarget: { id: "production" },
    },
    generatedAt: "2026-08-13T10:10:00.000Z",
  });
}

async function readWith(model: SingleSiteMigrationReadModel | null, projection: SingleSitePublishOperatorReadonlyProjection = buildSingleSitePublishOperatorReadonlyProjection({ lookup: { migrationId: "migration-cutline-2" }, actions: [] })) {
  return readSingleSiteMvpOrchestrationStatus(INPUT, {
    generatedAt: "2026-08-13T10:10:00.000Z",
    stateReader: {
      async readByMigrationId() {
        return model;
      },
      async listBySiteId() {
        return model ? [model] : [];
      },
      async listByClientId() {
        return model ? [model] : [];
      },
    },
    publishOperatorProjectionReader: {
      async read() {
        return projection;
      },
    },
  });
}

test("empty or no migration state starts at source capture", async () => {
  const status = await readWith(null);

  assert.equal(status.stateReadModel.available, false);
  assert.equal(status.nextOperation.key, "start_source_capture");
  assert.equal(status.steps[0]?.step, "source_capture");
  assert.equal(status.steps[0]?.status, "ready");
  assert.equal(status.boundary.readOnly, true);
  assert.equal(status.boundary.publishes, false);
});

test("captured source with missing evidence review recommends source evidence review", async () => {
  const status = await readWith(state({ currentState: { state: "source_capture_completed", lifecycle: "active" } }));

  assert.equal(status.steps.find((item) => item.step === "source_capture")?.status, "completed");
  assert.equal(status.steps.find((item) => item.step === "source_evidence_review")?.status, "ready");
  assert.equal(status.nextOperation.key, "review_source_evidence");
});

test("accepted clone with missing proposal recommends proposal planning", async () => {
  const status = await readWith(
    state({
      currentState: { state: "clone_review_required", lifecycle: "active" },
      sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
      cloneReview: {
        reviewId: "clone-review",
        reviewStatus: "accepted",
        cloneSiteVersionRef: "clone-version",
        runtimeArtifactRef: "clone-artifact",
        proposalPlanningAllowed: true,
        blockers: [],
        warnings: [],
        limitations: [],
      },
    }),
  );

  assert.equal(status.steps.find((item) => item.step === "clone_review")?.status, "completed");
  assert.equal(status.nextOperation.key, "start_proposal_planning");
});

test("accepted improved candidate with missing content approval recommends content approval", async () => {
  const status = await readWith(
    state({
      currentState: { state: "improved_version_review_required", lifecycle: "active" },
      sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
      cloneReview: { reviewId: "clone-review", reviewStatus: "accepted", cloneSiteVersionRef: "clone-version", runtimeArtifactRef: "clone-artifact", proposalPlanningAllowed: true, blockers: [], warnings: [], limitations: [] },
      improvementProposalPlanning: {
        latestProposalPlanId: "proposal-plan",
        proposalStatus: "approved",
        implementationAuthorizationReady: true,
        implementationAuthorizationStatus: "granted",
        proposalReadiness: { approved: true },
        limitations: [],
      },
      improvementExecution: {
        latestExecutionAttemptId: "execution",
        executionStatus: "completed",
        readinessFlags: { readyToStart: false },
        improvedCandidateRefs: { siteVersionRef: "improved-version", runtimeArtifactRef: "improved-artifact" },
        limitationsCarriedForward: [],
      },
      improvedVersionReview: {
        latestReviewId: "improved-review",
        reviewStatus: "accepted",
        reviewedCandidateSiteVersionRef: "improved-version",
        reviewedRuntimeArtifactRef: "improved-artifact",
        limitations: [],
      },
    }),
  );

  assert.equal(status.steps.find((item) => item.step === "improved_version_review")?.status, "completed");
  assert.equal(status.steps.find((item) => item.step === "content_approval")?.status, "ready");
  assert.equal(status.nextOperation.key, "request_content_approval");
});

test("launch approved but readiness blocked reports manual blocker before publish activation", async () => {
  const status = await readWith(
    state({
      currentState: { state: "publish_ready", lifecycle: "active" },
      sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
      cloneReview: { reviewId: "clone-review", reviewStatus: "accepted", cloneSiteVersionRef: "clone-version", runtimeArtifactRef: "clone-artifact", proposalPlanningAllowed: true, blockers: [], warnings: [], limitations: [] },
      improvementProposalPlanning: { latestProposalPlanId: "proposal-plan", proposalStatus: "approved", implementationAuthorizationReady: true, implementationAuthorizationStatus: "granted", proposalReadiness: { approved: true }, limitations: [] },
      improvementExecution: { latestExecutionAttemptId: "execution", executionStatus: "completed", readinessFlags: { readyToStart: false }, improvedCandidateRefs: { siteVersionRef: "improved-version", runtimeArtifactRef: "improved-artifact" }, limitationsCarriedForward: [] },
      improvedVersionReview: { latestReviewId: "improved-review", reviewStatus: "accepted", reviewedCandidateSiteVersionRef: "improved-version", reviewedRuntimeArtifactRef: "improved-artifact", limitations: [] },
      contentApproval: { latestContentApprovalId: "content", status: "approved", aafRefs: { decisionId: "content-decision" }, unresolvedBlockerCount: 0, limitations: [] },
      clientApproval: { latestClientApprovalId: "client", status: "approved", aafRefs: { decisionId: "client-decision" }, unresolvedBlockerCount: 0, limitations: [] },
      launchApproval: { latestLaunchApprovalId: "launch", status: "approved", aafRefs: { decisionId: "launch-decision" }, unresolvedBlockerCount: 0, limitations: [] },
    }),
    publishProjection({ blockedReadiness: true }),
  );

  assert.equal(status.steps.find((item) => item.step === "launch_readiness")?.status, "blocked");
  assert.equal(status.nextOperation.key, "blocked_manual_resolution_required");
});

test("allowed gate with no dry-run recommends operator dry-run", async () => {
  const status = await readWith(lateStageState(), publishProjection({ gateAllowed: true }));

  assert.equal(status.steps.find((item) => item.step === "publish_activation_gate")?.status, "completed");
  assert.equal(status.steps.find((item) => item.step === "operator_dry_run")?.status, "ready");
  assert.equal(status.nextOperation.key, "run_operator_dry_run");
});

test("completed shadow-publish recommends online verification", async () => {
  const status = await readWith(lateStageState(), publishProjection({ gateAllowed: true, dryRun: true, shadow: true }));

  assert.equal(status.steps.find((item) => item.step === "operator_shadow_publish")?.status, "completed");
  assert.equal(status.steps.find((item) => item.step === "online_verification")?.status, "ready");
  assert.equal(status.nextOperation.key, "verify_online_site");
});

test("limitations carry forward into later advisory steps", async () => {
  const status = await readWith(
    state({
      currentState: { state: "clone_review_required", lifecycle: "active" },
      sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
      cloneReview: {
        reviewId: "clone-review",
        reviewStatus: "accepted_with_limitations",
        cloneSiteVersionRef: "clone-version",
        runtimeArtifactRef: "clone-artifact",
        proposalPlanningAllowed: true,
        blockers: [],
        warnings: [],
        limitations: ["hero_spacing_accepted"],
      },
    }),
  );

  assert.equal(status.steps.find((item) => item.step === "clone_review")?.status, "completed_with_limitations");
  assert.equal(status.steps.find((item) => item.step === "proposal_planning")?.limitations.includes("hero_spacing_accepted"), true);
});

test("open state blockers override normal next operation", async () => {
  const status = await readWith(
    state({
      currentState: { state: "source_capture_completed", lifecycle: "active" },
      blockers: {
        hasBlockingOpenIssue: true,
        items: [{ key: "manual_source_evidence_dispute", status: "open" }],
      },
    }),
  );

  assert.equal(status.nextOperation.key, "blocked_manual_resolution_required");
  assert.equal(status.steps.find((item) => item.step === "source_evidence_review")?.status, "blocked");
});

test("next operation ordering remains deterministic when late publish refs exist early", async () => {
  const status = await readWith(
    state({
      currentState: { state: "improved_version_review_required", lifecycle: "active" },
      sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
      cloneReview: { reviewId: "clone-review", reviewStatus: "accepted", cloneSiteVersionRef: "clone-version", runtimeArtifactRef: "clone-artifact", proposalPlanningAllowed: true, blockers: [], warnings: [], limitations: [] },
      improvementProposalPlanning: { latestProposalPlanId: "proposal-plan", proposalStatus: "approved", implementationAuthorizationReady: true, implementationAuthorizationStatus: "granted", proposalReadiness: { approved: true }, limitations: [] },
      improvementExecution: { latestExecutionAttemptId: "execution", executionStatus: "completed", readinessFlags: { readyToStart: false }, improvedCandidateRefs: { siteVersionRef: "improved-version", runtimeArtifactRef: "improved-artifact" }, limitationsCarriedForward: [] },
      improvedVersionReview: { latestReviewId: "improved-review", reviewStatus: "accepted", reviewedCandidateSiteVersionRef: "improved-version", reviewedRuntimeArtifactRef: "improved-artifact", limitations: [] },
    }),
    publishProjection({ gateAllowed: true, dryRun: true }),
  );

  assert.equal(status.nextOperation.key, "request_content_approval");
  assert.equal(deriveSingleSiteMvpNextOperation(status).key, "request_content_approval");
  assert.equal(buildSingleSiteMvpOperatorChecklist(status).find((item) => item.step === "content_approval")?.operatorActionAvailable, true);
});

function lateStageState(): SingleSiteMigrationReadModel {
  return state({
    currentState: { state: "publish_ready", lifecycle: "active" },
    sourceEvidenceReview: { reviewId: "source-review", reviewStatus: "accepted", accepted: true, acceptedWithLimitations: false, retryRequired: false, rejected: false, blockers: [], warnings: [], limitations: [] },
    cloneReview: { reviewId: "clone-review", reviewStatus: "accepted", cloneSiteVersionRef: "clone-version", runtimeArtifactRef: "clone-artifact", proposalPlanningAllowed: true, blockers: [], warnings: [], limitations: [] },
    improvementProposalPlanning: { latestProposalPlanId: "proposal-plan", proposalStatus: "approved", implementationAuthorizationReady: true, implementationAuthorizationStatus: "granted", proposalReadiness: { approved: true }, limitations: [] },
    improvementExecution: { latestExecutionAttemptId: "execution", executionStatus: "completed", readinessFlags: { readyToStart: false }, improvedCandidateRefs: { siteVersionRef: "improved-version", runtimeArtifactRef: "improved-artifact" }, limitationsCarriedForward: [] },
    improvedVersionReview: { latestReviewId: "improved-review", reviewStatus: "accepted", reviewedCandidateSiteVersionRef: "improved-version", reviewedRuntimeArtifactRef: "improved-artifact", limitations: [] },
    contentApproval: { latestContentApprovalId: "content", status: "approved", aafRefs: { decisionId: "content-decision" }, unresolvedBlockerCount: 0, limitations: [] },
    clientApproval: { latestClientApprovalId: "client", status: "approved", aafRefs: { decisionId: "client-decision" }, unresolvedBlockerCount: 0, limitations: [] },
    launchApproval: { latestLaunchApprovalId: "launch", status: "approved", aafRefs: { decisionId: "launch-decision" }, unresolvedBlockerCount: 0, limitations: [] },
  });
}
