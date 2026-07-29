import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);

const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";

const EXPECTED_TABLES = [
  "gnr8_single_site_migration_blockers",
  "gnr8_single_site_migration_closeouts",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_migration_stage_summaries",
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migrations",
  "gnr8_single_site_source_evidence_review_events",
  "gnr8_single_site_source_evidence_review_items",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_source_evidence_reviews",
] as const;

const APPEND_ONLY_TABLES = [
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_migration_closeouts",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_source_evidence_review_events",
] as const;

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePublishedPort(output: string): string {
  const port = output.match(/127\.0\.0\.1:(\d+)/)?.[1];
  if (!port) throw new Error(`Could not resolve disposable Postgres port from: ${output}`);
  return port;
}

async function startDisposablePostgres(): Promise<DisposablePostgres> {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-single-site-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_local_${suffix.replace(/-/g, "")}`;
  const password = randomUUID();

  docker(["image", "inspect", "postgres:15"]);
  docker([
    "run",
    "--pull=never",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-e",
    `POSTGRES_DB=${database}`,
    "-e",
    `POSTGRES_USER=${user}`,
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-p",
    "127.0.0.1::5432",
    "postgres:15",
  ]);

  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        docker(["exec", containerName, "pg_isready", "-h", "127.0.0.1", "-U", user, "-d", database]);
        break;
      } catch {
        if (attempt === 59) throw new Error("Disposable Postgres did not become ready");
        await delay(500);
      }
    }

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/${MIGRATION_BASENAME}`]);
    docker([
      "exec",
      containerName,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      "127.0.0.1",
      "-U",
      user,
      "-d",
      database,
      "-f",
      `/tmp/${MIGRATION_BASENAME}`,
    ]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable local DB setup failure.
    }
    throw error;
  }
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

function testUuid(): string {
  return randomUUID();
}

