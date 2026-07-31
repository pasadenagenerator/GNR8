import "server-only";

import { createHash } from "node:crypto";

import { AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE } from "@gnr8/runtime-contracts";

import type { ImplementationAuthorizationSourceRef } from "./implementation-authorization-bridge";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import { SingleSiteIdempotencyConflictError, SingleSiteTransitionError, type SingleSiteJsonObject } from "./single-site-state-contracts";
import type { SingleSiteActorInput } from "./single-site-state-writer-repository";

export const IMPROVED_CANDIDATE_DRY_RUN_ADAPTER_VERSION = "mvp-23-improved-candidate-dry-run-adapter:v1" as const;

export const IMPROVED_CANDIDATE_DRY_RUN_SUPPORTED_CATEGORIES = [
  "content_clarity",
  "seo",
  "aeo",
  "trust_credibility",
  "technical_cleanup",
  "accessibility",
  "performance",
] as const;

export const IMPROVED_CANDIDATE_DRY_RUN_CHANGE_CLASSES = [
  "text_replacement_plan",
  "metadata_update_plan",
  "heading_structure_plan",
  "alt_text_plan",
  "internal_link_plan",
  "structured_data_plan",
  "performance_asset_plan",
  "manual_note_plan",
] as const;

export const IMPROVED_CANDIDATE_DRY_RUN_NOT_APPLIED_REASONS = [
  "requires_operator_input",
  "requires_ai_execution",
  "requires_asset_selection",
  "requires_design_review",
  "unsupported_in_mvp",
  "missing_source_evidence",
  "outside_scope",
] as const;

export type ImprovedCandidateDryRunSupportedCategory = (typeof IMPROVED_CANDIDATE_DRY_RUN_SUPPORTED_CATEGORIES)[number];
export type ImprovedCandidateDryRunChangeClass = (typeof IMPROVED_CANDIDATE_DRY_RUN_CHANGE_CLASSES)[number];
export type ImprovedCandidateDryRunNotAppliedReason = (typeof IMPROVED_CANDIDATE_DRY_RUN_NOT_APPLIED_REASONS)[number];

export type ImprovedCandidateDryRunExecutionAttemptRef = {
  attemptId: string;
  migrationId: string;
  proposalPlanId: string;
  implementationAuthorizationDecisionId: string;
  semanticInputWatermark: string;
};

export type ImprovedCandidateDryRunProposalPlanRef = ImplementationAuthorizationSourceRef & {
  proposalPlanId: string;
  planVersion: string | number;
  status: "approved" | "approved_with_limitations" | string;
  semanticWatermark: string;
};

export type ImprovedCandidateDryRunProposalApprovalRefs = {
  approvalRequestRef: ImplementationAuthorizationSourceRef;
  approvalDecisionRef: ImplementationAuthorizationSourceRef;
  evidencePackageRef: ImplementationAuthorizationSourceRef;
};

export type ImprovedCandidateDryRunImplementationAuthorizationRefs = {
  requestRef: ImplementationAuthorizationSourceRef;
  decisionRef: ImplementationAuthorizationSourceRef;
  evidencePackageRef: ImplementationAuthorizationSourceRef;
};

export type ImprovedCandidateDryRunEvidenceRefs = {
  cloneReviewRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef;
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  cloneRuntimeArtifactRef: ImplementationAuthorizationSourceRef;
  wuProjectionRef?: ImplementationAuthorizationSourceRef | null;
  vcuProjectionRef?: ImplementationAuthorizationSourceRef | null;
  cgpStyleRefs?: ImplementationAuthorizationSourceRef[];
  sourceCaptureRefs?: ImplementationAuthorizationSourceRef[];
  generatedProposalBundleAdvisoryRefs?: ImplementationAuthorizationSourceRef[];
  aiProviderAdvisoryRefs?: ImplementationAuthorizationSourceRef[];
  externalEvidenceRefs?: ImplementationAuthorizationSourceRef[];
};

export type ImprovedCandidateDryRunTargetIdentity = {
  pagePath?: string | null;
  pageId?: string | null;
  sectionId?: string | null;
  field?: string | null;
  assetRef?: string | null;
  tokenName?: string | null;
  linkTarget?: string | null;
  schemaType?: string | null;
};

export type ImprovedCandidateDryRunRecommendationDeterministicPayload = {
  changeClass?: ImprovedCandidateDryRunChangeClass | null;
  target: ImprovedCandidateDryRunTargetIdentity;
  currentSourceHash: string;
  plannedValue?: unknown;
  plannedValueHash?: string | null;
  evidenceRefs?: ImplementationAuthorizationSourceRef[];
  limitationRefs?: string[];
  operatorAuthored: true;
};

