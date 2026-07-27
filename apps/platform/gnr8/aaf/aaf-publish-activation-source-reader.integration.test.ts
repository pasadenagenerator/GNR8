import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { AafPublishActivationSourceReadRepository } from "./aaf-publish-activation-source-read-repository";
import { AafPublishActivationSourceReader } from "./aaf-publish-activation-source-reader";

const REPO_ROOT = process.cwd();
const AAF_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql");
const DDOM_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql");
const PTT_MIGRATION = path.join(REPO_ROOT, "apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql");

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
  const containerName = `gnr8-pasr-${process.pid}-${suffix}`;
  const database = `gnr8_pasr_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_pasr_local_${suffix.replace(/-/g, "")}`;
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

    for (const migration of [AAF_MIGRATION, DDOM_MIGRATION, PTT_MIGRATION]) {
      const target = `/tmp/${path.basename(migration)}`;
      docker(["cp", migration, `${containerName}:${target}`]);
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
  const sql = await fsRead(migrationPath);
  await pool.query(sql);
}

async function fsRead(filePath: string): Promise<string> {
  const fs = await import("node:fs/promises");
  return fs.readFile(filePath, "utf8");
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

async function seedSources(pool: Pool, suffix: string): Promise<{
  tenantId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string;
  runtimeArtifactId: string;
  launchRequestId: string;
  launchDecisionId: string;
  publishRequestId: string;
  publishDecisionId: string;
  ddomSnapshotId: string;
}> {
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
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, import_provenance_summary, created_at, updated_at
    )
    values ($1::uuid, $2, 1, 'APPROVED', 'migration', 'system', 'runtime-v1', '{"source":"integration"}'::jsonb, $3, $4)
    `,
    [activeSiteVersionId, siteId, "2026-07-27T08:00:00.000Z", "2026-07-27T08:05:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      id, site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, artifact_governance, created_at
    )
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'active-bundle', '{}'::jsonb, '', '{}'::jsonb, '{}'::jsonb, 'production', '{}'::jsonb, $4)
    `,
    [activeArtifactId, siteId, activeSiteVersionId, "2026-07-27T08:06:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions (
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, import_provenance_summary, artifact_id, created_at, updated_at
    )
    values ($1::uuid, $2, 2, 'APPROVED', 'migration', 'system', 'runtime-v1', '{"source":"integration"}'::jsonb, $3::uuid, $4, $5)
    `,
    [siteVersionId, siteId, runtimeArtifactId, "2026-07-27T09:00:00.000Z", "2026-07-27T09:10:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_artifacts (
      id, site_id, site_version_id, renderer_compatibility_version, bundle_sha256, html_by_path,
      compiled_token_styles, asset_fingerprint_map, manifest, publish_stage, artifact_governance, created_at
    )
    values ($1::uuid, $2, $3::uuid, 'runtime-v1', 'bundle-pasr-1', '{"/":"<html></html>"}'::jsonb,
      'body{}', '{"main.css":"sha"}'::jsonb, '{"routes":["/"]}'::jsonb, 'production', '{"immutable":true}'::jsonb, $4)
    `,
    [runtimeArtifactId, siteId, siteVersionId, "2026-07-27T09:11:00.000Z"],
  );
  await pool.query(
    `insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id, updated_at) values ($1, $2::uuid, $3::uuid, $4)`,
    [siteId, activeSiteVersionId, activeArtifactId, "2026-07-27T09:15:00.000Z"],
  );
  await pool.query(
    `
    insert into public.gnr8_content_overrides (site_id, site_version_id, slot_key, value_type, value_json, status, updated_at)
    values
      ($1, $2::uuid, 'hero.title', 'text', '{"value":"Published title"}'::jsonb, 'published', $3),
      ($1, $2::uuid, 'hero.body', 'text', '{"value":"Published body"}'::jsonb, 'published', $4)
    `,
    [siteId, siteVersionId, "2026-07-27T09:20:00.000Z", "2026-07-27T09:21:00.000Z"],
  );

  const ddomSnapshot = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_ddom_readiness_snapshots (
      tenant_id, client_id, site_id, site_version_id, domain, intended_launch_domain, readiness_state,
      readiness_blockers, readiness_warnings, freshness_state, fresh_until, captured_at, source_watermark,
      source_watermark_json, snapshot_json, created_by_actor_type, created_by_actor_id, correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4::uuid, 'example.test', 'example.test', 'ready',
      '[]'::jsonb, '[]'::jsonb, 'fresh', $5, $6, $7, '{"runtime":"wm"}'::jsonb, '{"ready":true}'::jsonb,
      'system', 'pasr-integration-test', $8, $9)
    returning id::text
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

  const launch = await seedApproval(pool, {
    tenantId,
    clientId,
    siteId,
    siteVersionId,
    scope: "launch_signoff",
    suffix: `${suffix}-launch`,
  });
  const publish = await seedApproval(pool, {
    tenantId,
    clientId,
    siteId,
    siteVersionId,
    scope: "publish_activation",
    suffix: `${suffix}-publish`,
  });

  return {
    tenantId,
    clientId,
    siteId,
    siteVersionId,
    runtimeArtifactId,
    launchRequestId: launch.requestId,
    launchDecisionId: launch.decisionId,
    publishRequestId: publish.requestId,
    publishDecisionId: publish.decisionId,
    ddomSnapshotId: ddomSnapshot.rows[0]!.id,
  };
}

