import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafActionGateValidatorFacade, AafPolicyEvaluatorFacade } from "./aaf-policy-gate-facade";
import { AafPublishActivationGateAdapter } from "./aaf-publish-activation-gate-adapter";
import { buildPublishActivationEvidencePackage } from "./aaf-publish-activation-evidence-builder";
import { AafPublishActivationShadowObserver } from "./aaf-publish-activation-shadow-observer";
import { AafPublishActivationSourceReadRepository } from "./aaf-publish-activation-source-read-repository";
import { AafPublishActivationSourceReader } from "./aaf-publish-activation-source-reader";
import { AafWriterRepository } from "./aaf-writer-repository";

const REPO_ROOT = process.cwd();
const AAF_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");
const DDOM_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql");
const PTT_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql");

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

type SeededRuntime = {
  tenantId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  activeSiteVersionId: string;
  activeArtifactId: string;
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
  const containerName = `gnr8-pasr-2-shadow-${process.pid}-${suffix}`;
  const database = `gnr8_pasr_2_shadow_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_pasr_2_shadow_${suffix.replace(/-/g, "")}`;
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
  await pool.query(`
    create table public.gnr8_content_overrides (
      id uuid primary key default gen_random_uuid(),
      site_id text not null,
      site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
      slot_key text not null,
      value_type text not null,
      value_json jsonb not null,
      status text not null default 'draft',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (site_version_id, slot_key, status)
    )
  `);
}

