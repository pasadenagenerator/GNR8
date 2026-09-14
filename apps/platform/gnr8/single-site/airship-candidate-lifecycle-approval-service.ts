import "server-only";

import { createHash } from "node:crypto";

import { getActivePointerForSite, getArtifactById, getSiteVersion } from "@/gnr8/runtime/runtime-store";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact, SiteVersionState } from "@/gnr8/runtime/types";

import {
  PostgresAirshipInternalPreviewCandidateReviewRepository,
  type AirshipInternalPreviewCandidateReviewRecord,
  type AirshipInternalPreviewCandidateReviewRepository,
} from "./airship-single-site-draft-candidate-review-service";
import {
  PostgresAirshipPublishReadinessRepository,
  type AirshipPublishReadinessRecord,
  type AirshipPublishReadinessRepository,
} from "./airship-single-site-publish-readiness-service";

export const AIRSHIP_CANDIDATE_LIFECYCLE_APPROVAL_SERVICE_VERSION = "airship-23-candidate-lifecycle-approval:v1" as const;

type ActivePointer = { siteVersionId: string; artifactId: string };
type NullablePointer = ActivePointer | null;

export type AirshipCandidateLifecycleApprovalInput = Record<string, unknown> & {
  migrationId: string;
  readinessPackageId: string;
  candidateSiteVersionId: string;
  artifactId: string;
  idempotencyKey: string;
  reason?: string | null;
  actorId: string;
};

export type AirshipCandidateLifecycleApprovalOutput = {
  ok: true;
  outcome: "approved" | "noop_already_approved";
  changed: boolean;
  serviceVersion: typeof AIRSHIP_CANDIDATE_LIFECYCLE_APPROVAL_SERVICE_VERSION;
  previousState: SiteVersionState;
  newState: SiteVersionState;
  activePointer: NullablePointer;
  activePointerChanged: false;
  artifactStageUnchanged: true;
  auditRefs: {
    source: "gnr8_runtime_version_audit";
    transitionAuditMarkers: string[];
    siteVersionId: string;
  };
  refs: {
    migrationId: string;
    readinessPackageId: string;
    reviewId: string;
    candidateSiteVersionId: string;
    artifactId: string;
    siteId: string;
    idempotencyKey: string;
  };
};

export type AirshipCandidateLifecycleApprovalDependencies = {
  readinessRepository: AirshipPublishReadinessRepository;
  reviewRepository: AirshipInternalPreviewCandidateReviewRepository;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  transitionSiteVersionState: typeof transitionSiteVersionState;
};

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_INPUT_KEYS = new Set([
  "migrationId",
  "readinessPackageId",
  "candidateSiteVersionId",
  "artifactId",
  "idempotencyKey",
  "reason",
  "actorId",
]);
const FORBIDDEN_INPUT_KEYS = new Set([
  "actor",
  "actorRole",
  "actorType",
  "userId",
  "principal",
  "provider",
  "providerPayload",
  "providerConfig",
  "publish",
  "publishMode",
  "publishChain",
  "activationChain",
  "shadowPublish",
  "dryRun",
  "rollback",
  "sourceCapture",
  "activePointer",
  "previousPointer",
  "newPointer",
  "audit",
]);

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`airship_candidate_lifecycle_${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`airship_candidate_lifecycle_${field}_invalid`);
  return normalized;
}

function validateInputKeys(input: Record<string, unknown>): void {
  const errors: string[] = [];
  for (const key of Object.keys(input).sort()) {
    if (FORBIDDEN_INPUT_KEYS.has(key)) errors.push(`airship_candidate_lifecycle_forbidden_field:${key}`);
    if (!ALLOWED_INPUT_KEYS.has(key)) errors.push(`airship_candidate_lifecycle_unknown_field:${key}`);
  }
  if (errors.length > 0) throw new Error(Array.from(new Set(errors)).sort().join(","));
}

function samePointer(left: NullablePointer, right: NullablePointer): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function auditMarker(input: {
  transition: "draft_to_ready_for_review" | "ready_for_review_to_approved";
  readinessPackageId: string;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.transition}:${input.readinessPackageId}:${input.idempotencyKey}`)
    .digest("hex");
  return `airship-candidate-lifecycle:${input.transition}:${digest}`;
}

function assertReadinessReady(readiness: AirshipPublishReadinessRecord | null): asserts readiness is AirshipPublishReadinessRecord {
  if (!readiness) throw new Error("airship_candidate_lifecycle_readiness_package_missing");
  if (readiness.readinessStatus !== "complete") throw new Error("airship_candidate_lifecycle_readiness_not_complete");
}