export type ImprovedCandidateDryRunRecommendationPayload = {
  recommendationId: string;
  recommendationKey?: string | null;
  category: ImprovedCandidateDryRunSupportedCategory | string;
  status?: string | null;
  title?: string | null;
  summary?: string | null;
  sourceWatermark: string;
  semanticWatermark?: string | null;
  sourceEvidenceRefs?: ImplementationAuthorizationSourceRef[];
  advisoryRefs?: ImplementationAuthorizationSourceRef[];
  limitations?: unknown[];
  deterministicChange?: ImprovedCandidateDryRunRecommendationDeterministicPayload | null;
  requiresOperatorInput?: boolean | null;
  requiresAiExecution?: boolean | null;
  requiresAssetSelection?: boolean | null;
  requiresDesignReview?: boolean | null;
  outsideScope?: boolean | null;
};

export type ImprovedCandidateDryRunInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  executionAttempt: ImprovedCandidateDryRunExecutionAttemptRef;
  validationResult: ImprovementExecutionAafValidationResult;
  implementationAuthorizationRefs: ImprovedCandidateDryRunImplementationAuthorizationRefs;
  proposalPlanRef: ImprovedCandidateDryRunProposalPlanRef;
  proposalApprovalRefs: ImprovedCandidateDryRunProposalApprovalRefs;
  selectedRecommendationRefs: ImplementationAuthorizationSourceRef[];
  selectedRecommendations: ImprovedCandidateDryRunRecommendationPayload[];
  proposalLimitations: unknown[];
  implementationAuthorizationLimitations: unknown[];
  evidenceRefs: ImprovedCandidateDryRunEvidenceRefs;
  implementationScopeSummary: string;
  nonGoals: string[];
  actor: SingleSiteActorInput;
  correlationId: string;
  idempotencyKey: string;
  semanticInputWatermark: string;
  previousIdempotency?: {
    idempotencyKey: string;
    semanticInputWatermark: string;
    semanticOutputWatermark?: string | null;
  } | null;
  adapterVersion?: string | null;
};

export type ImprovedCandidatePlannedChange = {
  changeId: string;
  changeClass: ImprovedCandidateDryRunChangeClass;
  recommendationRef: string;
  recommendationId: string;
  category: string;
  target: ImprovedCandidateDryRunTargetIdentity;
  currentSourceHash: string;
  plannedValueHash: string;
  evidenceRefs: SingleSiteJsonObject[];
  limitationRefs: string[];
  executionSupportStatus: "deterministic_supported";
  noWriteProof: {
    runtimeWritePerformed: false;
    activePointerChanged: false;
    aiProviderCalled: false;
    generatedProposalBundleCreated: false;
  };
};

export type ImprovedCandidateRecommendationNotApplied = {
  recommendationRef: string;
  recommendationId: string;
  category: string;
  reason: ImprovedCandidateDryRunNotAppliedReason;
  details: string;
  executionSupportStatus: "operator_input_required" | "advisory_only" | "unsupported" | "deferred_manual";
  evidenceRefs: SingleSiteJsonObject[];
  limitationCarriedForward: SingleSiteJsonObject;
};

export type ImprovedCandidatePlannedChangeSet = {
  changeSetId: string;
  changeSetRef: string;
  sourceCloneSiteVersionRef: string;
  sourceCloneArtifactRef: string;
  targetCandidateSiteVersionPlaceholder: string;
  targetArtifactPlaceholder: string;
  selectedRecommendationsApplied: string[];
  selectedRecommendationsNotApplied: string[];
  plannedPageChanges: ImprovedCandidatePlannedChange[];
  plannedMetadataChanges: ImprovedCandidatePlannedChange[];
  plannedAssetChanges: ImprovedCandidatePlannedChange[];
  plannedStyleTokenChanges: ImprovedCandidatePlannedChange[];
  limitationsCarriedForward: SingleSiteJsonObject[];
  warnings: SingleSiteJsonObject[];
  unsupportedRecommendationCount: number;
  manualOperatorInputRequiredCount: number;
};

