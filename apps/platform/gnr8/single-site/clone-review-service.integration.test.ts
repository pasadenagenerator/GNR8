import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { CloneReviewService } from "./clone-review-service";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const BASE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
const APPEND_ONLY_TABLES = ["gnr8_single_site_clone_review_refs", "gnr8_single_site_clone_review_events"] as const;
const SIDE_EFFECT_REF_ROLES = ["active_pointer", "proposal_artifact", "proposal_approval", "publish_event", "domain_binding", "subscription", "billing_account", "stripe_subscription"] as const;

type DisposablePostgres = {
  containerName: string;
  connectionString: string;
};

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
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
  const containerName = `gnr8-single-site-clone-review-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_clone_review_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_clone_review_${suffix.replace(/-/g, "")}`;
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

    docker(["cp", BASE_MIGRATION_PATH, `${containerName}:/tmp/base.sql`]);
    docker(["cp", CLONE_MIGRATION_PATH, `${containerName}:/tmp/clone.sql`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", "/tmp/base.sql"]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", "/tmp/clone.sql"]);

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return { containerName, connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}` };
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
      return await pool.connect();
    },
  };
}

function actor() {
  return { actorType: "human" as const, actorId: "clone-review-integration-operator", actorRole: "migration_operator" };
}

async function createCloneReadyMigration(writer: SingleSiteStateWriterRepository, transitions: SingleSiteStateTransitionService, sourceReviews: SourceEvidenceReviewService, suffix: string) {
  const created = await writer.withTransaction((tx) =>
    writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://clone-review-${suffix}.example.test`,
      actor: { actorType: "human", actorId: "clone-review-integration-operator" },
      correlationId: `corr-create-${suffix}`,
      idempotencyKey: `idem-create-${suffix}`,
    }),
  );
  for (const [toState, key] of [
    ["source_capture_started", "capture-start"],
    ["source_capture_completed", "capture-complete"],
    ["source_evidence_review_required", "source-review-required"],
  ] as const) {
    await transitions.transition({
      migrationId: created.row.id,
      toState,
      actor: actor(),
      correlationId: `corr-${key}-${suffix}`,
      idempotencyKey: `idem-${key}-${suffix}`,
    });
  }
  const sourceReview = await sourceReviews.createReview({
    migrationId: created.row.id,
    tenantId: created.row.tenant_id,
    clientId: created.row.client_id,
    siteId: created.row.site_id,
    sourceUrl: created.row.source_url,
    sourceEvidencePackageKey: `package-${suffix}`,
    sourceWatermark: `watermark-${suffix}`,
    evidenceCapturedAt: "2026-07-30T12:00:00.000Z",
    completenessStatus: "complete",
    actor: actor(),
    correlationId: `corr-source-review-${suffix}`,
    idempotencyKey: `idem-source-review-${suffix}`,
  });
  for (const category of REQUIRED_CATEGORIES) {
    await sourceReviews.addEvidenceItem({
      reviewId: sourceReview.review.id,
      migrationId: created.row.id,
      evidenceCategory: category,
      status: "present",
      actor: actor(),
      correlationId: `corr-source-item-${category}-${suffix}`,
      idempotencyKey: `idem-source-item-${category}-${suffix}`,
    });
  }
  await sourceReviews.accept({
    reviewId: sourceReview.review.id,
    actor: actor(),
    correlationId: `corr-source-accept-${suffix}`,
    idempotencyKey: `idem-source-accept-${suffix}`,
  });
  await transitions.transition({
    migrationId: created.row.id,
    toState: "clone_generation_started",
    actor: actor(),
    sourceEvidenceReviewId: sourceReview.review.id,
    correlationId: `corr-clone-start-${suffix}`,
    idempotencyKey: `idem-clone-start-${suffix}`,
    refs: [
      { refRole: "source_evidence_review", refType: "source_evidence_review", sourceRecordId: sourceReview.review.id, idempotencyKey: `idem-clone-start-review-ref-${suffix}` },
      { refRole: "source_evidence_package", refType: "source_evidence_package", sourceRecordId: `package-${suffix}`, idempotencyKey: `idem-clone-start-package-ref-${suffix}` },
    ],
  });
  await transitions.transition({
    migrationId: created.row.id,
    toState: "clone_generation_completed",
    actor: actor(),
    correlationId: `corr-clone-complete-${suffix}`,
    idempotencyKey: `idem-clone-complete-${suffix}`,
  });
  return { migration: created.row, sourceReview: sourceReview.review };
}

