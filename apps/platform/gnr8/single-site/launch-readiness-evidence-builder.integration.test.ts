import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafIdempotencyConflictError, AafWriterRepository } from "../aaf/aaf-writer-repository";
import { LAUNCH_READINESS_SOURCE_DIMENSIONS, hashLaunchReadinessStableValue, type LaunchReadinessSourceDimension, type LaunchReadinessSourceDimensionPackage, type LaunchReadinessSourcePackage, type LaunchReadinessSourceRef } from "./launch-readiness-source-reader";
import { buildLaunchReadinessEvidencePackage, LaunchReadinessEvidenceBuilderError } from "./launch-readiness-evidence-builder";
import { LaunchReadinessService } from "./launch-readiness-service";
import { LaunchReadinessWriterRepository, type LaunchReadinessWriterPool, type LaunchReadinessWriterTx } from "./launch-readiness-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260804143000_aaf_single_site_launch_readiness_evidence_type.sql",
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260804120000_single_site_launch_readiness_core.sql",
] as const;

const ZERO_TABLES = [
  "gnr8_aaf_approval_requests",
  "gnr8_aaf_approval_decisions",
  "gnr8_aaf_action_gate_attempts",
  "gnr8_ddom_readiness_snapshots",
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_active_site_versions",
  "gnr8_publish_events",
  "gnr8_rollback_events",
  "gnr8_billing_subscriptions",
  "gnr8_domain_bindings",
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
  const containerName = `gnr8-mvp40-launch-readiness-evidence-${process.pid}-${suffix}`;
  const database = `gnr8_mvp40_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp40_${suffix.replace(/-/g, "")}`;
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
    values ($1, $2::uuid, $3::uuid, $4, 'launch_approval_required', 'launch_publish_recovery', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'system', 'mvp40-test', $5, $6)
    returning id::text
    `,
    [tenantId, clientId, siteId, `https://mvp40-${randomUUID()}.example.test`, `corr-${randomUUID()}`, `idem-migration-${randomUUID()}`],
  );
  return { id: result.rows[0]!.id, tenantId, clientId, siteId };
}

function sourceRef(dimension: LaunchReadinessSourceDimension, suffix: string, role?: string): LaunchReadinessSourceRef {
  return {
    sourceSystem: "gnr8",
    sourceTable: dimension === "domain_readiness" ? "gnr8_ddom_readiness_snapshots" : `gnr8_${dimension}`,
    sourceType: role ?? dimension,
    sourceRecordId: `${role ?? dimension}-${suffix}`,
    sourceRef: `gnr8:${role ?? dimension}:${suffix}`,
    sourceVersion: "v1",
    sourceWatermark: `wm:${role ?? dimension}:${suffix}`,
    capturedAt: "2026-08-04T09:00:00.000Z",
    freshUntil: "2026-08-05T09:00:00.000Z",
    evidenceOnly: true,
    metadata: role ? { refRole: role } : {},
  };
}

function sourceDimension(
  name: LaunchReadinessSourceDimension,
  suffix: string,
  overrides: Partial<LaunchReadinessSourceDimensionPackage> = {},
): LaunchReadinessSourceDimensionPackage {
  const status = overrides.status ?? "ready";
  const freshnessStatus = overrides.freshnessStatus ?? (status === "not_applicable" ? "not_applicable" : "fresh");
  const required = overrides.requiredForLaunchReadiness ?? !["dns_operator_evidence", "vercel_custom_domain_ssl", "stripe_payment", "limitations", "audit_timeline", "pasr_shadow_diagnostics"].includes(name);
  const sourceRefs = overrides.sourceRefs ?? (status === "not_applicable" ? [] : [sourceRef(name, suffix)]);
  const blockers = overrides.blockers ?? [];
  const limitations = overrides.limitations ?? [];
  const warnings = overrides.warnings ?? [];
  const diagnostics = overrides.diagnostics ?? {};
  return {
    dimension: name,
    status,
    freshnessStatus,
    sourceRefs,
    sourceWatermarks: sourceRefs.map((ref) => ref.sourceWatermark).filter((item): item is string => Boolean(item)),
    semanticSourceWatermark: `sha256:${hashLaunchReadinessStableValue({ name, status, freshnessStatus, sourceRefs, blockers, limitations, warnings, diagnostics })}`,
    sourceCapturedAt: sourceRefs[0]?.capturedAt ?? null,
    freshUntil: sourceRefs[0]?.freshUntil ?? null,
    blockers,
    limitations,
    warnings,
    diagnostics,
    requiredForLaunchReadiness: required,
    requiredForPublishActivation: required,
  };
}

