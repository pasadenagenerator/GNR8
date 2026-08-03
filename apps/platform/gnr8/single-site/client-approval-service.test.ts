import assert from "node:assert/strict";
import test from "node:test";

import { ClientApprovalService, type ClientApprovalAafValidationResult, type CreateOrReuseClientApprovalInput } from "./client-approval-service";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const REVIEW_ID = "44444444-4444-4444-8444-444444444444";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";
const ATTEMPT_ID = "66666666-6666-4666-8666-666666666666";
const RECOMMENDATION_ID = "88888888-8888-4888-8888-888888888888";
const CLIENT_APPROVAL_ID = "99999999-9999-4999-8999-999999999999";
const CONTENT_APPROVAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function actor() {
  return { actorType: "human" as const, actorId: "client-reviewer", actorRole: "migration_operator" };
}

function validation(decisionId: string, status: "granted" | "granted_with_limitations" = "granted"): ClientApprovalAafValidationResult {
  return {
    valid: true,
    status,
    scope: "single_site_client_approval",
    subjectType: "single_site_improved_candidate_client_acceptance",
    subjectId: CLIENT_APPROVAL_ID,
    approvalRequestId: "aaf-request-1",
    approvalDecisionId: decisionId,
    evidencePackageId: "aaf-evidence-1",
    limitations: status === "granted_with_limitations" ? [{ summary: "Legal disclaimer is operator-accepted." }] : [],
    blockerCodes: [],
    semanticWatermark: "single-site-client-approval:test",
  };
}

function createInput(overrides: Partial<CreateOrReuseClientApprovalInput> = {}): CreateOrReuseClientApprovalInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    contentApprovalId: CONTENT_APPROVAL_ID,
    actor: actor(),
    correlationId: "corr-client-approval",
    idempotencyKey: "idem-client-approval",
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

