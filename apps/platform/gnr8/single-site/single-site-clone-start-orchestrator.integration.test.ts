import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { startSingleSiteCloneGeneration, type SingleSiteCloneExecutor } from "./single-site-clone-start-orchestrator";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadClient, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import {
  SingleSiteStateWriterRepository,
  type SingleSiteStateWriterPool,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

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
  const containerName = `gnr8-single-site-clone-start-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_clone_start_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_clone_start_${suffix.replace(/-/g, "")}`;
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

function readPool(pool: Pool): SingleSiteStateReadPool {
  return {
    async connect() {
      return (await pool.connect()) as SingleSiteStateReadClient;
    },
  };
}

async function tableCounts(pool: Pool, tables = SINGLE_SITE_TABLES): Promise<Record<string, string>> {
  const counts: Record<string, string> = {};
  for (const table of tables) {
    const result = await pool.query<{ count: string }>(`select count(*)::text as count from public.${table}`);
    counts[table] = result.rows[0]?.count ?? "0";
  }
  return counts;
}

async function nonSingleSitePublicRowCounts(pool: Pool): Promise<Record<string, string>> {
  const result = await pool.query<{ table_name: string }>(
    `
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name not like 'gnr8_single_site_%'
    order by table_name asc
    `,
  );
  const counts: Record<string, string> = {};
  for (const row of result.rows) {
    const count = await pool.query<{ count: string }>(`select count(*)::text as count from public.${row.table_name}`);
    counts[row.table_name] = count.rows[0]?.count ?? "0";
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

async function cloneStateCounts(pool: Pool, migrationId: string): Promise<Record<string, string>> {
  const result = await pool.query<{ to_state: string; count: string }>(
    `
    select to_state, count(*)::text as count
    from public.gnr8_single_site_migration_state_events
    where migration_id = $1::uuid
      and to_state in ('clone_generation_started', 'clone_generation_completed', 'clone_review_required', 'migration_failed')
    group by to_state
    `,
    [migrationId],
  );
  return Object.fromEntries(result.rows.map((row) => [row.to_state, row.count]));
}

function actor() {
  return { actorType: "human" as const, actorId: "clone-start-operator", actorRole: "migration_operator" };
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
      actor: { actorType: "human", actorId: "clone-start-operator" },
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

async function createAcceptedReview(input: {
  reviews: SourceEvidenceReviewService;
  migration: Awaited<ReturnType<typeof createMigrationAtReviewBoundary>>;
  suffix: string;
  label: string;
  limited?: boolean;
  rejected?: boolean;
}) {
  const review = await input.reviews.createReview({
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
  for (const category of REQUIRED_CATEGORIES) {
    await input.reviews.addEvidenceItem({
      reviewId: review.review.id,
      migrationId: input.migration.id,
      evidenceCategory: category,
      status: "present",
      actor: actor(),
      correlationId: `corr-item-${input.label}-${category}-${input.suffix}`,
      idempotencyKey: `idem-item-${input.label}-${category}-${input.suffix}`,
    });
  }
  if (input.rejected) {
    await input.reviews.reject({
      reviewId: review.review.id,
      reason: "wrong source",
      actor: actor(),
      correlationId: `corr-reject-${input.label}-${input.suffix}`,
      idempotencyKey: `idem-reject-${input.label}-${input.suffix}`,
    });
    return review.review;
  }
  if (input.limited) {
    await input.reviews.acceptWithLimitations({
      reviewId: review.review.id,
      limitationsJson: [{ category: "font", reason: "accepted fallback font evidence" }],
      aafApprovalDecisionId: randomUUID(),
      actor: actor(),
      correlationId: `corr-limited-${input.label}-${input.suffix}`,
      idempotencyKey: `idem-limited-${input.label}-${input.suffix}`,
    });
    return review.review;
  }
  await input.reviews.accept({
    reviewId: review.review.id,
    actor: actor(),
    correlationId: `corr-accept-${input.label}-${input.suffix}`,
    idempotencyKey: `idem-accept-${input.label}-${input.suffix}`,
  });
  return review.review;
}

function executor(options: { fail?: boolean } = {}): SingleSiteCloneExecutor {
  return {
    async execute(input) {
      if (options.fail) throw Object.assign(new Error("executor failed"), { code: "executor_failed" });
      return {
        status: "completed",
        siteVersionRef: { sourceRecordId: `site-version-${input.migrationId}`, refType: "runtime_site_version_clone" },
        runtimeArtifactRef: { sourceRecordId: `artifact-${input.migrationId}`, refType: "runtime_artifact_clone" },
        previewRef: { sourceRecordId: `preview-${input.migrationId}`, refType: "preview" },
        watermarks: { clone: `watermark-${input.migrationId}` },
      };
    },
  };
}

test("clone start orchestrator uses disposable PostgreSQL state spine and preserves clone boundary guardrails", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const reviews = new SourceEvidenceReviewService(writer);
  const reader = new SingleSiteStateReadRepository(readPool(pool));
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

  try {
    const acceptedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "accepted" });
    await createAcceptedReview({ reviews, migration: acceptedMigration, suffix, label: "accepted" });

    const limitedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "limited" });
    await createAcceptedReview({ reviews, migration: limitedMigration, suffix, label: "limited", limited: true });

    const missingMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "missing" });

    const rejectedMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "rejected" });
    await createAcceptedReview({ reviews, migration: rejectedMigration, suffix, label: "rejected", rejected: true });

    const failingMigration = await createMigrationAtReviewBoundary({ writer, transitions, suffix, label: "failing" });
    await createAcceptedReview({ reviews, migration: failingMigration, suffix, label: "failing" });

    const outsideBefore = await nonSingleSitePublicRowCounts(pool);
    const runtimeBefore = await runtimeProposalCloneTables(pool);
    const dryRunBefore = await tableCounts(pool);
    const dryRun = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "dry_run",
        actor: actor(),
        correlationId: `corr-dry-run-${suffix}`,
        idempotencyKey: `idem-dry-run-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(dryRun.status, "dry_run_allowed");
    assert.deepEqual(await tableCounts(pool), dryRunBefore);

    const blocked = await startSingleSiteCloneGeneration(
      {
        migrationId: missingMigration.id,
        clientId: missingMigration.client_id,
        siteId: missingMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-blocked-${suffix}`,
        idempotencyKey: `idem-blocked-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(blocked.status, "blocked");
    assert.deepEqual(await cloneStateCounts(pool, missingMigration.id), {});

    const rejected = await startSingleSiteCloneGeneration(
      {
        migrationId: rejectedMigration.id,
        clientId: rejectedMigration.client_id,
        siteId: rejectedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-rejected-${suffix}`,
        idempotencyKey: `idem-rejected-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(rejected.status, "blocked");
    assert.deepEqual(await cloneStateCounts(pool, rejectedMigration.id), {});

    const executed = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-execute-${suffix}`,
        idempotencyKey: `idem-execute-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(executed.status, "completed");
    assert.equal(executed.startedStateRecorded, true);
    assert.equal(executed.completedStateRecorded, true);
    assert.equal(executed.reviewRequiredStateRecorded, true);
    assert.deepEqual(await cloneStateCounts(pool, acceptedMigration.id), {
      clone_generation_completed: "1",
      clone_generation_started: "1",
      clone_review_required: "1",
    });

    const retryBefore = await cloneStateCounts(pool, acceptedMigration.id);
    const retry = await startSingleSiteCloneGeneration(
      {
        migrationId: acceptedMigration.id,
        clientId: acceptedMigration.client_id,
        siteId: acceptedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-execute-${suffix}`,
        idempotencyKey: `idem-execute-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(retry.status, "idempotent_replay");
    assert.deepEqual(await cloneStateCounts(pool, acceptedMigration.id), retryBefore);

    const limited = await startSingleSiteCloneGeneration(
      {
        migrationId: limitedMigration.id,
        clientId: limitedMigration.client_id,
        siteId: limitedMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-limited-execute-${suffix}`,
        idempotencyKey: `idem-limited-execute-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor() },
    );
    assert.equal(limited.status, "completed");
    assert.equal(limited.acceptedWithLimitations, true);
    assert.deepEqual(limited.limitations, [{ category: "font", reason: "accepted fallback font evidence" }]);
    assert.match(limited.warnings.join("\n"), /accepted with limitations/);

    const failed = await startSingleSiteCloneGeneration(
      {
        migrationId: failingMigration.id,
        clientId: failingMigration.client_id,
        siteId: failingMigration.site_id,
        mode: "execute",
        actor: actor(),
        correlationId: `corr-failing-${suffix}`,
        idempotencyKey: `idem-failing-${suffix}`,
      },
      { readRepository: reader, transitionService: transitions, executor: executor({ fail: true }) },
    );
    assert.equal(failed.status, "failed");
    assert.equal(failed.failureRecorded, true);
    assert.deepEqual(await cloneStateCounts(pool, failingMigration.id), {
      clone_generation_started: "1",
      migration_failed: "1",
    });

    assert.deepEqual(await runtimeProposalCloneTables(pool), runtimeBefore);
    assert.deepEqual(runtimeBefore, {
      gnr8_runtime_site_versions: null,
      gnr8_runtime_artifacts: null,
      gnr8_runtime_raw_template_artifacts: null,
      gnr8_generated_website_proposals: null,
      gnr8_generated_proposal_bundles: null,
    });
    assert.deepEqual(await nonSingleSitePublicRowCounts(pool), outsideBefore);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