async function seedRuntime(pool: Pool, suffix: string, options: { withDdomSnapshot: boolean }): Promise<SeededRuntime> {
  const tenantId = `tenant-${suffix}`;
  const clientId = `client-${suffix}`;
  const siteId = `site-${suffix}`;
  const siteVersionId = randomUUID();
  const runtimeArtifactId = randomUUID();
  const activeSiteVersionId = randomUUID();
  const activeArtifactId = randomUUID();

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
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'active-bundle', '{"/":"<html>active</html>"}'::jsonb,
      'body{}', '{}'::jsonb, '{"paths":["/"]}'::jsonb, 'production', '{"publishStage":"production"}'::jsonb, $4)
    `,
    [activeArtifactId, siteId, activeSiteVersionId, "2026-07-27T08:06:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions (
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, import_provenance_summary, artifact_id, created_at, updated_at
    )
    values ($1::uuid, $2, 2, 'APPROVED', 'migration', 'system', 'runtime-v1', '{"source":"pasr-2"}'::jsonb, $3::uuid, $4, $5)
    `,
    [siteVersionId, siteId, runtimeArtifactId, "2026-07-27T09:00:00.000Z", "2026-07-27T09:10:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      id, site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, artifact_governance, created_at
    )
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'bundle-pasr-2', '{"/":"<html>candidate</html>"}'::jsonb,
      'body{}', '{"main.css":"sha"}'::jsonb, '{"paths":["/"]}'::jsonb, 'production',
      '{"publishStage":"production","siteGateState":["allowed"],"siteRolloutPolicyState":["allowed"],"siteEnforcementState":{"shadow":"allowed","canary":"allowed","production":"allowed"},"pageGateState":["allowed"],"pageRolloutPolicyState":["allowed"],"pageEnforcementState":{"shadow":["allowed"],"canary":["allowed"],"production":["allowed"]}}'::jsonb,
      $4)
    `,
    [runtimeArtifactId, siteId, siteVersionId, "2026-07-27T09:11:00.000Z"],
  );
  await pool.query(
    `insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id, updated_at) values ($1, $2::uuid, $3::uuid, $4)`,
    [siteId, activeSiteVersionId, activeArtifactId, "2026-07-27T09:15:00.000Z"],
  );

  if (options.withDdomSnapshot) {
    await pool.query(
      `
      insert into public.gnr8_ddom_readiness_snapshots (
        tenant_id, client_id, site_id, site_version_id, domain, intended_launch_domain, readiness_state,
        readiness_blockers, readiness_warnings, freshness_state, fresh_until, captured_at, source_watermark,
        source_watermark_json, snapshot_json, created_by_actor_type, created_by_actor_id, correlation_id, idempotency_key
      )
      values ($1, $2, $3, $4::uuid, 'example.test', 'example.test', 'ready',
        '[]'::jsonb, '[]'::jsonb, 'fresh', $5, $6, $7, '{"runtime":"wm"}'::jsonb, '{"ready":true}'::jsonb,
        'system', 'pasr-2-shadow-integration-test', $8, $9)
      `,
      [
        tenantId,
        clientId,
        siteId,
        siteVersionId,
        "2026-07-27T11:00:00.000Z",
        "2026-07-27T09:25:00.000Z",
        `ddom-watermark-${suffix}`,
        `corr-ddom-${suffix}`,
        `idem-ddom-${suffix}`,
      ],
    );
  }

  return { tenantId, clientId, siteId, siteVersionId, runtimeArtifactId, activeSiteVersionId, activeArtifactId };
}

async function createObserver(pool: Pool, policyVersion: string): Promise<AafPublishActivationShadowObserver> {
  const writer = new AafWriterRepository(pool);
  const policy = await writer.withTransaction((tx) =>
    writer.createApprovalPolicy(tx, {
      policyKey: `pasr-2-shadow-${policyVersion}`,
      version: policyVersion,
      status: "active",
      definitionJson: { shadowOnly: true },
      createdBy: "pasr-2-shadow-integration-test",
    }),
  );
  await writer.withTransaction((tx) =>
    writer.createApprovalScopeDefinition(tx, {
      scope: "publish_activation",
      policyKey: String(policy.policy_key),
      policyVersion,
      subjectType: "site_version",
      allowedAction: "publish.activation",
      prohibitedActions: ["rollback", "dns_mutation", "domain_action", "ai_execution"],
      requiredEvidenceType: "publish_activation_evidence",
      requesterRoles: ["agency_admin"],
      approverRoles: ["superadmin"],
      freshnessRule: { maxAgeMinutes: 120 },
    }),
  );

  const sourceReader = new AafPublishActivationSourceReader(new AafPublishActivationSourceReadRepository(pool));
  const evaluator = new AafPolicyEvaluatorFacade(writer);
  const facade = new AafActionGateValidatorFacade(writer, evaluator);
  return new AafPublishActivationShadowObserver({
    sourceReader,
    buildEvidencePackage: (input) => buildPublishActivationEvidencePackage({ ...input, writer }),
    gateAdapter: new AafPublishActivationGateAdapter(facade),
  });
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

test("PASR-2 shadow observer reads pre-existing DDOM snapshots and writes only AAF shadow records", async () => {
  const { disposable, pool } = await setupPool();
  try {
    const suffix = randomUUID().slice(0, 8);
    const policyVersion = `PASR-2-shadow-${suffix}`;
    const seeded = await seedRuntime(pool, suffix, { withDdomSnapshot: true });
    const observer = await createObserver(pool, policyVersion);
    const beforeDdom = await pool.query(`select count(*)::int as count from public.gnr8_ddom_readiness_snapshots`);
    const beforePointer = await pool.query(
      `select active_site_version_id::text, active_artifact_id::text from public.gnr8_runtime_active_pointers where site_id = $1`,
      [seeded.siteId],
    );

    const result = await observer.observe({
      tenantId: seeded.tenantId,
      clientId: seeded.clientId,
      siteId: seeded.siteId,
      siteVersionId: seeded.siteVersionId,
      runtimeArtifactId: seeded.runtimeArtifactId,
      intendedPublishTarget: "production",
      trustedPublishEnvironment: "production",
      intendedPublishStage: "production",
      intendedDomain: "example.test",
      actorType: "human",
      actorId: "operator-pasr-2-shadow",
      actorRole: "agency_admin",
      correlationId: `corr-shadow-${suffix}`,
      idempotencyKey: `idem-shadow-${suffix}`,
      policyVersion,
    });

    assert.equal(result.shadowOnly, true);
    assert.equal(result.enforcementApplied, false);
    assert.equal(result.publishActionBlocked, false);
    assert.equal(result.sourceReadStatus.status, "completed");
    assert.equal(result.ddomReadinessSnapshotStatus.status, "present");
    assert.equal(result.evidenceBuildStatus.status, "built");
    assert.ok(result.evidenceRefs.evidencePackageId);
    assert.equal(result.gateDryRunStatus.status, "evaluated");
    assert.equal(result.gateDryRunStatus.gateResult, "approval_required");
    assert.equal(result.readinessResult, "not_ready");

    const afterDdom = await pool.query(`select count(*)::int as count from public.gnr8_ddom_readiness_snapshots`);
    assert.equal(afterDdom.rows[0]?.count, beforeDdom.rows[0]?.count);
    const afterPointer = await pool.query(
      `select active_site_version_id::text, active_artifact_id::text from public.gnr8_runtime_active_pointers where site_id = $1`,
      [seeded.siteId],
    );
    assert.deepEqual(afterPointer.rows, beforePointer.rows);

    const evidenceRows = await pool.query(`select count(*)::int as count from public.gnr8_aaf_evidence_packages`);
    const gateRows = await pool.query(`select count(*)::int as count from public.gnr8_aaf_action_gate_attempts`);
    assert.equal(evidenceRows.rows[0]?.count, 1);
    assert.equal(gateRows.rows[0]?.count, 1);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});

test("PASR-2 shadow observer reports missing DDOM snapshot without creating one", async () => {
  const { disposable, pool } = await setupPool();
  try {
    const suffix = randomUUID().slice(0, 8);
    const policyVersion = `PASR-2-shadow-missing-${suffix}`;
    const seeded = await seedRuntime(pool, suffix, { withDdomSnapshot: false });
    const observer = await createObserver(pool, policyVersion);
    const beforeDdom = await pool.query(`select count(*)::int as count from public.gnr8_ddom_readiness_snapshots`);

    const result = await observer.observe({
      tenantId: seeded.tenantId,
      clientId: seeded.clientId,
      siteId: seeded.siteId,
      siteVersionId: seeded.siteVersionId,
      runtimeArtifactId: seeded.runtimeArtifactId,
      intendedPublishTarget: "production",
      trustedPublishEnvironment: "production",
      intendedPublishStage: "production",
      actorType: "human",
      actorId: "operator-pasr-2-shadow",
      actorRole: "agency_admin",
      correlationId: `corr-shadow-missing-${suffix}`,
      idempotencyKey: `idem-shadow-missing-${suffix}`,
      policyVersion,
    });

    assert.equal(result.publishActionBlocked, false);
    assert.equal(result.ddomReadinessSnapshotStatus.status, "missing");
    assert.ok(result.missingSourceTruth.includes("domainReadiness"));
    assert.ok(result.ddomReadinessSnapshotStatus.warnings.includes("run_manual_ddom_readiness_snapshot_trigger"));
    assert.equal(result.readinessResult, "not_ready");

    const afterDdom = await pool.query(`select count(*)::int as count from public.gnr8_ddom_readiness_snapshots`);
    assert.equal(afterDdom.rows[0]?.count, beforeDdom.rows[0]?.count);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
