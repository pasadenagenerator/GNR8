import assert from "node:assert/strict";
import test from "node:test";

import { ContentApprovalService, type CreateOrReuseContentApprovalInput } from "./content-approval-service";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const REVIEW_ID = "44444444-4444-4444-8444-444444444444";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";
const ATTEMPT_ID = "66666666-6666-4666-8666-666666666666";
const CLONE_REVIEW_ID = "77777777-7777-4777-8777-777777777777";
const RECOMMENDATION_ID = "88888888-8888-4888-8888-888888888888";
const CONTENT_APPROVAL_ID = "99999999-9999-4999-8999-999999999999";

function actor() {
  return { actorType: "human" as const, actorId: "content-reviewer", actorRole: "migration_operator" };
}

function createInput(overrides: Partial<CreateOrReuseContentApprovalInput> = {}): CreateOrReuseContentApprovalInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    improvedVersionReviewId: REVIEW_ID,
    actor: actor(),
    correlationId: "corr-content-approval",
    idempotencyKey: "idem-content-approval",
    ...overrides,
  };
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function fakeRepository(options: { migrationState?: string; reviewStatus?: string; contentReady?: boolean; improvedRefs?: boolean; reviewLimitations?: unknown[] } = {}): never {
  const migration = {
    id: MIGRATION_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "improved_version_review_required",
    current_stage: "improvement_content",
    state_version: 12,
  };
  const review = {
    id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    proposal_plan_id: PLAN_ID,
    proposal_approval_decision_id: "proposal-decision-1",
    implementation_authorization_decision_id: "auth-decision-1",
    execution_attempt_id: ATTEMPT_ID,
    improved_candidate_site_version_ref: options.improvedRefs === false ? null : "improved-version-1",
    improved_runtime_artifact_ref: options.improvedRefs === false ? null : "improved-artifact-1",
    clone_site_version_ref: "clone-version-1",
    clone_runtime_artifact_ref: "clone-artifact-1",
    source_evidence_review_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    review_status: options.reviewStatus ?? "accepted",
    content_approval_ready: options.contentReady ?? true,
    selected_recommendation_refs_json: [{ recommendationId: RECOMMENDATION_ID, sourceRecordId: RECOMMENDATION_ID, recommendationKey: "hero-copy" }],
    limitations_json: options.reviewLimitations ?? [],
  };
  const attempt = {
    id: ATTEMPT_ID,
    migration_id: MIGRATION_ID,
    clone_review_id: CLONE_REVIEW_ID,
    clone_site_version_ref: "clone-version-1",
    clone_runtime_artifact_ref: "clone-artifact-1",
  };
  const tables: Record<string, Record<string, unknown>[]> = {
    gnr8_single_site_content_approvals: [],
    gnr8_single_site_content_approval_refs: [],
    gnr8_single_site_content_approval_items: [],
    gnr8_single_site_content_approval_events: [],
    gnr8_single_site_content_approval_supersessions: [],
  };
  const stateEvents: Record<string, unknown>[] = [];
  const migrationRefs: Record<string, unknown>[] = [];
  const stageSummaries: Record<string, unknown>[] = [];
  const runtimeMutations: unknown[] = [];
  const providerCalls: unknown[] = [];
  const activePointerMutations: unknown[] = [];
  const publishCalls: unknown[] = [];

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
        row.id = table === "gnr8_single_site_content_approvals" ? CONTENT_APPROVAL_ID : `${table}-${rows(table).length + 1}`;
        row.created_at = "2026-08-03T12:00:00.000Z";
        row.updated_at = "2026-08-03T12:00:00.000Z";
        if (table === "gnr8_single_site_content_approvals") {
          row.decision = null;
          row.content_approval_ready = false;
          row.approved_with_limitations = false;
          row.client_or_launch_approval_ready = false;
          row.content_revision_required = false;
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
        if (sql.includes("where id =")) return { rows: review.id === values[0] ? [review] : [], rowCount: 1 };
        return { rows: [review], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_content_approvals")) {
        if (sql.includes("where id =")) return { rows: rows("gnr8_single_site_content_approvals").filter((row) => row.id === values[0]), rowCount: 1 };
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_content_approvals").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_content_approvals"), rowCount: rows("gnr8_single_site_content_approvals").length };
      }
      if (sql.includes("from public.gnr8_single_site_content_approval_events")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_content_approval_events").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        if (sql.includes("coalesce(max(event_index)")) return { rows: [{ event_index: rows("gnr8_single_site_content_approval_events").length + 1 }], rowCount: 1 };
        return { rows: rows("gnr8_single_site_content_approval_events"), rowCount: rows("gnr8_single_site_content_approval_events").length };
      }
      if (sql.includes("from public.gnr8_single_site_content_approval_refs")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_content_approval_refs").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_content_approval_refs").filter((row) => row.content_approval_id === values[0]), rowCount: rows("gnr8_single_site_content_approval_refs").length };
      }
      if (sql.includes("from public.gnr8_single_site_content_approval_items")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_content_approval_items").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_content_approval_items").filter((row) => row.content_approval_id === values[0]), rowCount: rows("gnr8_single_site_content_approval_items").length };
      }
      if (sql.includes("update public.gnr8_single_site_content_approvals") && sql.includes("status = $2")) {
        const current = rows("gnr8_single_site_content_approvals").find((row) => row.id === values[0]);
        if (!current) return { rows: [], rowCount: 0 };
        const updated = {
          ...current,
          status: values[1],
          decision: values[2],
          content_approval_ready: values[3],
          approved_with_limitations: values[4],
          client_or_launch_approval_ready: values[5],
          content_revision_required: values[6],
          aaf_content_approval_decision_id: values[7] ?? current.aaf_content_approval_decision_id,
          aaf_content_approval_scope: values[8] ?? current.aaf_content_approval_scope,
          aaf_content_approval_action: values[9] ?? current.aaf_content_approval_action,
          aaf_content_approval_subject_type: values[10] ?? current.aaf_content_approval_subject_type,
          limitations_json: values[11] ?? current.limitations_json,
          unresolved_not_applied_recommendations_json: values[12] ?? current.unresolved_not_applied_recommendations_json,
          operator_notes_json: values[13] ?? current.operator_notes_json,
          findings_summary_json: values[14] ?? current.findings_summary_json,
          decision_summary_json: values[15] ?? current.decision_summary_json,
          reviewer_actor_type: values[16] ?? current.reviewer_actor_type,
          reviewer_actor_id: values[17] ?? current.reviewer_actor_id,
          reviewer_actor_role: values[18] ?? current.reviewer_actor_role,
          reviewer_actor_display_label: values[19] ?? current.reviewer_actor_display_label,
          review_started_at: values[20] ?? current.review_started_at,
          decided_at: values[21] ?? current.decided_at,
          superseded_by_content_approval_id: values[22] ?? current.superseded_by_content_approval_id,
        };
        rows("gnr8_single_site_content_approvals")[rows("gnr8_single_site_content_approvals").indexOf(current)] = updated;
        return { rows: [updated], rowCount: 1 };
      }
      if (sql.includes("update public.gnr8_single_site_content_approvals")) {
        const approval = rows("gnr8_single_site_content_approvals").find((row) => row.id === values[0]);
        if (approval) {
          approval.aaf_content_approval_request_id = values[1] ?? approval.aaf_content_approval_request_id;
          approval.aaf_content_approval_decision_id = values[2] ?? approval.aaf_content_approval_decision_id;
          approval.aaf_content_approval_scope = values[3];
          approval.aaf_content_approval_action = values[4];
          approval.aaf_content_approval_subject_type = values[5];
        }
        return { rows: approval ? [approval] : [], rowCount: approval ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    },
  };

  const repo = {
    tables,
    migration,
    runtimeMutations,
    providerCalls,
    activePointerMutations,
    publishCalls,
    async withTransaction(fn: (client: unknown) => Promise<unknown>) {
      return fn(tx);
    },
    async getMigrationById() {
      return migration;
    },
    async getImprovementExecutionAttemptById() {
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

async function createContentApproval(service: ContentApprovalService) {
  const created = await service.createOrReuseContentApproval(createInput());
  await service.markReadyForReview({ contentApprovalId: created.contentApproval.id, actor: actor(), correlationId: "corr-ready", idempotencyKey: "idem-ready" });
  return (await service.startReview({ contentApprovalId: created.contentApproval.id, actor: actor(), correlationId: "corr-start", idempotencyKey: "idem-start" })).contentApproval;
}

test("create or reuse content approval records required refs and carries improved review limitations", async () => {
  const repo = fakeRepository({ reviewStatus: "accepted_with_limitations", reviewLimitations: [{ summary: "Manual copy caveat" }] }) as unknown as {
    tables: Record<string, Record<string, unknown>[]>;
    migration: { current_state: string };
  };
  const service = new ContentApprovalService(repo as never);
  const created = await service.createOrReuseContentApproval(createInput());
  const replay = await service.createOrReuseContentApproval(createInput());
  assert.equal(created.contentApproval.id, CONTENT_APPROVAL_ID);
  assert.equal(replay.reusedExisting, true);
  assert.equal(repo.migration.current_state, "content_review_required");
  assert.equal(repo.tables.gnr8_single_site_content_approval_refs.length, 15);
  assert.deepEqual(jsonValue(created.contentApproval.limitations_json), [{ summary: "Manual copy caveat" }]);
});

test("blocks before accepted improved version review and without improved candidate refs", async () => {
  await assert.rejects(() => new ContentApprovalService(fakeRepository({ reviewStatus: "in_review" })).createOrReuseContentApproval(createInput()), /accepted/);
  await assert.rejects(() => new ContentApprovalService(fakeRepository({ contentReady: false })).createOrReuseContentApproval(createInput()), /not ready/);
  await assert.rejects(() => new ContentApprovalService(fakeRepository({ improvedRefs: false })).createOrReuseContentApproval(createInput()), /improved candidate refs/);
});

test("attaches AAF refs, findings, review lifecycle, approvals, rejection, cancellation, and supersession without side effects", async () => {
  const repo = fakeRepository() as unknown as {
    runtimeMutations: unknown[];
    providerCalls: unknown[];
    activePointerMutations: unknown[];
    publishCalls: unknown[];
  };
  const service = new ContentApprovalService(repo as never);
  const approval = await createContentApproval(service);
  await service.attachAafRequestRef({
    contentApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_request",
    refType: "aaf_approval_request",
    sourceRecordId: "aaf-request-1",
    actor: actor(),
    correlationId: "corr-aaf-request",
    idempotencyKey: "idem-aaf-request",
  });
  await service.attachAafDecisionRef({
    contentApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-1",
    actor: actor(),
    correlationId: "corr-aaf-decision",
    idempotencyKey: "idem-aaf-decision",
  });
  const item = await service.addFinding({
    contentApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    itemKey: "copy-note",
    category: "copy_quality",
    severity: "p2_minor",
    requiredRecommendationApplied: true,
    findingSummary: "Hero copy is approved.",
    actor: actor(),
    correlationId: "corr-item",
    idempotencyKey: "idem-item",
  });
  assert.equal(item.item.category, "copy_quality");
  const approved = await service.approve({
    contentApprovalId: approval.id,
    aafContentApprovalDecisionId: "aaf-decision-1",
    actor: actor(),
    correlationId: "corr-approve",
    idempotencyKey: "idem-approve",
  });
  assert.equal(approved.contentApproval.status, "approved");
  assert.equal(approved.contentApproval.client_or_launch_approval_ready, true);
  assert.equal(approved.contentApproval.client_approval_granted, false);
  assert.equal(approved.contentApproval.launch_approval_granted, false);
  assert.equal(approved.contentApproval.publish_activation_approval_granted, false);

  const limitedService = new ContentApprovalService(fakeRepository());
  const limitedApproval = await createContentApproval(limitedService);
  await limitedService.attachAafDecisionRef({
    contentApprovalId: limitedApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-limited",
    actor: actor(),
    correlationId: "corr-limited-aaf",
    idempotencyKey: "idem-limited-aaf",
  });
  assert.equal(
    (await limitedService.approveWithLimitations({
      contentApprovalId: limitedApproval.id,
      aafContentApprovalDecisionId: "aaf-decision-limited",
      limitationsJson: [{ summary: "Legal disclaimer is operator-accepted." }],
      actor: actor(),
      correlationId: "corr-limited",
      idempotencyKey: "idem-limited",
    })).contentApproval.status,
    "approved_with_limitations",
  );

  for (const [method, status] of [
    ["requestChanges", "changes_requested"],
    ["reject", "rejected"],
    ["cancel", "cancelled"],
    ["supersede", "superseded"],
  ] as const) {
    const s = new ContentApprovalService(fakeRepository());
    const r = await createContentApproval(s);
    const result = await s[method]({ contentApprovalId: r.id, reason: "fixture decision", actor: actor(), correlationId: `corr-${status}`, idempotencyKey: `idem-${status}` });
    assert.equal(result.contentApproval.status, status);
  }
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.activePointerMutations, []);
  assert.deepEqual(repo.publishCalls, []);
});

test("blocks approval without AAF decision, with p0 blockers, and with required not-applied recommendations lacking exceptions", async () => {
  const service = new ContentApprovalService(fakeRepository());
  const approval = await createContentApproval(service);
  await assert.rejects(() => service.approve({ contentApprovalId: approval.id, actor: actor(), correlationId: "corr-no-aaf", idempotencyKey: "idem-no-aaf" }), /AAF content approval decision/);

  const p0Service = new ContentApprovalService(fakeRepository());
  const p0Approval = await createContentApproval(p0Service);
  await p0Service.attachAafDecisionRef({
    contentApprovalId: p0Approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-p0",
    actor: actor(),
    correlationId: "corr-p0-aaf",
    idempotencyKey: "idem-p0-aaf",
  });
  await p0Service.addFinding({
    contentApprovalId: p0Approval.id,
    migrationId: MIGRATION_ID,
    itemKey: "p0-missing",
    category: "content_accuracy",
    severity: "p0_blocker",
    requiredRecommendationApplied: false,
    findingSummary: "Critical content is missing.",
    actor: actor(),
    correlationId: "corr-p0",
    idempotencyKey: "idem-p0",
  });
  await assert.rejects(
    () => p0Service.approve({ contentApprovalId: p0Approval.id, aafContentApprovalDecisionId: "aaf-decision-p0", actor: actor(), correlationId: "corr-p0-approve", idempotencyKey: "idem-p0-approve" }),
    /p0 blockers/,
  );

  const recService = new ContentApprovalService(fakeRepository());
  const recApproval = await createContentApproval(recService);
  await recService.attachAafDecisionRef({
    contentApprovalId: recApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-rec",
    actor: actor(),
    correlationId: "corr-rec-aaf",
    idempotencyKey: "idem-rec-aaf",
  });
  await assert.rejects(
    () =>
      recService.approve({
        contentApprovalId: recApproval.id,
        aafContentApprovalDecisionId: "aaf-decision-rec",
        unresolvedNotAppliedRecommendationsJson: [{ required: true, recommendationId: RECOMMENDATION_ID }],
        actor: actor(),
        correlationId: "corr-rec-approve",
        idempotencyKey: "idem-rec-approve",
      }),
    /required not-applied recommendations/,
  );
});

test("idempotent retry works, idempotency drift conflicts, readiness is scoped, and terminal approvals cannot change", async () => {
  const service = new ContentApprovalService(fakeRepository());
  const approval = await createContentApproval(service);
  const first = await service.reject({ contentApprovalId: approval.id, reason: "not accurate", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  const replay = await service.reject({ contentApprovalId: approval.id, reason: "not accurate", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.reject({ contentApprovalId: approval.id, reason: "changed", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" }),
    SingleSiteIdempotencyConflictError,
  );

  const readyService = new ContentApprovalService(fakeRepository());
  const readyApproval = await createContentApproval(readyService);
  await readyService.attachAafDecisionRef({
    contentApprovalId: readyApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_content_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-ready",
    actor: actor(),
    correlationId: "corr-ready-aaf",
    idempotencyKey: "idem-ready-aaf",
  });
  await readyService.approve({ contentApprovalId: readyApproval.id, aafContentApprovalDecisionId: "aaf-decision-ready", actor: actor(), correlationId: "corr-ready-approve", idempotencyKey: "idem-ready-approve" });
  const readiness = await readyService.getClientOrLaunchApprovalReadiness(MIGRATION_ID);
  assert.equal(readiness.ready, true);
  await assert.rejects(
    () =>
      readyService.addFinding({
        contentApprovalId: readyApproval.id,
        migrationId: MIGRATION_ID,
        itemKey: "late",
        category: "manual_note",
        severity: "p3_note",
        findingSummary: "Late mutation attempt.",
        actor: actor(),
        correlationId: "corr-late",
        idempotencyKey: "idem-late",
      }),
    /terminal/,
  );
});
