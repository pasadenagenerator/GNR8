import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { LaunchReadinessSourceReadRepository } from "./launch-readiness-source-read-repository";
import { SingleSiteLaunchReadinessSourceReader } from "./launch-readiness-source-reader";

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

type TrackingPool = Pick<Pool, "connect"> & {
  sqlLog: string[];
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
  const containerName = `gnr8-mvp38-lrssr-${process.pid}-${suffix}`;
  const database = `gnr8_mvp38_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_mvp38_${suffix.replace(/-/g, "")}`;
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
      // Best-effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function trackingPool(pool: Pool): TrackingPool {
  return {
    sqlLog: [],
    async connect() {
      const client = await pool.connect();
      const originalQuery = client.query.bind(client);
      const wrapper = client as PoolClient & { query: PoolClient["query"] };
      wrapper.query = ((sql: unknown, values?: unknown[]) => {
        if (typeof sql === "string") this.sqlLog.push(sql.replace(/\s+/g, " ").trim());
        return originalQuery(sql as never, values as never);
      }) as PoolClient["query"];
      return wrapper;
    },
  };
}

async function createFixtureTables(pool: Pool): Promise<void> {
  await pool.query("create extension if not exists pgcrypto");
  await pool.query(`
    create table public.gnr8_single_site_launch_readiness_records (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_launch_readiness_dimensions (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_launch_readiness_refs (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_launch_readiness_blockers (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_launch_readiness_events (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_launch_readiness_closeouts (id uuid primary key default gen_random_uuid());
    create table public.gnr8_aaf_evidence_packages (id uuid primary key default gen_random_uuid());
    create table public.gnr8_aaf_approval_requests (id uuid primary key default gen_random_uuid());
    create table public.gnr8_aaf_approval_decisions (id uuid primary key default gen_random_uuid());
    create table public.gnr8_aaf_gate_attempts (id uuid primary key default gen_random_uuid());
    create table public.gnr8_runtime_active_pointers (
      site_id uuid primary key,
      active_site_version_id uuid not null,
      active_artifact_id uuid not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_runtime_publish_events (id uuid primary key default gen_random_uuid());
    create table public.gnr8_runtime_rollback_events (id uuid primary key default gen_random_uuid());
    create table public.gnr8_single_site_migration_refs (
      id uuid primary key default gen_random_uuid(),
      migration_id uuid not null,
      ref_role text not null,
      ref_type text not null,
      source_system text not null default 'gnr8',
      source_table text null,
      source_record_id text not null,
      source_version text null,
      source_watermark text null,
      semantic_watermark text null,
      content_hash text null,
      captured_at timestamptz null,
      fresh_until timestamptz null,
      evidence_only boolean not null default true,
      metadata_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create table public.gnr8_single_site_improved_version_reviews (
      id uuid primary key,
      migration_id uuid not null,
      client_id uuid not null,
      site_id uuid not null,
      improved_candidate_site_version_ref text not null,
      improved_runtime_artifact_ref text not null,
      review_status text not null,
      review_decision text null,
      content_approval_ready boolean not null,
      accepted_with_limitations boolean not null,
      limitations_json jsonb not null default '[]'::jsonb,
      warnings_json jsonb not null default '[]'::jsonb,
      blockers_json jsonb not null default '[]'::jsonb,
      diagnostics_json jsonb not null default '{}'::jsonb,
      semantic_watermark text null,
      payload_hash text null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_single_site_content_approvals (
      id uuid primary key,
      migration_id uuid not null,
      client_id uuid not null,
      site_id uuid not null,
      improved_version_review_id uuid not null,
      improved_version_review_status text not null,
      improved_candidate_site_version_ref text not null,
      improved_runtime_artifact_ref text not null,
      status text not null,
      decision text null,
      content_approval_ready boolean not null,
      approved_with_limitations boolean not null,
      aaf_content_approval_request_id text null,
      aaf_content_approval_decision_id text null,
      aaf_content_approval_scope text null,
      aaf_content_approval_action text null,
      aaf_content_approval_subject_type text null,
      evidence_package_refs_json jsonb not null default '[]'::jsonb,
      rendered_snapshot_refs_json jsonb not null default '[]'::jsonb,
      content_snapshot_refs_json jsonb not null default '[]'::jsonb,
      metadata_snapshot_refs_json jsonb not null default '[]'::jsonb,
      caveat_refs_json jsonb not null default '[]'::jsonb,
      limitations_json jsonb not null default '[]'::jsonb,
      unresolved_not_applied_recommendations_json jsonb not null default '[]'::jsonb,
      findings_summary_json jsonb not null default '{}'::jsonb,
      semantic_watermark text null,
      payload_hash text null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_single_site_client_approvals (
      id uuid primary key,
      migration_id uuid not null,
      client_id uuid not null,
      site_id uuid not null,
      content_approval_id uuid not null,
      content_approval_status text not null,
      aaf_content_approval_decision_id text not null,
      improved_version_review_id uuid not null,
      improved_version_review_status text not null,
      improved_candidate_site_version_ref text not null,
      improved_runtime_artifact_ref text not null,
      status text not null,
      decision text null,
      client_approval_ready boolean not null,
      approved_with_limitations boolean not null,
      aaf_client_approval_request_id text null,
      aaf_client_approval_decision_id text null,
      aaf_client_approval_scope text null,
      aaf_client_approval_action text null,
      aaf_client_approval_subject_type text null,
      evidence_package_refs_json jsonb not null default '[]'::jsonb,
      rendered_snapshot_refs_json jsonb not null default '[]'::jsonb,
      client_facing_summary_refs_json jsonb not null default '[]'::jsonb,
      limitations_json jsonb not null default '[]'::jsonb,
      deferred_or_not_applied_recommendation_refs_json jsonb not null default '[]'::jsonb,
      findings_summary_json jsonb not null default '{}'::jsonb,
      semantic_watermark text null,
      payload_hash text null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_single_site_launch_approvals (
      id uuid primary key,
      migration_id uuid not null,
      client_id uuid not null,
      site_id uuid not null,
      content_approval_id uuid not null,
      content_approval_status text not null,
      aaf_content_approval_decision_id text not null,
      require_client_approval boolean not null,
      client_approval_id uuid null,
      client_approval_status text null,
      aaf_client_approval_decision_id text null,
      improved_version_review_id uuid not null,
      improved_version_review_status text not null,
      improved_candidate_site_version_ref text not null,
      improved_runtime_artifact_ref text not null,
      domain_readiness_ref text null,
      billing_hosting_entitlement_ref text null,
      rollback_readiness_ref text null,
      publish_target_ref text null,
      status text not null,
      decision text null,
      readiness_work_ready boolean not null,
      approved_with_limitations boolean not null,
      aaf_launch_approval_request_id text null,
      aaf_launch_approval_decision_id text null,
      aaf_launch_approval_scope text null,
      aaf_launch_approval_action text null,
      aaf_launch_approval_subject_type text null,
      evidence_package_refs_json jsonb not null default '[]'::jsonb,
      launch_checklist_refs_json jsonb not null default '[]'::jsonb,
      blocker_refs_json jsonb not null default '[]'::jsonb,
      smoke_qa_refs_json jsonb not null default '[]'::jsonb,
      limitations_json jsonb not null default '[]'::jsonb,
      findings_summary_json jsonb not null default '{}'::jsonb,
      decision_summary_json jsonb not null default '{}'::jsonb,
      semantic_watermark text null,
      payload_hash text null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_runtime_site_versions (
      id uuid primary key,
      site_id uuid not null,
      version_no integer not null,
      state text not null,
      source text not null,
      actor text not null,
      renderer_compatibility_version text not null,
      import_provenance_summary jsonb,
      artifact_id uuid,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_runtime_artifacts (
      id uuid primary key,
      site_id uuid not null,
      site_version_id uuid not null,
      renderer_compatibility_version text not null,
      bundle_sha256 text not null,
      html_by_path jsonb not null,
      asset_fingerprint_map jsonb not null,
      manifest jsonb not null,
      publish_stage text not null,
      shadow_restricted boolean not null,
      artifact_governance jsonb not null,
      created_at timestamptz not null
    );
    create table public.gnr8_publish_targets (
      id text primary key,
      environment text not null,
      target_kind text not null,
      publish_stage text not null,
      status text not null,
      policy_version text not null,
      requires_aaf boolean not null,
      requires_ddom_snapshot boolean not null,
      requires_launch_signoff boolean not null,
      allowed_artifact_stages jsonb not null,
      limitations_json jsonb not null,
      source_watermark text null,
      created_at timestamptz not null,
      updated_at timestamptz not null
    );
    create table public.gnr8_ddom_readiness_snapshots (
      id uuid primary key,
      tenant_id text not null,
      client_id text null,
      site_id text not null,
      site_version_id uuid null,
      domain_binding_id uuid null,
      host_binding_id uuid null,
      domain text null,
      internal_host text null,
      intended_launch_domain text null,
      readiness_state text not null,
      readiness_blockers jsonb not null,
      readiness_warnings jsonb not null,
      freshness_state text not null,
      fresh_until timestamptz null,
      stale_reason text null,
      captured_at timestamptz not null,
      source_watermark text not null,
      source_watermark_json jsonb not null,
      snapshot_json jsonb not null,
      created_at timestamptz not null
    );
    create table public.gnr8_ddom_readiness_snapshot_refs (
      id uuid primary key,
      snapshot_id uuid not null,
      ref_role text not null,
      ref_type text not null,
      source_system text not null,
      source_table text null,
      source_record_id text not null,
      source_version text null,
      source_watermark text null,
      captured_at timestamptz null,
      metadata_json jsonb not null,
      created_at timestamptz not null
    );
  `);
}

