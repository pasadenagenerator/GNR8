import {
  prepareAirshipPublishReadiness,
  type PrepareAirshipPublishReadinessOutput,
} from "@/gnr8/single-site/airship-single-site-publish-readiness-service";
import {
  readLatestAirshipSingleSiteDraftCandidatePreview,
  type AirshipDraftCandidatePreviewRef,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import {
  readLatestAirshipInternalPreviewCandidateReview,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import { AirshipSingleSiteDraftService } from "@/gnr8/single-site/airship-single-site-draft-service";
import { getSingleSiteStudioReadonlyProjection } from "@/gnr8/single-site/single-site-studio-readonly-projection";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "prepare_publish_readiness";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft">;
  readLatestAirshipSingleSiteDraftCandidatePreview: typeof readLatestAirshipSingleSiteDraftCandidatePreview;
  readLatestAirshipInternalPreviewCandidateReview: typeof readLatestAirshipInternalPreviewCandidateReview;
  getSingleSiteStudioReadonlyProjection: typeof getSingleSiteStudioReadonlyProjection;
  prepareAirshipPublishReadiness: typeof prepareAirshipPublishReadiness;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  candidateSiteVersionId?: unknown;
  candidateRuntimeArtifactId?: unknown;
  draftId?: unknown;
  draftVersion?: unknown;
  reviewRecordId?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set([
  "actionMode",
  "migrationId",
  "candidateSiteVersionId",
  "candidateRuntimeArtifactId",
  "draftId",
  "draftVersion",
  "reviewRecordId",
  "correlationId",
  "idempotencyKey",
]);
const FORBIDDEN_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
  "apiKey",
  "secret",
  "token",
  "authorization",
  "credential",
  "providerPayload",
  "publish",
  "publishMode",
  "dryRun",
  "shadowPublish",
  "rollback",
  "sourceCapture",
  "activePointer",
]);
const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function int(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function bodyRecord(body: unknown): ActionBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ActionBody;
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateUnknownKeys(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_publish_readiness_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_publish_readiness_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function baseMutationFlags() {
  return {
    readinessRecordMutation: false,
    internalPreviewOnly: true,
    notLive: true,
    notPublished: true,
    candidateRuntimeState: "DRAFT",
    activePointerChanged: false,
    runtimeVersionStateMutated: false,
    liveSiteMutated: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    sourceCapture: false,
    providerCall: false,
  };
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["Airship publish readiness", "Internal preview only", "Not live", "Not published", "Active pointer unchanged", "Next step is governed dry-run"],
      mutationFlags: baseMutationFlags(),
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: PrepareAirshipPublishReadinessOutput): Response {
  return Response.json(
    {
      ok: true,
      readiness: {
        status: output.status,
        id: output.readiness.id,
        migrationId: output.readiness.migrationId,
        reviewRecordId: output.readiness.reviewRecordId,
        readinessStatus: output.readiness.readinessStatus,
        nextStep: output.readiness.nextStep,
        siteClientSourceLabels: output.readiness.siteClientSourceLabels,
        reviewedCandidateSiteVersionId: output.readiness.reviewedCandidateSiteVersionId,
        reviewedArtifactId: output.readiness.reviewedArtifactId,
        draftId: output.readiness.draftId,
        draftVersion: output.readiness.draftVersion,
        reviewStatus: output.readiness.reviewStatus,
        reviewDecision: output.readiness.reviewDecision,
        reviewedAt: output.readiness.reviewedAt,
        currentLiveActivePointerBefore: output.readiness.currentLiveActivePointerBefore,
        currentLiveActivePointerAfter: output.readiness.currentLiveActivePointerAfter,
        sourceEvidenceSummary: output.readiness.sourceEvidenceSummary,
        savedDraftFieldSummary: output.readiness.savedDraftFieldSummary,
        internalPreviewUrl: output.readiness.internalPreviewUrl,
        limitationsWarnings: output.readiness.limitationsWarnings,
        noPublishConfirmation: output.readiness.noPublishConfirmation,
      },
      labels: ["Airship publish readiness prepared", "Internal preview only", "Not live", "Not published", "Active pointer unchanged", "Next step is governed dry-run"],
      idempotency: {
        scope: "airship_publish_readiness_package",
        reused: output.status === "reused",
        activePointerChanged: false,
      },
      mutationFlags: output.mutationFlags,
    },
    { status: output.status === "created" ? 201 : 200, headers: { "cache-control": "no-store" } },
  );
}

function sameOptionalText(label: string, expected: string | number, value: unknown): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  return normalized === String(expected) ? null : `airship_publish_readiness_${label}_mismatch`;
}

function validateRequestedCandidate(body: ActionBody, candidate: AirshipDraftCandidatePreviewRef): string[] {
  return [
    sameOptionalText("candidate_site_version", candidate.siteVersionId, body.candidateSiteVersionId),
    sameOptionalText("candidate_runtime_artifact", candidate.runtimeArtifactId, body.candidateRuntimeArtifactId),
    sameOptionalText("draft_id", candidate.draftId, body.draftId),
    body.draftVersion === undefined ? null : int(body.draftVersion) === candidate.draftVersion ? null : "airship_publish_readiness_draft_version_mismatch",
  ].filter((error): error is string => Boolean(error));
}

export function createAirshipSingleSitePublishReadinessRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    service: deps.service ?? new AirshipSingleSiteDraftService(),
    readLatestAirshipSingleSiteDraftCandidatePreview,
    readLatestAirshipInternalPreviewCandidateReview,
    getSingleSiteStudioReadonlyProjection,
    prepareAirshipPublishReadiness,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_publish_readiness_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_PUBLISH_READINESS_BODY", ["airship_publish_readiness_body_must_be_object"]);

      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_PUBLISH_READINESS_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "prepare_publish_readiness") {
        return failure(400, "INVALID_AIRSHIP_PUBLISH_READINESS_BODY", ["airship_publish_readiness_action_mode_invalid"]);
      }

      const migrationId = text(body.migrationId);
      if (!migrationId) return failure(400, "INVALID_AIRSHIP_PUBLISH_READINESS_BODY", ["airship_publish_readiness_migration_id_required"]);
      if (!UUIDISH.test(migrationId)) return failure(400, "INVALID_AIRSHIP_PUBLISH_READINESS_BODY", ["airship_publish_readiness_migration_id_invalid"]);

      try {
        const draft = await resolvedDeps.service.readCurrentDraft(migrationId);
        if (!draft) return failure(409, "AIRSHIP_SAVED_DRAFT_REQUIRED", ["airship_saved_draft_required"]);
        const candidate = await resolvedDeps.readLatestAirshipSingleSiteDraftCandidatePreview({
          migrationId,
          draftId: draft.id,
        });
        if (!candidate) return failure(409, "AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REQUIRED", ["airship_internal_preview_candidate_required"]);
        const candidateErrors = validateRequestedCandidate(body, candidate);
        if (candidateErrors.length > 0) return failure(409, "AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_STALE", candidateErrors);
        if (candidate.draftId !== draft.id || candidate.draftVersion !== draft.version) {
          return failure(409, "AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_STALE", ["airship_publish_readiness_candidate_not_latest_saved_draft"]);
        }

        const review = await resolvedDeps.readLatestAirshipInternalPreviewCandidateReview({
          migrationId,
          draftId: candidate.draftId,
          draftVersion: candidate.draftVersion,
          candidateSiteVersionId: candidate.siteVersionId,
          candidateRuntimeArtifactId: candidate.runtimeArtifactId,
        });
        if (!review) return failure(409, "AIRSHIP_APPROVED_REVIEW_REQUIRED", ["airship_publish_readiness_approved_review_required"]);
        const requestedReview = sameOptionalText("review_record", review.id, body.reviewRecordId);
        if (requestedReview) return failure(409, "AIRSHIP_APPROVED_REVIEW_STALE", [requestedReview]);

        const studioModel = await resolvedDeps.getSingleSiteStudioReadonlyProjection({ migrationId });
        const output = await resolvedDeps.prepareAirshipPublishReadiness({
          migrationId,
          draft,
          candidate,
          review,
          actorId,
          importedSiteLabel: studioModel.summary.site,
          liveUrl: studioModel.summary.liveSiteUrl,
          sourceEvidenceSummary: {
            status: studioModel.sourceEvidence.some((item) => /present|accepted|captured|available/i.test(item.status)) ? "source_supported" : "partial_evidence",
            detail: `${studioModel.sourceEvidence.length} source evidence item(s) available for ${studioModel.summary.site ?? draft.sourceUrl}.`,
            evidenceItems: studioModel.sourceEvidence.map((item) => ({
              label: item.label,
              status: item.status,
              detail: item.detail,
            })),
          },
          correlationId: text(body.correlationId) || null,
          idempotencyKey: text(body.idempotencyKey) || null,
        });
        return success(output);
      } catch {
        return failure(500, "AIRSHIP_PUBLISH_READINESS_ACTION_FAILED", ["airship_publish_readiness_action_failed"]);
      }
    },
  };
}
