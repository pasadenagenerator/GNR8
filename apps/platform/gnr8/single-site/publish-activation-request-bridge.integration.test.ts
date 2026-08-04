import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafIdempotencyConflictError, AafWriterRepository } from "../aaf/aaf-writer-repository";
import {
  LAUNCH_READINESS_SOURCE_DIMENSIONS,
  hashLaunchReadinessStableValue,
  type LaunchReadinessSourceDimension,
  type LaunchReadinessSourceDimensionPackage,
  type LaunchReadinessSourcePackage,
  type LaunchReadinessSourceRef,
} from "./launch-readiness-source-reader";
import { buildLaunchReadinessEvidencePackage } from "./launch-readiness-evidence-builder";
import { LaunchReadinessService } from "./launch-readiness-service";
import { LaunchReadinessWriterRepository, type LaunchReadinessWriterPool, type LaunchReadinessWriterTx } from "./launch-readiness-writer-repository";
import { SingleSitePublishActivationRequestBridge } from "./publish-activation-request-bridge";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260804143000_aaf_single_site_launch_readiness_evidence_type.sql",
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260804120000_single_site_launch_readiness_core.sql",
] as const;

const BOUNDARY_TABLES = [
  "gnr8_aaf_approval_decisions",
  "gnr8_aaf_action_gate_attempts",
  "gnr8_ddom_readiness_snapshots",
  "gnr8_ddom_readiness_snapshot_refs",
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_active_site_versions",
  "gnr8_publish_events",
  "gnr8_rollback_events",
  "gnr8_billing_subscriptions",
  "gnr8_domain_bindings",
  "gnr8_pasr_observations",
  "gnr8_pasr_shadow_results",
] as const;

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

async function startDisposablePostgres() {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-mvp41-publish-activation-request-${process.pid}-${suffix}`;
  const database = `gnr8_mvp41_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp41_${suffix.replace(/-/g, "")}`;
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
    values ($1, $2::uuid, $3::uuid, $4, 'launch_approval_required', 'launch_publish_recovery', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'system', 'mvp41-test', $5, $6)
    returning id::text
    `,
    [tenantId, clientId, siteId, `https://mvp41-${randomUUID()}.example.test`, `corr-${randomUUID()}`, `idem-migration-${randomUUID()}`],
  );
  return { id: result.rows[0]!.id, tenantId, clientId, siteId };
}

