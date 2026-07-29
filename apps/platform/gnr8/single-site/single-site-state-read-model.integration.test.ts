import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadClient, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql",
);
const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
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
  const containerName = `gnr8-single-site-read-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_read_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_read_${suffix.replace(/-/g, "")}`;
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

function writerPool(pool: Pool): SingleSiteStateWriterPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateWriterTx;
    },
  };
}

function readLoggingPool(pool: Pool, queries: string[]): SingleSiteStateReadPool {
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
      }) as SingleSiteStateReadClient;
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

function actor() {
  return { actorType: "human" as const, actorId: "read-integration-operator", actorRole: "migration_operator" };
}

test("single-site read repository projects writer-created state from disposable PostgreSQL without mutations", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const queries: string[] = [];
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const reviews = new SourceEvidenceReviewService(writer);
  const reader = new SingleSiteStateReadRepository(readLoggingPool(pool, queries));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

  try {
    const created = await writer.withTransaction((tx) =>
      writer.createMigration(tx, {
        tenantId: `tenant-${suffix}`,
        clientId: randomUUID(),
        siteId: randomUUID(),
        sourceUrl: `https://read-${suffix}.example.test`,
        canonicalSourceUrl: `https://read-${suffix}.example.test/`,
        actor: { actorType: "human", actorId: "read-integration-operator" },
        correlationId: `corr-create-${suffix}`,
        idempotencyKey: `idem-create-${suffix}`,
      }),
    );
    await transitions.transition({
      migrationId: created.row.id,
      toState: "source_capture_started",
      actor: actor(),
      correlationId: `corr-capture-start-${suffix}`,
      idempotencyKey: `idem-capture-start-${suffix}`,
    });
    await transitions.transition({
      migrationId: created.row.id,
      toState: "source_capture_completed",
      actor: actor(),
      correlationId: `corr-capture-complete-${suffix}`,
      idempotencyKey: `idem-capture-complete-${suffix}`,
    });
    await transitions.transition({
      migrationId: created.row.id,
      toState: "source_evidence_review_required",
      actor: actor(),
      correlationId: `corr-review-required-${suffix}`,
      idempotencyKey: `idem-review-required-${suffix}`,
    });

    const review = await reviews.createReview({
      migrationId: created.row.id,
      tenantId: created.row.tenant_id,
      clientId: created.row.client_id,
      siteId: created.row.site_id,
      sourceUrl: created.row.source_url,
      canonicalSourceUrl: created.row.canonical_source_url,
      captureRunId: `capture-${suffix}`,
      sourceEvidencePackageKey: `package-${suffix}`,
      sourceWatermark: `watermark-${suffix}`,
      evidenceCapturedAt: "2026-07-29T12:00:00.000Z",
      completenessStatus: "complete",
      actor: actor(),
      correlationId: `corr-review-create-${suffix}`,
      idempotencyKey: `idem-review-create-${suffix}`,
    });
    await reviews.recordRef({
      reviewId: review.review.id,
      migrationId: created.row.id,
      refRole: "source_url",
      refType: "url",
      sourceRecordId: created.row.source_url,
      sourceWatermark: `watermark-${suffix}`,
      actor: actor(),
      correlationId: `corr-review-ref-${suffix}`,
      idempotencyKey: `idem-review-ref-${suffix}`,
    });
    for (const category of REQUIRED_CATEGORIES) {
      await reviews.addEvidenceItem({
        reviewId: review.review.id,
        migrationId: created.row.id,
        evidenceCategory: category,
        status: "present",
        actor: actor(),
        correlationId: `corr-item-${category}-${suffix}`,
        idempotencyKey: `idem-item-${category}-${suffix}`,
      });
    }
    const accepted = await reviews.acceptWithLimitations({
      reviewId: review.review.id,
      limitationsJson: [{ category: "font", reason: "accepted fallback font evidence" }],
      aafApprovalDecisionId: randomUUID(),
      actor: actor(),
      correlationId: `corr-review-accept-${suffix}`,
      idempotencyKey: `idem-review-accept-${suffix}`,
    });
    assert.equal(accepted.review.review_status, "accepted_with_limitations");

    await transitions.transition({
      migrationId: created.row.id,
      toState: "clone_generation_started",
      actor: actor(),
      sourceEvidenceReviewId: review.review.id,
      correlationId: `corr-clone-start-${suffix}`,
      idempotencyKey: `idem-clone-start-${suffix}`,
      refs: [
        {
          refRole: "source_evidence_review",
          refType: "source_evidence_review",
          sourceRecordId: review.review.id,
          sourceWatermark: `watermark-${suffix}`,
          idempotencyKey: `idem-clone-ref-review-${suffix}`,
        },
        {
          refRole: "source_evidence_package",
          refType: "capture_package",
          sourceRecordId: `package-${suffix}`,
          sourceWatermark: `watermark-${suffix}`,
          idempotencyKey: `idem-clone-ref-package-${suffix}`,
        },
      ],
    });

    await writer.withTransaction(async (tx) => {
      await writer.upsertStageSummary(tx, {
        migrationId: created.row.id,
        stage: "source_evidence_review",
        status: "accepted_with_limitations",
        summaryJson: { reviewId: review.review.id },
        limitationsJson: [{ category: "font" }],
        correlationId: `corr-stage-${suffix}`,
        idempotencyKey: `idem-stage-${suffix}`,
      });
      await writer.upsertBlocker(tx, {
        migrationId: created.row.id,
        blockerKey: "accepted-font-limitation",
        blockerType: "source_evidence_degraded",
        severity: "p3",
        status: "accepted_risk",
        detailsJson: { reason: "font evidence accepted with limitation" },
        correlationId: `corr-blocker-${suffix}`,
        idempotencyKey: `idem-blocker-${suffix}`,
      });
      await writer.insertCloseout(tx, {
        migrationId: created.row.id,
        outcome: "internal_rehearsal_only",
        finalUrl: `https://preview-${suffix}.example.test`,
        evidenceSummaryJson: { reviewId: review.review.id },
        closeoutRefsJson: { rehearsal: true },
        actor: { actorType: "human", actorId: "read-integration-operator" },
        correlationId: `corr-closeout-${suffix}`,
        idempotencyKey: `idem-closeout-${suffix}`,
      });
    });

    const active = await writer.withTransaction((tx) =>
      writer.createMigration(tx, {
        tenantId: `tenant-${suffix}`,
        clientId: created.row.client_id,
        siteId: randomUUID(),
        sourceUrl: `https://active-${suffix}.example.test`,
        actor: { actorType: "human", actorId: "read-integration-operator" },
        correlationId: `corr-active-${suffix}`,
        idempotencyKey: `idem-active-${suffix}`,
      }),
    );

    const before = await tableCounts(pool);
    const byId = await reader.readByMigrationId(created.row.id);
    const bySite = await reader.listBySiteId(created.row.site_id ?? "missing");
    const byClient = await reader.listByClientId(created.row.client_id);
    const activeModels = await reader.listActiveNonTerminalMigrations();
    const latestReview = await reader.readLatestSourceEvidenceReviewForMigration(created.row.id);
    const blockers = await reader.readBlockersForMigration(created.row.id);
    const history = await reader.readStateHistoryForMigration(created.row.id);
    const after = await tableCounts(pool);

    assert.deepEqual(after, before);
    assert.ok(byId);
    assert.equal(byId.migration.migrationId, created.row.id);
    assert.ok(byId.stateHistory.length >= 4);
    assert.ok(byId.refs.items.some((ref) => ref.role === "source_evidence_review"));
    assert.equal(byId.sourceEvidenceReview.reviewStatus, "accepted_with_limitations");
    assert.equal(byId.sourceEvidenceReview.refs.length, 1);
    assert.ok(byId.sourceEvidenceReview.events.some((event) => event.action === "accepted_with_limitations"));
    assert.equal(byId.sourceEvidenceReview.itemCount, REQUIRED_CATEGORIES.length);
    assert.equal(byId.blockers.totalCount, 1);
    assert.equal(byId.closeout.present, true);
    assert.equal(bySite.some((model) => model.migration.migrationId === created.row.id), true);
    assert.equal(byClient.some((model) => model.migration.migrationId === created.row.id), true);
    assert.equal(activeModels.some((model) => model.migration.migrationId === active.row.id), true);
    assert.equal(latestReview?.reviewStatus, "accepted_with_limitations");
    assert.equal(blockers?.totalCount, 1);
    assert.ok(history && history.length >= 4);
    assert.equal(queries.some((sql) => /\b(insert\s+into|update|delete\s+from)\b/i.test(sql)), false);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
