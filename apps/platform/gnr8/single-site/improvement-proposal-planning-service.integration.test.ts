import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { CloneReviewService } from "./clone-review-service";
import { ImprovementProposalPlanningService } from "./improvement-proposal-planning-service";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const BASE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const PROPOSAL_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql");
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;
const PROPOSAL_TABLES = [
  "gnr8_single_site_improvement_proposal_plans",
  "gnr8_single_site_improvement_proposal_refs",
  "gnr8_single_site_improvement_proposal_recommendations",
  "gnr8_single_site_improvement_proposal_findings",
  "gnr8_single_site_improvement_proposal_events",
  "gnr8_single_site_improvement_proposal_supersessions",
] as const;
const APPEND_ONLY_TABLES = [
  "gnr8_single_site_improvement_proposal_refs",
  "gnr8_single_site_improvement_proposal_events",
  "gnr8_single_site_improvement_proposal_supersessions",
] as const;
const SIDE_EFFECT_REF_ROLES = [
  "active_pointer",
  "proposal_artifact",
  "content_approval",
  "domain_binding",
  "publish_event",
  "subscription",
  "billing_account",
  "stripe_subscription",
] as const;

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
  const containerName = `gnr8-single-site-proposal-${process.pid}-${suffix}`;
  const database = `gnr8_single_site_proposal_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_single_site_proposal_${suffix.replace(/-/g, "")}`;
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
    docker(["cp", PROPOSAL_MIGRATION_PATH, `${containerName}:/tmp/proposal.sql`]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", "/tmp/base.sql"]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", "/tmp/clone.sql"]);
    docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", "/tmp/proposal.sql"]);

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
  return { actorType: "human" as const, actorId: "proposal-integration-operator", actorRole: "migration_operator" };
}