export type ImprovedCandidateDryRunResult = {
  mode: "dry_run";
  status: "planned" | "planned_with_limitations";
  adapterVersion: typeof IMPROVED_CANDIDATE_DRY_RUN_ADAPTER_VERSION | string;
  executionAttemptRef: ImprovedCandidateDryRunExecutionAttemptRef;
  inputRefs: SingleSiteJsonObject;
  plannedChangeSet: ImprovedCandidatePlannedChangeSet;
  dryRunSummary: SingleSiteJsonObject;
  expectedOutputRefs: {
    expectedImprovedCandidateSiteVersionRef: string;
    expectedImprovedRuntimeArtifactRef: string;
    expectedPlannedChangeSetRef: string;
    expectedArtifactBundleSha256: string;
  };
  selectedRecommendationRefsApplied: string[];
  appliedRecommendationRefs: string[];
  recommendationsNotApplied: ImprovedCandidateRecommendationNotApplied[];
  notAppliedRecommendationRefs: string[];
  limitationsCarriedForward: SingleSiteJsonObject[];
  warnings: SingleSiteJsonObject[];
  evidenceRefs: SingleSiteJsonObject;
  watermarks: {
    semanticInputWatermark: string;
    computedSemanticInputWatermark: string;
    selectedRecommendationsWatermark: string;
    implementationScopeWatermark: string;
    limitationsWatermark: string;
    plannedChangeSetWatermark: string;
    noWriteProofWatermark: string;
    semanticOutputWatermark: string;
  };
  idempotency: {
    key: string;
    result: "new_plan" | "reused_existing_plan";
    reused: boolean;
  };
  dryRunOnly: true;
  runtimeWrites: false;
  runtimeWritePerformed: false;
  siteVersionCreated: false;
  artifactCreated: false;
  artifactBound: false;
  contentOverrideMutated: false;
  activePointerChanged: false;
  published: false;
  rolledBack: false;
  generatedProposalBundleCreated: false;
  aiProviderCalled: false;
  externalProviderCalled: false;
  contentApproved: false;
  clientApproved: false;
  launchApproved: false;
  publishApproved: false;
  mutatesSourceTruth: false;
};

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(field: string, value: unknown): string {
  const text = optionalText(value);
  if (!text) throw new SingleSiteTransitionError(`${field} is required`, [field]);
  return text;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function watermark(prefix: string, value: unknown): string {
  return `${prefix}:${digest(value)}`;
}

function shortHash(value: unknown): string {
  return digest(value).slice(0, 32);
}

function jsonObject(value: unknown): SingleSiteJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as SingleSiteJsonObject;
}

function jsonRef(ref: ImplementationAuthorizationSourceRef): SingleSiteJsonObject {
  return {
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceVersion: ref.sourceVersion ?? null,
    sourceWatermark: ref.sourceWatermark,
    contentHash: ref.contentHash ?? null,
    metadataJson: jsonObject(ref.metadataJson),
  };
}

function assertRequiredInput(input: ImprovedCandidateDryRunInput): void {
  requiredText("tenantId", input.tenantId);
  requiredText("clientId", input.clientId);
  requiredText("siteId", input.siteId);
  requiredText("migrationId", input.migrationId);
  requiredText("executionAttempt.attemptId", input.executionAttempt?.attemptId);
  requiredText("executionAttempt.migrationId", input.executionAttempt?.migrationId);
  requiredText("implementationAuthorizationRefs.requestRef.sourceRecordId", input.implementationAuthorizationRefs?.requestRef?.sourceRecordId);
  requiredText("implementationAuthorizationRefs.decisionRef.sourceRecordId", input.implementationAuthorizationRefs?.decisionRef?.sourceRecordId);
  requiredText("proposalPlanRef.proposalPlanId", input.proposalPlanRef?.proposalPlanId);
  requiredText("proposalApprovalRefs.approvalDecisionRef.sourceRecordId", input.proposalApprovalRefs?.approvalDecisionRef?.sourceRecordId);
  requiredText("evidenceRefs.cloneReviewRef.sourceRecordId", input.evidenceRefs?.cloneReviewRef?.sourceRecordId);
  requiredText("evidenceRefs.sourceEvidenceReviewRef.sourceRecordId", input.evidenceRefs?.sourceEvidenceReviewRef?.sourceRecordId);
  requiredText("evidenceRefs.cloneSiteVersionRef.sourceRecordId", input.evidenceRefs?.cloneSiteVersionRef?.sourceRecordId);
  requiredText("evidenceRefs.cloneRuntimeArtifactRef.sourceRecordId", input.evidenceRefs?.cloneRuntimeArtifactRef?.sourceRecordId);
  requiredText("implementationScopeSummary", input.implementationScopeSummary);
  if (!Array.isArray(input.nonGoals) || input.nonGoals.length === 0) throw new SingleSiteTransitionError("nonGoals are required", ["nonGoals"]);
  requiredText("actor.actorType", input.actor?.actorType);
  requiredText("actor.actorId", input.actor?.actorId);
  requiredText("actor.actorRole", input.actor?.actorRole);
  requiredText("correlationId", input.correlationId);
  requiredText("idempotencyKey", input.idempotencyKey);
  requiredText("semanticInputWatermark", input.semanticInputWatermark);
  if (!Array.isArray(input.selectedRecommendationRefs) || input.selectedRecommendationRefs.length === 0) {
    throw new SingleSiteTransitionError("selectedRecommendationRefs are required", ["selectedRecommendationRefs"]);
  }
  if (!Array.isArray(input.selectedRecommendations) || input.selectedRecommendations.length === 0) {
    throw new SingleSiteTransitionError("selectedRecommendations are required", ["selectedRecommendations"]);
  }
  if (!Array.isArray(input.proposalLimitations)) throw new SingleSiteTransitionError("proposalLimitations are required", ["proposalLimitations"]);
  if (!Array.isArray(input.implementationAuthorizationLimitations)) {
    throw new SingleSiteTransitionError("implementationAuthorizationLimitations are required", ["implementationAuthorizationLimitations"]);
  }
}

