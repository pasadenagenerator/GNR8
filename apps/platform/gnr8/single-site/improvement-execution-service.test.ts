import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  ImprovementExecutionService,
  computeImprovementExecutionSemanticInputWatermark,
  type CreateOrReuseImprovementExecutionAttemptInput,
  type ImprovementExecutionTransitionInput,
} from "./improvement-execution-service";
import type { ImprovedCandidateDryRunResult } from "./improved-candidate-dry-run-adapter";
import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const CLONE_REVIEW_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_REVIEW_ID = "66666666-6666-4666-8666-666666666666";
const RECOMMENDATION_ID = "77777777-7777-4777-8777-777777777777";
const ATTEMPT_ID = "88888888-8888-4888-8888-888888888888";
const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const SQL_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260731120000_single_site_improvement_execution_core.sql");

function actor() {
  return { actorType: "human" as const, actorId: "execution-operator-1", actorRole: "migration_operator" };
}

function selectedRecommendation(overrides: Record<string, unknown> = {}) {
  return {
    recommendationId: RECOMMENDATION_ID,
    recommendationKey: "hero-copy",
    sourceTable: "gnr8_single_site_improvement_proposal_recommendations",
    sourceRecordId: RECOMMENDATION_ID,
    sourceWatermark: "recommendation-watermark",
    contentHash: "recommendation-hash-0123456789abcdef",
    ...overrides,
  };
}

function createInput(overrides: Partial<CreateOrReuseImprovementExecutionAttemptInput> = {}): CreateOrReuseImprovementExecutionAttemptInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    proposalPlanId: PLAN_ID,
    implementationAuthorizationRef: {
      approvalRequestId: "auth-request-1",
      approvalDecisionId: "auth-decision-1",
      evidencePackageId: "auth-evidence-1",
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: "auth-decision-1",
      scope: "single_site_improvement_implementation_authorization",
    },
    selectedRecommendationRefs: [selectedRecommendation()],
    implementationScopeSummary: "Implement selected hero copy recommendation only.",
    implementationScopeWatermark: "implementation-scope-watermark",
    executionMode: "dry_run",
    actor: actor(),
    correlationId: "corr-execution-create",
    idempotencyKey: "idem-execution-create",
    ...overrides,
  };
}

function transitionInput(overrides: Partial<ImprovementExecutionTransitionInput> = {}): ImprovementExecutionTransitionInput {
  return {
    attemptId: ATTEMPT_ID,
    actor: actor(),
    correlationId: "corr-execution-transition",
    idempotencyKey: `idem-execution-transition-${Math.random()}`,
    ...overrides,
  };
}

function validation(overrides: Partial<ImprovementExecutionAafValidationResult> = {}): ImprovementExecutionAafValidationResult {
  return {
    allowed: true,
    mode: "allowed",
    reasonCode: "authorization_valid",
    blockerCodes: [],
    matchedAafRequestDecisionRefs: {
      approvalRequestId: "auth-request-1",
      approvalDecisionId: "auth-decision-1",
      evidencePackageId: "auth-evidence-1",
      scope: "single_site_improvement_implementation_authorization",
      status: "granted",
    },
    matchedEvidenceRefs: [],
    matchedSubjectRefs: [],
    limitations: [],
    freshnessResult: {
      status: "fresh",
      expectedSemanticWatermark: "implementation-scope-watermark",
      actualEvidenceWatermark: "implementation-scope-watermark",
      actualFreshnessWatermark: "implementation-scope-watermark",
      checkedAt: "2026-07-31T12:00:00.000Z",
    },
    driftResult: {
      proposalWatermarkMatched: true,
      selectedRecommendationWatermarkMatched: true,
      implementationScopeWatermarkMatched: true,
      semanticWatermarkMatched: true,
      driftedRoles: [],
    },
    missingRefs: { authorization: [], subject: [], evidence: [] },
    staleRefs: { subject: [], evidence: [], freshness: [] },
    prohibitedSubstitutionFlags: {
      prohibited: false,
      proposalApproval: false,
      cloneReview: false,
      contentApproval: false,
      clientApproval: false,
      launchApproval: false,
      publishActivation: false,
      domainDdomReadiness: false,
      aiProviderAdvisory: false,
      generatedProposalBundle: false,
      commandCenterOpsInbox: false,
      unknownScope: false,
    },
    actor: actor(),
    correlationId: "corr-validation",
    idempotencyKey: "idem-validation",
    executionAttemptKey: ATTEMPT_ID,
    mutatesSourceTruth: false,
    nonExecuting: true,
    ...overrides,
  };
}

