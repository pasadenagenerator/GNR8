import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { ImprovementProposalPlanningService, type AddImprovementProposalFindingInput, type AddImprovementProposalRecommendationInput, type CreateOrReuseImprovementProposalPlanInput, type ImprovementProposalDecisionInput } from "./improvement-proposal-planning-service";
import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const CLONE_REVIEW_ID = "55555555-5555-4555-8555-555555555555";
const SOURCE_REVIEW_ID = "66666666-6666-4666-8666-666666666666";
const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const SQL_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql");

function actor() {
  return { actorType: "human" as const, actorId: "proposal-operator-1", actorRole: "migration_operator" };
}

function createInput(overrides: Partial<CreateOrReuseImprovementProposalPlanInput> = {}): CreateOrReuseImprovementProposalPlanInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    cloneReviewId: CLONE_REVIEW_ID,
    cloneSiteVersionRef: "clone-version-1",
    runtimeArtifactRef: "runtime-artifact-1",
    sourceEvidenceReviewId: SOURCE_REVIEW_ID,
    title: "Improvement proposal",
    summary: "Operator-authored proposal planning draft.",
    actor: actor(),
    correlationId: "corr-proposal-create",
    idempotencyKey: "idem-proposal-create",
    ...overrides,
  };
}

function recommendation(overrides: Partial<AddImprovementProposalRecommendationInput> = {}): AddImprovementProposalRecommendationInput {
  return {
    planId: PLAN_ID,
    migrationId: MIGRATION_ID,
    recommendationKey: "hero-copy",
    title: "Clarify hero copy",
    category: "content_clarity",
    risk: "low",
    impact: "high",
    effort: "small",
    rationale: "The accepted clone preserves unclear source messaging; proposed change improves clarity.",
    actor: actor(),
    correlationId: "corr-recommendation",
    idempotencyKey: "idem-recommendation",
    ...overrides,
  };
}

function finding(overrides: Partial<AddImprovementProposalFindingInput> = {}): AddImprovementProposalFindingInput {
  return {
    planId: PLAN_ID,
    migrationId: MIGRATION_ID,
    findingKey: "unclear-hero",
    category: "content_clarity",
    risk: "medium",
    impact: "high",
    summary: "Hero copy is faithful but unclear.",
    actor: actor(),
    correlationId: "corr-finding",
    idempotencyKey: "idem-finding",
    ...overrides,
  };
}

function decision(overrides: Partial<ImprovementProposalDecisionInput> = {}): ImprovementProposalDecisionInput {
  return {
    planId: PLAN_ID,
    actor: actor(),
    correlationId: "corr-decision",
    idempotencyKey: `idem-decision-${Math.random()}`,
    ...overrides,
  };
}

function authorizationValidation(overrides: Record<string, unknown> = {}) {
  return {
    valid: true,
    status: "granted" as const,
    scope: "single_site_improvement_implementation_authorization",
    subjectType: "single_site_improvement_proposal_plan",
    subjectId: PLAN_ID,
    approvalRequestId: "implementation-authorization-request-1",
    approvalDecisionId: "auth-decision-2",
    evidencePackageId: "implementation-authorization-evidence-1",
    limitations: [],
    blockerCodes: [],
    semanticWatermark: "implementation-authorization:watermark",
    ...overrides,
  };
}

