import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");

const MIGRATIONS = [
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260804120000_single_site_launch_readiness_core.sql",
] as const;

const EXPECTED_TABLES = [
  "gnr8_single_site_launch_readiness_blockers",
  "gnr8_single_site_launch_readiness_closeouts",
  "gnr8_single_site_launch_readiness_dimensions",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_records",
  "gnr8_single_site_launch_readiness_refs",
] as const;

const APPEND_ONLY_TABLES = [
  "gnr8_single_site_launch_readiness_refs",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_closeouts",
] as const;

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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
  const containerName = `gnr8-launch-readiness-${process.pid}-${suffix}`;
  const database = `gnr8_launch_readiness_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_launch_readiness_${suffix.replace(/-/g, "")}`;
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

    for (const migrationName of MIGRATIONS) {
      const migrationPath = path.resolve(PLATFORM_ROOT, "supabase/migrations", migrationName);
      docker(["cp", migrationPath, `${containerName}:/tmp/${migrationName}`]);
      docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${migrationName}`]);
    }

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best-effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

async function insertMigration(pool: Pool): Promise<{ id: string; tenantId: string; clientId: string; siteId: string }> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const tenantId = `tenant-${suffix}`;
  const clientId = randomUUID();
  const siteId = randomUUID();
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
      idempotency_key
    )
    values ($1, $2::uuid, $3::uuid, $4, 'launch_approval_required', 'launch_publish_recovery', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'human', 'launch-readiness-test', $5, $6)
    returning id::text
    `,
    [
      tenantId,
      clientId,
      siteId,
      `https://launch-readiness-${suffix}.example.test`,
      `corr-migration-${suffix}`,
      `idem-migration-${suffix}`,
    ],
  );
  return { id: result.rows[0]!.id, tenantId, clientId, siteId };
}

