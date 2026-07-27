import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import {
  DdomReadinessSnapshotIdempotencyConflictError,
  DdomReadinessSnapshotRepository,
  DdomReadinessSnapshotWriter,
  type CreateDdomReadinessSnapshotInput,
  type DdomSnapshotWriterClient,
  type DdomSnapshotWriterPool,
} from "./ddom-readiness-snapshot-writer";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
);

const SOURCE_PATH = path.resolve(process.cwd(), "apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts");

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
  const containerName = `gnr8-ddom-writer-${process.pid}-${suffix}`;
  const database = `gnr8_ddom_writer_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_ddom_writer_${suffix.replace(/-/g, "")}`;
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
      // Best-effort cleanup for disposable local DB setup failure.
    }
    throw error;
  }
}

function baseInput(suffix: string, overrides: Partial<CreateDdomReadinessSnapshotInput> = {}): CreateDdomReadinessSnapshotInput {
  const siteVersionId = "11111111-1111-4111-8111-111111111111";
  const domainBindingId = "22222222-2222-4222-8222-222222222222";
  return {
    tenantId: `tenant-${suffix}`,
    clientId: `client-${suffix}`,
    siteId: `site-${suffix}`,
    siteVersionId,
    domainBindingId,
    domain: `launch-${suffix}.example.com`,
    readinessState: "ready_with_warnings",
    readinessBlockers: [],
    readinessWarnings: ["manual_dns_owner_confirmation_recorded"],
    freshnessState: "fresh",
    freshUntil: "2026-07-28T12:00:00.000Z",
    sourceWatermarkJson: { domainBinding: `binding-watermark-${suffix}` },
    snapshotJson: {
      vercel: {
        source: "stored_binding_fields",
        status: "active",
        limitation: "vercel_state_not_dns_truth",
      },
    },
    refs: [
      {
        refRole: "domain_binding",
        refType: "runtime_domain_host_binding",
        sourceTable: "gnr8_runtime_domain_host_bindings",
        sourceRecordId: domainBindingId,
        sourceWatermark: `binding-watermark-${suffix}`,
        capturedAt: "2026-07-27T11:00:00.000Z",
        metadataJson: { status: "active" },
      },
      {
        refRole: "freshness_watermark",
        refType: "ddom_source_watermark",
        sourceRecordId: `freshness-${suffix}`,
        sourceWatermark: `freshness-watermark-${suffix}`,
        metadataJson: { freshUntil: "2026-07-28T12:00:00.000Z" },
      },
    ],
    actorType: "system",
    actorId: "ddom-writer-integration-test",
    correlationId: `corr-${suffix}`,
    idempotencyKey: `idem-${suffix}`,
    ...overrides,
  };
}

