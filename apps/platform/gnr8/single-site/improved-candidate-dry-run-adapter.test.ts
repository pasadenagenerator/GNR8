import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE } from "@gnr8/runtime-contracts";

import {
  computeImprovedCandidateDryRunSemanticInputWatermark,
  dryRunImprovedCandidate,
  type ImprovedCandidateDryRunInput,
  type ImprovedCandidateDryRunRecommendationPayload,
} from "./improved-candidate-dry-run-adapter";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import { SingleSiteIdempotencyConflictError } from "./single-site-state-contracts";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const ADAPTER_PATH = path.resolve(PLATFORM_ROOT, "gnr8/single-site/improved-candidate-dry-run-adapter.ts");

function actor() {
  return { actorType: "human" as const, actorId: "dry-run-operator", actorRole: "migration_operator" };
}

function source(sourceTable: string, sourceRecordId: string, sourceWatermark = `${sourceRecordId}:watermark`) {
  return {
    sourceTable,
    sourceRecordId,
    sourceWatermark,
    contentHash: `${sourceRecordId.replace(/[^a-z0-9]/gi, "")}0123456789abcdef`.slice(0, 64),
  };
}

function validation(overrides: Partial<ImprovementExecutionAafValidationResult> = {}): ImprovementExecutionAafValidationResult {
  return {
    allowed: true,
    mode: "allowed",
    reasonCode: "authorization_valid",
    blockerCodes: [],
    matchedAafRequestDecisionRefs: {
      approvalRequestId: "auth-request-1",
      approvalDecisionId: "auth-decision-1",
      evidencePackageId: "auth-evidence-1",
      scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
      status: "granted",
    },
    matchedEvidenceRefs: [],
    matchedSubjectRefs: [],
    limitations: [],
    freshnessResult: {
      status: "fresh",
      expectedSemanticWatermark: "aaf-expected-watermark",
      actualEvidenceWatermark: "aaf-expected-watermark",
      actualFreshnessWatermark: "aaf-expected-watermark",
      checkedAt: "2026-07-31T12:00:00.000Z",
    },
    driftResult: {
      proposalWatermarkMatched: true,
      selectedRecommendationWatermarkMatched: true,
      implementationScopeWatermarkMatched: true,
      semanticWatermarkMatched: true,
      driftedRoles: [],
    },
    missingRefs: { authorization: [], subject: [], evidence: [] },
    staleRefs: { subject: [], evidence: [], freshness: [] },
    prohibitedSubstitutionFlags: {
      prohibited: false,
      proposalApproval: false,
      cloneReview: false,
      contentApproval: false,
      clientApproval: false,
      launchApproval: false,
      publishActivation: false,
      domainDdomReadiness: false,
      aiProviderAdvisory: false,
      generatedProposalBundle: false,
      commandCenterOpsInbox: false,
      unknownScope: false,
    },
    actor: actor(),
    correlationId: "corr-validation",
    idempotencyKey: "idem-validation",
    executionAttemptKey: "attempt-1",
    mutatesSourceTruth: false,
    nonExecuting: true,
    ...overrides,
  };
}

function deterministicRecommendation(overrides: Partial<ImprovedCandidateDryRunRecommendationPayload> = {}): ImprovedCandidateDryRunRecommendationPayload {
  const evidenceRef = source("gnr8_source_evidence_items", "source-text-hero", "source-text-watermark");
  return {
    recommendationId: "77777777-7777-4777-8777-777777777777",
    recommendationKey: "hero-copy",
    category: "content_clarity",
    title: "Clarify hero copy",
    summary: "Replace vague headline with operator-authored copy.",
    sourceWatermark: "recommendation-watermark",
    semanticWatermark: "recommendation-semantic-watermark",
    sourceEvidenceRefs: [evidenceRef],
    deterministicChange: {
      changeClass: "text_replacement_plan",
      target: { pagePath: "/", sectionId: "hero", field: "headline" },
      currentSourceHash: "current-hero-hash",
      plannedValue: "Clear operator-authored headline",
      evidenceRefs: [evidenceRef],
      limitationRefs: ["proposal-limitation-1"],
      operatorAuthored: true,
    },
    ...overrides,
  };
}

