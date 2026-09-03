import {
  AirshipAICommandService,
  type AirshipHeroAICommandResult,
} from "@/gnr8/single-site/airship-ai-command-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  service: Pick<AirshipAICommandService, "run">;
};

type ActionBody = Record<string, unknown> & {
  migrationId?: unknown;
  command?: unknown;
  fields?: unknown;
};

const POST_BODY_KEYS = new Set(["migrationId", "command", "fields"]);
const FORBIDDEN_KEYS = new Set(["apiKey", "secret", "token", "authorization", "credential", "password", "providerPayload"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function validateUnknownKeys(record: Record<string, unknown>, allowedKeys: Set<string>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_ai_command_forbidden_field:${key}`);
    if (!allowedKeys.has(key)) errors.push(`airship_ai_command_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: ["Airship draft only", "Not applied to live site", "Not published"],
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
      redactions: ["apiKey", "authorizationHeader", "rawProviderRequest", "rawProviderResponse", "prompt", "completion", "secrets", "tokens", "cookies"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(result: AirshipHeroAICommandResult): Response {
  return Response.json(
    {
      ok: true,
      result,
      labels: ["Airship draft only", "Not applied to live site", "Not published"],
    },
    { status: 200, headers: { "cache-control": "no-store" } },
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

export function createAirshipAICommandRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    service: deps.service ?? new AirshipAICommandService(),
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_ai_command_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_AI_COMMAND_BODY", ["airship_ai_command_body_must_be_object"]);
      const bodyErrors = validateUnknownKeys(body, POST_BODY_KEYS);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_AI_COMMAND_BODY", bodyErrors);
      if (!text(body.migrationId)) return failure(400, "INVALID_AIRSHIP_AI_COMMAND_BODY", ["airship_ai_command_migration_id_missing"]);

      try {
        return success(await resolvedDeps.service.run({ command: body.command, fields: body.fields, actorId }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "airship_openai_provider_missing") {
          return failure(409, "AIRSHIP_OPENAI_PROVIDER_MISSING", ["airship_openai_provider_missing"]);
        }
        if (message === "airship_ai_command_invalid_input") {
          return failure(400, "INVALID_AIRSHIP_AI_COMMAND_BODY", ["airship_ai_command_invalid_input"]);
        }
        return failure(502, "AIRSHIP_AI_COMMAND_FAILED", ["airship_ai_command_failed"]);
      }
    },
  };
}
