import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { ContentApprovalService } from "./content-approval-service";
import { SingleSiteContentApprovalAafBridge, type PrepareContentApprovalRequestInput } from "./content-approval-aaf-bridge";
import { ImprovedVersionReviewService } from "./improved-version-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260730170000_aaf_single_site_implementation_authorization_scope.sql",
  "20260731100000_aaf_granted_with_limitations_status.sql",
  "20260803120000_aaf_single_site_content_approval_scope.sql",
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260730120000_single_site_clone_review_core.sql",
  "20260730143000_single_site_improvement_proposal_planning_core.sql",
  "20260731120000_single_site_improvement_execution_core.sql",
  "20260731143000_single_site_improved_version_review_core.sql",
  "20260803143000_single_site_content_approval_core.sql",
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
  const containerName = `gnr8-content-approval-aaf-${process.pid}-${suffix}`;
  const database = `gnr8_content_approval_aaf_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_content_approval_aaf_${suffix.replace(/-/g, "")}`;
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
  return { actorType: "human" as const, actorId: "content-approval-aaf-operator", actorRole: "migration_operator" };
}

function ref(sourceTable: string, sourceRecordId: string, suffix: string) {
  return { sourceTable, sourceRecordId, sourceWatermark: `${sourceRecordId}:${suffix}:watermark`, contentHash: `${sourceRecordId}-${suffix}-hash-0123456789abcdef` };
}

