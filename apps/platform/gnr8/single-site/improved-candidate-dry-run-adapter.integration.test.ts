import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { CloneReviewService } from "./clone-review-service";
import { SingleSiteImplementationAuthorizationBridge, type PrepareImplementationAuthorizationRequestInput } from "./implementation-authorization-bridge";
import { computeImprovedCandidateDryRunSemanticInputWatermark, dryRunImprovedCandidate } from "./improved-candidate-dry-run-adapter";
import { ImprovementExecutionAafValidator } from "./improvement-execution-aaf-validator";
import { ImprovementExecutionService } from "./improvement-execution-service";
import { ImprovementProposalPlanningService } from "./improvement-proposal-planning-service";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateTransitionService } from "./single-site-state-transition-service";
import { SingleSiteStateWriterRepository, type SingleSiteStateWriterPool, type SingleSiteStateWriterTx } from "./single-site-state-writer-repository";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const BASE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260729120000_single_site_state_evidence_spine.sql");
const CLONE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730120000_single_site_clone_review_core.sql");
const PROPOSAL_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql");
const AAF_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260722120000_aaf_persistence_core.sql");
const AAF_SCOPE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql");
const AAF_LIMITED_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql");
const EXECUTION_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260731120000_single_site_improvement_execution_core.sql");
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
  const containerName = `gnr8-improved-dry-run-${process.pid}-${suffix}`;
  const database = `gnr8_improved_dry_run_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_improved_dry_run_${suffix.replace(/-/g, "")}`;
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
      ["base.sql", BASE_MIGRATION_PATH],
      ["clone.sql", CLONE_MIGRATION_PATH],
      ["proposal.sql", PROPOSAL_MIGRATION_PATH],
      ["aaf.sql", AAF_MIGRATION_PATH],
      ["aaf-scope.sql", AAF_SCOPE_MIGRATION_PATH],
      ["aaf-limited.sql", AAF_LIMITED_MIGRATION_PATH],
      ["execution.sql", EXECUTION_MIGRATION_PATH],
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
      // Best effort cleanup.
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

