import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql",
);

const EXPECTED_TABLES = [
  "gnr8_single_site_launch_readiness_records",
  "gnr8_single_site_launch_readiness_refs",
  "gnr8_single_site_launch_readiness_dimensions",
  "gnr8_single_site_launch_readiness_blockers",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_closeouts",
] as const;

const APPEND_ONLY_TABLES = [
  "gnr8_single_site_launch_readiness_refs",
  "gnr8_single_site_launch_readiness_events",
  "gnr8_single_site_launch_readiness_closeouts",
] as const;

const READINESS_STATUSES = [
  "draft",
  "collecting_evidence",
  "ready",
  "ready_with_limitations",
  "blocked",
  "stale",
  "superseded",
  "cancelled",
] as const;

const FRESHNESS_STATUSES = ["fresh", "stale", "missing", "unknown", "not_applicable"] as const;

const DIMENSIONS = [
  "launch_approval",
  "content_approval",
  "client_approval",
  "improved_candidate",
  "publish_target",
  "domain_readiness",
  "dns_operator_evidence",
  "vercel_custom_domain_ssl",
  "billing_subscription",
  "hosting_entitlement",
  "stripe_payment",
  "rollback_readiness",
  "preview_smoke_qa",
  "limitations",
  "audit_timeline",
  "pasr_shadow_diagnostics",
] as const;

const DIMENSION_STATUSES = ["ready", "ready_with_limitations", "blocked", "stale", "missing", "not_applicable", "unknown"] as const;

const REF_ROLES = [
  "launch_approval_decision",
  "content_approval_decision",
  "client_approval_decision",
  "improved_candidate_site_version",
  "improved_runtime_artifact",
  "publish_target",
  "ddom_readiness_snapshot",
  "domain_operator_evidence",
  "dns_instruction",
  "vercel_domain_state",
  "ssl_state",
  "billing_subscription",
  "hosting_entitlement",
  "stripe_customer",
  "stripe_subscription",
  "rollback_readiness",
  "preview_smoke_qa",
  "limitation",
  "blocker",
  "audit_event",
  "pasr_shadow_result",
] as const;

const BLOCKER_SEVERITIES = ["p0_blocker", "p1_major", "p2_minor", "p3_note"] as const;

const BLOCKER_CATEGORIES = [
  "launch_approval",
  "content_approval",
  "client_approval",
  "domain_dns",
  "billing_subscription",
  "hosting_entitlement",
  "stripe_payment",
  "publish_target",
  "rollback",
  "smoke_qa",
  "runtime_candidate",
  "freshness",
  "evidence",
  "limitation",
  "manual_operator",
  "unknown_or_manual",
] as const;

const BLOCKER_STATUSES = ["open", "resolved", "accepted_limitation", "superseded", "cancelled"] as const;

const EVENT_ACTIONS = [
  "readiness_created",
  "evidence_collection_started",
  "dimension_recorded",
  "dimension_ref_recorded",
  "blocker_opened",
  "blocker_resolved",
  "limitation_accepted",
  "readiness_marked_ready",
  "readiness_marked_ready_with_limitations",
  "readiness_blocked",
  "readiness_marked_stale",
  "readiness_superseded",
  "readiness_cancelled",
  "closeout_recorded",
] as const;

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