function assertApprovedReview(review: AirshipInternalPreviewCandidateReviewRecord | null): asserts review is AirshipInternalPreviewCandidateReviewRecord {
  if (!review) throw new Error("airship_candidate_lifecycle_approved_review_missing");
  if (review.reviewStatus !== "approved" || review.reviewDecision !== "approved_for_publish_readiness" || review.publishReadinessReady !== true) {
    throw new Error("airship_candidate_lifecycle_review_not_approved");
  }
}

function assertEligibility(input: {
  migrationId: string;
  readinessPackageId: string;
  candidateSiteVersionId: string;
  artifactId: string;
  readiness: AirshipPublishReadinessRecord;
  review: AirshipInternalPreviewCandidateReviewRecord;
  candidateVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  activePointer: NullablePointer;
}): void {
  if (input.readiness.id !== input.readinessPackageId) throw new Error("airship_candidate_lifecycle_readiness_id_mismatch");
  if (input.readiness.migrationId !== input.migrationId) throw new Error("airship_candidate_lifecycle_readiness_migration_mismatch");
  if (input.readiness.reviewedCandidateSiteVersionId !== input.candidateSiteVersionId) {
    throw new Error("airship_candidate_lifecycle_readiness_candidate_mismatch");
  }
  if (input.readiness.reviewedArtifactId !== input.artifactId) throw new Error("airship_candidate_lifecycle_readiness_artifact_mismatch");
  if (input.readiness.reviewRecordId !== input.review.id) throw new Error("airship_candidate_lifecycle_review_id_mismatch");

  if (input.review.migrationId !== input.migrationId) throw new Error("airship_candidate_lifecycle_review_migration_mismatch");
  if (input.review.candidateSiteVersionId !== input.candidateSiteVersionId) throw new Error("airship_candidate_lifecycle_review_candidate_mismatch");
  if (input.review.candidateRuntimeArtifactId !== input.artifactId) throw new Error("airship_candidate_lifecycle_review_artifact_mismatch");

  const expectedSiteId = text(input.readiness.siteClientSourceLabels.siteId);
  if (!expectedSiteId) throw new Error("airship_candidate_lifecycle_expected_site_missing");
  if (input.candidateVersion.siteId !== expectedSiteId) throw new Error("airship_candidate_lifecycle_candidate_site_mismatch");
  if (input.candidateVersion.artifactId !== input.artifactId) throw new Error("airship_candidate_lifecycle_candidate_version_artifact_mismatch");
  if (input.artifact.siteId !== input.candidateVersion.siteId) throw new Error("airship_candidate_lifecycle_artifact_site_mismatch");
  if (input.artifact.siteVersionId !== input.candidateSiteVersionId) throw new Error("airship_candidate_lifecycle_artifact_candidate_mismatch");
  if (input.artifact.rendererCompatibilityVersion !== input.candidateVersion.rendererCompatibilityVersion) {
    throw new Error("airship_candidate_lifecycle_renderer_compatibility_mismatch");
  }
  if (input.artifact.publishStage === "production") throw new Error("airship_candidate_lifecycle_artifact_stage_blocked:production");
  if (samePointer(input.activePointer, { siteVersionId: input.candidateSiteVersionId, artifactId: input.artifactId })) {
    throw new Error("airship_candidate_lifecycle_candidate_already_live_pointer");
  }
  if (!["DRAFT", "READY_FOR_REVIEW", "APPROVED"].includes(input.candidateVersion.state)) {
    throw new Error(`airship_candidate_lifecycle_state_blocked:${input.candidateVersion.state}`);
  }
}

function transitionDetails(input: {
  marker: string;
  transition: "draft_to_ready_for_review" | "ready_for_review_to_approved";
  migrationId: string;
  readinessPackageId: string;
  reviewId: string;
  idempotencyKey: string;
  reason: string | null;
  actorId: string;
  candidateSiteVersionId: string;
  artifactId: string;
  activePointer: NullablePointer;
}) {
  return {
    serviceVersion: AIRSHIP_CANDIDATE_LIFECYCLE_APPROVAL_SERVICE_VERSION,
    phase: "candidate_lifecycle_approval",
    transition: input.transition,
    auditMarker: input.marker,
    migrationId: input.migrationId,
    readinessPackageId: input.readinessPackageId,
    reviewId: input.reviewId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    actorSuperadminUserId: input.actorId,
    candidatePointer: {
      siteVersionId: input.candidateSiteVersionId,
      artifactId: input.artifactId,
    },
    activePointerBefore: input.activePointer,
    activePointerChanged: false,
    artifactStageUnchanged: true,
    notPromoted: true,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    sourceCapture: false,
    providerCall: false,
  };
}

