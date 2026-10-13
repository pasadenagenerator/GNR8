import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import {
  MVP28_PACKAGE_MAX_BYTES,
  type Mvp28ChsPackage,
} from "@/gnr8/output-adapters/mvp28-chs-package-contract";
import type { Mvp28ChsPackageIngestionResult } from "@/gnr8/output-adapters/mvp28-chs-package-ingestion-service";

type IngestOperation = (input: {
  actorUserId: string;
  packageValue: Mvp28ChsPackage | unknown;
}) => Promise<Mvp28ChsPackageIngestionResult>;

export type Mvp28ChsPackageRouteDependencies = {
  requireSuperadminUserId(): Promise<string>;
  isFeatureEnabled(): boolean;
  isPreviewEnvironment(): boolean;
  loadIngestOperation(): Promise<IngestOperation>;
};

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultLoadIngestOperation(): Promise<IngestOperation> {
  const mod = await import("@/gnr8/output-adapters/mvp28-chs-package-ingestion-service");
  return mod.ingestMvp28ChsPackage;
}

export function createMvp28ChsPackageRouteHandlers(
  dependencies: Partial<Mvp28ChsPackageRouteDependencies> = {},
) {
  const resolved: Mvp28ChsPackageRouteDependencies = {
    requireSuperadminUserId: dependencies.requireSuperadminUserId ?? defaultRequireSuperadminUserId,
    isFeatureEnabled: dependencies.isFeatureEnabled ?? isAstroProductionCandidatePreviewFeatureEnabled,
    isPreviewEnvironment: dependencies.isPreviewEnvironment ?? (() => process.env.VERCEL_ENV === "preview"),
    loadIngestOperation: dependencies.loadIngestOperation ?? defaultLoadIngestOperation,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorUserId: string;
      try {
        actorUserId = await resolved.requireSuperadminUserId();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return failure(message.startsWith("Unauthorized") ? 401 : 403, "SUPERADMIN_REQUIRED", "superadmin_required");
      }
      if (!boundedText(actorUserId, 512)) return failure(500, "PREPARATION_UNAVAILABLE", "actor_identity_invalid");
      if (!hasValidOrigin(request)) return failure(403, "INVALID_REQUEST_ORIGIN", "invalid_request_origin");
      if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        return failure(415, "APPLICATION_JSON_REQUIRED", "application_json_required");
      }
      let enabled = false;
      try {
        enabled = resolved.isPreviewEnvironment() && resolved.isFeatureEnabled();
      } catch {
        return failure(503, "PREPARATION_UNAVAILABLE", "preview_gate_unavailable");
      }
      if (!enabled) return failure(503, "PREPARATION_DISABLED", "preview_gate_disabled");

      const declaredLength = Number(request.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > MVP28_PACKAGE_MAX_BYTES) {
        return failure(413, "PACKAGE_TOO_LARGE", "mvp28_package_too_large");
      }
      const bodyText = await readBoundedUtf8Body(request, MVP28_PACKAGE_MAX_BYTES);
      if (bodyText === null) return failure(413, "PACKAGE_TOO_LARGE", "mvp28_package_too_large");
      let packageValue: unknown;
      try {
        packageValue = JSON.parse(bodyText);
      } catch {
        return failure(422, "PACKAGE_INVALID", "mvp28_package_invalid_json");
      }

      try {
        const ingest = await resolved.loadIngestOperation();
        const result = await ingest({ actorUserId, packageValue });
        return Response.json({ ok: true, ...result }, {
          status: result.status === "ready_for_review" ? 201 : 200,
          headers: { "cache-control": "no-store" },
        });
      } catch (error) {
        return ingestionFailure(error);
      }
    },
  };
}

async function readBoundedUtf8Body(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch {
    return null;
  }
}

function ingestionFailure(error: unknown): Response {
  const code = error instanceof Error ? error.message : "mvp28_preparation_failed";
  if (code === "mvp28_package_too_large") return failure(413, "PACKAGE_TOO_LARGE", code);
  if (code.startsWith("mvp28_package_") || code.startsWith("mvp28_capture_") ||
      code.startsWith("mvp28_candidate_") || code.startsWith("mvp28_build_")) {
    return failure(422, "PACKAGE_INVALID", code);
  }
  if (code.includes("conflict") || code === "mvp28_active_pointer_concurrent_change" || code === "mvp28_wrong_staging_target") {
    return failure(409, "PREPARATION_CONFLICT", code);
  }
  if (code === "mvp28_staging_configuration_missing" || code === "mvp28_database_identity_mismatch") {
    return failure(503, "PREPARATION_UNAVAILABLE", code);
  }
  return failure(500, "PREPARATION_FAILED", "mvp28_preparation_failed");
}

function requestOrigin(request: Request): string | null {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || new URL(request.url).protocol.replace(":", "");
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === requestOrigin(request);
  } catch {
    return false;
  }
}

function failure(status: number, error: string, blockerCode: string): Response {
  return Response.json({
    ok: false,
    error,
    blockerCodes: [blockerCode],
    persisted: false,
    reviewed: false,
    published: false,
    activePointerChanged: false,
  }, { status, headers: { "cache-control": "no-store" } });
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max &&
    value === value.trim() && !value.includes("\0");
}
