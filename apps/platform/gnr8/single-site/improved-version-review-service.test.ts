import assert from "node:assert/strict";
import test from "node:test";

import { ImprovedVersionReviewService, type CreateOrReuseImprovedVersionReviewInput } from "./improved-version-review-service";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const ATTEMPT_ID = "55555555-5555-4555-8555-555555555555";
const RECOMMENDATION_ID = "66666666-6666-4666-8666-666666666666";
const REVIEW_ID = "77777777-7777-4777-8777-777777777777";

function actor() {
  return { actorType: "human" as const, actorId: "improved-reviewer", actorRole: "migration_operator" };
}

function createInput(overrides: Partial<CreateOrReuseImprovedVersionReviewInput> = {}): CreateOrReuseImprovedVersionReviewInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    executionAttemptId: ATTEMPT_ID,
    actor: actor(),
    correlationId: "corr-improved-review",
    idempotencyKey: "idem-improved-review",
    ...overrides,
  };
}

function fakeRepository(options: { migrationState?: string; attemptStatus?: string; improvedRefs?: boolean } = {}): never {
  const migration = {
    id: MIGRATION_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "improvement_implementation_completed",
    current_stage: "improvement_content",
    state_version: 10,
  };
  const attempt = {
    id: ATTEMPT_ID,
    migration_id: MIGRATION_ID,
    proposal_plan_id: PLAN_ID,
    proposal_approval_decision_id: "proposal-decision-1",
    implementation_authorization_decision_id: "auth-decision-1",
    clone_site_version_ref: "clone-version-1",
    clone_runtime_artifact_ref: "clone-artifact-1",
    source_evidence_review_id: "88888888-8888-4888-8888-888888888888",
    selected_recommendation_refs_json: [
      {
        recommendationId: RECOMMENDATION_ID,
        sourceRecordId: RECOMMENDATION_ID,
        sourceTable: "gnr8_single_site_improvement_proposal_recommendations",
        recommendationKey: "hero-copy",
      },
    ],
    limitations_json: [{ source: "execution", summary: "Hero only" }],
    status: options.attemptStatus ?? "completed",
    improved_candidate_site_version_ref: options.improvedRefs === false ? null : "improved-version-1",
    improved_runtime_artifact_ref: options.improvedRefs === false ? null : "improved-artifact-1",
    output_refs_json: { plannedChangeSetRef: "planned-change-set-1" },
  };
  const tables: Record<string, Record<string, unknown>[]> = {
    gnr8_single_site_improved_version_reviews: [],
    gnr8_single_site_improved_version_review_refs: [],
    gnr8_single_site_improved_version_review_items: [],
    gnr8_single_site_improved_version_review_events: [],
    gnr8_single_site_improved_version_review_supersessions: [],
  };
  const stateEvents: Record<string, unknown>[] = [];
  const migrationRefs: Record<string, unknown>[] = [];
  const stageSummaries: Record<string, unknown>[] = [];
  const runtimeMutations: unknown[] = [];
  const providerCalls: unknown[] = [];
  const activePointerMutations: unknown[] = [];

  function rows(table: string) {
    return tables[table];
  }

  const tx = {
    async query(sql: string, values: readonly unknown[] = []) {
      const insert = sql.match(/insert into public\.(\w+)\s+\(([^)]+)\)/);
      if (insert) {
        const table = insert[1];
        const columns = insert[2].split(",").map((column) => column.trim());
        const idempotencyIndex = columns.indexOf("idempotency_key");
        const idempotencyKey = idempotencyIndex >= 0 ? values[idempotencyIndex] : null;
        const existing = idempotencyKey ? rows(table).find((row) => row.idempotency_key === idempotencyKey) : null;
        if (existing) return { rows: [], rowCount: 0 };
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
        row.id = table === "gnr8_single_site_improved_version_reviews" ? REVIEW_ID : `${table}-${rows(table).length + 1}`;
        row.created_at = "2026-07-31T12:00:00.000Z";
        row.updated_at = "2026-07-31T12:00:00.000Z";
        if (table === "gnr8_single_site_improved_version_reviews") {
          row.content_approval_ready = false;
          row.accepted_with_limitations = false;
          row.retry_required = false;
          row.review_decision = null;
          row.content_approval_granted = false;
          row.client_approval_granted = false;
          row.launch_approval_granted = false;
          row.publish_activation_approval_granted = false;
          row.active_pointer_changed = false;
          row.runtime_artifacts_mutated = false;
          row.site_versions_mutated = false;
        }
        rows(table).push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_improved_version_reviews")) {
        if (sql.includes("where id =")) return { rows: rows("gnr8_single_site_improved_version_reviews").filter((row) => row.id === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_improved_version_reviews"), rowCount: rows("gnr8_single_site_improved_version_reviews").length };
      }
      if (sql.includes("from public.gnr8_single_site_improved_version_review_events")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_improved_version_review_events").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        if (sql.includes("coalesce(max(event_index)")) {
          return { rows: [{ event_index: rows("gnr8_single_site_improved_version_review_events").length + 1 }], rowCount: 1 };
        }
        return { rows: rows("gnr8_single_site_improved_version_review_events"), rowCount: rows("gnr8_single_site_improved_version_review_events").length };
      }
      if (sql.includes("from public.gnr8_single_site_improved_version_review_refs")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_improved_version_review_refs").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_improved_version_review_refs").filter((row) => row.review_id === values[0]), rowCount: rows("gnr8_single_site_improved_version_review_refs").length };
      }
      if (sql.includes("from public.gnr8_single_site_improved_version_review_items")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_improved_version_review_items").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_improved_version_review_items").filter((row) => row.review_id === values[0]), rowCount: rows("gnr8_single_site_improved_version_review_items").length };
      }
      if (sql.includes("update public.gnr8_single_site_improved_version_reviews")) {
        const review = rows("gnr8_single_site_improved_version_reviews").find((row) => row.id === values[0]);
        if (!review) return { rows: [], rowCount: 0 };
        Object.assign(review, {
          review_status: values[1],
          review_decision: values[2],
          content_approval_ready: values[3],
          accepted_with_limitations: values[4],
          retry_required: values[5],
          proposal_alignment_summary_json: values[6] ?? review.proposal_alignment_summary_json,
          limitations_json: values[7] ?? review.limitations_json,
          warnings_json: values[8] ?? review.warnings_json,
          blockers_json: values[9] ?? review.blockers_json,
          diagnostics_json: values[10] ?? review.diagnostics_json,
          reviewer_actor_type: values[11] ?? review.reviewer_actor_type,
          reviewer_actor_id: values[12] ?? review.reviewer_actor_id,
          reviewer_actor_role: values[13] ?? review.reviewer_actor_role,
          reviewer_actor_display_label: values[14] ?? review.reviewer_actor_display_label,
          review_started_at: values[15] ?? review.review_started_at,
          reviewed_at: values[16] ?? review.reviewed_at,
          superseded_by_review_id: values[17] ?? review.superseded_by_review_id,
        });
        return { rows: [review], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };

  const repo = {
    tables,
    runtimeMutations,
    providerCalls,
    activePointerMutations,
    async withTransaction(fn: (client: unknown) => Promise<unknown>) {
      return fn(tx);
    },
    async getMigrationById() {
      return migration;
    },
    async getImprovementExecutionAttemptById() {
      return attempt;
    },
    async getLatestImprovementExecutionAttemptForMigration() {
      return attempt;
    },
    async insertMigrationRef(_tx: unknown, input: Record<string, unknown>) {
      migrationRefs.push({ id: `migration-ref-${migrationRefs.length + 1}`, ...input });
      return { row: migrationRefs.at(-1), reusedExisting: false };
    },
    async insertStateEvent(_tx: unknown, input: Record<string, unknown>) {
      const row = { id: `state-event-${stateEvents.length + 1}`, ...input };
      stateEvents.push(row);
      return { row, reusedExisting: false };
    },
    async nextStateEventIndex() {
      return stateEvents.length + 1;
    },
    async updateMigrationCurrentState(_tx: unknown, input: Record<string, unknown>) {
      migration.current_state = String(input.toState);
      return migration;
    },
    async upsertStageSummary(_tx: unknown, input: Record<string, unknown>) {
      stageSummaries.push(input);
      return input;
    },
  };
  return repo as never;
}