function fakeRepository(options: {
  migrationState?: string;
  cloneStatus?: string;
  proposalPlanningAllowed?: boolean;
  cloneLimitations?: unknown[];
  missingCloneRefs?: boolean;
  seedRecommendations?: Record<string, unknown>[];
  seedFindings?: Record<string, unknown>[];
} = {}): never {
  const migration = {
    id: MIGRATION_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "clone_review_required",
    current_stage: options.migrationState === "migration_failed" || options.migrationState === "migration_cancelled" ? "terminal" : "clone",
    state_version: 3,
  };
  const cloneReview = {
    id: CLONE_REVIEW_ID,
    migration_id: MIGRATION_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    clone_site_version_ref: "clone-version-1",
    runtime_artifact_ref: "runtime-artifact-1",
    source_evidence_review_id: SOURCE_REVIEW_ID,
    review_status: options.cloneStatus ?? "accepted",
    proposal_planning_allowed: options.proposalPlanningAllowed ?? ["accepted", "accepted_with_limitations"].includes(options.cloneStatus ?? "accepted"),
    limitations_json: options.cloneLimitations ?? [],
  };
  const plan = {
    id: PLAN_ID,
    tenant_id: migration.tenant_id,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    migration_id: MIGRATION_ID,
    clone_review_id: CLONE_REVIEW_ID,
    source_evidence_review_id: SOURCE_REVIEW_ID,
    clone_site_version_ref: "clone-version-1",
    runtime_artifact_ref: "runtime-artifact-1",
    plan_status: "draft",
    plan_version: 1,
    limitations_json: [],
    warnings_json: [],
    decision_summary_json: {},
    approval_refs_json: {},
    implementation_authorization_refs_json: {},
    implementation_authorization_attached: false,
    idempotency_key: "idem-proposal-create",
    created_at: "2026-07-30T12:00:00.000Z",
    updated_at: "2026-07-30T12:00:00.000Z",
  };
  const cloneRefs = options.missingCloneRefs
    ? []
    : [
        { ref_role: "runtime_site_version_clone" },
        { ref_role: "runtime_artifact_clone" },
        { ref_role: "source_evidence_review" },
      ];
  const plans: Record<string, unknown>[] = [];
  const proposalRefs: Record<string, unknown>[] = [];
  const recommendations = [...(options.seedRecommendations ?? [])];
  const findings = [...(options.seedFindings ?? [])];
  const events: Record<string, unknown>[] = [];
  const stateEvents: Record<string, unknown>[] = [];
  const runtimeMutations: Record<string, unknown>[] = [];
  const generatedProposalBundles: Record<string, unknown>[] = [];
  const providerCalls: Record<string, unknown>[] = [];
  const publishDomainBilling: Record<string, unknown>[] = [];

  const repo = {
    runtimeMutations,
    generatedProposalBundles,
    providerCalls,
    publishDomainBilling,
    async withTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({});
    },
    async getMigrationById() {
      return migration;
    },
    async getLatestCloneReviewForMigration() {
      return cloneReview;
    },
    async listCloneReviewRefs() {
      return cloneRefs;
    },
    async getImprovementProposalPlanBySemanticRefs() {
      return plans[0] ?? null;
    },
    async createImprovementProposalPlan(_tx: unknown, input: Record<string, unknown>) {
      Object.assign(plan, {
        title: input.title,
        summary: input.summary,
        limitations_json: input.limitationsJson ?? [],
      });
      plans.push(plan);
      return { row: plan, reusedExisting: false };
    },
    async getImprovementProposalPlanById() {
      return plan;
    },
    async getLatestImprovementProposalPlanForMigration() {
      return plans[0] ?? plan;
    },
    async updateImprovementProposalPlanStatus(_tx: unknown, input: Record<string, unknown>) {
      Object.assign(plan, {
        plan_status: input.planStatus,
        limitations_json: input.limitationsJson ?? plan.limitations_json,
        warnings_json: input.warningsJson ?? plan.warnings_json,
        decision_summary_json: input.decisionSummaryJson ?? plan.decision_summary_json,
        approval_refs_json: input.approvalRefsJson ?? plan.approval_refs_json,
        implementation_authorization_refs_json: input.implementationAuthorizationRefsJson ?? plan.implementation_authorization_refs_json,
        implementation_authorization_attached: input.implementationAuthorizationAttached ?? plan.implementation_authorization_attached,
      });
      return plan;
    },
    async insertImprovementProposalRef(_tx: unknown, input: Record<string, unknown>) {
      const existing = proposalRefs.find((ref) => ref.idempotencyKey === input.idempotencyKey);
      if (existing) return { row: existing, reusedExisting: true };
      const row = { id: `proposal-ref-${proposalRefs.length + 1}`, ...input };
      proposalRefs.push(row);
      return { row, reusedExisting: false };
    },
    async upsertImprovementProposalRecommendation(_tx: unknown, input: Record<string, unknown>) {
      const row = {
        id: `recommendation-${recommendations.length + 1}`,
        plan_id: input.planId,
        migration_id: input.migrationId,
        recommendation_key: input.recommendationKey,
        title: input.title,
        category: input.category,
        risk: input.risk ?? "unknown",
        impact: input.impact ?? "unknown",
        effort: input.effort ?? "unknown",
        blocks_proposal_approval: input.blocksProposalApproval ?? false,
        limitation_accepted: input.limitationAccepted ?? false,
        decision_json: input.decisionJson ?? {},
      };
      recommendations.push(row);
      return row;
    },
    async upsertImprovementProposalFinding(_tx: unknown, input: Record<string, unknown>) {
      const row = {
        id: `finding-${findings.length + 1}`,
        plan_id: input.planId,
        migration_id: input.migrationId,
        finding_key: input.findingKey,
        category: input.category,
        risk: input.risk ?? "unknown",
        impact: input.impact ?? "unknown",
        blocks_proposal_approval: input.blocksProposalApproval ?? false,
        accepted_limitation: input.acceptedLimitation ?? false,
        decision_json: input.decisionJson ?? {},
      };
      findings.push(row);
      return row;
    },
    async listImprovementProposalRecommendations() {
      return recommendations;
    },
    async listImprovementProposalFindings() {
      return findings;
    },
    async getImprovementProposalEventByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      return events.find((event) => event.idempotency_key === idempotencyKey) ?? null;
    },
    async nextImprovementProposalEventIndex() {
      return events.length + 1;
    },
    async insertImprovementProposalEvent(_tx: unknown, input: Record<string, unknown>) {
      const inputActor = input.actor as ReturnType<typeof actor>;
      const row = {
        id: `event-${events.length + 1}`,
        plan_id: input.planId,
        migration_id: input.migrationId,
        event_index: input.eventIndex,
        event_action: input.eventAction,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        actor_type: inputActor.actorType,
        actor_id: inputActor.actorId,
        actor_role: inputActor.actorRole,
        details_json: input.detailsJson ?? {},
        limitations_json: input.limitationsJson ?? [],
        warnings_json: input.warningsJson ?? [],
        approval_refs_json: input.approvalRefsJson ?? {},
        implementation_authorization_refs_json: input.implementationAuthorizationRefsJson ?? {},
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
    async upsertStageSummary() {
      return {};
    },
    async insertImprovementProposalSupersession() {
      return { row: {}, reusedExisting: false };
    },
  };
  return repo as never;
}

