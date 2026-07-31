import "server-only";

import { createHash } from "node:crypto";

import { AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE } from "@gnr8/runtime-contracts";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildDeterministicArtifactBundle } from "../runtime/artifact-builder";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getArtifactById,
  getSiteVersion,
} from "../runtime/runtime-store";
import {
  IMPROVED_CANDIDATE_CREATION_MUTATION_BOUNDARY,
  IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
} from "./improvement-execution-contracts";
import type {
  ImprovedCandidateDryRunChangeClass,
  ImprovedCandidateDryRunEvidenceRefs,
  ImprovedCandidateDryRunProposalApprovalRefs,
  ImprovedCandidateDryRunProposalPlanRef,
  ImprovedCandidateDryRunRecommendationPayload,
  ImprovedCandidateDryRunResult,
  ImprovedCandidatePlannedChange,
  ImprovedCandidateRecommendationNotApplied,
} from "./improved-candidate-dry-run-adapter";
import type { ImplementationAuthorizationSourceRef } from "./implementation-authorization-bridge";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import type {
  CompleteImprovementExecutionInput,
  ImprovementExecutionOperationResult,
  ImprovementExecutionService,
  ImprovementExecutionTransitionInput,
  RecordImprovedCandidateCreationResultInput,
  RecordImprovedCandidateCreationResultOutput,
} from "./improvement-execution-service";
import {
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
  type SingleSiteJsonObject,
  type SingleSiteImprovementExecutionStatus,
} from "./single-site-state-contracts";
import type { SingleSiteActorInput } from "./single-site-state-writer-repository";

export const IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION = "mvp-24-improved-candidate-creation-adapter:v1" as const;

export type ImprovedCandidateCreationExecutionAttemptRef = {
  attemptId: string;
  migrationId: string;
  proposalPlanId: string;
  implementationAuthorizationDecisionId: string;
  semanticInputWatermark: string;
  status: Extract<SingleSiteImprovementExecutionStatus, "ready" | "started" | "completed" | "completed_with_limitations"> | string;
};

export type ImprovedCandidateCreationImplementationAuthorizationRefs = {
  requestRef: ImplementationAuthorizationSourceRef;
  decisionRef: ImplementationAuthorizationSourceRef;
  evidencePackageRef: ImplementationAuthorizationSourceRef;
};

export type ImprovedCandidateCreationInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  executionAttempt: ImprovedCandidateCreationExecutionAttemptRef;
  validationResult: ImprovementExecutionAafValidationResult;
  implementationAuthorizationRefs: ImprovedCandidateCreationImplementationAuthorizationRefs;
  proposalPlanRef: ImprovedCandidateDryRunProposalPlanRef;
  proposalApprovalRefs: ImprovedCandidateDryRunProposalApprovalRefs;
  selectedRecommendationRefs: ImplementationAuthorizationSourceRef[];
  selectedRecommendations: ImprovedCandidateDryRunRecommendationPayload[];
  dryRunResult: ImprovedCandidateDryRunResult;
  dryRunSemanticInputWatermark: string;
  dryRunPlannedChangeSetWatermark: string;
  dryRunSemanticOutputWatermark: string;
  proposalLimitations: unknown[];
  implementationAuthorizationLimitations: unknown[];
  evidenceRefs: ImprovedCandidateDryRunEvidenceRefs;
  implementationScopeSummary: string;
  nonGoals: string[];
  actor: SingleSiteActorInput;
  correlationId: string;
  idempotencyKey: string;
  semanticInputWatermark: string;
  sourceUrl?: string | null;
  targetCandidateSiteVersionId?: string | null;
  adapterVersion?: string | null;
};

export type ImprovedCandidateCreationNotApplied = ImprovedCandidateRecommendationNotApplied & {
  creationReason: "dry_run_not_applied" | "cannot_apply_deterministically";
};

export type ImprovedCandidateCreationOutput = {
  mode: "execute";
  status: "completed" | "completed_with_limitations";
  adapterVersion: typeof IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION | string;
  executionAttemptRef: ImprovedCandidateCreationExecutionAttemptRef;
  refs: {
    migrationRef: string;
    executionAttemptRef: string;
    improvedCandidateSiteVersionRef: string;
    improvedRuntimeArtifactRef: string;
    cloneSiteVersionRef: string;
    cloneRuntimeArtifactRef: string;
    proposalPlanRef: string;
    implementationAuthorizationRef: string;
    plannedChangeSetRef: string;
  };
  targetRefs: {
    runtimeSiteId: string;
    improvedCandidateSiteVersionId: string;
    improvedRuntimeArtifactId: string;
    cloneSiteVersionId: string;
    cloneRuntimeArtifactId: string;
  };
  appliedPlannedChanges: ImprovedCandidatePlannedChange[];
  appliedRecommendationRefs: string[];
  recommendationsNotApplied: ImprovedCandidateCreationNotApplied[];
  notAppliedRecommendationRefs: string[];
  limitationsCarriedForward: SingleSiteJsonObject[];
  warnings: SingleSiteJsonObject[];
  watermarks: {
    semanticInputWatermark: string;
    computedSemanticInputWatermark: string;
    dryRunMatchWatermark: string;
    appliedChangeSetWatermark: string;
    runtimeOutputBundleWatermark: string;
    semanticOutputWatermark: string;
  };
  idempotency: {
    key: string;
    reused: boolean;
    result: "created_candidate" | "reused_existing_candidate";
  };
  runtimeWrites: true;
  runtimeWritePerformed: true;
  siteVersionCreated: boolean;
  artifactCreated: boolean;
  artifactBound: true;
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
  nonApprovalBoundary: typeof IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY;
  mutationBoundary: typeof IMPROVED_CANDIDATE_CREATION_MUTATION_BOUNDARY;
};

