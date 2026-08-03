import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { LaunchApprovalService } from "./launch-approval-service";
import { ClientApprovalService, type ClientApprovalAafValidationResult } from "./client-approval-service";
import type { ContentApprovalAafValidationResult } from "./content-approval-aaf-bridge";
import { ContentApprovalService } from "./content-approval-service";
import {
  SingleSiteLaunchApprovalAafBridge,
  type PrepareLaunchApprovalRequestInput,
} from "./launch-approval-aaf-bridge";
import { ImprovedVersionReviewService } from "./improved-version-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const MIGRATIONS = [
  "20260722120000_aaf_persistence_core.sql",
  "20260730170000_aaf_single_site_implementation_authorization_scope.sql",
  "20260731100000_aaf_granted_with_limitations_status.sql",
  "20260803120000_aaf_single_site_content_approval_scope.sql",
  "20260803170000_aaf_single_site_client_launch_approval_scopes.sql",
  "20260729120000_single_site_state_evidence_spine.sql",
  "20260730120000_single_site_clone_review_core.sql",
  "20260730143000_single_site_improvement_proposal_planning_core.sql",
  "20260731120000_single_site_improvement_execution_core.sql",
  "20260731143000_single_site_improved_version_review_core.sql",
  "20260803143000_single_site_content_approval_core.sql",
  "20260803190000_single_site_client_approval_core.sql",
  "20260803210000_single_site_launch_approval_core.sql",
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
  const containerName = `gnr8-launch-approval-aaf-${process.pid}-${suffix}`;
  const database = `gnr8_launch_approval_aaf_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_launch_approval_aaf_${suffix.replace(/-/g, "")}`;
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
  return { actorType: "human" as const, actorId: "launch-approval-aaf-operator", actorRole: "migration_operator" };
}

function ref(sourceTable: string, sourceRecordId: string, suffix: string) {
  return { sourceTable, sourceRecordId, sourceWatermark: `${sourceRecordId}:${suffix}:watermark`, contentHash: `${sourceRecordId}-${suffix}-hash-0123456789abcdef` };
}

function contentValidation(decisionId: string, reviewId: string): ContentApprovalAafValidationResult {
  return {
    valid: true,
    status: "granted",
    scope: "single_site_content_approval",
    subjectType: "single_site_improved_version_review",
    subjectId: reviewId,
    approvalRequestId: `content-request-for-${decisionId}`,
    approvalDecisionId: decisionId,
    evidencePackageId: `content-evidence-for-${decisionId}`,
    limitations: [],
    blockerCodes: [],
    semanticWatermark: `single-site-content-approval:${decisionId}`,
  };
}

function clientValidation(decisionId: string, clientApprovalId: string): ClientApprovalAafValidationResult {
  return {
    valid: true,
    status: "granted",
    scope: "single_site_client_approval",
    subjectType: "single_site_improved_candidate_client_acceptance",
    subjectId: clientApprovalId,
    approvalRequestId: `client-request-for-${decisionId}`,
    approvalDecisionId: decisionId,
    evidencePackageId: `client-evidence-for-${decisionId}`,
    limitations: [],
    blockerCodes: [],
    semanticWatermark: `single-site-client-approval:${decisionId}`,
  };
}

