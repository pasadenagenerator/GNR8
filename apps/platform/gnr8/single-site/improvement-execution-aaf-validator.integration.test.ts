import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { AafWriterRepository } from "../aaf/aaf-writer-repository";
import { SingleSiteImplementationAuthorizationBridge, type PrepareImplementationAuthorizationRequestInput } from "./implementation-authorization-bridge";
import { ImprovementExecutionAafValidator, type ImprovementExecutionAafValidatorInput } from "./improvement-execution-aaf-validator";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const AAF_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260722120000_aaf_persistence_core.sql");
const AAF_SCOPE_MIGRATION_PATH = path.resolve(PLATFORM_ROOT, "supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql");

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
  const containerName = `gnr8-improvement-exec-aaf-${process.pid}-${suffix}`;
  const database = `gnr8_improvement_exec_aaf_${suffix.replace(/-/g, "")}`;
  const user = `gnr8_improvement_exec_aaf_${suffix.replace(/-/g, "")}`;
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

function actor() {
  return { actorType: "human" as const, actorId: "operator-mvp20-integration", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return { sourceTable, sourceRecordId, sourceWatermark, contentHash: `${sourceRecordId}-hash-0123456789abcdef` };
}

function prepareInput(suffix: string, overrides: Partial<PrepareImplementationAuthorizationRequestInput> = {}): PrepareImplementationAuthorizationRequestInput {
  return {
    tenantId: `tenant-${suffix}`,
    clientId: `client-${suffix}`,
    siteId: `site-${suffix}`,
    migrationId: `migration-${suffix}`,
    proposalPlanId: `proposal-plan-${suffix}`,
    proposalPlanVersion: 1,
    proposalPlanSemanticWatermark: `proposal-plan-${suffix}:v1`,
    proposalStatus: "approved",
    proposalApprovalRef: {
      approvalRequestId: randomUUID(),
      approvalDecisionId: randomUUID(),
      evidencePackageId: randomUUID(),
      sourceWatermark: `proposal-approval-${suffix}:watermark`,
      limitations: [],
    },
    cloneReviewRef: { ...source("gnr8_single_site_clone_reviews", `clone-review-${suffix}`), reviewStatus: "accepted", limitations: [] },
    cloneSiteVersionRef: source("runtime_site_versions", `clone-site-version-${suffix}`),
    runtimeArtifactRef: source("runtime_artifacts", `runtime-artifact-${suffix}`),
    sourceEvidenceReviewRef: { ...source("gnr8_single_site_source_evidence_reviews", `source-review-${suffix}`), reviewStatus: "accepted", limitations: [] },
    selectedRecommendationRefs: [
      {
        ...source("gnr8_single_site_improvement_proposal_recommendations", `recommendation-${suffix}`),
        recommendationId: `recommendation-${suffix}`,
        recommendationKey: "hero-copy",
      },
    ],
    implementationScopeSummary: "Implement only the selected hero copy recommendation.",
    implementationNonGoals: ["No publish", "No billing", "No DNS", "No runtime active pointer"],
    riskImpactEffortSummary: { risk: "low", impact: "high", effort: "small" },
    limitations: [],
    operatorNotes: [{ note: "Disposable integration validation only." }],
    actor: actor(),
    correlationId: `corr-prepare-${suffix}`,
    idempotencyKey: `idem-prepare-${suffix}`,
    policyVersion: "MVP-20",
    ...overrides,
  };
}

function executionInput(
  input: PrepareImplementationAuthorizationRequestInput,
  prepared: Awaited<ReturnType<SingleSiteImplementationAuthorizationBridge["prepareImplementationAuthorizationRequest"]>>,
  decisionId: string,
  overrides: Partial<ImprovementExecutionAafValidatorInput> = {},
): ImprovementExecutionAafValidatorInput {
  return {
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    proposalPlanId: input.proposalPlanId,
    proposalPlanVersion: input.proposalPlanVersion,
    proposalStatus: input.proposalStatus,
    proposalPlanSemanticWatermark: input.proposalPlanSemanticWatermark,
    proposalApprovalRef: input.proposalApprovalRef,
    implementationAuthorizationRef: {
      approvalRequestId: prepared.approvalRequest.id,
      approvalDecisionId: decisionId,
      evidencePackageId: prepared.evidencePackage.id,
      sourceTable: "gnr8_aaf_approval_decisions",
      sourceRecordId: decisionId,
      scope: "single_site_improvement_implementation_authorization",
    },
    cloneReviewRef: input.cloneReviewRef,
    cloneSiteVersionRef: input.cloneSiteVersionRef,
    cloneRuntimeArtifactRef: input.runtimeArtifactRef,
    sourceEvidenceReviewRef: input.sourceEvidenceReviewRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    expectedRecommendationWatermarks: Object.fromEntries(input.selectedRecommendationRefs.map((ref) => [ref.recommendationId, ref.sourceWatermark])),
    implementationScopeSummary: input.implementationScopeSummary,
    implementationScopeWatermark: prepared.semanticWatermark,
    implementationNonGoals: input.implementationNonGoals,
    riskImpactEffortSummary: input.riskImpactEffortSummary,
    limitations: input.limitations,
    operatorNotes: input.operatorNotes,
    actor: actor(),
    correlationId: `corr-exec-${input.proposalPlanId}`,
    idempotencyKey: `idem-exec-${input.proposalPlanId}`,
    executionAttemptKey: `attempt-${input.proposalPlanId}`,
    policyVersion: input.policyVersion,
    ...overrides,
  };
}

async function counts(pool: Pool): Promise<Record<string, number>> {
  const result = await pool.query<Record<string, number>>(
    `
    select
      (select count(*)::int from public.gnr8_aaf_approval_requests) as approval_requests,
      (select count(*)::int from public.gnr8_aaf_approval_decisions) as approval_decisions,
      (select count(*)::int from public.gnr8_aaf_evidence_packages) as evidence_packages,
      (select count(*)::int from public.gnr8_aaf_evidence_package_source_refs) as evidence_source_refs,
      (select count(*)::int from public.gnr8_aaf_evidence_package_items) as evidence_items,
      (select count(*)::int from public.gnr8_aaf_action_gate_attempts) as gate_attempts
    `,
  );
  return result.rows[0] ?? {};
}

async function prepareAndDecide(pool: Pool, bridge: SingleSiteImplementationAuthorizationBridge, aafWriter: AafWriterRepository, suffix: string, status = "granted") {
  const input = prepareInput(suffix);
  const prepared = await bridge.prepareImplementationAuthorizationRequest(input);
  const decision = await aafWriter.withTransaction((tx) =>
    aafWriter.createApprovalDecision(tx, {
      approvalRequestId: prepared.approvalRequest.id,
      status: status as "granted",
      decisionActorType: "human",
      decisionActorId: `approver-${suffix}`,
      decisionActorRole: "implementation_authorization_approver",
      policyVersion: input.policyVersion,
      evidencePackageId: prepared.evidencePackage.id,
      correlationId: `corr-decision-${suffix}`,
      idempotencyKey: `idem-decision-${suffix}`,
    }),
  );
  return { input, prepared, decision };
}

test("improvement execution AAF validator is read-only and fail-closed in disposable PostgreSQL", async () => {
  const disposable = await startDisposablePostgres();
  const pool = new Pool({ connectionString: disposable.connectionString, ssl: false, max: 4 });
  const aafWriter = new AafWriterRepository(pool);
  const bridge = new SingleSiteImplementationAuthorizationBridge(aafWriter);
  const validator = new ImprovementExecutionAafValidator(aafWriter);

  try {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 10);
    const granted = await prepareAndDecide(pool, bridge, aafWriter, `${suffix}-grant`);
    assert.equal(granted.prepared.approvalRequest.status, "requested");
    assert.equal(granted.prepared.evidencePackage.package_type, "single_site_improvement_implementation_authorization_evidence");

    const beforeGrantedValidation = await counts(pool);
    const valid = await validator.validateImprovementExecutionAuthorization(executionInput(granted.input, granted.prepared, granted.decision.id));
    const afterGrantedValidation = await counts(pool);
    assert.equal(valid.allowed, true, JSON.stringify(valid));
    assert.equal(valid.reasonCode, "authorization_valid");
    assert.deepEqual(afterGrantedValidation, beforeGrantedValidation);

    const requestedOnly = await bridge.prepareImplementationAuthorizationRequest(prepareInput(`${suffix}-requested`));
    const requested = await validator.validateImprovementExecutionAuthorization(
      executionInput(prepareInput(`${suffix}-requested`), requestedOnly, randomUUID(), {
        implementationAuthorizationRef: {
          approvalRequestId: requestedOnly.approvalRequest.id,
          approvalDecisionId: randomUUID(),
          evidencePackageId: requestedOnly.evidencePackage.id,
          sourceTable: "gnr8_aaf_approval_decisions",
        },
      }),
    );
    assert.equal(requested.allowed, false);
    assert.equal(requested.reasonCode, "approval_required");

    const wrongScopeRequest = await aafWriter.withTransaction((tx) =>
      aafWriter.createApprovalRequest(tx, {
        tenantId: granted.input.tenantId,
        clientId: granted.input.clientId,
        siteId: granted.input.siteId,
        scope: "publish_activation",
        subjectType: "single_site_improvement_proposal_plan",
        subjectId: granted.input.proposalPlanId,
        requesterActorType: "human",
        requesterActorId: "wrong-scope-requester",
        requesterRole: "migration_operator",
        policyVersion: granted.input.policyVersion,
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
        policyVersion: granted.input.policyVersion,
        evidencePackageId: granted.prepared.evidencePackage.id,
        correlationId: `corr-wrong-scope-decision-${suffix}`,
        idempotencyKey: `idem-wrong-scope-decision-${suffix}`,
      }),
    );
    const wrongScope = await validator.validateImprovementExecutionAuthorization(
      executionInput(granted.input, granted.prepared, wrongScopeDecision.id, {
        implementationAuthorizationRef: {
          approvalDecisionId: wrongScopeDecision.id,
          sourceTable: "gnr8_aaf_approval_decisions",
          sourceRecordId: wrongScopeDecision.id,
          scope: "publish_activation",
        },
      }),
    );
    assert.equal(wrongScope.allowed, false);
    assert.equal(wrongScope.reasonCode, "wrong_scope");
    assert.equal(wrongScope.prohibitedSubstitutionFlags.publishActivation, true);

    for (const [status, expected] of [
      ["rejected", "approval_rejected"],
      ["revoked", "approval_revoked"],
      ["expired", "approval_expired"],
      ["superseded", "approval_superseded"],
    ] as const) {
      const scenario = await prepareAndDecide(pool, bridge, aafWriter, `${suffix}-${status}`, status);
      const result = await validator.validateImprovementExecutionAuthorization(executionInput(scenario.input, scenario.prepared, scenario.decision.id));
      assert.equal(result.allowed, false);
      assert.equal(result.reasonCode, expected);
    }

    const changedProposal = await validator.validateImprovementExecutionAuthorization(
      executionInput(granted.input, granted.prepared, granted.decision.id, { proposalPlanSemanticWatermark: "changed-proposal-watermark" }),
    );
    assert.equal(changedProposal.allowed, false);
    assert.equal(changedProposal.driftResult.proposalWatermarkMatched, false);

    const changedRecommendation = await validator.validateImprovementExecutionAuthorization(
      executionInput(granted.input, granted.prepared, granted.decision.id, {
        expectedRecommendationWatermarks: { [granted.input.selectedRecommendationRefs[0]!.recommendationId]: "changed-recommendation-watermark" },
      }),
    );
    assert.equal(changedRecommendation.allowed, false);
    assert.equal(changedRecommendation.reasonCode, "selected_recommendation_drift");

    const changedScope = await validator.validateImprovementExecutionAuthorization(
      executionInput(granted.input, granted.prepared, granted.decision.id, { implementationScopeWatermark: "changed-scope-watermark" }),
    );
    assert.equal(changedScope.allowed, false);
    assert.equal(changedScope.reasonCode, "proposal_scope_drift");

    const finalCounts = await counts(pool);
    const afterNoopValidation = await counts(pool);
    assert.deepEqual(afterNoopValidation, finalCounts);

    const sideEffects = await pool.query<{ generated_bundle: string | null; runtime_versions: string | null; active_pointers: string | null; runtime_artifacts: string | null }>(
      `
      select
        to_regclass('public.gnr8_generated_proposal_bundles')::text as generated_bundle,
        to_regclass('public.gnr8_runtime_site_versions')::text as runtime_versions,
        to_regclass('public.gnr8_runtime_active_pointers')::text as active_pointers,
        to_regclass('public.gnr8_runtime_artifacts')::text as runtime_artifacts
      `,
    );
    assert.deepEqual(sideEffects.rows[0], { generated_bundle: null, runtime_versions: null, active_pointers: null, runtime_artifacts: null });
    assert.equal(valid.mutatesSourceTruth, false);
    assert.equal(valid.nonExecuting, true);
  } finally {
    await pool.end();
    docker(["stop", disposable.containerName]);
  }
});