test("create or reuse proposal plan requires accepted clone refs and carries limitations", async () => {
  const service = new ImprovementProposalPlanningService(fakeRepository({ cloneStatus: "accepted_with_limitations", cloneLimitations: [{ category: "font" }] }));
  const created = await service.createOrReuseProposalPlan(createInput());
  const replay = await service.createOrReuseProposalPlan(createInput());
  assert.equal(created.plan.id, PLAN_ID);
  assert.equal(replay.reusedExisting, true);
  assert.deepEqual(created.plan.limitations_json, [{ category: "font" }]);
});

test("proposal planning blocks before accepted clone review and after retry rejected or superseded clone review", async () => {
  for (const cloneStatus of ["draft", "retry_required", "rejected", "superseded"]) {
    await assert.rejects(
      () => new ImprovementProposalPlanningService(fakeRepository({ cloneStatus, proposalPlanningAllowed: false })).createOrReuseProposalPlan(createInput()),
      /proposal planning is blocked|accepted clone review/,
    );
  }
});

test("accepted and accepted_with_limitations clone reviews allow proposal planning", async () => {
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository({ cloneStatus: "accepted" })).createOrReuseProposalPlan(createInput())).plan.plan_status, "draft");
  assert.equal(
    (await new ImprovementProposalPlanningService(fakeRepository({ cloneStatus: "accepted_with_limitations", cloneLimitations: [{ note: "ok" }] })).createOrReuseProposalPlan(createInput())).plan.plan_status,
    "draft",
  );
});