async function seedAcceptedImprovedReview(writer: SingleSiteStateWriterRepository, suffix: string) {
  const seeded = await writer.withTransaction(async (tx) => {
    const created = await writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://content-approval-aaf-${suffix}.example.test`,
      currentState: "improvement_implementation_completed",
      actor: { actorType: "human", actorId: "content-approval-aaf-operator" },
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
  const accepted = await reviewService.accept({
    reviewId: created.review.id,
    actor: actor(),
    correlationId: `corr-improved-review-accept-${suffix}`,
    idempotencyKey: `idem-improved-review-accept-${suffix}`,
  });
  return { ...seeded, improvedReview: accepted.review };
}

function bridgeInput(seeded: Awaited<ReturnType<typeof seedAcceptedImprovedReview>>, contentApprovalId: string, suffix: string): PrepareContentApprovalRequestInput {
  return {
    tenantId: seeded.migration.tenant_id,
    clientId: seeded.migration.client_id,
    siteId: seeded.migration.site_id ?? "",
    migrationId: seeded.migration.id,
    contentApprovalId,
    improvedVersionReviewRef: { ...ref("gnr8_single_site_improved_version_reviews", seeded.improvedReview.id, suffix), reviewStatus: seeded.improvedReview.review_status },
    improvedCandidateSiteVersionRef: ref("gnr8_runtime_site_versions", seeded.improvedReview.improved_candidate_site_version_ref, suffix),
    improvedRuntimeArtifactRef: ref("gnr8_runtime_artifacts", seeded.improvedReview.improved_runtime_artifact_ref, suffix),
    proposalPlanRef: { ...ref("gnr8_single_site_improvement_proposal_plans", seeded.plan.id, suffix), planVersion: seeded.plan.plan_version },
    proposalApprovalRef: {
      approvalRequestId: `proposal-request-${suffix}`,
      approvalDecisionId: seeded.improvedReview.proposal_approval_decision_id,
      evidencePackageId: `proposal-evidence-${suffix}`,
      sourceWatermark: `proposal-watermark-${suffix}`,
    },
    implementationAuthorizationRef: {
      approvalRequestId: `auth-request-${suffix}`,
      approvalDecisionId: seeded.improvedReview.implementation_authorization_decision_id,
      evidencePackageId: `auth-evidence-${suffix}`,
      sourceWatermark: `auth-watermark-${suffix}`,
      limitations: [{ implementation: "no publish" }],
    },
    improvementExecutionAttemptRef: ref("gnr8_single_site_improvement_execution_attempts", seeded.attempt.id, suffix),
    selectedRecommendationRefs: [
      {
        ...ref("gnr8_single_site_improvement_proposal_recommendations", seeded.recommendation.id, suffix),
        recommendationId: seeded.recommendation.id,
        recommendationKey: seeded.recommendation.recommendation_key,
        applicationStatus: "applied",
      },
    ],
    sourceEvidenceReviewRef: { ...ref("gnr8_single_site_source_evidence_reviews", seeded.sourceReview.id, suffix), sourceWatermark: seeded.sourceReview.source_watermark, reviewStatus: "accepted" },
    cloneReviewRef: { ...ref("gnr8_single_site_clone_reviews", seeded.cloneReview.id, suffix), reviewStatus: "accepted" },
    cloneSiteVersionRef: ref("gnr8_runtime_site_versions", seeded.cloneReview.clone_site_version_ref, suffix),
    cloneRuntimeArtifactRef: ref("gnr8_runtime_artifacts", seeded.cloneReview.runtime_artifact_ref, suffix),
    improvedCandidateRenderedSnapshotRef: ref("gnr8_single_site_content_approval_refs", `rendered-snapshot-${suffix}`, suffix),
    improvedCandidateContentSnapshotRef: ref("gnr8_single_site_content_approval_refs", `content-snapshot-${suffix}`, suffix),
    improvedCandidateMetadataSnapshotRef: ref("gnr8_single_site_content_approval_refs", `metadata-snapshot-${suffix}`, suffix),
    recommendationCoverageSummaryRef: ref("gnr8_single_site_content_approval_refs", `coverage-summary-${suffix}`, suffix),
    seoAeoMetadataSummaryRef: ref("gnr8_single_site_content_approval_refs", `seo-aeo-summary-${suffix}`, suffix),
    headingsBodyCopyCtaInternalLinkReviewSummaryRef: ref("gnr8_single_site_content_approval_refs", `copy-link-summary-${suffix}`, suffix),
    accessibilityContentCaveatsRef: ref("gnr8_single_site_content_approval_refs", `accessibility-caveats-${suffix}`, suffix),
    structuredDataSummaryRef: ref("gnr8_single_site_content_approval_refs", `structured-data-summary-${suffix}`, suffix),
    legalComplianceNotesRef: ref("gnr8_single_site_content_approval_refs", `legal-notes-${suffix}`, suffix),
    knownLimitationsRef: ref("gnr8_single_site_content_approval_refs", `known-limitations-${suffix}`, suffix),
    unresolvedNotAppliedRecommendationsRef: ref("gnr8_single_site_content_approval_refs", `unresolved-recommendations-${suffix}`, suffix),
    operatorReviewNotesRef: ref("gnr8_single_site_content_approval_refs", `operator-notes-${suffix}`, suffix),
    limitations: [{ content: "operator accepted content caveat" }],
    auditTimelineRefs: [ref("gnr8_aaf_audit_events", `audit-timeline-${suffix}`, suffix)],
    operatorNotes: [{ note: "Disposable MVP-29 bridge preparation only." }],
    actor: actor(),
    correlationId: `corr-content-aaf-bridge-${suffix}`,
    idempotencyKey: `idem-content-aaf-bridge-${suffix}`,
    policyVersion: "MVP-29",
  };
}

test("single-site content approval AAF bridge persists evidence/request and validates decisions in disposable PostgreSQL", async () => {
  const pg = await startDisposablePostgres();
  const pool = new Pool({ connectionString: pg.connectionString, max: 6 });
  try {
    const writer = new SingleSiteStateWriterRepository(writerPool(pool));
    const service = new ContentApprovalService(writer);
    const reader = new SingleSiteStateReadRepository(readPool(pool));
    const aafWriter = new AafWriterRepository(pool);
    const bridge = new SingleSiteContentApprovalAafBridge(aafWriter);
    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedAcceptedImprovedReview(writer, suffix);
    const created = await service.createOrReuseContentApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      improvedVersionReviewId: seeded.improvedReview.id,
      actor: actor(),
      correlationId: `corr-content-create-${suffix}`,
      idempotencyKey: `idem-content-create-${suffix}`,
    });
    const input = bridgeInput(seeded, created.contentApproval.id, suffix);

    const prepared = await bridge.prepareContentApprovalRequest(input);
    assert.equal(prepared.evidencePackage.package_type, "single_site_content_approval_evidence");
    assert.equal(prepared.approvalRequest.scope, "single_site_content_approval");
    assert.equal(prepared.approvalRequest.status, "requested");

    const countsAfterPrepare = await pool.query<{ decisions: string; packages: string; requests: string }>(
      `
      select
        (select count(*)::text from public.gnr8_aaf_approval_decisions) as decisions,
        (select count(*)::text from public.gnr8_aaf_evidence_packages) as packages,
        (select count(*)::text from public.gnr8_aaf_approval_requests) as requests
      `,
    );
    assert.equal(countsAfterPrepare.rows[0]?.decisions, "0");
    assert.equal(countsAfterPrepare.rows[0]?.packages, "1");
    assert.equal(countsAfterPrepare.rows[0]?.requests, "1");

    const replay = await bridge.prepareContentApprovalRequest(input);
    assert.equal(replay.evidencePackage.id, prepared.evidencePackage.id);
    assert.equal(replay.approvalRequest.id, prepared.approvalRequest.id);
    await assert.rejects(
      () =>
        bridge.prepareContentApprovalRequest({
          ...input,
          improvedCandidateContentSnapshotRef: { ...input.improvedCandidateContentSnapshotRef, sourceWatermark: "drifted-content-snapshot" },
        }),
      /idempotency conflict/i,
    );

    await service.attachAafRequestRef({
      contentApprovalId: created.contentApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_content_approval_request",
      refType: "aaf_approval_request",
      sourceTable: "gnr8_aaf_approval_requests",
      sourceRecordId: prepared.approvalRequest.id,
      sourceWatermark: prepared.semanticWatermark,
      actor: actor(),
      correlationId: `corr-attach-request-${suffix}`,
      idempotencyKey: `idem-attach-request-${suffix}`,
    });

    const wrongScopeRequest = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalRequest(tx, {
        tenantId: input.tenantId,
        clientId: input.clientId,
        siteId: input.siteId,
        scope: "client_review",
        subjectType: "single_site_improved_version_review",
        subjectId: seeded.improvedReview.id,
        requesterActorType: "human",
        requesterActorId: "wrong-scope-test",
        requesterRole: "migration_operator",
        policyVersion: "MVP-29",
        correlationId: `corr-wrong-scope-${suffix}`,
        idempotencyKey: `idem-wrong-scope-request-${suffix}`,
      }),
    );
    const wrongScopeDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: wrongScopeRequest.id,
        status: "granted",
        decisionActorType: "human",
        decisionActorId: "wrong-scope-approver",
        decisionActorRole: "client_approver",
        policyVersion: "MVP-29",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-wrong-scope-decision-${suffix}`,
        idempotencyKey: `idem-wrong-scope-decision-${suffix}`,
      }),
    );
    const wrongScope = await bridge.validateContentApprovalDecisionRef({ ...input, contentApprovalDecisionId: wrongScopeDecision.id });
    assert.equal(wrongScope.valid, false);
    assert.deepEqual(wrongScope.blockerCodes, ["approval_scope_mismatch"]);

    const grantedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "granted",
        decisionActorType: "human",
        decisionActorId: "content-approval-approver",
        decisionActorRole: "content_approver",
        policyVersion: "MVP-29",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-grant-${suffix}`,
        idempotencyKey: `idem-grant-${suffix}`,
      }),
    );
    const validation = await bridge.validateContentApprovalDecisionRef({
      ...input,
      contentApprovalDecisionId: grantedDecision.id,
      approvalRequestId: prepared.approvalRequest.id,
      evidencePackageId: prepared.evidencePackage.id,
    });
    assert.equal(validation.valid, true, JSON.stringify(validation));
    assert.equal(validation.status, "granted");

    const limitedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "granted_with_limitations",
        decisionActorType: "human",
        decisionActorId: "content-approval-limited-approver",
        decisionActorRole: "content_approver",
        policyVersion: "MVP-29",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-grant-limited-${suffix}`,
        idempotencyKey: `idem-grant-limited-${suffix}`,
      }),
    );
    const limitedValidation = await bridge.validateContentApprovalDecisionRef({
      ...input,
      contentApprovalDecisionId: limitedDecision.id,
      approvalRequestId: prepared.approvalRequest.id,
      evidencePackageId: prepared.evidencePackage.id,
    });
    assert.equal(limitedValidation.valid, true, JSON.stringify(limitedValidation));
    assert.equal(limitedValidation.status, "granted_with_limitations");
    assert.ok(limitedValidation.limitations.length > 0);

    const rejectedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "rejected",
        decisionActorType: "human",
        decisionActorId: "content-approval-rejecter",
        decisionActorRole: "content_approver",
        policyVersion: "MVP-29",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-reject-${suffix}`,
        idempotencyKey: `idem-reject-${suffix}`,
      }),
    );
    const rejected = await bridge.validateContentApprovalDecisionRef({ ...input, contentApprovalDecisionId: rejectedDecision.id });
    assert.equal(rejected.valid, false);
    assert.equal(rejected.status, "rejected");

    await assert.rejects(
      () =>
        service.attachAafDecisionRef({
          contentApprovalId: created.contentApproval.id,
          migrationId: seeded.migration.id,
          refRole: "aaf_content_approval_decision",
          refType: "aaf_approval_decision",
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: grantedDecision.id,
          actor: actor(),
          correlationId: `corr-attach-unvalidated-${suffix}`,
          idempotencyKey: `idem-attach-unvalidated-${suffix}`,
        }),
      /bridge validation/,
    );
    await service.attachAafDecisionRef({
      contentApprovalId: created.contentApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_content_approval_decision",
      refType: "aaf_approval_decision",
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: grantedDecision.id,
      sourceWatermark: prepared.semanticWatermark,
      contentApprovalValidation: validation,
      actor: actor(),
      correlationId: `corr-attach-validated-${suffix}`,
      idempotencyKey: `idem-attach-validated-${suffix}`,
    });
    const approved = await service.approve({
      contentApprovalId: created.contentApproval.id,
      aafContentApprovalDecisionId: grantedDecision.id,
      contentApprovalValidation: validation,
      actor: actor(),
      correlationId: `corr-service-approve-${suffix}`,
      idempotencyKey: `idem-service-approve-${suffix}`,
    });
    assert.equal(approved.contentApproval.status, "approved");

    const model = await reader.readByMigrationId(seeded.migration.id);
    assert.equal(model?.contentApproval.aafValidation.requestPrepared, true);
    assert.equal(model?.contentApproval.aafValidation.decisionState, "decision_validated");
    assert.equal(model?.contentApproval.clientLaunchReadiness, true);
    assert.equal(model?.contentApproval.clientApprovalGranted, false);
    assert.equal(model?.contentApproval.launchApprovalGranted, false);
    assert.equal(model?.contentApproval.publishActivationApprovalGranted, false);

    const sideEffects = await pool.query<{ runtime_versions: string | null; active_pointers: string | null; provider_jobs: string | null }>(
      `
      select
        to_regclass('public.gnr8_runtime_site_versions')::text as runtime_versions,
        to_regclass('public.gnr8_runtime_active_pointers')::text as active_pointers,
        to_regclass('public.gnr8_runtime_provider_jobs')::text as provider_jobs
      `,
    );
    assert.deepEqual(sideEffects.rows[0], { runtime_versions: null, active_pointers: null, provider_jobs: null });
  } finally {
    await pool.end().catch(() => undefined);
    docker(["stop", pg.containerName]);
    const leftovers = docker(["ps", "-a", "--filter", `name=${pg.containerName}`, "--format", "{{.Names}}"]);
    assert.equal(leftovers, "");
  }
});
