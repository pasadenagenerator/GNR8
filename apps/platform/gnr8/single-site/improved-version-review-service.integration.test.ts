import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { ImprovedVersionReviewService } from "./improved-version-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260730120000_single_site_clone_review_core.sql",
  "20260730143000_single_site_improvement_proposal_planning_core.sql",
  "20260731120000_single_site_improvement_execution_core.sql",
  "20260731143000_single_site_improved_version_review_core.sql",
] as const;

const REVIEW_TABLES = [
  "gnr8_single_site_improved_version_reviews",
  "gnr8_single_site_improved_version_review_refs",
  "gnr8_single_site_improved_version_review_items",
  "gnr8_single_site_improved_version_review_events",
  "gnr8_single_site_improved_version_review_supersessions",
] as const;

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

async function startDisposablePostgres() {
  const suffix = randomUUID().slice(0, 8);
  const containerName = `gnr8-improved-review-${process.pid}-${suffix}`;
  const database = `gnr8_improved_review_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_improved_review_${suffix.replace(/-/g, "")}`;
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

    for (const migrationName of MIGRATIONS) {
      const migrationPath = path.resolve(PLATFORM_ROOT, "supabase/migrations", migrationName);
      docker(["cp", migrationPath, `${containerName}:/tmp/${migrationName}`]);
      docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${migrationName}`]);
    }

    const port = parsePublishedPort(docker(["port", containerName, "5432/tcp"]));
    return { containerName, connectionString: `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${encodeURIComponent(database)}` };
  } catch (error) {
    try {
      docker(["stop", containerName]);
    } catch {
      // Best-effort cleanup for disposable DB setup failure.
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
  return { actorType: "human" as const, actorId: "improved-review-integration-operator", actorRole: "migration_operator" };
}

async function seedCompletedExecution(writer: SingleSiteStateWriterRepository, suffix: string) {
  return writer.withTransaction(async (tx) => {
    const created = await writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://improved-review-${suffix}.example.test`,
      currentState: "improvement_implementation_completed",
      actor: { actorType: "human", actorId: "improved-review-integration-operator" },
      correlationId: `corr-migration-${suffix}`,
      idempotencyKey: `idem-migration-${suffix}`,
    });
    const sourceReview = await writer.createSourceEvidenceReview(tx, {
      migrationId: created.row.id,
      tenantId: created.row.tenant_id,
      clientId: created.row.client_id,
      siteId: created.row.site_id,
      sourceUrl: created.row.source_url,
      sourceEvidencePackageKey: `source-package-${suffix}`,
      sourceWatermark: `source-watermark-${suffix}`,
      evidenceCapturedAt: "2026-07-31T12:00:00.000Z",
      completenessStatus: "complete",
      correlationId: `corr-source-${suffix}`,
      idempotencyKey: `idem-source-${suffix}`,
    });
    const cloneReview = await writer.createCloneReview(tx, {
      migrationId: created.row.id,
      clientId: created.row.client_id,
      siteId: created.row.site_id,
      cloneSiteVersionRef: `clone-version-${suffix}`,
      runtimeArtifactRef: `clone-artifact-${suffix}`,
      sourceEvidenceReviewId: sourceReview.row.id,
      correlationId: `corr-clone-${suffix}`,
      idempotencyKey: `idem-clone-${suffix}`,
    });
    const plan = await writer.createImprovementProposalPlan(tx, {
      tenantId: created.row.tenant_id,
      clientId: created.row.client_id,
      siteId: created.row.site_id ?? randomUUID(),
      migrationId: created.row.id,
      cloneReviewId: cloneReview.row.id,
      sourceEvidenceReviewId: sourceReview.row.id,
      cloneSiteVersionRef: cloneReview.row.clone_site_version_ref,
      runtimeArtifactRef: cloneReview.row.runtime_artifact_ref,
      planStatus: "approved",
      planVersion: 1,
      approvalRefsJson: {
        approvalRequestId: `proposal-request-${suffix}`,
        approvalDecisionId: `proposal-decision-${suffix}`,
        evidencePackageId: `proposal-evidence-${suffix}`,
        sourceWatermark: `proposal-watermark-${suffix}`,
      },
      implementationAuthorizationRefsJson: {
        implementationAuthorizationRequestId: `auth-request-${suffix}`,
        implementationAuthorizationDecisionId: `auth-decision-${suffix}`,
        implementationAuthorizationEvidencePackageId: `auth-evidence-${suffix}`,
        implementationAuthorizationValidationStatus: "granted",
      },
      implementationAuthorizationAttached: true,
      actor: actor(),
      semanticWatermark: `proposal-plan-watermark-${suffix}`,
      correlationId: `corr-plan-${suffix}`,
      idempotencyKey: `idem-plan-${suffix}`,
    });
    const recommendation = await writer.upsertImprovementProposalRecommendation(tx, {
      planId: plan.row.id,
      migrationId: created.row.id,
      recommendationKey: "hero-copy",
      title: "Clarify hero copy",
      category: "content_clarity",
      rationale: "Approved recommendation fixture.",
      actor: actor(),
      correlationId: `corr-rec-${suffix}`,
      idempotencyKey: `idem-rec-${suffix}`,
    });
    const attempt = await writer.createImprovementExecutionAttempt(tx, {
      tenantId: created.row.tenant_id,
      clientId: created.row.client_id,
      siteId: created.row.site_id ?? randomUUID(),
      migrationId: created.row.id,
      proposalPlanId: plan.row.id,
      proposalPlanVersion: plan.row.plan_version,
      proposalPlanSemanticWatermark: plan.row.semantic_watermark ?? `proposal-plan-watermark-${suffix}`,
      proposalApprovalDecisionId: `proposal-decision-${suffix}`,
      implementationAuthorizationRequestId: `auth-request-${suffix}`,
      implementationAuthorizationDecisionId: `auth-decision-${suffix}`,
      implementationAuthorizationEvidencePackageId: `auth-evidence-${suffix}`,
      cloneReviewId: cloneReview.row.id,
      cloneSiteVersionRef: cloneReview.row.clone_site_version_ref,
      cloneRuntimeArtifactRef: cloneReview.row.runtime_artifact_ref,
      sourceEvidenceReviewId: sourceReview.row.id,
      selectedRecommendationRefsJson: [{ recommendationId: recommendation.id, sourceRecordId: recommendation.id, recommendationKey: recommendation.recommendation_key }],
      executionMode: "execute",
      status: "completed",
      validationSummaryJson: { allowed: true, mode: "allowed" },
      semanticInputWatermark: `execution-input-watermark-${suffix}`,
      semanticOutputWatermark: `execution-output-watermark-${suffix}`,
      improvedCandidateSiteVersionRef: `improved-version-${suffix}`,
      improvedRuntimeArtifactRef: `improved-artifact-${suffix}`,
      outputRefsJson: { plannedChangeSetRef: `planned-change-set-${suffix}` },
      actor: actor(),
      correlationId: `corr-attempt-${suffix}`,
      idempotencyKey: `idem-attempt-${suffix}`,
    });
    return { migration: created.row, sourceReview: sourceReview.row, cloneReview: cloneReview.row, plan: plan.row, recommendation, attempt: attempt.row };
  });
}

