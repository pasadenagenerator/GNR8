import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";
import { CloneReviewService, type AddCloneFidelityFindingInput, type CloneReviewDecisionInput, type CreateOrReuseCloneReviewInput } from "./clone-review-service";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const REVIEW_ID = "44444444-4444-4444-8444-444444444444";
const SOURCE_REVIEW_ID = "55555555-5555-4555-8555-555555555555";
const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const SQL_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");

function actor() {
  return { actorType: "human" as const, actorId: "clone-reviewer-1", actorRole: "clone_reviewer" };
}

function createInput(overrides: Partial<CreateOrReuseCloneReviewInput> = {}): CreateOrReuseCloneReviewInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    cloneSiteVersionRef: "clone-version-1",
    runtimeArtifactRef: "runtime-artifact-1",
    sourceEvidenceReviewRef: SOURCE_REVIEW_ID,
    cloneGenerationRef: "clone-generation-1",
    actor: actor(),
    correlationId: "corr-clone-create",
    idempotencyKey: "idem-clone-create",
    ...overrides,
  };
}

function decision(overrides: Partial<CloneReviewDecisionInput> = {}): CloneReviewDecisionInput {
  return {
    reviewId: REVIEW_ID,
    actor: actor(),
    correlationId: "corr-clone-decision",
    idempotencyKey: `idem-clone-decision-${Math.random()}`,
    ...overrides,
  };
}

function finding(overrides: Partial<AddCloneFidelityFindingInput> = {}): AddCloneFidelityFindingInput {
  return {
    reviewId: REVIEW_ID,
    migrationId: MIGRATION_ID,
    itemKey: "layout-header",
    fidelityCategory: "layout",
    severity: "p2_minor",
    findingSummary: "Header spacing differs slightly",
    actor: actor(),
    correlationId: "corr-clone-finding",
    idempotencyKey: "idem-clone-finding",
    ...overrides,
  };
}