export async function approveAirshipCandidateLifecycle(
  input: AirshipCandidateLifecycleApprovalInput,
  dependencies: Partial<AirshipCandidateLifecycleApprovalDependencies> = {},
): Promise<AirshipCandidateLifecycleApprovalOutput> {
  validateInputKeys(input);
  const deps: AirshipCandidateLifecycleApprovalDependencies = {
    readinessRepository: dependencies.readinessRepository ?? new PostgresAirshipPublishReadinessRepository(),
    reviewRepository: dependencies.reviewRepository ?? new PostgresAirshipInternalPreviewCandidateReviewRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    transitionSiteVersionState: dependencies.transitionSiteVersionState ?? transitionSiteVersionState,
  };

  const migrationId = uuid("migrationId", input.migrationId);
  const readinessPackageId = uuid("readinessPackageId", input.readinessPackageId);
  const candidateSiteVersionId = uuid("candidateSiteVersionId", input.candidateSiteVersionId);
  const artifactId = uuid("artifactId", input.artifactId);
  const idempotencyKey = required("idempotencyKey", input.idempotencyKey);
  const actorId = required("actorId", input.actorId);
  const reason = text(input.reason);

  const readiness = await deps.readinessRepository.readReadinessById?.(readinessPackageId);
  assertReadinessReady(readiness ?? null);

  const review = await deps.reviewRepository.readLatestReview({
    migrationId,
    draftId: readiness.draftId,
    draftVersion: readiness.draftVersion,
    candidateSiteVersionId,
    candidateRuntimeArtifactId: artifactId,
  });
  assertApprovedReview(review);

  const candidateVersion = await deps.getSiteVersion(candidateSiteVersionId);
  if (!candidateVersion) throw new Error("airship_candidate_lifecycle_candidate_version_missing");
  const artifact = await deps.getArtifactById(artifactId);
  if (!artifact) throw new Error("airship_candidate_lifecycle_artifact_missing");
  const activePointer = await deps.getActivePointerForSite(candidateVersion.siteId);

  assertEligibility({
    migrationId,
    readinessPackageId,
    candidateSiteVersionId,
    artifactId,
    readiness,
    review,
    candidateVersion,
    artifact,
    activePointer,
  });

  const markers: string[] = [];
  let currentState = candidateVersion.state;
  if (currentState === "DRAFT") {
    const marker = auditMarker({ transition: "draft_to_ready_for_review", readinessPackageId, idempotencyKey });
    markers.push(marker);
    await deps.transitionSiteVersionState({
      siteVersionId: candidateSiteVersionId,
      nextState: "READY_FOR_REVIEW",
      actor: actorId,
      source: "manual",
      details: transitionDetails({
        marker,
        transition: "draft_to_ready_for_review",
        migrationId,
        readinessPackageId,
        reviewId: review.id,
        idempotencyKey,
        reason,
        actorId,
        candidateSiteVersionId,
        artifactId,
        activePointer,
      }),
    });
    currentState = "READY_FOR_REVIEW";
  }

  if (currentState === "READY_FOR_REVIEW") {
    const marker = auditMarker({ transition: "ready_for_review_to_approved", readinessPackageId, idempotencyKey });
    markers.push(marker);
    await deps.transitionSiteVersionState({
      siteVersionId: candidateSiteVersionId,
      nextState: "APPROVED",
      actor: actorId,
      source: "manual",
      details: transitionDetails({
        marker,
        transition: "ready_for_review_to_approved",
        migrationId,
        readinessPackageId,
        reviewId: review.id,
        idempotencyKey,
        reason,
        actorId,
        candidateSiteVersionId,
        artifactId,
        activePointer,
      }),
    });
    currentState = "APPROVED";
  }

  const changed = candidateVersion.state !== "APPROVED";
  return {
    ok: true,
    outcome: changed ? "approved" : "noop_already_approved",
    changed,
    serviceVersion: AIRSHIP_CANDIDATE_LIFECYCLE_APPROVAL_SERVICE_VERSION,
    previousState: candidateVersion.state,
    newState: currentState,
    activePointer,
    activePointerChanged: false,
    artifactStageUnchanged: true,
    auditRefs: {
      source: "gnr8_runtime_version_audit",
      transitionAuditMarkers: markers,
      siteVersionId: candidateSiteVersionId,
    },
    refs: {
      migrationId,
      readinessPackageId,
      reviewId: review.id,
      candidateSiteVersionId,
      artifactId,
      siteId: candidateVersion.siteId,
      idempotencyKey,
    },
  };
}
