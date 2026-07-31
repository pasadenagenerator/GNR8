import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { CloneReviewService } from "./clone-review-service";
import { ImprovementProposalPlanningService } from "./improvement-proposal-planning-service";
import { SingleSiteImplementationAuthorizationBridge } from "./implementation-authorization-bridge";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateReadRepository, type SingleSiteStateReadPool } from "./single-site-state-read-repository";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const AAF_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260722120000_aaf_persistence_core.sql");
const AAF_SCOPE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql");
const AAF_GRANTED_WITH_LIMITATIONS_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql");
const BASE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const PROPOSAL_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql");
const REQUIRED_CATEGORIES = ["source_url", "page", "screenshot", "dom", "text", "image", "asset", "font", "visual_identity", "metadata"] as const;

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
  const containerName = `gnr8-implementation-auth-${process.pid}-${suffix}`;
  const database = `gnr8_implementation_auth_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_implementation_auth_${suffix.replace(/-/g, "")}`;
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

    for (const [name, migrationPath] of [
      ["aaf.sql", AAF_MIGRATION_PATH],
      ["aaf-scope.sql", AAF_SCOPE_MIGRATION_PATH],
      ["aaf-granted-with-limitations.sql", AAF_GRANTED_WITH_LIMITATIONS_MIGRATION_PATH],
      ["base.sql", BASE_MIGRATION_PATH],
      ["clone.sql", CLONE_MIGRATION_PATH],
      ["proposal.sql", PROPOSAL_MIGRATION_PATH],
    ] as const) {
      docker(["cp", migrationPath, `${containerName}:/tmp/${name}`]);
      docker(["exec", containerName, "psql", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-U", user, "-d", database, "-f", `/tmp/${name}`]);
    }

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
  return { actorType: "human" as const, actorId: "implementation-auth-operator", actorRole: "migration_operator" };
}

async function createAcceptedProposal(writer: SingleSiteStateWriterRepository, suffix: string) {
  const transitions = new SingleSiteStateTransitionService(writer);
  const sourceReviews = new SourceEvidenceReviewService(writer);
  const cloneReviews = new CloneReviewService(writer);
  const proposals = new ImprovementProposalPlanningService(writer);
  const migration = await writer.withTransaction((tx) =>
    writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://implementation-auth-${suffix}.example.test`,
      actor: { actorType: "human", actorId: "implementation-auth-operator" },
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
      migrationId: migration.row.id,
      toState,
      actor: actor(),
      correlationId: `corr-${key}-${suffix}`,
      idempotencyKey: `idem-${key}-${suffix}`,
    });
  }
  const sourceReview = await sourceReviews.createReview({
    migrationId: migration.row.id,
    tenantId: migration.row.tenant_id,
    clientId: migration.row.client_id,
    siteId: migration.row.site_id,
    sourceUrl: migration.row.source_url,
    sourceEvidencePackageKey: `package-${suffix}`,
    sourceWatermark: `source-watermark-${suffix}`,
    evidenceCapturedAt: "2026-07-30T12:00:00.000Z",
    completenessStatus: "complete",
    actor: actor(),
    correlationId: `corr-source-review-${suffix}`,
    idempotencyKey: `idem-source-review-${suffix}`,
  });
  for (const category of REQUIRED_CATEGORIES) {
    await sourceReviews.addEvidenceItem({
      reviewId: sourceReview.review.id,
      migrationId: migration.row.id,
      evidenceCategory: category,
      status: "present",
      actor: actor(),
      correlationId: `corr-source-item-${category}-${suffix}`,
      idempotencyKey: `idem-source-item-${category}-${suffix}`,
    });
  }
  const acceptedSourceReview = await sourceReviews.accept({
    reviewId: sourceReview.review.id,
    actor: actor(),
    correlationId: `corr-source-accept-${suffix}`,
    idempotencyKey: `idem-source-accept-${suffix}`,
  });
  await transitions.transition({
    migrationId: migration.row.id,
    toState: "clone_generation_started",
    actor: actor(),
    sourceEvidenceReviewId: sourceReview.review.id,
    correlationId: `corr-clone-start-${suffix}`,
    idempotencyKey: `idem-clone-start-${suffix}`,
    refs: [{ refRole: "source_evidence_review", refType: "source_evidence_review", sourceRecordId: sourceReview.review.id, idempotencyKey: `idem-clone-start-review-ref-${suffix}` }],
  });
  await transitions.transition({
    migrationId: migration.row.id,
    toState: "clone_generation_completed",
    actor: actor(),
    correlationId: `corr-clone-complete-${suffix}`,
    idempotencyKey: `idem-clone-complete-${suffix}`,
  });
  const cloneReview = await cloneReviews.createOrReuseReview({
    migrationId: migration.row.id,
    clientId: migration.row.client_id,
    siteId: migration.row.site_id,
    cloneSiteVersionRef: `clone-version-${suffix}`,
    runtimeArtifactRef: `runtime-artifact-${suffix}`,
    sourceEvidenceReviewRef: sourceReview.review.id,
    cloneGenerationRef: `clone-generation-${suffix}`,
    actor: actor(),
    correlationId: `corr-clone-review-create-${suffix}`,
    idempotencyKey: `idem-clone-review-create-${suffix}`,
  });
  const acceptedCloneReview = await cloneReviews.accept({
    reviewId: cloneReview.review.id,
    actor: actor(),
    correlationId: `corr-clone-accept-${suffix}`,
    idempotencyKey: `idem-clone-accept-${suffix}`,
  });
  const plan = await proposals.createOrReuseProposalPlan({
    migrationId: migration.row.id,
    clientId: migration.row.client_id,
    siteId: migration.row.site_id ?? "",
    cloneReviewId: acceptedCloneReview.review.id,
    cloneSiteVersionRef: acceptedCloneReview.review.clone_site_version_ref,
    runtimeArtifactRef: acceptedCloneReview.review.runtime_artifact_ref,
    sourceEvidenceReviewId: acceptedCloneReview.review.source_evidence_review_id,
    title: "Implementation authorization proposal",
    summary: "Approved proposal for bridge integration.",
    actor: actor(),
    correlationId: `corr-proposal-create-${suffix}`,
    idempotencyKey: `idem-proposal-create-${suffix}`,
  });
  await proposals.addFinding({
    planId: plan.plan.id,
    migrationId: migration.row.id,
    findingKey: "hero-copy",
    category: "content_clarity",
    risk: "medium",
    impact: "high",
    summary: "Hero copy is faithful but unclear.",
    actor: actor(),
    correlationId: `corr-finding-${suffix}`,
    idempotencyKey: `idem-finding-${suffix}`,
  });
  const recommendation = await proposals.addRecommendation({
    planId: plan.plan.id,
    migrationId: migration.row.id,
    recommendationKey: "hero-copy",
    title: "Clarify hero copy",
    category: "content_clarity",
    risk: "low",
    impact: "high",
    effort: "small",
    rationale: "Improve clarity while preserving clone fidelity.",
    actor: actor(),
    correlationId: `corr-recommendation-${suffix}`,
    idempotencyKey: `idem-recommendation-${suffix}`,
  });
  const approved = await proposals.approveWithLimitations({
    planId: plan.plan.id,
    limitationsJson: [{ scope: "hero copy only" }],
    approvalRefsJson: {
      proposalApprovalRequestId: randomUUID(),
      proposalApprovalDecisionId: randomUUID(),
      proposalApprovalEvidencePackageId: randomUUID(),
    },
    actor: actor(),
    correlationId: `corr-approve-${suffix}`,
    idempotencyKey: `idem-approve-${suffix}`,
  });
  return { migration: migration.row, sourceReview: acceptedSourceReview.review, cloneReview: acceptedCloneReview.review, plan: approved.plan, recommendation: recommendation.recommendation };
}

