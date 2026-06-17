import crypto from "node:crypto";

import {
  executeRenderedCaptureWorkerRequest,
  parseRenderedCaptureWorkerRequestDetailed,
} from "../import-rendered-capture-worker/worker-service";
import type {
  RenderedCaptureWorkerRequest,
  RenderedCaptureWorkerResponse,
} from "../import-rendered-capture-worker/worker-contract";

export const RENDERED_CAPTURE_WORKER_FETCH_PATH = "/internal/gnr8/rendered-capture-worker" as const;
export const LEGACY_RENDERED_CAPTURE_WORKER_FETCH_PATH = "/api/internal/gnr8/rendered-capture-worker" as const;

type ExecuteRequest = (input: { request: RenderedCaptureWorkerRequest }) => Promise<RenderedCaptureWorkerResponse>;
type WorkerServerLogger = (event: { event: string; [key: string]: unknown }) => void;

type PostNavigationPhaseStatus = "completed" | "timed_out" | "failed";

type PostNavigationPhaseEvent = {
  phase:
    | "stabilization"
    | "dom_serialization"
    | "screenshot_viewport"
    | "style_sampling"
    | "screenshot_fullpage"
    | "asset_manifest_finalization"
    | "response_assembly";
  status: PostNavigationPhaseStatus;
  durationMs: number | null;
  timeoutBudgetMs: number | null;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function pathMatches(inputPath: string, expectedPath: string): boolean {
  const normalizePath = (value: string): string => {
    if (!value) return "/";
    const withoutTrailing = value.replace(/\/+$/, "");
    return withoutTrailing.length > 0 ? withoutTrailing : "/";
  };
  return normalizePath(inputPath) === normalizePath(expectedPath);
}

function phaseNameFromDiagnosticCode(code: string): PostNavigationPhaseEvent["phase"] | null {
  const normalized = normalizeText(code);
  if (normalized.includes("STABILIZATION")) return "stabilization";
  if (normalized.includes("DOM_SERIALIZATION")) return "dom_serialization";
  if (normalized.includes("SCREENSHOT_VIEWPORT")) return "screenshot_viewport";
  if (normalized.includes("STYLE_SAMPLING")) return "style_sampling";
  if (normalized.includes("SCREENSHOT_FULLPAGE")) return "screenshot_fullpage";
  if (normalized.includes("ASSET_MANIFEST_FINALIZATION")) return "asset_manifest_finalization";
  if (normalized.includes("RESPONSE_ASSEMBLY")) return "response_assembly";
  return null;
}

function collectPostNavigationPhaseEvents(diagnostics: Array<{ code: string; details?: Record<string, unknown> }>): PostNavigationPhaseEvent[] {
  const byPhase = new Map<PostNavigationPhaseEvent["phase"], PostNavigationPhaseEvent>();
  for (const diagnostic of diagnostics) {
    const code = normalizeText(diagnostic.code);
    if (!code.startsWith("CAPTURE_PHASE_")) continue;
    if (!(code.endsWith("_COMPLETED") || code.endsWith("_TIMED_OUT") || code.endsWith("_FAILED"))) continue;
    const phase = phaseNameFromDiagnosticCode(code);
    if (!phase) continue;
    const status: PostNavigationPhaseStatus = code.endsWith("_COMPLETED")
      ? "completed"
      : code.endsWith("_TIMED_OUT")
        ? "timed_out"
        : "failed";
    const durationRaw = Number(diagnostic.details?.durationMs);
    const timeoutBudgetRaw = Number(diagnostic.details?.timeoutBudgetMs);
    byPhase.set(phase, {
      phase,
      status,
      durationMs: Number.isFinite(durationRaw) ? durationRaw : null,
      timeoutBudgetMs: Number.isFinite(timeoutBudgetRaw) ? timeoutBudgetRaw : null,
    });
  }
  return [...byPhase.values()];
}

function jsonResponse(status: number, payload: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function resolveTokenAuth(input: {
  headers: Headers;
  expectedToken: string;
}): { authorized: boolean; reason: "ok" | "missing_expected" | "missing_provided" | "mismatch" } {
  const expected = normalizeText(input.expectedToken);
  if (!expected) {
    return {
      authorized: false,
      reason: "missing_expected",
    };
  }

  const provided = normalizeText(input.headers.get("x-gnr8-rendered-capture-worker-token"));
  if (!provided) {
    return {
      authorized: false,
      reason: "missing_provided",
    };
  }

  if (provided !== expected) {
    return {
      authorized: false,
      reason: "mismatch",
    };
  }

  return {
    authorized: true,
    reason: "ok",
  };
}

export function createRenderedCaptureWorkerFetchHandler(input?: {
  executeRequest?: ExecuteRequest;
  sharedToken?: string;
  logger?: WorkerServerLogger;
}): (req: Request) => Promise<Response> {
  const executeRequest = input?.executeRequest ?? executeRenderedCaptureWorkerRequest;
  const resolveExpectedToken = () => normalizeText(input?.sharedToken ?? process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
  const logger: WorkerServerLogger =
    input?.logger ??
    ((event) => {
      process.stdout.write(`[worker] ${JSON.stringify(event)}\n`);
    });

  return async function renderedCaptureWorkerFetchHandler(req: Request): Promise<Response> {
    const method = normalizeText(req.method).toUpperCase();
    const url = new URL(req.url);
    const authHeader = normalizeText(req.headers.get("x-gnr8-rendered-capture-worker-token"));
    const inboundRequestId = normalizeText(req.headers.get("x-gnr8-request-id") ?? req.headers.get("x-request-id"));
    const inboundCorrelationId = normalizeText(req.headers.get("x-gnr8-correlation-id"));
    let requestId = inboundRequestId || null;
    let correlationId = inboundCorrelationId || inboundRequestId || `worker-${crypto.randomUUID()}`;
    const responseHeaders = new Headers({
      "x-gnr8-correlation-id": correlationId,
    });
    if (requestId) {
      responseHeaders.set("x-gnr8-request-id", requestId);
    }

    const log = (event: string, fields?: Record<string, unknown>) => {
      logger({
        event,
        correlationId,
        requestId,
        method,
        path: url.pathname,
        ...fields,
      });
    };

    const writeJsonWithStatusLog = (
      status: number,
      payload: unknown,
      meta: { result: "ok" | "error"; errorCode?: string | null; workerStatus?: string | null; stage: string },
    ): Response => {
      log("response_sent", {
        stage: meta.stage,
        status,
        result: meta.result,
        errorCode: meta.errorCode ?? null,
        workerStatus: meta.workerStatus ?? null,
      });
      return jsonResponse(status, payload, responseHeaders);
    };

    const isWorkerPath =
      pathMatches(url.pathname, RENDERED_CAPTURE_WORKER_FETCH_PATH) ||
      pathMatches(url.pathname, LEGACY_RENDERED_CAPTURE_WORKER_FETCH_PATH);
    if (method !== "POST" || !isWorkerPath) {
      return writeJsonWithStatusLog(
        404,
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: "Rendered capture worker endpoint not found.",
          },
        },
        {
          result: "error",
          errorCode: "NOT_FOUND",
          stage: "routing",
        },
      );
    }

    log("request_received", {
      hasAuthHeader: authHeader.length > 0,
      contentType: normalizeText(req.headers.get("content-type")) || null,
      contentLength: normalizeText(req.headers.get("content-length")) || null,
    });

    const auth = resolveTokenAuth({
      headers: req.headers,
      expectedToken: resolveExpectedToken(),
    });
    log("auth_checked", {
      hasToken: authHeader.length > 0,
      result: auth.authorized ? "accepted" : "rejected",
      reason:
        auth.reason === "missing_provided"
          ? "missing_token"
          : auth.reason === "mismatch"
            ? "token_mismatch"
            : auth.reason,
    });
    if (!auth.authorized) {
      log("auth_failed", {
        reason:
          auth.reason === "missing_provided"
            ? "missing_token"
            : auth.reason === "mismatch"
              ? "token_mismatch"
              : auth.reason,
      });
      return writeJsonWithStatusLog(
        401,
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED_WORKER_REQUEST",
            message: "Rendered capture worker authorization failed.",
            details: {
              authReason: auth.reason,
            },
          },
        },
        {
          result: "error",
          errorCode: "UNAUTHORIZED_WORKER_REQUEST",
          stage: "auth",
        },
      );
    }
    log("auth_passed", { reason: "token_accepted" });
    log("request_validation_started");

    let body: unknown;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } catch {
      log("request_validation_failed", {
        reason: "invalid_json",
        errorCode: "REQUEST_BODY_INVALID_JSON",
      });
      return writeJsonWithStatusLog(
        400,
        {
          ok: false,
          error: {
            code: "REQUEST_BODY_INVALID_JSON",
            message: "Rendered capture worker request body is invalid.",
          },
        },
        {
          result: "error",
          errorCode: "REQUEST_BODY_INVALID_JSON",
          stage: "validation",
        },
      );
    }

    const parsed = parseRenderedCaptureWorkerRequestDetailed(body);
    if (!parsed.request) {
      log("request_validation_failed", {
        reason: "contract_invalid",
        missingFields: parsed.error?.details.missingFields ?? [],
        invalidFields: (parsed.error?.details.invalidFields ?? []).map((field) => field.path),
        invalidFieldCount: parsed.error?.details.invalidFields?.length ?? 0,
      });
      return writeJsonWithStatusLog(
        400,
        {
          ok: false,
          error: parsed.error,
        },
        {
          result: "error",
          errorCode: parsed.error?.code ?? "INVALID_WORKER_REQUEST",
          stage: "validation",
        },
      );
    }

    requestId = normalizeText(parsed.request.requestId) || requestId;
    if (requestId) {
      responseHeaders.set("x-gnr8-request-id", requestId);
    }
    if (!inboundCorrelationId && requestId) {
      correlationId = requestId;
      responseHeaders.set("x-gnr8-correlation-id", correlationId);
    }
    log("request_validation_passed", {
      importId: parsed.request.importId,
    });
    log("execution_started", {
      importId: parsed.request.importId,
    });
    log("capture_service_entered");

    try {
      const response = await executeRequest({ request: parsed.request });
      const diagnostics = Array.isArray(response.diagnostics) ? response.diagnostics : [];
      if (diagnostics.some((entry) => entry.code === "NAVIGATION_STARTED")) {
        log("navigation_started");
      }
      if (diagnostics.some((entry) => entry.code === "NAVIGATION_SUCCEEDED")) {
        log("navigation_succeeded");
      }
      if (diagnostics.some((entry) => entry.code === "NAVIGATION_FAILED" || entry.code === "BROWSER_NAVIGATION_FAILED")) {
        log("navigation_failed");
      }
      const phaseEvents = collectPostNavigationPhaseEvents(
        diagnostics.map((entry) => ({
          code: normalizeText(entry.code),
          details: (entry.details as Record<string, unknown> | undefined) ?? undefined,
        })),
      );
      for (const phaseEvent of phaseEvents) {
        log("post_navigation_phase", {
          phase: phaseEvent.phase,
          status: phaseEvent.status,
          durationMs: phaseEvent.durationMs,
          timeoutBudgetMs: phaseEvent.timeoutBudgetMs,
        });
      }
      const timedOutPhase = phaseEvents.find((entry) => entry.status === "timed_out");
      if (timedOutPhase) {
        log("post_navigation_timeout_phase", {
          phase: timedOutPhase.phase,
          durationMs: timedOutPhase.durationMs,
          timeoutBudgetMs: timedOutPhase.timeoutBudgetMs,
        });
      }
      const launchProbeFailure = diagnostics.find((entry) =>
        ["PLAYWRIGHT_IMPORT_FAILED", "PLAYWRIGHT_BROWSER_LAUNCH_FAILED", "PLAYWRIGHT_BROWSER_CONTEXT_FAILED", "PLAYWRIGHT_LAUNCH_TIMEOUT", "PLAYWRIGHT_EXECUTABLE_MISSING", "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED"].includes(entry.code),
      );
      if (launchProbeFailure) {
        log("launch_probe_status", {
          status: "failed",
          code: launchProbeFailure.code,
        });
      } else if (diagnostics.some((entry) => entry.code === "BROWSER_LAUNCH_SUCCEEDED")) {
        log("launch_probe_status", {
          status: "passed",
        });
      }
      if (response.status === "failed" || response.status === "unsupported") {
        log("execution_failed", {
          code: response.failure?.failureCode ?? null,
          failureClass: response.failure?.failureClass ?? null,
        });
      } else {
        log("execution_succeeded", {
          workerStatus: response.status,
        });
      }
      return writeJsonWithStatusLog(
        200,
        response,
        {
          result: "ok",
          workerStatus: response.status,
          errorCode: response.failure?.failureCode ?? null,
          stage: "execution",
        },
      );
    } catch (error) {
      log("execution_failed", {
        code: "WORKER_EXECUTION_FAILED",
        error: toErrorString(error),
      });
      return writeJsonWithStatusLog(
        500,
        {
          ok: false,
          error: {
            code: "WORKER_EXECUTION_FAILED",
            message: "Rendered capture worker execution failed.",
            details: {
              error: toErrorString(error),
            },
          },
        },
        {
          result: "error",
          errorCode: "WORKER_EXECUTION_FAILED",
          stage: "execution",
        },
      );
    }
  };
}
