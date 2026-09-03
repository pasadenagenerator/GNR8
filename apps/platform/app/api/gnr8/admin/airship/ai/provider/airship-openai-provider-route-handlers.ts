import {
  AirshipOpenAIByokProviderService,
  type AirshipOpenAIProviderStatus,
} from "@/gnr8/single-site/airship-openai-byok-provider";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "save_openai" | "test_openai" | "revoke_openai";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  service: Pick<AirshipOpenAIByokProviderService, "status" | "save" | "revoke" | "readServerCredential" | "markTestResult">;
  testOpenAIConnection: (apiKey: string, model: string) => Promise<{ ok: boolean; status: number; diagnostic: string }>;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  apiKey?: unknown;
  model?: unknown;
};

const POST_BODY_KEYS = new Set(["actionMode", "apiKey", "model"]);
const FORBIDDEN_KEYS = new Set(["encryptedSecret", "secret", "token", "authorization", "credential", "password"]);

function text(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_openai_provider_forbidden_field:${key}`);
    if (!allowedKeys.has(key)) errors.push(`airship_openai_provider_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function mutationFlags(draftDataMutation: boolean) {
  return {
    draftDataMutation,
    liveSiteMutation: false,
    runtimeVersionMutation: false,
    activePointerMutation: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
  };
}

function failure(status: number, error: string, diagnostics: string[], providerStatus?: AirshipOpenAIProviderStatus | null): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      ...(providerStatus ? { providerStatus } : {}),
      provider: "openai",
      scope: "airship_editor",
      mutationFlags: mutationFlags(false),
      redactions: ["apiKey", "authorizationHeader", "rawProviderRequest", "rawProviderResponse", "secrets", "tokens", "cookies"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(statusPayload: AirshipOpenAIProviderStatus, status = 200): Response {
  return Response.json(
    {
      ok: true,
      providerStatus: statusPayload,
      mutationFlags: mutationFlags(false),
      redactions: ["apiKey", "authorizationHeader", "rawProviderRequest", "rawProviderResponse", "secrets", "tokens", "cookies"],
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

function diagnosticForOpenAITestStatus(status: number): string {
  if (status === 401) return "airship_openai_provider_key_rejected";
  if (status === 403) return "airship_openai_provider_access_denied";
  if (status === 404) return "airship_openai_provider_model_unavailable";
  if (status === 429) return "airship_openai_provider_quota_or_rate_limited";
  if (status >= 500) return "airship_openai_provider_upstream_unavailable";
  return `airship_openai_provider_test_failed_status_${status}`;
}

async function defaultTestOpenAIConnection(apiKey: string, model: string): Promise<{ ok: boolean; status: number; diagnostic: string }> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: "Return exactly OK.",
      store: false,
      max_output_tokens: 16,
    }),
  });
  return { ok: response.ok, status: response.status, diagnostic: diagnosticForOpenAITestStatus(response.status) };
}

export function createAirshipOpenAIProviderRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    service: deps.service ?? new AirshipOpenAIByokProviderService(),
    testOpenAIConnection: deps.testOpenAIConnection ?? defaultTestOpenAIConnection,
    ...deps,
  };

  return {
    async GET(): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_openai_provider_superadmin_required"]);
      }

      try {
        return success(await resolvedDeps.service.status());
      } catch {
        return failure(500, "AIRSHIP_OPENAI_PROVIDER_STATUS_FAILED", ["airship_openai_provider_status_failed"]);
      }
    },

    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_openai_provider_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_OPENAI_PROVIDER_BODY", ["airship_openai_provider_body_must_be_object"]);

      const bodyErrors = validateUnknownKeys(body, POST_BODY_KEYS);
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_OPENAI_PROVIDER_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      try {
        if (actionMode === "save_openai") {
          const apiKey = text(body.apiKey);
          if (!apiKey) return failure(400, "INVALID_AIRSHIP_OPENAI_PROVIDER_BODY", ["airship_openai_api_key_missing"]);
          const statusPayload = await resolvedDeps.service.save({ apiKey, model: body.model, actorId });
          if (!statusPayload.connected || !statusPayload.maskedKey || statusPayload.provider !== "openai") {
            return failure(500, "AIRSHIP_OPENAI_PROVIDER_READBACK_FAILED", ["airship_openai_provider_readback_failed"], statusPayload);
          }
          return success(statusPayload);
        }
        if (actionMode === "test_openai") {
          const credential = await resolvedDeps.service.readServerCredential();
          if (!credential) return failure(409, "AIRSHIP_OPENAI_PROVIDER_MISSING", ["airship_openai_provider_missing"]);
          const testResult = await resolvedDeps.testOpenAIConnection(credential.apiKey, credential.model);
          await resolvedDeps.service.markTestResult({
            credentialId: credential.credentialId,
            passed: testResult.ok,
            actorId,
            statusCode: testResult.status,
          });
          if (!testResult.ok) {
            const statusPayload = await resolvedDeps.service.status().catch(() => null);
            return failure(502, "AIRSHIP_OPENAI_PROVIDER_TEST_FAILED", ["airship_openai_provider_test_failed", testResult.diagnostic], statusPayload);
          }
          return success(await resolvedDeps.service.status());
        }
        if (actionMode === "revoke_openai") {
          return success(await resolvedDeps.service.revoke(actorId));
        }
        return failure(400, "INVALID_AIRSHIP_OPENAI_PROVIDER_BODY", ["airship_openai_provider_action_mode_invalid"]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "airship_openai_encryption_key_missing") {
          return failure(500, "AIRSHIP_OPENAI_ENCRYPTION_NOT_CONFIGURED", ["airship_openai_encryption_key_missing"]);
        }
        if (message === "airship_openai_api_key_invalid") {
          return failure(400, "INVALID_AIRSHIP_OPENAI_PROVIDER_BODY", ["airship_openai_api_key_invalid"]);
        }
        if (message === "airship_openai_provider_readback_failed") {
          return failure(500, "AIRSHIP_OPENAI_PROVIDER_READBACK_FAILED", ["airship_openai_provider_readback_failed"]);
        }
        return failure(500, "AIRSHIP_OPENAI_PROVIDER_ACTION_FAILED", ["airship_openai_provider_storage_failed"]);
      }
    },
  };
}

export const airshipOpenAIProviderTestDiagnostics = {
  diagnosticForOpenAITestStatus,
};
