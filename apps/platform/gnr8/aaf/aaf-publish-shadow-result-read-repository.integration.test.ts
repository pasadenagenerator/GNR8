import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafPublishShadowResultReadRepository, readPublishShadowResult } from "./aaf-publish-shadow-result-read-repository";

const REPO_ROOT = process.cwd();
const AAF_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");
const DDOM_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql");
const PTT_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql");

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

type SeededFixture = {
  tenantId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  correlationId: string;
  idempotencyKey: string;
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
  const containerName = `gnr8-pasr-4-shadow-read-${process.pid}-${suffix}`;
  const database = `gnr8_pasr_4_shadow_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_pasr_4_shadow_${suffix.replace(/-/g, "")}`;
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

async function applyMigration(pool: Pool, migrationPath: string): Promise<void> {
  await pool.query(await fs.readFile(migrationPath, "utf8"));
}

async function createMinimalRuntimeFixtureTables(pool: Pool): Promise<void> {
  await pool.query("create extension if not exists pgcrypto");
  await pool.query(`
    create table public.gnr8_runtime_sites (
      id text primary key,
      source_url text not null,
      source_host text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_site_versions (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id),
      version_no integer not null,
      state text not null,
      source text not null,
      actor text not null,
      renderer_compatibility_version text not null,
      import_provenance_summary jsonb,
      artifact_id uuid,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (site_id, version_no)
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_artifacts (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id),
      site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
      renderer_compatibility_version text not null,
      bundle_sha256 text not null,
      html_by_path jsonb not null,
      compiled_token_styles text not null,
      asset_fingerprint_map jsonb not null,
      manifest jsonb not null,
      publish_stage text not null default 'production',
      shadow_restricted boolean not null default false,
      artifact_governance jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (site_version_id)
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_active_pointers (
      site_id text primary key references public.gnr8_runtime_sites(id),
      active_site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
      active_artifact_id uuid not null references public.gnr8_runtime_artifacts(id),
      updated_at timestamptz not null default now()
    )
  `);
}

async function setupPool(): Promise<{ disposable: DisposablePostgres; pool: Pool }> {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  await applyMigration(pool, AAF_MIGRATION);
  await createMinimalRuntimeFixtureTables(pool);
  await applyMigration(pool, DDOM_MIGRATION);
  await applyMigration(pool, PTT_MIGRATION);
  return { disposable, pool };
}

async function seedRuntime(pool: Pool, suffix: string): Promise<SeededFixture> {
  const tenantId = `tenant-${suffix}`;
  const clientId = `client-${suffix}`;
  const siteId = `site-${suffix}`;
  const siteVersionId = randomUUID();
  const runtimeArtifactId = randomUUID();
  const activeSiteVersionId = randomUUID();
  const activeArtifactId = randomUUID();
  const correlationId = `corr-pasr-4-${suffix}`;
  const idempotencyKey = `idem-pasr-4-${suffix}`;

  await pool.query(`insert into public.gnr8_runtime_sites (id, source_url, source_host) values ($1, $2, $3)`, [
    siteId,
    "https://source.example.test",
    "source.example.test",
  ]);
  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions (
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, artifact_id, created_at, updated_at
    )
    values ($1::uuid, $2, 1, 'PUBLISHED', 'migration', 'system', 'runtime-v1', $3::uuid, $4, $5)
    `,
    [activeSiteVersionId, siteId, activeArtifactId, "2026-07-27T08:00:00.000Z", "2026-07-27T08:05:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      id, site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, artifact_governance, created_at
    )
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'active-bundle', '{}'::jsonb,
      '', '{}'::jsonb, '{}'::jsonb, 'production', '{}'::jsonb, $4)
    `,
    [activeArtifactId, siteId, activeSiteVersionId, "2026-07-27T08:06:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions (
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, artifact_id, created_at, updated_at
    )
    values ($1::uuid, $2, 2, 'APPROVED', 'migration', 'system', 'runtime-v1', $3::uuid, $4, $5)
    `,
    [siteVersionId, siteId, runtimeArtifactId, "2026-07-27T09:00:00.000Z", "2026-07-27T09:10:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      id, site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, artifact_governance, created_at
    )
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'candidate-bundle', '{"/":"<html></html>"}'::jsonb,
      'body{}', '{}'::jsonb, '{"paths":["/"]}'::jsonb, 'production', '{}'::jsonb, $4)
    `,
    [runtimeArtifactId, siteId, siteVersionId, "2026-07-27T09:11:00.000Z"],
  );
  await pool.query(
    `insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id, updated_at) values ($1, $2::uuid, $3::uuid, $4)`,
    [siteId, activeSiteVersionId, activeArtifactId, "2026-07-27T09:15:00.000Z"],
  );

  return { tenantId, clientId, siteId, siteVersionId, runtimeArtifactId, correlationId, idempotencyKey };
}

