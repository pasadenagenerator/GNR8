import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { ClientApprovalService, type ClientApprovalAafValidationResult } from "./client-approval-service";
import { ContentApprovalService } from "./content-approval-service";
import type { ContentApprovalAafValidationResult } from "./content-approval-aaf-bridge";
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
  "20260803143000_single_site_content_approval_core.sql",
  "20260803190000_single_site_client_approval_core.sql",
] as const;

const CLIENT_APPROVAL_TABLES = [
  "gnr8_single_site_client_approvals",
  "gnr8_single_site_client_approval_refs",
  "gnr8_single_site_client_approval_items",
  "gnr8_single_site_client_approval_events",
  "gnr8_single_site_client_approval_supersessions",
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
  const containerName = `gnr8-client-approval-${process.pid}-${suffix}`;
  const database = `gnr8_client_approval_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_client_approval_${suffix.replace(/-/g, "")}`;
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
  return { actorType: "human" as const, actorId: "client-approval-integration-operator", actorRole: "migration_operator" };
}

function validation(decisionId: string, reviewId: string, status: "granted" | "granted_with_limitations" = "granted"): ContentApprovalAafValidationResult {
  return {
    valid: true,
    status,
    scope: "single_site_content_approval",
    subjectType: "single_site_improved_version_review",
    subjectId: reviewId,
    approvalRequestId: `request-for-${decisionId}`,
    approvalDecisionId: decisionId,
    evidencePackageId: `evidence-for-${decisionId}`,
    limitations: status === "granted_with_limitations" ? [{ summary: "Accepted manual caveat." }] : [],
    blockerCodes: [],
    semanticWatermark: `single-site-content-approval:${decisionId}`,
  };
}

function clientValidation(decisionId: string, clientApprovalId: string, status: "granted" | "granted_with_limitations" = "granted"): ClientApprovalAafValidationResult {
  return {
    valid: true,
    status,
    scope: "single_site_client_approval",
    subjectType: "single_site_improved_candidate_client_acceptance",
    subjectId: clientApprovalId,
    approvalRequestId: `client-request-for-${decisionId}`,
    approvalDecisionId: decisionId,
    evidencePackageId: `client-evidence-for-${decisionId}`,
    limitations: status === "granted_with_limitations" ? [{ summary: "Accepted client-facing limitation." }] : [],
    blockerCodes: [],
    semanticWatermark: `single-site-client-approval:${decisionId}`,
  };
}

