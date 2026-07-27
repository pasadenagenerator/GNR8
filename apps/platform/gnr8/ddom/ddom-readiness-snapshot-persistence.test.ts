import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql",
);

const EXPECTED_TABLES = [
  "gnr8_ddom_readiness_snapshots",
  "gnr8_ddom_readiness_snapshot_refs",
] as const;

const READINESS_STATES = [
  "ready",
  "ready_with_warnings",
  "blocked",
  "not_applicable",
  "manually_excepted",
  "stale",
] as const;

const FRESHNESS_STATES = ["fresh", "stale", "failed", "partial_timeline"] as const;

const ACTOR_TYPES = ["human", "system", "provider", "external_reference", "ai_advisory"] as const;

const PRIVACY_LABELS = [
  "public_operational",
  "internal_operational",
  "client_confidential",
  "credential_sensitive",
  "billing_sensitive",
  "provider_sensitive",
  "legal_sensitive",
] as const;

const RETENTION_CLASSES = [
  "short_operational",
  "mvp_operational",
  "security",
  "compliance_long",
  "legal_hold",
] as const;

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

function assertSqlContainsAll(values: readonly string[], sql: string): void {
  for (const value of values) {
    assert.match(sql, new RegExp(`'${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
  }
}

test("DDOM migration creates exactly the intended DDOM tables", () => {
  const sql = readMigration();
  const createdTables = [...sql.matchAll(/create table if not exists public\.(gnr8_ddom_[a-z0-9_]+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(createdTables, EXPECTED_TABLES);
  assert.doesNotMatch(sql, /create table if not exists public\.(?!gnr8_ddom_)[a-z0-9_]+/i);
});

test("DDOM migration does not alter non-DDOM tables or include destructive SQL", () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /alter table public\.(?!gnr8_ddom_)[a-z0-9_]+/i);
  assert.doesNotMatch(sql, /\bdrop\s+table\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.(?!gnr8_ddom_)/i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
});

test("DDOM migration contains canonical state, actor, privacy, and retention checks", () => {
  const sql = readMigration();
  assert.match(sql, /constraint gnr8_ddom_readiness_snapshots_readiness_state_ck/i);
  assert.match(sql, /constraint gnr8_ddom_readiness_snapshots_freshness_state_ck/i);
  assert.match(sql, /constraint gnr8_ddom_readiness_snapshots_actor_type_ck/i);
  assert.match(sql, /constraint gnr8_ddom_readiness_snapshots_privacy_ck/i);
  assert.match(sql, /constraint gnr8_ddom_readiness_snapshots_retention_ck/i);
  assertSqlContainsAll(READINESS_STATES, sql);
  assertSqlContainsAll(FRESHNESS_STATES, sql);
  assertSqlContainsAll(ACTOR_TYPES, sql);
  assertSqlContainsAll(PRIVACY_LABELS, sql);
  assertSqlContainsAll(RETENTION_CLASSES, sql);
});

test("DDOM migration contains JSONB shape checks", () => {
  const sql = readMigration();
  assert.match(sql, /jsonb_typeof\(readiness_blockers\) = 'array'/i);
  assert.match(sql, /jsonb_typeof\(readiness_warnings\) = 'array'/i);
  assert.match(sql, /jsonb_typeof\(source_watermark_json\) = 'object'/i);
  assert.match(sql, /jsonb_typeof\(snapshot_json\) = 'object'/i);
  assert.match(sql, /jsonb_typeof\(metadata_json\) = 'object'/i);
});

test("DDOM migration enables RLS without broad policies or grants", () => {
  const sql = readMigration();
  for (const tableName of EXPECTED_TABLES) {
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  assert.doesNotMatch(sql, /\bcreate\s+policy\b/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
});

test("DDOM migration models snapshots and refs as append-only", () => {
  const sql = readMigration();
  assert.match(sql, /create or replace function public\.gnr8_ddom_prevent_update_delete\(\)/i);
  for (const tableName of EXPECTED_TABLES) {
    assert.match(sql, new RegExp(`before update or delete on public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`trg_${tableName}_append_only`, "i"));
  }
});

test("DDOM migration contains required uniqueness and lookup indexes", () => {
  const sql = readMigration();
  for (const indexName of [
    "idx_gnr8_ddom_readiness_snapshots_site_captured",
    "idx_gnr8_ddom_readiness_snapshots_site_version_captured",
    "idx_gnr8_ddom_readiness_snapshots_domain_binding_captured",
    "idx_gnr8_ddom_readiness_snapshots_readiness_freshness",
    "idx_gnr8_ddom_readiness_snapshots_fresh_until",
    "idx_gnr8_ddom_readiness_snapshots_semantic_watermark",
    "idx_gnr8_ddom_readiness_snapshot_refs_lookup",
    "idx_gnr8_ddom_readiness_snapshot_refs_snapshot_role",
  ]) {
    assert.match(sql, new RegExp(`create (?:unique )?index if not exists ${indexName}\\b`, "i"));
  }
  assert.match(sql, /idempotency_key text not null unique/i);
  assert.match(sql, /unique \(snapshot_id, ref_role, ref_type, source_record_id\)/i);
  assert.match(sql, /coalesce\(site_version_id::text, ''\)/i);
  assert.match(sql, /coalesce\(domain_binding_id::text, ''\)/i);
});