function assertValidationAllowsDryRun(input: ImprovedCandidateDryRunInput): void {
  const validation = input.validationResult;
  if (!validation) throw new SingleSiteTransitionError("successful MVP-20 validation result is required", ["validationResult"]);
  if (!validation.allowed || validation.mode === "blocked") {
    throw new SingleSiteTransitionError(`MVP-20 validation blocked dry-run: ${validation.reasonCode}`, validation.blockerCodes);
  }
  if (!["allowed", "allowed_with_limitations"].includes(validation.mode)) {
    throw new SingleSiteTransitionError(`unsupported MVP-20 validation mode ${validation.mode}`, ["validation_mode"]);
  }
  if (validation.mutatesSourceTruth !== false || validation.nonExecuting !== true) {
    throw new SingleSiteTransitionError("MVP-20 validation must be non-executing and non-mutating", ["validation_boundary"]);
  }
  if (validation.freshnessResult.status !== "fresh") {
    throw new SingleSiteTransitionError(`MVP-20 validation is not fresh: ${validation.freshnessResult.status}`, ["validation_stale"]);
  }
  if (validation.matchedAafRequestDecisionRefs.scope !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE) {
    throw new SingleSiteTransitionError("MVP-20 validation scope does not authorize single-site improvement implementation", ["wrong_scope"]);
  }
  if (!["granted", "granted_with_limitations"].includes(String(validation.matchedAafRequestDecisionRefs.status))) {
    throw new SingleSiteTransitionError(`implementation authorization status ${validation.matchedAafRequestDecisionRefs.status} cannot dry-run`, ["authorization_status"]);
  }
  if (
    !validation.driftResult.proposalWatermarkMatched ||
    !validation.driftResult.selectedRecommendationWatermarkMatched ||
    !validation.driftResult.implementationScopeWatermarkMatched ||
    !validation.driftResult.semanticWatermarkMatched
  ) {
    throw new SingleSiteTransitionError("MVP-20 validation drift blocks dry-run", validation.driftResult.driftedRoles);
  }
  if (
    validation.missingRefs.authorization.length > 0 ||
    validation.missingRefs.subject.length > 0 ||
    validation.missingRefs.evidence.length > 0 ||
    validation.staleRefs.subject.length > 0 ||
    validation.staleRefs.evidence.length > 0 ||
    validation.staleRefs.freshness.length > 0
  ) {
    throw new SingleSiteTransitionError("MVP-20 validation has missing or stale refs", [
      ...validation.missingRefs.authorization,
      ...validation.missingRefs.subject,
      ...validation.missingRefs.evidence,
      ...validation.staleRefs.subject,
      ...validation.staleRefs.evidence,
      ...validation.staleRefs.freshness,
    ]);
  }
  if (validation.prohibitedSubstitutionFlags.prohibited) {
    throw new SingleSiteTransitionError("MVP-20 validation detected prohibited authorization substitution", ["prohibited_substitution"]);
  }
  if (validation.mode === "allowed_with_limitations" && validation.limitations.length === 0) {
    throw new SingleSiteTransitionError("allowed_with_limitations validation must carry limitations forward", ["missing_limitations_carry_forward"]);
  }
}