async function insertMigration(pool: Pool, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    tenantId: `tenant-${suffix}`,
    clientId: testUuid(),
    siteId: testUuid(),
    sourceUrl: `https://example-${suffix}.test`,
    currentState: "site_candidate_created",
    currentStage: "intake",
    sourceCaptureRefsJson: {},
    limitationsJson: [],
    warningsJson: [],
    blockersJson: [],
    actorType: "human",
    actorId: "single-site-test",
    correlationId: `corr-${suffix}`,
    idempotencyKey: `idem-migration-${suffix}`,
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
    ...input,
  };

  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_migrations (
      tenant_id,
      client_id,
      site_id,
      source_url,
      current_state,
      current_stage,
      source_capture_refs_json,
      limitations_json,
      warnings_json,
      blockers_json,
      created_by_actor_type,
      created_by_actor_id,
      correlation_id,
      idempotency_key,
      privacy_label,
      retention_class
    )
    values ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16)
    returning id::text
    `,
    [
      row.tenantId,
      row.clientId,
      row.siteId,
      row.sourceUrl,
      row.currentState,
      row.currentStage,
      JSON.stringify(row.sourceCaptureRefsJson),
      JSON.stringify(row.limitationsJson),
      JSON.stringify(row.warningsJson),
      JSON.stringify(row.blockersJson),
      row.actorType,
      row.actorId,
      row.correlationId,
      row.idempotencyKey,
      row.privacyLabel,
      row.retentionClass,
    ],
  );
  return result.rows[0]!.id;
}

async function insertStateEvent(pool: Pool, migrationId: string, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    eventIndex: 1,
    fromState: null,
    toState: "site_candidate_created",
    fromStage: null,
    toStage: "intake",
    transitionKey: "migration.created",
    requiredRefsJson: {},
    missingRequirementsJson: [],
    beforeRefJson: {},
    afterRefJson: {},
    actorType: "human",
    actorId: "single-site-test",
    actorRole: "migration_operator",
    correlationId: `corr-event-${suffix}`,
    idempotencyKey: `idem-state-event-${suffix}`,
    ...input,
  };

  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_migration_state_events (
      migration_id,
      event_index,
      from_state,
      to_state,
      from_stage,
      to_stage,
      transition_key,
      required_refs_json,
      missing_requirements_json,
      before_ref_json,
      after_ref_json,
      actor_type,
      actor_id,
      actor_role,
      correlation_id,
      idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16)
    returning id::text
    `,
    [
      migrationId,
      row.eventIndex,
      row.fromState,
      row.toState,
      row.fromStage,
      row.toStage,
      row.transitionKey,
      JSON.stringify(row.requiredRefsJson),
      JSON.stringify(row.missingRequirementsJson),
      JSON.stringify(row.beforeRefJson),
      JSON.stringify(row.afterRefJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.correlationId,
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

async function insertReview(pool: Pool, migrationId: string, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    tenantId: `tenant-${suffix}`,
    clientId: testUuid(),
    sourceUrl: `https://source-${suffix}.test`,
    packageKey: `package-${suffix}`,
    sourceWatermark: `watermark-${suffix}`,
    completenessStatus: "unknown",
    reviewStatus: "not_started",
    reviewLimitationsJson: [],
    missingEvidenceJson: [],
    diagnosticsJson: {},
    correlationId: `corr-review-${suffix}`,
    idempotencyKey: `idem-review-${suffix}`,
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
    ...input,
  };

  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_source_evidence_reviews (
      migration_id,
      tenant_id,
      client_id,
      source_url,
      source_evidence_package_key,
      source_watermark,
      evidence_captured_at,
      completeness_status,
      review_status,
      review_limitations_json,
      missing_evidence_json,
      diagnostics_json,
      correlation_id,
      idempotency_key,
      privacy_label,
      retention_class
    )
    values ($1::uuid, $2, $3::uuid, $4, $5, $6, now(), $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13, $14, $15)
    returning id::text
    `,
    [
      migrationId,
      row.tenantId,
      row.clientId,
      row.sourceUrl,
      row.packageKey,
      row.sourceWatermark,
      row.completenessStatus,
      row.reviewStatus,
      JSON.stringify(row.reviewLimitationsJson),
      JSON.stringify(row.missingEvidenceJson),
      JSON.stringify(row.diagnosticsJson),
      row.correlationId,
      row.idempotencyKey,
      row.privacyLabel,
      row.retentionClass,
    ],
  );
  return result.rows[0]!.id;
}

test("single-site migration applies alone and enforces persistence behavior in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });

  try {
    const tables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gnr8_single_site_%'
      order by table_name
      `,
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name), [...EXPECTED_TABLES]);

    const unexpectedPublicTables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
        and table_name not like 'gnr8_single_site_%'
      order by table_name
      `,
    );
    assert.deepEqual(unexpectedPublicTables.rows, []);

    const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `
      select relname, relrowsecurity
      from pg_class
      where oid in (${EXPECTED_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
      order by relname
      `,
    );
    assert.deepEqual(
      new Map(rls.rows.map((row) => [row.relname, row.relrowsecurity])),
      new Map(EXPECTED_TABLES.map((tableName) => [tableName, true])),
    );

    const policies = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from pg_policy
      where polrelid in (${EXPECTED_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
      `,
    );
    assert.equal(policies.rows[0]?.count, "0");

    const triggers = await pool.query<{ tgname: string }>(
      `
      select tgname
      from pg_trigger
      where tgrelid in (${APPEND_ONLY_TABLES.map((tableName) => `'public.${tableName}'::regclass`).join(", ")})
        and not tgisinternal
      order by tgname
      `,
    );
    assert.deepEqual(
      triggers.rows.map((row) => row.tgname),
      [
        "trg_gnr8_single_site_migration_closeouts_append_only",
        "trg_gnr8_single_site_migration_refs_append_only",
        "trg_gnr8_single_site_migration_state_events_append_only",
        "trg_gnr8_single_site_source_evidence_review_events_append_only",
        "trg_gnr8_single_site_source_evidence_review_refs_append_only",
      ],
    );

    const migrationId = await insertMigration(pool);
    const stateEventId = await insertStateEvent(pool, migrationId);

    const migrationRef = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_migration_refs (
        migration_id,
        state_event_id,
        ref_role,
        ref_type,
        source_record_id,
        source_watermark,
        correlation_id,
        idempotency_key,
        metadata_json
      )
      values ($1::uuid, $2::uuid, 'capture_run', 'render_job', 'render-job-1', 'capture-watermark-1', 'corr-ref-1', $3, '{"ok":true}'::jsonb)
      returning id::text
      `,
      [migrationId, stateEventId, `idem-migration-ref-${randomUUID()}`],
    );

    await pool.query(
      `
      insert into public.gnr8_single_site_migration_stage_summaries (
        migration_id,
        stage,
        status,
        latest_state_event_id,
        summary_json,
        correlation_id,
        idempotency_key
      )
      values ($1::uuid, 'intake', 'completed', $2::uuid, '{"stage":"intake"}'::jsonb, 'corr-stage-1', $3)
      `,
      [migrationId, stateEventId, `idem-stage-${randomUUID()}`],
    );

    const blocker = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_migration_blockers (
        migration_id,
        state_event_id,
        blocker_key,
        blocker_type,
        severity,
        status,
        source_ref_json,
        details_json,
        correlation_id,
        idempotency_key
      )
      values ($1::uuid, $2::uuid, 'source_evidence:missing_font', 'source_evidence_missing', 'p2', 'open', '{}', '{"category":"font"}', 'corr-blocker-1', $3)
      returning id::text
      `,
      [migrationId, stateEventId, `idem-blocker-${randomUUID()}`],
    );

    const reviewId = await insertReview(pool, migrationId);
    const reviewItem = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_source_evidence_review_items (
        review_id,
        migration_id,
        evidence_category,
        status,
        ref_ids_json,
        limitation_json,
        correlation_id,
        idempotency_key
      )
      values ($1::uuid, $2::uuid, 'source_url', 'present', '[]'::jsonb, '{}'::jsonb, 'corr-item-1', $3)
      returning id::text
      `,
      [reviewId, migrationId, `idem-review-item-${randomUUID()}`],
    );
    const reviewRef = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_source_evidence_review_refs (
        review_id,
        migration_id,
        ref_role,
        ref_type,
        source_record_id,
        source_watermark,
        content_hash,
        correlation_id,
        idempotency_key,
        metadata_json
      )
      values ($1::uuid, $2::uuid, 'source_url', 'url', 'https://example.test', 'review-watermark-1', '0123456789abcdef', 'corr-review-ref-1', $3, '{"ok":true}'::jsonb)
      returning id::text
      `,
      [reviewId, migrationId, `idem-review-ref-${randomUUID()}`],
    );
    const reviewEvent = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_source_evidence_review_events (
        review_id,
        migration_id,
        event_index,
        event_action,
        from_status,
        to_status,
        actor_type,
        actor_id,
        actor_role,
        details_json,
        correlation_id,
        idempotency_key
      )
      values ($1::uuid, $2::uuid, 1, 'created', null, 'not_started', 'system', 'source-evidence-test', 'migration_operator', '{}', 'corr-review-event-1', $3)
      returning id::text
      `,
      [reviewId, migrationId, `idem-review-event-${randomUUID()}`],
    );
    const closeout = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_single_site_migration_closeouts (
        migration_id,
        status,
        outcome,
        final_url,
        metrics_json,
        issue_taxonomy_json,
        evidence_summary_json,
        exceptions_json,
        lessons_json,
        closed_by_actor_type,
        closed_by_actor_id,
        correlation_id,
        idempotency_key
      )
      values ($1::uuid, 'completed', 'internal_rehearsal_only', 'https://example.test', '{}', '[]', '{}', '[]', '{}', 'human', 'single-site-test', 'corr-closeout-1', $2)
      returning id::text
      `,
      [migrationId, `idem-closeout-${randomUUID()}`],
    );

    await pool.query(
      `
      update public.gnr8_single_site_migrations
      set current_state = 'source_capture_started',
          current_stage = 'source_capture',
          state_version = state_version + 1,
          latest_state_event_id = $2::uuid,
          updated_at = now()
      where id = $1::uuid
      `,
      [migrationId, stateEventId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_migration_stage_summaries
      set status = 'in_progress', updated_at = now()
      where migration_id = $1::uuid and stage = 'intake'
      `,
      [migrationId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_migration_blockers
      set status = 'resolved',
          resolved_at = now(),
          resolution_state_event_id = $2::uuid,
          updated_at = now()
      where id = $1::uuid
      `,
      [blocker.rows[0]!.id, stateEventId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_source_evidence_reviews
      set review_status = 'accepted',
          review_decision = 'accept',
          reviewer_actor_type = 'human',
          reviewer_actor_id = 'source-reviewer',
          reviewer_actor_role = 'migration_operator',
          reviewed_at = now(),
          clone_generation_allowed = true,
          updated_at = now()
      where id = $1::uuid
      `,
      [reviewId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_source_evidence_review_items
      set status = 'present_with_warnings',
          warnings_json = '[{"warning":"viewport screenshot was low resolution"}]'::jsonb,
          updated_at = now()
      where id = $1::uuid
      `,
      [reviewItem.rows[0]!.id],
    );

    await assertDbRejects(() => insertMigration(pool, { currentState: "skipped_to_publish" }), /state_ck/i);
    await assertDbRejects(() => insertMigration(pool, { privacyLabel: "private" }), /privacy_ck/i);
    await assertDbRejects(() => insertMigration(pool, { retentionClass: "forever" }), /retention_ck/i);
    await assertDbRejects(() => insertMigration(pool, { sourceCaptureRefsJson: [] }), /json_shape_ck/i);
    await assertDbRejects(() => insertReview(pool, migrationId, { reviewStatus: "needs_manager" }), /status_ck/i);
    await assertDbRejects(() => insertReview(pool, migrationId, { reviewLimitationsJson: {} }), /json_shape_ck/i);
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_single_site_source_evidence_review_items (
            review_id,
            migration_id,
            evidence_category,
            status,
            correlation_id,
            idempotency_key
          )
          values ($1::uuid, $2::uuid, 'favicon', 'present', 'corr-bad-category', $3)
          `,
          [reviewId, migrationId, `idem-bad-category-${randomUUID()}`],
        ),
      /category_ck/i,
    );

    const duplicateIdempotencyKey = `idem-duplicate-${randomUUID()}`;
    await insertMigration(pool, { idempotencyKey: duplicateIdempotencyKey });
    await assertDbRejects(() => insertMigration(pool, { idempotencyKey: duplicateIdempotencyKey }), /idempotency_key/i);

    await assertDbRejects(
      () => pool.query(`update public.gnr8_single_site_migration_state_events set transition_reason = 'edit' where id = $1::uuid`, [stateEventId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_single_site_migration_state_events where id = $1::uuid`, [stateEventId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_single_site_migration_refs set source_version = '2' where id = $1::uuid`, [migrationRef.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_single_site_migration_refs where id = $1::uuid`, [migrationRef.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_single_site_source_evidence_review_refs set source_version = '2' where id = $1::uuid`, [reviewRef.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_single_site_source_evidence_review_refs where id = $1::uuid`, [reviewRef.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_single_site_source_evidence_review_events set details_json = '{"edited":true}' where id = $1::uuid`, [reviewEvent.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_single_site_source_evidence_review_events where id = $1::uuid`, [reviewEvent.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_single_site_migration_closeouts set outcome = 'published_success' where id = $1::uuid`, [closeout.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_single_site_migration_closeouts where id = $1::uuid`, [closeout.rows[0]!.id]),
      /append-only/i,
    );
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