function fakeRepository(options: {
  migrationState?: string;
  proposalStatus?: string;
  implementationAuthorizationAttached?: boolean;
  implementationAuthorizationValidationStatus?: string;
  selectedRecommendations?: Record<string, unknown>[];
} = {}): never {
  const migration = {
    id: MIGRATION_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "improvement_proposal_approved",
    current_stage: "proposal",
    state_version: 7,
  };
  const plan = {
    id: PLAN_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    migration_id: MIGRATION_ID,
    clone_review_id: CLONE_REVIEW_ID,
    source_evidence_review_id: SOURCE_REVIEW_ID,
    clone_site_version_ref: "clone-version-1",
    runtime_artifact_ref: "runtime-artifact-1",
    plan_status: options.proposalStatus ?? "approved",
    plan_version: 3,
    semantic_watermark: "proposal-plan-watermark",
    approval_refs_json: {
      approvalRequestId: "proposal-approval-request-1",
      approvalDecisionId: "proposal-approval-decision-1",
      evidencePackageId: "proposal-evidence-1",
      sourceWatermark: "proposal-approval-watermark",
      limitations: [{ proposal: "preserve offer" }],
    },
    implementation_authorization_refs_json: {
      implementationAuthorizationRequestId: "auth-request-1",
      implementationAuthorizationDecisionId: "auth-decision-1",
      implementationAuthorizationEvidencePackageId: "auth-evidence-1",
      implementationAuthorizationValidationStatus: options.implementationAuthorizationValidationStatus ?? "granted",
      implementationAuthorizationLimitations: [{ authorization: "hero only" }],
    },
    implementation_authorization_attached: options.implementationAuthorizationAttached ?? true,
    limitations_json: [{ plan: "keep brand voice" }],
  };
  const recommendations = options.selectedRecommendations ?? [
    {
      id: RECOMMENDATION_ID,
      plan_id: PLAN_ID,
      migration_id: MIGRATION_ID,
      recommendation_key: "hero-copy",
    },
  ];
  const attempts: Record<string, unknown>[] = [];
  const refs: Record<string, unknown>[] = [];
  const items: Record<string, unknown>[] = [];
  const events: Record<string, unknown>[] = [];
  const stateEvents: Record<string, unknown>[] = [];
  const runtimeMutations: unknown[] = [];
  const providerCalls: unknown[] = [];
  const publicMutations: unknown[] = [];

  const repo = {
    runtimeMutations,
    providerCalls,
    publicMutations,
    async withTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({});
    },
    async getMigrationById() {
      return migration;
    },
    async getImprovementProposalPlanById() {
      return plan;
    },
    async listImprovementProposalRecommendations() {
      return recommendations;
    },
    async getImprovementExecutionAttemptBySemanticRefs() {
      return attempts[0] ?? null;
    },
    async createImprovementExecutionAttempt(_tx: unknown, input: Record<string, unknown>) {
      const row = {
        id: ATTEMPT_ID,
        tenant_id: input.tenantId,
        client_id: input.clientId,
        site_id: input.siteId,
        migration_id: input.migrationId,
        proposal_plan_id: input.proposalPlanId,
        proposal_plan_version: input.proposalPlanVersion,
        proposal_plan_semantic_watermark: input.proposalPlanSemanticWatermark,
        proposal_approval_request_id: input.proposalApprovalRequestId,
        proposal_approval_decision_id: input.proposalApprovalDecisionId,
        proposal_evidence_package_id: input.proposalEvidencePackageId,
        implementation_authorization_request_id: input.implementationAuthorizationRequestId,
        implementation_authorization_decision_id: input.implementationAuthorizationDecisionId,
        implementation_authorization_evidence_package_id: input.implementationAuthorizationEvidencePackageId,
        clone_review_id: input.cloneReviewId,
        clone_site_version_ref: input.cloneSiteVersionRef,
        clone_runtime_artifact_ref: input.cloneRuntimeArtifactRef,
        source_evidence_review_id: input.sourceEvidenceReviewId,
        selected_recommendation_refs_json: input.selectedRecommendationRefsJson ?? [],
        limitations_json: input.limitationsJson ?? [],
        execution_mode: input.executionMode,
        status: input.status,
        readiness_json: input.readinessJson ?? {},
        validation_summary_json: input.validationSummaryJson ?? {},
        semantic_input_watermark: input.semanticInputWatermark,
        output_refs_json: input.outputRefsJson ?? {},
        failure_json: input.failureJson ?? {},
        audit_refs_json: input.auditRefsJson ?? {},
        metadata_json: input.metadataJson ?? {},
        content_approval_granted: false,
        client_approval_granted: false,
        launch_approval_granted: false,
        publish_activation_approval_granted: false,
      };
      attempts.push(row);
      return { row, reusedExisting: false };
    },
    async getImprovementExecutionAttemptById() {
      return attempts[0] ?? null;
    },
    async getLatestImprovementExecutionAttemptForMigration() {
      return attempts[0] ?? null;
    },
    async updateImprovementExecutionAttemptStatus(_tx: unknown, input: Record<string, unknown>) {
      Object.assign(attempts[0], {
        status: input.status,
        readiness_json: input.readinessJson ?? attempts[0].readiness_json,
        validation_summary_json: input.validationSummaryJson ?? attempts[0].validation_summary_json,
        limitations_json: input.limitationsJson ?? attempts[0].limitations_json,
        selected_recommendation_refs_json: input.selectedRecommendationRefsJson ?? attempts[0].selected_recommendation_refs_json,
        aaf_validation_result_ref: input.aafValidationResultRef ?? attempts[0].aaf_validation_result_ref,
        aaf_validation_evidence_ref: input.aafValidationEvidenceRef ?? attempts[0].aaf_validation_evidence_ref,
        semantic_output_watermark: input.semanticOutputWatermark ?? attempts[0].semantic_output_watermark,
        improved_candidate_site_version_ref: input.improvedCandidateSiteVersionRef ?? attempts[0].improved_candidate_site_version_ref,
        improved_runtime_artifact_ref: input.improvedRuntimeArtifactRef ?? attempts[0].improved_runtime_artifact_ref,
        output_refs_json: input.outputRefsJson ?? attempts[0].output_refs_json,
        failure_json: input.failureJson ?? attempts[0].failure_json,
        superseded_by_attempt_id: input.supersededByAttemptId ?? attempts[0].superseded_by_attempt_id,
      });
      return attempts[0];
    },
    async insertImprovementExecutionRef(_tx: unknown, input: Record<string, unknown>) {
      const existing = refs.find((ref) => ref.idempotencyKey === input.idempotencyKey);
      if (existing) return { row: existing, reusedExisting: true };
      const row = { id: `ref-${refs.length + 1}`, ...input };
      refs.push(row);
      return { row, reusedExisting: false };
    },
    async upsertImprovementExecutionItem(_tx: unknown, input: Record<string, unknown>) {
      const existing = items.find((item) => item.itemType === input.itemType && item.itemKey === input.itemKey);
      if (existing) {
        Object.assign(existing, input);
        return existing;
      }
      const row = { id: `item-${items.length + 1}`, item_type: input.itemType, item_key: input.itemKey, recommendation_id: input.recommendationId, ...input };
      items.push(row);
      return row;
    },
    async listImprovementExecutionItems() {
      return items;
    },
    async listImprovementExecutionRefs() {
      return refs;
    },
    async getImprovementExecutionEventByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      return events.find((event) => event.idempotency_key === idempotencyKey) ?? null;
    },
    async nextImprovementExecutionEventIndex() {
      return events.length + 1;
    },
    async insertImprovementExecutionEvent(_tx: unknown, input: Record<string, unknown>) {
      const inputActor = input.actor as ReturnType<typeof actor>;
      const row = {
        id: `event-${events.length + 1}`,
        attempt_id: input.attemptId,
        migration_id: input.migrationId,
        event_action: input.eventAction,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        actor_type: inputActor.actorType,
        actor_id: inputActor.actorId,
        actor_role: inputActor.actorRole,
        details_json: input.detailsJson ?? {},
        limitations_json: input.limitationsJson ?? [],
        warnings_json: input.warningsJson ?? [],
        validation_summary_json: input.validationSummaryJson ?? {},
        output_refs_json: input.outputRefsJson ?? {},
        failure_json: input.failureJson ?? {},
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        metadata_json: input.metadataJson ?? {},
        idempotency_key: input.idempotencyKey,
      };
      events.push(row);
      return { row, reusedExisting: false };
    },
    async nextStateEventIndex() {
      return stateEvents.length + 1;
    },
    async insertStateEvent(_tx: unknown, input: Record<string, unknown>) {
      const row = { id: `state-event-${stateEvents.length + 1}`, ...input };
      stateEvents.push(row);
      return { row, reusedExisting: false };
    },
    async insertMigrationRef() {
      return { row: {}, reusedExisting: false };
    },
    async updateMigrationCurrentState(_tx: unknown, input: Record<string, unknown>) {
      migration.current_state = input.toState as string;
      return migration;
    },
  };
  return repo as never;
}