function fakeRepository(options: { migrationState?: string; contentStatus?: string; contentReady?: boolean; improvedRefs?: boolean; contentLimitations?: unknown[]; missingContentAaf?: boolean } = {}): never {
  const migration = {
    id: MIGRATION_ID,
    tenant_id: "tenant-test",
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    current_state: options.migrationState ?? "content_approved",
    current_stage: "improvement_content",
    state_version: 12,
  };
  const contentApproval = {
    id: CONTENT_APPROVAL_ID,
    migration_id: MIGRATION_ID,
    client_id: CLIENT_ID,
    site_id: SITE_ID,
    content_approval_ready: ["approved", "approved_with_limitations"].includes(options.contentStatus ?? "approved"),
    client_or_launch_approval_ready: options.contentReady ?? true,
    status: options.contentStatus ?? "approved",
    aaf_content_approval_decision_id: options.missingContentAaf ? null : "content-aaf-decision-1",
    proposal_plan_id: PLAN_ID,
    proposal_approval_decision_id: "proposal-decision-1",
    implementation_authorization_decision_id: "auth-decision-1",
    execution_attempt_id: ATTEMPT_ID,
    improved_candidate_site_version_ref: options.improvedRefs === false ? null : "improved-version-1",
    improved_runtime_artifact_ref: options.improvedRefs === false ? null : "improved-artifact-1",
    improved_version_review_id: REVIEW_ID,
    improved_version_review_status: "accepted",
    selected_recommendation_refs_json: [{ recommendationId: RECOMMENDATION_ID, sourceRecordId: RECOMMENDATION_ID, recommendationKey: "hero-copy" }],
    limitations_json: options.contentLimitations ?? [],
  };
  const tables: Record<string, Record<string, unknown>[]> = {
    gnr8_single_site_client_approvals: [],
    gnr8_single_site_client_approval_refs: [],
    gnr8_single_site_client_approval_items: [],
    gnr8_single_site_client_approval_events: [],
    gnr8_single_site_client_approval_supersessions: [],
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
        row.id = table === "gnr8_single_site_client_approvals" ? CLIENT_APPROVAL_ID : `${table}-${rows(table).length + 1}`;
        row.created_at = "2026-08-03T12:00:00.000Z";
        row.updated_at = "2026-08-03T12:00:00.000Z";
        if (table === "gnr8_single_site_client_approvals") {
          row.decision = null;
          row.client_approval_ready = false;
          row.approved_with_limitations = false;
          row.launch_approval_ready = false;
          row.client_revision_required = false;
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
      if (sql.includes("from public.gnr8_single_site_content_approvals")) {
        if (sql.includes("where id =")) return { rows: contentApproval.id === values[0] ? [contentApproval] : [], rowCount: 1 };
        return { rows: [contentApproval], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_client_approvals")) {
        if (sql.includes("where id =")) return { rows: rows("gnr8_single_site_client_approvals").filter((row) => row.id === values[0]), rowCount: 1 };
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_client_approvals").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_client_approvals"), rowCount: rows("gnr8_single_site_client_approvals").length };
      }
      if (sql.includes("from public.gnr8_single_site_client_approval_events")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_client_approval_events").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        if (sql.includes("coalesce(max(event_index)")) return { rows: [{ event_index: rows("gnr8_single_site_client_approval_events").length + 1 }], rowCount: 1 };
        return { rows: rows("gnr8_single_site_client_approval_events"), rowCount: rows("gnr8_single_site_client_approval_events").length };
      }
      if (sql.includes("from public.gnr8_single_site_client_approval_refs")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_client_approval_refs").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_client_approval_refs").filter((row) => row.client_approval_id === values[0]), rowCount: rows("gnr8_single_site_client_approval_refs").length };
      }
      if (sql.includes("from public.gnr8_single_site_client_approval_items")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_client_approval_items").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_client_approval_items").filter((row) => row.client_approval_id === values[0]), rowCount: rows("gnr8_single_site_client_approval_items").length };
      }
      if (sql.includes("update public.gnr8_single_site_client_approvals") && sql.includes("status = $2")) {
        const current = rows("gnr8_single_site_client_approvals").find((row) => row.id === values[0]);
        if (!current) return { rows: [], rowCount: 0 };
        const updated = {
          ...current,
          status: values[1],
          decision: values[2],
          client_approval_ready: values[3],
          approved_with_limitations: values[4],
          launch_approval_ready: values[5],
          client_revision_required: values[6],
          client_approval_granted: values[7],
          aaf_client_approval_decision_id: values[8] ?? current.aaf_client_approval_decision_id,
          aaf_client_approval_scope: values[9] ?? current.aaf_client_approval_scope,
          aaf_client_approval_action: values[10] ?? current.aaf_client_approval_action,
          aaf_client_approval_subject_type: values[11] ?? current.aaf_client_approval_subject_type,
          limitations_json: values[12] ?? current.limitations_json,
          deferred_or_not_applied_recommendation_refs_json: values[13] ?? current.deferred_or_not_applied_recommendation_refs_json,
          operator_notes_json: values[14] ?? current.operator_notes_json,
          findings_summary_json: values[15] ?? current.findings_summary_json,
          decision_summary_json: values[16] ?? current.decision_summary_json,
          reviewer_actor_type: values[17] ?? current.reviewer_actor_type,
          reviewer_actor_id: values[18] ?? current.reviewer_actor_id,
          reviewer_actor_role: values[19] ?? current.reviewer_actor_role,
          reviewer_actor_display_label: values[20] ?? current.reviewer_actor_display_label,
          review_started_at: values[21] ?? current.review_started_at,
          decided_at: values[22] ?? current.decided_at,
          superseded_by_client_approval_id: values[23] ?? current.superseded_by_client_approval_id,
        };
        rows("gnr8_single_site_client_approvals")[rows("gnr8_single_site_client_approvals").indexOf(current)] = updated;
        return { rows: [updated], rowCount: 1 };
      }
      if (sql.includes("update public.gnr8_single_site_client_approvals")) {
        const approval = rows("gnr8_single_site_client_approvals").find((row) => row.id === values[0]);
        if (approval) {
          approval.aaf_client_approval_request_id = values[1] ?? approval.aaf_client_approval_request_id;
          approval.aaf_client_approval_decision_id = values[2] ?? approval.aaf_client_approval_decision_id;
          approval.aaf_client_approval_scope = values[3];
          approval.aaf_client_approval_action = values[4];
          approval.aaf_client_approval_subject_type = values[5];
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

async function createClientApproval(service: ClientApprovalService) {
  const created = await service.createOrReuseClientApproval(createInput());
  await service.markReadyForReview({ clientApprovalId: created.clientApproval.id, actor: actor(), correlationId: "corr-ready", idempotencyKey: "idem-ready" });
  return (await service.startReview({ clientApprovalId: created.clientApproval.id, actor: actor(), correlationId: "corr-start", idempotencyKey: "idem-start" })).clientApproval;
}

test("create or reuse client approval records required refs and carries content approval limitations", async () => {
  const repo = fakeRepository({ contentStatus: "approved_with_limitations", contentLimitations: [{ summary: "Manual copy caveat" }] }) as unknown as {
    tables: Record<string, Record<string, unknown>[]>;
    migration: { current_state: string };
  };
  const service = new ClientApprovalService(repo as never);
  const created = await service.createOrReuseClientApproval(createInput());
  const replay = await service.createOrReuseClientApproval(createInput());
  assert.equal(created.clientApproval.id, CLIENT_APPROVAL_ID);
  assert.equal(replay.reusedExisting, true);
  assert.equal(repo.migration.current_state, "client_approval_required");
  assert.equal(repo.tables.gnr8_single_site_client_approval_refs.length, 15);
  assert.deepEqual(jsonValue(created.clientApproval.limitations_json), [{ summary: "Manual copy caveat" }]);
});

test("blocks before approved content approval and without improved candidate refs", async () => {
  await assert.rejects(() => new ClientApprovalService(fakeRepository({ contentStatus: "in_review" })).createOrReuseClientApproval(createInput()), /approved/);
  await assert.rejects(() => new ClientApprovalService(fakeRepository({ contentReady: false })).createOrReuseClientApproval(createInput()), /approved/);
  await assert.rejects(() => new ClientApprovalService(fakeRepository({ missingContentAaf: true })).createOrReuseClientApproval(createInput()), /AAF content approval decision/);
  await assert.rejects(() => new ClientApprovalService(fakeRepository({ improvedRefs: false })).createOrReuseClientApproval(createInput()), /improved candidate refs/);
});

test("attaches AAF refs, findings, review lifecycle, approvals, rejection, cancellation, and supersession without side effects", async () => {
  const repo = fakeRepository() as unknown as {
    runtimeMutations: unknown[];
    providerCalls: unknown[];
    activePointerMutations: unknown[];
    publishCalls: unknown[];
  };
  const service = new ClientApprovalService(repo as never);
  const approval = await createClientApproval(service);
  await service.attachAafRequestRef({
    clientApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_request",
    refType: "aaf_approval_request",
    sourceRecordId: "aaf-request-1",
    actor: actor(),
    correlationId: "corr-aaf-request",
    idempotencyKey: "idem-aaf-request",
  });
  await service.attachAafDecisionRef({
    clientApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-1",
    clientApprovalValidation: validation("aaf-decision-1"),
    actor: actor(),
    correlationId: "corr-aaf-decision",
    idempotencyKey: "idem-aaf-decision",
  });
  const item = await service.addFinding({
    clientApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    itemKey: "business-note",
    category: "content_acceptance",
    severity: "p2_minor",
    requiredRecommendationApplied: true,
    findingSummary: "Client representative accepts the improved candidate.",
    actor: actor(),
    correlationId: "corr-item",
    idempotencyKey: "idem-item",
  });
  assert.equal(item.item.category, "content_acceptance");
  const approved = await service.approve({
    clientApprovalId: approval.id,
    aafClientApprovalDecisionId: "aaf-decision-1",
    clientApprovalValidation: validation("aaf-decision-1"),
    actor: actor(),
    correlationId: "corr-approve",
    idempotencyKey: "idem-approve",
  });
  assert.equal(approved.clientApproval.status, "approved");
  assert.equal(approved.clientApproval.launch_approval_ready, true);
  assert.equal(approved.clientApproval.client_approval_granted, true);
  assert.equal(approved.clientApproval.launch_approval_granted, false);
  assert.equal(approved.clientApproval.publish_activation_approval_granted, false);

  const limitedService = new ClientApprovalService(fakeRepository());
  const limitedApproval = await createClientApproval(limitedService);
  await limitedService.attachAafDecisionRef({
    clientApprovalId: limitedApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-limited",
    clientApprovalValidation: validation("aaf-decision-limited", "granted_with_limitations"),
    actor: actor(),
    correlationId: "corr-limited-aaf",
    idempotencyKey: "idem-limited-aaf",
  });
  assert.equal(
    (await limitedService.approveWithLimitations({
      clientApprovalId: limitedApproval.id,
      aafClientApprovalDecisionId: "aaf-decision-limited",
      clientApprovalValidation: validation("aaf-decision-limited", "granted_with_limitations"),
      actor: actor(),
      correlationId: "corr-limited",
      idempotencyKey: "idem-limited",
    })).clientApproval.status,
    "approved_with_limitations",
  );

  for (const [method, status] of [
    ["requestChanges", "changes_requested"],
    ["reject", "rejected"],
    ["cancel", "cancelled"],
    ["supersede", "superseded"],
  ] as const) {
    const s = new ClientApprovalService(fakeRepository());
    const r = await createClientApproval(s);
    const result = await s[method]({ clientApprovalId: r.id, reason: "fixture decision", actor: actor(), correlationId: `corr-${status}`, idempotencyKey: `idem-${status}` });
    assert.equal(result.clientApproval.status, status);
  }
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.activePointerMutations, []);
  assert.deepEqual(repo.publishCalls, []);
});

test("blocks approval without AAF decision, with p0 blockers, and with required not-applied recommendations lacking exceptions", async () => {
  const service = new ClientApprovalService(fakeRepository());
  const approval = await createClientApproval(service);
  await assert.rejects(() => service.approve({ clientApprovalId: approval.id, actor: actor(), correlationId: "corr-no-aaf", idempotencyKey: "idem-no-aaf" }), /AAF client approval decision/);
  await service.attachAafDecisionRef({
    clientApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-unvalidated",
    actor: actor(),
    correlationId: "corr-unvalidated-aaf",
    idempotencyKey: "idem-unvalidated-aaf",
  });
  await assert.rejects(
    () =>
      service.attachAafDecisionRef({
        clientApprovalId: approval.id,
        migrationId: MIGRATION_ID,
        refRole: "aaf_client_approval_decision",
        refType: "aaf_approval_decision",
        sourceRecordId: "aaf-decision-wrong-scope",
        clientApprovalValidation: { ...validation("aaf-decision-wrong-scope"), scope: "client_review" },
        actor: actor(),
        correlationId: "corr-wrong-scope-aaf",
        idempotencyKey: "idem-wrong-scope-aaf",
      }),
    /wrong scope/,
  );

  const p0Service = new ClientApprovalService(fakeRepository());
  const p0Approval = await createClientApproval(p0Service);
  await p0Service.attachAafDecisionRef({
    clientApprovalId: p0Approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-p0",
    clientApprovalValidation: validation("aaf-decision-p0"),
    actor: actor(),
    correlationId: "corr-p0-aaf",
    idempotencyKey: "idem-p0-aaf",
  });
  await p0Service.addFinding({
    clientApprovalId: p0Approval.id,
    migrationId: MIGRATION_ID,
    itemKey: "p0-missing",
    category: "content_acceptance",
    severity: "p0_blocker",
    requiredRecommendationApplied: false,
    findingSummary: "Critical content is missing.",
    actor: actor(),
    correlationId: "corr-p0",
    idempotencyKey: "idem-p0",
  });
  await assert.rejects(
    () =>
      p0Service.approve({
        clientApprovalId: p0Approval.id,
        aafClientApprovalDecisionId: "aaf-decision-p0",
        clientApprovalValidation: validation("aaf-decision-p0"),
        actor: actor(),
        correlationId: "corr-p0-approve",
        idempotencyKey: "idem-p0-approve",
      }),
    /p0 blockers/,
  );

  const recService = new ClientApprovalService(fakeRepository());
  const recApproval = await createClientApproval(recService);
  await recService.attachAafDecisionRef({
    clientApprovalId: recApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-rec",
    clientApprovalValidation: validation("aaf-decision-rec"),
    actor: actor(),
    correlationId: "corr-rec-aaf",
    idempotencyKey: "idem-rec-aaf",
  });
  await assert.rejects(
    () =>
      recService.approve({
        clientApprovalId: recApproval.id,
        aafClientApprovalDecisionId: "aaf-decision-rec",
        clientApprovalValidation: validation("aaf-decision-rec"),
        deferredOrNotAppliedRecommendationRefsJson: [{ required: true, recommendationId: RECOMMENDATION_ID }],
        actor: actor(),
        correlationId: "corr-rec-approve",
        idempotencyKey: "idem-rec-approve",
      }),
    /required deferred recommendations/,
  );
});

test("idempotent retry works, idempotency drift conflicts, readiness is scoped, and terminal approvals cannot change", async () => {
  const service = new ClientApprovalService(fakeRepository());
  const approval = await createClientApproval(service);
  const first = await service.reject({ clientApprovalId: approval.id, reason: "not accurate", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  const replay = await service.reject({ clientApprovalId: approval.id, reason: "not accurate", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(
    () => service.reject({ clientApprovalId: approval.id, reason: "changed", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" }),
    SingleSiteIdempotencyConflictError,
  );

  const readyService = new ClientApprovalService(fakeRepository());
  const readyApproval = await createClientApproval(readyService);
  await readyService.attachAafDecisionRef({
    clientApprovalId: readyApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_client_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "aaf-decision-ready",
    clientApprovalValidation: validation("aaf-decision-ready"),
    actor: actor(),
    correlationId: "corr-ready-aaf",
    idempotencyKey: "idem-ready-aaf",
  });
  await readyService.approve({
    clientApprovalId: readyApproval.id,
    aafClientApprovalDecisionId: "aaf-decision-ready",
    clientApprovalValidation: validation("aaf-decision-ready"),
    actor: actor(),
    correlationId: "corr-ready-approve",
    idempotencyKey: "idem-ready-approve",
  });
  const readiness = await readyService.getLaunchApprovalReadiness(MIGRATION_ID);
  assert.equal(readiness.ready, true);
  await assert.rejects(
    () =>
      readyService.addFinding({
        clientApprovalId: readyApproval.id,
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