function loggingPool(pool: Pool, queries: string[]): DdomSnapshotWriterPool {
  return {
    async connect() {
      const client = await pool.connect();
      const wrapped: DdomSnapshotWriterClient = {
        release: () => client.release(),
        query: (sql, values) => {
          queries.push(sql);
          const query = client.query.bind(client) as (
            queryText: string,
            values?: readonly unknown[],
          ) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
          return query(sql, values);
        },
      };
      return wrapped;
    },
  };
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

test("DDOM writer creates append-only snapshots and refs in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 3 });
  const writerQueries: string[] = [];
  const writer = new DdomReadinessSnapshotWriter(new DdomReadinessSnapshotRepository(loggingPool(pool, writerQueries)));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const ddomTables = await pool.query<{ table_name: string }>(
      `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name like 'gnr8_%'
      order by table_name
      `,
    );
    assert.deepEqual(
      ddomTables.rows.map((row) => row.table_name),
      ["gnr8_ddom_readiness_snapshot_refs", "gnr8_ddom_readiness_snapshots"],
    );

    const input = baseInput(suffix);
    const first = await writer.createDdomReadinessSnapshot(input);
    assert.equal(first.reusedExisting, false);
    assert.match(first.sourceWatermark, /^sha256:/);
    assert.equal(first.refIds.length, 2);

    const snapshotRows = await pool.query<{
      id: string;
      site_id: string;
      readiness_state: string;
      freshness_state: string;
      source_watermark: string;
      source_watermark_json: unknown;
      snapshot_json: unknown;
    }>(
      `
      select
        id::text,
        site_id,
        readiness_state,
        freshness_state,
        source_watermark,
        source_watermark_json,
        snapshot_json
      from public.gnr8_ddom_readiness_snapshots
      where id = $1::uuid
      `,
      [first.snapshotId],
    );
    assert.equal(snapshotRows.rowCount, 1);
    assert.equal(snapshotRows.rows[0]?.site_id, input.siteId);
    assert.equal(snapshotRows.rows[0]?.readiness_state, "ready_with_warnings");
    assert.equal(snapshotRows.rows[0]?.freshness_state, "fresh");
    assert.deepEqual(snapshotRows.rows[0]?.source_watermark_json, input.sourceWatermarkJson);

    const refRows = await pool.query<{ ref_role: string; source_record_id: string; metadata_json: unknown }>(
      `
      select ref_role, source_record_id, metadata_json
      from public.gnr8_ddom_readiness_snapshot_refs
      where snapshot_id = $1::uuid
      order by ref_role, source_record_id
      `,
      [first.snapshotId],
    );
    assert.equal(refRows.rowCount, 2);
    assert.deepEqual(
      refRows.rows.map((row) => row.ref_role).sort(),
      ["domain_binding", "freshness_watermark"],
    );

    const retry = await writer.createDdomReadinessSnapshot(input);
    assert.equal(retry.snapshotId, first.snapshotId);
    assert.equal(retry.reusedExisting, true);
    assert.deepEqual(retry.refIds.sort(), first.refIds.sort());

    await assert.rejects(
      () =>
        writer.createDdomReadinessSnapshot({
          ...input,
          readinessWarnings: ["drifted_warning"],
        }),
      (error) =>
        error instanceof DdomReadinessSnapshotIdempotencyConflictError &&
        error.driftedFields.includes("snapshot_payload"),
    );

    const countsAfterDrift = await pool.query<{ snapshots: string; refs: string }>(
      `
      select
        (select count(*)::text from public.gnr8_ddom_readiness_snapshots) as snapshots,
        (select count(*)::text from public.gnr8_ddom_readiness_snapshot_refs) as refs
      `,
    );
    assert.equal(countsAfterDrift.rows[0]?.snapshots, "1");
    assert.equal(countsAfterDrift.rows[0]?.refs, "2");

    await assertDbRejects(
      () => pool.query(`update public.gnr8_ddom_readiness_snapshots set stale_reason = 'changed' where id = $1::uuid`, [first.snapshotId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_ddom_readiness_snapshot_refs where id = $1::uuid`, [first.refIds[0]]),
      /append-only/i,
    );

    await assertDbRejects(
      () =>
        pool.query(
          `
          insert into public.gnr8_ddom_readiness_snapshots (
            tenant_id,
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
            idempotency_key
          )
          values (
            'tenant-invalid',
            'site-invalid',
            'almost_ready',
            '[]'::jsonb,
            '[]'::jsonb,
            'fresh',
            'invalid-watermark',
            '{}'::jsonb,
            '{}'::jsonb,
            'system',
            'db-test',
            'corr-invalid',
            'idem-invalid'
          )
          `,
        ),
      /readiness_state_ck/i,
    );

    const source = fs.readFileSync(SOURCE_PATH, "utf8");
    assert.doesNotMatch(source, /from\s+["'][^"']*(runtime-store|hosting-domain-recheck|vercel|openprovider|dns-provider|provider-execution|publish-|rollback|stripe|billing|ai_execution|worker)[^"']*["']/i);
    assert.doesNotMatch(source, /\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname)\b/i);
    assert.ok(writerQueries.some((sql) => /insert into public\.gnr8_ddom_readiness_snapshots/i.test(sql)));
    assert.ok(writerQueries.some((sql) => /insert into public\.gnr8_ddom_readiness_snapshot_refs/i.test(sql)));
    assert.equal(writerQueries.some((sql) => /\b(update|delete|merge|truncate)\b/i.test(sql)), false);
    assert.equal(writerQueries.some((sql) => /public\.(?!gnr8_ddom_readiness_snapshots|gnr8_ddom_readiness_snapshot_refs)[a-z0-9_]+/i.test(sql)), false);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