async function createReady(service: ImprovementExecutionService) {
  const created = await service.createOrReuseExecutionAttempt(createInput());
  const ready = await service.markReady({
    attemptId: created.attempt.id,
    validation: validation(),
    validationResultRef: "validation-result-1",
    actor: actor(),
    correlationId: "corr-ready",
    idempotencyKey: "idem-ready",
  });
  return ready.attempt;
}

test("create or reuse attempt requires approved proposal, authorization, selected recommendations, and carries limitations", async () => {
  const service = new ImprovementExecutionService(fakeRepository());
  const created = await service.createOrReuseExecutionAttempt(createInput());
  const replay = await service.createOrReuseExecutionAttempt(createInput());
  assert.equal(created.attempt.id, ATTEMPT_ID);
  assert.equal(replay.reusedExisting, true);
  assert.deepEqual(created.attempt.limitations_json, [{ plan: "keep brand voice" }, { proposal: "preserve offer" }, { authorization: "hero only" }]);

  await assert.rejects(() => new ImprovementExecutionService(fakeRepository({ proposalStatus: "draft" })).createOrReuseExecutionAttempt(createInput()), /approved proposal plan/);
  await assert.rejects(
    () => new ImprovementExecutionService(fakeRepository({ implementationAuthorizationAttached: false })).createOrReuseExecutionAttempt(createInput()),
    /implementation authorization ref/,
  );
  await assert.rejects(() => new ImprovementExecutionService(fakeRepository()).createOrReuseExecutionAttempt(createInput({ selectedRecommendationRefs: [] })), /selected recommendations/);
});