async function assertAppendOnly(pool: Pool, tableName: string): Promise<void> {
  const idResult = await pool.query<{ id: string }>(`select id::text from public.${tableName} limit 1`);
  assert.ok(idResult.rows[0]);
  await assert.rejects(() => pool.query(`update public.${tableName} set id = id where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
  await assert.rejects(() => pool.query(`delete from public.${tableName} where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
}

test("clone review service persists and projects fidelity decisions in disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const sourceReviews = new SourceEvidenceReviewService(writer);
  const cloneReviews = new CloneReviewService(writer);
  const reader = new SingleSiteStateReadRepository(readPool(pool));

  try {
    const acceptedSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const acceptedReady = await createCloneReadyMigration(writer, transitions, sourceReviews, acceptedSuffix);
    const review = await cloneReviews.createOrReuseReview({
      migrationId: acceptedReady.migration.id,
      clientId: acceptedReady.migration.client_id,
      siteId: acceptedReady.migration.site_id,
      cloneSiteVersionRef: `clone-version-${acceptedSuffix}`,
      runtimeArtifactRef: `runtime-artifact-${acceptedSuffix}`,
      sourceEvidenceReviewRef: acceptedReady.sourceReview.id,
      cloneGenerationRef: `clone-generation-${acceptedSuffix}`,
      actor: actor(),
      correlationId: `corr-clone-review-create-${acceptedSuffix}`,
      idempotencyKey: `idem-clone-review-create-${acceptedSuffix}`,
    });
    await cloneReviews.addFinding({
      reviewId: review.review.id,
      migrationId: acceptedReady.migration.id,
      itemKey: "header-spacing",
      fidelityCategory: "spacing",
      severity: "p2_minor",
      findingSummary: "Header spacing is slightly wider than source.",
      actor: actor(),
      correlationId: `corr-clone-finding-${acceptedSuffix}`,
      idempotencyKey: `idem-clone-finding-${acceptedSuffix}`,
    });
    await cloneReviews.accept({
      reviewId: review.review.id,
      actor: actor(),
      correlationId: `corr-clone-accept-${acceptedSuffix}`,
      idempotencyKey: `idem-clone-accept-${acceptedSuffix}`,
    });
    const acceptedModel = await reader.readByMigrationId(acceptedReady.migration.id);
    assert.equal(acceptedModel?.currentState.state, "clone_review_required");
    assert.equal(acceptedModel?.cloneReview.reviewStatus, "accepted");
    assert.equal(acceptedModel?.cloneReview.cloneAcceptanceReady, true);
    assert.equal(acceptedModel?.cloneReview.findingCountsBySeverity.p2_minor, 1);
    assert.equal(acceptedModel?.recommendedNextAction.actionKey, "prepare_improvement_proposal");

    const retrySuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const retryReady = await createCloneReadyMigration(writer, transitions, sourceReviews, retrySuffix);
    const retryReview = await cloneReviews.createOrReuseReview({
      migrationId: retryReady.migration.id,
      clientId: retryReady.migration.client_id,
      siteId: retryReady.migration.site_id,
      cloneSiteVersionRef: `clone-version-${retrySuffix}`,
      runtimeArtifactRef: `runtime-artifact-${retrySuffix}`,
      sourceEvidenceReviewRef: retryReady.sourceReview.id,
      actor: actor(),
      correlationId: `corr-clone-review-create-${retrySuffix}`,
      idempotencyKey: `idem-clone-review-create-${retrySuffix}`,
    });
    await cloneReviews.requireRetry({
      reviewId: retryReview.review.id,
      reason: "critical hero image mismatch",
      actor: actor(),
      correlationId: `corr-clone-retry-${retrySuffix}`,
      idempotencyKey: `idem-clone-retry-${retrySuffix}`,
    });
    const retryModel = await reader.readByMigrationId(retryReady.migration.id);
    assert.equal(retryModel?.cloneReview.reviewStatus, "retry_required");
    assert.equal(retryModel?.workflowReadiness.cloneProposalPlanningAllowed, false);
    assert.equal(retryModel?.recommendedNextAction.actionKey, "retry_clone_generation");

    const limitedSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const limitedReady = await createCloneReadyMigration(writer, transitions, sourceReviews, limitedSuffix);
    const limitedReview = await cloneReviews.createOrReuseReview({
      migrationId: limitedReady.migration.id,
      clientId: limitedReady.migration.client_id,
      siteId: limitedReady.migration.site_id,
      cloneSiteVersionRef: `clone-version-${limitedSuffix}`,
      runtimeArtifactRef: `runtime-artifact-${limitedSuffix}`,
      sourceEvidenceReviewRef: limitedReady.sourceReview.id,
      actor: actor(),
      correlationId: `corr-clone-review-create-${limitedSuffix}`,
      idempotencyKey: `idem-clone-review-create-${limitedSuffix}`,
    });
    await cloneReviews.acceptWithLimitations({
      reviewId: limitedReview.review.id,
      limitationsJson: [{ category: "font", reason: "source font unavailable; fallback accepted" }],
      actor: actor(),
      correlationId: `corr-clone-limit-${limitedSuffix}`,
      idempotencyKey: `idem-clone-limit-${limitedSuffix}`,
    });
    const limitedModel = await reader.readByMigrationId(limitedReady.migration.id);
    assert.equal(limitedModel?.cloneReview.reviewStatus, "accepted_with_limitations");
    assert.deepEqual(limitedModel?.cloneReview.limitations, [{ category: "font", reason: "source font unavailable; fallback accepted" }]);
    assert.equal(limitedModel?.recommendedNextAction.actionKey, "prepare_improvement_proposal_with_limitations");

    const rejectedSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const rejectedReady = await createCloneReadyMigration(writer, transitions, sourceReviews, rejectedSuffix);
    const rejectedReview = await cloneReviews.createOrReuseReview({
      migrationId: rejectedReady.migration.id,
      clientId: rejectedReady.migration.client_id,
      siteId: rejectedReady.migration.site_id,
      cloneSiteVersionRef: `clone-version-${rejectedSuffix}`,
      runtimeArtifactRef: `runtime-artifact-${rejectedSuffix}`,
      sourceEvidenceReviewRef: rejectedReady.sourceReview.id,
      actor: actor(),
      correlationId: `corr-clone-review-create-${rejectedSuffix}`,
      idempotencyKey: `idem-clone-review-create-${rejectedSuffix}`,
    });
    await cloneReviews.reject({
      reviewId: rejectedReview.review.id,
      reason: "clone does not match source navigation",
      actor: actor(),
      correlationId: `corr-clone-reject-${rejectedSuffix}`,
      idempotencyKey: `idem-clone-reject-${rejectedSuffix}`,
    });
    assert.equal((await reader.readByMigrationId(rejectedReady.migration.id))?.cloneReview.proposalPlanningAllowed, false);

    for (const tableName of APPEND_ONLY_TABLES) await assertAppendOnly(pool, tableName);
    const sideEffectRefs = await pool.query<{ count: string }>(
      "select count(*)::text from public.gnr8_single_site_migration_refs where ref_role = any($1::text[])",
      [[...SIDE_EFFECT_REF_ROLES]],
    );
    assert.equal(sideEffectRefs.rows[0]?.count, "0");
    const proposalTables = await pool.query<{ table_name: string | null }>(
      "select to_regclass('public.gnr8_generated_website_proposals')::text as table_name union all select to_regclass('public.gnr8_generated_proposal_bundles')::text",
    );
    assert.deepEqual(proposalTables.rows.map((row) => row.table_name), [null, null]);
    const policies = await pool.query<{ count: string }>("select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'gnr8_single_site_clone_review%'");
    assert.equal(policies.rows[0]?.count, "0");
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