function assertIdempotency(input: ImprovedCandidateDryRunInput, computedSemanticInputWatermark: string): "new_plan" | "reused_existing_plan" {
  const previous = input.previousIdempotency;
  if (!previous) return "new_plan";
  if (previous.idempotencyKey !== input.idempotencyKey) return "new_plan";
  if (previous.semanticInputWatermark !== input.semanticInputWatermark || previous.semanticInputWatermark !== computedSemanticInputWatermark) {
    throw new SingleSiteIdempotencyConflictError("gnr8_single_site_improved_candidate_dry_run", input.idempotencyKey, ["semantic_input_watermark"]);
  }
  return "reused_existing_plan";
}

function supportedCategory(category: string): category is ImprovedCandidateDryRunSupportedCategory {
  return (IMPROVED_CANDIDATE_DRY_RUN_SUPPORTED_CATEGORIES as readonly string[]).includes(category);
}

function supportedChangeClass(changeClass: string): changeClass is ImprovedCandidateDryRunChangeClass {
  return (IMPROVED_CANDIDATE_DRY_RUN_CHANGE_CLASSES as readonly string[]).includes(changeClass);
}

function defaultChangeClass(category: ImprovedCandidateDryRunSupportedCategory): ImprovedCandidateDryRunChangeClass {
  switch (category) {
    case "content_clarity":
    case "trust_credibility":
      return "text_replacement_plan";
    case "seo":
      return "metadata_update_plan";
    case "aeo":
      return "structured_data_plan";
    case "technical_cleanup":
      return "metadata_update_plan";
    case "accessibility":
      return "alt_text_plan";
    case "performance":
      return "performance_asset_plan";
  }
}

function refForRecommendation(recommendation: ImprovedCandidateDryRunRecommendationPayload): string {
  return `gnr8:improvement_recommendation:${recommendation.recommendationId}`;
}

function hasTargetIdentity(target: ImprovedCandidateDryRunTargetIdentity): boolean {
  return Object.values(target).some((value) => Boolean(optionalText(value)));
}

function notAppliedReason(recommendation: ImprovedCandidateDryRunRecommendationPayload): ImprovedCandidateDryRunNotAppliedReason {
  if (recommendation.outsideScope) return "outside_scope";
  if (!supportedCategory(recommendation.category)) return "unsupported_in_mvp";
  if (recommendation.requiresAiExecution) return "requires_ai_execution";
  if (recommendation.requiresAssetSelection) return "requires_asset_selection";
  if (recommendation.requiresDesignReview) return "requires_design_review";
  if (!recommendation.sourceEvidenceRefs || recommendation.sourceEvidenceRefs.length === 0) return "missing_source_evidence";
  return "requires_operator_input";
}

function notAppliedStatus(reason: ImprovedCandidateDryRunNotAppliedReason): ImprovedCandidateRecommendationNotApplied["executionSupportStatus"] {
  if (reason === "requires_ai_execution") return "advisory_only";
  if (reason === "unsupported_in_mvp") return "unsupported";
  if (reason === "requires_operator_input" || reason === "requires_asset_selection" || reason === "requires_design_review") return "operator_input_required";
  return "deferred_manual";
}