function assertSqlContainsAll(values: readonly string[], sql: string): void {
  for (const value of values) {
    assert.match(sql, new RegExp(`'${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
  }
}

test("launch readiness migration creates the intended table family", () => {
  const sql = readMigration();
  const createdTables = [...sql.matchAll(/create table if not exists public\.(gnr8_single_site_launch_readiness_[a-z0-9_]+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(new Set(createdTables), new Set(EXPECTED_TABLES));
  assert.doesNotMatch(sql, /create table if not exists public\.(?!gnr8_single_site_launch_readiness_)[a-z0-9_]+/i);
});

test("launch readiness migration contains required vocabulary", () => {
  const sql = readMigration();
  assertSqlContainsAll(READINESS_STATUSES, sql);
  assertSqlContainsAll(FRESHNESS_STATUSES, sql);
  assertSqlContainsAll(DIMENSIONS, sql);
  assertSqlContainsAll(DIMENSION_STATUSES, sql);
  assertSqlContainsAll(REF_ROLES, sql);
  assertSqlContainsAll(BLOCKER_SEVERITIES, sql);
  assertSqlContainsAll(BLOCKER_CATEGORIES, sql);
  assertSqlContainsAll(BLOCKER_STATUSES, sql);
  assertSqlContainsAll(EVENT_ACTIONS, sql);
});

test("launch readiness migration validates JSON shapes, refs, watermarks, and idempotency", () => {
  const sql = readMigration();
  for (const expected of [
    "jsonb_typeof(readiness_summary_json) = 'object'",
    "jsonb_typeof(limitation_summary_json) = 'array'",
    "jsonb_typeof(blocker_summary_json) = 'array'",
    "jsonb_typeof(source_refs_json) = 'array'",
    "jsonb_typeof(blocker_refs_json) = 'array'",
    "jsonb_typeof(limitations_json) = 'array'",
    "jsonb_typeof(diagnostics_json) = 'object'",
    "jsonb_typeof(metadata_json) = 'object'",
    "jsonb_typeof(resolution_refs_json) = 'array'",
    "jsonb_typeof(final_evidence_summary_json) = 'object'",
    "jsonb_typeof(publish_activation_handoff_refs_json) = 'array'",
    "length(btrim(source_ref)) > 0",
    "length(btrim(semantic_source_watermark)) > 0",
    "source_watermark is null or length(btrim(source_watermark)) > 0",
    "unique (idempotency_key)",
    "idx_gnr8_single_site_launch_readiness_refs_semantic",
  ]) {
    assert.match(sql, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("launch readiness migration enables RLS without broad policies or grants", () => {
  const sql = readMigration();
  for (const tableName of EXPECTED_TABLES) {
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  assert.doesNotMatch(sql, /\bcreate\s+policy\b/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
  assert.doesNotMatch(sql, /\bto\s+(?:public|anon|authenticated)\b/i);
});

test("launch readiness refs, events, and closeouts are append-only", () => {
  const sql = readMigration();
  assert.match(sql, /create or replace function public\.gnr8_single_site_launch_readiness_prevent_update_delete\(\)/i);
  for (const tableName of APPEND_ONLY_TABLES) {
    assert.match(sql, new RegExp(`before update or delete on public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`trg_${tableName}_append_only`, "i"));
  }
});

test("launch readiness migration contains required lookup indexes", () => {
  const sql = readMigration();
  for (const indexName of [
    "idx_gnr8_single_site_launch_readiness_records_semantic",
    "idx_gnr8_single_site_launch_readiness_records_migration_status",
    "idx_gnr8_single_site_launch_readiness_records_client_site_status",
    "idx_gnr8_single_site_launch_readiness_records_freshness",
    "idx_gnr8_single_site_launch_readiness_records_created",
    "idx_gnr8_single_site_launch_readiness_dimensions_readiness",
    "idx_gnr8_single_site_launch_readiness_dimensions_status",
    "idx_gnr8_single_site_launch_readiness_dimensions_required",
    "idx_gnr8_single_site_launch_readiness_dimensions_freshness",
    "idx_gnr8_single_site_launch_readiness_refs_readiness_role",
    "idx_gnr8_single_site_launch_readiness_refs_dimension_role",
    "idx_gnr8_single_site_launch_readiness_refs_source_lookup",
    "idx_gnr8_single_site_launch_readiness_refs_source_watermark",
    "idx_gnr8_single_site_launch_readiness_blockers_readiness",
    "idx_gnr8_single_site_launch_readiness_blockers_dimension",
    "idx_gnr8_single_site_launch_readiness_blockers_category",
    "idx_gnr8_single_site_launch_readiness_events_readiness",
    "idx_gnr8_single_site_launch_readiness_events_action",
    "idx_gnr8_single_site_launch_readiness_events_source_watermark",
    "idx_gnr8_single_site_launch_readiness_closeouts_readiness",
    "idx_gnr8_single_site_launch_readiness_closeouts_final_status",
  ]) {
    assert.match(sql, new RegExp(`create (?:unique )?index if not exists ${indexName}\\b`, "i"));
  }
});

test("launch readiness migration avoids executable provider and source-owner mutations", () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /\bdrop\s+table\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.(?!gnr8_single_site_launch_readiness_)[a-z0-9_]+/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.(?!gnr8_single_site_launch_readiness_)[a-z0-9_]+/i);
  assert.doesNotMatch(sql, /alter table public\.(?!gnr8_single_site_launch_readiness_)[a-z0-9_]+/i);
  assert.doesNotMatch(sql, /\b(?:perform|select)\s+(?:http|net|fetch|curl|vercel|openprovider|stripe|registrar|dns|publish|rollback)/i);
  assert.doesNotMatch(sql, /publishApprovedSiteVersion|runtime-store|stripe\.|vercel\.|openprovider\./i);
});