function sourcePackage(migration: { id: string; tenantId: string; clientId: string; siteId: string }, suffix: string, overrides: Partial<Record<LaunchReadinessSourceDimension, Partial<LaunchReadinessSourceDimensionPackage>>> = {}): LaunchReadinessSourcePackage {
  const dimensions = Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => [name, sourceDimension(name, suffix, overrides[name])]),
  ) as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
  dimensions.client_approval = sourceDimension("client_approval", suffix, {
    sourceRefs: [sourceRef("client_approval", suffix, "client_approval_decision")],
    ...overrides.client_approval,
  });
  dimensions.improved_candidate = sourceDimension("improved_candidate", suffix, {
    sourceRefs: [
      sourceRef("improved_candidate", suffix, "improved_candidate_site_version"),
      sourceRef("improved_candidate", suffix, "improved_runtime_artifact"),
    ],
    ...overrides.improved_candidate,
  });
  dimensions.domain_readiness = sourceDimension("domain_readiness", suffix, {
    sourceRefs: [sourceRef("domain_readiness", suffix, "ddom_readiness_snapshot")],
    ...overrides.domain_readiness,
  });
  dimensions.stripe_payment = sourceDimension("stripe_payment", suffix, {
    status: "not_applicable",
    freshnessStatus: "not_applicable",
    sourceRefs: [],
    requiredForLaunchReadiness: false,
    requiredForPublishActivation: false,
    ...overrides.stripe_payment,
  });
  dimensions.pasr_shadow_diagnostics = sourceDimension("pasr_shadow_diagnostics", suffix, {
    status: "ready_with_limitations",
    freshnessStatus: "fresh",
    sourceRefs: [sourceRef("pasr_shadow_diagnostics", suffix, "pasr_shadow_result")],
    limitations: ["pasr_shadow_diagnostics_non_enforcing"],
    requiredForLaunchReadiness: false,
    requiredForPublishActivation: false,
    ...overrides.pasr_shadow_diagnostics,
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
      actorId: "mvp40-source-reader",
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

async function countRows(pool: Pool, tableName: string): Promise<number | null> {
  const exists = await pool.query(`select to_regclass($1) as table_name`, [`public.${tableName}`]);
  if (!exists.rows[0]?.table_name) return null;
  const count = await pool.query(`select count(*)::int as count from public.${tableName}`);
  return Number(count.rows[0]?.count ?? 0);
}

test("launch readiness evidence builder persists only AAF evidence records in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const readinessRepository = new LaunchReadinessWriterRepository(writerPool(pool));
  const readinessService = new LaunchReadinessService(readinessRepository);
  const aafWriter = new AafWriterRepository(pool);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const migration = await insertMigration(pool);
    const recorded = await readinessService.recordLaunchReadinessFromSources({
      sourcePackage: sourcePackage(migration, suffix),
      idempotencyKey: `idem-readiness-${suffix}`,
      correlationId: `corr-readiness-${suffix}`,
    });
    await readinessService.recordLaunchReadinessCloseout({
      readinessId: recorded.readiness.id,
      actor: { actorType: "system", actorId: "mvp40-test", actorRole: "system" },
      correlationId: `corr-closeout-${suffix}`,
      idempotencyKey: `idem-closeout-${suffix}`,
      finalEvidenceSummaryJson: { ready: true },
      finalLimitationsJson: [],
      finalBlockersJson: [],
      publishActivationHandoffRefsJson: [
        {
          sourceType: "publish_activation_review_handoff",
          sourceRecordId: `handoff-${suffix}`,
          sourceRef: `gnr8:handoff:${suffix}`,
          sourceWatermark: `wm:handoff:${suffix}`,
        },
      ],
    });

    const input = {
      tenantId: migration.tenantId,
      clientId: migration.clientId,
      siteId: migration.siteId,
      migrationId: migration.id,
      launchReadinessRecordId: recorded.readiness.id,
      actor: { actorType: "system" as const, actorId: "mvp40-evidence-builder-test", actorRole: "system" },
      correlationId: `corr-evidence-${suffix}`,
      idempotencyKey: `idem-evidence-${suffix}`,
      policyVersion: `MVP-40-${suffix}`,
      requireCloseout: true,
      repository: readinessRepository,
      writer: aafWriter,
    };

    const first = await buildLaunchReadinessEvidencePackage(input);
    const retry = await buildLaunchReadinessEvidencePackage(input);
    assert.equal(retry.evidencePackageId, first.evidencePackageId);

    const packageRows = await pool.query(
      `select package_type, subject_type, subject_id, status, freshness_label, source_watermark, content_hash from public.gnr8_aaf_evidence_packages where id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.equal(packageRows.rowCount, 1);
    assert.equal(packageRows.rows[0]?.package_type, "single_site_launch_readiness_evidence");
    assert.equal(packageRows.rows[0]?.subject_type, "single_site_launch_readiness_package");
    assert.equal(packageRows.rows[0]?.subject_id, recorded.readiness.id);
    assert.equal(packageRows.rows[0]?.status, "created");
    assert.equal(packageRows.rows[0]?.freshness_label, "fresh");

    const sourceRefs = await pool.query(
      `select source_table, source_record_id, source_watermark, metadata_json from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.ok((sourceRefs.rowCount ?? 0) >= recorded.refs.length + 2);
    assert.ok(sourceRefs.rows.some((row) => row.source_table === "gnr8_single_site_launch_readiness_records" && row.source_record_id === recorded.readiness.id));
    assert.ok(sourceRefs.rows.some((row) => row.source_table === "gnr8_single_site_launch_readiness_closeouts"));
    assert.ok(sourceRefs.rows.some((row) => row.metadata_json?.refRole === "pasr_shadow_result" && row.metadata_json?.nonEnforcing === true));

    const itemRows = await pool.query(
      `select item_type, item_hash, media_type, source_table, source_record_id from public.gnr8_aaf_evidence_package_items where evidence_package_id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.equal(itemRows.rowCount, 1);
    assert.equal(itemRows.rows[0]?.item_type, "single_site_launch_readiness_evidence_payload");
    assert.equal(itemRows.rows[0]?.media_type, "application/json");

    const freshnessRows = await pool.query(
      `select result, current_source_watermark from public.gnr8_aaf_evidence_package_freshness_checks where evidence_package_id = $1::uuid`,
      [first.evidencePackageId],
    );
    assert.equal(freshnessRows.rowCount, 1);
    assert.equal(freshnessRows.rows[0]?.result, "fresh");
    assert.equal(freshnessRows.rows[0]?.current_source_watermark, packageRows.rows[0]?.source_watermark);

    await assert.rejects(
      () =>
        buildLaunchReadinessEvidencePackage({
          ...input,
          expectedSemanticSourceWatermark: "sha256:drifted-source-watermark",
        }),
      (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.includes("expected_semantic_source_watermark_mismatch"),
    );

    await pool.query(
      `update public.gnr8_single_site_launch_readiness_records set semantic_source_watermark = 'sha256:drift-after-evidence' where id = $1::uuid`,
      [recorded.readiness.id],
    );
    await assert.rejects(
      () => buildLaunchReadinessEvidencePackage(input),
      (error) => error instanceof AafIdempotencyConflictError,
    );

    const blocked = await readinessService.recordLaunchReadinessFromSources({
      sourcePackage: sourcePackage(migration, `${suffix}-blocked`, {
        publish_target: {
          status: "blocked",
          freshnessStatus: "missing",
          blockers: ["publish_target_missing"],
          sourceRefs: [],
        },
      }),
      idempotencyKey: `idem-readiness-blocked-${suffix}`,
      correlationId: `corr-readiness-blocked-${suffix}`,
    });
    await assert.rejects(
      () =>
        buildLaunchReadinessEvidencePackage({
          ...input,
          launchReadinessRecordId: blocked.readiness.id,
          idempotencyKey: `idem-evidence-blocked-${suffix}`,
        }),
      (error) => error instanceof LaunchReadinessEvidenceBuilderError && error.blockerCodes.some((code) => code.includes("readiness_status_blocked") || code.includes("open_p0_blockers")),
    );

    for (const tableName of ZERO_TABLES) {
      assert.equal(await countRows(pool, tableName), tableName.startsWith("gnr8_aaf_") ? 0 : null);
    }
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
