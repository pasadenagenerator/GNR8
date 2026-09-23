import {
  createAirshipOnlineBuilderControlPlaneService,
  type AirshipOnlineBuilderControlPlaneContext,
  type AirshipOnlineBuilderControlPlaneServiceDeps,
} from "@/gnr8/airship/online-builder/airship-online-builder-control-plane-service";
import type {
  AirshipOnlineBuilderDraftRef,
  AirshipOnlineBuilderSiteKey,
  AirshipOnlineBuilderSourceBundle,
} from "@/gnr8/airship/online-builder/airship-online-builder-worker-contract";

type OnlineBuilderActionMode =
  | "create_session"
  | "status"
  | "open_editor_url"
  | "capture_diff"
  | "stop_session"
  | "create_online_airship_session"
  | "get_online_airship_session_status"
  | "open_online_airship_editor"
  | "capture_online_airship_changes"
  | "stop_online_airship_session";

type RouteDeps = AirshipOnlineBuilderControlPlaneServiceDeps & {
  requireSuperadminContext?: (request: Request) => Promise<AirshipOnlineBuilderControlPlaneContext>;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  siteKey?: unknown;
  sessionId?: unknown;
  sourceBundle?: unknown;
  expectedDraft?: unknown;
  ttlSeconds?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const BODY_KEYS = new Set([
  "actionMode",
  "migrationId",
  "siteKey",
  "sessionId",
  "sourceBundle",
  "expectedDraft",
  "ttlSeconds",
  "correlationId",
  "idempotencyKey",
]);
const FORBIDDEN_ACTOR_KEYS = new Set(["actor", "actorId", "actorRole", "actorType", "role", "userId", "principal", "superadminUserId"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function validateUnknownKeys(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_ACTOR_KEYS.has(key)) errors.push(`airship_online_builder_actor_override_forbidden:${key}`);
    if (!BODY_KEYS.has(key)) errors.push(`airship_online_builder_forbidden_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function sourceBundle(value: unknown): AirshipOnlineBuilderSourceBundle | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipOnlineBuilderSourceBundle>;
  if (record.kind !== "single-html-artifact" && record.kind !== "source-backed-workspace-archive") return null;
  if (!Array.isArray(record.files) || typeof record.rootSha256 !== "string") return null;
  return record as AirshipOnlineBuilderSourceBundle;
}

function draftRef(value: unknown): AirshipOnlineBuilderDraftRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AirshipOnlineBuilderDraftRef>;
  if (record.id !== null && typeof record.id !== "string") return null;
  const version = record.version;
  if (typeof version !== "number" || !Number.isInteger(version)) return null;
  return { id: record.id ?? null, version };
}

function response(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return response(status, {
    ok: false,
    error,
    diagnostics,
    mutationFlags: {
      publishes: false,
      liveSiteMutation: false,
      activePointerMutation: false,
      demoMutation: false,
      dnsMutation: false,
      providerMutation: false,
      sourceCaptureImport: false,
      previewHostBindingMutation: false,
    },
  });
}

function normalizedActionMode(actionMode: OnlineBuilderActionMode): "create_session" | "status" | "open_editor_url" | "capture_diff" | "stop_session" | "" {
  if (actionMode === "create_online_airship_session") return "create_session";
  if (actionMode === "get_online_airship_session_status") return "status";
  if (actionMode === "open_online_airship_editor") return "open_editor_url";
  if (actionMode === "capture_online_airship_changes") return "capture_diff";
  if (actionMode === "stop_online_airship_session") return "stop_session";
  return actionMode;
}

function defaultBlockedContext(): Promise<AirshipOnlineBuilderControlPlaneContext> {
  return Promise.resolve({
    actorUserId: "unconfigured-route",
    actorRole: "viewer",
    ownerOrganizationId: "unknown",
    isSuperadmin: false,
    allowedOrigins: [],
    requestOrigin: "",
    csrfValidated: false,
  });
}

export function createAirshipOnlineBuilderRouteHandlers(deps: RouteDeps = {}) {
  const service = createAirshipOnlineBuilderControlPlaneService(deps);
  const requireSuperadminContext = deps.requireSuperadminContext ?? defaultBlockedContext;

  return {
    async POST(request: Request): Promise<Response> {
      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_ONLINE_BUILDER_BODY", ["airship_online_builder_body_must_be_object"]);
      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_ONLINE_BUILDER_BODY", bodyErrors);

      const context = await requireSuperadminContext(request);
      const actionMode = normalizedActionMode(text(body.actionMode) as OnlineBuilderActionMode);
      const correlationId = text(body.correlationId) || "airship-online-builder-route";
      const idempotencyKey = text(body.idempotencyKey) || correlationId;

      if (actionMode === "create_session") {
        const migrationId = text(body.migrationId);
        const parsedSourceBundle = sourceBundle(body.sourceBundle);
        const expectedDraft = draftRef(body.expectedDraft);
        if (!migrationId || !parsedSourceBundle || !expectedDraft) {
          return failure(400, "INVALID_AIRSHIP_ONLINE_BUILDER_BODY", ["airship_online_builder_create_session_fields_required"]);
        }
        const result = await service.createSession({
          context,
          migrationId,
          siteKey: text(body.siteKey) as AirshipOnlineBuilderSiteKey || undefined,
          sourceBundle: parsedSourceBundle,
          expectedDraft,
          ttlSeconds: typeof body.ttlSeconds === "number" ? body.ttlSeconds : undefined,
          correlationId,
          idempotencyKey,
        });
        return response(result.status, result.ok ? { ok: true, readback: result.value, auditEvent: result.auditEvent } : result);
      }

      if (actionMode === "status" || actionMode === "open_editor_url" || actionMode === "capture_diff" || actionMode === "stop_session") {
        const sessionId = text(body.sessionId);
        if (!sessionId) return failure(400, "INVALID_AIRSHIP_ONLINE_BUILDER_BODY", ["airship_online_builder_session_id_required"]);
        const input = { context, sessionId, correlationId, idempotencyKey };
        const result = actionMode === "status"
          ? await service.getSessionStatus(input)
          : actionMode === "open_editor_url"
            ? await service.openEditorUrl(input)
            : actionMode === "capture_diff"
              ? await service.captureDiff(input)
              : await service.stopSession(input);
        return response(result.status, result.ok ? { ok: true, readback: result.value, auditEvent: result.auditEvent } : result);
      }

      return failure(400, "INVALID_AIRSHIP_ONLINE_BUILDER_BODY", ["airship_online_builder_action_mode_invalid"]);
    },
  };
}
