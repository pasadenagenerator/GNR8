import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql",
);

const EXPECTED_TABLE = "gnr8_publish_targets";

const ENVIRONMENTS = ["production", "preview", "staging", "development"] as const;
const TARGET_KINDS = ["public_runtime", "preview_runtime", "internal_runtime"] as const;
const PUBLISH_STAGES = ["production", "canary", "shadow"] as const;
const STATUSES = ["active", "disabled", "retired"] as const;
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

test("PTT migration creates only the intended publish target table", () => {
  const sql = readMigration();
  const createdTables = [...sql.matchAll(/create table if not exists public\.(gnr8_[a-z0-9_]+)/g)].map((match) => match[1]);
  assert.deepEqual(createdTables, [EXPECTED_TABLE]);
  assert.doesNotMatch(sql, /gnr8_site_publish_target_policies/i);
});

test("PTT migration does not alter unrelated tables or include destructive SQL", () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /alter table public\.(?!gnr8_publish_targets\b)[a-z0-9_]+/i);
  assert.doesNotMatch(sql, /\bdrop\s+table\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
  assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\./i);
  assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
  assert.doesNotMatch(sql, /\binsert\s+into\s+public\.(?!gnr8_publish_targets\b)/i);
});

test("PTT migration contains canonical vocabulary checks", () => {
  const sql = readMigration();
  for (const constraintName of [
    "gnr8_publish_targets_environment_ck",
    "gnr8_publish_targets_target_kind_ck",
    "gnr8_publish_targets_publish_stage_ck",
    "gnr8_publish_targets_status_ck",
    "gnr8_publish_targets_actor_type_ck",
    "gnr8_publish_targets_privacy_ck",
    "gnr8_publish_targets_retention_ck",
  ]) {
    assert.match(sql, new RegExp(`constraint ${constraintName}\\b`, "i"));
  }
  assertSqlContainsAll(ENVIRONMENTS, sql);
  assertSqlContainsAll(TARGET_KINDS, sql);
  assertSqlContainsAll(PUBLISH_STAGES, sql);
  assertSqlContainsAll(STATUSES, sql);
  assertSqlContainsAll(ACTOR_TYPES, sql);
  assertSqlContainsAll(PRIVACY_LABELS, sql);
  assertSqlContainsAll(RETENTION_CLASSES, sql);
});

test("PTT migration contains JSONB shape and artifact-stage value checks", () => {
  const sql = readMigration();
  assert.match(sql, /jsonb_typeof\(allowed_artifact_stages\) = 'array'/i);
  assert.match(sql, /jsonb_typeof\(limitations_json\) = 'object'/i);
  assert.match(sql, /constraint gnr8_publish_targets_allowed_artifact_stage_values_ck/i);
  assert.match(sql, /allowed_artifact_stages <@ '\["production", "canary", "shadow"\]'::jsonb/i);
});

test("PTT migration enables RLS without broad policies or grants", () => {
  const sql = readMigration();
  assert.match(sql, /alter table public\.gnr8_publish_targets enable row level security/i);
  assert.doesNotMatch(sql, /\bcreate\s+policy\b/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
});

test("PTT migration contains required lookup indexes without over-indexing JSONB", () => {
  const sql = readMigration();
  for (const indexName of [
    "idx_gnr8_publish_targets_status_environment_stage",
    "idx_gnr8_publish_targets_target_kind",
    "idx_gnr8_publish_targets_updated_at",
    "idx_gnr8_publish_targets_policy_version",
  ]) {
    assert.match(sql, new RegExp(`create index if not exists ${indexName}\\b`, "i"));
  }
  assert.doesNotMatch(sql, /using\s+gin/i);
});

test("PTT migration seeds only the MVP-supported production target", () => {
  const sql = readMigration();
  assert.match(sql, /insert into public\.gnr8_publish_targets/i);
  assert.match(sql, /values\s*\(\s*'production',\s*'production',\s*'public_runtime',\s*'production',\s*'active',\s*'ptt-1'/i);
  assert.match(sql, /'\["production"\]'::jsonb/i);
  assert.match(sql, /'ptt-1:gnr8_publish_targets:production'/i);

  const seededIds = [...sql.matchAll(/values\s*\(\s*'([^']+)'/gi)].map((match) => match[1]);
  assert.deepEqual(seededIds, ["production"]);
  assert.doesNotMatch(sql, /values\s*\(\s*'(?:shadow|canary)'/i);
});

test("PTT migration does not add TypeScript contracts or runtime behavior hooks", () => {
  const sql = readMigration();
  assert.doesNotMatch(sql, /publishApprovedSiteVersion|publish-activation|runtime-store|vercel|openprovider|stripe|\bai\b/i);
});
