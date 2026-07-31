import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE } from "@gnr8/runtime-contracts";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  computeImprovedCandidateCreationSemanticInputWatermark,
  createImprovedCandidate,
  IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION,
  type ImprovedCandidateCreationAdapterDependencies,
  type ImprovedCandidateCreationInput,
} from "./improved-candidate-creation-adapter";
import {
  computeImprovedCandidateDryRunSemanticInputWatermark,
  dryRunImprovedCandidate,
  type ImprovedCandidateDryRunInput,
  type ImprovedCandidateDryRunRecommendationPayload,
} from "./improved-candidate-dry-run-adapter";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError } from "./single-site-state-contracts";

const PLATFORM_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`) ? process.cwd() : path.resolve(process.cwd(), "apps/platform");
const ADAPTER_PATH = path.resolve(PLATFORM_ROOT, "gnr8/single-site/improved-candidate-creation-adapter.ts");
const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const CLONE_VERSION_ID = "55555555-5555-4555-8555-555555555555";
const CLONE_ARTIFACT_ID = "66666666-6666-4666-8666-666666666666";
const RECOMMENDATION_ID = "77777777-7777-4777-8777-777777777777";
const ATTEMPT_ID = "88888888-8888-4888-8888-888888888888";
const TARGET_VERSION_ID = "99999999-9999-4999-8999-999999999999";

function actor() {
  return { actorType: "human" as const, actorId: "creation-operator", actorRole: "migration_operator" };
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
    executionAttemptKey: ATTEMPT_ID,
    mutatesSourceTruth: false,
    nonExecuting: true,
    ...overrides,
  };
}

function deterministicRecommendation(overrides: Partial<ImprovedCandidateDryRunRecommendationPayload> = {}): ImprovedCandidateDryRunRecommendationPayload {
  const evidenceRef = source("gnr8_source_evidence_items", "source-text-hero", "source-text-watermark");
  return {
    recommendationId: RECOMMENDATION_ID,
    recommendationKey: "hero-copy",
    category: "content_clarity",
    title: "Clarify hero copy",
    summary: "Replace vague headline with operator-authored copy.",
    sourceWatermark: "recommendation-watermark",
    semanticWatermark: "recommendation-semantic-watermark",
    sourceEvidenceRefs: [evidenceRef],
    deterministicChange: {
      changeClass: "text_replacement_plan",
      target: { pagePath: "/", sectionId: "hero", field: "heading" },
      currentSourceHash: "current-hero-hash",
      plannedValue: "Clear operator-authored headline",
      evidenceRefs: [evidenceRef],
      limitationRefs: ["proposal-limitation-1"],
      operatorAuthored: true,
    },
    ...overrides,
  };
}

function buildDryRunInput(overrides: Partial<ImprovedCandidateDryRunInput> = {}): ImprovedCandidateDryRunInput {
  const base = {
    tenantId: "tenant-test",
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    executionAttempt: {
      attemptId: ATTEMPT_ID,
      migrationId: MIGRATION_ID,
      proposalPlanId: PLAN_ID,
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
      ...source("gnr8_single_site_improvement_proposal_plans", PLAN_ID, "proposal-plan-watermark"),
      proposalPlanId: PLAN_ID,
      planVersion: 3,
      status: "approved",
      semanticWatermark: "proposal-plan-watermark",
    },
    proposalApprovalRefs: {
      approvalRequestRef: source("gnr8_aaf_approval_requests", "proposal-approval-request-1"),
      approvalDecisionRef: source("gnr8_aaf_approval_decisions", "proposal-approval-decision-1"),
      evidencePackageRef: source("gnr8_aaf_evidence_packages", "proposal-evidence-1"),
    },
    selectedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", RECOMMENDATION_ID, "recommendation-watermark")],
    selectedRecommendations: [deterministicRecommendation()],
    proposalLimitations: [{ limitationId: "proposal-limitation-1", summary: "Preserve source offer details." }],
    implementationAuthorizationLimitations: [{ limitationId: "auth-limitation-1", summary: "Hero scope only." }],
    evidenceRefs: {
      cloneReviewRef: source("gnr8_single_site_clone_reviews", "clone-review-1", "clone-review-watermark"),
      sourceEvidenceReviewRef: source("gnr8_single_site_source_evidence_reviews", "source-review-1", "source-review-watermark"),
      cloneSiteVersionRef: source("gnr8_runtime_site_versions", CLONE_VERSION_ID, "clone-version-watermark"),
      cloneRuntimeArtifactRef: source("gnr8_runtime_artifacts", CLONE_ARTIFACT_ID, "clone-artifact-watermark"),
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

function buildCreationInput(overrides: Partial<ImprovedCandidateCreationInput> = {}): ImprovedCandidateCreationInput {
  const dryRunInput = buildDryRunInput(overrides.dryRunResult ? {} : undefined);
  const dryRunResult = overrides.dryRunResult ?? dryRunImprovedCandidate(dryRunInput);
  const base = {
    tenantId: dryRunInput.tenantId,
    clientId: dryRunInput.clientId,
    siteId: dryRunInput.siteId,
    migrationId: dryRunInput.migrationId,
    executionAttempt: { ...dryRunInput.executionAttempt, status: "ready" },
    validationResult: dryRunInput.validationResult,
    implementationAuthorizationRefs: dryRunInput.implementationAuthorizationRefs,
    proposalPlanRef: dryRunInput.proposalPlanRef,
    proposalApprovalRefs: dryRunInput.proposalApprovalRefs,
    selectedRecommendationRefs: dryRunInput.selectedRecommendationRefs,
    selectedRecommendations: dryRunInput.selectedRecommendations,
    dryRunResult,
    dryRunSemanticInputWatermark: dryRunResult.watermarks.semanticInputWatermark,
    dryRunPlannedChangeSetWatermark: dryRunResult.watermarks.plannedChangeSetWatermark,
    dryRunSemanticOutputWatermark: dryRunResult.watermarks.semanticOutputWatermark,
    proposalLimitations: dryRunInput.proposalLimitations,
    implementationAuthorizationLimitations: dryRunInput.implementationAuthorizationLimitations,
    evidenceRefs: dryRunInput.evidenceRefs,
    implementationScopeSummary: dryRunInput.implementationScopeSummary,
    nonGoals: dryRunInput.nonGoals,
    actor: actor(),
    correlationId: "corr-creation",
    idempotencyKey: "idem-creation",
    targetCandidateSiteVersionId: TARGET_VERSION_ID,
    semanticInputWatermark: "",
  } satisfies ImprovedCandidateCreationInput;
  const merged = { ...base, ...overrides, executionAttempt: { ...base.executionAttempt, ...overrides.executionAttempt } };
  const semanticInputWatermark = computeImprovedCandidateCreationSemanticInputWatermark(merged);
  return { ...merged, semanticInputWatermark };
}

function cloneVersion(overrides: Partial<CanonicalSiteVersionSnapshot> = {}): CanonicalSiteVersionSnapshot {
  return {
    id: CLONE_VERSION_ID,
    siteId: "runtime-site-source",
    versionNo: 4,
    state: "DRAFT",
    source: "migration",
    actor: "test:clone",
    createdAt: "2026-07-31T12:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: CLONE_ARTIFACT_ID,
    importProvenanceSummary: { kind: "runtime_import_provenance_summary_v1" },
    pages: [
      {
        id: "page-version-clone",
        siteVersionId: CLONE_VERSION_ID,
        pageId: "page-home",
        path: "/",
        title: "Clone Home",
        structureModel: { sections: [{ id: "hero", type: "hero", order: 0 }] },
        contentModel: { sectionProps: { hero: { heading: "Source Hero", body: "Source body" } } },
        styleTokens: { "color.background": "#ffffff", "color.text": "#111111" },
        assetGraph: [],
        semanticSignals: [{ label: "source.clone", confidence: 1, source: "migration" }],
        migrationGovernance: null,
        source: "migration",
        actor: "test:clone",
        createdAt: "2026-07-31T12:00:00.000Z",
      },
    ],
    ...overrides,
  } as CanonicalSiteVersionSnapshot;
}

function cloneArtifact(): RuntimeArtifact {
  return {
    id: CLONE_ARTIFACT_ID,
    siteId: "runtime-site-source",
    siteVersionId: CLONE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html><body>clone</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { sourceKind: "single_site_real_clone_executor" },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["SINGLE_SITE_CLONE_READY_FOR_REVIEW"],
      pageRolloutPolicyState: ["SINGLE_SITE_CLONE_REVIEW_REQUIRED"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "SINGLE_SITE_CLONE_READY_FOR_REVIEW",
      siteRolloutPolicyState: "SINGLE_SITE_CLONE_REVIEW_REQUIRED",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
    bundleSha256: "clone-bundle",
    createdAt: "2026-07-31T12:00:00.000Z",
  };
}

function fakeDeps() {
  const calls: string[] = [];
  const versions = new Map<string, CanonicalSiteVersionSnapshot>([[CLONE_VERSION_ID, cloneVersion()]]);
  const artifacts = new Map<string, RuntimeArtifact>([[CLONE_ARTIFACT_ID, cloneArtifact()]]);
  const artifactBySiteVersion = new Map<string, string>([[CLONE_VERSION_ID, CLONE_ARTIFACT_ID]]);
  const serviceCalls: string[] = [];
  const deps = {
    calls,
    serviceCalls,
    versions,
    artifacts,
    getSiteVersion: async (siteVersionId: string) => {
      calls.push(`getSiteVersion:${siteVersionId}`);
      return versions.get(siteVersionId) ?? null;
    },
    getArtifactById: async (artifactId: string) => {
      calls.push(`getArtifactById:${artifactId}`);
      return artifacts.get(artifactId) ?? null;
    },
    createSiteVersionFromMigration: async (input: {
      siteId: string;
      actor: string;
      rendererCompatibilityVersion: string;
      importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
      pages: CanonicalPageVersionInput[];
      siteVersionId?: string;
    }) => {
      calls.push("createSiteVersionFromMigration");
      const id = input.siteVersionId ?? TARGET_VERSION_ID;
      const existing = versions.get(id);
      if (existing) return { siteId: existing.siteId, siteVersionId: existing.id, versionNo: existing.versionNo };
      versions.set(id, {
        ...cloneVersion(),
        id,
        siteId: input.siteId,
        versionNo: 5,
        actor: input.actor,
        artifactId: null,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        importProvenanceSummary: input.importProvenanceSummary,
        pages: input.pages.map((page, index) => ({
          ...page,
          id: `page-version-candidate-${index}`,
          siteVersionId: id,
          createdAt: "2026-07-31T12:01:00.000Z",
        })),
      });
      return { siteId: input.siteId, siteVersionId: id, versionNo: 5 };
    },
    buildDeterministicArtifactBundle: (input: { siteVersion: CanonicalSiteVersionSnapshot; renderMode: RenderMode }) => {
      calls.push("buildDeterministicArtifactBundle");
      return {
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
        bundleSha256: `bundle-${input.siteVersion.id}-${input.siteVersion.pages[0]?.contentModel.sectionProps.hero?.heading ?? "none"}`,
        htmlByPath: { "/": `<html><body>${input.siteVersion.pages[0]?.contentModel.sectionProps.hero?.heading ?? ""}</body></html>` },
        compiledTokenStyles: "",
        assetFingerprintMap: {},
        manifest: { renderMode: input.renderMode, siteVersionId: input.siteVersion.id },
      };
    },
    createArtifact: async (input: {
      siteId: string;
      siteVersionId: string;
      rendererCompatibilityVersion: string;
      bundleSha256: string;
      htmlByPath: Record<string, string>;
      compiledTokenStyles: string;
      assetFingerprintMap: Record<string, string>;
      manifest: Record<string, unknown>;
      publishStage: RuntimeArtifact["publishStage"];
      shadowRestricted: boolean;
      artifactGovernance: RuntimeArtifact["artifactGovernance"];
    }) => {
      calls.push("createArtifact");
      const existingId = artifactBySiteVersion.get(input.siteVersionId);
      if (existingId) return { artifactId: existingId };
      const artifactId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      artifacts.set(artifactId, {
        id: artifactId,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        htmlByPath: input.htmlByPath,
        compiledTokenStyles: input.compiledTokenStyles,
        assetFingerprintMap: input.assetFingerprintMap,
        manifest: input.manifest,
        publishStage: input.publishStage,
        shadowRestricted: input.shadowRestricted,
        artifactGovernance: input.artifactGovernance,
        bundleSha256: input.bundleSha256,
        createdAt: "2026-07-31T12:02:00.000Z",
      });
      artifactBySiteVersion.set(input.siteVersionId, artifactId);
      return { artifactId };
    },
    bindArtifactToVersion: async (input: { siteVersionId: string; artifactId: string }) => {
      calls.push("bindArtifactToVersion");
      const version = versions.get(input.siteVersionId);
      assert.ok(version);
      versions.set(input.siteVersionId, { ...version, artifactId: input.artifactId });
      return { affectedRows: 1 };
    },
    executionService: {
      async markStarted() {
        serviceCalls.push("markStarted");
        return { reusedExisting: false, attempt: { status: "started" } };
      },
      async recordImprovedCandidateCreationResult() {
        serviceCalls.push("recordImprovedCandidateCreationResult");
        return { reusedExisting: false, attempt: { status: "started" }, items: [], refs: [] };
      },
      async markCompleted() {
        serviceCalls.push("markCompleted");
        return { reusedExisting: false, attempt: { status: "completed" } };
      },
      async markCompletedWithLimitations() {
        serviceCalls.push("markCompletedWithLimitations");
        return { reusedExisting: false, attempt: { status: "completed_with_limitations" } };
      },
    } as unknown as NonNullable<ImprovedCandidateCreationAdapterDependencies["executionService"]>,
  };
  return deps;
}

test("adapter is server-only and avoids forbidden route/provider/publish imports", () => {
  const sourceText = readFileSync(ADAPTER_PATH, "utf8");
  assert.match(sourceText, /^import "server-only";/);
  assert.doesNotMatch(sourceText, /from\s+["'][^"']*(app\/api|server-actions|generated-website-proposal|stripe|vercel|openprovider|dns|provider|command-center|ops-inbox|client-portal|rollback-switch)[^"']*["']/i);
  assert.doesNotMatch(sourceText, /\bswitchActivePointer\b|\bmarkSiteVersionPublished\b|\bpublishDraftContentOverrides\b|\bupsertDomainHostBinding\b|\bGeneratedProposalBundle\b/i);
});

test("fails closed for missing or blocked MVP-20 validation", async () => {
  await assert.rejects(() => createImprovedCandidate({ ...buildCreationInput(), validationResult: undefined as never }, fakeDeps()), /validation result is required/);
  await assert.rejects(
    () => createImprovedCandidate(buildCreationInput({ validationResult: validation({ allowed: false, mode: "blocked", reasonCode: "approval_stale", blockerCodes: ["approval_stale"] }) }), fakeDeps()),
    /validation blocked/,
  );
});

test("fails closed for dry-run mismatch, missing dry-run, unsupported required recommendation, and non-ready attempt", async () => {
  await assert.rejects(() => createImprovedCandidate({ ...buildCreationInput(), dryRunResult: undefined as never }, fakeDeps()), /dry-run result is required/);
  await assert.rejects(() => createImprovedCandidate({ ...buildCreationInput(), dryRunPlannedChangeSetWatermark: "drift" }, fakeDeps()), /planned change set watermark mismatch/);

  const unsupportedDryRunInput = buildDryRunInput({
    selectedRecommendationRefs: [source("gnr8_single_site_improvement_proposal_recommendations", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "unsupported-watermark")],
    selectedRecommendations: [
      deterministicRecommendation({
        recommendationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        recommendationKey: "visual-refresh",
        category: "visual_design",
        sourceWatermark: "unsupported-watermark",
        deterministicChange: null,
      }),
    ],
  });
  const unsupportedDryRun = dryRunImprovedCandidate(unsupportedDryRunInput);
  await assert.rejects(
    () =>
      createImprovedCandidate(
        buildCreationInput({
          selectedRecommendationRefs: unsupportedDryRunInput.selectedRecommendationRefs,
          selectedRecommendations: unsupportedDryRunInput.selectedRecommendations,
          dryRunResult: unsupportedDryRun,
          dryRunSemanticInputWatermark: unsupportedDryRun.watermarks.semanticInputWatermark,
          dryRunPlannedChangeSetWatermark: unsupportedDryRun.watermarks.plannedChangeSetWatermark,
          dryRunSemanticOutputWatermark: unsupportedDryRun.watermarks.semanticOutputWatermark,
          executionAttempt: { ...unsupportedDryRunInput.executionAttempt, status: "ready" },
        }),
        fakeDeps(),
      ),
    /unsupported required recommendation/,
  );
  await assert.rejects(() => createImprovedCandidate(buildCreationInput({ executionAttempt: { ...buildCreationInput().executionAttempt, status: "draft" } }), fakeDeps()), /cannot create/);
});

test("creates non-published candidate version and artifact, applies supported changes, and records execution output", async () => {
  const deps = fakeDeps();
  const output = await createImprovedCandidate(buildCreationInput(), deps);

  assert.equal(output.status, "completed_with_limitations");
  assert.equal(output.adapterVersion, IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION);
  assert.equal(output.refs.migrationRef, `gnr8:single_site_migration:${MIGRATION_ID}`);
  assert.equal(output.refs.executionAttemptRef, `gnr8:improvement_execution_attempt:${ATTEMPT_ID}`);
  assert.equal(output.refs.improvedCandidateSiteVersionRef, `gnr8:site_version:${TARGET_VERSION_ID}`);
  assert.equal(output.refs.cloneSiteVersionRef, `gnr8:site_version:${CLONE_VERSION_ID}`);
  assert.equal(output.refs.cloneRuntimeArtifactRef, `gnr8:runtime_artifact:${CLONE_ARTIFACT_ID}`);
  assert.equal(output.refs.proposalPlanRef, `gnr8:proposal_plan:${PLAN_ID}`);
  assert.equal(output.refs.implementationAuthorizationRef, "gnr8:implementation_authorization:auth-decision-1");
  assert.match(output.refs.plannedChangeSetRef, /^gnr8:planned_change_set:/);
  assert.match(output.watermarks.semanticOutputWatermark, /^single-site-improved-candidate-creation-output:[a-f0-9]{64}$/);
  assert.match(output.watermarks.runtimeOutputBundleWatermark, /^runtime-output-bundle:/);
  assert.deepEqual(deps.calls.filter((call) => !call.startsWith("get")), [
    "buildDeterministicArtifactBundle",
    "createSiteVersionFromMigration",
    "buildDeterministicArtifactBundle",
    "createArtifact",
    "bindArtifactToVersion",
  ]);
  assert.deepEqual(deps.serviceCalls, ["markStarted", "recordImprovedCandidateCreationResult", "markCompletedWithLimitations"]);
  const candidate = deps.versions.get(TARGET_VERSION_ID);
  assert.equal(candidate?.state, "DRAFT");
  assert.equal(candidate?.artifactId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.heading, "Clear operator-authored headline");
  assert.equal(deps.versions.get(CLONE_VERSION_ID)?.pages[0]?.contentModel.sectionProps.hero?.heading, "Source Hero");
  const artifact = deps.artifacts.get("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(artifact?.publishStage, "shadow");
  assert.equal(artifact?.artifactGovernance.siteGateState, "SINGLE_SITE_IMPROVED_CANDIDATE_READY_FOR_REVIEW");
  assert.equal(output.activePointerChanged, false);
  assert.equal(output.published, false);
  assert.equal(output.generatedProposalBundleCreated, false);
  assert.equal(output.aiProviderCalled, false);
  assert.equal(output.contentApproved, false);
  assert.equal(output.clientApproved, false);
  assert.equal(output.launchApproved, false);
  assert.equal(output.publishApproved, false);
});

test("does not apply recommendations that MVP-23 marked not applied and carries limitations forward", async () => {
  const optionalUnsupported = deterministicRecommendation({
    recommendationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    recommendationKey: "visual-refresh",
    category: "visual_design",
    status: "optional",
    sourceWatermark: "unsupported-watermark",
    deterministicChange: null,
    requiresDesignReview: true,
  });
  const dryRunInput = buildDryRunInput({
    selectedRecommendationRefs: [
      source("gnr8_single_site_improvement_proposal_recommendations", RECOMMENDATION_ID, "recommendation-watermark"),
      source("gnr8_single_site_improvement_proposal_recommendations", optionalUnsupported.recommendationId, "unsupported-watermark"),
    ],
    selectedRecommendations: [deterministicRecommendation(), optionalUnsupported],
  });
  const dryRun = dryRunImprovedCandidate(dryRunInput);
  const output = await createImprovedCandidate(
    buildCreationInput({
      selectedRecommendationRefs: dryRunInput.selectedRecommendationRefs,
      selectedRecommendations: dryRunInput.selectedRecommendations,
      dryRunResult: dryRun,
      dryRunSemanticInputWatermark: dryRun.watermarks.semanticInputWatermark,
      dryRunPlannedChangeSetWatermark: dryRun.watermarks.plannedChangeSetWatermark,
      dryRunSemanticOutputWatermark: dryRun.watermarks.semanticOutputWatermark,
      executionAttempt: { ...dryRunInput.executionAttempt, status: "ready" },
    }),
    fakeDeps(),
  );
  assert.deepEqual(output.appliedRecommendationRefs, [`gnr8:improvement_recommendation:${RECOMMENDATION_ID}`]);
  assert.ok(output.notAppliedRecommendationRefs.includes(`gnr8:improvement_recommendation:${optionalUnsupported.recommendationId}`));
  assert.ok(output.limitationsCarriedForward.length >= dryRun.limitationsCarriedForward.length);
});

test("idempotent replay reuses output and semantic drift fails", async () => {
  const deps = fakeDeps();
  const first = await createImprovedCandidate(buildCreationInput(), deps);
  const second = await createImprovedCandidate(buildCreationInput(), deps);
  assert.equal(second.idempotency.reused, true);
  assert.equal(second.refs.improvedCandidateSiteVersionRef, first.refs.improvedCandidateSiteVersionRef);
  assert.equal(second.refs.improvedRuntimeArtifactRef, first.refs.improvedRuntimeArtifactRef);
  assert.equal(deps.calls.filter((call) => call === "createSiteVersionFromMigration").length, 1);

  const drifted = buildCreationInput({
    proposalLimitations: [{ limitationId: "proposal-limitation-1", summary: "Changed." }],
  });
  await assert.rejects(() => createImprovedCandidate(drifted, deps), SingleSiteIdempotencyConflictError);
});

test("does not call active pointer, publish, provider, AI, Generated Proposal Bundle, or approval paths", async () => {
  const deps = fakeDeps();
  const output = await createImprovedCandidate(buildCreationInput(), deps);
  assert.deepEqual([...new Set(deps.calls.map((call) => call.split(":")[0]))].sort(), [
    "bindArtifactToVersion",
    "buildDeterministicArtifactBundle",
    "createArtifact",
    "createSiteVersionFromMigration",
    "getArtifactById",
    "getSiteVersion",
  ]);
  assert.equal(output.nonApprovalBoundary.contentApprovalGranted, false);
  assert.equal(output.nonApprovalBoundary.clientApprovalGranted, false);
  assert.equal(output.nonApprovalBoundary.launchApprovalGranted, false);
  assert.equal(output.nonApprovalBoundary.publishActivationApprovalGranted, false);
  assert.equal(output.mutationBoundary.mutatesActivePointer, false);
  assert.equal(output.mutationBoundary.publishes, false);
  assert.equal(output.mutationBoundary.callsAiProviders, false);
  assert.equal(output.mutationBoundary.callsExternalProviders, false);
  assert.equal(output.mutationBoundary.createsGeneratedProposalBundles, false);
});