async function seedCompletedExecution(writer: SingleSiteStateWriterRepository, suffix: string) {
  return writer.withTransaction(async (tx) => {
    const created = await writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://content-approval-${suffix}.example.test`,
      currentState: "improvement_implementation_completed",
      actor: { actorType: "human", actorId: "client-approval-integration-operator" },
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
      evidenceCapturedAt: "2026-08-03T12:00:00.000Z",
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

async function seedAcceptedImprovedReview(writer: SingleSiteStateWriterRepository, suffix: string, limited = false) {
  const seeded = await seedCompletedExecution(writer, suffix);
  const reviewService = new ImprovedVersionReviewService(writer);
  const created = await reviewService.createOrReuseReview({
    migrationId: seeded.migration.id,
    clientId: seeded.migration.client_id,
    siteId: seeded.migration.site_id ?? "",
    executionAttemptId: seeded.attempt.id,
    actor: actor(),
    correlationId: `corr-improved-review-${suffix}`,
    idempotencyKey: `idem-improved-review-${suffix}`,
  });
  const accepted = limited
    ? await reviewService.acceptWithLimitations({
        reviewId: created.review.id,
        limitationsJson: [{ summary: "Manual content caveat from improved review." }],
        actor: actor(),
        correlationId: `corr-improved-review-limited-${suffix}`,
        idempotencyKey: `idem-improved-review-limited-${suffix}`,
      })
    : await reviewService.accept({
        reviewId: created.review.id,
        actor: actor(),
        correlationId: `corr-improved-review-accept-${suffix}`,
        idempotencyKey: `idem-improved-review-accept-${suffix}`,
      });
  return { ...seeded, improvedReview: accepted.review };
}

test("client approval persists, projects, and preserves launch/publish/runtime boundaries in disposable PostgreSQL", async () => {
  const pg = await startDisposablePostgres();
  const pool = new Pool({ connectionString: pg.connectionString });
  try {
    const writer = new SingleSiteStateWriterRepository(writerPool(pool));
    const service = new ContentApprovalService(writer);
    const clientService = new ClientApprovalService(writer);
    const reader = new SingleSiteStateReadRepository(readPool(pool));
    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedAcceptedImprovedReview(writer, suffix);
    const contentDecisionId = randomUUID();
    const clientDecisionId = randomUUID();

    const rls = await pool.query(
      `
      select relname, relrowsecurity
      from pg_class
      where relname = any($1::text[])
      order by relname
      `,
      [CLIENT_APPROVAL_TABLES],
    );
    assert.equal(rls.rows.length, CLIENT_APPROVAL_TABLES.length);
    assert.equal(rls.rows.every((row) => row.relrowsecurity === true), true);

    const created = await service.createOrReuseContentApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      improvedVersionReviewId: seeded.improvedReview.id,
      evidencePackageRefsJson: [{ sourceRecordId: `content-evidence-${suffix}`, refType: "single_site_content_approval_evidence" }],
      renderedSnapshotRefsJson: [{ sourceRecordId: `rendered-snapshot-${suffix}` }],
      contentSnapshotRefsJson: [{ sourceRecordId: `content-snapshot-${suffix}` }],
      metadataSnapshotRefsJson: [{ sourceRecordId: `metadata-snapshot-${suffix}` }],
      recommendationCoverageRefsJson: [{ sourceRecordId: `coverage-${suffix}` }],
      caveatRefsJson: [{ sourceRecordId: `legal-caveat-${suffix}` }],
      actor: actor(),
      correlationId: `corr-content-create-${suffix}`,
      idempotencyKey: `idem-content-create-${suffix}`,
    });
    await service.attachAafRequestRef({
      contentApprovalId: created.contentApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_content_approval_request",
      refType: "aaf_approval_request",
      sourceRecordId: `aaf-content-request-${suffix}`,
      actor: actor(),
      correlationId: `corr-content-aaf-request-${suffix}`,
      idempotencyKey: `idem-content-aaf-request-${suffix}`,
    });
    await service.attachAafDecisionRef({
      contentApprovalId: created.contentApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_content_approval_decision",
      refType: "aaf_approval_decision",
      sourceRecordId: contentDecisionId,
      contentApprovalValidation: validation(contentDecisionId, seeded.improvedReview.id),
      actor: actor(),
      correlationId: `corr-content-aaf-decision-${suffix}`,
      idempotencyKey: `idem-content-aaf-decision-${suffix}`,
    });
    await service.addFinding({
      contentApprovalId: created.contentApproval.id,
      migrationId: seeded.migration.id,
      itemKey: "content-ok",
      category: "content_accuracy",
      severity: "p2_minor",
      status: "resolved",
      requiredRecommendationApplied: true,
      recommendationId: seeded.recommendation.id,
      findingSummary: "Improved candidate content is accurate.",
      actor: actor(),
      correlationId: `corr-content-item-${suffix}`,
      idempotencyKey: `idem-content-item-${suffix}`,
    });
    await service.markReadyForReview({ contentApprovalId: created.contentApproval.id, actor: actor(), correlationId: `corr-content-ready-${suffix}`, idempotencyKey: `idem-content-ready-${suffix}` });
    await service.startReview({ contentApprovalId: created.contentApproval.id, actor: actor(), correlationId: `corr-content-start-${suffix}`, idempotencyKey: `idem-content-start-${suffix}` });
    const approved = await service.approve({
      contentApprovalId: created.contentApproval.id,
      aafContentApprovalDecisionId: contentDecisionId,
      contentApprovalValidation: validation(contentDecisionId, seeded.improvedReview.id),
      decisionSummaryJson: { decision: "content approved" },
      actor: actor(),
      correlationId: `corr-content-approve-${suffix}`,
      idempotencyKey: `idem-content-approve-${suffix}`,
    });

    assert.equal(approved.contentApproval.status, "approved");
    assert.equal(approved.contentApproval.client_or_launch_approval_ready, true);
    assert.equal(approved.contentApproval.client_approval_granted, false);
    assert.equal(approved.contentApproval.launch_approval_granted, false);
    assert.equal(approved.contentApproval.publish_activation_approval_granted, false);
    assert.equal(approved.contentApproval.active_pointer_changed, false);
    assert.equal(approved.contentApproval.runtime_artifacts_mutated, false);
    assert.equal(approved.contentApproval.site_versions_mutated, false);

    const clientCreated = await clientService.createOrReuseClientApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      contentApprovalId: created.contentApproval.id,
      evidencePackageRefsJson: [{ sourceRecordId: `client-evidence-${suffix}`, refType: "single_site_client_approval_evidence" }],
      renderedSnapshotRefsJson: [{ sourceRecordId: `client-rendered-snapshot-${suffix}` }],
      clientFacingSummaryRefsJson: [{ sourceRecordId: `client-facing-summary-${suffix}` }],
      deferredOrNotAppliedRecommendationRefsJson: [{ sourceRecordId: `deferred-rec-${suffix}`, required: false }],
      actor: actor(),
      correlationId: `corr-client-create-${suffix}`,
      idempotencyKey: `idem-client-create-${suffix}`,
    });
    await clientService.attachAafRequestRef({
      clientApprovalId: clientCreated.clientApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_client_approval_request",
      refType: "aaf_approval_request",
      sourceRecordId: `aaf-client-request-${suffix}`,
      actor: actor(),
      correlationId: `corr-client-aaf-request-${suffix}`,
      idempotencyKey: `idem-client-aaf-request-${suffix}`,
    });
    await clientService.attachAafDecisionRef({
      clientApprovalId: clientCreated.clientApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_client_approval_decision",
      refType: "aaf_approval_decision",
      sourceRecordId: clientDecisionId,
      clientApprovalValidation: clientValidation(clientDecisionId, clientCreated.clientApproval.id),
      actor: actor(),
      correlationId: `corr-client-aaf-decision-${suffix}`,
      idempotencyKey: `idem-client-aaf-decision-${suffix}`,
    });
    await clientService.addFinding({
      clientApprovalId: clientCreated.clientApproval.id,
      migrationId: seeded.migration.id,
      itemKey: "client-ok",
      category: "business_acceptance",
      severity: "p2_minor",
      status: "resolved",
      requiredRecommendationApplied: true,
      recommendationId: seeded.recommendation.id,
      findingSummary: "Client representative accepts the improved candidate.",
      actor: actor(),
      correlationId: `corr-client-item-${suffix}`,
      idempotencyKey: `idem-client-item-${suffix}`,
    });
    await clientService.markReadyForReview({ clientApprovalId: clientCreated.clientApproval.id, actor: actor(), correlationId: `corr-client-ready-${suffix}`, idempotencyKey: `idem-client-ready-${suffix}` });
    await clientService.startReview({ clientApprovalId: clientCreated.clientApproval.id, actor: actor(), correlationId: `corr-client-start-${suffix}`, idempotencyKey: `idem-client-start-${suffix}` });
    const clientApproved = await clientService.approve({
      clientApprovalId: clientCreated.clientApproval.id,
      aafClientApprovalDecisionId: clientDecisionId,
      clientApprovalValidation: clientValidation(clientDecisionId, clientCreated.clientApproval.id),
      decisionSummaryJson: { decision: "client approved" },
      actor: actor(),
      correlationId: `corr-client-approve-${suffix}`,
      idempotencyKey: `idem-client-approve-${suffix}`,
    });
    assert.equal(clientApproved.clientApproval.status, "approved");
    assert.equal(clientApproved.clientApproval.client_approval_granted, true);
    assert.equal(clientApproved.clientApproval.launch_approval_ready, true);
    assert.equal(clientApproved.clientApproval.launch_approval_granted, false);
    assert.equal(clientApproved.clientApproval.publish_activation_approval_granted, false);
    assert.equal(clientApproved.clientApproval.active_pointer_changed, false);
    assert.equal(clientApproved.clientApproval.runtime_artifacts_mutated, false);
    assert.equal(clientApproved.clientApproval.site_versions_mutated, false);

    const model = await reader.readByMigrationId(seeded.migration.id);
    assert.ok(model);
    assert.equal(model.contentApproval.latestContentApprovalId, created.contentApproval.id);
    assert.equal(model.contentApproval.status, "approved");
    assert.equal(model.contentApproval.aafRefs.decisionId, contentDecisionId);
    assert.equal(model.contentApproval.findingCount, 1);
    assert.equal(model.contentApproval.countsBySeverity.p2_minor, 1);
    assert.equal(model.contentApproval.countsByCategory.content_accuracy, 1);
    assert.equal(model.contentApproval.clientLaunchReadiness, true);
    assert.equal(model.contentApproval.nextAction, "prepare_client_or_launch_approval");
    assert.equal(model.contentApproval.clientApprovalGranted, false);
    assert.equal(model.contentApproval.launchApprovalGranted, false);
    assert.equal(model.contentApproval.publishActivationApprovalGranted, false);
    assert.equal(model.contentApproval.activePointerChanged, false);
    assert.equal(model.contentApproval.runtimeMutatedByContentApproval, false);
    assert.equal(model.clientApproval.latestClientApprovalId, clientCreated.clientApproval.id);
    assert.equal(model.clientApproval.status, "approved");
    assert.equal(model.clientApproval.contentApprovalRefs.contentApprovalId, created.contentApproval.id);
    assert.equal(model.clientApproval.contentApprovalRefs.aafContentApprovalDecisionId, contentDecisionId);
    assert.equal(model.clientApproval.aafRefs.decisionId, clientDecisionId);
    assert.equal(model.clientApproval.findingCount, 1);
    assert.equal(model.clientApproval.countsBySeverity.p2_minor, 1);
    assert.equal(model.clientApproval.countsByCategory.business_acceptance, 1);
    assert.equal(model.clientApproval.unresolvedBlockerCount, 0);
    assert.equal(model.clientApproval.clientApprovalReadiness, true);
    assert.equal(model.clientApproval.launchApprovalReady, true);
    assert.equal(model.clientApproval.nextAction, "prepare_launch_approval");
    assert.equal(model.workflowReadiness.launchApprovalRequired, true);

    await assert.rejects(
      () => pool.query("update public.gnr8_single_site_client_approval_refs set ref_type = ref_type where client_approval_id = $1::uuid", [clientCreated.clientApproval.id]),
      /append-only|Cannot update or delete/i,
    );
    await assert.rejects(
      () => pool.query("delete from public.gnr8_single_site_client_approval_events where client_approval_id = $1::uuid", [clientCreated.clientApproval.id]),
      /append-only|Cannot update or delete/i,
    );

    const forbiddenRefs = await pool.query(
      `
      select ref_role, count(*)::int as count
      from public.gnr8_single_site_migration_refs
      where migration_id = $1::uuid
        and ref_role in (
          'active_pointer',
          'publish_event',
          'domain_binding',
          'subscription',
          'hosting_entitlement',
          'billing_account',
          'stripe_subscription'
        )
      group by ref_role
      `,
      [seeded.migration.id],
    );
    assert.deepEqual(forbiddenRefs.rows, []);
  } finally {
    await pool.end().catch(() => undefined);
    docker(["stop", pg.containerName]);
    const leftovers = docker(["ps", "-a", "--filter", `name=${pg.containerName}`, "--format", "{{.Names}}"]);
    assert.equal(leftovers, "");
  }
});
