import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { LAUNCH_READINESS_SOURCE_DIMENSIONS, hashLaunchReadinessStableValue, type LaunchReadinessSourceDimension, type LaunchReadinessSourceDimensionPackage, type LaunchReadinessSourcePackage, type LaunchReadinessSourceRef } from "./launch-readiness-source-reader";
import { LaunchReadinessService } from "./launch-readiness-service";
import { LaunchReadinessWriterRepository, type LaunchReadinessWriterPool, type LaunchReadinessWriterTx } from "./launch-readiness-writer-repository";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260804120000_single_site_launch_readiness_core.sql",
] as const;

const READINESS_TABLES = [
  "gnr8_single_site_launch_readiness_records",
  "gnr8_single_site_launch_readiness_dimensions",
  "gnr8_single_site_launch_readiness_refs",
  "gnr8_single_site_launch_readiness_blockers",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_closeouts",
] as const;

const FORBIDDEN_TABLES = [
  "gnr8_aaf_evidence_packages",
  "gnr8_aaf_approval_requests",
  "gnr8_aaf_approval_decisions",
  "gnr8_aaf_gate_attempts",
  "gnr8_ddom_readiness_snapshots",
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_active_site_versions",
  "gnr8_publish_events",
  "gnr8_publish_targets",
  "gnr8_rollback_events",
  "gnr8_billing_subscriptions",
  "gnr8_domain_bindings",
  "gnr8_provider_calls",
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
  const containerName = `gnr8-mvp39-launch-readiness-${process.pid}-${suffix}`;
  const database = `gnr8_mvp39_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp39_${suffix.replace(/-/g, "")}`;
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
    return { containerName, connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}` };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best-effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function writerPool(pool: Pool): LaunchReadinessWriterPool {
  return {
    async connect() {
      return (await pool.connect()) as LaunchReadinessWriterTx;
    },
  };
}

async function insertMigration(pool: Pool): Promise<{ id: string; tenantId: string; clientId: string; siteId: string }> {
  const tenantId = `tenant-${randomUUID()}`;
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
    values ($1, $2::uuid, $3::uuid, $4, 'launch_approval_required', 'launch_publish_recovery', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'system', 'mvp39-test', $5, $6)
    returning id::text
    `,
    [tenantId, clientId, siteId, `https://mvp39-${randomUUID()}.example.test`, `corr-${randomUUID()}`, `idem-migration-${randomUUID()}`],
  );
  return { id: result.rows[0]!.id, tenantId, clientId, siteId };
}

function sourceRef(dimension: LaunchReadinessSourceDimension, suffix: string): LaunchReadinessSourceRef {
  return {
    sourceSystem: "gnr8",
    sourceTable: dimension === "domain_readiness" ? "gnr8_ddom_readiness_snapshots" : `gnr8_${dimension}`,
    sourceType: dimension,
    sourceRecordId: `${dimension}-${suffix}`,
    sourceRef: `gnr8:${dimension}:${suffix}`,
    sourceVersion: "v1",
    sourceWatermark: `wm:${dimension}:${suffix}`,
    capturedAt: "2026-08-04T09:00:00.000Z",
    freshUntil: "2026-08-05T09:00:00.000Z",
    evidenceOnly: true,
    metadata: {},
  };
}

function sourceDimension(
  name: LaunchReadinessSourceDimension,
  suffix: string,
  overrides: Partial<LaunchReadinessSourceDimensionPackage> = {},
): LaunchReadinessSourceDimensionPackage {
  const sourceRefs = overrides.sourceRefs ?? (overrides.status === "not_applicable" ? [] : [sourceRef(name, suffix)]);
  const status = overrides.status ?? "ready";
  const freshnessStatus = overrides.freshnessStatus ?? (status === "not_applicable" ? "not_applicable" : "fresh");
  const blockers = overrides.blockers ?? [];
  const limitations = overrides.limitations ?? [];
  const warnings = overrides.warnings ?? [];
  const diagnostics = overrides.diagnostics ?? {};
  const semanticSourceWatermark = `sha256:${hashLaunchReadinessStableValue({ name, status, freshnessStatus, sourceRefs, blockers, limitations, warnings, diagnostics })}`;
  return {
    dimension: name,
    status,
    freshnessStatus,
    sourceRefs,
    sourceWatermarks: sourceRefs.map((ref) => ref.sourceWatermark).filter((item): item is string => Boolean(item)),
    semanticSourceWatermark,
    sourceCapturedAt: sourceRefs[0]?.capturedAt ?? null,
    freshUntil: sourceRefs[0]?.freshUntil ?? null,
    blockers,
    limitations,
    warnings,
    diagnostics,
    requiredForLaunchReadiness: overrides.requiredForLaunchReadiness ?? !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
    requiredForPublishActivation: overrides.requiredForPublishActivation ?? !["limitations", "audit_timeline", "pasr_shadow_diagnostics", "stripe_payment"].includes(name),
  };
}