test("add recommendations, classifications, and findings", async () => {
  const service = new ImprovementProposalPlanningService(fakeRepository());
  const rec = await service.addRecommendation(recommendation({ category: "seo", risk: "medium", impact: "high", effort: "small" }));
  const found = await service.addFinding(finding({ category: "accessibility", risk: "high", impact: "high" }));
  assert.equal(rec.recommendation.category, "seo");
  assert.equal(rec.recommendation.effort, "small");
  assert.equal(found.finding.category, "accessibility");
});

test("ready, review, changes requested, approve, approve with limitations, reject, supersede, and cancel work", async () => {
  const seeded = { seedRecommendations: [recommendation()], seedFindings: [finding()] };
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).markReadyForReview(decision({ idempotencyKey: "idem-ready" }))).plan.plan_status, "ready_for_review");
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).startReview(decision({ idempotencyKey: "idem-review" }))).plan.plan_status, "in_review");
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).requestChanges(decision({ idempotencyKey: "idem-changes", reason: "tighten scope" }))).plan.plan_status, "changes_requested");
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).approve(decision({ idempotencyKey: "idem-approve" }))).plan.plan_status, "approved");
  assert.equal(
    (await new ImprovementProposalPlanningService(fakeRepository(seeded)).approveWithLimitations(decision({ idempotencyKey: "idem-approve-limit", limitationsJson: [{ scope: "hero only" }] }))).plan.plan_status,
    "approved_with_limitations",
  );
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).reject(decision({ idempotencyKey: "idem-reject", reason: "not worth doing" }))).plan.plan_status, "rejected");
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).supersede(decision({ idempotencyKey: "idem-supersede", reason: "new evidence" }))).plan.plan_status, "superseded");
  assert.equal((await new ImprovementProposalPlanningService(fakeRepository(seeded)).cancel(decision({ idempotencyKey: "idem-cancel", reason: "operator cancelled" }))).plan.plan_status, "cancelled");
});

test("approval requires recommendations and high-risk blockers need limitation or decision", async () => {
  await assert.rejects(() => new ImprovementProposalPlanningService(fakeRepository()).approve(decision({ idempotencyKey: "idem-no-rec" })), /requires recommendations/);
  const service = new ImprovementProposalPlanningService(
    fakeRepository({ seedRecommendations: [{ ...recommendation(), risk: "high", blocks_proposal_approval: true, limitation_accepted: false, decision_json: {} }] }),
  );
  await assert.rejects(() => service.approve(decision({ idempotencyKey: "idem-high-risk" })), /high-risk blocker/);
  assert.equal((await service.approveWithLimitations(decision({ idempotencyKey: "idem-high-risk-limit", limitationsJson: [{ acceptedRisk: true }] }))).plan.plan_status, "approved_with_limitations");
});

