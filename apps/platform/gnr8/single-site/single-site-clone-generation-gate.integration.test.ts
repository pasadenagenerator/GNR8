import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool, type PoolClient } from "pg";

import { evaluateCloneGenerationGate } from "./single-site-clone-generation-gate";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadClient, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteStateWriterPool,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_REVIEW_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const MIGRATION_BASENAME = "20260729120000_single_site_state_evidence_spine.sql";
const CLONE_REVIEW_MIGRATION_BASENAME = "20260730120000_single_site_clone_review_core.sql";
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
  "gnr8_single_site_clone_reviews",
  "gnr8_single_site_clone_review_refs",
  "gnr8_single_site_clone_review_items",
  "gnr8_single_site_clone_review_events",
] as const;
const CLONE_PROPOSAL_RUNTIME_TABLES = [
  "gnr8_runtime_site_versions",
  "gnr8_runtime_artifacts",
  "gnr8_runtime_raw_template_artifacts",
  "gnr8_generated_website_proposals",
  "gnr8_generated_proposal_bundles",
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
  const containerName = `gnr8-single-site-clone-gate-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_clone_gate_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_clone_gate_${suffix.replace(/-/g, "")}`;
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
    docker(["cp", CLONE_REVIEW_MIGRATION_PATH, `${containerName}:/tmp/${CLONE_REVIEW_MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${MIGRATION_BASENAME}`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${CLONE_REVIEW_MIGRATION_BASENAME}`]);

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

async function runtimeProposalCloneTables(pool: Pool): Promise<Record<string, string | null>> {
  const rows: Record<string, string | null> = {};
  for (const table of CLONE_PROPOSAL_RUNTIME_TABLES) {
    const result = await pool.query<{ table_name: string | null }>(`select to_regclass('public.${table}')::text as table_name`);
    rows[table] = result.rows[0]?.table_name ?? null;
  }
  return rows;
}

function actor() {
  return { actorType: "human" as const, actorId: "clone-gate-operator", actorRole: "migration_operator" };
}

async function createMigrationAtReviewBoundary(input: {
  writer: SingleSiteStateWriterRepository;
  transitions: SingleSiteStateTransitionService;
  suffix: string;
  label: string;
}) {
  const created = await input.writer.withTransaction((tx) =>
    input.writer.createMigration(tx, {
      tenantId: `tenant-${input.suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://${input.label}-${input.suffix}.example.test`,
      canonicalSourceUrl: `https://${input.label}-${input.suffix}.example.test/`,
      actor: { actorType: "human", actorId: "clone-gate-operator" },
      correlationId: `corr-create-${input.label}-${input.suffix}`,
      idempotencyKey: `idem-create-${input.label}-${input.suffix}`,
    }),
  );
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_capture_started",
    actor: actor(),
    correlationId: `corr-capture-start-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-capture-start-${input.label}-${input.suffix}`,
  });
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_capture_completed",
    actor: actor(),
    correlationId: `corr-capture-complete-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-capture-complete-${input.label}-${input.suffix}`,
  });
  await input.transitions.transition({
    migrationId: created.row.id,
    toState: "source_evidence_review_required",
    actor: actor(),
    correlationId: `corr-review-required-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-review-required-${input.label}-${input.suffix}`,
  });
  return created.row;
}

async function createReview(input: {
  reviews: SourceEvidenceReviewService;
  migration: Awaited<ReturnType<typeof createMigrationAtReviewBoundary>>;
  suffix: string;
  label: string;
}) {
  return input.reviews.createReview({
    migrationId: input.migration.id,
    tenantId: input.migration.tenant_id,
    clientId: input.migration.client_id,
    siteId: input.migration.site_id,
    sourceUrl: input.migration.source_url,
    canonicalSourceUrl: input.migration.canonical_source_url,
    captureRunId: `capture-${input.label}-${input.suffix}`,
    sourceEvidencePackageKey: `package-${input.label}-${input.suffix}`,
    sourceWatermark: `watermark-${input.label}-${input.suffix}`,
    evidenceCapturedAt: "2026-07-29T12:00:00.000Z",
    completenessStatus: "complete",
    actor: actor(),
    correlationId: `corr-review-create-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-review-create-${input.label}-${input.suffix}`,
  });
}