test("execution start requires successful MVP-20 validation and rejects invalid or stale authorization", async () => {
  const service = new ImprovementExecutionService(fakeRepository());
  const created = await service.createOrReuseExecutionAttempt(createInput());
  await assert.rejects(() => service.markStarted(transitionInput({ attemptId: created.attempt.id, idempotencyKey: "idem-start-too-early" })), /ready attempt/);
  await assert.rejects(
    () =>
      service.markReady({
        attemptId: created.attempt.id,
        validation: validation({ allowed: false, mode: "blocked", reasonCode: "approval_stale", blockerCodes: ["policy_version_mismatch"] }),
        actor: actor(),
        correlationId: "corr-invalid-ready",
        idempotencyKey: "idem-invalid-ready",
      }),
    /AAF validation blocked/,
  );
});

test("allowed and allowed_with_limitations validation can ready and start execution", async () => {
  const ready = await createReady(new ImprovementExecutionService(fakeRepository()));
  assert.equal(ready.status, "ready");
  const service = new ImprovementExecutionService(fakeRepository());
  const created = await service.createOrReuseExecutionAttempt(createInput());
  const limited = await service.markReady({
    attemptId: created.attempt.id,
    validation: validation({ mode: "allowed_with_limitations", reasonCode: "authorization_valid_with_limitations", limitations: [{ validation: "fresh but limited" }] }),
    actor: actor(),
    correlationId: "corr-limited-ready",
    idempotencyKey: "idem-limited-ready",
  });
  assert.equal(limited.attempt.status, "ready");
  assert.deepEqual(limited.attempt.limitations_json, [{ plan: "keep brand voice" }, { proposal: "preserve offer" }, { authorization: "hero only" }, { validation: "fresh but limited" }]);
  const started = await service.markStarted(transitionInput({ attemptId: created.attempt.id, idempotencyKey: "idem-start" }));
  assert.equal(started.attempt.status, "started");
});