test("implementation authorization is separate and only attaches after proposal approval", async () => {
  const blocked = new ImprovementProposalPlanningService(fakeRepository({ seedRecommendations: [recommendation()] }));
  await assert.rejects(
    () =>
      blocked.attachImplementationAuthorizationRef({
        planId: PLAN_ID,
        refType: "aaf_approval_decision",
        sourceRecordId: "auth-decision-1",
        authorizationValidation: authorizationValidation({ approvalDecisionId: "auth-decision-1" }),
        actor: actor(),
        correlationId: "corr-auth-blocked",
        idempotencyKey: "idem-auth-blocked",
      }),
    /requires proposal approval/,
  );

  const service = new ImprovementProposalPlanningService(fakeRepository({ seedRecommendations: [recommendation()] }));
  await service.approve(decision({ idempotencyKey: "idem-approve-before-auth" }));
  await assert.rejects(
    () =>
      service.attachImplementationAuthorizationRef({
        planId: PLAN_ID,
        refType: "aaf_approval_decision",
        sourceRecordId: "auth-decision-2",
        actor: actor(),
        correlationId: "corr-auth-unvalidated",
        idempotencyKey: "idem-auth-unvalidated",
      }),
    /bridge validation/,
  );
  await assert.rejects(
    () =>
      service.attachImplementationAuthorizationRef({
        planId: PLAN_ID,
        refType: "aaf_approval_decision",
        sourceRecordId: "auth-decision-2",
        authorizationValidation: authorizationValidation({ scope: "publish_activation" }),
        actor: actor(),
        correlationId: "corr-auth-wrong-scope",
        idempotencyKey: "idem-auth-wrong-scope",
      }),
    /exact AAF scope/,
  );
  const attached = await service.attachImplementationAuthorizationRef({
    planId: PLAN_ID,
    refType: "aaf_approval_decision",
    sourceRecordId: "auth-decision-2",
    authorizationValidation: authorizationValidation(),
    actor: actor(),
    correlationId: "corr-auth",
    idempotencyKey: "idem-auth",
  });
  assert.equal(attached.plan.implementation_authorization_attached, true);
});

test("idempotent retry works and semantic drift conflicts", async () => {
  const service = new ImprovementProposalPlanningService(fakeRepository({ seedRecommendations: [recommendation()] }));
  const first = await service.approve(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "ok" } }));
  const replay = await service.approve(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "ok" } }));
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.approve(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "changed" } })),
    SingleSiteIdempotencyConflictError,
  );
});

test("terminal migration blocks proposal changes and service has no forbidden side effects", async () => {
  await assert.rejects(
    () => new ImprovementProposalPlanningService(fakeRepository({ migrationState: "migration_failed" })).addRecommendation(recommendation()),
    /terminal migration state/,
  );
  const repo = fakeRepository({ seedRecommendations: [recommendation()] }) as unknown as {
    runtimeMutations: unknown[];
    generatedProposalBundles: unknown[];
    providerCalls: unknown[];
    publishDomainBilling: unknown[];
  };
  await new ImprovementProposalPlanningService(repo as never).approve(decision({ idempotencyKey: "idem-side-effects" }));
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.generatedProposalBundles, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.publishDomainBilling, []);
});

test("proposal planning SQL migration is additive, append-only, and boundary scoped", () => {
  const sql = readFileSync(SQL_PATH, "utf8");
  for (const tableName of [
    "gnr8_single_site_improvement_proposal_plans",
    "gnr8_single_site_improvement_proposal_refs",
    "gnr8_single_site_improvement_proposal_recommendations",
    "gnr8_single_site_improvement_proposal_findings",
    "gnr8_single_site_improvement_proposal_events",
    "gnr8_single_site_improvement_proposal_supersessions",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  for (const value of ["not_started", "planning_required", "draft", "ready_for_review", "approved_with_limitations", "cancelled"]) assert.match(sql, new RegExp(`'${value}'`, "i"));
  for (const value of ["content_clarity", "visual_design", "seo", "aeo", "accessibility", "unknown_or_manual"]) assert.match(sql, new RegExp(`'${value}'`, "i"));
  for (const value of ["low", "medium", "high", "unknown", "small", "large"]) assert.match(sql, new RegExp(`'${value}'`, "i"));
  assert.match(sql, /trg_gnr8_single_site_improvement_proposal_refs_append_only/i);
  assert.match(sql, /trg_gnr8_single_site_improvement_proposal_events_append_only/i);
  assert.match(sql, /trg_gnr8_single_site_improvement_proposal_supersessions_append_only/i);
  assert.doesNotMatch(sql, /create\s+policy|grant\s+(select|insert|update|delete)|stripe|openprovider|vercel|active_pointer|publish_ready|generated_website_proposals|generated_proposal_bundles|transformation_execute/i);
});