async function createReview(service: ImprovedVersionReviewService) {
  const created = await service.createOrReuseReview(createInput());
  await service.markReadyForReview({ reviewId: created.review.id, actor: actor(), correlationId: "corr-ready", idempotencyKey: "idem-ready" });
  return (await service.startReview({ reviewId: created.review.id, actor: actor(), correlationId: "corr-start", idempotencyKey: "idem-start" })).review;
}

test("create or reuse review records required improved candidate, execution, proposal, recommendation, dry-run, and migration refs", async () => {
  const repo = fakeRepository() as unknown as { tables: Record<string, Record<string, unknown>[]> };
  const service = new ImprovedVersionReviewService(repo as never);
  const created = await service.createOrReuseReview(createInput());
  const replay = await service.createOrReuseReview(createInput());
  assert.equal(created.review.id, REVIEW_ID);
  assert.equal(replay.reusedExisting, true);
  assert.equal(created.review.improved_candidate_site_version_ref, "improved-version-1");
  assert.equal(created.review.improved_runtime_artifact_ref, "improved-artifact-1");
  assert.equal(repo.tables.gnr8_single_site_improved_version_review_refs.length, 14);
});

test("blocks review before completed execution and without improved candidate refs", async () => {
  await assert.rejects(() => new ImprovedVersionReviewService(fakeRepository({ attemptStatus: "started" })).createOrReuseReview(createInput()), /completed/);
  await assert.rejects(() => new ImprovedVersionReviewService(fakeRepository({ improvedRefs: false })).createOrReuseReview(createInput()), /improved candidate refs/);
});