async function seedApproval(
  pool: Pool,
  input: { tenantId: string; clientId: string; siteId: string; siteVersionId: string; scope: "launch_signoff" | "publish_activation"; suffix: string },
): Promise<{ requestId: string; decisionId: string }> {
  const request = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_requests (
      tenant_id, client_id, site_id, site_version_id, scope, subject_type, subject_id,
      requester_actor_type, requester_actor_id, requester_role, status, policy_version,
      correlation_id, idempotency_key
    )
    values ($1, $2, $3, $4, $5, 'site_version', $4, 'human', 'operator-test', 'agency_admin',
      'requested', 'PASR-1', $6, $7)
    returning id::text
    `,
    [input.tenantId, input.clientId, input.siteId, input.siteVersionId, input.scope, `corr-${input.suffix}`, `idem-request-${input.suffix}`],
  );
  const decision = await pool.query<{ id: string }>(
    `
    insert into public.gnr8_aaf_approval_decisions (
      approval_request_id, status, decision_actor_type, decision_actor_id, decision_actor_role,
      decided_at, policy_version, reason, expires_at, correlation_id, idempotency_key
    )
    values ($1::uuid, 'granted', 'human', 'approver-test', 'superadmin', $2, 'PASR-1', 'integration', $3, $4, $5)
    returning id::text
    `,
    [
      request.rows[0]!.id,
      "2026-07-27T09:35:00.000Z",
      "2026-07-28T09:35:00.000Z",
      `corr-decision-${input.suffix}`,
      `idem-decision-${input.suffix}`,
    ],
  );
  return { requestId: request.rows[0]!.id, decisionId: decision.rows[0]!.id };
}

function trackingPool(pool: Pool): TrackingPool {
  const sqlLog: string[] = [];
  return {
    sqlLog,
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, prop, receiver) {
          if (prop === "query") {
            return async (sql: string, values?: readonly unknown[]) => {
              sqlLog.push(sql);
              return (target as PoolClient).query(sql, values as never);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as PoolClient;
    },
  };
}

function assertNoMutationSql(sqlLog: readonly string[]): void {
  const sql = sqlLog.join("\n");
  assert.doesNotMatch(sql, /\b(insert|update|delete|merge|truncate|create\s+table|alter\s+table|drop\s+table|grant|create\s+policy)\b/i);
}

test("PASR source reader reads all source snapshots in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  try {
    await applyMigration(pool, AAF_MIGRATION);
    await createMinimalRuntimeFixtureTables(pool);
    await applyMigration(pool, DDOM_MIGRATION);
    await applyMigration(pool, PTT_MIGRATION);

    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedSources(pool, suffix);
    const tracked = trackingPool(pool);
    const reader = new AafPublishActivationSourceReader(new AafPublishActivationSourceReadRepository(tracked));

    const result = await reader.readPublishActivationSources({
      tenantId: seeded.tenantId,
      clientId: seeded.clientId,
      siteId: seeded.siteId,
      siteVersionId: seeded.siteVersionId,
      runtimeArtifactId: seeded.runtimeArtifactId,
      intendedPublishTarget: "production",
      trustedPublishEnvironment: "production",
      intendedPublishStage: "production",
      intendedDomain: "example.test",
      contentOverrideStateRequired: true,
      launchSignoffRequiredByPolicy: true,
      publishActivationApprovalRef: {
        approvalRequestId: seeded.publishRequestId,
        approvalDecisionId: seeded.publishDecisionId,
        scope: "publish_activation",
      },
    });

    assert.equal(result.siteVersion?.sourceTable, "gnr8_runtime_site_versions");
    assert.equal(result.runtimeArtifact?.sourceRecordId, seeded.runtimeArtifactId);
    assert.equal(result.activePointer?.sourceRecordId, seeded.siteId);
    assert.equal(result.publishTarget?.canonicalFields.policyVersion, "ptt-1");
    assert.equal(result.domainReadiness?.sourceRecordId, seeded.ddomSnapshotId);
    assert.equal(result.contentOverridePublishedState?.status, "published");
    assert.equal(result.launchSignoff?.approvalRequestId, seeded.launchRequestId);
    assert.equal(result.publishActivationApproval?.approvalDecisionId, seeded.publishDecisionId);
    assert.deepEqual(result.limitations, []);

    assert.match(tracked.sqlLog[0] ?? "", /begin isolation level repeatable read read only/i);
    assert.match(tracked.sqlLog.join("\n"), /transaction_timestamp\(\)/i);
    assert.match(tracked.sqlLog.at(-1) ?? "", /commit/i);
    assertNoMutationSql(tracked.sqlLog);

    const txState = await new AafPublishActivationSourceReadRepository(pool).withReadOnlyTransaction(async (client) => {
      const readOnly = await client.query("show transaction_read_only");
      const isolation = await client.query("show transaction_isolation");
      return {
        readOnly: readOnly.rows[0]?.transaction_read_only,
        isolation: isolation.rows[0]?.transaction_isolation,
      };
    });
    assert.equal(txState.readOnly, "on");
    assert.equal(txState.isolation, "repeatable read");
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});

test("PASR source reader surfaces disabled target and stale DDOM cases in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  try {
    await applyMigration(pool, AAF_MIGRATION);
    await createMinimalRuntimeFixtureTables(pool);
    await applyMigration(pool, DDOM_MIGRATION);
    await applyMigration(pool, PTT_MIGRATION);

    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedSources(pool, suffix);
    await pool.query(`insert into public.gnr8_publish_targets (id, environment, target_kind, publish_stage, status, policy_version, allowed_artifact_stages, correlation_id) values ('disabled-test', 'production', 'public_runtime', 'production', 'disabled', 'PASR-1', '["production"]'::jsonb, $1)`, [
      `corr-disabled-${suffix}`,
    ]);
    await pool.query(
      `
      insert into public.gnr8_ddom_readiness_snapshots (
        tenant_id, client_id, site_id, site_version_id, domain, intended_launch_domain, readiness_state,
        readiness_blockers, readiness_warnings, freshness_state, stale_reason, captured_at, source_watermark,
        source_watermark_json, snapshot_json, created_by_actor_type, created_by_actor_id, correlation_id, idempotency_key
      )
      values ($1, $2, $3, $4::uuid, 'stale.example.test', 'stale.example.test', 'stale',
        '["ttl_expired"]'::jsonb, '[]'::jsonb, 'stale', 'ttl_expired', $5, $6,
        '{"runtime":"stale"}'::jsonb, '{"ready":false}'::jsonb, 'system', 'pasr-integration-test', $7, $8)
      `,
      [
        seeded.tenantId,
        seeded.clientId,
        seeded.siteId,
        seeded.siteVersionId,
        "2026-07-27T09:45:00.000Z",
        `ddom-stale-${suffix}`,
        `corr-ddom-stale-${suffix}`,
        `idem-ddom-stale-${suffix}`,
      ],
    );

    const tracked = trackingPool(pool);
    const reader = new AafPublishActivationSourceReader(new AafPublishActivationSourceReadRepository(tracked));
    const result = await reader.readPublishActivationSources({
      tenantId: seeded.tenantId,
      clientId: seeded.clientId,
      siteId: seeded.siteId,
      siteVersionId: seeded.siteVersionId,
      runtimeArtifactId: seeded.runtimeArtifactId,
      intendedPublishTarget: "disabled-test",
      trustedPublishEnvironment: "production",
      intendedPublishStage: "production",
      intendedDomain: "stale.example.test",
      contentOverrideStateRequired: true,
      launchSignoffRequiredByPolicy: true,
      publishActivationApprovalRef: {
        approvalRequestId: seeded.publishRequestId,
        approvalDecisionId: seeded.publishDecisionId,
        scope: "publish_activation",
      },
    });

    assert.equal(result.publishTarget?.freshness, "failed");
    assert.ok(result.publishTarget?.limitations?.includes("disabled_publish_target"));
    assert.equal(result.domainReadiness?.readinessStatus, "blocked");
    assert.equal(result.domainReadiness?.freshness, "stale");
    assert.ok(result.domainReadiness?.blockers?.includes("domain_readiness_stale"));
    assertNoMutationSql(tracked.sqlLog);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
