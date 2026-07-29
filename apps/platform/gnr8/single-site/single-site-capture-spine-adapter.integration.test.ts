import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteCaptureSpineAdapter, type SingleSiteCaptureSpineInput } from "./single-site-capture-spine-adapter";
import { SingleSiteStateReadRepository, type SingleSiteStateReadClient, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);
const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";
const SINGLE_SITE_TABLES = [
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

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
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
  const containerName = `gnr8-single-site-capture-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_capture_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_capture_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", MIGRATION_PATH, `${containerName}:/tmp/${MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${MIGRATION_BASENAME}`]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return {
      containerName,
      connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}`,
    };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best effort cleanup for disposable DB setup failure.
    }
    throw error;
  }
}

function loggingWriterPool(pool: Pool, queries: string[]): SingleSiteStateWriterPool {
  return {
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            return async (sql: string, values?: readonly unknown[]) => {
              queries.push(sql);
              return (target as PoolClient).query(sql, values as never);
            };
          }
          return Reflect.get(target, property, receiver);
        },
      }) as SingleSiteStateWriterTx;
    },
  };
}

function readPool(pool: Pool): SingleSiteStateReadPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateReadClient;
    },
  };
}

async function tableCounts(pool: Pool): Promise<Record<string, string>> {
  const counts: Record<string, string> = {};
  for (const table of SINGLE_SITE_TABLES) {
    const result = await pool.query<{ count: string }>(`select count(*)::text as count from public.${table}`);
    counts[table] = result.rows[0]?.count ?? "0";
  }
  return counts;
}

function captureInput(suffix: string, overrides: Partial<SingleSiteCaptureSpineInput> = {}): SingleSiteCaptureSpineInput {
  const sourceUrl = `https://capture-${suffix}.example.test/`;
  return {
    outcome: "completed",
    tenantId: randomUUID(),
    clientId: randomUUID(),
    siteId: randomUUID(),
    ownershipSiteId: randomUUID(),
    runtimeSiteId: `runtime-site-${suffix}`,
    siteVersionId: randomUUID(),
    runtimeSiteVersionId: randomUUID(),
    sourceUrl,
    canonicalSourceUrl: sourceUrl,
    intendedLaunchDomain: `capture-${suffix}.example.test`,
    idempotencyKey: `idem-capture-${suffix}`,
    migrationIdempotencyKey: `idem-capture-${suffix}:migration`,
    correlationId: `corr-capture-${suffix}`,
    actor: { actorType: "system", actorId: "capture-integration-test", actorRole: "capture_adapter" },
    captureRunId: `capture-run-${suffix}`,
    renderJobId: `render-job-${suffix}`,
    sourceEvidencePackageKey: `package-${suffix}`,
    sourceWatermark: `watermark-${suffix}`,
    sourceHash: `hash-${suffix}`,
    captureStartedAt: "2026-07-29T12:00:00.000Z",
    captureCompletedAt: "2026-07-29T12:01:00.000Z",
    evidenceCapturedAt: "2026-07-29T12:01:00.000Z",
    evidenceRefs: [
      { category: "source_url", sourceEvidenceRefRole: "source_url", refType: "url", sourceRecordId: sourceUrl },
      { category: "page", sourceEvidenceRefRole: "page", refType: "page", sourceRecordId: `page-${suffix}` },
      { category: "screenshot", sourceEvidenceRefRole: "screenshot", refType: "desktop_viewport", sourceRecordId: `screenshot-${suffix}`, mediaType: "image/png" },
      { category: "dom", sourceEvidenceRefRole: "rendered_dom", refType: "html", sourceRecordId: `dom-${suffix}`, contentHash: `dom-hash-${suffix}`, mediaType: "text/html" },
      { category: "text", sourceEvidenceRefRole: "text_extract", refType: "text", sourceRecordId: `text-${suffix}`, mediaType: "text/plain" },
      { category: "image", sourceEvidenceRefRole: "image_asset", refType: "image", sourceRecordId: `image-${suffix}`, mediaType: "image/png" },
      { category: "asset", sourceEvidenceRefRole: "asset", refType: "stylesheet", sourceRecordId: `asset-${suffix}`, mediaType: "text/css" },
      { category: "font", sourceEvidenceRefRole: "font_ref", refType: "computed_font_family", sourceRecordId: `font-${suffix}`, status: "present_with_warnings" },
      { category: "visual_identity", sourceEvidenceRefRole: "visual_identity", refType: "computed_style_samples", sourceRecordId: `visual-${suffix}` },
      { category: "metadata", sourceEvidenceRefRole: "metadata", refType: "metadata", sourceRecordId: `metadata-${suffix}` },
    ],
    ...overrides,
  };
}

test("capture spine adapter writes success, failure, idempotent retry, and read-model projection against disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const queries: string[] = [];
  const writer = new SingleSiteStateWriterRepository(loggingWriterPool(pool, queries));
  const adapter = new SingleSiteCaptureSpineAdapter({
    writer,
    transitionService: new SingleSiteStateTransitionService(writer),
    sourceEvidenceReviewService: new SourceEvidenceReviewService(writer),
  });
  const reader = new SingleSiteStateReadRepository(readPool(pool));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

  try {
    const successInput = captureInput(suffix);
    const success = await adapter.recordCapture(successInput);
    assert.equal(success.outcomeState, "source_evidence_review_required");
    assert.equal(success.reviewReadyForReview, true);
    assert.ok(success.reviewId);

    const countsAfterSuccess = await tableCounts(pool);
    const retry = await adapter.recordCapture(successInput);
    const countsAfterRetry = await tableCounts(pool);
    assert.equal(retry.migrationId, success.migrationId);
    assert.deepEqual(countsAfterRetry, countsAfterSuccess);

    const failureSuffix = `${suffix}f`;
    const failure = await adapter.recordCapture(
      captureInput(failureSuffix, {
        outcome: "failed",
        evidenceRefs: [],
        failureReason: "fetch_failed",
        siteId: null,
        ownershipSiteId: null,
      }),
    );
    assert.equal(failure.outcomeState, "source_capture_failed");
    assert.equal(failure.reviewId, null);

    const model = await reader.readByMigrationId(success.migrationId);
    assert.ok(model);
    assert.equal(model.currentState.state, "source_evidence_review_required");
    assert.equal(model.recommendedNextAction.actionKey, "review_source_evidence");
    assert.equal(model.sourceEvidenceReview.reviewStatus, "ready_for_review");
    assert.equal(model.sourceEvidenceReview.itemCount >= 10, true);
    assert.ok(model.refs.items.some((ref) => ref.role === "source_evidence_package"));
    assert.ok(model.sourceEvidenceReview.refs.some((ref) => ref.role === "screenshot"));

    const failedModel = await reader.readByMigrationId(failure.migrationId);
    assert.ok(failedModel);
    assert.equal(failedModel.currentState.state, "source_capture_failed");
    assert.equal(failedModel.recommendedNextAction.actionKey, "retry_capture");

    const publicTables = await pool.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    assert.deepEqual(
      publicTables.rows.map((row) => row.tablename).filter((tableName) => !tableName.startsWith("gnr8_single_site_")),
      [],
    );
    assert.deepEqual(
      queries
        .filter((sql) => /\b(insert\s+into|update|delete\s+from)\b/i.test(sql))
        .filter((sql) => !/\b(insert\s+into|update|delete\s+from)\s+public\.gnr8_single_site_/i.test(sql)),
      [],
    );
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