function sourceRef(dimension: LaunchReadinessSourceDimension, suffix: string, role?: string, sourceRecordId?: string): LaunchReadinessSourceRef {
  return {
    sourceSystem: "gnr8",
    sourceTable: role === "publish_target" ? "gnr8_publish_targets" : role === "improved_candidate_site_version" ? "gnr8_runtime_site_versions" : role === "improved_runtime_artifact" ? "gnr8_runtime_artifacts" : `gnr8_${dimension}`,
    sourceType: role ?? dimension,
    sourceRecordId: sourceRecordId ?? `${role ?? dimension}-${suffix}`,
    sourceRef: `gnr8:${role ?? dimension}:${sourceRecordId ?? suffix}`,
    sourceVersion: "v1",
    sourceWatermark: `wm:${role ?? dimension}:${sourceRecordId ?? suffix}`,
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
  const siteVersionId = randomUUID();
  const artifactId = randomUUID();
  const dimensions = Object.fromEntries(
    LAUNCH_READINESS_SOURCE_DIMENSIONS.map((name) => [name, sourceDimension(name, suffix, overrides[name])]),
  ) as Record<LaunchReadinessSourceDimension, LaunchReadinessSourceDimensionPackage>;
  dimensions.launch_approval = sourceDimension("launch_approval", suffix, {
    sourceRefs: [sourceRef("launch_approval", suffix, "launch_approval_decision")],
    ...overrides.launch_approval,
  });
  dimensions.content_approval = sourceDimension("content_approval", suffix, {
    sourceRefs: [sourceRef("content_approval", suffix, "content_approval_decision")],
    ...overrides.content_approval,
  });
  dimensions.client_approval = sourceDimension("client_approval", suffix, {
    sourceRefs: [sourceRef("client_approval", suffix, "client_approval_decision")],
    ...overrides.client_approval,
  });
  dimensions.improved_candidate = sourceDimension("improved_candidate", suffix, {
    sourceRefs: [
      sourceRef("improved_candidate", suffix, "improved_candidate_site_version", siteVersionId),
      sourceRef("improved_candidate", suffix, "improved_runtime_artifact", artifactId),
    ],
    ...overrides.improved_candidate,
  });
  dimensions.publish_target = sourceDimension("publish_target", suffix, {
    sourceRefs: [sourceRef("publish_target", suffix, "publish_target", "production")],
    ...overrides.publish_target,
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
      improvedCandidateSiteVersionRef: siteVersionId,
      improvedRuntimeArtifactRef: artifactId,
      launchApprovalDecisionRef: `launch-decision-${suffix}`,
    },
    readTrace: {
      actorType: "system",
      actorId: "mvp41-source-reader",
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

function sourceRefByRole(packageInput: LaunchReadinessSourcePackage, role: string) {
  const match = Object.values(packageInput.dimensions).flatMap((dimension) => dimension.sourceRefs).find((ref) => ref.metadata?.refRole === role || ref.sourceType === role);
  if (!match) throw new Error(`missing source ref role ${role}`);
  if (!match.sourceTable || !match.sourceRecordId || !match.sourceWatermark) throw new Error(`incomplete source ref role ${role}`);
  return {
    sourceSystem: match.sourceSystem ?? "gnr8",
    sourceTable: match.sourceTable,
    sourceRecordId: match.sourceRecordId,
    sourceVersion: match.sourceVersion,
    sourceWatermark: match.sourceWatermark,
    sourceRef: match.sourceRef,
  };
}

async function countRows(pool: Pool, tableName: string): Promise<number | null> {
  const exists = await pool.query(`select to_regclass($1) as table_name`, [`public.${tableName}`]);
  if (!exists.rows[0]?.table_name) return null;
  const count = await pool.query(`select count(*)::int as count from public.${tableName}`);
  return Number(count.rows[0]?.count ?? 0);
}

async function counts(pool: Pool): Promise<Record<string, number | null>> {
  return Object.fromEntries(await Promise.all(BOUNDARY_TABLES.map(async (table) => [table, await countRows(pool, table)])));
}

test("publish activation request bridge consumes MVP-40 evidence in disposable Postgres without decisions/gates/runtime mutations", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const readinessRepository = new LaunchReadinessWriterRepository(writerPool(pool));
  const readinessService = new LaunchReadinessService(readinessRepository);
  const aafWriter = new AafWriterRepository(pool);
  const bridge = new SingleSitePublishActivationRequestBridge(aafWriter);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  try {
    const before = await counts(pool);
    const migration = await insertMigration(pool);
    const readinessSources = sourcePackage(migration, suffix);
    const recorded = await readinessService.recordLaunchReadinessFromSources({
      sourcePackage: readinessSources,
      idempotencyKey: `idem-readiness-${suffix}`,
      correlationId: `corr-readiness-${suffix}`,
    });

    const evidence = await buildLaunchReadinessEvidencePackage({
      tenantId: migration.tenantId,
      clientId: migration.clientId,
      siteId: migration.siteId,
      migrationId: migration.id,
      launchReadinessRecordId: recorded.readiness.id,
      actor: { actorType: "system", actorId: "mvp41-evidence-builder-test", actorRole: "system" },
      correlationId: `corr-evidence-${suffix}`,
      idempotencyKey: `idem-evidence-${suffix}`,
      policyVersion: `MVP-40-${suffix}`,
      repository: readinessRepository,
      writer: aafWriter,
    });

    const input = {
      tenantId: migration.tenantId,
      clientId: migration.clientId,
      siteId: migration.siteId,
      migrationId: migration.id,
      launchReadinessRecordId: recorded.readiness.id,
      launchReadinessEvidencePackageId: evidence.evidencePackageId,
      improvedCandidateSiteVersionRef: sourceRefByRole(readinessSources, "improved_candidate_site_version"),
      improvedRuntimeArtifactRef: sourceRefByRole(readinessSources, "improved_runtime_artifact"),
      publishTargetRef: sourceRefByRole(readinessSources, "publish_target"),
      expectedLaunchReadinessEvidenceWatermark: evidence.semanticWatermark,
      actor: { actorType: "human" as const, actorId: "mvp41-release-operator", actorRole: "release_approver" },
      correlationId: `corr-request-${suffix}`,
      idempotencyKey: `idem-request-${suffix}`,
      policyVersion: `MVP-41-${suffix}`,
    };

    const validation = await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest(input);
    assert.equal(validation.valid, true, JSON.stringify(validation));

    const first = await bridge.preparePublishActivationRequestFromLaunchReadiness(input);
    const replay = await bridge.preparePublishActivationRequestFromLaunchReadiness(input);
    assert.equal(replay.requestId, first.requestId);
    assert.equal(replay.idempotency.result, "reused");
    assert.equal(first.scope, "publish_activation");
    assert.equal(first.action, "publish.activation");
    assert.equal(first.launchReadinessEvidencePackageId, evidence.evidencePackageId);

    const requestRows = await pool.query(`select scope, subject_type, subject_id, status, policy_version from public.gnr8_aaf_approval_requests where id = $1::uuid`, [first.requestId]);
    assert.equal(requestRows.rowCount, 1);
    assert.equal(requestRows.rows[0]?.scope, "publish_activation");
    assert.equal(requestRows.rows[0]?.subject_type, "site_version");
    assert.equal(requestRows.rows[0]?.subject_id, input.improvedCandidateSiteVersionRef.sourceRecordId);
    assert.equal(requestRows.rows[0]?.status, "requested");

    const linkRows = await pool.query(
      `select evidence_package_id::text, link_role from public.gnr8_aaf_approval_evidence_links where approval_request_id = $1::uuid`,
      [first.requestId],
    );
    assert.equal(linkRows.rowCount, 1);
    assert.equal(linkRows.rows[0]?.evidence_package_id, evidence.evidencePackageId);
    assert.equal(linkRows.rows[0]?.link_role, "publish_activation_request_launch_readiness_evidence");

    const policyRows = await pool.query(
      `select scope, action_key, result, evidence_package_id::text from public.gnr8_aaf_approval_policy_evaluations where approval_request_id = $1::uuid`,
      [first.requestId],
    );
    assert.equal(policyRows.rowCount, 1);
    assert.equal(policyRows.rows[0]?.scope, "publish_activation");
    assert.equal(policyRows.rows[0]?.action_key, "publish.activation");
    assert.equal(policyRows.rows[0]?.result, "approval_required");
    assert.equal(policyRows.rows[0]?.evidence_package_id, evidence.evidencePackageId);

    await assert.rejects(
      () => bridge.preparePublishActivationRequestFromLaunchReadiness({ ...input, requestedExpiresAt: "2026-08-05T12:00:00.000Z" }),
      AafIdempotencyConflictError,
    );

    const wrongType = await pool.query(
      `
      insert into public.gnr8_aaf_evidence_packages (
        tenant_id, client_id, site_id, site_version_id, correlation_id, idempotency_key,
        package_type, subject_type, subject_id, status, created_by_actor_type, created_by_actor_id,
        source_watermark, freshness_label, content_hash, limitations_json, privacy_label, retention_class
      )
      values ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'content_publish_evidence', 'site_version', $4::text, 'created', 'system', 'mvp41-test', 'wm:wrong-type', 'fresh', 'hash-wrong-type-mvp41', '{}'::jsonb, 'client_confidential', 'compliance_long')
      returning id::text
      `,
      [migration.tenantId, migration.clientId, migration.siteId, input.improvedCandidateSiteVersionRef.sourceRecordId, `corr-wrong-type-${suffix}`, `idem-wrong-type-${suffix}`],
    );
    const wrongTypeResult = await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
      ...input,
      launchReadinessEvidencePackageId: wrongType.rows[0]!.id,
      expectedLaunchReadinessEvidenceWatermark: "wm:wrong-type",
    });
    assert.equal(wrongTypeResult.valid, false);
    assert.ok(wrongTypeResult.blockerCodes.includes("evidence_type_mismatch"));

    const blockedPackage = await pool.query(
      `
      insert into public.gnr8_aaf_evidence_packages (
        tenant_id, client_id, site_id, site_version_id, correlation_id, idempotency_key,
        package_type, subject_type, subject_id, status, created_by_actor_type, created_by_actor_id,
        source_watermark, freshness_label, content_hash, limitations_json, privacy_label, retention_class
      )
      values ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'single_site_launch_readiness_evidence', 'single_site_launch_readiness_package', $7::text, 'created', 'system', 'mvp41-test', 'wm:blocked-readiness', 'fresh', 'hash-blocked-readiness-mvp41', $8::jsonb, 'client_confidential', 'compliance_long')
      returning id::text
      `,
      [
        migration.tenantId,
        migration.clientId,
        migration.siteId,
        input.improvedCandidateSiteVersionRef.sourceRecordId,
        `corr-blocked-${suffix}`,
        `idem-blocked-${suffix}`,
        recorded.readiness.id,
        JSON.stringify({ ...evidence.payload, readinessStatus: "blocked" }),
      ],
    );
    const blocked = await bridge.validateLaunchReadinessEvidenceForPublishActivationRequest({
      ...input,
      launchReadinessEvidencePackageId: blockedPackage.rows[0]!.id,
      expectedLaunchReadinessEvidenceWatermark: "wm:blocked-readiness",
    });
    assert.equal(blocked.valid, false);
    assert.ok(blocked.blockerCodes.includes("readiness_status_blocked"));

    const after = await counts(pool);
    assert.equal(await countRows(pool, "gnr8_aaf_approval_requests"), 1);
    assert.equal(await countRows(pool, "gnr8_aaf_approval_decisions"), 0);
    assert.equal(await countRows(pool, "gnr8_aaf_action_gate_attempts"), 0);
    for (const table of BOUNDARY_TABLES) {
      if (table === "gnr8_aaf_approval_decisions" || table === "gnr8_aaf_action_gate_attempts") continue;
      assert.equal(after[table], before[table], table);
    }
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