async function createCloneReadyMigration(writer: SingleSiteStateWriterRepository, transitions: SingleSiteStateTransitionService, sourceReviews: SourceEvidenceReviewService, suffix: string) {
  const created = await writer.withTransaction((tx) =>
    writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://proposal-${suffix}.example.test`,
      actor: { actorType: "human", actorId: "proposal-integration-operator" },
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

async function acceptClone(cloneReviews: CloneReviewService, ready: Awaited<ReturnType<typeof createCloneReadyMigration>>, suffix: string, limitations: unknown[] = []) {
  const review = await cloneReviews.createOrReuseReview({
    migrationId: ready.migration.id,
    clientId: ready.migration.client_id,
    siteId: ready.migration.site_id,
    cloneSiteVersionRef: `clone-version-${suffix}`,
    runtimeArtifactRef: `runtime-artifact-${suffix}`,
    sourceEvidenceReviewRef: ready.sourceReview.id,
    cloneGenerationRef: `clone-generation-${suffix}`,
    actor: actor(),
    correlationId: `corr-clone-review-create-${suffix}`,
    idempotencyKey: `idem-clone-review-create-${suffix}`,
  });
  if (limitations.length > 0) {
    await cloneReviews.acceptWithLimitations({
      reviewId: review.review.id,
      limitationsJson: limitations,
      actor: actor(),
      correlationId: `corr-clone-limit-${suffix}`,
      idempotencyKey: `idem-clone-limit-${suffix}`,
    });
  } else {
    await cloneReviews.accept({
      reviewId: review.review.id,
      actor: actor(),
      correlationId: `corr-clone-accept-${suffix}`,
      idempotencyKey: `idem-clone-accept-${suffix}`,
    });
  }
  return review.review;
}

async function assertAppendOnly(pool: Pool, tableName: string): Promise<void> {
  const idResult = await pool.query<{ id: string }>(`select id::text from public.${tableName} limit 1`);
  assert.ok(idResult.rows[0], `${tableName} should have a row for append-only assertion`);
  await assert.rejects(() => pool.query(`update public.${tableName} set id = id where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
  await assert.rejects(() => pool.query(`delete from public.${tableName} where id = $1::uuid`, [idResult.rows[0].id]), /append-only/i);
}

test("improvement proposal planning persists and projects in disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const sourceReviews = new SourceEvidenceReviewService(writer);
  const cloneReviews = new CloneReviewService(writer);
  const proposals = new ImprovementProposalPlanningService(writer);
  const reader = new SingleSiteStateReadRepository(readPool(pool));

  try {
    const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relname = any($1::text[]) order by relname",
      [[...PROPOSAL_TABLES]],
    );
    assert.equal(rls.rows.length, PROPOSAL_TABLES.length);
    assert.ok(rls.rows.every((row) => row.relrowsecurity));

    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const ready = await createCloneReadyMigration(writer, transitions, sourceReviews, suffix);
    const acceptedReview = await acceptClone(cloneReviews, ready, suffix, [{ category: "font", reason: "source font unavailable" }]);
    let model = await reader.readByMigrationId(ready.migration.id);
    assert.equal(model?.recommendedNextAction.actionKey, "start_improvement_proposal_planning");

    const plan = await proposals.createOrReuseProposalPlan({
      migrationId: ready.migration.id,
      clientId: ready.migration.client_id,
      siteId: ready.migration.site_id ?? "",
      cloneReviewId: acceptedReview.id,
      cloneSiteVersionRef: acceptedReview.clone_site_version_ref,
      runtimeArtifactRef: acceptedReview.runtime_artifact_ref,
      sourceEvidenceReviewId: acceptedReview.source_evidence_review_id,
      title: "Manual improvement proposal",
      summary: "Plan only, no implementation.",
      actor: actor(),
      correlationId: `corr-proposal-create-${suffix}`,
      idempotencyKey: `idem-proposal-create-${suffix}`,
    });
    assert.deepEqual(plan.plan.limitations_json, [{ category: "font", reason: "source font unavailable" }]);

    await proposals.addFinding({
      planId: plan.plan.id,
      migrationId: ready.migration.id,
      findingKey: "hero-copy",
      category: "content_clarity",
      risk: "medium",
      impact: "high",
      summary: "Hero copy is faithful but unclear.",
      actor: actor(),
      correlationId: `corr-finding-${suffix}`,
      idempotencyKey: `idem-finding-${suffix}`,
    });
    await proposals.addRecommendation({
      planId: plan.plan.id,
      migrationId: ready.migration.id,
      recommendationKey: "hero-copy",
      title: "Clarify hero copy",
      category: "content_clarity",
      risk: "low",
      impact: "high",
      effort: "small",
      rationale: "Improve clarity while preserving the accepted clone boundary.",
      actor: actor(),
      correlationId: `corr-recommendation-${suffix}`,
      idempotencyKey: `idem-recommendation-${suffix}`,
    });
    model = await reader.readByMigrationId(ready.migration.id);
    assert.equal(model?.improvementProposalPlanning.proposalStatus, "draft");
    assert.equal(model?.improvementProposalPlanning.recommendationCount, 1);
    assert.equal(model?.improvementProposalPlanning.findingsCount, 1);
    assert.equal(model?.improvementProposalPlanning.recommendationsByCategory.content_clarity, 1);
    assert.equal(model?.recommendedNextAction.actionKey, "complete_proposal_draft");

    await proposals.markReadyForReview({
      planId: plan.plan.id,
      actor: actor(),
      correlationId: `corr-ready-${suffix}`,
      idempotencyKey: `idem-ready-${suffix}`,
    });
    model = await reader.readByMigrationId(ready.migration.id);
    assert.equal(model?.improvementProposalPlanning.proposalStatus, "ready_for_review");
    assert.equal(model?.recommendedNextAction.actionKey, "review_improvement_proposal");

    await proposals.startReview({
      planId: plan.plan.id,
      actor: actor(),
      correlationId: `corr-review-${suffix}`,
      idempotencyKey: `idem-review-${suffix}`,
    });
    await proposals.approveWithLimitations({
      planId: plan.plan.id,
      limitationsJson: [{ scope: "copy recommendations only" }],
      approvalRefsJson: { proposalApprovalDecisionId: "proposal-approval-decision-1" },
      actor: actor(),
      correlationId: `corr-approve-limit-${suffix}`,
      idempotencyKey: `idem-approve-limit-${suffix}`,
    });
    model = await reader.readByMigrationId(ready.migration.id);
    assert.equal(model?.improvementProposalPlanning.proposalStatus, "approved_with_limitations");
    assert.equal(model?.improvementProposalPlanning.implementationAuthorizationReady, false);
    assert.equal(model?.recommendedNextAction.actionKey, "request_implementation_authorization_with_limitations");

    const authorization = await proposals.attachImplementationAuthorizationRef({
      planId: plan.plan.id,
      refType: "aaf_approval_decision",
      sourceRecordId: "implementation-authorization-decision-1",
      authorizationRefsJson: { implementationAuthorizationDecisionId: "implementation-authorization-decision-1" },
      actor: actor(),
      correlationId: `corr-auth-${suffix}`,
      idempotencyKey: `idem-auth-${suffix}`,
    });
    assert.notEqual(authorization.refId, plan.eventId);
    model = await reader.readByMigrationId(ready.migration.id);
    assert.equal(model?.improvementProposalPlanning.implementationAuthorizationReady, true);
    assert.equal(model?.improvementProposalPlanning.implementationAuthorizationRefs.implementationAuthorizationDecisionId, "implementation-authorization-decision-1");

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
      reason: "clone retry required",
      actor: actor(),
      correlationId: `corr-retry-${retrySuffix}`,
      idempotencyKey: `idem-retry-${retrySuffix}`,
    });
    await assert.rejects(
      () =>
        proposals.createOrReuseProposalPlan({
          migrationId: retryReady.migration.id,
          clientId: retryReady.migration.client_id,
          siteId: retryReady.migration.site_id ?? "",
          cloneReviewId: retryReview.review.id,
          cloneSiteVersionRef: retryReview.review.clone_site_version_ref,
          runtimeArtifactRef: retryReview.review.runtime_artifact_ref,
          actor: actor(),
          correlationId: `corr-proposal-retry-block-${retrySuffix}`,
          idempotencyKey: `idem-proposal-retry-block-${retrySuffix}`,
        }),
      /proposal planning is blocked/,
    );

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
      reason: "clone rejected",
      actor: actor(),
      correlationId: `corr-rejected-${rejectedSuffix}`,
      idempotencyKey: `idem-rejected-${rejectedSuffix}`,
    });
    await assert.rejects(
      () =>
        proposals.createOrReuseProposalPlan({
          migrationId: rejectedReady.migration.id,
          clientId: rejectedReady.migration.client_id,
          siteId: rejectedReady.migration.site_id ?? "",
          cloneReviewId: rejectedReview.review.id,
          cloneSiteVersionRef: rejectedReview.review.clone_site_version_ref,
          runtimeArtifactRef: rejectedReview.review.runtime_artifact_ref,
          actor: actor(),
          correlationId: `corr-proposal-rejected-block-${rejectedSuffix}`,
          idempotencyKey: `idem-proposal-rejected-block-${rejectedSuffix}`,
        }),
      /proposal planning is blocked/,
    );

    const supersedeSuffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const supersedeReady = await createCloneReadyMigration(writer, transitions, sourceReviews, supersedeSuffix);
    const supersedeReview = await acceptClone(cloneReviews, supersedeReady, supersedeSuffix);
    const supersededPlan = await proposals.createOrReuseProposalPlan({
      migrationId: supersedeReady.migration.id,
      clientId: supersedeReady.migration.client_id,
      siteId: supersedeReady.migration.site_id ?? "",
      cloneReviewId: supersedeReview.id,
      cloneSiteVersionRef: supersedeReview.clone_site_version_ref,
      runtimeArtifactRef: supersedeReview.runtime_artifact_ref,
      actor: actor(),
      correlationId: `corr-proposal-supersede-create-${supersedeSuffix}`,
      idempotencyKey: `idem-proposal-supersede-create-${supersedeSuffix}`,
    });
    await proposals.supersede({
      planId: supersededPlan.plan.id,
      reason: "new proposal revision needed",
      actor: actor(),
      correlationId: `corr-proposal-supersede-${supersedeSuffix}`,
      idempotencyKey: `idem-proposal-supersede-${supersedeSuffix}`,
    });

    for (const tableName of APPEND_ONLY_TABLES) await assertAppendOnly(pool, tableName);
    const policies = await pool.query<{ count: string }>("select count(*)::text from pg_policies where schemaname = 'public' and tablename = any($1::text[])", [[...PROPOSAL_TABLES]]);
    assert.equal(policies.rows[0]?.count, "0");
    const sideEffectRefs = await pool.query<{ count: string }>(
      "select count(*)::text from public.gnr8_single_site_migration_refs where ref_role = any($1::text[])",
      [[...SIDE_EFFECT_REF_ROLES]],
    );
    assert.equal(sideEffectRefs.rows[0]?.count, "0");
    const generatedTables = await pool.query<{ table_name: string | null }>(
      "select to_regclass('public.gnr8_generated_website_proposals')::text as table_name union all select to_regclass('public.gnr8_generated_proposal_bundles')::text",
    );
    assert.deepEqual(generatedTables.rows.map((row) => row.table_name), [null, null]);
    const runtimeTables = await pool.query<{ table_name: string | null }>(
      "select to_regclass('public.gnr8_runtime_site_versions')::text as table_name union all select to_regclass('public.gnr8_runtime_artifacts')::text union all select to_regclass('public.gnr8_runtime_active_pointers')::text",
    );
    assert.deepEqual(runtimeTables.rows.map((row) => row.table_name), [null, null, null]);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
