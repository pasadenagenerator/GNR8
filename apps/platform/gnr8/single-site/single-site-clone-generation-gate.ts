import "server-only";

import {
  type SingleSiteMigrationState,
  type SingleSiteSourceEvidenceReviewStatus,
} from "./single-site-state-contracts";
import { SingleSiteStateReadRepository } from "./single-site-state-read-repository";
import type { SingleSiteMigrationReadModel } from "./single-site-state-read-model";

export const SINGLE_SITE_CLONE_GENERATION_GATE_REASONS = [
  "source_evidence_accepted",
  "source_evidence_accepted_with_limitations",
  "source_evidence_missing",
  "source_evidence_not_ready",
  "source_evidence_review_in_progress",
  "source_evidence_retry_required",
  "source_evidence_rejected",
  "source_evidence_superseded",
  "migration_not_found",
  "migration_terminal",
  "migration_failed",
  "migration_cancelled",
  "read_model_unavailable",
  "unsafe_missing_identity",
] as const;

export type SingleSiteCloneGenerationGateReason = (typeof SINGLE_SITE_CLONE_GENERATION_GATE_REASONS)[number];
export type SingleSiteCloneGenerationGateMode = "allowed" | "warning" | "blocked";
export type SingleSiteCloneGenerationGateCurrentState = SingleSiteMigrationState | "missing" | "unavailable";
export type SingleSiteCloneGenerationGateReviewStatus = SingleSiteSourceEvidenceReviewStatus | "missing" | "unavailable";
export type SingleSiteCloneGenerationGateRecommendedNextAction =
  | "start_clone_generation"
  | "review_source_evidence"
  | "retry_capture"
  | "capture_source_evidence"
  | "resolve_migration_identity"
  | "inspect_read_model"
  | "reopen_or_restart_migration"
  | "investigate_migration_failure"
  | "no_action_required";

export type SingleSiteCloneGenerationGateResult = {
  allowed: boolean;
  mode: SingleSiteCloneGenerationGateMode;
  reason: SingleSiteCloneGenerationGateReason;
  migrationId: string | null;
  siteId: string | null;
  currentState: SingleSiteCloneGenerationGateCurrentState;
  sourceEvidenceReviewStatus: SingleSiteCloneGenerationGateReviewStatus;
  sourceEvidenceReviewId: string | null;
  acceptedWithLimitations: boolean;
  limitations: unknown[];
  missingRequirements: string[];
  recommendedNextAction: SingleSiteCloneGenerationGateRecommendedNextAction;
  derivedOnly: true;
  mutatesSourceTruth: false;
};

export type SingleSiteCloneGenerationGateReadRepository = {
  readByMigrationId(migrationId: string): Promise<SingleSiteMigrationReadModel | null>;
};

