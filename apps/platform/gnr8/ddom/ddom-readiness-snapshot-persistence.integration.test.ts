import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
);

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
  const containerName = `gnr8-ddom-snapshot-${process.pid}-${suffix}`;
  const database = `gnr8_ddom_snapshot_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_ddom_local_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/20260727120000_ddom_readiness_snapshot_persistence_core.sql`]);
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
      "/tmp/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
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

async function insertSnapshot(pool: Pool, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    tenantId: `tenant-${suffix}`,
    clientId: `client-${suffix}`,
    siteId: `site-${suffix}`,
    readinessState: "ready",
    readinessBlockers: [],
    readinessWarnings: [],
    freshnessState: "fresh",
    sourceWatermark: `watermark-${suffix}`,
    sourceWatermarkJson: { runtime: `runtime-${suffix}` },
    snapshotJson: { domainReadiness: true },
    actorType: "system",
    actorId: "ddom-integration-test",
    correlationId: `corr-${suffix}`,
    idempotencyKey: `idem-${suffix}`,
    privacyLabel: "client_confidential",
    retentionClass: "compliance_long",
    ...input,
  };

  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_ddom_readiness_snapshots (
      tenant_id,
      client_id,
      site_id,
      readiness_state,
      readiness_blockers,
      readiness_warnings,
      freshness_state,
      source_watermark,
      source_watermark_json,
      snapshot_json,
      created_by_actor_type,
      created_by_actor_id,
      correlation_id,
      idempotency_key,
      privacy_label,
      retention_class
    )
    values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16)
    returning id::text
    `,
    [
      row.tenantId,
      row.clientId,
      row.siteId,
      row.readinessState,
      JSON.stringify(row.readinessBlockers),
      JSON.stringify(row.readinessWarnings),
      row.freshnessState,
      row.sourceWatermark,
      JSON.stringify(row.sourceWatermarkJson),
      JSON.stringify(row.snapshotJson),
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

test("DDOM migration applies alone and enforces persistence behavior in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 3 });

  try {
    const tableRows = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gnr8_ddom_%'
      order by table_name
      `,
    );
    assert.deepEqual(
      tableRows.rows.map((row) => row.table_name),
      ["gnr8_ddom_readiness_snapshot_refs", "gnr8_ddom_readiness_snapshots"],
    );

    const columns = await pool.query<{ table_name: string; column_name: string; is_nullable: string; column_default: string | null }>(
      `
      select table_name, column_name, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('gnr8_ddom_readiness_snapshots', 'gnr8_ddom_readiness_snapshot_refs')
      `,
    );
    const columnByKey = new Map(columns.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]));
    for (const [key, nullable] of [
      ["gnr8_ddom_readiness_snapshots.id", "NO"],
      ["gnr8_ddom_readiness_snapshots.tenant_id", "NO"],
      ["gnr8_ddom_readiness_snapshots.client_id", "YES"],
      ["gnr8_ddom_readiness_snapshots.site_id", "NO"],
      ["gnr8_ddom_readiness_snapshots.ownership_site_id", "YES"],
      ["gnr8_ddom_readiness_snapshots.site_version_id", "YES"],
      ["gnr8_ddom_readiness_snapshots.domain_binding_id", "YES"],
      ["gnr8_ddom_readiness_snapshots.host_binding_id", "YES"],
      ["gnr8_ddom_readiness_snapshots.readiness_state", "NO"],
      ["gnr8_ddom_readiness_snapshots.freshness_state", "NO"],
      ["gnr8_ddom_readiness_snapshots.idempotency_key", "NO"],
      ["gnr8_ddom_readiness_snapshot_refs.snapshot_id", "NO"],
      ["gnr8_ddom_readiness_snapshot_refs.ref_role", "NO"],
      ["gnr8_ddom_readiness_snapshot_refs.ref_type", "NO"],
      ["gnr8_ddom_readiness_snapshot_refs.source_record_id", "NO"],
      ["gnr8_ddom_readiness_snapshot_refs.metadata_json", "NO"],
    ] as const) {
      assert.equal(columnByKey.get(key)?.is_nullable, nullable, key);
    }
    assert.match(columnByKey.get("gnr8_ddom_readiness_snapshots.id")?.column_default ?? "", /gen_random_uuid\(\)/);
    assert.match(columnByKey.get("gnr8_ddom_readiness_snapshot_refs.id")?.column_default ?? "", /gen_random_uuid\(\)/);

    const constraints = await pool.query<{ conname: string }>(
      `
      select conname
      from pg_constraint
      where conrelid in (
        'public.gnr8_ddom_readiness_snapshots'::regclass,
        'public.gnr8_ddom_readiness_snapshot_refs'::regclass
      )
      order by conname
      `,
    );
    const constraintNames = new Set(constraints.rows.map((row) => row.conname));
    for (const name of [
      "gnr8_ddom_readiness_snapshots_readiness_state_ck",
      "gnr8_ddom_readiness_snapshots_freshness_state_ck",
      "gnr8_ddom_readiness_snapshots_actor_type_ck",
      "gnr8_ddom_readiness_snapshots_privacy_ck",
      "gnr8_ddom_readiness_snapshots_retention_ck",
      "gnr8_ddom_readiness_snapshots_json_shape_ck",
      "gnr8_ddom_readiness_snapshot_refs_metadata_object_ck",
      "gnr8_ddom_readiness_snapshot_refs_role_ck",
      "gnr8_ddom_readiness_snapshot_refs_semantic_uq",
    ]) {
      assert.equal(constraintNames.has(name), true, name);
    }

    const indexes = await pool.query<{ indexname: string }>(
      `
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename in ('gnr8_ddom_readiness_snapshots', 'gnr8_ddom_readiness_snapshot_refs')
      order by indexname
      `,
    );
    const indexNames = new Set(indexes.rows.map((row) => row.indexname));
    for (const name of [
      "gnr8_ddom_readiness_snapshots_pkey",
      "gnr8_ddom_readiness_snapshots_idempotency_key_key",
      "gnr8_ddom_readiness_snapshot_refs_pkey",
      "gnr8_ddom_readiness_snapshot_refs_semantic_uq",
      "idx_gnr8_ddom_readiness_snapshots_site_captured",
      "idx_gnr8_ddom_readiness_snapshots_site_version_captured",
      "idx_gnr8_ddom_readiness_snapshots_domain_binding_captured",
      "idx_gnr8_ddom_readiness_snapshots_readiness_freshness",
      "idx_gnr8_ddom_readiness_snapshots_fresh_until",
      "idx_gnr8_ddom_readiness_snapshots_semantic_watermark",
      "idx_gnr8_ddom_readiness_snapshot_refs_lookup",
      "idx_gnr8_ddom_readiness_snapshot_refs_snapshot_role",
    ]) {
      assert.equal(indexNames.has(name), true, name);
    }

    const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `
      select relname, relrowsecurity
      from pg_class
      where oid in (
        'public.gnr8_ddom_readiness_snapshots'::regclass,
        'public.gnr8_ddom_readiness_snapshot_refs'::regclass
      )
      `,
    );
    assert.deepEqual(
      new Map(rls.rows.map((row) => [row.relname, row.relrowsecurity])),
      new Map([
        ["gnr8_ddom_readiness_snapshots", true],
        ["gnr8_ddom_readiness_snapshot_refs", true],
      ]),
    );

    const policies = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from pg_policy
      where polrelid in (
        'public.gnr8_ddom_readiness_snapshots'::regclass,
        'public.gnr8_ddom_readiness_snapshot_refs'::regclass
      )
      `,
    );
    assert.equal(policies.rows[0]?.count, "0");

    const triggers = await pool.query<{ tgname: string }>(
      `
      select tgname
      from pg_trigger
      where tgrelid in (
        'public.gnr8_ddom_readiness_snapshots'::regclass,
        'public.gnr8_ddom_readiness_snapshot_refs'::regclass
      )
        and not tgisinternal
      order by tgname
      `,
    );
    assert.deepEqual(
      triggers.rows.map((row) => row.tgname),
      [
        "trg_gnr8_ddom_readiness_snapshot_refs_append_only",
        "trg_gnr8_ddom_readiness_snapshots_append_only",
      ],
    );

    const snapshotId = await insertSnapshot(pool);
    const ref = await pool.query<{ id: string }>(
      `
      insert into public.gnr8_ddom_readiness_snapshot_refs (
        snapshot_id,
        ref_role,
        ref_type,
        source_record_id,
        source_watermark,
        metadata_json
      )
      values ($1::uuid, 'domain_binding', 'runtime_domain_host_binding', $2, 'ref-watermark-1', '{"ref":true}'::jsonb)
      returning id::text
      `,
      [snapshotId, `source-${snapshotId}`],
    );
    assert.equal(ref.rowCount, 1);

    await assertDbRejects(
      () => pool.query(`update public.gnr8_ddom_readiness_snapshots set stale_reason = 'corrected' where id = $1::uuid`, [snapshotId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_ddom_readiness_snapshots where id = $1::uuid`, [snapshotId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`update public.gnr8_ddom_readiness_snapshot_refs set source_version = '2' where id = $1::uuid`, [ref.rows[0]!.id]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_ddom_readiness_snapshot_refs where id = $1::uuid`, [ref.rows[0]!.id]),
      /append-only/i,
    );

    await assertDbRejects(() => insertSnapshot(pool, { readinessState: "almost_ready" }), /readiness_state_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { freshnessState: "expired" }), /freshness_state_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { readinessBlockers: {} }), /json_shape_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { sourceWatermarkJson: [] }), /json_shape_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { actorType: "robot" }), /actor_type_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { privacyLabel: "private" }), /privacy_ck/i);
    await assertDbRejects(() => insertSnapshot(pool, { retentionClass: "forever" }), /retention_ck/i);

    const duplicateIdempotencyKey = `idem-duplicate-${randomUUID()}`;
    await insertSnapshot(pool, { idempotencyKey: duplicateIdempotencyKey });
    await assertDbRejects(() => insertSnapshot(pool, { idempotencyKey: duplicateIdempotencyKey }), /idempotency_key_key/i);

    const duplicateSiteId = `site-semantic-${randomUUID()}`;
    const duplicateWatermark = `watermark-semantic-${randomUUID()}`;
    await insertSnapshot(pool, { siteId: duplicateSiteId, sourceWatermark: duplicateWatermark });
    await assertDbRejects(
      () => insertSnapshot(pool, { siteId: duplicateSiteId, sourceWatermark: duplicateWatermark }),
      /semantic_watermark/i,
    );

    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_ddom_readiness_snapshot_refs (
            snapshot_id,
            ref_role,
            ref_type,
            source_record_id
          )
          values ($1::uuid, 'domain_binding', 'runtime_domain_host_binding', $2)
          `,
          [snapshotId, `source-${snapshotId}`],
        ),
      /semantic_uq/i,
    );
    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_ddom_readiness_snapshot_refs (
            snapshot_id,
            ref_role,
            ref_type,
            source_record_id,
            metadata_json
          )
          values ($1::uuid, 'domain_binding', 'runtime_domain_host_binding', $2, '[]'::jsonb)
          `,
          [snapshotId, `source-other-${snapshotId}`],
        ),
      /metadata_object_ck/i,
    );
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
