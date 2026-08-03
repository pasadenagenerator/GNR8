import assert from "node:assert/strict";
import test from "node:test";

import { LaunchApprovalService, type CreateOrReuseLaunchApprovalInput, type LaunchApprovalAafValidationResult } from "./launch-approval-service";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const CONTENT_APPROVAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLIENT_APPROVAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LAUNCH_APPROVAL_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REVIEW_ID = "44444444-4444-4444-8444-444444444444";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";
const ATTEMPT_ID = "66666666-6666-4666-8666-666666666666";
const RECOMMENDATION_ID = "88888888-8888-4888-8888-888888888888";

function actor() {
  return { actorType: "human" as const, actorId: "launch-reviewer", actorRole: "migration_operator" };
}

function validation(decisionId: string, status: "granted" | "granted_with_limitations" = "granted"): LaunchApprovalAafValidationResult {
  return {
    valid: true,
    status,
    scope: "single_site_launch_approval",
    subjectType: "single_site_launch_readiness_review",
    subjectId: LAUNCH_APPROVAL_ID,
    approvalDecisionId: decisionId,
    approvalRequestId: "launch-aaf-request-1",
    evidencePackageId: "launch-aaf-evidence-1",
    limitations: status === "granted_with_limitations" ? [{ summary: "Proceed with tracked launch limitation." }] : [],
    blockerCodes: [],
    semanticWatermark: `single-site-launch-approval:${decisionId}`,
  };
}