type RuntimePrimitiveDeps = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration;
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundle;
  createArtifact: typeof createArtifact;
  bindArtifactToVersion: typeof bindArtifactToVersion;
};

type ExecutionServiceDeps = Pick<
  ImprovementExecutionService,
  "markStarted" | "markCompleted" | "markCompletedWithLimitations" | "recordImprovedCandidateCreationResult"
>;

export type ImprovedCandidateCreationAdapterDependencies = Partial<RuntimePrimitiveDeps> & {
  executionService?: ExecutionServiceDeps | null;
};

const defaultRuntimeDeps: RuntimePrimitiveDeps = {
  getSiteVersion,
  getArtifactById,
  createSiteVersionFromMigration,
  buildDeterministicArtifactBundle,
  createArtifact,
  bindArtifactToVersion,
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new SingleSiteTransitionError(`${field} is required`, [field]);
  return normalized;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue(record[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function watermark(prefix: string, value: unknown): string {
  return `${prefix}:${sha256(value)}`;
}

function deterministicUuid(namespace: string, value: unknown): string {
  const digest = Buffer.from(sha256({ namespace, value }), "hex");
  const bytes = Uint8Array.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function ref(source: string, id: string): string {
  return `gnr8:${source}:${id}`;
}

function jsonObject(value: unknown): SingleSiteJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as SingleSiteJsonObject;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(stableJsonValue(value))) as T;
}

function assertRequiredInput(input: ImprovedCandidateCreationInput): void {
  required("tenantId", input.tenantId);
  required("clientId", input.clientId);
  required("siteId", input.siteId);
  required("migrationId", input.migrationId);
  required("executionAttempt.attemptId", input.executionAttempt?.attemptId);
  required("executionAttempt.migrationId", input.executionAttempt?.migrationId);
  required("executionAttempt.proposalPlanId", input.executionAttempt?.proposalPlanId);
  required("executionAttempt.implementationAuthorizationDecisionId", input.executionAttempt?.implementationAuthorizationDecisionId);
  required("implementationAuthorizationRefs.requestRef.sourceRecordId", input.implementationAuthorizationRefs?.requestRef?.sourceRecordId);
  required("implementationAuthorizationRefs.decisionRef.sourceRecordId", input.implementationAuthorizationRefs?.decisionRef?.sourceRecordId);
  required("proposalPlanRef.proposalPlanId", input.proposalPlanRef?.proposalPlanId);
  required("proposalApprovalRefs.approvalDecisionRef.sourceRecordId", input.proposalApprovalRefs?.approvalDecisionRef?.sourceRecordId);
  required("evidenceRefs.cloneReviewRef.sourceRecordId", input.evidenceRefs?.cloneReviewRef?.sourceRecordId);
  required("evidenceRefs.sourceEvidenceReviewRef.sourceRecordId", input.evidenceRefs?.sourceEvidenceReviewRef?.sourceRecordId);
  required("evidenceRefs.cloneSiteVersionRef.sourceRecordId", input.evidenceRefs?.cloneSiteVersionRef?.sourceRecordId);
  required("evidenceRefs.cloneRuntimeArtifactRef.sourceRecordId", input.evidenceRefs?.cloneRuntimeArtifactRef?.sourceRecordId);
  required("dryRunSemanticInputWatermark", input.dryRunSemanticInputWatermark);
  required("dryRunPlannedChangeSetWatermark", input.dryRunPlannedChangeSetWatermark);
  required("dryRunSemanticOutputWatermark", input.dryRunSemanticOutputWatermark);
  required("implementationScopeSummary", input.implementationScopeSummary);
  required("actor.actorType", input.actor?.actorType);
  required("actor.actorId", input.actor?.actorId);
  required("actor.actorRole", input.actor?.actorRole);
  required("correlationId", input.correlationId);
  required("idempotencyKey", input.idempotencyKey);
  required("semanticInputWatermark", input.semanticInputWatermark);
  if (!Array.isArray(input.nonGoals) || input.nonGoals.length === 0) throw new SingleSiteTransitionError("nonGoals are required", ["nonGoals"]);
  if (!Array.isArray(input.selectedRecommendationRefs) || input.selectedRecommendationRefs.length === 0) {
    throw new SingleSiteTransitionError("selectedRecommendationRefs are required", ["selectedRecommendationRefs"]);
  }
  if (!Array.isArray(input.selectedRecommendations) || input.selectedRecommendations.length === 0) {
    throw new SingleSiteTransitionError("selectedRecommendations are required", ["selectedRecommendations"]);
  }
  if (!Array.isArray(input.proposalLimitations)) throw new SingleSiteTransitionError("proposalLimitations are required", ["proposalLimitations"]);
  if (!Array.isArray(input.implementationAuthorizationLimitations)) throw new SingleSiteTransitionError("implementationAuthorizationLimitations are required", ["implementationAuthorizationLimitations"]);
}

function assertValidationAllowsCreation(input: ImprovedCandidateCreationInput): void {
  const validation = input.validationResult;
  if (!validation) throw new SingleSiteTransitionError("successful MVP-20 validation result is required", ["validationResult"]);
  if (!validation.allowed || validation.mode === "blocked") {
    throw new SingleSiteTransitionError(`MVP-20 validation blocked improved candidate creation: ${validation.reasonCode}`, validation.blockerCodes);
  }
  if (!["allowed", "allowed_with_limitations"].includes(validation.mode)) {
    throw new SingleSiteTransitionError(`unsupported MVP-20 validation mode ${validation.mode}`, ["validation_mode"]);
  }
  if (validation.matchedAafRequestDecisionRefs.scope !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE) {
    throw new SingleSiteTransitionError("MVP-20 validation scope does not exactly authorize single-site improvement implementation", ["wrong_scope"]);
  }
  if (validation.freshnessResult.status !== "fresh") {
    throw new SingleSiteTransitionError(`MVP-20 validation is not fresh: ${validation.freshnessResult.status}`, ["validation_stale"]);
  }
  if (
    !validation.driftResult.proposalWatermarkMatched ||
    !validation.driftResult.selectedRecommendationWatermarkMatched ||
    !validation.driftResult.implementationScopeWatermarkMatched ||
    !validation.driftResult.semanticWatermarkMatched
  ) {
    throw new SingleSiteTransitionError("MVP-20 validation drift blocks improved candidate creation", validation.driftResult.driftedRoles);
  }
  if (validation.prohibitedSubstitutionFlags.prohibited) {
    throw new SingleSiteTransitionError("MVP-20 validation detected prohibited authorization substitution", ["prohibited_substitution"]);
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
}

function assertDryRunMatches(input: ImprovedCandidateCreationInput): void {
  const dryRun = input.dryRunResult;
  if (!dryRun) throw new SingleSiteTransitionError("MVP-23 dry-run result is required", ["dryRunResult"]);
  if (dryRun.mode !== "dry_run" || !dryRun.dryRunOnly || dryRun.runtimeWrites || dryRun.runtimeWritePerformed) {
    throw new SingleSiteTransitionError("MVP-23 dry-run result must be a no-write dry-run result", ["dry_run_boundary"]);
  }
  if (input.dryRunSemanticInputWatermark !== dryRun.watermarks.semanticInputWatermark) {
    throw new SingleSiteTransitionError("MVP-23 dry-run semantic input watermark mismatch", ["dry_run_semantic_input_watermark"]);
  }
  if (input.dryRunPlannedChangeSetWatermark !== dryRun.watermarks.plannedChangeSetWatermark) {
    throw new SingleSiteTransitionError("MVP-23 dry-run planned change set watermark mismatch", ["dry_run_planned_change_set_watermark"]);
  }
  if (input.dryRunSemanticOutputWatermark !== dryRun.watermarks.semanticOutputWatermark) {
    throw new SingleSiteTransitionError("MVP-23 dry-run semantic output watermark mismatch", ["dry_run_semantic_output_watermark"]);
  }
  if (input.executionAttempt.attemptId !== dryRun.executionAttemptRef.attemptId) {
    throw new SingleSiteTransitionError("MVP-23 dry-run execution attempt mismatch", ["dry_run_execution_attempt"]);
  }
}

function assertExecutionAttemptStatus(input: ImprovedCandidateCreationInput): void {
  if (!["ready", "started", "completed", "completed_with_limitations"].includes(input.executionAttempt.status)) {
    throw new SingleSiteTransitionError(`execution attempt status ${input.executionAttempt.status} cannot create improved candidate`, ["execution_attempt_status"]);
  }
}

function recommendationByRef(input: ImprovedCandidateCreationInput): Map<string, ImprovedCandidateDryRunRecommendationPayload> {
  const byId = new Map(input.selectedRecommendations.map((recommendation) => [recommendation.recommendationId, recommendation]));
  const byRef = new Map<string, ImprovedCandidateDryRunRecommendationPayload>();
  for (const recommendation of input.selectedRecommendations) {
    byRef.set(`gnr8:improvement_recommendation:${recommendation.recommendationId}`, recommendation);
  }
  for (const refValue of input.selectedRecommendationRefs) {
    const id = text((refValue as { recommendationId?: unknown }).recommendationId) ?? text(refValue.sourceRecordId);
    const recommendation = id ? byId.get(id) : null;
    if (recommendation) byRef.set(`gnr8:improvement_recommendation:${recommendation.recommendationId}`, recommendation);
  }
  return byRef;
}

function assertNoUnsupportedRequiredRecommendation(input: ImprovedCandidateCreationInput): void {
  const byRef = recommendationByRef(input);
  for (const entry of input.dryRunResult.recommendationsNotApplied) {
    if (entry.reason !== "unsupported_in_mvp") continue;
    const payload = byRef.get(entry.recommendationRef);
    if (payload?.status === "optional" || payload?.outsideScope) continue;
    throw new SingleSiteTransitionError(`unsupported required recommendation ${entry.recommendationRef} blocks improved candidate creation`, ["unsupported_required_recommendation"]);
  }
}

function computeSemanticInput(input: ImprovedCandidateCreationInput, adapterVersion: string): string {
  return watermark("single-site-improved-candidate-creation-input", {
    adapterVersion,
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
    proposalPlanRef: input.proposalPlanRef,
    proposalApprovalRefs: input.proposalApprovalRefs,
    implementationAuthorizationRefs: input.implementationAuthorizationRefs,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    selectedRecommendations: input.selectedRecommendations,
    dryRunWatermarks: {
      semanticInputWatermark: input.dryRunSemanticInputWatermark,
      plannedChangeSetWatermark: input.dryRunPlannedChangeSetWatermark,
      semanticOutputWatermark: input.dryRunSemanticOutputWatermark,
    },
    cloneSiteVersionRef: input.evidenceRefs.cloneSiteVersionRef,
    cloneRuntimeArtifactRef: input.evidenceRefs.cloneRuntimeArtifactRef,
    implementationScopeSummary: input.implementationScopeSummary,
    nonGoals: input.nonGoals,
    proposalLimitations: input.proposalLimitations,
    implementationAuthorizationLimitations: input.implementationAuthorizationLimitations,
  });
}

function plannedChangeValue(change: ImprovedCandidatePlannedChange, input: ImprovedCandidateCreationInput): unknown {
  const payload = recommendationByRef(input).get(change.recommendationRef);
  return payload?.deterministicChange?.plannedValue;
}

function findPage(pages: CanonicalPageVersionInput[], change: ImprovedCandidatePlannedChange): CanonicalPageVersionInput | null {
  const pagePath = text(change.target.pagePath);
  const pageId = text(change.target.pageId);
  return pages.find((page) => (pageId && page.pageId === pageId) || (pagePath && page.path === pagePath)) ?? null;
}

function applyContentField(page: CanonicalPageVersionInput, sectionId: string, field: string, value: unknown): void {
  const sectionProps = page.contentModel.sectionProps ?? {};
  const section = jsonObject(sectionProps[sectionId]);
  page.contentModel = {
    ...page.contentModel,
    sectionProps: {
      ...sectionProps,
      [sectionId]: {
        ...section,
        [field]: stableJsonValue(value),
      },
    },
  };
}

function addSemanticSignal(page: CanonicalPageVersionInput, label: string): void {
  if (page.semanticSignals.some((signal) => signal.label === label)) return;
  page.semanticSignals = [...page.semanticSignals, { label, confidence: 1, source: "manual" }];
}

function applyPlannedChange(page: CanonicalPageVersionInput, change: ImprovedCandidatePlannedChange, value: unknown): boolean {
  const sectionId = text(change.target.sectionId) ?? "__page";
  const field = text(change.target.field) ?? defaultField(change.changeClass);
  if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) return false;

  switch (change.changeClass) {
    case "text_replacement_plan":
    case "heading_structure_plan":
    case "alt_text_plan":
    case "internal_link_plan":
    case "structured_data_plan":
    case "metadata_update_plan":
      applyContentField(page, sectionId, field, value);
      addSemanticSignal(page, `mvp24.${change.changeClass}.${change.recommendationId}`);
      return true;
    case "performance_asset_plan":
      page.assetGraph = page.assetGraph.map((asset) => (
        text(change.target.assetRef) && text((asset as { src?: unknown }).src) === change.target.assetRef
          ? { ...asset, mvp24ImprovedCandidate: stableJsonValue(value) }
          : asset
      ));
      addSemanticSignal(page, `mvp24.${change.changeClass}.${change.recommendationId}`);
      return true;
    case "manual_note_plan":
      addSemanticSignal(page, `mvp24.manual_note.${change.recommendationId}`);
      return true;
  }
}

function defaultField(changeClass: ImprovedCandidateDryRunChangeClass): string {
  switch (changeClass) {
    case "heading_structure_plan":
      return "heading";
    case "alt_text_plan":
      return "alt";
    case "internal_link_plan":
      return "href";
    case "structured_data_plan":
      return "structuredData";
    case "metadata_update_plan":
      return "metadata";
    case "performance_asset_plan":
      return "assetOptimization";
    case "manual_note_plan":
      return "manualNote";
    case "text_replacement_plan":
      return "text";
  }
}

function notAppliedFromChange(change: ImprovedCandidatePlannedChange, details: string): ImprovedCandidateCreationNotApplied {
  return {
    recommendationRef: change.recommendationRef,
    recommendationId: change.recommendationId,
    category: change.category,
    reason: "requires_operator_input",
    details,
    executionSupportStatus: "deferred_manual",
    evidenceRefs: change.evidenceRefs,
    limitationCarriedForward: {
      source: "recommendation_not_applied",
      recommendationRef: change.recommendationRef,
      reason: "cannot_apply_deterministically",
      details,
    },
    creationReason: "cannot_apply_deterministically",
  };
}

function dryRunNotApplied(entry: ImprovedCandidateRecommendationNotApplied): ImprovedCandidateCreationNotApplied {
  return { ...entry, creationReason: "dry_run_not_applied" };
}

function collectDryRunChanges(dryRun: ImprovedCandidateDryRunResult): ImprovedCandidatePlannedChange[] {
  return [
    ...dryRun.plannedChangeSet.plannedPageChanges,
    ...dryRun.plannedChangeSet.plannedMetadataChanges,
    ...dryRun.plannedChangeSet.plannedAssetChanges,
    ...dryRun.plannedChangeSet.plannedStyleTokenChanges,
  ];
}

function candidatePages(input: ImprovedCandidateCreationInput, cloneVersion: CanonicalSiteVersionSnapshot): {
  pages: CanonicalPageVersionInput[];
  applied: ImprovedCandidatePlannedChange[];
  notApplied: ImprovedCandidateCreationNotApplied[];
} {
  const pages = cloneVersion.pages.map((page) => ({
    pageId: page.pageId,
    path: page.path,
    title: page.title,
    structureModel: cloneJson(page.structureModel),
    contentModel: cloneJson(page.contentModel),
    styleTokens: cloneJson(page.styleTokens),
    assetGraph: cloneJson(page.assetGraph),
    semanticSignals: cloneJson(page.semanticSignals),
    migrationGovernance: cloneJson(page.migrationGovernance ?? null),
    source: "manual" as const,
    actor: `${input.actor.actorType}:${input.actor.actorId}:improved-candidate`,
  }));
  const applied: ImprovedCandidatePlannedChange[] = [];
  const notApplied = input.dryRunResult.recommendationsNotApplied.map(dryRunNotApplied);
  for (const change of collectDryRunChanges(input.dryRunResult)) {
    const page = findPage(pages, change);
    if (!page) {
      notApplied.push(notAppliedFromChange(change, `Target page was not found for ${change.changeClass}.`));
      continue;
    }
    const plannedValue = plannedChangeValue(change, input);
    if (!applyPlannedChange(page, change, plannedValue)) {
      notApplied.push(notAppliedFromChange(change, `Planned value could not be applied deterministically for ${change.changeClass}.`));
      continue;
    }
    applied.push(change);
  }
  return { pages, applied, notApplied };
}

function creationProvenance(input: {
  operationKey: string;
  targetSiteVersionId: string;
  semanticInputWatermark: string;
  semanticOutputWatermark: string;
  runtimeOutputBundleWatermark: string;
  appliedChangeSetWatermark: string;
  cloneVersion: CanonicalSiteVersionSnapshot;
  cloneArtifact: RuntimeArtifact;
  creationInput: ImprovedCandidateCreationInput;
}): SingleSiteJsonObject {
  return {
    improvedCandidateCreationAdapter: {
      adapterVersion: input.creationInput.adapterVersion ?? IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION,
      operationKey: input.operationKey,
      idempotencyKey: input.creationInput.idempotencyKey,
      semanticInputWatermark: input.semanticInputWatermark,
      semanticOutputWatermark: input.semanticOutputWatermark,
      runtimeOutputBundleWatermark: input.runtimeOutputBundleWatermark,
      appliedChangeSetWatermark: input.appliedChangeSetWatermark,
      migrationRef: ref("single_site_migration", input.creationInput.migrationId),
      executionAttemptRef: ref("improvement_execution_attempt", input.creationInput.executionAttempt.attemptId),
      candidateSiteVersionRef: ref("site_version", input.targetSiteVersionId),
      cloneSiteVersionRef: ref("site_version", input.cloneVersion.id),
      cloneRuntimeArtifactRef: ref("runtime_artifact", input.cloneArtifact.id),
      plannedChangeSetRef: input.creationInput.dryRunResult.expectedOutputRefs.expectedPlannedChangeSetRef,
      nonApprovalBoundary: IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
      mutationBoundary: IMPROVED_CANDIDATE_CREATION_MUTATION_BOUNDARY,
    },
    cloneImportProvenanceSummaryHash: sha256(input.cloneVersion.importProvenanceSummary ?? {}),
  };
}

function existingCreationProvenance(summary: unknown): SingleSiteJsonObject | null {
  const provenance = jsonObject(summary).improvedCandidateCreationAdapter;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return null;
  const record = provenance as SingleSiteJsonObject;
  return record.adapterVersion === IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION ? record : null;
}

function outputStatus(limitations: SingleSiteJsonObject[], notApplied: ImprovedCandidateCreationNotApplied[]): "completed" | "completed_with_limitations" {
  return limitations.length > 0 || notApplied.length > 0 ? "completed_with_limitations" : "completed";
}

async function updateExecutionAttempt(input: {
  service: ExecutionServiceDeps | null | undefined;
  creationInput: ImprovedCandidateCreationInput;
  output: ImprovedCandidateCreationOutput;
}): Promise<void> {
  const service = input.service;
  if (!service) return;
  if (["completed", "completed_with_limitations"].includes(input.creationInput.executionAttempt.status)) return;
  const envelope = {
    attemptId: input.creationInput.executionAttempt.attemptId,
    migrationId: input.creationInput.migrationId,
    actor: input.creationInput.actor,
    correlationId: input.creationInput.correlationId,
    idempotencyKey: input.creationInput.idempotencyKey,
  };
  if (input.creationInput.executionAttempt.status === "ready") {
    await service.markStarted({
      ...envelope,
      detailsJson: { mvp24ImprovedCandidateCreation: true },
      idempotencyKey: `${input.creationInput.idempotencyKey}:mvp24-started`,
    } satisfies ImprovementExecutionTransitionInput);
  }

  await service.recordImprovedCandidateCreationResult({
    ...envelope,
    creationResult: input.output,
    idempotencyKey: `${input.creationInput.idempotencyKey}:mvp24-record-output`,
  } satisfies RecordImprovedCandidateCreationResultInput);

  if (["ready", "started"].includes(input.creationInput.executionAttempt.status)) {
    const completion: CompleteImprovementExecutionInput = {
      ...envelope,
      semanticOutputWatermark: input.output.watermarks.semanticOutputWatermark,
      improvedCandidateSiteVersionRef: input.output.refs.improvedCandidateSiteVersionRef,
      improvedRuntimeArtifactRef: input.output.refs.improvedRuntimeArtifactRef,
      outputRefsJson: input.output.refs,
      limitationsJson: input.output.status === "completed_with_limitations" ? input.output.limitationsCarriedForward : [],
      warningsJson: input.output.warnings,
      detailsJson: { mvp24ImprovedCandidateCreation: true },
      metadataJson: {
        mvp24ImprovedCandidateCreation: true,
        runtimeMutationPerformed: true,
        nonApprovalBoundary: IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
      },
      idempotencyKey: `${input.creationInput.idempotencyKey}:mvp24-completed`,
    };
    if (input.output.status === "completed_with_limitations") {
      await service.markCompletedWithLimitations(completion);
    } else {
      await service.markCompleted(completion);
    }
  }
}

export async function createImprovedCandidate(
  input: ImprovedCandidateCreationInput,
  dependencies: ImprovedCandidateCreationAdapterDependencies = {},
): Promise<ImprovedCandidateCreationOutput> {
  assertRequiredInput(input);
  assertValidationAllowsCreation(input);
  assertDryRunMatches(input);
  assertExecutionAttemptStatus(input);
  assertNoUnsupportedRequiredRecommendation(input);

  const adapterVersion = input.adapterVersion ?? IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION;
  const computedSemanticInputWatermark = computeSemanticInput(input, adapterVersion);
  if (input.semanticInputWatermark !== computedSemanticInputWatermark) {
    throw new SingleSiteTransitionError("semantic input watermark does not match improved candidate creation input", ["semantic_input_watermark"]);
  }
  if (input.executionAttempt.semanticInputWatermark !== input.dryRunSemanticInputWatermark) {
    throw new SingleSiteTransitionError("execution attempt semantic input does not match MVP-23 dry-run input", ["execution_attempt_semantic_input_watermark"]);
  }

  const deps = { ...defaultRuntimeDeps, ...dependencies };
  const cloneSiteVersionId = required("clone site version id", input.evidenceRefs.cloneSiteVersionRef.sourceRecordId);
  const cloneRuntimeArtifactId = required("clone runtime artifact id", input.evidenceRefs.cloneRuntimeArtifactRef.sourceRecordId);
  const cloneVersion = await deps.getSiteVersion(cloneSiteVersionId);
  if (!cloneVersion) throw new SingleSiteTransitionError(`clone runtime site version ${cloneSiteVersionId} was not found`, ["clone_site_version"]);
  const cloneArtifact = await deps.getArtifactById(cloneRuntimeArtifactId);
  if (!cloneArtifact) throw new SingleSiteTransitionError(`clone runtime artifact ${cloneRuntimeArtifactId} was not found`, ["clone_runtime_artifact"]);
  if (cloneArtifact.siteVersionId !== cloneVersion.id) throw new SingleSiteTransitionError("clone runtime artifact does not belong to clone site version", ["clone_runtime_artifact"]);

  const operationKey = `single-site-improved-candidate:${input.idempotencyKey}`;
  const targetSiteVersionId =
    text(input.targetCandidateSiteVersionId) ??
    deterministicUuid("single-site-improved-candidate-site-version", {
      operationKey,
      migrationId: input.migrationId,
      executionAttemptId: input.executionAttempt.attemptId,
      cloneSiteVersionId,
    });
  if (targetSiteVersionId === cloneSiteVersionId) {
    throw new SingleSiteTransitionError("improved candidate site version must be distinct from clone site version", ["target_site_version_id"]);
  }

  const existingTarget = await deps.getSiteVersion(targetSiteVersionId);
  const existingProvenance = existingCreationProvenance(existingTarget?.importProvenanceSummary);
  if (existingTarget && !existingProvenance) {
    throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["improvedCandidateCreationAdapter"]);
  }
  if (existingProvenance && existingProvenance.semanticInputWatermark !== computedSemanticInputWatermark) {
    throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["semanticInputWatermark"]);
  }

  const dryRunMatchWatermark = watermark("single-site-improved-candidate-dry-run-match", {
    dryRunSemanticInputWatermark: input.dryRunSemanticInputWatermark,
    dryRunPlannedChangeSetWatermark: input.dryRunPlannedChangeSetWatermark,
    dryRunSemanticOutputWatermark: input.dryRunSemanticOutputWatermark,
  });
  const candidate = candidatePages(input, cloneVersion);
  const appliedChangeSetWatermark = watermark("single-site-improved-candidate-applied-change-set", {
    applied: candidate.applied,
    notApplied: candidate.notApplied,
    dryRunPlannedChangeSetWatermark: input.dryRunPlannedChangeSetWatermark,
  });
  const limitationsCarriedForward = [
    ...input.dryRunResult.limitationsCarriedForward,
    ...candidate.notApplied
      .filter((entry) => entry.creationReason === "cannot_apply_deterministically")
      .map((entry) => entry.limitationCarriedForward),
  ].map((entry) => stableJsonValue(entry) as SingleSiteJsonObject);

  const candidateVersionForBundle: CanonicalSiteVersionSnapshot = {
    ...cloneVersion,
    id: targetSiteVersionId,
    artifactId: null,
    state: "DRAFT",
    source: "manual",
    actor: `${input.actor.actorType}:${input.actor.actorId}:improved-candidate`,
    importProvenanceSummary: {
      ...(cloneVersion.importProvenanceSummary ?? {}),
      pendingImprovedCandidateCreationAdapter: {
        adapterVersion,
        operationKey,
        semanticInputWatermark: computedSemanticInputWatermark,
        dryRunMatchWatermark,
        appliedChangeSetWatermark,
      },
    } as RuntimeImportProvenanceSummary,
    pages: candidate.pages.map((page, index) => ({
      ...page,
      id: `pending-${page.pageId}-${index}`,
      siteVersionId: targetSiteVersionId,
      createdAt: cloneVersion.createdAt,
    })),
  };
  const artifactBundle = deps.buildDeterministicArtifactBundle({ siteVersion: candidateVersionForBundle, renderMode: "PREVIEW" });
  const runtimeOutputBundleWatermark = `runtime-output-bundle:${artifactBundle.bundleSha256}`;
  const semanticOutputWatermark = watermark("single-site-improved-candidate-creation-output", {
    semanticInputWatermark: computedSemanticInputWatermark,
    dryRunMatchWatermark,
    appliedChangeSetWatermark,
    runtimeOutputBundleWatermark,
    targetSiteVersionId,
    cloneSiteVersionId,
    cloneRuntimeArtifactId,
    notApplied: candidate.notApplied,
  });

  const provenance = creationProvenance({
    operationKey,
    targetSiteVersionId,
    semanticInputWatermark: computedSemanticInputWatermark,
    semanticOutputWatermark,
    runtimeOutputBundleWatermark,
    appliedChangeSetWatermark,
    cloneVersion,
    cloneArtifact,
    creationInput: input,
  });

  const candidateVersion = existingTarget
    ? { siteId: existingTarget.siteId, siteVersionId: existingTarget.id, versionNo: existingTarget.versionNo }
    : await deps.createSiteVersionFromMigration({
        siteId: cloneVersion.siteId,
        sourceUrl: text(input.sourceUrl) ?? `gnr8:single_site_migration:${input.migrationId}:improved_candidate`,
        actor: `${input.actor.actorType}:${input.actor.actorId}:improved-candidate`,
        rendererCompatibilityVersion: cloneVersion.rendererCompatibilityVersion,
        importProvenanceSummary: {
          ...(cloneVersion.importProvenanceSummary ?? {}),
          ...provenance,
        } as RuntimeImportProvenanceSummary,
        pages: candidate.pages,
        siteVersionId: targetSiteVersionId,
      });

  const verifiedCandidateVersion = existingTarget ?? await deps.getSiteVersion(candidateVersion.siteVersionId);
  if (!verifiedCandidateVersion) {
    throw new SingleSiteTransitionError(`improved candidate site version ${candidateVersion.siteVersionId} could not be verified`, ["improved_candidate_site_version"]);
  }
  const verifiedProvenance = existingCreationProvenance(verifiedCandidateVersion.importProvenanceSummary);
  if (!verifiedProvenance || verifiedProvenance.semanticOutputWatermark !== semanticOutputWatermark) {
    throw new SingleSiteIdempotencyConflictError("gnr8_runtime_site_versions", input.idempotencyKey, ["semanticOutputWatermark"]);
  }

  const finalBundle = deps.buildDeterministicArtifactBundle({ siteVersion: verifiedCandidateVersion, renderMode: "PREVIEW" });
  const artifact = await deps.createArtifact({
    siteId: finalBundle.siteId,
    siteVersionId: finalBundle.siteVersionId,
    rendererCompatibilityVersion: finalBundle.rendererCompatibilityVersion,
    bundleSha256: finalBundle.bundleSha256,
    htmlByPath: finalBundle.htmlByPath,
    compiledTokenStyles: finalBundle.compiledTokenStyles,
    assetFingerprintMap: finalBundle.assetFingerprintMap,
    manifest: {
      ...finalBundle.manifest,
      sourceKind: "single_site_improved_candidate_creation_adapter",
      improvedCandidateCreationAdapter: provenance.improvedCandidateCreationAdapter,
    },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["SINGLE_SITE_IMPROVED_CANDIDATE_READY_FOR_REVIEW"],
      pageRolloutPolicyState: ["SINGLE_SITE_IMPROVED_CANDIDATE_REVIEW_REQUIRED"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "SINGLE_SITE_IMPROVED_CANDIDATE_READY_FOR_REVIEW",
      siteRolloutPolicyState: "SINGLE_SITE_IMPROVED_CANDIDATE_REVIEW_REQUIRED",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
  });
  await deps.bindArtifactToVersion({
    siteVersionId: candidateVersion.siteVersionId,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: finalBundle.rendererCompatibilityVersion,
  });

  const output: ImprovedCandidateCreationOutput = {
    mode: "execute",
    status: outputStatus(limitationsCarriedForward, candidate.notApplied),
    adapterVersion,
    executionAttemptRef: input.executionAttempt,
    refs: {
      migrationRef: ref("single_site_migration", input.migrationId),
      executionAttemptRef: ref("improvement_execution_attempt", input.executionAttempt.attemptId),
      improvedCandidateSiteVersionRef: ref("site_version", candidateVersion.siteVersionId),
      improvedRuntimeArtifactRef: ref("runtime_artifact", artifact.artifactId),
      cloneSiteVersionRef: ref("site_version", cloneSiteVersionId),
      cloneRuntimeArtifactRef: ref("runtime_artifact", cloneRuntimeArtifactId),
      proposalPlanRef: ref("proposal_plan", input.proposalPlanRef.proposalPlanId),
      implementationAuthorizationRef: ref("implementation_authorization", input.implementationAuthorizationRefs.decisionRef.sourceRecordId),
      plannedChangeSetRef: input.dryRunResult.expectedOutputRefs.expectedPlannedChangeSetRef,
    },
    targetRefs: {
      runtimeSiteId: candidateVersion.siteId,
      improvedCandidateSiteVersionId: candidateVersion.siteVersionId,
      improvedRuntimeArtifactId: artifact.artifactId,
      cloneSiteVersionId,
      cloneRuntimeArtifactId,
    },
    appliedPlannedChanges: candidate.applied,
    appliedRecommendationRefs: candidate.applied.map((change) => change.recommendationRef),
    recommendationsNotApplied: candidate.notApplied,
    notAppliedRecommendationRefs: candidate.notApplied.map((entry) => entry.recommendationRef),
    limitationsCarriedForward,
    warnings: candidate.notApplied.map((entry) => ({
      warningCode: `recommendation_not_applied:${entry.creationReason}`,
      recommendationRef: entry.recommendationRef,
      details: entry.details,
    })),
    watermarks: {
      semanticInputWatermark: input.semanticInputWatermark,
      computedSemanticInputWatermark,
      dryRunMatchWatermark,
      appliedChangeSetWatermark,
      runtimeOutputBundleWatermark,
      semanticOutputWatermark,
    },
    idempotency: {
      key: input.idempotencyKey,
      reused: Boolean(existingTarget),
      result: existingTarget ? "reused_existing_candidate" : "created_candidate",
    },
    runtimeWrites: true,
    runtimeWritePerformed: true,
    siteVersionCreated: !existingTarget,
    artifactCreated: !verifiedCandidateVersion.artifactId,
    artifactBound: true,
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
    nonApprovalBoundary: IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY,
    mutationBoundary: IMPROVED_CANDIDATE_CREATION_MUTATION_BOUNDARY,
  };

  await updateExecutionAttempt({ service: dependencies.executionService, creationInput: input, output });
  return output;
}

export function computeImprovedCandidateCreationSemanticInputWatermark(
  input: Omit<ImprovedCandidateCreationInput, "semanticInputWatermark"> & { semanticInputWatermark?: string | null },
): string {
  return computeSemanticInput(input as ImprovedCandidateCreationInput, input.adapterVersion ?? IMPROVED_CANDIDATE_CREATION_ADAPTER_VERSION);
}