async function addRequiredItems(input: {
  reviews: SourceEvidenceReviewService;
  migrationId: string;
  reviewId: string;
  suffix: string;
  label: string;
}) {
  for (const category of REQUIRED_CATEGORIES) {
    await input.reviews.addEvidenceItem({
      reviewId: input.reviewId,
      migrationId: input.migrationId,
      evidenceCategory: category,
      status: "present",
      actor: actor(),
      correlationId: `corr-item-${input.label}-${category}-${input.suffix}`,
      idempotencyKey: `idem-item-${input.label}-${category}-${input.suffix}`,
    });
  }
}

test("clone generation gate reads disposable PostgreSQL read model and does not mutate state or clone outputs", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const queries: string[] = [];
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const reviews = new SourceEvidenceReviewService(writer);
  const reader = new SingleSiteStateReadRepository(readLoggingPool(pool, queries));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

  try {
    const acceptedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "accepted" });
    const acceptedReview = await createReview({ reviews, migration: acceptedMigration, suffix, label: "accepted" });
    await addRequiredItems({ reviews, migrationId: acceptedMigration.id, reviewId: acceptedReview.review.id, suffix, label: "accepted" });
    await reviews.accept({
      reviewId: acceptedReview.review.id,
      actor: actor(),
      correlationId: `corr-accept-${suffix}`,
      idempotencyKey: `idem-accept-${suffix}`,
    });

    const limitedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "limited" });
    const limitedReview = await createReview({ reviews, migration: limitedMigration, suffix, label: "limited" });
    await addRequiredItems({ reviews, migrationId: limitedMigration.id, reviewId: limitedReview.review.id, suffix, label: "limited" });
    await reviews.acceptWithLimitations({
      reviewId: limitedReview.review.id,
      limitationsJson: [{ category: "font", reason: "accepted fallback font evidence" }],
      aafApprovalDecisionId: randomUUID(),
      actor: actor(),
      correlationId: `corr-limited-${suffix}`,
      idempotencyKey: `idem-limited-${suffix}`,
    });

    const missingMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "missing" });

    const retryMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "retry" });
    const retryReview = await createReview({ reviews, migration: retryMigration, suffix, label: "retry" });
    await reviews.requireRetry({
      reviewId: retryReview.review.id,
      reason: "capture incomplete",
      actor: actor(),
      correlationId: `corr-retry-${suffix}`,
      idempotencyKey: `idem-retry-${suffix}`,
    });

    const rejectedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "rejected" });
    const rejectedReview = await createReview({ reviews, migration: rejectedMigration, suffix, label: "rejected" });
    await reviews.reject({
      reviewId: rejectedReview.review.id,
      reason: "wrong source",
      actor: actor(),
      correlationId: `corr-reject-${suffix}`,
      idempotencyKey: `idem-reject-${suffix}`,
    });

    const before = await tableCounts(pool);
    const runtimeBefore = await runtimeProposalCloneTables(pool);
    const accepted = await evaluateCloneGenerationGate({ migrationId: acceptedMigration.id, repository: reader });
    const limited = await evaluateCloneGenerationGate({ migrationId: limitedMigration.id, repository: reader });
    const missing = await evaluateCloneGenerationGate({ migrationId: missingMigration.id, repository: reader });
    const retry = await evaluateCloneGenerationGate({ migrationId: retryMigration.id, repository: reader });
    const rejected = await evaluateCloneGenerationGate({ migrationId: rejectedMigration.id, repository: reader });
    const after = await tableCounts(pool);
    const runtimeAfter = await runtimeProposalCloneTables(pool);

    assert.deepEqual(after, before);
    assert.deepEqual(runtimeAfter, runtimeBefore);
    assert.deepEqual(runtimeAfter, {
      gnr8_runtime_site_versions: null,
      gnr8_runtime_artifacts: null,
      gnr8_runtime_raw_template_artifacts: null,
      gnr8_generated_website_proposals: null,
      gnr8_generated_proposal_bundles: null,
    });
    assert.equal(accepted.allowed, true);
    assert.equal(accepted.reason, "source_evidence_accepted");
    assert.equal(limited.allowed, true);
    assert.equal(limited.mode, "warning");
    assert.equal(limited.reason, "source_evidence_accepted_with_limitations");
    assert.deepEqual(limited.limitations, [{ category: "font", reason: "accepted fallback font evidence" }]);
    assert.equal(missing.allowed, false);
    assert.equal(missing.reason, "source_evidence_missing");
    assert.equal(retry.allowed, false);
    assert.equal(retry.reason, "source_evidence_retry_required");
    assert.equal(rejected.allowed, false);
    assert.equal(rejected.reason, "source_evidence_rejected");
    assert.equal(queries.some((sql) => /\b(insert\s+into|update|delete\s+from)\b/i.test(sql)), false);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
