import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES,
  SINGLE_SITE_MIGRATION_STATES,
  SINGLE_SITE_REVIEW_EVENT_ACTIONS,
  SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES,
  SingleSiteIdempotencyConflictError,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type CreateSingleSiteMigrationInput,
  type SingleSiteStateWriterPool,
} from "./single-site-state-writer-repository";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-state-writer-repository.ts");
const MIGRATION_TEST_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-state-evidence-persistence.test.ts");

function baseMigration(overrides: Partial<CreateSingleSiteMigrationInput> = {}): CreateSingleSiteMigrationInput {
  return {
    tenantId: "tenant-single-site-unit",
    clientId: "11111111-1111-4111-8111-111111111111",
    siteId: "22222222-2222-4222-8222-222222222222",
    sourceUrl: "https://example.test",
    actor: {
      actorType: "human",
      actorId: "operator-1",
      actorDisplayLabel: "Operator One",
    },
    correlationId: "corr-single-site-unit",
    idempotencyKey: "idem-migration-unit",
    ...overrides,
  };
}

function fakePool(): { pool: SingleSiteStateWriterPool; rows: Record<string, unknown>[]; calls: string[] } {
  const rows: Record<string, unknown>[] = [];
  const calls: string[] = [];
  const client = {
    release() {},
    async query(sql: string, values: readonly unknown[] = []) {
      calls.push(sql);
      if (/^\s*(begin|commit|rollback)\b/i.test(sql)) return { rows: [], rowCount: null };
      if (/insert into public\.gnr8_single_site_migrations/i.test(sql)) {
        const columns = sql.match(/\(([^)]+)\)\s*values/i)?.[1]?.split(",").map((column) => column.trim()) ?? [];
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
        if (rows.some((candidate) => candidate.idempotency_key === row.idempotency_key)) return { rows: [], rowCount: 0 };
        const stored = {
          id: `00000000-0000-4000-8000-${String(rows.length + 1).padStart(12, "0")}`,
          state_version: 1,
          current_blocker_count: 0,
          latest_source_evidence_review_id: null,
          latest_state_event_id: null,
          latest_aaf_evidence_package_id: null,
          latest_aaf_audit_event_id: null,
          terminal_at: null,
          created_at: "2026-07-29T12:00:00.000Z",
          updated_at: "2026-07-29T12:00:00.000Z",
          ...row,
        };
        rows.push(stored);
        return { rows: [stored], rowCount: 1 };
      }
      if (/from public\.gnr8_single_site_migrations/i.test(sql)) {
        const row = rows.find((candidate) => candidate.idempotency_key === values[0] || candidate.id === values[0]);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      throw new Error(`Unexpected SQL in single-site unit fake: ${sql}`);
    },
  };
  return {
    calls,
    rows,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test("contracts vocabulary matches MVP-5 SQL static expectations", () => {
  const staticTest = fs.readFileSync(MIGRATION_TEST_PATH, "utf8");
  for (const value of SINGLE_SITE_MIGRATION_STATES) assert.match(staticTest, new RegExp(`"${value}"`));
  for (const value of SINGLE_SITE_SOURCE_EVIDENCE_REVIEW_STATUSES) assert.match(staticTest, new RegExp(`"${value}"`));
  for (const value of SINGLE_SITE_EVIDENCE_ITEM_CATEGORIES) assert.match(staticTest, new RegExp(`"${value}"`));
  for (const value of SINGLE_SITE_REVIEW_EVENT_ACTIONS) assert.match(staticTest, new RegExp(`"${value}"`));
});

test("writer repository is server-only and has no forbidden integration hooks or append-only update/delete helpers", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(runtime-store|vercel|openprovider|dns-provider|provider-execution|stripe|billing|ai|worker|command-center|ops-inbox)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(insert\s+into|update)\s+public\.(?!gnr8_single_site_|\$\{tableName\})[a-z0-9_]+/i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(source, /\b(update|delete)(StateEvent|MigrationRef|Closeout|ReviewRef|ReviewEvent)\b/);
});

test("create migration idempotency reuses identical semantic payload and rejects drift", async () => {
  const { pool, calls } = fakePool();
  const repository = new SingleSiteStateWriterRepository(pool);

  const first = await repository.withTransaction((tx) => repository.createMigration(tx, baseMigration()));
  const retry = await repository.withTransaction((tx) => repository.createMigration(tx, baseMigration({ actor: { ...baseMigration().actor, actorDisplayLabel: "Renamed Operator" } })));

  assert.equal(first.row.id, retry.row.id);
  assert.equal(retry.reusedExisting, true);
  assert.ok(calls.some((sql) => /^\s*begin\b/i.test(sql)));
  assert.ok(calls.some((sql) => /^\s*commit\b/i.test(sql)));

  await assert.rejects(
    () => repository.withTransaction((tx) => repository.createMigration(tx, baseMigration({ sourceUrl: "https://changed.example.test" }))),
    SingleSiteIdempotencyConflictError,
  );
});