test("findings, ready/start, accept, accept_with_limitations, retry, reject, cancel, and supersede are represented", async () => {
  const repo = fakeRepository() as unknown as { runtimeMutations: unknown[]; providerCalls: unknown[]; activePointerMutations: unknown[] };
  const service = new ImprovedVersionReviewService(repo as never);
  const review = await createReview(service);
  const item = await service.addFinding({
    reviewId: review.id,
    migrationId: MIGRATION_ID,
    itemKey: "minor-copy-note",
    category: "proposal_alignment",
    severity: "p2_minor",
    requiredRecommendationApplied: true,
    findingSummary: "Recommendation is reflected in the hero copy.",
    actor: actor(),
    correlationId: "corr-item",
    idempotencyKey: "idem-item",
  });
  assert.equal(item.item.category, "proposal_alignment");
  const accepted = await service.accept({ reviewId: review.id, actor: actor(), correlationId: "corr-accept", idempotencyKey: "idem-accept" });
  assert.equal(accepted.review.review_status, "accepted");
  assert.equal(accepted.review.content_approval_ready, true);
  assert.equal(accepted.review.content_approval_granted, false);
  assert.equal(accepted.review.client_approval_granted, false);
  assert.equal(accepted.review.launch_approval_granted, false);
  assert.equal(accepted.review.publish_activation_approval_granted, false);

  const limitedService = new ImprovedVersionReviewService(fakeRepository());
  const limitedReview = await createReview(limitedService);
  assert.equal(
    (await limitedService.acceptWithLimitations({ reviewId: limitedReview.id, limitationsJson: [{ summary: "Manual content check needed" }], actor: actor(), correlationId: "corr-limited", idempotencyKey: "idem-limited" })).review.review_status,
    "accepted_with_limitations",
  );
  for (const [method, status] of [
    ["requireRetry", "retry_required"],
    ["reject", "rejected"],
    ["cancel", "cancelled"],
    ["supersede", "superseded"],
  ] as const) {
    const s = new ImprovedVersionReviewService(fakeRepository());
    const r = await createReview(s);
    const result = await s[method]({ reviewId: r.id, reason: "fixture decision", actor: actor(), correlationId: `corr-${status}`, idempotencyKey: `idem-${status}` });
    assert.equal(result.review.review_status, status);
  }
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.activePointerMutations, []);
});

test("acceptance blocks unresolved p0 blockers and unapplied required recommendations without limitation", async () => {
  const service = new ImprovedVersionReviewService(fakeRepository());
  const review = await createReview(service);
  await service.addFinding({
    reviewId: review.id,
    migrationId: MIGRATION_ID,
    itemKey: "p0-missing",
    category: "proposal_alignment",
    severity: "p0_blocker",
    requiredRecommendationApplied: false,
    findingSummary: "Required recommendation missing.",
    actor: actor(),
    correlationId: "corr-p0",
    idempotencyKey: "idem-p0",
  });
  await assert.rejects(() => service.accept({ reviewId: review.id, actor: actor(), correlationId: "corr-blocked", idempotencyKey: "idem-blocked" }), /p0 blockers/);
});

test("idempotent retry works and idempotency drift conflicts", async () => {
  const service = new ImprovedVersionReviewService(fakeRepository());
  const review = await createReview(service);
  const first = await service.reject({ reviewId: review.id, reason: "not aligned", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  const replay = await service.reject({ reviewId: review.id, reason: "not aligned", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.reject({ reviewId: review.id, reason: "changed", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" }),
    SingleSiteIdempotencyConflictError,
  );
});