test("failure, retry, completion, cancellation, and supersession are represented without approvals", async () => {
  const repo = fakeRepository() as unknown as { runtimeMutations: unknown[]; providerCalls: unknown[]; publicMutations: unknown[] };
  const service = new ImprovementExecutionService(repo as never);
  const attempt = await createReady(service);
  await service.markStarted(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-start-for-fail" }));
  const failed = await service.markFailed(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-fail", detailsJson: { errorCode: "fixture_failure" } }));
  assert.equal(failed.attempt.status, "failed");
  const retry = await service.markRetryRequired(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-retry", detailsJson: { repair: "manual" } }));
  assert.equal(retry.attempt.status, "retry_required");

  const completeService = new ImprovementExecutionService(fakeRepository());
  const completeAttempt = await createReady(completeService);
  await completeService.markStarted(transitionInput({ attemptId: completeAttempt.id, idempotencyKey: "idem-start-for-complete" }));
  await assert.rejects(() => completeService.markCompleted({ ...transitionInput({ attemptId: completeAttempt.id, idempotencyKey: "idem-complete-no-output" }) }), /output refs/);
  const completed = await completeService.markCompleted({
    ...transitionInput({ attemptId: completeAttempt.id, idempotencyKey: "idem-complete-fixture" }),
    futureBoundaryFixture: true,
  });
  assert.equal(completed.attempt.status, "completed");
  assert.equal(completed.attempt.content_approval_granted, false);
  assert.equal(completed.attempt.client_approval_granted, false);
  assert.equal(completed.attempt.launch_approval_granted, false);
  assert.equal(completed.attempt.publish_activation_approval_granted, false);

  const cancelService = new ImprovementExecutionService(fakeRepository());
  const cancelAttempt = (await cancelService.createOrReuseExecutionAttempt(createInput())).attempt;
  assert.equal((await cancelService.cancel(transitionInput({ attemptId: cancelAttempt.id, idempotencyKey: "idem-cancel", reason: "operator stopped" }))).attempt.status, "cancelled");
  const supersedeService = new ImprovementExecutionService(fakeRepository());
  const supersedeAttempt = (await supersedeService.createOrReuseExecutionAttempt(createInput())).attempt;
  assert.equal((await supersedeService.supersede({ ...transitionInput({ attemptId: supersedeAttempt.id, idempotencyKey: "idem-supersede", reason: "new proposal" }) })).attempt.status, "superseded");
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.publicMutations, []);
});

test("idempotent retry works and semantic drift conflicts", async () => {
  const service = new ImprovementExecutionService(fakeRepository());
  const attempt = (await service.createOrReuseExecutionAttempt(createInput())).attempt;
  const first = await service.markBlocked(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-block", detailsJson: { blocker: "validation_pending" } }));
  const replay = await service.markBlocked(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-block", detailsJson: { blocker: "validation_pending" } }));
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.markBlocked(transitionInput({ attemptId: attempt.id, idempotencyKey: "idem-block", detailsJson: { blocker: "changed" } })),
    SingleSiteIdempotencyConflictError,
  );
});

test("records improved candidate dry-run items and placeholder refs without completing attempt", async () => {
  const repo = fakeRepository() as unknown as { runtimeMutations: unknown[]; providerCalls: unknown[]; publicMutations: unknown[] };
  const service = new ImprovementExecutionService(repo as never);
  const attempt = await createReady(service);
  const dryRunResult = {
    mode: "dry_run",
    dryRunOnly: true,
    runtimeWrites: false,
    inputRefs: { implementationAuthorizationRefs: { decisionRef: "auth-decision-1" } },
    plannedChangeSet: {
      plannedPageChanges: [
        {
          recommendationId: RECOMMENDATION_ID,
          recommendationRef: `gnr8:improvement_recommendation:${RECOMMENDATION_ID}`,
          changeId: "gnr8:planned_change:abc",
          changeClass: "text_replacement_plan",
          category: "content_clarity",
          target: { pagePath: "/", sectionId: "hero", field: "headline" },
          currentSourceHash: "current",
          plannedValueHash: "planned",
          evidenceRefs: [],
          limitationRefs: [],
          executionSupportStatus: "deterministic_supported",
          noWriteProof: {
            runtimeWritePerformed: false,
            activePointerChanged: false,
            aiProviderCalled: false,
            generatedProposalBundleCreated: false,
          },
        },
      ],
      plannedMetadataChanges: [],
      plannedAssetChanges: [],
      plannedStyleTokenChanges: [],
    },
    recommendationsNotApplied: [
      {
        recommendationId: "99999999-9999-4999-8999-999999999999",
        recommendationRef: "gnr8:improvement_recommendation:99999999-9999-4999-8999-999999999999",
        category: "visual_design",
        reason: "unsupported_in_mvp",
        details: "Unsupported in MVP.",
        executionSupportStatus: "unsupported",
        evidenceRefs: [],
        limitationCarriedForward: { source: "recommendation_not_applied", reason: "unsupported_in_mvp" },
      },
    ],
    limitationsCarriedForward: [{ source: "proposal", limitation: { summary: "Keep brand voice" } }],
    expectedOutputRefs: {
      expectedPlannedChangeSetRef: "gnr8:planned_change_set:abc",
      expectedImprovedCandidateSiteVersionRef: "gnr8:planned_site_version:abc",
      expectedImprovedRuntimeArtifactRef: "gnr8:planned_runtime_artifact:abc",
      expectedArtifactBundleSha256: "abc",
    },
    watermarks: {
      semanticInputWatermark: attempt.semantic_input_watermark,
      plannedChangeSetWatermark: "planned-change-set:abc",
      limitationsWatermark: "limitations:abc",
      semanticOutputWatermark: "single-site-improved-candidate-dry-run-output:abc",
    },
  } as unknown as ImprovedCandidateDryRunResult;
  const recorded = await service.recordImprovedCandidateDryRunResult({
    attemptId: attempt.id,
    migrationId: attempt.migration_id,
    dryRunResult,
    actor: actor(),
    correlationId: "corr-record-dry-run",
    idempotencyKey: "idem-record-dry-run",
  });
  assert.equal(recorded.attempt.status, "ready");
  assert.equal(recorded.refs.length, 3);
  assert.ok(recorded.refs.every((ref) => String((ref as unknown as Record<string, unknown>).sourceRecordId ?? ref.source_record_id).startsWith("gnr8:planned_")));
  assert.ok(recorded.items.some((item) => ((item as unknown as Record<string, unknown>).itemType ?? item.item_type) === "validation_ref"));
  assert.ok(recorded.items.some((item) => ((item as unknown as Record<string, unknown>).itemType ?? item.item_type) === "output_ref"));
  assert.ok(recorded.items.some((item) => ((item as unknown as Record<string, unknown>).itemType ?? item.item_type) === "warning"));
  assert.ok(recorded.items.some((item) => ((item as unknown as Record<string, unknown>).itemType ?? item.item_type) === "manual_note"));
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.publicMutations, []);
});

test("terminal migration blocks execution changes and semantic watermark is deterministic", async () => {
  await assert.rejects(
    () => new ImprovementExecutionService(fakeRepository({ migrationState: "migration_cancelled" })).createOrReuseExecutionAttempt(createInput()),
    /terminal migration state/,
  );
  assert.equal(
    computeImprovementExecutionSemanticInputWatermark({
      migrationId: MIGRATION_ID,
      proposalPlanId: PLAN_ID,
      proposalPlanVersion: 3,
      proposalPlanSemanticWatermark: "proposal-plan-watermark",
      implementationAuthorizationDecisionId: "auth-decision-1",
      selectedRecommendationRefs: [selectedRecommendation()],
      implementationScopeSummary: "Implement selected hero copy recommendation only.",
      implementationScopeWatermark: "implementation-scope-watermark",
      executionMode: "dry_run",
    }),
    computeImprovementExecutionSemanticInputWatermark({
      migrationId: MIGRATION_ID,
      proposalPlanId: PLAN_ID,
      proposalPlanVersion: 3,
      proposalPlanSemanticWatermark: "proposal-plan-watermark",
      implementationAuthorizationDecisionId: "auth-decision-1",
      selectedRecommendationRefs: [selectedRecommendation()],
      implementationScopeSummary: "Implement selected hero copy recommendation only.",
      implementationScopeWatermark: "implementation-scope-watermark",
      executionMode: "dry_run",
    }),
  );
});

test("execution SQL migration is additive, append-only, and boundary scoped", () => {
  const sql = readFileSync(SQL_PATH, "utf8");
  for (const tableName of [
    "gnr8_single_site_improvement_execution_attempts",
    "gnr8_single_site_improvement_execution_refs",
    "gnr8_single_site_improvement_execution_items",
    "gnr8_single_site_improvement_execution_events",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  for (const value of ["draft", "blocked", "ready", "started", "completed_with_limitations", "retry_required", "superseded", "cancelled"]) {
    assert.match(sql, new RegExp(`'${value}'`, "i"));
  }
  for (const value of ["dry_run", "execute", "replay", "repair", "selected_recommendation", "validation_ref", "manual_note"]) {
    assert.match(sql, new RegExp(`'${value}'`, "i"));
  }
  assert.match(sql, /trg_gnr8_single_site_improvement_execution_refs_append_only/i);
  assert.match(sql, /trg_gnr8_single_site_improvement_execution_events_append_only/i);
  assert.doesNotMatch(sql, /create\s+policy|grant\s+(select|insert|update|delete)|generated_website_proposals|generated_proposal_bundles|transformation_execute/i);
});