async function seedAcceptedImprovedReview(writer: SingleSiteStateWriterRepository, suffix: string) {
  const seeded = await writer.withTransaction(async (tx) => {
    const created = await writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://launch-approval-aaf-${suffix}.example.test`,
      currentState: "improvement_implementation_completed",
      actor: { actorType: "human", actorId: "launch-approval-aaf-operator" },
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

function bridgeInput(
  seeded: Awaited<ReturnType<typeof seedAcceptedImprovedReview>>,
  contentApproval: { id: string; status: string; aaf_content_approval_decision_id: string | null; limitations_json: unknown },
  clientApproval: { id: string; status: string; aaf_client_approval_decision_id: string | null; limitations_json: unknown },
  launchApproval: { id: string; limitations_json: unknown; domain_readiness_ref: string | null; billing_hosting_entitlement_ref: string | null; rollback_readiness_ref: string | null; publish_target_ref: string | null },
  suffix: string,
): PrepareLaunchApprovalRequestInput {
  const contentApprovalDecisionId = contentApproval.aaf_content_approval_decision_id;
  if (!contentApprovalDecisionId) throw new Error("content approval AAF decision id is required for launch approval AAF bridge input");
  const clientApprovalDecisionId = clientApproval.aaf_client_approval_decision_id;
  if (!clientApprovalDecisionId) throw new Error("client approval AAF decision id is required for launch approval AAF bridge input");
  return {
    tenantId: seeded.migration.tenant_id,
    clientId: seeded.migration.client_id,
    siteId: seeded.migration.site_id ?? "",
    migrationId: seeded.migration.id,
    launchApprovalId: launchApproval.id,
    contentApprovalRef: {
      ...ref("gnr8_single_site_content_approvals", contentApproval.id, suffix),
      approvalStatus: contentApproval.status,
      limitations: Array.isArray(contentApproval.limitations_json) ? contentApproval.limitations_json : [],
    },
    aafContentApprovalDecisionRef: {
      approvalRequestId: `content-request-${suffix}`,
      approvalDecisionId: contentApprovalDecisionId,
      evidencePackageId: `content-evidence-${suffix}`,
      sourceWatermark: `content-decision-watermark-${suffix}`,
    },
    requireClientApproval: true,
    clientApprovalRequirementPolicyRef: ref("gnr8_single_site_launch_approval_policy", `client-required-policy-${suffix}`, suffix),
    clientApprovalRef: {
      ...ref("gnr8_single_site_client_approvals", clientApproval.id, suffix),
      approvalStatus: clientApproval.status,
      limitations: Array.isArray(clientApproval.limitations_json) ? clientApproval.limitations_json : [],
    },
    aafClientApprovalDecisionRef: {
      approvalRequestId: `client-request-${suffix}`,
      approvalDecisionId: clientApprovalDecisionId,
      evidencePackageId: `client-evidence-${suffix}`,
      sourceWatermark: `client-decision-watermark-${suffix}`,
      limitations: [{ clientDecision: "client decision was validated before launch approval" }],
    },
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
    preLaunchChecklistSnapshotRef: ref("gnr8_single_site_launch_approval_refs", `pre-launch-checklist-${suffix}`, suffix),
    blockerLimitationSummaryRef: ref("gnr8_single_site_launch_approval_refs", `blocker-limitation-summary-${suffix}`, suffix),
    domainReadinessPlaceholderOrRef: ref("gnr8_single_site_launch_approval_refs", launchApproval.domain_readiness_ref ?? `domain-placeholder-${suffix}`, suffix),
    billingHostingEntitlementPlaceholderOrRef: ref("gnr8_single_site_launch_approval_refs", launchApproval.billing_hosting_entitlement_ref ?? `billing-placeholder-${suffix}`, suffix),
    rollbackReadinessPlaceholderOrRef: ref("gnr8_single_site_launch_approval_refs", launchApproval.rollback_readiness_ref ?? `rollback-placeholder-${suffix}`, suffix),
    publishTargetPlaceholderOrRef: ref("gnr8_single_site_launch_approval_refs", launchApproval.publish_target_ref ?? `publish-target-placeholder-${suffix}`, suffix),
    operatorLaunchNotesRef: ref("gnr8_single_site_launch_approval_refs", `operator-launch-notes-${suffix}`, suffix),
    limitations: [{ launch: "Accepted launch readiness caveat." }],
    launchChecklistRefs: [ref("gnr8_single_site_launch_approval_refs", `launch-checklist-${suffix}`, suffix)],
    domainReadinessEvidenceRefs: [ref("gnr8_ddom_readiness_snapshots", `domain-snapshot-placeholder-${suffix}`, suffix)],
    billingHostingReadinessEvidenceRefs: [ref("gnr8_billing_readiness_refs", `billing-placeholder-ref-${suffix}`, suffix)],
    rollbackReadinessEvidenceRefs: [ref("gnr8_rollback_readiness_refs", `rollback-placeholder-ref-${suffix}`, suffix)],
    smokeQaSummaryRefs: [ref("gnr8_single_site_launch_approval_refs", `smoke-qa-summary-${suffix}`, suffix)],
    auditTimelineRefs: [ref("gnr8_aaf_audit_events", `audit-timeline-${suffix}`, suffix)],
    operatorLaunchNotes: [{ note: "Disposable MVP-35 bridge preparation only. No publish activation." }],
    blockerRefs: [{ sourceRecordId: `blocker-accepted-${suffix}`, status: "accepted_limitation", acceptedLimitation: true }],
    actor: actor(),
    correlationId: `corr-launch-aaf-bridge-${suffix}`,
    idempotencyKey: `idem-launch-aaf-bridge-${suffix}`,
    policyVersion: "MVP-35",
  };
}

test("single-site launch approval AAF bridge persists evidence/request and validates decisions in disposable PostgreSQL", async () => {
  const pg = await startDisposablePostgres();
  const pool = new Pool({ connectionString: pg.connectionString, max: 6 });
  try {
    const writer = new SingleSiteStateWriterRepository(writerPool(pool));
    const contentService = new ContentApprovalService(writer);
    const clientService = new ClientApprovalService(writer);
    const launchService = new LaunchApprovalService(writer);
    const reader = new SingleSiteStateReadRepository(readPool(pool));
    const aafWriter = new AafWriterRepository(pool);
    const bridge = new SingleSiteLaunchApprovalAafBridge(aafWriter);
    const suffix = randomUUID().slice(0, 8);
    const seeded = await seedAcceptedImprovedReview(writer, suffix);
    const contentDecisionId = randomUUID();
    const clientDecisionId = randomUUID();
    const content = await contentService.createOrReuseContentApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      improvedVersionReviewId: seeded.improvedReview.id,
      actor: actor(),
      correlationId: `corr-content-create-${suffix}`,
      idempotencyKey: `idem-content-create-${suffix}`,
    });
    await contentService.attachAafDecisionRef({
      contentApprovalId: content.contentApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_content_approval_decision",
      refType: "aaf_approval_decision",
      sourceRecordId: contentDecisionId,
      contentApprovalValidation: contentValidation(contentDecisionId, seeded.improvedReview.id),
      actor: actor(),
      correlationId: `corr-content-aaf-decision-${suffix}`,
      idempotencyKey: `idem-content-aaf-decision-${suffix}`,
    });
    const approvedContent = await contentService.approve({
      contentApprovalId: content.contentApproval.id,
      aafContentApprovalDecisionId: contentDecisionId,
      contentApprovalValidation: contentValidation(contentDecisionId, seeded.improvedReview.id),
      actor: actor(),
      correlationId: `corr-content-approve-${suffix}`,
      idempotencyKey: `idem-content-approve-${suffix}`,
    });

    const clientCreated = await clientService.createOrReuseClientApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      contentApprovalId: approvedContent.contentApproval.id,
      evidencePackageRefsJson: [{ sourceRecordId: `client-evidence-${suffix}`, refType: "single_site_client_approval_evidence" }],
      renderedSnapshotRefsJson: [{ sourceRecordId: `client-rendered-snapshot-${suffix}` }],
      clientFacingSummaryRefsJson: [{ sourceRecordId: `client-facing-summary-${suffix}` }],
      deferredOrNotAppliedRecommendationRefsJson: [{ sourceRecordId: `deferred-rec-${suffix}`, required: false }],
      operatorNotesJson: [{ sourceRecordId: `operator-notes-${suffix}` }],
      actor: actor(),
      correlationId: `corr-client-create-${suffix}`,
      idempotencyKey: `idem-client-create-${suffix}`,
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
    const clientApproved = await clientService.approve({
      clientApprovalId: clientCreated.clientApproval.id,
      aafClientApprovalDecisionId: clientDecisionId,
      clientApprovalValidation: clientValidation(clientDecisionId, clientCreated.clientApproval.id),
      actor: actor(),
      correlationId: `corr-client-approve-${suffix}`,
      idempotencyKey: `idem-client-approve-${suffix}`,
    });

    const launchCreated = await launchService.createOrReuseLaunchApproval({
      migrationId: seeded.migration.id,
      clientId: seeded.migration.client_id,
      siteId: seeded.migration.site_id ?? "",
      contentApprovalId: approvedContent.contentApproval.id,
      requireClientApproval: true,
      clientApprovalId: clientApproved.clientApproval.id,
      requiredRefs: {
        domainReadinessRef: `domain-readiness-placeholder-${suffix}`,
        billingHostingEntitlementRef: `billing-hosting-placeholder-${suffix}`,
        rollbackReadinessRef: `rollback-readiness-placeholder-${suffix}`,
        publishTargetRef: `publish-target-placeholder-${suffix}`,
      },
      launchChecklistRefsJson: [{ sourceRecordId: `launch-checklist-${suffix}` }],
      smokeQaRefsJson: [{ sourceRecordId: `smoke-qa-${suffix}` }],
      actor: actor(),
      correlationId: `corr-launch-create-${suffix}`,
      idempotencyKey: `idem-launch-create-${suffix}`,
    });
    const input = bridgeInput(seeded, approvedContent.contentApproval, clientApproved.clientApproval, launchCreated.launchApproval, suffix);

    const prepared = await bridge.prepareLaunchApprovalRequest(input);
    assert.equal(prepared.evidencePackage.package_type, "single_site_launch_approval_evidence");
    assert.equal(prepared.approvalRequest.scope, "single_site_launch_approval");
    assert.equal(prepared.approvalRequest.status, "requested");

    const countsAfterPrepare = await pool.query<{ decisions: string; packages: string; requests: string; runtimeMutationRefs: string }>(
      `
      select
        (select count(*)::text from public.gnr8_aaf_approval_decisions) as decisions,
        (select count(*)::text from public.gnr8_aaf_evidence_packages) as packages,
        (select count(*)::text from public.gnr8_aaf_approval_requests) as requests,
        (select count(*)::text from public.gnr8_single_site_migration_refs where migration_id = $1::uuid and ref_role in ('active_pointer', 'publish_event', 'domain_binding', 'subscription', 'hosting_entitlement', 'billing_account', 'stripe_subscription')) as "runtimeMutationRefs"
      `,
      [seeded.migration.id],
    );
    assert.equal(countsAfterPrepare.rows[0]?.decisions, "0");
    assert.equal(countsAfterPrepare.rows[0]?.packages, "1");
    assert.equal(countsAfterPrepare.rows[0]?.requests, "1");
    assert.equal(countsAfterPrepare.rows[0]?.runtimeMutationRefs, "0");

    const replay = await bridge.prepareLaunchApprovalRequest(input);
    assert.equal(replay.evidencePackage.id, prepared.evidencePackage.id);
    assert.equal(replay.approvalRequest.id, prepared.approvalRequest.id);
    await assert.rejects(
      () =>
        bridge.prepareLaunchApprovalRequest({
          ...input,
          preLaunchChecklistSnapshotRef: { ...input.preLaunchChecklistSnapshotRef, sourceWatermark: "drifted-launch-checklist" },
        }),
      /idempotency conflict/i,
    );

    await launchService.attachAafRequestRef({
      launchApprovalId: launchCreated.launchApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_launch_approval_request",
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
        scope: "single_site_client_approval",
        subjectType: "single_site_improved_candidate_client_acceptance",
        subjectId: clientApproved.clientApproval.id,
        requesterActorType: "human",
        requesterActorId: "wrong-scope-test",
        requesterRole: "migration_operator",
        policyVersion: "MVP-35",
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
        decisionActorRole: "launch_approver",
        policyVersion: "MVP-35",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-wrong-scope-decision-${suffix}`,
        idempotencyKey: `idem-wrong-scope-decision-${suffix}`,
      }),
    );
    const wrongScope = await bridge.validateLaunchApprovalDecisionRef({ ...input, launchApprovalDecisionId: wrongScopeDecision.id });
    assert.equal(wrongScope.valid, false);
    assert.deepEqual(wrongScope.blockerCodes, ["approval_scope_mismatch"]);

    const grantedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "granted_with_limitations",
        decisionActorType: "human",
        decisionActorId: "launch-approval-approver",
        decisionActorRole: "launch_approver",
        policyVersion: "MVP-35",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-grant-${suffix}`,
        idempotencyKey: `idem-grant-${suffix}`,
      }),
    );
    const validation = await bridge.validateLaunchApprovalDecisionRef({
      ...input,
      launchApprovalDecisionId: grantedDecision.id,
      approvalRequestId: prepared.approvalRequest.id,
      evidencePackageId: prepared.evidencePackage.id,
    });
    assert.equal(validation.valid, true, JSON.stringify(validation));
    assert.equal(validation.status, "granted_with_limitations");
    assert.ok(validation.limitations.length > 0);

    const rejectedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "rejected",
        decisionActorType: "human",
        decisionActorId: "launch-approval-rejecter",
        decisionActorRole: "launch_approver",
        policyVersion: "MVP-35",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-reject-${suffix}`,
        idempotencyKey: `idem-reject-${suffix}`,
      }),
    );
    const rejected = await bridge.validateLaunchApprovalDecisionRef({ ...input, launchApprovalDecisionId: rejectedDecision.id });
    assert.equal(rejected.valid, false);
    assert.equal(rejected.status, "rejected");

    await assert.rejects(
      () =>
        launchService.attachAafDecisionRef({
          launchApprovalId: launchCreated.launchApproval.id,
          migrationId: seeded.migration.id,
          refRole: "aaf_launch_approval_decision",
          refType: "aaf_approval_decision",
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: grantedDecision.id,
          actor: actor(),
          correlationId: `corr-attach-unvalidated-${suffix}`,
          idempotencyKey: `idem-attach-unvalidated-${suffix}`,
        }),
      /MVP-35 bridge validation/,
    );
    await launchService.attachAafDecisionRef({
      launchApprovalId: launchCreated.launchApproval.id,
      migrationId: seeded.migration.id,
      refRole: "aaf_launch_approval_decision",
      refType: "aaf_approval_decision",
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: grantedDecision.id,
      sourceWatermark: prepared.semanticWatermark,
      launchApprovalValidation: validation,
      actor: actor(),
      correlationId: `corr-attach-validated-${suffix}`,
      idempotencyKey: `idem-attach-validated-${suffix}`,
    });
    const approved = await launchService.approveWithLimitations({
      launchApprovalId: launchCreated.launchApproval.id,
      aafLaunchApprovalDecisionId: grantedDecision.id,
      launchApprovalValidation: validation,
      actor: actor(),
      correlationId: `corr-service-approve-${suffix}`,
      idempotencyKey: `idem-service-approve-${suffix}`,
    });
    assert.equal(approved.launchApproval.status, "approved_with_limitations");
    assert.equal(approved.launchApproval.launch_approval_granted, true);
    assert.equal(approved.launchApproval.readiness_work_ready, true);
    assert.deepEqual(approved.launchApproval.publish_activation_approval_granted, false);
    assert.deepEqual(approved.launchApproval.active_pointer_changed, false);
    assert.deepEqual(approved.launchApproval.runtime_artifacts_mutated, false);
    assert.deepEqual(approved.launchApproval.site_versions_mutated, false);
    assert.ok(Array.isArray(approved.launchApproval.limitations_json));
    assert.ok((approved.launchApproval.limitations_json as unknown[]).length > 0);

    const model = await reader.readByMigrationId(seeded.migration.id);
    assert.equal(model?.launchApproval.aafValidation.requestPrepared, true);
    assert.equal(model?.launchApproval.aafValidation.decisionState, "decision_validated");
    assert.equal(model?.launchApproval.status, "approved_with_limitations");
    assert.equal(model?.launchApproval.aafValidation.approvedWithLimitations, true);
    assert.equal(model?.launchApproval.aafValidation.limitationsCarriedForward, true);
    assert.equal(model?.launchApproval.readinessWorkReady, true);
    assert.equal(model?.launchApproval.launchApprovalGranted, true);
    assert.equal(model?.launchApproval.publishActivationApprovalGranted, false);

    const forbidden = await pool.query<{ launch_forbidden: string; refs_forbidden: string; active_pointer_table: string | null }>(
      `
      select
        (select count(*)::text from public.gnr8_single_site_launch_approvals where id = $1::uuid and (publish_activation_approval_granted or active_pointer_changed or runtime_artifacts_mutated or site_versions_mutated)) as launch_forbidden,
        (select count(*)::text from public.gnr8_single_site_migration_refs where migration_id = $2::uuid and ref_role in ('active_pointer', 'publish_event', 'domain_binding', 'subscription', 'hosting_entitlement', 'billing_account', 'stripe_subscription')) as refs_forbidden,
        to_regclass('public.gnr8_runtime_active_pointers')::text as active_pointer_table
      `,
      [launchCreated.launchApproval.id, seeded.migration.id],
    );
    assert.equal(forbidden.rows[0]?.launch_forbidden, "0");
    assert.equal(forbidden.rows[0]?.refs_forbidden, "0");
    assert.equal(forbidden.rows[0]?.active_pointer_table, null);
  } finally {
    await pool.end().catch(() => undefined);
    docker(["stop", pg.containerName]);
    const leftovers = docker(["ps", "-a", "--filter", `name=${pg.containerName}`, "--format", "{{.Names}}"]);
    assert.equal(leftovers, "");
  }
});
