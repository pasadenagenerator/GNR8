import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);

const EXPECTED_TABLES = [
  "gnr8_single_site_migrations",
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_migration_stage_summaries",
  "gnr8_single_site_migration_blockers",
  "gnr8_single_site_migration_closeouts",
  "gnr8_single_site_source_evidence_reviews",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_source_evidence_review_items",
  "gnr8_single_site_source_evidence_review_events",
] as const;

const APPEND_ONLY_TABLES = [
  "gnr8_single_site_migration_state_events",
  "gnr8_single_site_migration_refs",
  "gnr8_single_site_migration_closeouts",
  "gnr8_single_site_source_evidence_review_refs",
  "gnr8_single_site_source_evidence_review_events",
] as const;

const MVP_STATES = [
  "site_candidate_created",
  "source_capture_started",
  "source_capture_completed",
  "source_capture_failed",
  "source_evidence_review_required",
  "clone_generation_started",
  "clone_generation_completed",
  "clone_review_required",
  "clone_revision_required",
  "improvement_proposal_started",
  "improvement_proposal_ready",
  "improvement_proposal_approved",
  "improvement_proposal_rejected",
  "improvement_implementation_started",
  "improvement_implementation_completed",
  "improved_preview_ready",
  "content_review_required",
  "content_approved",
  "domain_readiness_required",
  "domain_readiness_ready",
  "subscription_required",
  "subscription_created",
  "hosting_entitlement_ready",
  "launch_approval_required",
  "publish_ready",
  "published",
  "rollback_available",
  "migration_closed_out",
  "migration_failed",
  "migration_cancelled",
] as const;

const REVIEW_STATUSES = [
  "not_started",
  "ready_for_review",
  "review_in_progress",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
] as const;

const EVIDENCE_CATEGORIES = [
  "source_url",
  "page",
  "screenshot",
  "dom",
  "text",
  "image",
  "asset",
  "font",
  "visual_identity",
  "metadata",
  "structured_data",
  "external_ref",
  "limitation",
  "missing_evidence",
] as const;

const REVIEW_EVENT_ACTIONS = [
  "created",
  "item_added",
  "ready_for_review",
  "review_started",
  "accepted",
  "accepted_with_limitations",
  "retry_required",
  "rejected",
  "superseded",
  "comment_added",
] as const;

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