async function insertReadinessRecord(pool: Pool, migration: { id: string; tenantId: string; clientId: string; siteId: string }, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    launchApprovalRef: `launch-approval-${suffix}`,
    launchApprovalSourceWatermark: `launch-watermark-${suffix}`,
    improvedCandidateSiteVersionRef: `site-version-${suffix}`,
    improvedRuntimeArtifactRef: `artifact-${suffix}`,
    status: "collecting_evidence",
    freshnessStatus: "unknown",
    semanticSourceWatermark: `launch-readiness:${suffix}`,
    readinessSummaryJson: { status: "collecting_evidence" },
    limitationSummaryJson: [],
    blockerSummaryJson: [],
    actorType: "human",
    actorId: "launch-readiness-test",
    actorRole: "migration_operator",
    correlationId: `corr-readiness-${suffix}`,
    idempotencyKey: `idem-readiness-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_records (
      tenant_id,
      client_id,
      site_id,
      migration_id,
      launch_approval_ref,
      launch_approval_source_watermark,
      improved_candidate_site_version_ref,
      improved_runtime_artifact_ref,
      status,
      freshness_status,
      semantic_source_watermark,
      readiness_summary_json,
      limitation_summary_json,
      blocker_summary_json,
      actor_type,
      actor_id,
      actor_role,
      correlation_id,
      idempotency_key
    )
    values ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15, $16, $17, $18, $19)
    returning id::text
    `,
    [
      migration.tenantId,
      migration.clientId,
      migration.siteId,
      migration.id,
      row.launchApprovalRef,
      row.launchApprovalSourceWatermark,
      row.improvedCandidateSiteVersionRef,
      row.improvedRuntimeArtifactRef,
      row.status,
      row.freshnessStatus,
      row.semanticSourceWatermark,
      JSON.stringify(row.readinessSummaryJson),
      JSON.stringify(row.limitationSummaryJson),
      JSON.stringify(row.blockerSummaryJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.correlationId,
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

async function insertDimension(pool: Pool, readinessId: string, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    dimension: "launch_approval",
    dimensionStatus: "ready",
    sourceRefsJson: [{ refRole: "launch_approval_decision", sourceRef: `launch-decision-${suffix}` }],
    sourceWatermark: `dimension-watermark-${suffix}`,
    freshnessStatus: "fresh",
    blockerRefsJson: [],
    limitationsJson: [],
    diagnosticsJson: { checked: true },
    actorType: "system",
    actorId: "launch-readiness-test",
    actorRole: "migration_operator",
    correlationId: `corr-dimension-${suffix}`,
    idempotencyKey: `idem-dimension-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_dimensions (
      readiness_id,
      dimension,
      dimension_status,
      source_refs_json,
      source_watermark,
      freshness_status,
      freshness_checked_at,
      blocker_refs_json,
      limitations_json,
      diagnostics_json,
      required_for_launch_readiness,
      required_for_publish_activation,
      actor_type,
      actor_id,
      actor_role,
      correlation_id,
      idempotency_key
    )
    values ($1::uuid, $2, $3, $4::jsonb, $5, $6, now(), $7::jsonb, $8::jsonb, $9::jsonb, true, true, $10, $11, $12, $13, $14)
    returning id::text
    `,
    [
      readinessId,
      row.dimension,
      row.dimensionStatus,
      JSON.stringify(row.sourceRefsJson),
      row.sourceWatermark,
      row.freshnessStatus,
      JSON.stringify(row.blockerRefsJson),
      JSON.stringify(row.limitationsJson),
      JSON.stringify(row.diagnosticsJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.correlationId,
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

async function insertRef(pool: Pool, readinessId: string, dimensionId: string | null, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    refRole: "launch_approval_decision",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_aaf_approval_decisions",
    sourceType: "aaf_approval_decision",
    sourceRecordId: `decision-${suffix}`,
    sourceRef: `aaf-decision-ref-${suffix}`,
    sourceVersion: "1",
    sourceWatermark: `ref-watermark-${suffix}`,
    metadataJson: { valid: true },
    idempotencyKey: `idem-ref-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_refs (
      readiness_id,
      dimension_id,
      ref_role,
      source_system,
      source_table,
      source_type,
      source_record_id,
      source_ref,
      source_version,
      source_watermark,
      metadata_json,
      idempotency_key
    )
    values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
    returning id::text
    `,
    [
      readinessId,
      dimensionId,
      row.refRole,
      row.sourceSystem,
      row.sourceTable,
      row.sourceType,
      row.sourceRecordId,
      row.sourceRef,
      row.sourceVersion,
      row.sourceWatermark,
      JSON.stringify(row.metadataJson),
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

async function insertBlocker(pool: Pool, readinessId: string, dimensionId: string | null, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    severity: "p1_major",
    category: "domain_dns",
    status: "open",
    description: `Missing stored DNS operator evidence ${suffix}`,
    sourceRefsJson: [],
    resolutionRefsJson: [],
    actorType: "human",
    actorId: "launch-readiness-test",
    actorRole: "migration_operator",
    correlationId: `corr-blocker-${suffix}`,
    idempotencyKey: `idem-blocker-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_blockers (
      readiness_id,
      dimension_id,
      severity,
      category,
      status,
      description,
      source_refs_json,
      resolution_refs_json,
      actor_type,
      actor_id,
      actor_role,
      correlation_id,
      idempotency_key,
      resolved_at
    )
    values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14::timestamptz)
    returning id::text
    `,
    [
      readinessId,
      dimensionId,
      row.severity,
      row.category,
      row.status,
      row.description,
      JSON.stringify(row.sourceRefsJson),
      JSON.stringify(row.resolutionRefsJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.correlationId,
      row.idempotencyKey,
      row.status === "resolved" || row.status === "accepted_limitation" ? new Date().toISOString() : null,
    ],
  );
  return result.rows[0]!.id;
}

async function insertEvent(pool: Pool, readinessId: string, dimensionId: string | null, blockerId: string | null, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    eventIndex: 1,
    eventAction: "readiness_created",
    fromStatus: null,
    toStatus: "draft",
    detailsJson: { created: true },
    actorType: "system",
    actorId: "launch-readiness-test",
    actorRole: "migration_operator",
    sourceWatermark: `event-watermark-${suffix}`,
    semanticWatermark: `semantic-event-${suffix}`,
    correlationId: `corr-event-${suffix}`,
    idempotencyKey: `idem-event-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_events (
      readiness_id,
      dimension_id,
      blocker_id,
      event_index,
      event_action,
      from_status,
      to_status,
      details_json,
      actor_type,
      actor_id,
      actor_role,
      source_watermark,
      semantic_watermark,
      correlation_id,
      idempotency_key
    )
    values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15)
    returning id::text
    `,
    [
      readinessId,
      dimensionId,
      blockerId,
      row.eventIndex,
      row.eventAction,
      row.fromStatus,
      row.toStatus,
      JSON.stringify(row.detailsJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.sourceWatermark,
      row.semanticWatermark,
      row.correlationId,
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

async function insertCloseout(pool: Pool, readinessId: string, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    finalStatus: "blocked",
    finalEvidenceSummaryJson: { complete: false },
    finalLimitationsJson: [],
    finalBlockersJson: [{ category: "domain_dns" }],
    publishActivationHandoffRefsJson: [],
    actorType: "human",
    actorId: "launch-readiness-test",
    actorRole: "migration_operator",
    correlationId: `corr-closeout-${suffix}`,
    idempotencyKey: `idem-closeout-${suffix}`,
    ...input,
  };
  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_single_site_launch_readiness_closeouts (
      readiness_id,
      final_status,
      final_evidence_summary_json,
      final_limitations_json,
      final_blockers_json,
      publish_activation_handoff_refs_json,
      actor_type,
      actor_id,
      actor_role,
      correlation_id,
      idempotency_key
    )
    values ($1::uuid, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
    returning id::text
    `,
    [
      readinessId,
      row.finalStatus,
      JSON.stringify(row.finalEvidenceSummaryJson),
      JSON.stringify(row.finalLimitationsJson),
      JSON.stringify(row.finalBlockersJson),
      JSON.stringify(row.publishActivationHandoffRefsJson),
      row.actorType,
      row.actorId,
      row.actorRole,
      row.correlationId,
      row.idempotencyKey,
    ],
  );
  return result.rows[0]!.id;
}

test("launch readiness migration applies and enforces persistence behavior in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });

  try {
    const tables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gnr8_single_site_launch_readiness_%'
      order by table_name
      `,
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name), [...EXPECTED_TABLES]);

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

    const broadGrants = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = any($1::text[])
        and grantee in ('PUBLIC', 'anon', 'authenticated')
      `,
      [[...EXPECTED_TABLES]],
    );
    assert.equal(broadGrants.rows[0]?.count, "0");

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
        "trg_gnr8_single_site_launch_readiness_closeouts_append_only",
        "trg_gnr8_single_site_launch_readiness_events_append_only",
        "trg_gnr8_single_site_launch_readiness_refs_append_only",
      ],
    );

    const migration = await insertMigration(pool);
    const readinessId = await insertReadinessRecord(pool, migration);
    const dimensionId = await insertDimension(pool, readinessId);
    const refId = await insertRef(pool, readinessId, dimensionId);
    const blockerId = await insertBlocker(pool, readinessId, dimensionId);
    const eventId = await insertEvent(pool, readinessId, dimensionId, blockerId);
    const closeoutId = await insertCloseout(pool, readinessId);

    await pool.query(
      `
      update public.gnr8_single_site_launch_readiness_records
      set status = 'blocked',
          freshness_status = 'missing',
          blocker_summary_json = '[{"category":"domain_dns"}]'::jsonb,
          updated_at = now()
      where id = $1::uuid
      `,
      [readinessId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_launch_readiness_dimensions
      set dimension_status = 'blocked',
          freshness_status = 'missing',
          missing_at = now(),
          updated_at = now()
      where id = $1::uuid
      `,
      [dimensionId],
    );
    await pool.query(
      `
      update public.gnr8_single_site_launch_readiness_blockers
      set status = 'resolved',
          resolution_refs_json = '[{"ref":"manual-resolution"}]'::jsonb,
          resolved_at = now(),
          updated_at = now()
      where id = $1::uuid
      `,
      [blockerId],
    );

    await assertDbRejects(() => insertReadinessRecord(pool, migration, { status: "almost_ready" }), /status_ck/i);
    await assertDbRejects(() => insertReadinessRecord(pool, migration, { readinessSummaryJson: [] }), /json_shape_ck/i);
    await assertDbRejects(() => insertDimension(pool, readinessId, { dimension: "command_center_projection" }), /dimension_ck/i);
    await assertDbRejects(() => insertDimension(pool, readinessId, { sourceRefsJson: {} }), /json_shape_ck/i);
    await assertDbRejects(() => insertRef(pool, readinessId, dimensionId, { refRole: "provider_mutation_result" }), /role_ck/i);
    await assertDbRejects(() => insertRef(pool, readinessId, dimensionId, { sourceRef: "   " }), /nonempty_text_ck/i);
    await assertDbRejects(() => insertRef(pool, readinessId, dimensionId, { metadataJson: [] }), /json_shape_ck/i);
    await assertDbRejects(() => insertBlocker(pool, readinessId, dimensionId, { severity: "p4" }), /severity_ck/i);
    await assertDbRejects(() => insertBlocker(pool, readinessId, dimensionId, { category: "billing_provider_call" }), /category_ck/i);
    await assertDbRejects(() => insertBlocker(pool, readinessId, dimensionId, { status: "closed" }), /status_ck/i);
    await assertDbRejects(() => insertBlocker(pool, readinessId, dimensionId, { sourceRefsJson: {} }), /json_shape_ck/i);

    const duplicateIdempotency = `idem-duplicate-${randomUUID()}`;
    await insertRef(pool, readinessId, dimensionId, { idempotencyKey: duplicateIdempotency });
    await assertDbRejects(() => insertRef(pool, readinessId, dimensionId, { idempotencyKey: duplicateIdempotency }), /idempotency_key/i);

    const semanticRef = {
      refRole: "publish_target",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_publish_targets",
      sourceType: "publish_target",
      sourceRecordId: `publish-target-${randomUUID()}`,
      sourceRef: "production",
      sourceVersion: "ptt-1",
      sourceWatermark: `semantic-watermark-${randomUUID()}`,
    };
    await insertRef(pool, readinessId, null, semanticRef);
    await assertDbRejects(() => insertRef(pool, readinessId, null, semanticRef), /refs_semantic/i);

    await assertDbRejects(() => pool.query(`update public.gnr8_single_site_launch_readiness_refs set source_version = '2' where id = $1::uuid`, [refId]), /append-only/i);
    await assertDbRejects(() => pool.query(`delete from public.gnr8_single_site_launch_readiness_refs where id = $1::uuid`, [refId]), /append-only/i);
    await assertDbRejects(() => pool.query(`update public.gnr8_single_site_launch_readiness_events set details_json = '{"edited":true}'::jsonb where id = $1::uuid`, [eventId]), /append-only/i);
    await assertDbRejects(() => pool.query(`delete from public.gnr8_single_site_launch_readiness_events where id = $1::uuid`, [eventId]), /append-only/i);
    await assertDbRejects(() => pool.query(`update public.gnr8_single_site_launch_readiness_closeouts set final_status = 'ready' where id = $1::uuid`, [closeoutId]), /append-only/i);
    await assertDbRejects(() => pool.query(`delete from public.gnr8_single_site_launch_readiness_closeouts where id = $1::uuid`, [closeoutId]), /append-only/i);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