test("improved version review persists and projects acceptance in disposable PostgreSQL", async () => {
  const pg = await startDisposablePostgres();
  const pool = new Pool({ connectionString: pg.connectionString });
  try {
    const writer = new SingleSiteStateWriterRepository(writerPool(pool));
    const service = new ImprovedVersionReviewService(writer);
    const reader = new SingleSiteStateReadRepository(readPool(pool));
    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedCompletedExecution(writer, suffix);

    const rls = await pool.query(
      `
      select relname, relrowsecurity
      from pg_class
      where relname = any($1::text[])
      order by relname
      `,
      [REVIEW_TABLES],
    );
    assert.equal(rls.rows.length, REVIEW_TABLES.length);
    assert.equal(rls.rows.every((row) => row.relrowsecurity === true), true);

    const created = await service.createOrReuseReview({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      executionAttemptId: seeded.attempt.id,
      actor: actor(),
      correlationId: `corr-review-create-${suffix}`,
      idempotencyKey: `idem-review-create-${suffix}`,
    });
    await service.addFinding({
      reviewId: created.review.id,
      migrationId: seeded.migration.id,
      itemKey: "proposal-alignment-ok",
      category: "proposal_alignment",
      severity: "p2_minor",
      status: "resolved",
      requiredRecommendationApplied: true,
      recommendationId: seeded.recommendation.id,
      findingSummary: "Approved recommendation is reflected in the improved candidate.",
      actor: actor(),
      correlationId: `corr-review-item-${suffix}`,
      idempotencyKey: `idem-review-item-${suffix}`,
    });
    await service.markReadyForReview({ reviewId: created.review.id, actor: actor(), correlationId: `corr-review-ready-${suffix}`, idempotencyKey: `idem-review-ready-${suffix}` });
    await service.startReview({ reviewId: created.review.id, actor: actor(), correlationId: `corr-review-start-${suffix}`, idempotencyKey: `idem-review-start-${suffix}` });
    const accepted = await service.accept({
      reviewId: created.review.id,
      proposalAlignmentSummaryJson: { appliedRequiredRecommendationCount: 1 },
      actor: actor(),
      correlationId: `corr-review-accept-${suffix}`,
      idempotencyKey: `idem-review-accept-${suffix}`,
    });

    assert.equal(accepted.review.review_status, "accepted");
    assert.equal(accepted.review.content_approval_ready, true);
    assert.equal(accepted.review.content_approval_granted, false);
    assert.equal(accepted.review.active_pointer_changed, false);
    assert.equal(accepted.review.runtime_artifacts_mutated, false);
    assert.equal(accepted.review.site_versions_mutated, false);

    const limitedSeed = await seedCompletedExecution(writer, `${suffix}-limited`);
    const limitedCreated = await service.createOrReuseReview({
      migrationId: limitedSeed.migration.id,
      clientId: limitedSeed.migration.client_id,
      siteId: limitedSeed.migration.site_id ?? "",
      executionAttemptId: limitedSeed.attempt.id,
      actor: actor(),
      correlationId: `corr-review-create-limited-${suffix}`,
      idempotencyKey: `idem-review-create-limited-${suffix}`,
    });
    const limited = await service.acceptWithLimitations({
      reviewId: limitedCreated.review.id,
      limitationsJson: [{ summary: "Manual content pass remains separate." }],
      actor: actor(),
      correlationId: `corr-review-limited-${suffix}`,
      idempotencyKey: `idem-review-limited-${suffix}`,
    });
    assert.equal(limited.review.review_status, "accepted_with_limitations");
    assert.deepEqual(limited.review.limitations_json, [{ summary: "Manual content pass remains separate." }]);

    const retrySeed = await seedCompletedExecution(writer, `${suffix}-retry`);
    const retryCreated = await service.createOrReuseReview({
      migrationId: retrySeed.migration.id,
      clientId: retrySeed.migration.client_id,
      siteId: retrySeed.migration.site_id ?? "",
      executionAttemptId: retrySeed.attempt.id,
      actor: actor(),
      correlationId: `corr-review-create-retry-${suffix}`,
      idempotencyKey: `idem-review-create-retry-${suffix}`,
    });
    const retry = await service.requireRetry({
      reviewId: retryCreated.review.id,
      reason: "Needs implementation retry.",
      actor: actor(),
      correlationId: `corr-review-retry-${suffix}`,
      idempotencyKey: `idem-review-retry-${suffix}`,
    });
    assert.equal(retry.review.content_approval_ready, false);

    const model = await reader.readByMigrationId(seeded.migration.id);
    assert.equal(model?.improvedVersionReview.reviewStatus, "accepted");
    assert.equal(model?.improvedVersionReview.acceptedReadinessForContentApproval, true);
    assert.equal(model?.improvedVersionReview.reviewedCandidateSiteVersionRef, `improved-version-${suffix}`);
    assert.equal(model?.recommendedNextAction.actionKey, "prepare_content_approval");

    const refRow = await pool.query("select id from public.gnr8_single_site_improved_version_review_refs limit 1");
    await assert.rejects(
      () => pool.query("update public.gnr8_single_site_improved_version_review_refs set metadata_json = '{}'::jsonb where id = $1::uuid", [refRow.rows[0].id]),
      /append-only/,
    );
    const eventRow = await pool.query("select id from public.gnr8_single_site_improved_version_review_events limit 1");
    await assert.rejects(
      () => pool.query("delete from public.gnr8_single_site_improved_version_review_events where id = $1::uuid", [eventRow.rows[0].id]),
      /append-only/,
    );

    const forbidden = await pool.query(`
      select
        (select count(*) from public.gnr8_single_site_migration_refs where ref_role in ('active_pointer', 'publish_event', 'domain_binding', 'subscription', 'stripe_subscription')) as forbidden_ref_count,
        (select count(*) from public.gnr8_single_site_improved_version_reviews where content_approval_granted or client_approval_granted or launch_approval_granted or publish_activation_approval_granted or active_pointer_changed or runtime_artifacts_mutated or site_versions_mutated) as forbidden_review_count
    `);
    assert.equal(Number(forbidden.rows[0].forbidden_ref_count), 0);
    assert.equal(Number(forbidden.rows[0].forbidden_review_count), 0);
  } finally {
    await pool.end();
    docker(["stop", pg.containerName]);
  }
});