function sourcePackage(migration: { id: string; tenantId: string; clientId: string; siteId: string }, suffix: string, overrides: Partial<Record<LaunchReadinessSourceDimension, Partial<LaunchReadinessSourceDimensionPackage>>> = {}): LaunchReadinessSourcePackage {
  const dimensions = Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => [name, sourceDimension(name, suffix, overrides[name])]),
  ) as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
  dimensions.stripe_payment = sourceDimension("stripe_payment", suffix, {
    status: "not_applicable",
    freshnessStatus: "not_applicable",
    sourceRefs: [],
    requiredForLaunchReadiness: false,
    requiredForPublishActivation: false,
    ...overrides.stripe_payment,
  });
  const blockerSummaries = Object.values(dimensions).flatMap((dimension) => dimension.blockers).sort();
  const limitations = Object.values(dimensions).flatMap((dimension) => dimension.limitations).sort();
  const missingSourceTruth = Object.values(dimensions).filter((dimension) => dimension.status === "missing").map((dimension) => dimension.dimension);
  const staleSourceTruth = Object.values(dimensions).filter((dimension) => dimension.status === "stale").map((dimension) => dimension.dimension);
  return {
    identity: {
      tenantId: migration.tenantId,
      clientId: migration.clientId,
      siteId: migration.siteId,
      migrationId: migration.id,
      improvedCandidateSiteVersionRef: `site-version-${suffix}`,
      improvedRuntimeArtifactRef: `artifact-${suffix}`,
      launchApprovalDecisionRef: `launch-decision-${suffix}`,
    },
    readTrace: {
      actorType: "system",
      actorId: "mvp39-source-reader",
      actorRole: "integration_test",
      correlationId: `corr-source-${suffix}`,
      causationId: null,
      idempotencyKey: `source-read-${suffix}`,
      requestId: null,
      readerVersion: "mvp-38-launch-readiness-source-reader:v1",
    },
    transactionTimestamp: "2026-08-04T10:00:00.000Z",
    overallSourceStatus: blockerSummaries.length > 0 ? "missing" : limitations.length > 0 ? "ready_with_limitations" : "ready",
    freshnessStatus: staleSourceTruth.length > 0 ? "stale" : missingSourceTruth.length > 0 ? "missing" : "fresh",
    dimensions,
    blockerSummaries,
    limitations,
    warnings: [],
    diagnostics: {},
    missingSourceTruth,
    staleSourceTruth,
    unsupportedSourceTruth: [],
    recommendedNextAction: blockerSummaries[0] ? "resolve_blocker" : "ready_for_launch_readiness_closeout",
    semanticSourceWatermark: `sha256:${hashLaunchReadinessStableValue({ dimensions: Object.fromEntries(Object.entries(dimensions).map(([name, item]) => [name, item.semanticSourceWatermark])), blockerSummaries, limitations })}`,
    derivedOnly: true,
    mutatesSourceTruth: false,
    nonEnforcing: true,
    publishActionBlocked: false,
    publishActivationApproved: false,
  };
}