function planRecommendation(recommendation: ImprovedCandidateDryRunRecommendationPayload): ImprovedCandidatePlannedChange | ImprovedCandidateRecommendationNotApplied {
  const recommendationRef = refForRecommendation(recommendation);
  const deterministic = recommendation.deterministicChange;
  if (!deterministic || !supportedCategory(recommendation.category) || recommendation.outsideScope) {
    const reason = notAppliedReason(recommendation);
    return {
      recommendationRef,
      recommendationId: recommendation.recommendationId,
      category: recommendation.category,
      reason,
      details: `Recommendation was not applied in MVP-23 dry-run: ${reason}.`,
      executionSupportStatus: notAppliedStatus(reason),
      evidenceRefs: (recommendation.sourceEvidenceRefs ?? []).map(jsonRef),
      limitationCarriedForward: {
        source: "recommendation_not_applied",
        recommendationRef,
        reason,
        summary: recommendation.summary ?? recommendation.title ?? null,
      },
    };
  }
  const category = recommendation.category;

  if (
    !deterministic.operatorAuthored ||
    !hasTargetIdentity(deterministic.target) ||
    !optionalText(deterministic.currentSourceHash) ||
    (deterministic.evidenceRefs ?? recommendation.sourceEvidenceRefs ?? []).length === 0
  ) {
    const fallbackReason =
      !hasTargetIdentity(deterministic.target) ||
      !optionalText(deterministic.currentSourceHash) ||
      (deterministic.evidenceRefs ?? recommendation.sourceEvidenceRefs ?? []).length === 0
        ? "missing_source_evidence"
        : "requires_operator_input";
    return {
      recommendationRef,
      recommendationId: recommendation.recommendationId,
      category: recommendation.category,
      reason: fallbackReason,
      details: `Deterministic payload is incomplete: ${fallbackReason}.`,
      executionSupportStatus: notAppliedStatus(fallbackReason),
      evidenceRefs: (recommendation.sourceEvidenceRefs ?? deterministic.evidenceRefs ?? []).map(jsonRef),
      limitationCarriedForward: {
        source: "recommendation_not_applied",
        recommendationRef,
        reason: fallbackReason,
        summary: recommendation.summary ?? recommendation.title ?? null,
      },
    };
  }

  const changeClass = deterministic.changeClass && supportedChangeClass(deterministic.changeClass) ? deterministic.changeClass : defaultChangeClass(category);
  const plannedValueHash = optionalText(deterministic.plannedValueHash) ?? watermark("planned-value", deterministic.plannedValue ?? deterministic.target);
  const changeSeed = {
    recommendationRef,
    category,
    changeClass,
    target: deterministic.target,
    currentSourceHash: deterministic.currentSourceHash,
    plannedValueHash,
  };
  return {
    changeId: `gnr8:planned_change:${shortHash(changeSeed)}`,
    changeClass,
    recommendationRef,
    recommendationId: recommendation.recommendationId,
    category,
    target: deterministic.target,
    currentSourceHash: deterministic.currentSourceHash,
    plannedValueHash,
    evidenceRefs: (deterministic.evidenceRefs ?? recommendation.sourceEvidenceRefs ?? []).map(jsonRef),
    limitationRefs: deterministic.limitationRefs ?? [],
    executionSupportStatus: "deterministic_supported",
    noWriteProof: {
      runtimeWritePerformed: false,
      activePointerChanged: false,
      aiProviderCalled: false,
      generatedProposalBundleCreated: false,
    },
  };
}

function computedSemanticInput(input: ImprovedCandidateDryRunInput, adapterVersion: string): string {
  return watermark("single-site-improved-candidate-dry-run-input", {
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    executionAttempt: {
      attemptId: input.executionAttempt.attemptId,
      migrationId: input.executionAttempt.migrationId,
      proposalPlanId: input.executionAttempt.proposalPlanId,
      implementationAuthorizationDecisionId: input.executionAttempt.implementationAuthorizationDecisionId,
    },
    adapterVersion,
    mode: "dry_run",
    proposalPlanRef: input.proposalPlanRef,
    proposalApprovalRefs: input.proposalApprovalRefs,
    implementationAuthorizationRefs: input.implementationAuthorizationRefs,
    validation: {
      reasonCode: input.validationResult.reasonCode,
      matchedAafRequestDecisionRefs: input.validationResult.matchedAafRequestDecisionRefs,
      expectedSemanticWatermark: input.validationResult.freshnessResult.expectedSemanticWatermark,
      driftResult: input.validationResult.driftResult,
      limitations: input.validationResult.limitations,
    },
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    selectedRecommendations: input.selectedRecommendations,
    proposalLimitations: input.proposalLimitations,
    implementationAuthorizationLimitations: input.implementationAuthorizationLimitations,
    evidenceRefs: input.evidenceRefs,
    implementationScopeSummary: input.implementationScopeSummary,
    nonGoals: input.nonGoals,
  });
}

function limitations(input: ImprovedCandidateDryRunInput, notApplied: ImprovedCandidateRecommendationNotApplied[]): SingleSiteJsonObject[] {
  return [
    ...input.proposalLimitations.map((limitation) => ({ source: "proposal", limitation: stableJsonValue(limitation) })),
    ...input.implementationAuthorizationLimitations.map((limitation) => ({ source: "implementation_authorization", limitation: stableJsonValue(limitation) })),
    ...input.validationResult.limitations.map((limitation) => ({ source: "execution_time_aaf_validation", limitation: stableJsonValue(limitation) })),
    ...notApplied.map((entry) => entry.limitationCarriedForward),
  ];
}

function partitionChanges(changes: ImprovedCandidatePlannedChange[]) {
  const pageClasses = new Set<ImprovedCandidateDryRunChangeClass>(["text_replacement_plan", "heading_structure_plan", "alt_text_plan", "internal_link_plan", "structured_data_plan"]);
  return {
    plannedPageChanges: changes.filter((change) => pageClasses.has(change.changeClass)),
    plannedMetadataChanges: changes.filter((change) => change.changeClass === "metadata_update_plan"),
    plannedAssetChanges: changes.filter((change) => change.changeClass === "performance_asset_plan"),
    plannedStyleTokenChanges: changes.filter((change) => change.changeClass === "manual_note_plan"),
  };
}