async function seedDdom(pool: Pool, fixture: SeededFixture, overrides: { stale?: boolean } = {}): Promise<string> {
  const snapshotId = randomUUID();
  await pool.query(
    `
    insert into public.gnr8_ddom_readiness_snapshots (
      id, tenant_id, client_id, site_id, site_version_id, domain, intended_launch_domain, readiness_state,
      readiness_blockers, readiness_warnings, freshness_state, fresh_until, stale_reason, captured_at, source_watermark,
      source_watermark_json, snapshot_json, created_by_actor_type, created_by_actor_id, correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5::uuid, 'example.test', 'example.test', $6,
      $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, '{}'::jsonb, '{"ready":true}'::jsonb,
      'system', 'pasr-4-test', $14, $15)
    `,
    [
      snapshotId,
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.siteVersionId,
      overrides.stale ? "stale" : "ready",
      overrides.stale ? '["domain_readiness_stale"]' : "[]",
      "[]",
      overrides.stale ? "stale" : "fresh",
      overrides.stale ? "2026-07-27T10:00:00.000Z" : "2026-07-29T10:00:00.000Z",
      overrides.stale ? "domain_readiness_stale" : null,
      "2026-07-27T10:00:00.000Z",
      `ddom-watermark-${fixture.siteId}`,
      `${fixture.correlationId}:ddom`,
      `${fixture.idempotencyKey}:ddom`,
    ],
  );
  return snapshotId;
}

async function seedApproval(pool: Pool, fixture: SeededFixture, evidencePackageId: string): Promise<{ requestId: string; decisionId: string }> {
  const requestId = randomUUID();
  const decisionId = randomUUID();
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_requests (
      id, tenant_id, client_id, site_id, site_version_id, scope, subject_type, subject_id,
      requester_actor_type, requester_actor_id, requester_role, status, policy_version,
      correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5, 'publish_activation', 'site_version', $5,
      'human', 'operator-test', 'agency_admin', 'requested', 'PASR-2-shadow', $6, $7)
    `,
    [requestId, fixture.tenantId, fixture.clientId, fixture.siteId, fixture.siteVersionId, fixture.correlationId, `${fixture.idempotencyKey}:approval-request`],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_decisions (
      id, approval_request_id, status, decision_actor_type, decision_actor_id, decision_actor_role,
      policy_version, evidence_package_id, correlation_id, idempotency_key
    )
    values ($1::uuid, $2::uuid, 'granted', 'human', 'superadmin-test', 'superadmin',
      'PASR-2-shadow', $3::uuid, $4, $5)
    `,
    [decisionId, requestId, evidencePackageId, fixture.correlationId, `${fixture.idempotencyKey}:approval-decision`],
  );
  return { requestId, decisionId };
}