async function tableCount(pool: Pool, tableName: string): Promise<number> {
  const exists = await pool.query<{ table_name: string | null }>("select to_regclass($1)::text as table_name", [`public.${tableName}`]);
  if (!exists.rows[0]?.table_name) return 0;
  const count = await pool.query<{ count: string }>(`select count(*)::text as count from public.${tableName}`);
  return Number(count.rows[0]?.count ?? 0);
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

test("launch readiness writer service persists source packages and closeouts in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });

  try {
    const repository = new LaunchReadinessWriterRepository(writerPool(pool));
    const service = new LaunchReadinessService(repository);
    const migration = await insertMigration(pool);
    const readyPackage = sourcePackage(migration, "ready");

    const beforeForbidden = new Map<string, number>();
    for (const tableName of FORBIDDEN_TABLES) beforeForbidden.set(tableName, await tableCount(pool, tableName));

    const recorded = await service.recordLaunchReadinessFromSources({
      sourcePackage: readyPackage,
      idempotencyKey: "idem-integration-ready",
      correlationId: "corr-integration-ready",
    });

    assert.equal(recorded.readiness.status, "ready");
    assert.equal((await tableCount(pool, "gnr8_single_site_launch_readiness_records")), 1);
    assert.equal((await tableCount(pool, "gnr8_single_site_launch_readiness_dimensions")), 16);
    assert.ok((await tableCount(pool, "gnr8_single_site_launch_readiness_refs")) >= 15);
    assert.ok((await tableCount(pool, "gnr8_single_site_launch_readiness_events")) >= 1 + 1 + 16 + 15 + 1);

    const dimensionCount = await pool.query<{ count: string }>(
      "select count(*)::text as count from public.gnr8_single_site_launch_readiness_dimensions where readiness_id = $1::uuid",
      [recorded.readiness.id],
    );
    assert.equal(dimensionCount.rows[0]?.count, "16");

    const replay = await service.recordLaunchReadinessFromSources({
      sourcePackage: readyPackage,
      idempotencyKey: "idem-integration-ready",
      correlationId: "corr-integration-ready",
    });
    assert.equal(replay.readiness.id, recorded.readiness.id);
    assert.equal(replay.idempotency.reused, true);
    assert.equal((await tableCount(pool, "gnr8_single_site_launch_readiness_records")), 1);

    await assert.rejects(
      () =>
        service.recordLaunchReadinessFromSources({
          sourcePackage: sourcePackage(migration, "ready", {
            domain_readiness: { status: "missing", freshnessStatus: "missing", blockers: ["missing_ddom_snapshot"], sourceRefs: [] },
          }),
          idempotencyKey: "idem-integration-ready",
          correlationId: "corr-integration-ready",
        }),
      SingleSiteIdempotencyConflictError,
    );

    const blocked = await service.recordLaunchReadinessFromSources({
      sourcePackage: sourcePackage(migration, "blocked", {
        domain_readiness: { status: "missing", freshnessStatus: "missing", blockers: ["missing_ddom_snapshot"], sourceRefs: [] },
      }),
      idempotencyKey: "idem-integration-blocked",
      correlationId: "corr-integration-blocked",
    });
    assert.equal(blocked.readiness.status, "blocked");
    assert.ok((await tableCount(pool, "gnr8_single_site_launch_readiness_blockers")) >= 1);

    const closeout = await service.recordLaunchReadinessCloseout({
      readinessId: recorded.readiness.id,
      actor: { actorType: "human", actorId: "integration-operator", actorRole: "migration_operator" },
      correlationId: "corr-integration-closeout",
      idempotencyKey: "idem-integration-closeout",
      finalEvidenceSummaryJson: { ready: true, dimensions: 16 },
      finalLimitationsJson: [],
      finalBlockersJson: [],
      publishActivationHandoffRefsJson: [
        {
          sourceType: "publish_activation_handoff",
          sourceRecordId: "handoff-integration",
          sourceRef: "gnr8:publish_activation_handoff:handoff-integration",
          sourceWatermark: "wm-handoff-integration",
        },
      ],
    });
    assert.equal(closeout.eventActions.includes("closeout_recorded"), true);
    assert.equal((await tableCount(pool, "gnr8_single_site_launch_readiness_closeouts")), 1);

    const ref = await pool.query<{ id: string }>("select id::text from public.gnr8_single_site_launch_readiness_refs limit 1");
    const event = await pool.query<{ id: string }>("select id::text from public.gnr8_single_site_launch_readiness_events limit 1");
    const closeoutRow = await pool.query<{ id: string }>("select id::text from public.gnr8_single_site_launch_readiness_closeouts limit 1");
    await assertDbRejects(() => pool.query("update public.gnr8_single_site_launch_readiness_refs set source_version = 'edited' where id = $1::uuid", [ref.rows[0]!.id]), /append-only/i);
    await assertDbRejects(() => pool.query("delete from public.gnr8_single_site_launch_readiness_events where id = $1::uuid", [event.rows[0]!.id]), /append-only/i);
    await assertDbRejects(() => pool.query("update public.gnr8_single_site_launch_readiness_closeouts set final_status = 'blocked' where id = $1::uuid", [closeoutRow.rows[0]!.id]), /append-only/i);

    for (const tableName of FORBIDDEN_TABLES) assert.equal(await tableCount(pool, tableName), beforeForbidden.get(tableName), tableName);
    for (const tableName of READINESS_TABLES) assert.ok((await tableCount(pool, tableName)) >= (tableName.endsWith("_closeouts") ? 1 : 0), tableName);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