test("single-site implementation authorization bridge persists AAF request and validates exact-scope decision in disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  const singleSiteWriter = new SingleSiteStateWriterRepository(writerPool(pool));
  const proposals = new ImprovementProposalPlanningService(singleSiteWriter);
  const reader = new SingleSiteStateReadRepository(readPool(pool));
  const aafWriter = new AafWriterRepository(pool);
  const bridge = new SingleSiteImplementationAuthorizationBridge(aafWriter);

  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const fixture = await createAcceptedProposal(singleSiteWriter, suffix);
    const proposalApprovalRefs = fixture.plan.approval_refs_json as Record<string, string>;
    const input = {
      tenantId: fixture.migration.tenant_id,
      clientId: fixture.migration.client_id,
      siteId: fixture.migration.site_id ?? "",
      migrationId: fixture.migration.id,
      proposalPlanId: fixture.plan.id,
      proposalPlanVersion: fixture.plan.plan_version,
      proposalPlanSemanticWatermark: `${fixture.plan.id}:v${fixture.plan.plan_version}`,
      proposalStatus: fixture.plan.plan_status,
      proposalApprovalRef: {
        approvalRequestId: proposalApprovalRefs.proposalApprovalRequestId,
        approvalDecisionId: proposalApprovalRefs.proposalApprovalDecisionId,
        evidencePackageId: proposalApprovalRefs.proposalApprovalEvidencePackageId,
        sourceWatermark: `${fixture.plan.id}:proposal-approval`,
        limitations: [{ scope: "hero copy only" }],
      },
      cloneReviewRef: {
        sourceTable: "gnr8_single_site_clone_reviews",
        sourceRecordId: fixture.cloneReview.id,
        sourceWatermark: `${fixture.cloneReview.id}:accepted`,
        reviewStatus: fixture.cloneReview.review_status,
      },
      cloneSiteVersionRef: {
        sourceTable: "runtime_site_versions",
        sourceRecordId: fixture.cloneReview.clone_site_version_ref,
        sourceWatermark: `${fixture.cloneReview.clone_site_version_ref}:watermark`,
      },
      runtimeArtifactRef: {
        sourceTable: "runtime_artifacts",
        sourceRecordId: fixture.cloneReview.runtime_artifact_ref,
        sourceWatermark: `${fixture.cloneReview.runtime_artifact_ref}:watermark`,
      },
      sourceEvidenceReviewRef: {
        sourceTable: "gnr8_single_site_source_evidence_reviews",
        sourceRecordId: fixture.sourceReview.id,
        sourceWatermark: fixture.sourceReview.source_watermark,
        reviewStatus: fixture.sourceReview.review_status,
      },
      selectedRecommendationRefs: [
        {
          sourceTable: "gnr8_single_site_improvement_proposal_recommendations",
          sourceRecordId: fixture.recommendation.id,
          sourceWatermark: `${fixture.recommendation.id}:draft`,
          recommendationId: fixture.recommendation.id,
          recommendationKey: fixture.recommendation.recommendation_key,
        },
      ],
      implementationScopeSummary: "Implement only the selected hero copy recommendation.",
      implementationNonGoals: ["No runtime publish", "No DNS", "No billing", "No AI execution"],
      riskImpactEffortSummary: { risk: "low", impact: "high", effort: "small" },
      limitations: [{ scope: "hero copy only" }],
      operatorNotes: [{ note: "Disposable integration request only." }],
      actor: actor(),
      correlationId: `corr-bridge-${suffix}`,
      idempotencyKey: `idem-bridge-${suffix}`,
      policyVersion: "MVP-18",
    };

    const prepared = await bridge.prepareImplementationAuthorizationRequest(input);
    assert.equal(prepared.approvalRequest.scope, "single_site_improvement_implementation_authorization");
    assert.equal(prepared.evidencePackage.package_type, "single_site_improvement_implementation_authorization_evidence");
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

    const replay = await bridge.prepareImplementationAuthorizationRequest(input);
    assert.equal(replay.evidencePackage.id, prepared.evidencePackage.id);
    assert.equal(replay.approvalRequest.id, prepared.approvalRequest.id);
    await assert.rejects(() => bridge.prepareImplementationAuthorizationRequest({ ...input, implementationScopeSummary: "Drifted scope." }), /idempotency conflict/i);

    const wrongScopeRequest = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalRequest(tx, {
        tenantId: input.tenantId,
        clientId: input.clientId,
        siteId: input.siteId,
        scope: "publish_activation",
        subjectType: "single_site_improvement_proposal_plan",
        subjectId: input.proposalPlanId,
        requesterActorType: "human",
        requesterActorId: "wrong-scope-test",
        requesterRole: "migration_operator",
        policyVersion: "MVP-18",
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
        decisionActorRole: "release_approver",
        policyVersion: "MVP-18",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-wrong-scope-decision-${suffix}`,
        idempotencyKey: `idem-wrong-scope-decision-${suffix}`,
      }),
    );
    const wrongScope = await bridge.validateImplementationAuthorizationRef({
      ...input,
      implementationAuthorizationDecisionId: wrongScopeDecision.id,
    });
    assert.equal(wrongScope.valid, false);
    assert.deepEqual(wrongScope.blockerCodes, ["approval_scope_mismatch"]);

    const grantedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "granted",
        decisionActorType: "human",
        decisionActorId: "implementation-auth-approver",
        decisionActorRole: "implementation_authorization_approver",
        policyVersion: "MVP-18",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-grant-${suffix}`,
        idempotencyKey: `idem-grant-${suffix}`,
      }),
    );
    const validation = await bridge.validateImplementationAuthorizationRef({
      ...input,
      implementationAuthorizationDecisionId: grantedDecision.id,
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
        decisionActorId: "implementation-auth-limited-approver",
        decisionActorRole: "implementation_authorization_approver",
        policyVersion: "MVP-18",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-grant-limited-${suffix}`,
        idempotencyKey: `idem-grant-limited-${suffix}`,
      }),
    );
    const limitedValidation = await bridge.validateImplementationAuthorizationRef({
      ...input,
      implementationAuthorizationDecisionId: limitedDecision.id,
      approvalRequestId: prepared.approvalRequest.id,
      evidencePackageId: prepared.evidencePackage.id,
    });
    assert.equal(limitedValidation.valid, true, JSON.stringify(limitedValidation));
    assert.equal(limitedValidation.status, "granted_with_limitations");
    assert.deepEqual(limitedValidation.limitations, [{ scope: "hero copy only" }, { scope: "hero copy only" }]);

    await assert.rejects(
      () =>
        proposals.attachImplementationAuthorizationRef({
          planId: fixture.plan.id,
          refType: "aaf_approval_decision",
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: grantedDecision.id,
          actor: actor(),
          correlationId: `corr-attach-unvalidated-${suffix}`,
          idempotencyKey: `idem-attach-unvalidated-${suffix}`,
        }),
      /bridge validation/,
    );
    const attached = await proposals.attachImplementationAuthorizationRef({
      planId: fixture.plan.id,
      refType: "aaf_approval_decision",
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: grantedDecision.id,
      authorizationValidation: validation,
      actor: actor(),
      correlationId: `corr-attach-${suffix}`,
      idempotencyKey: `idem-attach-${suffix}`,
    });
    assert.equal(attached.plan.implementation_authorization_attached, true);
    const model = await reader.readByMigrationId(fixture.migration.id);
    assert.equal(model?.improvementProposalPlanning.implementationAuthorizationReady, true);
    assert.equal(model?.improvementProposalPlanning.implementationAuthorizationStatus, "granted");

    const rejectedDecision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "rejected",
        decisionActorType: "human",
        decisionActorId: "implementation-auth-approver",
        decisionActorRole: "implementation_authorization_approver",
        policyVersion: "MVP-18",
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-reject-${suffix}`,
        idempotencyKey: `idem-reject-${suffix}`,
      }),
    );
    const rejected = await bridge.validateImplementationAuthorizationRef({
      ...input,
      implementationAuthorizationDecisionId: rejectedDecision.id,
    });
    assert.equal(rejected.valid, false);
    assert.equal(rejected.status, "rejected");

    const sideEffects = await pool.query<{ generated_bundle: string | null; runtime_versions: string | null; active_pointers: string | null }>(
      `
      select
        to_regclass('public.gnr8_generated_proposal_bundles')::text as generated_bundle,
        to_regclass('public.gnr8_runtime_site_versions')::text as runtime_versions,
        to_regclass('public.gnr8_runtime_active_pointers')::text as active_pointers
      `,
    );
    assert.deepEqual(sideEffects.rows[0], { generated_bundle: null, runtime_versions: null, active_pointers: null });
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
