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
  type DdomSnapshotWriterClient,
  type DdomSnapshotWriterPool,
} from "./ddom-readiness-snapshot-writer";
import { DdomReadinessManualSnapshotCaller } from "./ddom-readiness-manual-snapshot-caller";
import {
  DdomReadinessStoredStateRepository,
  type DdomReadinessStoredStateClient,
  type DdomReadinessStoredStatePool,
} from "./ddom-readiness-stored-state-repository";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
);

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

const IDS = {
  ownershipSiteId: "00000000-0000-4000-8000-000000000001",
  siteVersionId: "11111111-1111-4111-8111-111111111111",
  domainBindingId: "22222222-2222-4222-8222-222222222222",
  blockedDomainBindingId: "22222222-2222-4222-8222-222222222223",
  staleDomainBindingId: "22222222-2222-4222-8222-222222222224",
  exceptedDomainBindingId: "22222222-2222-4222-8222-222222222225",
  approvalRequestId: "44444444-4444-4444-8444-444444444444",
  approvalDecisionId: "55555555-5555-4555-8555-555555555555",
  evidencePackageId: "66666666-6666-4666-8666-666666666666",
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
  const containerName = `gnr8-ddom-manual-caller-${process.pid}-${suffix}`;
  const database = `gnr8_ddom_manual_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_ddom_manual_${suffix.replace(/-/g, "")}`;
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

function loggingPool(pool: Pool, queries: string[]): DdomSnapshotWriterPool & DdomReadinessStoredStatePool {
  return {
    async connect() {
      const client = await pool.connect();
      const wrapped: DdomSnapshotWriterClient & DdomReadinessStoredStateClient = {
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

async function createFixtureTables(pool: Pool): Promise<void> {
  await pool.query(`create extension if not exists pgcrypto`);
  await pool.query(`
    create table public.gnr8_runtime_sites (
      id text primary key,
      source_url text,
      source_host text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.sites (
      id uuid primary key,
      org_id uuid,
      agency_id uuid,
      status text,
      domain text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_site_versions (
      id uuid primary key,
      site_id text not null references public.gnr8_runtime_sites(id),
      version_no integer,
      state text,
      source text,
      actor text,
      renderer_compatibility_version text,
      artifact_id uuid,
      ownership_site_id uuid references public.sites(id),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_host_bindings (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id),
      host text not null,
      status text not null,
      binding_kind text not null,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_runtime_domain_host_bindings (
      id uuid primary key default gen_random_uuid(),
      site_id text not null references public.gnr8_runtime_sites(id),
      site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
      domain text not null,
      status text not null,
      domain_type text,
      verification_type text,
      verification_value text,
      verification_host text,
      dns_record_type text,
      dns_record_host text,
      dns_record_value text,
      dns_record_purpose text,
      dns_instructions_json jsonb,
      last_checked_at timestamptz,
      vercel_domain_id text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_approval_requests (
      id uuid primary key,
      tenant_id text not null,
      client_id text,
      site_id text,
      site_version_id text,
      domain_id text,
      scope text not null,
      subject_type text not null,
      subject_id text not null,
      status text not null,
      policy_version text not null,
      requested_expires_at timestamptz,
      created_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_approval_decisions (
      id uuid primary key,
      approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
      status text not null,
      decided_at timestamptz default now(),
      policy_version text not null,
      evidence_package_id uuid,
      expires_at timestamptz,
      created_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_approval_revocations (
      id uuid primary key default gen_random_uuid(),
      approval_decision_id uuid not null references public.gnr8_aaf_approval_decisions(id)
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_approval_supersession_links (
      id uuid primary key default gen_random_uuid(),
      superseded_approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
      superseded_decision_id uuid
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_evidence_packages (
      id uuid primary key,
      package_type text not null,
      subject_type text not null,
      subject_id text not null,
      status text not null,
      source_watermark text not null,
      freshness_label text not null,
      expires_at timestamptz,
      content_hash text not null,
      limitations_json jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    )
  `);
  await pool.query(`
    create table public.gnr8_aaf_audit_events (
      id uuid primary key default gen_random_uuid(),
      event_name text not null,
      event_family text not null,
      subject_type text not null,
      subject_id text not null,
      created_at timestamptz default now()
    )
  `);
}

async function applyDdomMigration(disposable: DisposablePostgres): Promise<void> {
  const url = new URL(disposable.connectionString);
  docker([
    "exec",
    "-e",
    `PGPASSWORD=${decodeURIComponent(url.password)}`,
    disposable.containerName,
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-h",
    "127.0.0.1",
    "-U",
    decodeURIComponent(url.username),
    "-d",
    decodeURIComponent(url.pathname.slice(1)),
    "-f",
    "/tmp/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
  ]);
}

async function seedFixtures(pool: Pool): Promise<void> {
  await pool.query(
    `
    insert into public.gnr8_runtime_sites (id, source_url, source_host, created_at, updated_at)
    values ('site-ddom-5-int', 'https://source.example.com', 'source.example.com', '2026-07-27T08:00:00Z', '2026-07-27T09:00:00Z')
    `,
  );
  await pool.query(
    `
    insert into public.sites (id, org_id, agency_id, status, domain, created_at, updated_at)
    values ($1::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'draft', 'launch.example.com', '2026-07-27T08:00:00Z', '2026-07-27T09:00:00Z')
    `,
    [IDS.ownershipSiteId],
  );
  await pool.query(
    `
    insert into public.gnr8_runtime_site_versions (
      id, site_id, version_no, state, source, actor, renderer_compatibility_version, ownership_site_id, created_at, updated_at
    )
    values ($1::uuid, 'site-ddom-5-int', 7, 'published', 'import', 'operator', '1', $2::uuid, '2026-07-27T08:00:00Z', '2026-07-27T09:00:00Z')
    `,
    [IDS.siteVersionId, IDS.ownershipSiteId],
  );
  const domainRows = [
    [IDS.domainBindingId, "launch.example.com", "active", "2026-07-27T10:00:00Z", "vercel-domain-ready"],
    [IDS.blockedDomainBindingId, "blocked.example.com", "failed", "2026-07-27T10:00:00Z", "vercel-domain-blocked"],
    [IDS.staleDomainBindingId, "stale.example.com", "active", "2026-07-25T10:00:00Z", "vercel-domain-stale"],
    [IDS.exceptedDomainBindingId, "excepted.example.com", "failed", "2026-07-25T10:00:00Z", "vercel-domain-excepted"],
  ];
  for (const row of domainRows) {
    await pool.query(
      `
      insert into public.gnr8_runtime_domain_host_bindings (
        id,
        site_id,
        site_version_id,
        domain,
        status,
        domain_type,
        verification_type,
        verification_value,
        verification_host,
        dns_record_type,
        dns_record_host,
        dns_record_value,
        dns_record_purpose,
        dns_instructions_json,
        last_checked_at,
        vercel_domain_id,
        created_at,
        updated_at
      )
      values (
        $1::uuid,
        'site-ddom-5-int',
        $2::uuid,
        $3::text,
        $4::text,
        'subdomain',
        'cname',
        'verify-value',
        '_vercel',
        'cname',
        'www',
        'cname.vercel-dns.com',
        'routing',
        '[{"type":"cname","host":"www","value":"cname.vercel-dns.com"}]'::jsonb,
        $5::timestamptz,
        $6::text,
        '2026-07-27T08:00:00Z',
        $5::timestamptz
      )
      `,
      [row[0], IDS.siteVersionId, row[1], row[2], row[3], row[4]],
    );
  }
  await pool.query(
    `
    insert into public.gnr8_aaf_evidence_packages (
      id, package_type, subject_type, subject_id, status, source_watermark, freshness_label, expires_at, content_hash, limitations_json, created_at
    )
    values (
      $1::uuid, 'domain_exception_evidence', 'domain_binding', $2::text, 'verified', 'exception-evidence-watermark', 'fresh', '2026-07-29T10:00:00Z', 'content-hash-ddom-5', '{}'::jsonb, '2026-07-27T09:00:00Z'
    )
    `,
    [IDS.evidencePackageId, IDS.exceptedDomainBindingId],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_requests (
      id, tenant_id, client_id, site_id, site_version_id, domain_id, scope, subject_type, subject_id, status, policy_version, requested_expires_at, created_at
    )
    values (
      $1::uuid, 'tenant-ddom-5-int', 'client-ddom-5-int', 'site-ddom-5-int', $2::text, $3::text, 'domain_exception', 'domain_binding', $3::text, 'granted', 'domain-exception-v1', '2026-07-29T10:00:00Z', '2026-07-27T09:00:00Z'
    )
    `,
    [IDS.approvalRequestId, IDS.siteVersionId, IDS.exceptedDomainBindingId],
  );
  await pool.query(
    `
    insert into public.gnr8_aaf_approval_decisions (
      id, approval_request_id, status, decided_at, policy_version, evidence_package_id, expires_at, created_at
    )
    values (
      $1::uuid, $2::uuid, 'granted', '2026-07-27T09:30:00Z', 'domain-exception-v1', $3::uuid, '2026-07-29T10:00:00Z', '2026-07-27T09:30:00Z'
    )
    `,
    [IDS.approvalDecisionId, IDS.approvalRequestId, IDS.evidencePackageId],
  );
}

function callerInput(overrides: Record<string, unknown> = {}) {
  return {
    actorType: "human" as const,
    actorId: "operator-ddom-5-int",
    tenantId: "tenant-ddom-5-int",
    clientId: "client-ddom-5-int",
    agencyId: "agency-ddom-5-int",
    ownershipSiteId: IDS.ownershipSiteId,
    siteId: "site-ddom-5-int",
    siteVersionId: IDS.siteVersionId,
    domainBindingId: IDS.domainBindingId,
    intendedDomain: "launch.example.com",
    environment: "production",
    stage: "production",
    requestScope: "custom_domain" as const,
    reason: "manual integration capture",
    correlationId: "corr-ddom-5-int",
    idempotencyKey: "idem-ddom-5-int-ready",
    readinessTtlHours: 24,
    ...overrides,
  };
}

async function assertDbRejects(fn: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await assert.rejects(fn, (error) => error instanceof Error && expected.test(error.message));
}

test("DDOM manual snapshot caller writes stored-state snapshots through DDOM writer in disposable Postgres", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const queries: string[] = [];
  const sourceFiles = [
    path.resolve(process.cwd(), "apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts"),
    path.resolve(process.cwd(), "apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts"),
    path.resolve(process.cwd(), "apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts"),
  ];

  try {
    await createFixtureTables(pool);
    await applyDdomMigration(disposable);
    await seedFixtures(pool);

    const loggedPool = loggingPool(pool, queries);
    const caller = new DdomReadinessManualSnapshotCaller(
      new DdomReadinessStoredStateRepository(loggedPool),
      new DdomReadinessSnapshotWriter(new DdomReadinessSnapshotRepository(loggedPool)),
    );

    const ready = await caller.createManualReadinessSnapshot(callerInput());
    assert.equal(ready.readinessStatus, "ready_with_warnings");
    assert.equal(ready.freshnessStatus, "fresh");
    assert.equal(ready.reusedExisting, false);
    assert.equal(ready.noPublishNoProviderConfirmation, true);
    assert.ok(ready.sourceRefsCount >= 4);

    const snapshotRows = await pool.query<{
      id: string;
      readiness_state: string;
      freshness_state: string;
      source_watermark: string;
      snapshot_json: { pasrImplication?: { pasrStatus?: string }; boundaryConfirmations?: { manualSnapshotIsNotPublishActivation?: boolean } };
    }>(
      `
      select id::text, readiness_state, freshness_state, source_watermark, snapshot_json
      from public.gnr8_ddom_readiness_snapshots
      where id = $1::uuid
      `,
      [ready.snapshotId],
    );
    assert.equal(snapshotRows.rowCount, 1);
    assert.equal(snapshotRows.rows[0]?.readiness_state, "ready_with_warnings");
    assert.equal(snapshotRows.rows[0]?.freshness_state, "fresh");
    assert.match(snapshotRows.rows[0]?.source_watermark ?? "", /^sha256:/);
    assert.equal(snapshotRows.rows[0]?.snapshot_json.pasrImplication?.pasrStatus, "ready");
    assert.equal(snapshotRows.rows[0]?.snapshot_json.boundaryConfirmations?.manualSnapshotIsNotPublishActivation, true);

    const refRows = await pool.query<{ ref_role: string; source_table: string | null }>(
      `
      select ref_role, source_table
      from public.gnr8_ddom_readiness_snapshot_refs
      where snapshot_id = $1::uuid
      order by ref_role
      `,
      [ready.snapshotId],
    );
    assert.ok(refRows.rows.some((row) => row.ref_role === "domain_binding"));
    assert.ok(refRows.rows.some((row) => row.ref_role === "vercel_snapshot"));
    assert.ok(refRows.rows.some((row) => row.ref_role === "dns_instruction_snapshot"));
    assert.ok(refRows.rows.some((row) => row.ref_role === "freshness_watermark"));

    const retry = await caller.createManualReadinessSnapshot(callerInput());
    assert.equal(retry.snapshotId, ready.snapshotId);
    assert.equal(retry.reusedExisting, true);

    await pool.query(
      `
      update public.gnr8_runtime_domain_host_bindings
      set status = 'failed', updated_at = '2026-07-27T11:00:00Z'
      where id = $1::uuid
      `,
      [IDS.domainBindingId],
    );
    await assert.rejects(
      () => caller.createManualReadinessSnapshot(callerInput()),
      (error) =>
        error instanceof DdomReadinessSnapshotIdempotencyConflictError &&
        error.driftedFields.includes("snapshot_payload"),
    );

    const blocked = await caller.createManualReadinessSnapshot(
      callerInput({
        domainBindingId: IDS.blockedDomainBindingId,
        intendedDomain: "blocked.example.com",
        idempotencyKey: "idem-ddom-5-int-blocked",
      }),
    );
    assert.equal(blocked.readinessStatus, "blocked");
    assert.equal(blocked.freshnessStatus, "failed");

    const stale = await caller.createManualReadinessSnapshot(
      callerInput({
        domainBindingId: IDS.staleDomainBindingId,
        intendedDomain: "stale.example.com",
        idempotencyKey: "idem-ddom-5-int-stale",
      }),
    );
    assert.equal(stale.readinessStatus, "stale");
    assert.equal(stale.freshnessStatus, "stale");
    assert.ok(stale.pasrImplication.blockers.includes("domain_readiness_stale"));

    const excepted = await caller.createManualReadinessSnapshot(
      callerInput({
        domainBindingId: IDS.exceptedDomainBindingId,
        intendedDomain: "excepted.example.com",
        domainExceptionApprovalDecisionId: IDS.approvalDecisionId,
        domainExceptionEvidencePackageId: IDS.evidencePackageId,
        idempotencyKey: "idem-ddom-5-int-excepted",
      }),
    );
    assert.equal(excepted.readinessStatus, "manually_excepted");
    const exceptionRefs = await pool.query<{ ref_role: string; source_record_id: string }>(
      `
      select ref_role, source_record_id
      from public.gnr8_ddom_readiness_snapshot_refs
      where snapshot_id = $1::uuid
      order by ref_role
      `,
      [excepted.snapshotId],
    );
    assert.ok(exceptionRefs.rows.some((row) => row.ref_role === "domain_exception" && row.source_record_id === IDS.approvalDecisionId));

    await assertDbRejects(
      () => pool.query(`update public.gnr8_ddom_readiness_snapshots set stale_reason = 'changed' where id = $1::uuid`, [ready.snapshotId]),
      /append-only/i,
    );
    await assertDbRejects(
      () => pool.query(`delete from public.gnr8_ddom_readiness_snapshot_refs where snapshot_id = $1::uuid`, [ready.snapshotId]),
      /append-only/i,
    );

    const policies = await pool.query<{ count: string }>(
      `
      select count(*)::text
      from pg_policies
      where schemaname = 'public'
        and tablename in ('gnr8_ddom_readiness_snapshots', 'gnr8_ddom_readiness_snapshot_refs')
      `,
    );
    assert.equal(policies.rows[0]?.count, "0");

    const counts = await pool.query<{ snapshots: string; refs: string; domains: string; versions: string }>(
      `
      select
        (select count(*)::text from public.gnr8_ddom_readiness_snapshots) as snapshots,
        (select count(*)::text from public.gnr8_ddom_readiness_snapshot_refs) as refs,
        (select count(*)::text from public.gnr8_runtime_domain_host_bindings) as domains,
        (select count(*)::text from public.gnr8_runtime_site_versions) as versions
      `,
    );
    assert.equal(counts.rows[0]?.snapshots, "4");
    assert.ok(Number(counts.rows[0]?.refs ?? "0") >= 16);
    assert.equal(counts.rows[0]?.domains, "4");
    assert.equal(counts.rows[0]?.versions, "1");

    assert.ok(queries.some((sql) => /begin isolation level repeatable read read only/i.test(sql)));
    assert.ok(queries.some((sql) => /insert into public\.gnr8_ddom_readiness_snapshots/i.test(sql)));
    assert.ok(queries.some((sql) => /insert into public\.gnr8_ddom_readiness_snapshot_refs/i.test(sql)));
    const nonDdomMutation = queries.filter((sql) => /\b(update|delete|merge|truncate)\b/i.test(sql));
    assert.deepEqual(nonDdomMutation, []);
    const nonDdomInsert = queries.filter((sql) => /\binsert\s+into\s+public\.(?!gnr8_ddom_readiness_snapshots|gnr8_ddom_readiness_snapshot_refs)/i.test(sql));
    assert.deepEqual(nonDdomInsert, []);

    for (const sourcePath of sourceFiles) {
      const source = fs.readFileSync(sourcePath, "utf8");
      assert.doesNotMatch(source, /from\s+["'][^"']*(vercel|openprovider|dns-provider|registrar|stripe|billing|ai\/|publish-|rollback|command-center|ops-inbox|public-runtime|worker|runtime-store)[^"']*["']/i);
      assert.doesNotMatch(source, /\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname|publishActivation)\b/i);
    }
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