async function seedAafShadowRows(
  pool: Pool,
  fixture: SeededFixture,
  options: { ddomSnapshotId?: string | null; includeApproval?: boolean; gateResult?: "allowed" | "approval_required" | "blocked" },
): Promise<{ evidencePackageId: string; gateAttemptId: string }> {
  const evidencePackageId = randomUUID();
  const sourceWatermark = `siteVersion:updated_at:2026-07-27T09:10:00.000Z|runtimeArtifact:candidate-bundle|activePointer:2026-07-27T09:15:00.000Z|publishTarget:ptt-1|domainReadiness:${options.ddomSnapshotId ?? "missing"}`;
  const missingSourceTruth = options.ddomSnapshotId ? [] : ["domainReadiness"];
  await pool.query(
    `
    insert into public.gnr8_aaf_evidence_packages (
      id, tenant_id, client_id, site_id, site_version_id, package_type, subject_type, subject_id,
      status, created_by_actor_type, created_by_actor_id, source_watermark, freshness_label, content_hash,
      limitations_json, correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5, 'publish_activation_evidence', 'site_version', $5,
      $6, 'human', 'operator-test', $7, $8, $9, $10::jsonb, $11, $12)
    `,
    [
      evidencePackageId,
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.siteVersionId,
      missingSourceTruth.length > 0 ? "invalid" : "created",
      sourceWatermark,
      missingSourceTruth.length > 0 ? "failed" : "fresh",
      `pasr4contenthash${evidencePackageId.replace(/-/g, "")}`,
      JSON.stringify({ missingSourceTruth, limitations: missingSourceTruth.map((key) => `${key}_source_truth_missing`), warnings: [] }),
      fixture.correlationId,
      fixture.idempotencyKey,
    ],
  );

  const refs = [
    ["siteVersion", "gnr8_runtime_site_versions", fixture.siteVersionId, `updated_at:2026-07-27T09:10:00.000Z`],
    ["runtimeArtifact", "gnr8_runtime_artifacts", fixture.runtimeArtifactId, "bundle_sha256:candidate-bundle"],
    ["activePointer", "gnr8_runtime_active_pointers", fixture.siteId, "updated_at:2026-07-27T09:15:00.000Z"],
    ["publishTarget", "gnr8_publish_targets", "production", "ptt-1:gnr8_publish_targets:production"],
    ...(options.ddomSnapshotId
      ? [["domainReadiness", "gnr8_ddom_readiness_snapshots", options.ddomSnapshotId, `ddom-watermark-${fixture.siteId}`]]
      : []),
  ] as const;
  for (const [key, table, recordId, watermark] of refs) {
    await pool.query(
      `
      insert into public.gnr8_aaf_evidence_package_source_refs (
        evidence_package_id, source_system, source_table, source_record_id, source_version, source_watermark,
        hash, query_ref, snapshot_ref, metadata_json
      )
      values ($1::uuid, 'gnr8', $2, $3, 'v1', $4, $5, $6, $7, $8::jsonb)
      `,
      [
        evidencePackageId,
        table,
        recordId,
        watermark,
        `pasr4refhash${key}${recordId}`.replace(/[^a-zA-Z0-9]/g, ""),
        `aaf_publish_activation_source_reader:v1:${key}`,
        `gnr8:${table}:${recordId}`,
        JSON.stringify({ sourceKey: key, freshnessStatus: "fresh", staleReason: null, watermarkMetadata: { canonicalWatermark: watermark } }),
      ],
    );
  }
  await pool.query(
    `
    insert into public.gnr8_aaf_evidence_package_freshness_checks (
      evidence_package_id, policy_version, result, checked_by_actor_type, checked_by_actor_id,
      stale_reason, current_source_watermark, correlation_id, idempotency_key
    )
    values ($1::uuid, 'PASR-2-shadow', $2, 'human', 'operator-test', $3, $4, $5, $6)
    `,
    [
      evidencePackageId,
      missingSourceTruth.length > 0 ? "failed" : "fresh",
      missingSourceTruth.length > 0 ? "domainReadiness_source_truth_missing" : null,
      sourceWatermark,
      fixture.correlationId,
      `${fixture.idempotencyKey}:freshness`,
    ],
  );

  const approval = options.includeApproval ? await seedApproval(pool, fixture, evidencePackageId) : { requestId: null, decisionId: null };
  const policyEvaluationId = randomUUID();
  const auditEventId = randomUUID();
  const gateAttemptId = randomUUID();
  const gateResult = options.gateResult ?? (options.includeApproval ? "allowed" : "approval_required");
  const blockerCodes = gateResult === "allowed" ? [] : options.includeApproval ? ["domain_readiness_blocked"] : ["approval_missing"];

  await pool.query(
    `
    insert into public.gnr8_aaf_approval_policy_evaluations (
      id, tenant_id, client_id, site_id, site_version_id, policy_version, result, scope, action_key,
      subject_type, subject_id, actor_type, actor_id, actor_role, approval_request_id, approval_decision_id,
      evidence_package_id, blocker_codes, correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5, 'PASR-2-shadow', $6, 'publish_activation', 'publish.activation',
      'site_version', $5, 'human', 'operator-test', 'agency_admin', $7::uuid, $8::uuid, $9::uuid,
      $10::jsonb, $11, $12)
    `,
    [
      policyEvaluationId,
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.siteVersionId,
      gateResult === "allowed" ? "approval_required" : "approval_blocked",
      approval.requestId,
      approval.decisionId,
      evidencePackageId,
      JSON.stringify(blockerCodes),
      fixture.correlationId,
      `${fixture.idempotencyKey}:policy`,
    ],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_audit_events (
      id, tenant_id, client_id, site_id, site_version_id, event_name, event_family, severity, replay_class,
      actor_type, actor_id, actor_role, subject_type, subject_id, policy_evaluation_id, evidence_package_id,
      approval_request_id, approval_decision_id, payload_json, correlation_id, idempotency_key
    )
    values ($1::uuid, $2, $3, $4, $5, $6, 'publish', $7, 'not_replayable',
      'human', 'operator-test', 'agency_admin', 'site_version', $5, $8::uuid, $9::uuid,
      $10::uuid, $11::uuid, $12::jsonb, $13, $14)
    `,
    [
      auditEventId,
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.siteVersionId,
      `aaf.gate.${gateResult}`,
      gateResult === "allowed" ? "notice" : "warning",
      policyEvaluationId,
      evidencePackageId,
      approval.requestId,
      approval.decisionId,
      JSON.stringify({ nonExecuting: true, gateResult, blockerCodes }),
      fixture.correlationId,
      `${fixture.idempotencyKey}:audit`,
    ],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_action_gate_attempts (
      id, tenant_id, client_id, site_id, site_version_id, action_key, scope, subject_type, subject_id,
      actor_type, actor_id, actor_role, policy_evaluation_id, evidence_package_id, approval_request_id,
      approval_decision_id, pre_action_audit_event_id, gate_result, fail_closed_reason,
      correlation_id, idempotency_key, completed_at
    )
    values ($1::uuid, $2, $3, $4, $5, 'publish.activation', 'publish_activation', 'site_version', $5,
      'human', 'operator-test', 'agency_admin', $6::uuid, $7::uuid, $8::uuid, $9::uuid, $10::uuid,
      $11, null, $12, $13, now())
    `,
    [
      gateAttemptId,
      fixture.tenantId,
      fixture.clientId,
      fixture.siteId,
      fixture.siteVersionId,
      policyEvaluationId,
      evidencePackageId,
      approval.requestId,
      approval.decisionId,
      auditEventId,
      gateResult,
      fixture.correlationId,
      fixture.idempotencyKey,
    ],
  );
  return { evidencePackageId, gateAttemptId };
}

