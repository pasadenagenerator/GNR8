import type { getAirshipSingleSiteEditorReadonlyProjection as GetAirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import {
  createAirshipPreviewHostBinding,
  type AirshipPreviewHostBindingOutput,
} from "@/gnr8/single-site/airship-preview-host-binding-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "create_gnr8_demo_preview_host";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  getAirshipSingleSiteEditorReadonlyProjection: typeof GetAirshipSingleSiteEditorReadonlyProjection;
  createAirshipPreviewHostBinding: typeof createAirshipPreviewHostBinding;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  candidateSiteVersionId?: unknown;
  candidateArtifactId?: unknown;
  hostname?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set(["actionMode", "migrationId", "candidateSiteVersionId", "candidateArtifactId", "hostname", "idempotencyKey"]);
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
  "activePointer",
  "publish",
  "promote",
  "customerDomain",
  "dnsRecord",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function validateUnknownKeys(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_preview_host_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_preview_host_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["GNR8 demo preview, not live", "Preview host binding", "No active pointer", "No customer DNS mutation"],
      mutationFlags: {
        previewHostBindingMutation: false,
        activePointerMutation: false,
        publishes: false,
        promoteToLive: false,
        customerDomainMutation: false,
        providerCall: false,
      },
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: AirshipPreviewHostBindingOutput): Response {
  return Response.json(
    {
      ok: true,
      previewHost: {
        status: output.status,
        bindingId: output.binding.id,
        host: output.binding.host,
        candidateSiteVersionId: output.binding.candidateSiteVersionId,
        candidateArtifactId: output.binding.candidateArtifactId,
        bindingStatus: output.binding.status,
        bindingKind: output.binding.bindingKind,
        previewUrl: output.previewUrl,
        activationNotice: output.activationNotice,
        label: "GNR8 demo preview, not live",
      },
      labels: ["GNR8 demo preview, not live", "No active pointer", "No promote-to-live", "No customer DNS mutation"],
      idempotency: {
        scope: "airship_preview_host_by_hostname_candidate_artifact",
        reused: output.status === "reused",
        activePointerChanged: false,
      },
      mutationFlags: {
        ...output.mutationFlags,
        promoteToLive: false,
      },
    },
    { status: output.status === "created" ? 201 : 200, headers: { "cache-control": "no-store" } },
  );
}

export function createAirshipPreviewHostBindingRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    getAirshipSingleSiteEditorReadonlyProjection: async (input) => {
      const mod = await import("@/gnr8/single-site/airship-single-site-editor-readonly-projection");
      return mod.getAirshipSingleSiteEditorReadonlyProjection(input);
    },
    createAirshipPreviewHostBinding,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_preview_host_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_PREVIEW_HOST_BODY", ["airship_preview_host_body_must_be_object"]);
      const bodyErrors = validateUnknownKeys(body);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_PREVIEW_HOST_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "create_gnr8_demo_preview_host") {
        return failure(400, "INVALID_AIRSHIP_PREVIEW_HOST_BODY", ["airship_preview_host_action_mode_invalid"]);
      }
      const migrationId = text(body.migrationId);
      if (!migrationId) return failure(400, "INVALID_AIRSHIP_PREVIEW_HOST_BODY", ["airship_preview_host_migration_id_required"]);

      const model = await resolvedDeps.getAirshipSingleSiteEditorReadonlyProjection({ migrationId });
      const candidate = model.importedSiteModel.latestInternalPreviewCandidate;
      if (!candidate) return failure(409, "AIRSHIP_PREVIEW_HOST_CANDIDATE_REQUIRED", ["airship_preview_host_candidate_required"]);
      if (text(body.candidateSiteVersionId) !== candidate.siteVersionId || text(body.candidateArtifactId) !== candidate.runtimeArtifactId) {
        return failure(409, "AIRSHIP_PREVIEW_HOST_CANDIDATE_MISMATCH", ["airship_preview_host_candidate_mismatch"]);
      }

      try {
        return success(await resolvedDeps.createAirshipPreviewHostBinding({
          candidateSiteVersionId: candidate.siteVersionId,
          candidateArtifactId: candidate.runtimeArtifactId,
          siteLabel: model.importedSiteModel.siteLabel,
          sourceUrl: model.importedSiteModel.sourceUrl,
          liveUrl: model.importedSiteModel.liveUrl,
          hostname: text(body.hostname) || null,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "airship_preview_host_customer_domain_rejected") {
          return failure(400, "AIRSHIP_PREVIEW_HOST_REJECTED", ["airship_preview_host_customer_domain_rejected"]);
        }
        if (message === "airship_preview_host_existing_binding_mismatch") {
          return failure(409, "AIRSHIP_PREVIEW_HOST_CONFLICT", ["airship_preview_host_existing_binding_mismatch"]);
        }
        if (message === "airship_preview_host_candidate_artifact_mismatch") {
          return failure(409, "AIRSHIP_PREVIEW_HOST_CANDIDATE_MISMATCH", ["airship_preview_host_candidate_artifact_mismatch"]);
        }
        return failure(500, "AIRSHIP_PREVIEW_HOST_ACTION_FAILED", ["airship_preview_host_action_failed"]);
      }
    },
  };
}