function actor() {
  return { actorType: "human" as const, actorId: "dry-run-integration-operator", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId.replace(/-/g, "")}hash0123456789abcdef`.slice(0, 64) };
}

async function createCloneReadyMigration(writer: SingleSiteStateWriterRepository, transitions: SingleSiteStateTransitionService, sourceReviews: SourceEvidenceReviewService, suffix: string) {
  const created = await writer.withTransaction((tx) =>
    writer.createMigration(tx, {
      tenantId: `tenant-${suffix}`,
      clientId: randomUUID(),
      siteId: randomUUID(),
      sourceUrl: `https://dry-run-${suffix}.example.test`,
      actor: { actorType: "human", actorId: "dry-run-integration-operator" },
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
    evidenceCapturedAt: "2026-07-31T12:00:00.000Z",
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

async function acceptClone(cloneReviews: CloneReviewService, ready: Awaited<ReturnType<typeof createCloneReadyMigration>>, suffix: string) {
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
  const accepted = await cloneReviews.acceptWithLimitations({
    reviewId: review.review.id,
    limitationsJson: [{ clone: "preserve typography" }],
    actor: actor(),
    correlationId: `corr-clone-limit-${suffix}`,
    idempotencyKey: `idem-clone-limit-${suffix}`,
  });
  return accepted.review;
}

function bridgeInput(
  suffix: string,
  migration: Awaited<ReturnType<typeof createCloneReadyMigration>>["migration"],
  cloneReview: Awaited<ReturnType<typeof acceptClone>>,
  plan: Awaited<ReturnType<ImprovementProposalPlanningService["approve"]>>["plan"],
  recommendationIds: string[],
): PrepareImplementationAuthorizationRequestInput {
  return {
    tenantId: migration.tenant_id,
    clientId: migration.client_id,
    siteId: migration.site_id ?? randomUUID(),
    migrationId: migration.id,
    proposalPlanId: plan.id,
    proposalPlanVersion: plan.plan_version,
    proposalPlanSemanticWatermark: String(plan.semantic_watermark),
    proposalStatus: plan.plan_status,
    proposalApprovalRef: {
      approvalRequestId: `proposal-approval-request-${suffix}`,
      approvalDecisionId: `proposal-approval-decision-${suffix}`,
      evidencePackageId: `proposal-evidence-${suffix}`,
      sourceWatermark: `proposal-approval-watermark-${suffix}`,
      limitations: [{ proposal: "hero copy only" }],
    },
    cloneReviewRef: { ...source("gnr8_single_site_clone_reviews", cloneReview.id), reviewStatus: cloneReview.review_status, limitations: [{ clone: "preserve typography" }] },
    cloneSiteVersionRef: source("runtime_site_versions", cloneReview.clone_site_version_ref),
    runtimeArtifactRef: source("runtime_artifacts", cloneReview.runtime_artifact_ref),
    sourceEvidenceReviewRef: { ...source("gnr8_single_site_source_evidence_reviews", cloneReview.source_evidence_review_id), reviewStatus: "accepted", limitations: [] },
    selectedRecommendationRefs: recommendationIds.map((recommendationId, index) => ({
      ...source("gnr8_single_site_improvement_proposal_recommendations", recommendationId),
      recommendationId,
      recommendationKey: index === 0 ? "hero-copy" : "visual-design-deferred",
    })),
    implementationScopeSummary: "Implement the selected hero copy recommendation only.",
    implementationNonGoals: ["No publish", "No active pointer", "No billing", "No DNS"],
    riskImpactEffortSummary: { risk: "low", impact: "high", effort: "small" },
    limitations: [{ authorization: "single recommendation only" }],
    operatorNotes: [{ note: "MVP-23 dry-run integration fixture" }],
    actor: actor(),
    correlationId: `corr-bridge-${suffix}`,
    idempotencyKey: `idem-bridge-${suffix}`,
    policyVersion: "MVP-23",
  };
}

async function optionalCount(pool: Pool, tableName: string): Promise<number> {
  const regclass = await pool.query<{ exists: boolean }>("select to_regclass($1) is not null as exists", [`public.${tableName}`]);
  if (!regclass.rows[0]?.exists) return 0;
  const count = await pool.query<{ count: number }>(`select count(*)::int from public.${tableName}`);
  return count.rows[0]?.count ?? 0;
}

test("improved candidate dry-run records placeholder items in disposable PostgreSQL without runtime mutation", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 6 });
  const writer = new SingleSiteStateWriterRepository(writerPool(pool));
  const transitions = new SingleSiteStateTransitionService(writer);
  const sourceReviews = new SourceEvidenceReviewService(writer);
  const cloneReviews = new CloneReviewService(writer);
  const proposals = new ImprovementProposalPlanningService(writer);
  const aafWriter = new AafWriterRepository(pool);
  const bridge = new SingleSiteImplementationAuthorizationBridge(aafWriter);
  const validator = new ImprovementExecutionAafValidator(aafWriter);
  const execution = new ImprovementExecutionService(writer);

  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const ready = await createCloneReadyMigration(writer, transitions, sourceReviews, suffix);
    const cloneReview = await acceptClone(cloneReviews, ready, suffix);
    await transitions.transition({
      migrationId: ready.migration.id,
      toState: "improvement_proposal_started",
      actor: actor(),
      correlationId: `corr-proposal-start-${suffix}`,
      idempotencyKey: `idem-proposal-start-${suffix}`,
      refs: [{ refRole: "clone_review", refType: "clone_review", sourceRecordId: cloneReview.id, idempotencyKey: `idem-proposal-start-ref-${suffix}` }],
    });
    const planCreate = await proposals.createOrReuseProposalPlan({
      migrationId: ready.migration.id,
      clientId: ready.migration.client_id,
      siteId: ready.migration.site_id ?? "",
      cloneReviewId: cloneReview.id,
      cloneSiteVersionRef: cloneReview.clone_site_version_ref,
      runtimeArtifactRef: cloneReview.runtime_artifact_ref,
      sourceEvidenceReviewId: cloneReview.source_evidence_review_id,
      title: "Dry-run integration proposal",
      summary: "Improve hero copy.",
      semanticWatermark: `proposal-watermark-${suffix}`,
      actor: actor(),
      correlationId: `corr-plan-create-${suffix}`,
      idempotencyKey: `idem-plan-create-${suffix}`,
    });
    const recommendation = await proposals.addRecommendation({
      planId: planCreate.plan.id,
      migrationId: ready.migration.id,
      recommendationKey: "hero-copy",
      title: "Clarify hero copy",
      category: "content_clarity",
      risk: "low",
      impact: "high",
      effort: "small",
      rationale: "Clarifies the offer while preserving source evidence.",
      actor: actor(),
      correlationId: `corr-rec-${suffix}`,
      idempotencyKey: `idem-rec-${suffix}`,
      semanticWatermark: `rec-watermark-${suffix}`,
    });
    const unsupportedRecommendation = await proposals.addRecommendation({
      planId: planCreate.plan.id,
      migrationId: ready.migration.id,
      recommendationKey: "visual-design-deferred",
      title: "Refresh visual design",
      category: "visual_design",
      risk: "medium",
      impact: "medium",
      effort: "medium",
      rationale: "Useful but requires design review beyond deterministic dry-run.",
      actor: actor(),
      correlationId: `corr-rec-unsupported-${suffix}`,
      idempotencyKey: `idem-rec-unsupported-${suffix}`,
      semanticWatermark: `rec-unsupported-watermark-${suffix}`,
    });
    await proposals.addFinding({
      planId: planCreate.plan.id,
      migrationId: ready.migration.id,
      findingKey: "unclear-hero",
      category: "content_clarity",
      risk: "low",
      impact: "high",
      summary: "Hero copy is faithful to source content but can be clearer.",
      actor: actor(),
      correlationId: `corr-finding-${suffix}`,
      idempotencyKey: `idem-finding-${suffix}`,
      semanticWatermark: `finding-watermark-${suffix}`,
    });
    await proposals.markReadyForReview({
      planId: planCreate.plan.id,
      actor: actor(),
      correlationId: `corr-plan-ready-${suffix}`,
      idempotencyKey: `idem-plan-ready-${suffix}`,
    });
    const approved = await proposals.approve({
      planId: planCreate.plan.id,
      actor: actor(),
      correlationId: `corr-plan-approve-${suffix}`,
      idempotencyKey: `idem-plan-approve-${suffix}`,
      approvalRefsJson: {
        approvalRequestId: `proposal-approval-request-${suffix}`,
        approvalDecisionId: `proposal-approval-decision-${suffix}`,
        evidencePackageId: `proposal-evidence-${suffix}`,
        sourceWatermark: `proposal-approval-watermark-${suffix}`,
      },
    });

    const authorizationInput = bridgeInput(suffix, ready.migration, cloneReview, approved.plan, [recommendation.recommendation.id, unsupportedRecommendation.recommendation.id]);
    const prepared = await bridge.prepareImplementationAuthorizationRequest(authorizationInput);
    const decision = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalDecision(tx, {
        approvalRequestId: prepared.approvalRequest.id,
        status: "granted_with_limitations",
        decisionActorType: "human",
        decisionActorId: "implementation-approver",
        decisionActorRole: "implementation_authorization_approver",
        policyVersion: authorizationInput.policyVersion,
        evidencePackageId: prepared.evidencePackage.id,
        correlationId: `corr-auth-decision-${suffix}`,
        idempotencyKey: `idem-auth-decision-${suffix}`,
      }),
    );
    const bridgeValidation = await bridge.validateImplementationAuthorizationRef({
      ...authorizationInput,
      implementationAuthorizationDecisionId: decision.id,
      approvalRequestId: prepared.approvalRequest.id,
      evidencePackageId: prepared.evidencePackage.id,
    });
    await proposals.attachImplementationAuthorizationRef({
      planId: approved.plan.id,
      refType: "aaf_approval_decision",
      sourceRecordId: decision.id,
      authorizationValidation: bridgeValidation,
      actor: actor(),
      correlationId: `corr-attach-auth-${suffix}`,
      idempotencyKey: `idem-attach-auth-${suffix}`,
    });

    const executionInput = {
      ...authorizationInput,
      implementationAuthorizationRef: {
        approvalRequestId: prepared.approvalRequest.id,
        approvalDecisionId: decision.id,
        evidencePackageId: prepared.evidencePackage.id,
        sourceTable: "gnr8_aaf_approval_decisions",
        sourceRecordId: decision.id,
        scope: "single_site_improvement_implementation_authorization",
      },
      cloneRuntimeArtifactRef: authorizationInput.runtimeArtifactRef,
      expectedRecommendationWatermarks: Object.fromEntries(authorizationInput.selectedRecommendationRefs.map((ref) => [ref.recommendationId, ref.sourceWatermark])),
      implementationScopeWatermark: prepared.semanticWatermark,
      correlationId: `corr-validator-${suffix}`,
      idempotencyKey: `idem-validator-${suffix}`,
      executionAttemptKey: `attempt-${suffix}`,
    };
    const allowedValidation = await validator.validateImprovementExecutionAuthorization(executionInput);
    assert.equal(allowedValidation.allowed, true, JSON.stringify(allowedValidation));

    const attempt = await execution.createOrReuseExecutionAttempt({
      migrationId: ready.migration.id,
      clientId: ready.migration.client_id,
      siteId: ready.migration.site_id ?? "",
      proposalPlanId: approved.plan.id,
      implementationAuthorizationRef: executionInput.implementationAuthorizationRef,
      selectedRecommendationRefs: authorizationInput.selectedRecommendationRefs,
      implementationScopeSummary: authorizationInput.implementationScopeSummary,
      implementationScopeWatermark: prepared.semanticWatermark,
      executionMode: "dry_run",
      actor: actor(),
      correlationId: `corr-execution-create-${suffix}`,
      idempotencyKey: `idem-execution-create-${suffix}`,
    });
    const readyAttempt = await execution.markReady({
      attemptId: attempt.attempt.id,
      validation: allowedValidation,
      validationResultRef: decision.id,
      validationEvidenceRef: prepared.evidencePackage.id,
      actor: actor(),
      correlationId: `corr-execution-ready-${suffix}`,
      idempotencyKey: `idem-execution-ready-${suffix}`,
    });
    assert.equal(readyAttempt.attempt.status, "ready");

    const dryRunInputWithoutWatermark = {
      tenantId: ready.migration.tenant_id,
      clientId: ready.migration.client_id,
      siteId: ready.migration.site_id ?? "",
      migrationId: ready.migration.id,
      executionAttempt: {
        attemptId: readyAttempt.attempt.id,
        migrationId: ready.migration.id,
        proposalPlanId: approved.plan.id,
        implementationAuthorizationDecisionId: decision.id,
      },
      validationResult: allowedValidation,
      implementationAuthorizationRefs: {
        requestRef: source("gnr8_aaf_approval_requests", prepared.approvalRequest.id),
        decisionRef: source("gnr8_aaf_approval_decisions", decision.id),
        evidencePackageRef: source("gnr8_aaf_evidence_packages", prepared.evidencePackage.id),
      },
      proposalPlanRef: {
        ...source("gnr8_single_site_improvement_proposal_plans", approved.plan.id, String(approved.plan.semantic_watermark)),
        proposalPlanId: approved.plan.id,
        planVersion: approved.plan.plan_version,
        status: approved.plan.plan_status,
        semanticWatermark: String(approved.plan.semantic_watermark),
      },
      proposalApprovalRefs: {
        approvalRequestRef: source("gnr8_aaf_approval_requests", `proposal-approval-request-${suffix}`),
        approvalDecisionRef: source("gnr8_aaf_approval_decisions", `proposal-approval-decision-${suffix}`),
        evidencePackageRef: source("gnr8_aaf_evidence_packages", `proposal-evidence-${suffix}`),
      },
      selectedRecommendationRefs: authorizationInput.selectedRecommendationRefs,
      selectedRecommendations: [
        {
          recommendationId: recommendation.recommendation.id,
          recommendationKey: "hero-copy",
          category: "content_clarity",
          sourceWatermark: authorizationInput.selectedRecommendationRefs[0]?.sourceWatermark ?? "",
          semanticWatermark: String(recommendation.recommendation.semantic_watermark),
          sourceEvidenceRefs: [source("gnr8_single_site_source_evidence_items", "source-text-hero", "source-text-watermark")],
          deterministicChange: {
            changeClass: "text_replacement_plan" as const,
            target: { pagePath: "/", sectionId: "hero", field: "headline" },
            currentSourceHash: "current-hero-hash",
            plannedValue: "Clear operator-authored headline",
            evidenceRefs: [source("gnr8_single_site_source_evidence_items", "source-text-hero", "source-text-watermark")],
            operatorAuthored: true as const,
          },
        },
        {
          recommendationId: unsupportedRecommendation.recommendation.id,
          recommendationKey: "visual-design-deferred",
          category: "visual_design",
          sourceWatermark: authorizationInput.selectedRecommendationRefs[1]?.sourceWatermark ?? "",
          semanticWatermark: String(unsupportedRecommendation.recommendation.semantic_watermark),
          sourceEvidenceRefs: [source("gnr8_single_site_source_evidence_items", "source-screenshot", "source-screenshot-watermark")],
          deterministicChange: null,
          requiresDesignReview: true,
        },
      ],
      proposalLimitations: [{ proposal: "hero copy only" }],
      implementationAuthorizationLimitations: authorizationInput.limitations ?? [],
      evidenceRefs: {
        cloneReviewRef: source("gnr8_single_site_clone_reviews", cloneReview.id),
        sourceEvidenceReviewRef: source("gnr8_single_site_source_evidence_reviews", cloneReview.source_evidence_review_id),
        cloneSiteVersionRef: source("runtime_site_versions", cloneReview.clone_site_version_ref),
        cloneRuntimeArtifactRef: source("runtime_artifacts", cloneReview.runtime_artifact_ref),
      },
      implementationScopeSummary: authorizationInput.implementationScopeSummary,
      nonGoals: authorizationInput.implementationNonGoals,
      actor: actor(),
      correlationId: `corr-dry-run-${suffix}`,
      idempotencyKey: `idem-dry-run-${suffix}`,
    };
    const semanticInputWatermark = computeImprovedCandidateDryRunSemanticInputWatermark(dryRunInputWithoutWatermark);
    const dryRunResult = dryRunImprovedCandidate({
      ...dryRunInputWithoutWatermark,
      semanticInputWatermark,
      executionAttempt: { ...dryRunInputWithoutWatermark.executionAttempt, semanticInputWatermark },
    });
    assert.equal(dryRunResult.runtimeWrites, false);
    assert.equal(dryRunResult.recommendationsNotApplied[0]?.reason, "unsupported_in_mvp");

    await execution.recordImprovedCandidateDryRunResult({
      attemptId: readyAttempt.attempt.id,
      migrationId: ready.migration.id,
      dryRunResult,
      actor: actor(),
      correlationId: `corr-record-dry-run-${suffix}`,
      idempotencyKey: `idem-record-dry-run-${suffix}`,
    });

    const persistedAttempt = await pool.query("select status, completed_at, improved_candidate_site_version_ref, improved_runtime_artifact_ref from public.gnr8_single_site_improvement_execution_attempts where id = $1::uuid", [
      readyAttempt.attempt.id,
    ]);
    assert.equal(persistedAttempt.rows[0]?.status, "ready");
    assert.equal(persistedAttempt.rows[0]?.completed_at, null);
    assert.equal(persistedAttempt.rows[0]?.improved_candidate_site_version_ref, null);
    assert.equal(persistedAttempt.rows[0]?.improved_runtime_artifact_ref, null);

    const persistedItems = await pool.query<{ item_type: string; count: number }>(
      "select item_type, count(*)::int from public.gnr8_single_site_improvement_execution_items where attempt_id = $1::uuid group by item_type",
      [readyAttempt.attempt.id],
    );
    assert.ok(persistedItems.rows.some((row) => row.item_type === "output_ref" && row.count === 3));
    assert.ok(persistedItems.rows.some((row) => row.item_type === "warning" && row.count >= 1));
    assert.ok(persistedItems.rows.some((row) => row.item_type === "validation_ref" && row.count >= 1));

    const placeholders = await pool.query<{ source_record_id: string }>(
      "select source_record_id from public.gnr8_single_site_improvement_execution_refs where attempt_id = $1::uuid and ref_role = 'output_ref' order by source_record_id",
      [readyAttempt.attempt.id],
    );
    assert.deepEqual(
      placeholders.rows.map((row) => row.source_record_id.startsWith("gnr8:planned_")),
      [true, true, true],
    );

    assert.equal(await optionalCount(pool, "gnr8_runtime_site_versions"), 0);
    assert.equal(await optionalCount(pool, "gnr8_runtime_artifacts"), 0);
    assert.equal(await optionalCount(pool, "gnr8_runtime_active_pointers"), 0);
    assert.equal(await optionalCount(pool, "gnr8_generated_proposal_bundles"), 0);
    assert.equal(await optionalCount(pool, "gnr8_billing_subscriptions"), 0);
    assert.equal(await optionalCount(pool, "gnr8_domain_dns_readiness"), 0);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