export function dryRunImprovedCandidate(input: ImprovedCandidateDryRunInput): ImprovedCandidateDryRunResult {
  assertRequiredInput(input);
  assertValidationAllowsDryRun(input);

  const adapterVersion = input.adapterVersion ?? IMPROVED_CANDIDATE_DRY_RUN_ADAPTER_VERSION;
  const computedSemanticInputWatermark = computedSemanticInput(input, adapterVersion);
  if (input.semanticInputWatermark !== computedSemanticInputWatermark || input.executionAttempt.semanticInputWatermark !== input.semanticInputWatermark) {
    throw new SingleSiteTransitionError("semantic input watermark does not match dry-run input", ["semantic_input_watermark"]);
  }
  const idempotencyResult = assertIdempotency(input, computedSemanticInputWatermark);

  const mapped = input.selectedRecommendations.map(planRecommendation);
  const plannedChanges = mapped.filter((entry): entry is ImprovedCandidatePlannedChange => "changeId" in entry);
  const recommendationsNotApplied = mapped.filter((entry): entry is ImprovedCandidateRecommendationNotApplied => "reason" in entry);
  const limitationsCarriedForward = limitations(input, recommendationsNotApplied);
  const warnings = recommendationsNotApplied.map((entry) => ({
    warningCode: `recommendation_not_applied:${entry.reason}`,
    recommendationRef: entry.recommendationRef,
    category: entry.category,
    details: entry.details,
  }));

  const selectedRecommendationsWatermark = watermark("selected-recommendations", input.selectedRecommendations);
  const implementationScopeWatermark = watermark("implementation-scope", {
    implementationScopeSummary: input.implementationScopeSummary,
    nonGoals: input.nonGoals,
  });
  const limitationsWatermark = watermark("limitations", limitationsCarriedForward);
  const placeholderSeed = {
    semanticInputWatermark: computedSemanticInputWatermark,
    selectedRecommendationsWatermark,
    implementationScopeWatermark,
    limitationsWatermark,
    plannedChanges,
    recommendationsNotApplied,
  };
  const expectedImprovedCandidateSiteVersionRef = `gnr8:planned_site_version:${shortHash({ ...placeholderSeed, ref: "site_version" })}`;
  const expectedImprovedRuntimeArtifactRef = `gnr8:planned_runtime_artifact:${shortHash({ ...placeholderSeed, ref: "runtime_artifact" })}`;
  const expectedPlannedChangeSetRef = `gnr8:planned_change_set:${shortHash({ ...placeholderSeed, ref: "planned_change_set" })}`;
  const expectedArtifactBundleSha256 = digest({
    sourceCloneSiteVersionRef: input.evidenceRefs.cloneSiteVersionRef,
    sourceCloneArtifactRef: input.evidenceRefs.cloneRuntimeArtifactRef,
    plannedChanges,
    dryRunOnly: true,
  });
  const noWriteProof = {
    runtimeWritePerformed: false,
    siteVersionCreated: false,
    artifactCreated: false,
    artifactBound: false,
    contentOverrideMutated: false,
    activePointerChanged: false,
    published: false,
    rolledBack: false,
    generatedProposalBundleCreated: false,
    aiProviderCalled: false,
    externalProviderCalled: false,
  } as const;
  const noWriteProofWatermark = watermark("no-write-proof", noWriteProof);
  const plannedChangeSetWatermark = watermark("planned-change-set", {
    expectedPlannedChangeSetRef,
    plannedChanges,
    recommendationsNotApplied,
    limitationsCarriedForward,
    warnings,
    noWriteProofWatermark,
  });
  const semanticOutputWatermark = watermark("single-site-improved-candidate-dry-run-output", {
    semanticInputWatermark: computedSemanticInputWatermark,
    plannedChangeSetWatermark,
    expectedImprovedCandidateSiteVersionRef,
    expectedImprovedRuntimeArtifactRef,
    expectedArtifactBundleSha256,
    recommendationsNotApplied,
    limitationsCarriedForward,
    warnings,
    noWriteProof,
  });
  const partitioned = partitionChanges(plannedChanges);
  const plannedChangeSet: ImprovedCandidatePlannedChangeSet = {
    changeSetId: expectedPlannedChangeSetRef,
    changeSetRef: expectedPlannedChangeSetRef,
    sourceCloneSiteVersionRef: input.evidenceRefs.cloneSiteVersionRef.sourceRecordId,
    sourceCloneArtifactRef: input.evidenceRefs.cloneRuntimeArtifactRef.sourceRecordId,
    targetCandidateSiteVersionPlaceholder: expectedImprovedCandidateSiteVersionRef,
    targetArtifactPlaceholder: expectedImprovedRuntimeArtifactRef,
    selectedRecommendationsApplied: plannedChanges.map((change) => change.recommendationRef),
    selectedRecommendationsNotApplied: recommendationsNotApplied.map((entry) => entry.recommendationRef),
    ...partitioned,
    limitationsCarriedForward,
    warnings,
    unsupportedRecommendationCount: recommendationsNotApplied.filter((entry) => entry.reason === "unsupported_in_mvp").length,
    manualOperatorInputRequiredCount: recommendationsNotApplied.filter((entry) =>
      ["requires_operator_input", "requires_asset_selection", "requires_design_review"].includes(entry.reason),
    ).length,
  };

  return {
    mode: "dry_run",
    status: recommendationsNotApplied.length > 0 || limitationsCarriedForward.length > 0 ? "planned_with_limitations" : "planned",
    adapterVersion,
    executionAttemptRef: input.executionAttempt,
    inputRefs: {
      proposalPlanRef: jsonRef(input.proposalPlanRef),
      proposalApprovalRefs: stableJsonValue(input.proposalApprovalRefs),
      implementationAuthorizationRefs: stableJsonValue(input.implementationAuthorizationRefs),
      selectedRecommendationRefs: input.selectedRecommendationRefs.map(jsonRef),
      cloneReviewRef: jsonRef(input.evidenceRefs.cloneReviewRef),
      sourceEvidenceReviewRef: jsonRef(input.evidenceRefs.sourceEvidenceReviewRef),
      cloneSiteVersionRef: jsonRef(input.evidenceRefs.cloneSiteVersionRef),
      cloneRuntimeArtifactRef: jsonRef(input.evidenceRefs.cloneRuntimeArtifactRef),
    },
    plannedChangeSet,
    dryRunSummary: {
      dryRunOnly: true,
      plannedChangeCount: plannedChanges.length,
      notAppliedRecommendationCount: recommendationsNotApplied.length,
      limitationsCarriedForwardCount: limitationsCarriedForward.length,
      runtimeMutationPerformed: false,
    },
    expectedOutputRefs: {
      expectedImprovedCandidateSiteVersionRef,
      expectedImprovedRuntimeArtifactRef,
      expectedPlannedChangeSetRef,
      expectedArtifactBundleSha256,
    },
    selectedRecommendationRefsApplied: plannedChanges.map((change) => change.recommendationRef),
    appliedRecommendationRefs: plannedChanges.map((change) => change.recommendationRef),
    recommendationsNotApplied,
    notAppliedRecommendationRefs: recommendationsNotApplied.map((entry) => entry.recommendationRef),
    limitationsCarriedForward,
    warnings,
    evidenceRefs: stableJsonValue(input.evidenceRefs) as SingleSiteJsonObject,
    watermarks: {
      semanticInputWatermark: input.semanticInputWatermark,
      computedSemanticInputWatermark,
      selectedRecommendationsWatermark,
      implementationScopeWatermark,
      limitationsWatermark,
      plannedChangeSetWatermark,
      noWriteProofWatermark,
      semanticOutputWatermark,
    },
    idempotency: {
      key: input.idempotencyKey,
      result: idempotencyResult,
      reused: idempotencyResult === "reused_existing_plan",
    },
    dryRunOnly: true,
    runtimeWrites: false,
    runtimeWritePerformed: false,
    siteVersionCreated: false,
    artifactCreated: false,
    artifactBound: false,
    contentOverrideMutated: false,
    activePointerChanged: false,
    published: false,
    rolledBack: false,
    generatedProposalBundleCreated: false,
    aiProviderCalled: false,
    externalProviderCalled: false,
    contentApproved: false,
    clientApproved: false,
    launchApproved: false,
    publishApproved: false,
    mutatesSourceTruth: false,
  };
}

export function computeImprovedCandidateDryRunSemanticInputWatermark(input: Omit<ImprovedCandidateDryRunInput, "semanticInputWatermark" | "executionAttempt"> & {
  executionAttempt: Omit<ImprovedCandidateDryRunExecutionAttemptRef, "semanticInputWatermark"> & { semanticInputWatermark?: string | null };
}): string {
  return computedSemanticInput(input as ImprovedCandidateDryRunInput, input.adapterVersion ?? IMPROVED_CANDIDATE_DRY_RUN_ADAPTER_VERSION);
}