function buildInput(overrides: Partial<ImprovedCandidateDryRunInput> = {}): ImprovedCandidateDryRunInput {
  const base = {
    tenantId: "tenant-test",
    clientId: "22222222-2222-4222-8222-222222222222",
    siteId: "33333333-3333-4333-8333-333333333333",
    migrationId: "11111111-1111-4111-8111-111111111111",
    executionAttempt: {
      attemptId: "88888888-8888-4888-8888-888888888888",
      migrationId: "11111111-1111-4111-8111-111111111111",
      proposalPlanId: "44444444-4444-4444-8444-444444444444",
      implementationAuthorizationDecisionId: "auth-decision-1",
      semanticInputWatermark: "",
    },
    validationResult: validation(),
    implementationAuthorizationRefs: {
      requestRef: source("gnr8_aaf_approval_requests", "auth-request-1"),
      decisionRef: source("gnr8_aaf_approval_decisions", "auth-decision-1"),
      evidencePackageRef: source("gnr8_aaf_evidence_packages", "auth-evidence-1"),
    },
    proposalPlanRef: {
      ...source("gnr8_single_site_improvement_proposal_plans", "44444444-4444-4444-8444-444444444444", "proposal-plan-watermark"),
      proposalPlanId: "44444444-4444-4444-8444-444444444444",
      planVersion: 3,
      status: "approved",
      semanticWatermark: "proposal-plan-watermark",
    },
    proposalApprovalRefs: {
      approvalRequestRef: source("gnr8_aaf_approval_requests", "proposal-approval-request-1"),
      approvalDecisionRef: source("gnr8_aaf_approval_decisions", "proposal-approval-decision-1"),
      evidencePackageRef: source("gnr8_aaf_evidence_packages", "proposal-evidence-1"),
    },
    selectedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", "77777777-7777-4777-8777-777777777777", "recommendation-watermark")],
    selectedRecommendations: [deterministicRecommendation()],
    proposalLimitations: [{ limitationId: "proposal-limitation-1", summary: "Preserve source offer details." }],
    implementationAuthorizationLimitations: [{ limitationId: "auth-limitation-1", summary: "Hero scope only." }],
    evidenceRefs: {
      cloneReviewRef: source("gnr8_single_site_clone_reviews", "clone-review-1", "clone-review-watermark"),
      sourceEvidenceReviewRef: source("gnr8_single_site_source_evidence_reviews", "source-review-1", "source-review-watermark"),
      cloneSiteVersionRef: source("gnr8_runtime_site_versions", "clone-version-1", "clone-version-watermark"),
      cloneRuntimeArtifactRef: source("gnr8_runtime_artifacts", "clone-artifact-1", "clone-artifact-watermark"),
      wuProjectionRef: source("gnr8_wu_projections", "wu-1", "wu-watermark"),
      vcuProjectionRef: source("gnr8_vcu_projections", "vcu-1", "vcu-watermark"),
      cgpStyleRefs: [source("gnr8_cgp_style_evidence", "cgp-1", "cgp-watermark")],
    },
    implementationScopeSummary: "Plan deterministic hero copy change only.",
    nonGoals: ["No publish.", "No active pointer change.", "No AI generation."],
    actor: actor(),
    correlationId: "corr-dry-run",
    idempotencyKey: "idem-dry-run",
    semanticInputWatermark: "",
  } satisfies ImprovedCandidateDryRunInput;
  const merged = { ...base, ...overrides, executionAttempt: { ...base.executionAttempt, ...overrides.executionAttempt } };
  const semanticInputWatermark = computeImprovedCandidateDryRunSemanticInputWatermark(merged);
  return {
    ...merged,
    semanticInputWatermark,
    executionAttempt: { ...merged.executionAttempt, semanticInputWatermark },
  };
}

test("requires successful fresh MVP-20 validation result", () => {
  assert.throws(() => dryRunImprovedCandidate({ ...buildInput(), validationResult: undefined as never }), /validation result is required/);
  assert.throws(
    () => dryRunImprovedCandidate(buildInput({ validationResult: validation({ allowed: false, mode: "blocked", reasonCode: "approval_stale", blockerCodes: ["approval_stale"] }) })),
    /validation blocked/,
  );
  assert.throws(
    () => dryRunImprovedCandidate(buildInput({ validationResult: validation({ freshnessResult: { ...validation().freshnessResult, status: "stale" } }) })),
    /not fresh/,
  );
  assert.throws(
    () =>
      dryRunImprovedCandidate(
        buildInput({
          validationResult: validation({
            matchedAafRequestDecisionRefs: { ...validation().matchedAafRequestDecisionRefs, scope: "content_approval" },
          }),
        }),
      ),
    /scope/,
  );
});

test("maps supported deterministic recommendations and returns unsupported recommendations as not applied", () => {
  const unsupported = deterministicRecommendation({
    recommendationId: "99999999-9999-4999-8999-999999999999",
    recommendationKey: "visual-refresh",
    category: "visual_design",
    deterministicChange: null,
    requiresDesignReview: true,
  });
  const result = dryRunImprovedCandidate(
    buildInput({
      selectedRecommendationRefs: [
        source("gnr8_single_site_improvement_proposal_recommendations", "77777777-7777-4777-8777-777777777777", "recommendation-watermark"),
        source("gnr8_single_site_improvement_proposal_recommendations", "99999999-9999-4999-8999-999999999999", "visual-watermark"),
      ],
      selectedRecommendations: [deterministicRecommendation(), unsupported],
    }),
  );
  assert.equal(result.plannedChangeSet.plannedPageChanges.length, 1);
  assert.equal(result.plannedChangeSet.plannedPageChanges[0]?.changeClass, "text_replacement_plan");
  assert.equal(result.recommendationsNotApplied.length, 1);
  assert.equal(result.recommendationsNotApplied[0]?.reason, "unsupported_in_mvp");
  assert.equal(result.plannedChangeSet.unsupportedRecommendationCount, 1);
});

