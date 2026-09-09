import {
  createAirshipSingleSiteDraftCandidate,
  type AirshipDraftCandidateCreationOutput,
} from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import { AirshipSingleSiteDraftService } from "@/gnr8/single-site/airship-single-site-draft-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "create_internal_preview_candidate";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft">;
  createAirshipSingleSiteDraftCandidate: typeof createAirshipSingleSiteDraftCandidate;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set(["actionMode", "migrationId", "correlationId", "idempotencyKey"]);
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

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_draft_candidate_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_draft_candidate_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["Airship internal preview candidate", "Saved draft required", "Not live", "Not published"],
      mutationFlags: {
        draftDataMutation: false,
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
      },
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: AirshipDraftCandidateCreationOutput): Response {
  return Response.json(
    {
      ok: true,
      candidate: {
        status: output.status,
        migrationId: output.migrationId,
        draftId: output.draftId,
        draftVersion: output.draftVersion,
        siteVersionId: output.candidateSiteVersionId,
        runtimeArtifactId: output.candidateRuntimeArtifactId,
        route: output.previewRoute,
        statusLabel: "Not live, internal preview only",
        sourceLiveSiteVersionId: output.sourceLiveSiteVersionId,
        sourceLiveRuntimeArtifactId: output.sourceLiveRuntimeArtifactId,
        styleSettings: output.styleSettings,
        appliedEdits: output.appliedEdits,
        skippedEdits: output.skippedEdits,
      },
      labels: ["Airship internal preview candidate", "Not live", "Not published"],
      idempotency: {
        scope: "airship_saved_draft_semantic_candidate",
        reused: output.status === "reused",
        activePointerChanged: false,
      },
      mutationFlags: {
        draftDataMutation: false,
        runtimeVersionMutation: output.status === "created",
        previewArtifactMutation: output.status === "created",
        liveSiteMutation: false,
        activePointerMutation: false,
        publishes: false,
        dryRun: false,
        shadowPublish: false,
        rollback: false,
        sourceCapture: false,
        providerCall: false,
      },
    },
    { status: output.status === "created" ? 201 : 200, headers: { "cache-control": "no-store" } },
  );
}

export function createAirshipSingleSiteDraftCandidateRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    service: deps.service ?? new AirshipSingleSiteDraftService(),
    createAirshipSingleSiteDraftCandidate,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_draft_candidate_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_DRAFT_CANDIDATE_BODY", ["airship_draft_candidate_body_must_be_object"]);

      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_DRAFT_CANDIDATE_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "create_internal_preview_candidate") {
        return failure(400, "INVALID_AIRSHIP_DRAFT_CANDIDATE_BODY", ["airship_draft_candidate_action_mode_invalid"]);
      }

      const migrationId = text(body.migrationId);
      if (!migrationId) {
        return failure(400, "INVALID_AIRSHIP_DRAFT_CANDIDATE_BODY", ["airship_draft_candidate_migration_id_required"]);
      }
      try {
        const draft = await resolvedDeps.service.readCurrentDraft(migrationId);
        if (!draft) return failure(409, "AIRSHIP_SAVED_DRAFT_REQUIRED", ["airship_saved_draft_required"]);
        const output = await resolvedDeps.createAirshipSingleSiteDraftCandidate({
          draft,
          actor: actorId,
        });
        return success(output);
      } catch {
        return failure(500, "AIRSHIP_DRAFT_CANDIDATE_ACTION_FAILED", ["airship_draft_candidate_action_failed"]);
      }
    },
  };
}