test("single-site migration creates only the intended single-site tables", () => {
  const sql = readMigration();
  const createdTables = [...sql.matchAll(/create table if not exists public\.(gnr8_single_site_[a-z0-9_]+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(createdTables, EXPECTED_TABLES);
  assert.doesNotMatch(sql, /create table if not exists public\.(?!gnr8_single_site_)[a-z0-9_]+/i);
});

test("single-site migration avoids destructive SQL and unrelated table mutations", () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /\bdrop\s+table\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\./i);
  assert.doesNotMatch(sql, /alter table public\.(?!gnr8_single_site_)[a-z0-9_]+/i);
});

test("single-site migration contains required state and source evidence vocabulary", () => {
  const sql = readMigration();
  assert.match(sql, /constraint gnr8_single_site_migrations_state_ck/i);
  assert.match(sql, /constraint gnr8_single_site_source_evidence_reviews_status_ck/i);
  assert.match(sql, /constraint gnr8_single_site_source_evidence_review_items_category_ck/i);
  assert.match(sql, /constraint gnr8_single_site_source_evidence_review_events_action_ck/i);
  assertSqlContainsAll(MVP_STATES, sql);
  assertSqlContainsAll(REVIEW_STATUSES, sql);
  assertSqlContainsAll(EVIDENCE_CATEGORIES, sql);
  assertSqlContainsAll(REVIEW_EVENT_ACTIONS, sql);
});

test("single-site migration contains actor, privacy, retention, idempotency, and hash constraints", () => {
  const sql = readMigration();
  assertSqlContainsAll(["human", "system", "provider", "external_reference", "ai_advisory"], sql);
  assertSqlContainsAll(PRIVACY_LABELS, sql);
  assertSqlContainsAll(RETENTION_CLASSES, sql);
  for (const constraintName of [
    "gnr8_single_site_migrations_source_watermark_nonempty_ck",
    "gnr8_single_site_migrations_payload_hash_ck",
    "gnr8_single_site_migration_state_events_payload_hash_ck",
    "gnr8_single_site_source_evidence_reviews_source_hash_ck",
    "gnr8_single_site_source_evidence_review_refs_content_hash_ck",
  ]) {
    assert.match(sql, new RegExp(`constraint ${constraintName}\\b`, "i"));
  }
  assert.match(sql, /unique \(idempotency_key\)/i);
  assert.match(sql, /idx_gnr8_single_site_migration_refs_semantic_uq/i);
  assert.match(sql, /coalesce\(source_table, ''\)/i);
  assert.match(sql, /coalesce\(source_watermark, ''\)/i);
});

test("single-site migration contains JSONB shape checks for refs, summaries, limitations, warnings, and blockers", () => {
  const sql = readMigration();
  for (const expected of [
    "jsonb_typeof(source_capture_refs_json) = 'object'",
    "jsonb_typeof(runtime_refs_json) = 'object'",
    "jsonb_typeof(aaf_approval_refs_json) = 'object'",
    "jsonb_typeof(ddom_snapshot_refs_json) = 'object'",
    "jsonb_typeof(ptt_publish_target_refs_json) = 'object'",
    "jsonb_typeof(limitations_json) = 'array'",
    "jsonb_typeof(warnings_json) = 'array'",
    "jsonb_typeof(blockers_json) = 'array'",
    "jsonb_typeof(metadata_json) = 'object'",
    "jsonb_typeof(ref_ids_json) = 'array'",
    "jsonb_typeof(details_json) = 'object'",
  ]) {
    assert.match(sql, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("single-site migration enables RLS without broad policies or grants", () => {
  const sql = readMigration();
  for (const tableName of EXPECTED_TABLES) {
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`, "i"));
  }
  assert.doesNotMatch(sql, /\bcreate\s+policy\b/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
});

test("single-site migration models history, refs, events, and closeouts as append-only", () => {
  const sql = readMigration();
  assert.match(sql, /create or replace function public\.gnr8_single_site_prevent_update_delete\(\)/i);
  for (const tableName of APPEND_ONLY_TABLES) {
    assert.match(sql, new RegExp(`before update or delete on public\\.${tableName}`, "i"));
    assert.match(sql, new RegExp(`trg_${tableName}_append_only`, "i"));
  }
});

test("single-site migration contains required lookup indexes", () => {
  const sql = readMigration();
  for (const indexName of [
    "idx_gnr8_single_site_migrations_client_site_state",
    "idx_gnr8_single_site_migrations_source_url",
    "idx_gnr8_single_site_migrations_idempotency_key",
    "idx_gnr8_single_site_migration_state_events_migration_occurred",
    "idx_gnr8_single_site_migration_refs_source_lookup",
    "idx_gnr8_single_site_migration_blockers_migration_status_severity",
    "idx_gnr8_single_site_migration_closeouts_migration_created",
    "idx_gnr8_single_site_source_evidence_reviews_migration_status",
    "idx_gnr8_single_site_source_evidence_review_items_review_category_status",
    "idx_gnr8_single_site_source_evidence_review_refs_source_lookup",
    "idx_gnr8_single_site_source_evidence_review_events_review_occurred",
  ]) {
    assert.match(sql, new RegExp(`create (?:unique )?index if not exists ${indexName}\\b`, "i"));
  }
});

test("single-site migration keeps source truth as refs and does not seed runtime behavior", () => {
  const sql = readMigration();
  assert.match(sql, /aaf_approval_refs_json/i);
  assert.match(sql, /ddom_snapshot_refs_json/i);
  assert.match(sql, /ptt_publish_target_refs_json/i);
  assert.match(sql, /billing_subscription_refs_json/i);
  assert.match(sql, /hosting_entitlement_refs_json/i);
  assert.match(sql, /rollback_refs_json/i);
  assert.doesNotMatch(sql, /publishApprovedSiteVersion|runtime-store|openprovider|stripe\.|vercel\.|create\s+policy/i);
});