function createInput(overrides: Partial<CreateOrReuseLaunchApprovalInput> = {}): CreateOrReuseLaunchApprovalInput {
  return {
    migrationId: MIGRATION_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    contentApprovalId: CONTENT_APPROVAL_ID,
    requiredRefs: {
      domainReadinessRef: "domain-placeholder-1",
      billingHostingEntitlementRef: "billing-placeholder-1",
      rollbackReadinessRef: "rollback-placeholder-1",
      publishTargetRef: "publish-target-placeholder-1",
    },
    launchChecklistRefsJson: [{ sourceRecordId: "launch-checklist-1" }],
    actor: actor(),
    correlationId: "corr-launch-approval",
    idempotencyKey: "idem-launch-approval",
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

function fakeRepository(options: { migrationState?: string; contentStatus?: string; contentReady?: boolean; missingContentAaf?: boolean; requireClient?: boolean; clientStatus?: string; missingClientAaf?: boolean; readinessRefs?: boolean; contentLimitations?: unknown[]; clientLimitations?: unknown[] } = {}): never {
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
    client_or_launch_approval_ready: options.contentReady ?? true,
    status: options.contentStatus ?? "approved",
    aaf_content_approval_decision_id: options.missingContentAaf ? null : "content-aaf-decision-1",
    proposal_plan_id: PLAN_ID,
    proposal_approval_decision_id: "proposal-decision-1",
    implementation_authorization_decision_id: "auth-decision-1",
    execution_attempt_id: ATTEMPT_ID,
    improved_candidate_site_version_ref: "improved-version-1",
    improved_runtime_artifact_ref: "improved-artifact-1",
    improved_version_review_id: REVIEW_ID,
    improved_version_review_status: "accepted",
    selected_recommendation_refs_json: [{ recommendationId: RECOMMENDATION_ID, sourceRecordId: RECOMMENDATION_ID, recommendationKey: "hero-copy" }],
    limitations_json: options.contentLimitations ?? [],
  };
  const clientApproval = {
    id: CLIENT_APPROVAL_ID,
    migration_id: MIGRATION_ID,
    status: options.clientStatus ?? "approved",
    launch_approval_ready: ["approved", "approved_with_limitations"].includes(options.clientStatus ?? "approved"),
    aaf_client_approval_decision_id: options.missingClientAaf ? null : "client-aaf-decision-1",
    limitations_json: options.clientLimitations ?? [],
  };
  const tables: Record<string, Record<string, unknown>[]> = {
    gnr8_single_site_launch_approvals: [],
    gnr8_single_site_launch_approval_refs: [],
    gnr8_single_site_launch_approval_items: [],
    gnr8_single_site_launch_approval_events: [],
    gnr8_single_site_launch_approval_supersessions: [],
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
        const idempotencyKey = values[columns.indexOf("idempotency_key")];
        const existing = idempotencyKey ? rows(table).find((row) => row.idempotency_key === idempotencyKey) : null;
        if (existing) return { rows: [], rowCount: 0 };
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
        row.id = table === "gnr8_single_site_launch_approvals" ? LAUNCH_APPROVAL_ID : `${table}-${rows(table).length + 1}`;
        row.created_at = "2026-08-03T12:00:00.000Z";
        row.updated_at = "2026-08-03T12:00:00.000Z";
        if (table === "gnr8_single_site_launch_approvals") {
          row.decision = null;
          row.readiness_work_ready = false;
          row.approved_with_limitations = false;
          row.launch_revision_required = false;
          row.launch_approval_granted = false;
          row.publish_activation_approval_granted = false;
          row.publish_readiness_not_granted = true;
          row.active_pointer_changed = false;
          row.runtime_artifacts_mutated = false;
          row.site_versions_mutated = false;
        }
        rows(table).push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_content_approvals")) {
        return { rows: contentApproval.id === values[0] || !sql.includes("where id =") ? [contentApproval] : [], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_client_approvals")) {
        if (options.requireClient === false) return { rows: [], rowCount: 0 };
        return { rows: clientApproval.id === values[0] || !sql.includes("where id =") ? [clientApproval] : [], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_launch_approvals")) {
        if (sql.includes("where id =")) return { rows: rows("gnr8_single_site_launch_approvals").filter((row) => row.id === values[0]), rowCount: 1 };
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_launch_approvals").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_launch_approvals"), rowCount: rows("gnr8_single_site_launch_approvals").length };
      }
      if (sql.includes("from public.gnr8_single_site_launch_approval_events")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_launch_approval_events").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        if (sql.includes("coalesce(max(event_index)")) return { rows: [{ event_index: rows("gnr8_single_site_launch_approval_events").length + 1 }], rowCount: 1 };
      }
      if (sql.includes("from public.gnr8_single_site_launch_approval_refs")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_launch_approval_refs").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_launch_approval_refs").filter((row) => row.launch_approval_id === values[0]), rowCount: rows("gnr8_single_site_launch_approval_refs").length };
      }
      if (sql.includes("from public.gnr8_single_site_launch_approval_items")) {
        if (sql.includes("where idempotency_key")) return { rows: rows("gnr8_single_site_launch_approval_items").filter((row) => row.idempotency_key === values[0]), rowCount: 1 };
        return { rows: rows("gnr8_single_site_launch_approval_items").filter((row) => row.launch_approval_id === values[0]), rowCount: rows("gnr8_single_site_launch_approval_items").length };
      }
      if (sql.includes("update public.gnr8_single_site_launch_approvals") && sql.includes("status = $2")) {
        const current = rows("gnr8_single_site_launch_approvals").find((row) => row.id === values[0]);
        if (!current) return { rows: [], rowCount: 0 };
        const updated = {
          ...current,
          status: values[1],
          decision: values[2],
          readiness_work_ready: values[3],
          approved_with_limitations: values[4],
          launch_revision_required: values[5],
          launch_approval_granted: values[6],
          aaf_launch_approval_decision_id: values[7] ?? current.aaf_launch_approval_decision_id,
          limitations_json: values[11] ?? current.limitations_json,
          blocker_refs_json: values[12] ?? current.blocker_refs_json,
          reviewer_actor_type: values[16] ?? current.reviewer_actor_type,
          reviewer_actor_id: values[17] ?? current.reviewer_actor_id,
          reviewer_actor_role: values[18] ?? current.reviewer_actor_role,
          decided_at: values[21] ?? current.decided_at,
          superseded_by_launch_approval_id: values[22] ?? current.superseded_by_launch_approval_id,
        };
        rows("gnr8_single_site_launch_approvals")[rows("gnr8_single_site_launch_approvals").indexOf(current)] = updated;
        return { rows: [updated], rowCount: 1 };
      }
      if (sql.includes("update public.gnr8_single_site_launch_approvals")) {
        const approval = rows("gnr8_single_site_launch_approvals").find((row) => row.id === values[0]);
        if (approval) {
          approval.aaf_launch_approval_request_id = values[1] ?? approval.aaf_launch_approval_request_id;
          approval.aaf_launch_approval_decision_id = values[2] ?? approval.aaf_launch_approval_decision_id;
          approval.aaf_launch_approval_scope = values[3];
          approval.aaf_launch_approval_action = values[4];
          approval.aaf_launch_approval_subject_type = values[5];
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
  if (options.readinessRefs === false) {
    createInput({ requiredRefs: {} });
  }
  return repo as never;
}

async function createLaunchApproval(service: LaunchApprovalService, input: Partial<CreateOrReuseLaunchApprovalInput> = {}) {
  const created = await service.createOrReuseLaunchApproval(createInput(input));
  await service.markReadyForReview({ launchApprovalId: created.launchApproval.id, actor: actor(), correlationId: "corr-ready", idempotencyKey: "idem-ready" });
  return (await service.startReview({ launchApprovalId: created.launchApproval.id, actor: actor(), correlationId: "corr-start", idempotencyKey: "idem-start" })).launchApproval;
}

test("create or reuse launch approval records required refs and carries content limitations", async () => {
  const repo = fakeRepository({ contentStatus: "approved_with_limitations", contentLimitations: [{ summary: "Manual copy caveat" }] }) as unknown as {
    tables: Record<string, Record<string, unknown>[]>;
    migration: { current_state: string };
  };
  const service = new LaunchApprovalService(repo as never);
  const created = await service.createOrReuseLaunchApproval(createInput());
  const replay = await service.createOrReuseLaunchApproval(createInput());
  assert.equal(created.launchApproval.id, LAUNCH_APPROVAL_ID);
  assert.equal(replay.reusedExisting, true);
  assert.equal(repo.migration.current_state, "launch_approval_required");
  assert.ok(repo.tables.gnr8_single_site_launch_approval_refs.length >= 17);
  assert.deepEqual(jsonValue(created.launchApproval.limitations_json), [{ summary: "Manual copy caveat" }]);
});

test("blocks before approved content approval and when client approval policy is unmet", async () => {
  await assert.rejects(() => new LaunchApprovalService(fakeRepository({ contentStatus: "in_review" })).createOrReuseLaunchApproval(createInput()), /approved/);
  await assert.rejects(() => new LaunchApprovalService(fakeRepository({ contentReady: false })).createOrReuseLaunchApproval(createInput()), /approved/);
  await assert.rejects(() => new LaunchApprovalService(fakeRepository({ missingContentAaf: true })).createOrReuseLaunchApproval(createInput()), /AAF content approval decision/);
  await assert.rejects(
    () => new LaunchApprovalService(fakeRepository({ clientStatus: "draft" })).createOrReuseLaunchApproval(createInput({ requireClientApproval: true, clientApprovalId: CLIENT_APPROVAL_ID })),
    /client approval/,
  );
  await assert.rejects(
    () => new LaunchApprovalService(fakeRepository({ missingClientAaf: true })).createOrReuseLaunchApproval(createInput({ requireClientApproval: true, clientApprovalId: CLIENT_APPROVAL_ID })),
    /AAF client approval decision/,
  );
});

test("supports review lifecycle, AAF refs, findings, blocked, approve, approve_with_limitations, reject, cancel, and supersede without side effects", async () => {
  const repo = fakeRepository() as unknown as {
    runtimeMutations: unknown[];
    providerCalls: unknown[];
    activePointerMutations: unknown[];
    publishCalls: unknown[];
  };
  const service = new LaunchApprovalService(repo as never);
  const approval = await createLaunchApproval(service);
  await service.attachAafRequestRef({
    launchApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_launch_approval_request",
    refType: "aaf_approval_request",
    sourceRecordId: "launch-aaf-request-1",
    actor: actor(),
    correlationId: "corr-aaf-request",
    idempotencyKey: "idem-aaf-request",
  });
  await assert.rejects(
    () =>
      service.attachAafDecisionRef({
        launchApprovalId: approval.id,
        migrationId: MIGRATION_ID,
        refRole: "aaf_launch_approval_decision",
        refType: "aaf_approval_decision",
        sourceRecordId: "launch-aaf-decision-raw",
        actor: actor(),
        correlationId: "corr-aaf-decision-raw",
        idempotencyKey: "idem-aaf-decision-raw",
      }),
    /MVP-35 bridge validation/,
  );
  await service.attachAafDecisionRef({
    launchApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_launch_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "launch-aaf-decision-1",
    launchApprovalValidation: validation("launch-aaf-decision-1"),
    actor: actor(),
    correlationId: "corr-aaf-decision",
    idempotencyKey: "idem-aaf-decision",
  });
  await service.addFinding({
    launchApprovalId: approval.id,
    migrationId: MIGRATION_ID,
    itemKey: "qa-note",
    category: "qa_ready",
    severity: "p2_minor",
    status: "resolved",
    findingSummary: "Smoke checklist was reviewed.",
    actor: actor(),
    correlationId: "corr-item",
    idempotencyKey: "idem-item",
  });
  const approved = await service.approve({
    launchApprovalId: approval.id,
    aafLaunchApprovalDecisionId: "launch-aaf-decision-1",
    launchApprovalValidation: validation("launch-aaf-decision-1"),
    actor: actor(),
    correlationId: "corr-approve",
    idempotencyKey: "idem-approve",
  });
  assert.equal(approved.launchApproval.status, "approved");
  assert.equal(approved.launchApproval.readiness_work_ready, true);
  assert.equal(approved.launchApproval.launch_approval_granted, true);
  assert.equal(approved.launchApproval.publish_activation_approval_granted, false);
  assert.equal(approved.launchApproval.publish_readiness_not_granted, true);

  const limitedService = new LaunchApprovalService(fakeRepository());
  const limitedApproval = await createLaunchApproval(limitedService);
  await limitedService.attachAafDecisionRef({
    launchApprovalId: limitedApproval.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_launch_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "launch-aaf-decision-limited",
    launchApprovalValidation: validation("launch-aaf-decision-limited", "granted_with_limitations"),
    actor: actor(),
    correlationId: "corr-limited-aaf",
    idempotencyKey: "idem-limited-aaf",
  });
  assert.equal(
    (await limitedService.approveWithLimitations({
      launchApprovalId: limitedApproval.id,
      aafLaunchApprovalDecisionId: "launch-aaf-decision-limited",
      launchApprovalValidation: validation("launch-aaf-decision-limited", "granted_with_limitations"),
      actor: actor(),
      correlationId: "corr-limited",
      idempotencyKey: "idem-limited",
    })).launchApproval.status,
    "approved_with_limitations",
  );

  for (const [method, status] of [
    ["markBlocked", "blocked"],
    ["reject", "rejected"],
    ["cancel", "cancelled"],
    ["supersede", "superseded"],
  ] as const) {
    const s = new LaunchApprovalService(fakeRepository());
    const r = await createLaunchApproval(s);
    const result = await s[method]({ launchApprovalId: r.id, reason: "fixture decision", actor: actor(), correlationId: `corr-${status}`, idempotencyKey: `idem-${status}` });
    assert.equal(result.launchApproval.status, status);
  }
  assert.deepEqual(repo.runtimeMutations, []);
  assert.deepEqual(repo.providerCalls, []);
  assert.deepEqual(repo.activePointerMutations, []);
  assert.deepEqual(repo.publishCalls, []);
});

test("blocks approval without launch AAF decision, readiness placeholders, p0 blockers, and unresolved blockers", async () => {
  const service = new LaunchApprovalService(fakeRepository());
  const approval = await createLaunchApproval(service);
  await assert.rejects(() => service.approve({ launchApprovalId: approval.id, actor: actor(), correlationId: "corr-no-aaf", idempotencyKey: "idem-no-aaf" }), /AAF launch approval decision/);

  const noReadinessService = new LaunchApprovalService(fakeRepository());
  const noReadiness = await createLaunchApproval(noReadinessService, { requiredRefs: {} });
  await noReadinessService.attachAafDecisionRef({
    launchApprovalId: noReadiness.id,
    migrationId: MIGRATION_ID,
    refRole: "aaf_launch_approval_decision",
    refType: "aaf_approval_decision",
    sourceRecordId: "launch-aaf-decision-no-readiness",
    launchApprovalValidation: validation("launch-aaf-decision-no-readiness"),
    actor: actor(),
    correlationId: "corr-no-readiness-aaf",
    idempotencyKey: "idem-no-readiness-aaf",
  });
  await assert.rejects(
    () =>
      noReadinessService.approve({
        launchApprovalId: noReadiness.id,
        aafLaunchApprovalDecisionId: "launch-aaf-decision-no-readiness",
        launchApprovalValidation: validation("launch-aaf-decision-no-readiness"),
        actor: actor(),
        correlationId: "corr-no-readiness",
        idempotencyKey: "idem-no-readiness",
      }),
    /missing readiness placeholders/,
  );

  const p0Service = new LaunchApprovalService(fakeRepository());
  const p0Approval = await createLaunchApproval(p0Service);
  await p0Service.attachAafDecisionRef({ launchApprovalId: p0Approval.id, migrationId: MIGRATION_ID, refRole: "aaf_launch_approval_decision", refType: "aaf_approval_decision", sourceRecordId: "launch-aaf-decision-p0", launchApprovalValidation: validation("launch-aaf-decision-p0"), actor: actor(), correlationId: "corr-p0-aaf", idempotencyKey: "idem-p0-aaf" });
  await p0Service.addFinding({ launchApprovalId: p0Approval.id, migrationId: MIGRATION_ID, itemKey: "p0", category: "domain_ready", severity: "p0_blocker", findingSummary: "Domain readiness is blocked.", actor: actor(), correlationId: "corr-p0", idempotencyKey: "idem-p0" });
  await assert.rejects(() => p0Service.approve({ launchApprovalId: p0Approval.id, aafLaunchApprovalDecisionId: "launch-aaf-decision-p0", launchApprovalValidation: validation("launch-aaf-decision-p0"), actor: actor(), correlationId: "corr-p0-approve", idempotencyKey: "idem-p0-approve" }), /p0 blockers/);

  const blockerService = new LaunchApprovalService(fakeRepository());
  const blockerApproval = await createLaunchApproval(blockerService, { blockerRefsJson: [{ sourceRecordId: "blocked-domain", status: "open" }] });
  await blockerService.attachAafDecisionRef({ launchApprovalId: blockerApproval.id, migrationId: MIGRATION_ID, refRole: "aaf_launch_approval_decision", refType: "aaf_approval_decision", sourceRecordId: "launch-aaf-decision-blocker", launchApprovalValidation: validation("launch-aaf-decision-blocker"), actor: actor(), correlationId: "corr-blocker-aaf", idempotencyKey: "idem-blocker-aaf" });
  await assert.rejects(() => blockerService.approve({ launchApprovalId: blockerApproval.id, aafLaunchApprovalDecisionId: "launch-aaf-decision-blocker", launchApprovalValidation: validation("launch-aaf-decision-blocker"), actor: actor(), correlationId: "corr-blocker-approve", idempotencyKey: "idem-blocker-approve" }), /unresolved blocker refs/);
});

test("idempotent retry works, idempotency drift conflicts, readiness is scoped, and terminal approvals cannot change", async () => {
  const service = new LaunchApprovalService(fakeRepository());
  const approval = await createLaunchApproval(service);
  const first = await service.reject({ launchApprovalId: approval.id, reason: "not ready", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  const replay = await service.reject({ launchApprovalId: approval.id, reason: "not ready", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" });
  assert.equal(replay.reusedExisting, true);
  assert.equal(replay.eventId, first.eventId);
  await assert.rejects(() => service.reject({ launchApprovalId: approval.id, reason: "changed", actor: actor(), correlationId: "corr-reject", idempotencyKey: "idem-reject" }), SingleSiteIdempotencyConflictError);

  const readyService = new LaunchApprovalService(fakeRepository());
  const readyApproval = await createLaunchApproval(readyService);
  await readyService.attachAafDecisionRef({ launchApprovalId: readyApproval.id, migrationId: MIGRATION_ID, refRole: "aaf_launch_approval_decision", refType: "aaf_approval_decision", sourceRecordId: "launch-aaf-decision-ready", launchApprovalValidation: validation("launch-aaf-decision-ready"), actor: actor(), correlationId: "corr-ready-aaf", idempotencyKey: "idem-ready-aaf" });
  await readyService.approve({ launchApprovalId: readyApproval.id, aafLaunchApprovalDecisionId: "launch-aaf-decision-ready", launchApprovalValidation: validation("launch-aaf-decision-ready"), actor: actor(), correlationId: "corr-ready-approve", idempotencyKey: "idem-ready-approve" });
  const readiness = await readyService.getLaunchApprovalReadiness(MIGRATION_ID);
  assert.equal(readiness.ready, true);
  await assert.rejects(
    () => readyService.addFinding({ launchApprovalId: readyApproval.id, migrationId: MIGRATION_ID, itemKey: "late", category: "manual_note", severity: "p3_note", findingSummary: "Late mutation attempt.", actor: actor(), correlationId: "corr-late", idempotencyKey: "idem-late" }),
    /terminal/,
  );
});
