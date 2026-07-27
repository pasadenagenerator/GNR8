import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql",
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
  const containerName = `gnr8-ptt-${process.pid}-${suffix}`;
  const database = `gnr8_ptt_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_ptt_local_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/20260727130000_publish_target_source_truth_persistence_core.sql`]);
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
      "/tmp/20260727130000_publish_target_source_truth_persistence_core.sql",
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

async function insertTarget(pool: Pool, input: Record<string, unknown> = {}): Promise<string> {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const row = {
    id: `target-${suffix}`,
    environment: "development",
    targetKind: "internal_runtime",
    publishStage: "shadow",
    status: "disabled",
    policyVersion: "ptt-1-test",
    allowedArtifactStages: ["shadow"],
    limitationsJson: { phase: "PTT-1", testTarget: true },
    sourceWatermark: `ptt-1-test:${suffix}`,
    actorType: "system",
    actorId: "ptt-integration-test",
    correlationId: `corr-${suffix}`,
    privacyLabel: "internal_operational",
    retentionClass: "compliance_long",
    ...input,
  };

  const result = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_publish_targets (
      id,
      environment,
      target_kind,
      publish_stage,
      status,
      policy_version,
      allowed_artifact_stages,
      limitations_json,
      source_watermark,
      created_by_actor_type,
      created_by_actor_id,
      correlation_id,
      privacy_label,
      retention_class
    )
    values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14)
    returning id
    `,
    [
      row.id,
      row.environment,
      row.targetKind,
      row.publishStage,
      row.status,
      row.policyVersion,
      JSON.stringify(row.allowedArtifactStages),
      JSON.stringify(row.limitationsJson),
      row.sourceWatermark,
      row.actorType,
      row.actorId,
      row.correlationId,
      row.privacyLabel,
      row.retentionClass,
    ],
  );

  return result.rows[0]!.id;
}

test("PTT migration applies alone and enforces publish target behavior in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 3 });

  try {
    const tables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gnr8_%publish_target%'
      order by table_name
      `,
    );
    assert.deepEqual(tables.rows.map((row) => row.table_name), ["gnr8_publish_targets"]);

    const columns = await pool.query<{ column_name: string; is_nullable: string; column_default: string | null }>(
      `
      select column_name, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gnr8_publish_targets'
      `,
    );
    const columnByName = new Map(columns.rows.map((row) => [row.column_name, row]));
    for (const [name, nullable] of [
      ["id", "NO"],
      ["environment", "NO"],
      ["target_kind", "NO"],
      ["publish_stage", "NO"],
      ["status", "NO"],
      ["policy_version", "NO"],
      ["requires_aaf", "NO"],
      ["requires_ddom_snapshot", "NO"],
      ["requires_launch_signoff", "NO"],
      ["allowed_artifact_stages", "NO"],
      ["limitations_json", "NO"],
      ["source_watermark", "YES"],
      ["created_by_actor_type", "NO"],
      ["created_by_actor_id", "NO"],
      ["correlation_id", "NO"],
      ["privacy_label", "NO"],
      ["retention_class", "NO"],
      ["created_at", "NO"],
      ["updated_at", "NO"],
    ] as const) {
      assert.equal(columnByName.get(name)?.is_nullable, nullable, name);
    }
    assert.match(columnByName.get("status")?.column_default ?? "", /'active'::text/);
    assert.match(columnByName.get("requires_aaf")?.column_default ?? "", /true/);
    assert.match(columnByName.get("requires_ddom_snapshot")?.column_default ?? "", /true/);
    assert.match(columnByName.get("requires_launch_signoff")?.column_default ?? "", /true/);
    assert.match(columnByName.get("allowed_artifact_stages")?.column_default ?? "", /'\[\]'::jsonb/);
    assert.match(columnByName.get("limitations_json")?.column_default ?? "", /'\{\}'::jsonb/);
    assert.match(columnByName.get("created_at")?.column_default ?? "", /now\(\)/);
    assert.match(columnByName.get("updated_at")?.column_default ?? "", /now\(\)/);

    const constraints = await pool.query<{ conname: string }>(
      `
      select conname
      from pg_constraint
      where conrelid = 'public.gnr8_publish_targets'::regclass
      order by conname
      `,
    );
    const constraintNames = new Set(constraints.rows.map((row) => row.conname));
    for (const name of [
      "gnr8_publish_targets_pkey",
      "gnr8_publish_targets_environment_ck",
      "gnr8_publish_targets_target_kind_ck",
      "gnr8_publish_targets_publish_stage_ck",
      "gnr8_publish_targets_status_ck",
      "gnr8_publish_targets_actor_type_ck",
      "gnr8_publish_targets_privacy_ck",
      "gnr8_publish_targets_retention_ck",
      "gnr8_publish_targets_json_shape_ck",
      "gnr8_publish_targets_allowed_artifact_stage_values_ck",
      "gnr8_publish_targets_source_watermark_nonempty_ck",
    ]) {
      assert.equal(constraintNames.has(name), true, name);
    }

    const indexes = await pool.query<{ indexname: string }>(
      `
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'gnr8_publish_targets'
      order by indexname
      `,
    );
    const indexNames = new Set(indexes.rows.map((row) => row.indexname));
    for (const name of [
      "gnr8_publish_targets_pkey",
      "idx_gnr8_publish_targets_policy_version",
      "idx_gnr8_publish_targets_status_environment_stage",
      "idx_gnr8_publish_targets_target_kind",
      "idx_gnr8_publish_targets_updated_at",
    ]) {
      assert.equal(indexNames.has(name), true, name);
    }

    const rls = await pool.query<{ relrowsecurity: boolean }>(
      `
      select relrowsecurity
      from pg_class
      where oid = 'public.gnr8_publish_targets'::regclass
      `,
    );
    assert.equal(rls.rows[0]?.relrowsecurity, true);

    const policies = await pool.query<{ count: string }>(
      `
      select count(*)::text as count
      from pg_policy
      where polrelid = 'public.gnr8_publish_targets'::regclass
      `,
    );
    assert.equal(policies.rows[0]?.count, "0");

    const seedRows = await pool.query<{
      id: string;
      environment: string;
      target_kind: string;
      publish_stage: string;
      status: string;
      policy_version: string;
      allowed_artifact_stages: string[];
      source_watermark: string | null;
    }>(
      `
      select id, environment, target_kind, publish_stage, status, policy_version, allowed_artifact_stages, source_watermark
      from public.gnr8_publish_targets
      order by id
      `,
    );
    assert.deepEqual(seedRows.rows, [
      {
        id: "production",
        environment: "production",
        target_kind: "public_runtime",
        publish_stage: "production",
        status: "active",
        policy_version: "ptt-1",
        allowed_artifact_stages: ["production"],
        source_watermark: "ptt-1:gnr8_publish_targets:production",
      },
    ]);

    const validTargetId = `target-valid-${randomUUID()}`;
    assert.equal(await insertTarget(pool, { id: validTargetId }), validTargetId);

    await insertTarget(pool, {
      id: `target-disabled-${randomUUID()}`,
      status: "disabled",
      publishStage: "canary",
      allowedArtifactStages: ["canary"],
    });
    await insertTarget(pool, {
      id: `target-retired-${randomUUID()}`,
      status: "retired",
      publishStage: "shadow",
      allowedArtifactStages: ["shadow"],
    });
    const statusRows = await pool.query<{ status: string; count: string }>(
      `
      select status, count(*)::text as count
      from public.gnr8_publish_targets
      where status in ('active', 'disabled', 'retired')
      group by status
      `,
    );
    const statusCounts = new Map(statusRows.rows.map((row) => [row.status, Number(row.count)]));
    assert.equal((statusCounts.get("active") ?? 0) >= 1, true);
    assert.equal((statusCounts.get("disabled") ?? 0) >= 1, true);
    assert.equal((statusCounts.get("retired") ?? 0) >= 1, true);

    await assertDbRejects(() => insertTarget(pool, { environment: "qa" }), /environment_ck/i);
    await assertDbRejects(() => insertTarget(pool, { targetKind: "edge_runtime" }), /target_kind_ck/i);
    await assertDbRejects(() => insertTarget(pool, { publishStage: "blue_green" }), /publish_stage_ck/i);
    await assertDbRejects(() => insertTarget(pool, { status: "paused" }), /status_ck/i);
    await assertDbRejects(() => insertTarget(pool, { allowedArtifactStages: {} }), /json_shape_ck|allowed_artifact_stage_values_ck/i);
    await assertDbRejects(() => insertTarget(pool, { limitationsJson: [] }), /json_shape_ck/i);
    await assertDbRejects(() => insertTarget(pool, { allowedArtifactStages: ["blue_green"] }), /allowed_artifact_stage_values_ck/i);
    await assertDbRejects(() => insertTarget(pool, { actorType: "automation_bot" }), /actor_type_ck/i);
    await assertDbRejects(() => insertTarget(pool, { privacyLabel: "private" }), /privacy_ck/i);
    await assertDbRejects(() => insertTarget(pool, { retentionClass: "forever" }), /retention_ck/i);
    await assertDbRejects(() => insertTarget(pool, { sourceWatermark: "   " }), /source_watermark_nonempty_ck/i);

    const duplicateId = `target-duplicate-${randomUUID()}`;
    await insertTarget(pool, { id: duplicateId });
    await assertDbRejects(() => insertTarget(pool, { id: duplicateId }), /duplicate key value|gnr8_publish_targets_pkey/i);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
