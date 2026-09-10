import {
  approveAirshipInternalPreviewCandidateForPublishReadiness,
  type ApproveAirshipInternalPreviewCandidateOutput,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import {
  readLatestAirshipSingleSiteDraftCandidatePreview,
  type AirshipDraftCandidatePreviewRef,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import { AirshipSingleSiteDraftService } from "@/gnr8/single-site/airship-single-site-draft-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "approve_internal_preview_for_publish_readiness";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft">;
  readLatestAirshipSingleSiteDraftCandidatePreview: typeof readLatestAirshipSingleSiteDraftCandidatePreview;
  approveAirshipInternalPreviewCandidateForPublishReadiness: typeof approveAirshipInternalPreviewCandidateForPublishReadiness;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  candidateSiteVersionId?: unknown;
  candidateRuntimeArtifactId?: unknown;
  draftId?: unknown;
  draftVersion?: unknown;
  limitationsNotes?: unknown;
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
  "limitationsNotes",
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
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_preview_review_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_preview_review_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function baseMutationFlags() {
  return {
    reviewRecordMutation: false,
    runtimeVersionMutation: false,
    previewArtifactMutation: false,
    liveSiteMutation: false,
    activePointerMutation: false,
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
      labels: ["Airship internal preview review", "Internal preview only", "Not live", "Not published", "Active pointer unchanged"],
      mutationFlags: baseMutationFlags(),
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: ApproveAirshipInternalPreviewCandidateOutput): Response {
  return Response.json(
    {
      ok: true,
      review: {
        status: output.status,
        id: output.review.id,
        migrationId: output.review.migrationId,
        draftId: output.review.draftId,
        draftVersion: output.review.draftVersion,
        candidateSiteVersionId: output.review.candidateSiteVersionId,
        candidateRuntimeArtifactId: output.review.candidateRuntimeArtifactId,
        reviewDecision: output.review.reviewDecision,
        reviewStatus: output.review.reviewStatus,
        publishReadinessReady: output.review.publishReadinessReady,
        reviewerActorId: output.review.reviewerActorId,
        reviewerActorRole: output.review.reviewerActorRole,
        reviewedAt: output.review.reviewedAt,
        limitationsNotes: output.review.limitationsNotes,
        nextStep: output.review.nextStep,
        activePointerSiteVersionId: output.review.activePointerSiteVersionId,
        activePointerArtifactId: output.review.activePointerArtifactId,
        activePointerChanged: false,
        runtimeVersionStateMutated: false,
        liveSiteMutated: false,
        published: false,
      },
      labels: ["Airship internal preview review", "Approved for publish-readiness evaluation", "Internal preview only", "Not live", "Not published", "Active pointer unchanged"],
      idempotency: {
        scope: "airship_internal_preview_candidate_review",
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
  return normalized === String(expected) ? null : `airship_preview_review_${label}_mismatch`;
}

function validateRequestedCandidate(body: ActionBody, candidate: AirshipDraftCandidatePreviewRef): string[] {
  return [
    sameOptionalText("candidate_site_version", candidate.siteVersionId, body.candidateSiteVersionId),
    sameOptionalText("candidate_runtime_artifact", candidate.runtimeArtifactId, body.candidateRuntimeArtifactId),
    sameOptionalText("draft_id", candidate.draftId, body.draftId),
    body.draftVersion === undefined ? null : int(body.draftVersion) === candidate.draftVersion ? null : "airship_preview_review_draft_version_mismatch",
  ].filter((error): error is string => Boolean(error));
}

export function createAirshipSingleSiteDraftCandidateReviewRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    service: deps.service ?? new AirshipSingleSiteDraftService(),
    readLatestAirshipSingleSiteDraftCandidatePreview,
    approveAirshipInternalPreviewCandidateForPublishReadiness,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_preview_review_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_PREVIEW_REVIEW_BODY", ["airship_preview_review_body_must_be_object"]);

      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_PREVIEW_REVIEW_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "approve_internal_preview_for_publish_readiness") {
        return failure(400, "INVALID_AIRSHIP_PREVIEW_REVIEW_BODY", ["airship_preview_review_action_mode_invalid"]);
      }

      const migrationId = text(body.migrationId);
      if (!migrationId) {
        return failure(400, "INVALID_AIRSHIP_PREVIEW_REVIEW_BODY", ["airship_preview_review_migration_id_required"]);
      }
      if (!UUIDISH.test(migrationId)) {
        return failure(400, "INVALID_AIRSHIP_PREVIEW_REVIEW_BODY", ["airship_preview_review_migration_id_invalid"]);
      }

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
          return failure(409, "AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_STALE", ["airship_preview_review_candidate_not_latest_saved_draft"]);
        }

        const output = await resolvedDeps.approveAirshipInternalPreviewCandidateForPublishReadiness({
          migrationId,
          draft,
          candidate,
          reviewerActorId: actorId,
          limitationsNotes: text(body.limitationsNotes) || null,
          correlationId: text(body.correlationId) || null,
          idempotencyKey: text(body.idempotencyKey) || null,
        });
        return success(output);
      } catch {
        return failure(500, "AIRSHIP_PREVIEW_REVIEW_ACTION_FAILED", ["airship_preview_review_action_failed"]);
      }
    },
  };
}