async function seedSources(pool: Pool): Promise<{
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  versionId: string;
  artifactId: string;
  launchDecisionId: string;
}> {
  const tenantId = "tenant-mvp38";
  const clientId = randomUUID();
  const siteId = randomUUID();
  const migrationId = randomUUID();
  const versionId = randomUUID();
  const artifactId = randomUUID();
  const reviewId = randomUUID();
  const contentId = randomUUID();
  const clientApprovalId = randomUUID();
  const launchId = randomUUID();
  const ddomId = randomUUID();
  const launchDecisionId = "launch-aaf-decision-integration";

  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions values
      ($1::uuid, $2::uuid, 7, 'APPROVED', 'migration', 'system', 'runtime-v1', '{}'::jsonb, $3::uuid, $4, $5)
    `,
    [versionId, siteId, artifactId, "2026-08-04T08:00:00.000Z", "2026-08-04T08:10:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts values
      ($1::uuid, $2::uuid, $3::uuid, 'runtime-v1', 'bundle-integration', '{"/":"<html></html>"}'::jsonb,
       '{"main.css":"sha"}'::jsonb, '{"routes":["/"]}'::jsonb, 'production', false, '{"immutable":true}'::jsonb, $4)
    `,
    [artifactId, siteId, versionId, "2026-08-04T08:11:00.000Z"],
  );
  await pool.query(`insert into public.gnr8_runtime_active_pointers values ($1::uuid, $2::uuid, $3::uuid, $4)`, [
    siteId,
    randomUUID(),
    randomUUID(),
    "2026-08-04T08:12:00.000Z",
  ]);
  await pool.query(
    `
    insert into public.gnr8_single_site_improved_version_reviews values
      ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'accepted', 'accept', true, false,
       '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 'wm-review', 'hash-review', $7, $8)
    `,
    [reviewId, migrationId, clientId, siteId, versionId, artifactId, "2026-08-04T08:15:00.000Z", "2026-08-04T08:20:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_content_approvals values
      ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'accepted', $6, $7, 'approved', 'approve', true, false,
       'content-aaf-request', 'content-aaf-decision', 'single_site_content_approval', 'approve_single_site_content',
       'single_site_improved_version_review', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
       '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 'wm-content', 'hash-content', $8, $9)
    `,
    [contentId, migrationId, clientId, siteId, reviewId, versionId, artifactId, "2026-08-04T08:21:00.000Z", "2026-08-04T08:25:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_client_approvals values
      ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'approved', 'content-aaf-decision', $6::uuid, 'accepted',
       $7, $8, 'approved', 'approve', true, false, 'client-aaf-request', 'client-aaf-decision',
       'single_site_client_approval', 'approve_single_site_client_acceptance', 'single_site_improved_candidate_client_acceptance',
       '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 'wm-client', 'hash-client', $9, $10)
    `,
    [clientApprovalId, migrationId, clientId, siteId, contentId, reviewId, versionId, artifactId, "2026-08-04T08:26:00.000Z", "2026-08-04T08:30:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_launch_approvals values
      ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'approved', 'content-aaf-decision', true,
       $6::uuid, 'approved', 'client-aaf-decision', $7::uuid, 'accepted', $8, $9, null, null, null, 'production',
       'approved', 'approve', true, false, 'launch-aaf-request', $10, 'single_site_launch_approval',
       'approve_single_site_launch_readiness', 'single_site_launch_readiness_review', '[]'::jsonb, '[]'::jsonb,
       '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, 'wm-launch', 'hash-launch', $11, $12)
    `,
    [
      launchId,
      migrationId,
      clientId,
      siteId,
      contentId,
      clientApprovalId,
      reviewId,
      versionId,
      artifactId,
      launchDecisionId,
      "2026-08-04T08:31:00.000Z",
      "2026-08-04T08:35:00.000Z",
    ],
  );
  await pool.query(
    `
    insert into public.gnr8_publish_targets values
      ('production', 'production', 'public_runtime', 'production', 'active', 'ptt-1', true, true, true,
       '["production"]'::jsonb, '{}'::jsonb, 'ptt-1:gnr8_publish_targets:production', $1, $2)
    `,
    ["2026-08-04T08:36:00.000Z", "2026-08-04T08:37:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_ddom_readiness_snapshots values
      ($1::uuid, $2, $3, $4, $5::uuid, null, null, 'example.test', null, 'example.test',
       'ready', '[]'::jsonb, '[]'::jsonb, 'fresh', $6, null, $7, 'ddom-wm-integration', '{}'::jsonb, '{}'::jsonb, $8)
    `,
    [
      ddomId,
      tenantId,
      clientId,
      siteId,
      versionId,
      "2026-08-04T10:30:00.000Z",
      "2026-08-04T08:38:00.000Z",
      "2026-08-04T08:38:01.000Z",
    ],
  );
  await pool.query(
    `
    insert into public.gnr8_ddom_readiness_snapshot_refs values
      ($1::uuid, $2::uuid, 'manual_completion_evidence', 'dns_operator_evidence', 'gnr8', 'stored_dns_evidence', 'dns-operator-evidence', 'v1', 'wm-dns', $3, '{}'::jsonb, $4),
      ($5::uuid, $2::uuid, 'vercel_snapshot', 'vercel_custom_domain_ssl', 'gnr8', 'stored_vercel_state', 'vercel-state', 'v1', 'wm-vercel', $3, '{}'::jsonb, $4)
    `,
    [randomUUID(), ddomId, "2026-08-04T08:39:00.000Z", "2026-08-04T08:39:01.000Z", randomUUID()],
  );
  await pool.query(
    `
    insert into public.gnr8_single_site_migration_refs (
      migration_id, ref_role, ref_type, source_table, source_record_id, source_version, source_watermark, captured_at, fresh_until
    )
    values
      ($1::uuid, 'pasr_shadow_result', 'pasr_shadow_result', 'gnr8_aaf_publish_shadow_results', 'pasr-result', 'v1', 'wm-pasr', $2, $3),
      ($1::uuid, 'aaf_audit_event', 'aaf_audit_event', 'gnr8_aaf_audit_events', 'audit-event', 'v1', 'wm-audit', $2, $3)
    `,
    [migrationId, "2026-08-04T08:40:00.000Z", "2026-08-04T10:40:00.000Z"],
  );

  return { tenantId, clientId, siteId, migrationId, versionId, artifactId, launchDecisionId };
}

const COUNT_TABLES = [
  "gnr8_single_site_launch_readiness_records",
  "gnr8_single_site_launch_readiness_dimensions",
  "gnr8_single_site_launch_readiness_refs",
  "gnr8_single_site_launch_readiness_blockers",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_closeouts",
  "gnr8_aaf_evidence_packages",
  "gnr8_aaf_approval_requests",
  "gnr8_aaf_approval_decisions",
  "gnr8_aaf_gate_attempts",
  "gnr8_ddom_readiness_snapshots",
  "gnr8_ddom_readiness_snapshot_refs",
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_active_pointers",
  "gnr8_runtime_publish_events",
  "gnr8_runtime_rollback_events",
] as const;

async function tableCounts(pool: Pool): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const client = await pool.connect();
  try {
    for (const table of COUNT_TABLES) {
      const result = await withTimeout(client.query(`select count(*)::int as count from public.${table}`), `count ${table}`);
      counts[table] = Number(result.rows[0]?.count ?? 0);
    }
  } finally {
    client.release();
  }
  return counts;
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 10_000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

test("launch readiness source reader uses read-only repeatable-read transaction and mutates no source rows", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString });
  try {
    await createFixtureTables(pool);
    const seeded = await seedSources(pool);
    const before = await tableCounts(pool);
    const tracked = trackingPool(pool);
    const repository = new LaunchReadinessSourceReadRepository(tracked);
    const reader = new SingleSiteLaunchReadinessSourceReader(repository);

    const txState = await repository.withReadOnlyTransaction(async (client) => {
      const result = await client.query(`
        select
          current_setting('transaction_isolation') as isolation,
          current_setting('transaction_read_only') as read_only
      `);
      return result.rows[0] as { isolation: string; read_only: string };
    });
    assert.equal(txState.isolation, "repeatable read");
    assert.equal(txState.read_only, "on");

    tracked.sqlLog.length = 0;
    const result = await reader.readSingleSiteLaunchReadinessSources({
      tenantId: seeded.tenantId,
      clientId: seeded.clientId,
      siteId: seeded.siteId,
      migrationId: seeded.migrationId,
      improvedCandidateSiteVersionRef: seeded.versionId,
      improvedRuntimeArtifactRef: seeded.artifactId,
      launchApprovalDecisionRef: seeded.launchDecisionId,
      actor: { actorType: "system", actorId: "integration-test", actorRole: "test" },
      correlationId: `corr-${seeded.migrationId}`,
      idempotencyKey: `idem-${seeded.migrationId}`,
      policy: {
        clientApprovalRequired: true,
        billingSubscriptionRequired: true,
        hostingEntitlementRequired: true,
        rollbackReadinessRequired: true,
        previewSmokeQaRequired: true,
      },
    });

    const after = await tableCounts(pool);
    assert.equal(tracked.sqlLog[0], "begin isolation level repeatable read read only");
    assert.ok(tracked.sqlLog.some((sql) => sql === "commit"));
    assert.deepEqual(after, before);
    assert.equal(result.transactionTimestamp.length > 0, true);
    assert.equal(result.dimensions.launch_approval.status, "ready");
    assert.equal(result.dimensions.content_approval.status, "ready");
    assert.equal(result.dimensions.client_approval.status, "ready");
    assert.equal(result.dimensions.improved_candidate.status, "ready");
    assert.equal(result.dimensions.publish_target.status, "ready");
    assert.equal(result.dimensions.domain_readiness.status, "ready");
    assert.equal(result.dimensions.billing_subscription.status, "missing");
    assert.equal(result.dimensions.hosting_entitlement.status, "missing");
    assert.equal(result.dimensions.rollback_readiness.status, "missing");
    assert.equal(result.dimensions.preview_smoke_qa.status, "missing");
    assert.ok(result.unsupportedSourceTruth.includes("site_scoped_billing_subscription_truth_absent"));
    assert.ok(result.unsupportedSourceTruth.includes("site_scoped_hosting_entitlement_truth_absent"));
    assert.equal(after.gnr8_single_site_launch_readiness_records, 0);
    assert.equal(after.gnr8_single_site_launch_readiness_dimensions, 0);
    assert.equal(after.gnr8_aaf_evidence_packages, 0);
    assert.equal(after.gnr8_aaf_approval_requests, 0);
    assert.equal(after.gnr8_aaf_approval_decisions, 0);
    assert.equal(after.gnr8_aaf_gate_attempts, 0);
    assert.equal(after.gnr8_ddom_readiness_snapshots, 1);
    assert.equal(after.gnr8_runtime_active_pointers, 1);
    assert.equal(after.gnr8_runtime_publish_events, 0);
    assert.equal(after.gnr8_runtime_rollback_events, 0);
    assert.ok(!tracked.sqlLog.some((sql) => /insert\s+into|update\s+public\.|delete\s+from|truncate\s+/i.test(sql)));
  } finally {
    await pool.end().catch(() => undefined);
    docker(["stop", disposable.containerName]);
  }
});
