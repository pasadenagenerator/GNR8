import {
  AirshipSingleSiteDraftService,
  type AirshipSingleSiteDraftActor,
  type AirshipSingleSiteDraftRecord,
} from "@/gnr8/single-site/airship-single-site-draft-service";
import {
  AIRSHIP_CHS_MIGRATION_ID,
  buildAirshipSingleSiteDraftSeed,
  getAirshipSingleSiteEditorReadonlyProjection,
} from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "create_or_reuse" | "update_edit" | "mark_accepted" | "mark_rejected";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  getAirshipSingleSiteEditorReadonlyProjection: typeof getAirshipSingleSiteEditorReadonlyProjection;
  service: Pick<AirshipSingleSiteDraftService, "readCurrentDraft" | "createOrReuseDraft" | "updateDraftEditText" | "markDraftEditAccepted" | "markDraftEditRejected">;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  draftEditId?: unknown;
  proposedTextContent?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const GET_QUERY_KEYS = new Set(["migrationId"]);
const POST_BODY_KEYS = new Set(["actionMode", "migrationId", "draftEditId", "proposedTextContent", "correlationId", "idempotencyKey"]);
const FORBIDDEN_ACTOR_KEYS = new Set(["actor", "actorId", "actorRole", "actorType", "role", "userId", "principal", "superadminUserId"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function actor(actorId: string): AirshipSingleSiteDraftActor {
  return {
    actorId,
    actorType: "human",
    actorRole: "platform_superadmin",
  };
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["Saved Airship draft", "Not applied to live site", "Not published"],
      mutationFlags: {
        draftDataMutation: false,
        liveSiteMutation: false,
        runtimeVersionMutation: false,
        activePointerMutation: false,
        publishes: false,
        dryRun: false,
        shadowPublish: false,
        rollback: false,
      },
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(draft: AirshipSingleSiteDraftRecord | null, status = 200): Response {
  return Response.json(
    {
      ok: true,
      draft,
      labels: ["Saved Airship draft", "Not applied to live site", "Not published"],
      mutationFlags: {
        draftDataMutation: true,
        liveSiteMutation: false,
        runtimeVersionMutation: false,
        activePointerMutation: false,
        publishes: false,
        dryRun: false,
        shadowPublish: false,
        rollback: false,
      },
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bodyRecord(body: unknown): ActionBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ActionBody;
}

function validateUnknownKeys(record: Record<string, unknown>, allowedKeys: Set<string>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_ACTOR_KEYS.has(key)) errors.push(`airship_single_site_draft_actor_override_forbidden:${key}`);
    if (!allowedKeys.has(key)) errors.push(`airship_single_site_draft_forbidden_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function draftEditRequired(actionMode: ActionMode): boolean {
  return actionMode === "update_edit" || actionMode === "mark_accepted" || actionMode === "mark_rejected";
}

async function seedForMigration(
  deps: RouteDeps,
  migrationId: string,
) {
  const model = await deps.getAirshipSingleSiteEditorReadonlyProjection({ migrationId });
  const seed = buildAirshipSingleSiteDraftSeed({ model });
  if (seed.draftEdits.length === 0) throw new Error("airship_single_site_draft_no_editable_drafts");
  return seed;
}

export function createAirshipSingleSiteDraftsRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    getAirshipSingleSiteEditorReadonlyProjection,
    service: deps.service ?? new AirshipSingleSiteDraftService(),
    ...deps,
  };

  return {
    async GET(request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_single_site_draft_superadmin_required"]);
      }

      const url = new URL(request.url);
      const queryRecord = Object.fromEntries(url.searchParams.entries());
      const queryErrors = validateUnknownKeys(queryRecord, GET_QUERY_KEYS);
      if (queryErrors.length > 0) {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_QUERY", queryErrors);
      }

      const migrationId = text(queryRecord.migrationId) || AIRSHIP_CHS_MIGRATION_ID;
      try {
        const draft = await resolvedDeps.service.readCurrentDraft(migrationId);
        return success(draft);
      } catch {
        return failure(500, "AIRSHIP_SINGLE_SITE_DRAFT_READ_FAILED", ["airship_single_site_draft_read_failed"]);
      }
    },

    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_single_site_draft_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_BODY", ["airship_single_site_draft_request_body_must_be_object"]);
      }
      const bodyErrors = validateUnknownKeys(body, POST_BODY_KEYS);
      if (bodyErrors.length > 0) {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_BODY", bodyErrors);
      }

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "create_or_reuse" && actionMode !== "update_edit" && actionMode !== "mark_accepted" && actionMode !== "mark_rejected") {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_BODY", ["airship_single_site_draft_action_mode_invalid"]);
      }
      const migrationId = text(body.migrationId) || AIRSHIP_CHS_MIGRATION_ID;
      const draftEditId = text(body.draftEditId);
      if (draftEditRequired(actionMode) && !draftEditId) {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_BODY", ["airship_single_site_draft_edit_id_missing"]);
      }
      if (actionMode === "update_edit" && !text(body.proposedTextContent)) {
        return failure(400, "INVALID_AIRSHIP_SINGLE_SITE_DRAFT_BODY", ["airship_single_site_draft_proposed_text_missing"]);
      }

      try {
        const seed = await seedForMigration(resolvedDeps, migrationId);
        const common = {
          ...seed,
          actor: actor(actorId),
          correlationId: text(body.correlationId) || null,
          idempotencyKey: text(body.idempotencyKey) || null,
        };
        const draft =
          actionMode === "create_or_reuse"
            ? await resolvedDeps.service.createOrReuseDraft(common)
            : actionMode === "update_edit"
              ? await resolvedDeps.service.updateDraftEditText({
                  ...common,
                  draftEditId,
                  proposedTextContent: text(body.proposedTextContent),
                })
              : actionMode === "mark_accepted"
                ? await resolvedDeps.service.markDraftEditAccepted({ ...common, draftEditId })
                : await resolvedDeps.service.markDraftEditRejected({ ...common, draftEditId });
        return success(draft);
      } catch {
        return failure(500, "AIRSHIP_SINGLE_SITE_DRAFT_ACTION_FAILED", ["airship_single_site_draft_action_failed"]);
      }
    },
  };
}