export type EvaluateCloneGenerationGateInput = {
  migrationId?: string | null;
  readModel?: SingleSiteMigrationReadModel | null;
  repository?: SingleSiteCloneGenerationGateReadRepository | null;
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function result(input: Omit<SingleSiteCloneGenerationGateResult, "derivedOnly" | "mutatesSourceTruth">): SingleSiteCloneGenerationGateResult {
  return {
    allowed: input.allowed,
    mode: input.mode,
    reason: input.reason,
    migrationId: input.migrationId,
    siteId: input.siteId,
    currentState: input.currentState,
    sourceEvidenceReviewStatus: input.sourceEvidenceReviewStatus,
    sourceEvidenceReviewId: input.sourceEvidenceReviewId,
    acceptedWithLimitations: input.acceptedWithLimitations,
    limitations: input.limitations,
    missingRequirements: input.missingRequirements,
    recommendedNextAction: input.recommendedNextAction,
    derivedOnly: true,
    mutatesSourceTruth: false,
  };
}

function unavailableResult(
  reason: Extract<SingleSiteCloneGenerationGateReason, "read_model_unavailable" | "unsafe_missing_identity" | "migration_not_found">,
  migrationId: string | null,
  missingRequirements: string[],
): SingleSiteCloneGenerationGateResult {
  return result({
    allowed: false,
    mode: "blocked",
    reason,
    migrationId,
    siteId: null,
    currentState: reason === "migration_not_found" ? "missing" : "unavailable",
    sourceEvidenceReviewStatus: reason === "migration_not_found" ? "missing" : "unavailable",
    sourceEvidenceReviewId: null,
    acceptedWithLimitations: false,
    limitations: [],
    missingRequirements,
    recommendedNextAction:
      reason === "unsafe_missing_identity"
        ? "resolve_migration_identity"
        : reason === "read_model_unavailable"
          ? "inspect_read_model"
          : "capture_source_evidence",
  });
}

function evaluateReadModel(readModel: SingleSiteMigrationReadModel, requestedMigrationId: string | null): SingleSiteCloneGenerationGateResult {
  const migrationId = text(readModel.migration.migrationId);
  if (!migrationId || (requestedMigrationId && requestedMigrationId !== migrationId)) {
    return result({
      allowed: false,
      mode: "blocked",
      reason: "unsafe_missing_identity",
      migrationId: requestedMigrationId ?? migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: readModel.sourceEvidenceReview.reviewStatus,
      sourceEvidenceReviewId: readModel.sourceEvidenceReview.reviewId,
      acceptedWithLimitations: readModel.sourceEvidenceReview.acceptedWithLimitations,
      limitations: readModel.sourceEvidenceReview.limitations,
      missingRequirements: requestedMigrationId && requestedMigrationId !== migrationId ? ["matching_migration_id"] : ["migration_id"],
      recommendedNextAction: "resolve_migration_identity",
    });
  }

  if (readModel.currentState.failed) {
    return result({
      allowed: false,
      mode: "blocked",
      reason: "migration_failed",
      migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: readModel.sourceEvidenceReview.reviewStatus,
      sourceEvidenceReviewId: readModel.sourceEvidenceReview.reviewId,
      acceptedWithLimitations: readModel.sourceEvidenceReview.acceptedWithLimitations,
      limitations: readModel.sourceEvidenceReview.limitations,
      missingRequirements: ["active_migration"],
      recommendedNextAction: "investigate_migration_failure",
    });
  }

  if (readModel.currentState.cancelled) {
    return result({
      allowed: false,
      mode: "blocked",
      reason: "migration_cancelled",
      migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: readModel.sourceEvidenceReview.reviewStatus,
      sourceEvidenceReviewId: readModel.sourceEvidenceReview.reviewId,
      acceptedWithLimitations: readModel.sourceEvidenceReview.acceptedWithLimitations,
      limitations: readModel.sourceEvidenceReview.limitations,
      missingRequirements: ["active_migration"],
      recommendedNextAction: "reopen_or_restart_migration",
    });
  }

  if (readModel.currentState.terminal) {
    return result({
      allowed: false,
      mode: "blocked",
      reason: "migration_terminal",
      migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: readModel.sourceEvidenceReview.reviewStatus,
      sourceEvidenceReviewId: readModel.sourceEvidenceReview.reviewId,
      acceptedWithLimitations: readModel.sourceEvidenceReview.acceptedWithLimitations,
      limitations: readModel.sourceEvidenceReview.limitations,
      missingRequirements: ["active_migration"],
      recommendedNextAction: "no_action_required",
    });
  }

  const review = readModel.sourceEvidenceReview;
  if (review.reviewStatus === "accepted") {
    if (!review.cloneGenerationAllowed) {
      return result({
        allowed: false,
        mode: "blocked",
        reason: "source_evidence_not_ready",
        migrationId,
        siteId: readModel.migration.siteId,
        currentState: readModel.currentState.state,
        sourceEvidenceReviewStatus: review.reviewStatus,
        sourceEvidenceReviewId: review.reviewId,
        acceptedWithLimitations: false,
        limitations: review.limitations,
        missingRequirements: ["clone_generation_allowed_source_evidence_review"],
        recommendedNextAction: "review_source_evidence",
      });
    }
    return result({
      allowed: true,
      mode: "allowed",
      reason: "source_evidence_accepted",
      migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: review.reviewStatus,
      sourceEvidenceReviewId: review.reviewId,
      acceptedWithLimitations: false,
      limitations: [],
      missingRequirements: [],
      recommendedNextAction: "start_clone_generation",
    });
  }

  if (review.reviewStatus === "accepted_with_limitations") {
    if (!review.cloneGenerationAllowed) {
      return result({
        allowed: false,
        mode: "blocked",
        reason: "source_evidence_not_ready",
        migrationId,
        siteId: readModel.migration.siteId,
        currentState: readModel.currentState.state,
        sourceEvidenceReviewStatus: review.reviewStatus,
        sourceEvidenceReviewId: review.reviewId,
        acceptedWithLimitations: true,
        limitations: review.limitations,
        missingRequirements: ["clone_generation_allowed_source_evidence_review"],
        recommendedNextAction: "review_source_evidence",
      });
    }
    return result({
      allowed: true,
      mode: "warning",
      reason: "source_evidence_accepted_with_limitations",
      migrationId,
      siteId: readModel.migration.siteId,
      currentState: readModel.currentState.state,
      sourceEvidenceReviewStatus: review.reviewStatus,
      sourceEvidenceReviewId: review.reviewId,
      acceptedWithLimitations: true,
      limitations: review.limitations,
      missingRequirements: [],
      recommendedNextAction: "start_clone_generation",
    });
  }

  const reasonByStatus: Record<SingleSiteCloneGenerationGateReviewStatus, SingleSiteCloneGenerationGateReason> = {
    missing: "source_evidence_missing",
    unavailable: "read_model_unavailable",
    not_started: "source_evidence_not_ready",
    ready_for_review: "source_evidence_not_ready",
    review_in_progress: "source_evidence_review_in_progress",
    retry_required: "source_evidence_retry_required",
    rejected: "source_evidence_rejected",
    superseded: "source_evidence_superseded",
    accepted: "source_evidence_accepted",
    accepted_with_limitations: "source_evidence_accepted_with_limitations",
  };
  const actionByReason: Record<SingleSiteCloneGenerationGateReason, SingleSiteCloneGenerationGateRecommendedNextAction> = {
    source_evidence_accepted: "start_clone_generation",
    source_evidence_accepted_with_limitations: "start_clone_generation",
    source_evidence_missing: "capture_source_evidence",
    source_evidence_not_ready: "review_source_evidence",
    source_evidence_review_in_progress: "review_source_evidence",
    source_evidence_retry_required: "retry_capture",
    source_evidence_rejected: "retry_capture",
    source_evidence_superseded: "review_source_evidence",
    migration_not_found: "capture_source_evidence",
    migration_terminal: "no_action_required",
    migration_failed: "investigate_migration_failure",
    migration_cancelled: "reopen_or_restart_migration",
    read_model_unavailable: "inspect_read_model",
    unsafe_missing_identity: "resolve_migration_identity",
  };
  const reason = reasonByStatus[review.reviewStatus] ?? "source_evidence_not_ready";
  const missingRequirement =
    review.reviewStatus === "missing"
      ? "latest_source_evidence_review"
      : review.reviewStatus === "superseded"
        ? "accepted_source_evidence_replacement"
        : "accepted_source_evidence_review";

  return result({
    allowed: false,
    mode: "blocked",
    reason,
    migrationId,
    siteId: readModel.migration.siteId,
    currentState: readModel.currentState.state,
    sourceEvidenceReviewStatus: review.reviewStatus,
    sourceEvidenceReviewId: review.reviewId,
    acceptedWithLimitations: review.acceptedWithLimitations,
    limitations: review.limitations,
    missingRequirements: [missingRequirement],
    recommendedNextAction: actionByReason[reason],
  });
}

export async function evaluateCloneGenerationGate(input: EvaluateCloneGenerationGateInput = {}): Promise<SingleSiteCloneGenerationGateResult> {
  const requestedMigrationId = text(input.migrationId);

  if (Object.prototype.hasOwnProperty.call(input, "readModel")) {
    if (!input.readModel) return unavailableResult("migration_not_found", requestedMigrationId, ["single_site_migration"]);
    return evaluateReadModel(input.readModel, requestedMigrationId);
  }

  if (!requestedMigrationId) return unavailableResult("unsafe_missing_identity", null, ["migration_id"]);

  try {
    const repository = input.repository ?? new SingleSiteStateReadRepository();
    const readModel = await repository.readByMigrationId(requestedMigrationId);
    if (!readModel) return unavailableResult("migration_not_found", requestedMigrationId, ["single_site_migration"]);
    return evaluateReadModel(readModel, requestedMigrationId);
  } catch {
    return unavailableResult("read_model_unavailable", requestedMigrationId, ["read_model"]);
  }
}