async function tableCounts(pool: Pool): Promise<Record<string, number>> {
  const result = await pool.query(
    `
    select
      (select count(*)::int from public.gnr8_aaf_evidence_packages) as evidence_packages,
      (select count(*)::int from public.gnr8_aaf_evidence_package_source_refs) as evidence_source_refs,
      (select count(*)::int from public.gnr8_aaf_evidence_package_freshness_checks) as freshness_checks,
      (select count(*)::int from public.gnr8_aaf_action_gate_attempts) as gate_attempts,
      (select count(*)::int from public.gnr8_aaf_approval_policy_evaluations) as policy_evaluations,
      (select count(*)::int from public.gnr8_aaf_audit_events) as audit_events,
      (select count(*)::int from public.gnr8_aaf_approval_requests) as approval_requests,
      (select count(*)::int from public.gnr8_aaf_approval_decisions) as approval_decisions,
      (select count(*)::int from public.gnr8_ddom_readiness_snapshots) as ddom_snapshots,
      (select count(*)::int from public.gnr8_publish_targets) as publish_targets,
      (select count(*)::int from public.gnr8_runtime_active_pointers) as active_pointers
    `,
  );
  return result.rows[0] as Record<string, number>;
}

test("PASR-4 read repository reconstructs persisted AAF/DDOM/PTT rows without mutating source tables", async () => {
  const { disposable, pool } = await setupPool();
  try {
    const suffix = randomUUID().slice(0, 8);
    const fixture = await seedRuntime(pool, suffix);
    const ddomSnapshotId = await seedDdom(pool, fixture);
    const seeded = await seedAafShadowRows(pool, fixture, { ddomSnapshotId, includeApproval: true, gateResult: "allowed" });
    const before = await tableCounts(pool);
    const repository = new AafPublishShadowResultReadRepository(pool);

    const result = await readPublishShadowResult(
      {
        tenantId: fixture.tenantId,
        clientId: fixture.clientId,
        siteId: fixture.siteId,
        siteVersionId: fixture.siteVersionId,
        runtimeArtifactId: fixture.runtimeArtifactId,
        intendedPublishTarget: "production",
        intendedPublishStage: "production",
        trustedPublishEnvironment: "production",
        correlationId: fixture.correlationId,
        idempotencyKey: fixture.idempotencyKey,
        shadowEnabledState: "enabled",
      },
      { repository },
    );
    const after = await tableCounts(pool);

    assert.equal(result.shadowStatus, "shadow_ready");
    assert.equal(result.evidenceRefs.evidencePackageId, seeded.evidencePackageId);
    assert.equal(result.evidenceRefs.gateAttemptId, seeded.gateAttemptId);
    assert.equal(result.ddomReadiness.status, "present");
    assert.equal(result.publishTarget.status, "present");
    assert.equal(result.approval.publishActivation, "present");
    assert.deepEqual(after, before);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});

test("PASR-4 read repository classifies missing DDOM, publish target, and approval from persisted fixtures", async () => {
  const { disposable, pool } = await setupPool();
  try {
    const missingDdom = await seedRuntime(pool, `missing-ddom-${randomUUID().slice(0, 4)}`);
    await seedAafShadowRows(pool, missingDdom, { ddomSnapshotId: null, includeApproval: true });
    const ddomResult = await readPublishShadowResult(
      {
        tenantId: missingDdom.tenantId,
        clientId: missingDdom.clientId,
        siteId: missingDdom.siteId,
        siteVersionId: missingDdom.siteVersionId,
        runtimeArtifactId: missingDdom.runtimeArtifactId,
        intendedPublishTarget: "production",
        correlationId: missingDdom.correlationId,
        idempotencyKey: missingDdom.idempotencyKey,
        shadowEnabledState: "enabled",
      },
      { repository: new AafPublishShadowResultReadRepository(pool) },
    );
    assert.equal(ddomResult.shadowStatus, "shadow_missing_ddom_snapshot");
    assert.equal(ddomResult.ddomReadiness.status, "missing");

    const missingApproval = await seedRuntime(pool, `missing-approval-${randomUUID().slice(0, 4)}`);
    const ddomSnapshotId = await seedDdom(pool, missingApproval);
    await seedAafShadowRows(pool, missingApproval, { ddomSnapshotId, includeApproval: false });
    const approvalResult = await readPublishShadowResult(
      {
        tenantId: missingApproval.tenantId,
        clientId: missingApproval.clientId,
        siteId: missingApproval.siteId,
        siteVersionId: missingApproval.siteVersionId,
        runtimeArtifactId: missingApproval.runtimeArtifactId,
        intendedPublishTarget: "production",
        correlationId: missingApproval.correlationId,
        idempotencyKey: missingApproval.idempotencyKey,
        shadowEnabledState: "enabled",
      },
      { repository: new AafPublishShadowResultReadRepository(pool) },
    );
    assert.equal(approvalResult.shadowStatus, "shadow_missing_publish_activation_approval");

    const missingTarget = await readPublishShadowResult(
      {
        tenantId: missingApproval.tenantId,
        clientId: missingApproval.clientId,
        siteId: missingApproval.siteId,
        siteVersionId: missingApproval.siteVersionId,
        runtimeArtifactId: missingApproval.runtimeArtifactId,
        publishTargetId: "missing-target",
        intendedPublishTarget: "missing-target",
        correlationId: missingApproval.correlationId,
        idempotencyKey: missingApproval.idempotencyKey,
        shadowEnabledState: "enabled",
      },
      { repository: new AafPublishShadowResultReadRepository(pool) },
    );
    assert.equal(missingTarget.shadowStatus, "shadow_missing_publish_target");
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