function fakeRepository(options: {
  migrationState?: string;
  seedItems?: Record<string, unknown>[];
  seedRefs?: Record<string, unknown>[];
  proposalRows?: Record<string, unknown>[];
  publishRows?: Record<string, unknown>[];
} = {}): never {
  const review = {
    id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    clone_site_version_ref: "clone-version-1",
    runtime_artifact_ref: "runtime-artifact-1",
    source_evidence_review_id: SOURCE_REVIEW_ID,
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
    reviewed_at: null,
    created_at: "2026-07-30T12:00:00.000Z",
    updated_at: "2026-07-30T12:00:00.000Z",
  };
  const migration = {
    id: MIGRATION_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "clone_review_required",
    current_stage: options.migrationState === "migration_failed" ? "terminal" : "clone",
    state_version: 3,
  };
  const items = [...(options.seedItems ?? [])];
  const refs = [
    { id: "ref-clone-version", review_id: REVIEW_ID, migration_id: MIGRATION_ID, ref_role: "runtime_site_version_clone", source_record_id: "clone-version-1" },
    { id: "ref-artifact", review_id: REVIEW_ID, migration_id: MIGRATION_ID, ref_role: "runtime_artifact_clone", source_record_id: "runtime-artifact-1" },
    { id: "ref-source-review", review_id: REVIEW_ID, migration_id: MIGRATION_ID, ref_role: "source_evidence_review", source_record_id: SOURCE_REVIEW_ID },
    ...(options.seedRefs ?? []),
  ];
  const events: Record<string, unknown>[] = [];
  const migrationRefs: Record<string, unknown>[] = [];
  const stateEvents: Record<string, unknown>[] = [];
  const stageSummaries: Record<string, unknown>[] = [];
  const repo = {
    proposalRows: options.proposalRows ?? [],
    publishRows: options.publishRows ?? [],
    async withTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({});
    },
    async getMigrationById() {
      return migration;
    },
    async createCloneReview() {
      return { row: review, reusedExisting: false };
    },
    async getCloneReviewBySemanticRefs() {
      return null;
    },
    async getCloneReviewById() {
      return review;
    },
    async getLatestCloneReviewForMigration() {
      return review;
    },
    async insertCloneReviewRef(_tx: unknown, input: Record<string, unknown>) {
      const row = { id: `ref-${refs.length + 1}`, review_id: REVIEW_ID, migration_id: MIGRATION_ID, ref_role: input.refRole, source_record_id: input.sourceRecordId, ...input };
      refs.push(row);
      return { row, reusedExisting: false };
    },
    async listCloneReviewRefs() {
      return refs;
    },
    async insertMigrationRef(_tx: unknown, input: Record<string, unknown>) {
      migrationRefs.push(input);
      return { row: { id: `migration-ref-${migrationRefs.length}`, ...input }, reusedExisting: false };
    },
    async upsertCloneReviewItem(_tx: unknown, input: Record<string, unknown>) {
      const row = {
        id: `item-${items.length + 1}`,
        review_id: REVIEW_ID,
        migration_id: MIGRATION_ID,
        item_key: input.itemKey,
        fidelity_category: input.fidelityCategory,
        severity: input.severity,
        status: input.status ?? "open",
        blocks_acceptance: input.blocksAcceptance ?? (input.severity === "p0_blocker" || input.severity === "p1_major"),
        accepted_limitation: input.acceptedLimitation ?? false,
        finding_summary: input.findingSummary,
      };
      items.push(row);
      return row;
    },
    async listCloneReviewItems() {
      return items;
    },
    async updateCloneReviewStatus(_tx: unknown, input: Record<string, unknown>) {
      const inputActor = input.actor as ReturnType<typeof actor> | undefined;
      Object.assign(review, {
        review_status: input.reviewStatus,
        review_decision: input.reviewDecision,
        proposal_planning_allowed: input.proposalPlanningAllowed,
        retry_required: input.retryRequired,
        accepted_with_limitations: input.acceptedWithLimitations,
        fidelity_summary_json: input.fidelitySummaryJson ?? {},
        limitations_json: input.limitationsJson ?? [],
        blockers_json: input.blockersJson ?? [],
        reviewer_actor_id: inputActor?.actorId ?? null,
        reviewed_at: input.reviewedAt ?? null,
      });
      return review;
    },
    async getCloneReviewEventByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      return events.find((event) => event.idempotency_key === idempotencyKey) ?? null;
    },
    async nextCloneReviewEventIndex() {
      return events.length + 1;
    },
    async insertCloneReviewEvent(_tx: unknown, input: Record<string, unknown>) {
      const inputActor = input.actor as ReturnType<typeof actor>;
      const row = {
        id: `event-${events.length + 1}`,
        review_id: input.reviewId,
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
        blockers_json: input.blockersJson ?? [],
        privacy_label: input.privacyLabel ?? "client_confidential",
        retention_class: input.retentionClass ?? "compliance_long",
        metadata_json: input.metadataJson ?? {},
        idempotency_key: input.idempotencyKey,
        created_at: "2026-07-30T12:00:00.000Z",
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
    async updateMigrationCurrentState(_tx: unknown, input: Record<string, unknown>) {
      migration.current_state = input.toState as string;
      return { ...migration, latest_state_event_id: input.latestStateEventId };
    },
    async upsertStageSummary(_tx: unknown, input: Record<string, unknown>) {
      stageSummaries.push(input);
      return input;
    },
  };
  return repo as never;
}

test("create or reuse review records stable clone refs and review-required state", async () => {
  const service = new CloneReviewService(fakeRepository({ migrationState: "clone_generation_completed" }));
  const created = await service.createOrReuseReview(createInput());
  assert.equal(created.review.id, REVIEW_ID);
  assert.equal(created.eventId, "event-1");
});

test("add clone refs and fidelity findings append review events", async () => {
  const service = new CloneReviewService(fakeRepository());
  const ref = await service.recordRef({
    reviewId: REVIEW_ID,
    migrationId: MIGRATION_ID,
    refRole: "screenshot",
    refType: "png",
    sourceRecordId: "screenshot-1",
    actor: actor(),
    correlationId: "corr-ref",
    idempotencyKey: "idem-ref",
  });
  const item = await service.addFinding(finding());
  assert.equal(ref.refId, "ref-4");
  assert.equal(item.item.fidelity_category, "layout");
  assert.equal(item.eventId, "event-2");
});

test("ready, in review, accept, limitations, retry, reject, and supersede decisions work", async () => {
  assert.equal((await new CloneReviewService(fakeRepository()).markReadyForReview(decision({ idempotencyKey: "idem-ready" }))).review.review_status, "ready_for_review");
  assert.equal((await new CloneReviewService(fakeRepository()).startReview(decision({ idempotencyKey: "idem-start" }))).review.review_status, "in_review");
  assert.equal((await new CloneReviewService(fakeRepository()).accept(decision({ idempotencyKey: "idem-accept" }))).review.proposal_planning_allowed, true);
  assert.equal(
    (await new CloneReviewService(fakeRepository()).acceptWithLimitations(decision({ idempotencyKey: "idem-limit", limitationsJson: [{ category: "font" }] }))).review.review_status,
    "accepted_with_limitations",
  );
  assert.equal((await new CloneReviewService(fakeRepository()).requireRetry(decision({ idempotencyKey: "idem-retry", reason: "hero missing" }))).review.review_status, "retry_required");
  assert.equal((await new CloneReviewService(fakeRepository()).reject(decision({ idempotencyKey: "idem-reject", reason: "not a clone" }))).review.review_status, "rejected");
  assert.equal((await new CloneReviewService(fakeRepository()).supersede(decision({ idempotencyKey: "idem-super", reason: "new clone" }))).review.review_status, "superseded");
});