test("carries proposal, authorization, validation, and not-applied limitations forward", () => {
  const result = dryRunImprovedCandidate(
    buildInput({
      validationResult: validation({
        mode: "allowed_with_limitations",
        reasonCode: "authorization_valid_with_limitations",
        matchedAafRequestDecisionRefs: { ...validation().matchedAafRequestDecisionRefs, status: "granted_with_limitations" },
        limitations: [{ limitationId: "validation-limitation-1", summary: "Fresh but limited." }],
      }),
      selectedRecommendations: [
        deterministicRecommendation({
          recommendationId: "99999999-9999-4999-8999-999999999999",
          deterministicChange: null,
          sourceEvidenceRefs: [],
          requiresOperatorInput: true,
        }),
      ],
      selectedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", "99999999-9999-4999-8999-999999999999", "recommendation-watermark")],
    }),
  );
  assert.deepEqual(
    result.limitationsCarriedForward.map((entry) => entry.source),
    ["proposal", "implementation_authorization", "execution_time_aaf_validation", "recommendation_not_applied"],
  );
  assert.equal(result.recommendationsNotApplied[0]?.reason, "missing_source_evidence");
});

test("computes deterministic placeholder refs and watermarks across identical input", () => {
  const input = buildInput();
  const first = dryRunImprovedCandidate(input);
  const second = dryRunImprovedCandidate(input);
  assert.deepEqual(first, second);
  assert.match(first.expectedOutputRefs.expectedImprovedCandidateSiteVersionRef, /^gnr8:planned_site_version:[a-f0-9]{32}$/);
  assert.match(first.expectedOutputRefs.expectedImprovedRuntimeArtifactRef, /^gnr8:planned_runtime_artifact:[a-f0-9]{32}$/);
  assert.match(first.expectedOutputRefs.expectedPlannedChangeSetRef, /^gnr8:planned_change_set:[a-f0-9]{32}$/);
  assert.match(first.watermarks.plannedChangeSetWatermark, /^planned-change-set:[a-f0-9]{64}$/);
  assert.match(first.watermarks.semanticOutputWatermark, /^single-site-improved-candidate-dry-run-output:[a-f0-9]{64}$/);
});

test("same idempotency key with semantic drift fails", () => {
  const firstInput = buildInput();
  const first = dryRunImprovedCandidate(firstInput);
  const drifted = buildInput({
    selectedRecommendations: [deterministicRecommendation({ deterministicChange: { ...deterministicRecommendation().deterministicChange!, plannedValue: "Changed copy" } })],
    previousIdempotency: {
      idempotencyKey: firstInput.idempotencyKey,
      semanticInputWatermark: first.watermarks.semanticInputWatermark,
      semanticOutputWatermark: first.watermarks.semanticOutputWatermark,
    },
  });
  assert.throws(() => dryRunImprovedCandidate(drifted), SingleSiteIdempotencyConflictError);
});

test("same idempotency key and semantic input reuses deterministically", () => {
  const firstInput = buildInput();
  const first = dryRunImprovedCandidate(firstInput);
  const replay = dryRunImprovedCandidate({
    ...firstInput,
    previousIdempotency: {
      idempotencyKey: firstInput.idempotencyKey,
      semanticInputWatermark: first.watermarks.semanticInputWatermark,
      semanticOutputWatermark: first.watermarks.semanticOutputWatermark,
    },
  });
  assert.equal(replay.idempotency.result, "reused_existing_plan");
  assert.equal(replay.watermarks.semanticOutputWatermark, first.watermarks.semanticOutputWatermark);
});

test("dry-run output never grants approvals or runtime/public/provider side effects", () => {
  const result = dryRunImprovedCandidate(buildInput());
  assert.equal(result.dryRunOnly, true);
  assert.equal(result.runtimeWrites, false);
  assert.equal(result.runtimeWritePerformed, false);
  assert.equal(result.siteVersionCreated, false);
  assert.equal(result.artifactCreated, false);
  assert.equal(result.artifactBound, false);
  assert.equal(result.contentOverrideMutated, false);
  assert.equal(result.activePointerChanged, false);
  assert.equal(result.published, false);
  assert.equal(result.rolledBack, false);
  assert.equal(result.generatedProposalBundleCreated, false);
  assert.equal(result.aiProviderCalled, false);
  assert.equal(result.externalProviderCalled, false);
  assert.equal(result.contentApproved, false);
  assert.equal(result.clientApproved, false);
  assert.equal(result.launchApproved, false);
  assert.equal(result.publishApproved, false);
  assert.equal(result.mutatesSourceTruth, false);
});

test("adapter source does not import or call forbidden mutation/provider/public surfaces", () => {
  const sourceText = readFileSync(ADAPTER_PATH, "utf8");
  assert.doesNotMatch(
    sourceText,
    /from "\.\.\/runtime\/runtime-store"|from "\.\.\/runtime\/artifact-builder"|createSiteVersionFromMigration\(|createArtifact\(|bindArtifactToVersion\(|switchActivePointer\(|publishApprovedSiteVersion\(|rollbackToSiteVersionArtifact\(|upsertContentOverride\(|transformation-execute|generated-proposal-bundle-persistence|vercel|openprovider|stripe/i,
  );
});
