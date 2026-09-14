import "server-only";

import { createHash } from "node:crypto";

import { assertPublishSafety } from "@/gnr8/runtime/publish-safety-check";
import {
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  recordPublishActivationAudit,
  switchActivePointer,
} from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

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

export const AIRSHIP_SIMPLE_PROMOTE_TO_LIVE_SERVICE_VERSION = "airship-22-simple-promote-to-live:v1" as const;

type ActivePointer = { siteVersionId: string; artifactId: string };
type NullablePointer = ActivePointer | null;

export type AirshipSimplePromoteToLiveInput = Record<string, unknown> & {
  migrationId: string;
  readinessPackageId: string;
  candidateSiteVersionId: string;
  artifactId: string;
  idempotencyKey: string;
  reason?: string | null;
  actorId: string;
};

export type AirshipSimplePromoteToLiveOutput = {
  ok: true;
  outcome: "promoted" | "noop_already_active";
  promoted: boolean;
  noOp: boolean;
  serviceVersion: typeof AIRSHIP_SIMPLE_PROMOTE_TO_LIVE_SERVICE_VERSION;
  previousPointer: ActivePointer;
  newPointer: ActivePointer;
  auditRefs: {
    source: "gnr8_runtime_version_audit";
    preSwitchAudit: string;
    postSwitchAudit: string | null;
    siteVersionId: string;
  };
  rollbackData: {
    instruction: string;
    previousActiveSiteVersionId: string;
    previousActiveArtifactId: string;
    targetSiteVersionId: string;
    targetArtifactId: string;
  };
  safetyResult: { ok: true };
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

export type AirshipSimplePromoteToLiveDependencies = {
  readinessRepository: AirshipPublishReadinessRepository;
  reviewRepository: AirshipInternalPreviewCandidateReviewRepository;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  switchActivePointer: typeof switchActivePointer;
  recordPublishActivationAudit: typeof recordPublishActivationAudit;
  assertPublishSafety: typeof assertPublishSafety;
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
  if (!normalized) throw new Error(`airship_simple_promote_${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`airship_simple_promote_${field}_invalid`);
  return normalized;
}

function validateInputKeys(input: Record<string, unknown>): void {
  const errors: string[] = [];
  for (const key of Object.keys(input).sort()) {
    if (FORBIDDEN_INPUT_KEYS.has(key)) errors.push(`airship_simple_promote_forbidden_field:${key}`);
    if (!ALLOWED_INPUT_KEYS.has(key)) errors.push(`airship_simple_promote_unknown_field:${key}`);
  }
  if (errors.length > 0) throw new Error(Array.from(new Set(errors)).sort().join(","));
}

function samePointer(left: NullablePointer, right: NullablePointer): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function auditMarker(input: {
  phase: "pre_switch" | "post_switch_noop" | "post_switch_readback";
  readinessPackageId: string;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.phase}:${input.readinessPackageId}:${input.idempotencyKey}`)
    .digest("hex");
  return `airship-simple-promote:${input.phase}:${digest}`;
}

function assertReadinessReady(readiness: AirshipPublishReadinessRecord | null): asserts readiness is AirshipPublishReadinessRecord {
  if (!readiness) throw new Error("airship_simple_promote_readiness_package_missing");
  if (readiness.readinessStatus !== "complete") throw new Error("airship_simple_promote_readiness_not_complete");
}

function assertApprovedReview(review: AirshipInternalPreviewCandidateReviewRecord | null): asserts review is AirshipInternalPreviewCandidateReviewRecord {
  if (!review) throw new Error("airship_simple_promote_approved_review_missing");
  if (review.reviewStatus !== "approved" || review.reviewDecision !== "approved_for_publish_readiness" || review.publishReadinessReady !== true) {
    throw new Error("airship_simple_promote_review_not_approved");
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
}): void {
  if (input.readiness.id !== input.readinessPackageId) throw new Error("airship_simple_promote_readiness_id_mismatch");
  if (input.readiness.migrationId !== input.migrationId) throw new Error("airship_simple_promote_readiness_migration_mismatch");
  if (input.readiness.reviewedCandidateSiteVersionId !== input.candidateSiteVersionId) {
    throw new Error("airship_simple_promote_readiness_candidate_mismatch");
  }
  if (input.readiness.reviewedArtifactId !== input.artifactId) throw new Error("airship_simple_promote_readiness_artifact_mismatch");
  if (input.readiness.reviewRecordId !== input.review.id) throw new Error("airship_simple_promote_review_id_mismatch");

  if (input.review.migrationId !== input.migrationId) throw new Error("airship_simple_promote_review_migration_mismatch");
  if (input.review.candidateSiteVersionId !== input.candidateSiteVersionId) throw new Error("airship_simple_promote_review_candidate_mismatch");
  if (input.review.candidateRuntimeArtifactId !== input.artifactId) throw new Error("airship_simple_promote_review_artifact_mismatch");

  const expectedSiteId = text(input.readiness.siteClientSourceLabels.siteId);
  if (!expectedSiteId) throw new Error("airship_simple_promote_expected_site_missing");
  if (input.candidateVersion.siteId !== expectedSiteId) throw new Error("airship_simple_promote_candidate_site_mismatch");
  if (input.candidateVersion.artifactId !== input.artifactId) throw new Error("airship_simple_promote_candidate_version_artifact_mismatch");
  if (input.artifact.siteId !== input.candidateVersion.siteId) throw new Error("airship_simple_promote_artifact_site_mismatch");
  if (input.artifact.siteVersionId !== input.candidateSiteVersionId) throw new Error("airship_simple_promote_artifact_candidate_mismatch");
  if (input.artifact.rendererCompatibilityVersion !== input.candidateVersion.rendererCompatibilityVersion) {
    throw new Error("airship_simple_promote_renderer_compatibility_mismatch");
  }
  if (input.candidateVersion.state !== "APPROVED") {
    throw new Error(`airship_simple_promote_candidate_lifecycle_blocked:${input.candidateVersion.state}`);
  }
}

function rollbackData(input: {
  previousPointer: ActivePointer;
  candidateSiteVersionId: string;
  artifactId: string;
}): AirshipSimplePromoteToLiveOutput["rollbackData"] {
  return {
    instruction:
      "Rollback by running the approved runtime rollback path to restore previousActiveSiteVersionId/previousActiveArtifactId; do not hand-edit active pointer rows.",
    previousActiveSiteVersionId: input.previousPointer.siteVersionId,
    previousActiveArtifactId: input.previousPointer.artifactId,
    targetSiteVersionId: input.candidateSiteVersionId,
    targetArtifactId: input.artifactId,
  };
}

function auditDetails(input: {
  phase: "pre_switch" | "post_switch_noop" | "post_switch_readback";
  migrationId: string;
  readinessPackageId: string;
  reviewId: string;
  idempotencyKey: string;
  reason: string | null;
  actorId: string;
  previousPointer: ActivePointer;
  newPointer: NullablePointer;
  candidateSiteVersionId: string;
  artifactId: string;
  switched: boolean;
}) {
  return {
    serviceVersion: AIRSHIP_SIMPLE_PROMOTE_TO_LIVE_SERVICE_VERSION,
    phase: input.phase,
    auditMarker: auditMarker({
      phase: input.phase,
      readinessPackageId: input.readinessPackageId,
      idempotencyKey: input.idempotencyKey,
    }),
    migrationId: input.migrationId,
    readinessPackageId: input.readinessPackageId,
    reviewId: input.reviewId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    actorSuperadminUserId: input.actorId,
    previousActivePointer: input.previousPointer,
    targetCandidatePointer: {
      siteVersionId: input.candidateSiteVersionId,
      artifactId: input.artifactId,
    },
    newActivePointer: input.newPointer,
    switched: input.switched,
    rollback: rollbackData({
      previousPointer: input.previousPointer,
      candidateSiteVersionId: input.candidateSiteVersionId,
      artifactId: input.artifactId,
    }),
  };
}

export async function promoteAirshipApprovedCandidateToLive(
  input: AirshipSimplePromoteToLiveInput,
  dependencies: Partial<AirshipSimplePromoteToLiveDependencies> = {},
): Promise<AirshipSimplePromoteToLiveOutput> {
  validateInputKeys(input);
  const deps: AirshipSimplePromoteToLiveDependencies = {
    readinessRepository: dependencies.readinessRepository ?? new PostgresAirshipPublishReadinessRepository(),
    reviewRepository: dependencies.reviewRepository ?? new PostgresAirshipInternalPreviewCandidateReviewRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    switchActivePointer: dependencies.switchActivePointer ?? switchActivePointer,
    recordPublishActivationAudit: dependencies.recordPublishActivationAudit ?? recordPublishActivationAudit,
    assertPublishSafety: dependencies.assertPublishSafety ?? assertPublishSafety,
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
  if (!candidateVersion) throw new Error("airship_simple_promote_candidate_version_missing");
  const artifact = await deps.getArtifactById(artifactId);
  if (!artifact) throw new Error("airship_simple_promote_artifact_missing");

  assertEligibility({
    migrationId,
    readinessPackageId,
    candidateSiteVersionId,
    artifactId,
    readiness,
    review,
    candidateVersion,
    artifact,
  });

  const previousPointer = await deps.getActivePointerForSite(candidateVersion.siteId);
  if (!previousPointer) throw new Error("airship_simple_promote_previous_active_pointer_missing");

  const rollback = rollbackData({ previousPointer, candidateSiteVersionId, artifactId });
  const refs = {
    migrationId,
    readinessPackageId,
    reviewId: review.id,
    candidateSiteVersionId,
    artifactId,
    siteId: candidateVersion.siteId,
    idempotencyKey,
  };

  if (samePointer(previousPointer, { siteVersionId: candidateSiteVersionId, artifactId })) {
    deps.assertPublishSafety({
      siteId: candidateVersion.siteId,
      siteVersionId: candidateSiteVersionId,
      artifactId,
      rendererCompatibilityVersion: candidateVersion.rendererCompatibilityVersion,
      artifact,
      activePointer: previousPointer,
    });
    const postSwitchAudit = auditMarker({ phase: "post_switch_noop", readinessPackageId, idempotencyKey });
    await deps.recordPublishActivationAudit({
      siteVersionId: candidateSiteVersionId,
      actor: actorId,
      source: "manual",
      details: auditDetails({
        phase: "post_switch_noop",
        migrationId,
        readinessPackageId,
        reviewId: review.id,
        idempotencyKey,
        reason,
        actorId,
        previousPointer,
        newPointer: previousPointer,
        candidateSiteVersionId,
        artifactId,
        switched: false,
      }),
    });
    return {
      ok: true,
      outcome: "noop_already_active",
      promoted: false,
      noOp: true,
      serviceVersion: AIRSHIP_SIMPLE_PROMOTE_TO_LIVE_SERVICE_VERSION,
      previousPointer,
      newPointer: previousPointer,
      auditRefs: {
        source: "gnr8_runtime_version_audit",
        preSwitchAudit: postSwitchAudit,
        postSwitchAudit,
        siteVersionId: candidateSiteVersionId,
      },
      rollbackData: rollback,
      safetyResult: { ok: true },
      refs,
    };
  }

  const preSwitchAudit = auditMarker({ phase: "pre_switch", readinessPackageId, idempotencyKey });
  await deps.recordPublishActivationAudit({
    siteVersionId: candidateSiteVersionId,
    actor: actorId,
    source: "manual",
    details: auditDetails({
      phase: "pre_switch",
      migrationId,
      readinessPackageId,
      reviewId: review.id,
      idempotencyKey,
      reason,
      actorId,
      previousPointer,
      newPointer: null,
      candidateSiteVersionId,
      artifactId,
      switched: false,
    }),
  });

  await deps.switchActivePointer({
    siteId: candidateVersion.siteId,
    siteVersionId: candidateSiteVersionId,
    artifactId,
  });

  const newPointer = await deps.getActivePointerForSite(candidateVersion.siteId);
  if (!newPointer) throw new Error("airship_simple_promote_new_active_pointer_missing");
  deps.assertPublishSafety({
    siteId: candidateVersion.siteId,
    siteVersionId: candidateSiteVersionId,
    artifactId,
    rendererCompatibilityVersion: candidateVersion.rendererCompatibilityVersion,
    artifact,
    activePointer: newPointer,
  });

  const postSwitchAudit = auditMarker({ phase: "post_switch_readback", readinessPackageId, idempotencyKey });
  await deps.recordPublishActivationAudit({
    siteVersionId: candidateSiteVersionId,
    actor: actorId,
    source: "manual",
    details: auditDetails({
      phase: "post_switch_readback",
      migrationId,
      readinessPackageId,
      reviewId: review.id,
      idempotencyKey,
      reason,
      actorId,
      previousPointer,
      newPointer,
      candidateSiteVersionId,
      artifactId,
      switched: true,
    }),
  });

  return {
    ok: true,
    outcome: "promoted",
    promoted: true,
    noOp: false,
    serviceVersion: AIRSHIP_SIMPLE_PROMOTE_TO_LIVE_SERVICE_VERSION,
    previousPointer,
    newPointer,
    auditRefs: {
      source: "gnr8_runtime_version_audit",
      preSwitchAudit,
      postSwitchAudit,
      siteVersionId: candidateSiteVersionId,
    },
    rollbackData: rollback,
    safetyResult: { ok: true },
    refs,
  };
}