test("accept blocks p0/p1 open blockers and terminal migrations cannot accept", async () => {
  await assert.rejects(
    () =>
      new CloneReviewService(
        fakeRepository({ seedItems: [{ item_key: "p0", severity: "p0_blocker", status: "open", accepted_limitation: false }] }),
      ).accept(decision({ idempotencyKey: "idem-accept-p0" })),
    /p0\/p1/,
  );
  await assert.rejects(
    () => new CloneReviewService(fakeRepository({ migrationState: "migration_failed" })).accept(decision({ idempotencyKey: "idem-terminal" })),
    /terminal migration state/,
  );
});

test("accepted with limitations requires limitations and allows proposal readiness", async () => {
  await assert.rejects(
    () => new CloneReviewService(fakeRepository()).acceptWithLimitations(decision({ idempotencyKey: "idem-limit-missing" })),
    /limitations/,
  );
  const service = new CloneReviewService(fakeRepository());
  await service.acceptWithLimitations(decision({ idempotencyKey: "idem-limit-ok", limitationsJson: [{ category: "spacing" }] }));
  const readiness = await service.getProposalReadiness(MIGRATION_ID);
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.limitations, [{ category: "spacing" }]);
});

test("retry, reject, and missing review block proposal readiness", async () => {
  const retryService = new CloneReviewService(fakeRepository());
  await retryService.requireRetry(decision({ idempotencyKey: "idem-retry-readiness", reason: "fix clone" }));
  assert.equal((await retryService.getProposalReadiness(MIGRATION_ID)).ready, false);

  const rejectService = new CloneReviewService(fakeRepository());
  await rejectService.reject(decision({ idempotencyKey: "idem-reject-readiness", reason: "wrong page" }));
  assert.equal((await rejectService.getProposalReadiness(MIGRATION_ID)).ready, false);
});

test("idempotent retry reuses the same semantic payload and drift conflicts", async () => {
  const service = new CloneReviewService(fakeRepository());
  const first = await service.accept(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "ok" } }));
  const replay = await service.accept(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "ok" } }));
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.accept(decision({ idempotencyKey: "idem-replay", detailsJson: { note: "changed" } })),
    SingleSiteIdempotencyConflictError,
  );
});

test("service has no publish active pointer provider or proposal side effects", async () => {
  const repo = fakeRepository({ proposalRows: [], publishRows: [] }) as unknown as { proposalRows: unknown[]; publishRows: unknown[] };
  const service = new CloneReviewService(repo as never);
  await service.accept(decision({ idempotencyKey: "idem-side-effects" }));
  assert.deepEqual(repo.proposalRows, []);
  assert.deepEqual(repo.publishRows, []);
});

test("clone review SQL migration is additive, append-only, and boundary scoped", () => {
  const sql = readFileSync(SQL_PATH, "utf8");
  for (const tableName of [
    "gnr8_single_site_clone_reviews",
    "gnr8_single_site_clone_review_refs",
    "gnr8_single_site_clone_review_items",
    "gnr8_single_site_clone_review_events",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  for (const value of ["draft", "ready_for_review", "in_review", "accepted", "accepted_with_limitations", "retry_required", "rejected", "superseded"]) {
    assert.match(sql, new RegExp(`'${value}'`, "i"));
  }
  for (const value of ["p0_blocker", "p1_major", "p2_minor", "p3_note", "layout", "responsive", "seo_metadata", "unknown_or_manual"]) {
    assert.match(sql, new RegExp(`'${value}'`, "i"));
  }
  assert.match(sql, /trg_gnr8_single_site_clone_review_refs_append_only/i);
  assert.match(sql, /trg_gnr8_single_site_clone_review_events_append_only/i);
  assert.doesNotMatch(sql, /create\s+policy|grant\s+(select|insert|update|delete)|stripe|openprovider|vercel|active_pointer|publish_ready|generated_website_proposals/i);
});
