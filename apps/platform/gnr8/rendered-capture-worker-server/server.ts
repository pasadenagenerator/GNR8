import http from "node:http";
import crypto from "node:crypto";

import {
  executeRenderedCaptureWorkerRequest,
  parseRenderedCaptureWorkerRequestDetailed,
} from "../import-rendered-capture-worker/worker-service";
import type {
  RenderedCaptureWorkerRequest,
  RenderedCaptureWorkerResponse,
} from "../import-rendered-capture-worker/worker-contract";
import {
  runChromiumLaunchProbe,
  DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS,
  DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
} from "../import-rendered-capture/playwright-launch-probe";

export const RENDERED_CAPTURE_WORKER_PATH = "/internal/gnr8/rendered-capture-worker" as const;
export const LEGACY_RENDERED_CAPTURE_WORKER_PATH = "/api/internal/gnr8/rendered-capture-worker" as const;
export const RENDERED_CAPTURE_WORKER_HEALTH_PATH = "/health" as const;

const DEFAULT_MAX_BODY_BYTES = 1_000_000;

type ExecuteRequest = (input: { request: RenderedCaptureWorkerRequest }) => Promise<RenderedCaptureWorkerResponse>;
type WorkerServerLogger = (event: { event: string; [key: string]: unknown }) => void;

type WorkerHealthSummary = {
  runtimeKind: "nodejs" | "edge" | "unknown";
  browserPackageAvailable: boolean;
  browserBinaryAvailable: boolean;
  captureServiceAvailable: boolean;
  launchProbe: {
    supported: boolean;
    failureCode: string | null;
    timeoutMs: number;
    contextTimeoutMs: number;
    executablePath: string | null;
    executablePathExists: boolean | null;
    launchArgs: string[];
    error: string | null;
  };
};

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

function firstHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return normalizeText(value[0]);
  return normalizeText(value);
}

function runtimeKind(): WorkerHealthSummary["runtimeKind"] {
  const runtime = normalizeText(process.env.NEXT_RUNTIME).toLowerCase();
  if (runtime === "nodejs" || runtime === "edge") return runtime;
  if (typeof process.versions?.node === "string" && process.versions.node.length > 0) return "nodejs";
  return "unknown";
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

function readJsonBody(req: http.IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.byteLength;
      if (total > maxBodyBytes) {
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });

    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error("REQUEST_BODY_INVALID_JSON"));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function writeJson(res: http.ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}

function resolveTokenAuth(input: {
  headers: http.IncomingHttpHeaders;
  expectedToken: string;
}): { authorized: boolean; reason: "ok" | "missing_expected" | "missing_provided" | "mismatch" } {
  const expected = normalizeText(input.expectedToken);
  if (!expected) {
    return {
      authorized: false,
      reason: "missing_expected",
    };
  }

  const provided = normalizeText(input.headers["x-gnr8-rendered-capture-worker-token"]);
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

async function probeWorkerEnvironment(): Promise<WorkerHealthSummary> {
  const summary: WorkerHealthSummary = {
    runtimeKind: runtimeKind(),
    browserPackageAvailable: false,
    browserBinaryAvailable: false,
    captureServiceAvailable: false,
    launchProbe: {
      supported: false,
      failureCode: null,
      timeoutMs: DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
      contextTimeoutMs: DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS,
      executablePath: null,
      executablePathExists: null,
      launchArgs: [],
      error: null,
    },
  };

  if (summary.runtimeKind !== "nodejs") {
    summary.launchProbe.failureCode = "RUNTIME_INCOMPATIBLE";
    return summary;
  }

  try {
    const playwright = await import("playwright");
    summary.browserPackageAvailable = true;
    const probe = await runChromiumLaunchProbe({
      chromium: playwright.chromium,
      launchTimeoutMs: DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
      contextTimeoutMs: DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS,
    });
    summary.browserBinaryAvailable = probe.browserBinaryAvailable;
    summary.launchProbe = {
      supported: probe.launchable,
      failureCode: probe.failureCode,
      timeoutMs: DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
      contextTimeoutMs: DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS,
      executablePath: probe.executablePath,
      executablePathExists: probe.executablePathExists,
      launchArgs: probe.launchOptions.args,
      error: probe.error,
    };
  } catch (error) {
    summary.browserPackageAvailable = false;
    summary.browserBinaryAvailable = false;
    summary.launchProbe = {
      supported: false,
      failureCode: "PLAYWRIGHT_IMPORT_FAILED",
      timeoutMs: DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
      contextTimeoutMs: DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS,
      executablePath: null,
      executablePathExists: null,
      launchArgs: [],
      error: toErrorString(error),
    };
  }

  summary.captureServiceAvailable =
    summary.runtimeKind === "nodejs" &&
    summary.browserPackageAvailable &&
    summary.browserBinaryAvailable &&
    summary.launchProbe.supported;
  return summary;
}

export function createRenderedCaptureWorkerServer(input?: {
  executeRequest?: ExecuteRequest;
  sharedToken?: string;
  maxBodyBytes?: number;
  probeEnvironment?: () => Promise<WorkerHealthSummary>;
  logger?: WorkerServerLogger;
}): http.Server {
  const executeRequest = input?.executeRequest ?? executeRenderedCaptureWorkerRequest;
  const maxBodyBytes = Math.max(10_000, Math.floor(input?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES));
  const resolveExpectedToken = () => normalizeText(input?.sharedToken ?? process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
  const probeEnvironment = input?.probeEnvironment ?? probeWorkerEnvironment;
  const logger: WorkerServerLogger =
    input?.logger ??
    ((event) => {
      process.stdout.write(`[worker] ${JSON.stringify(event)}\n`);
    });
  const inFlightRequests = new Map<string, Promise<RenderedCaptureWorkerResponse>>();

  return http.createServer(async (req, res) => {
    const method = normalizeText(req.method).toUpperCase();
    const url = new URL(req.url ?? "/", "http://localhost");
    const authHeader = firstHeaderValue(req.headers["x-gnr8-rendered-capture-worker-token"]);
    const requestContentType = firstHeaderValue(req.headers["content-type"]);
    const requestContentLength = firstHeaderValue(req.headers["content-length"]);
    const inboundRequestId = firstHeaderValue(req.headers["x-gnr8-request-id"] ?? req.headers["x-request-id"]);
    const inboundCorrelationId = firstHeaderValue(req.headers["x-gnr8-correlation-id"]);
    let requestId = inboundRequestId || null;
    let correlationId = inboundCorrelationId || inboundRequestId || `worker-${crypto.randomUUID()}`;
    res.setHeader("x-gnr8-correlation-id", correlationId);
    if (requestId) {
      res.setHeader("x-gnr8-request-id", requestId);
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
    ): void => {
      log("response_sent", {
        stage: meta.stage,
        status,
        result: meta.result,
        errorCode: meta.errorCode ?? null,
        workerStatus: meta.workerStatus ?? null,
      });
      writeJson(res, status, payload);
    };

    if (method === "GET" && pathMatches(url.pathname, RENDERED_CAPTURE_WORKER_HEALTH_PATH)) {
      const expectedToken = resolveExpectedToken();
      const auth = resolveTokenAuth({ headers: req.headers, expectedToken });
      const environment = await probeEnvironment();

      if (expectedToken && auth.reason === "mismatch") {
        writeJsonWithStatusLog(
          401,
          {
          ok: false,
          error: {
            code: "UNAUTHORIZED_WORKER_REQUEST",
            message: "Rendered capture worker authorization failed.",
          },
          health: {
            authenticated: false,
            authReason: "token_mismatch",
            ...environment,
          },
          },
          {
            result: "error",
            errorCode: "UNAUTHORIZED_WORKER_REQUEST",
            stage: "health",
          },
        );
        return;
      }

      writeJsonWithStatusLog(
        200,
        {
        ok: true,
        health: {
          authenticated: auth.authorized,
          authReason:
            auth.reason === "ok"
              ? "ok"
            : auth.reason === "missing_expected"
              ? "worker_token_not_configured"
              : "worker_token_missing",
          ...environment,
        },
        },
        {
          result: "ok",
          stage: "health",
        },
      );
      return;
    }

    const isWorkerPath =
      pathMatches(url.pathname, RENDERED_CAPTURE_WORKER_PATH) || pathMatches(url.pathname, LEGACY_RENDERED_CAPTURE_WORKER_PATH);
    if (method === "POST" && isWorkerPath) {
      log("request_received", {
        hasAuthHeader: authHeader.length > 0,
        contentType: requestContentType || null,
        contentLength: requestContentLength || null,
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
        writeJsonWithStatusLog(
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
        return;
      }
      log("auth_passed", { reason: "token_accepted" });
      log("request_validation_started");

      let body: unknown;
      try {
        body = await readJsonBody(req, maxBodyBytes);
      } catch (error) {
        const code = normalizeText((error as Error).message);
        if (code === "REQUEST_BODY_TOO_LARGE") {
          log("request_validation_failed", {
            reason: "body_too_large",
            errorCode: code,
          });
          writeJsonWithStatusLog(
            413,
            {
            ok: false,
            error: {
              code,
              message: "Rendered capture worker request body too large.",
            },
            },
            {
              result: "error",
              errorCode: code,
              stage: "validation",
            },
          );
          return;
        }
        log("request_validation_failed", {
          reason: "invalid_json",
          errorCode: code || "REQUEST_BODY_INVALID",
        });
        writeJsonWithStatusLog(
          400,
          {
          ok: false,
          error: {
            code: code || "REQUEST_BODY_INVALID",
            message: "Rendered capture worker request body is invalid.",
          },
          },
          {
            result: "error",
            errorCode: code || "REQUEST_BODY_INVALID",
            stage: "validation",
          },
        );
        return;
      }

      const parsed = parseRenderedCaptureWorkerRequestDetailed(body);
      if (!parsed.request) {
        log("request_validation_failed", {
          reason: "contract_invalid",
          missingFields: parsed.error?.details.missingFields ?? [],
          invalidFields: (parsed.error?.details.invalidFields ?? []).map((field) => field.path),
          invalidFieldCount: parsed.error?.details.invalidFields?.length ?? 0,
        });
        writeJsonWithStatusLog(
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
        return;
      }
      requestId = normalizeText(parsed.request.requestId) || requestId;
      if (requestId) {
        res.setHeader("x-gnr8-request-id", requestId);
      }
      if (!inboundCorrelationId && requestId) {
        correlationId = requestId;
        res.setHeader("x-gnr8-correlation-id", correlationId);
      }
      log("request_validation_passed", {
        importId: parsed.request.importId,
      });
      log("execution_started", {
        importId: parsed.request.importId,
      });
      log("capture_service_entered");

      try {
        const executionKey = normalizeText(parsed.request.requestId) || normalizeText(parsed.request.importId);
        let executionPromise: Promise<RenderedCaptureWorkerResponse>;
        if (executionKey && inFlightRequests.has(executionKey)) {
          log("duplicate_request_detected", {
            executionKey,
            dedupe: "join_inflight",
          });
          executionPromise = inFlightRequests.get(executionKey) as Promise<RenderedCaptureWorkerResponse>;
        } else {
          executionPromise = executeRequest({ request: parsed.request });
          if (executionKey) {
            inFlightRequests.set(executionKey, executionPromise);
          }
        }
        const response = await executionPromise;
        if (executionKey) {
          inFlightRequests.delete(executionKey);
        }
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
        writeJsonWithStatusLog(
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
        const executionKey = normalizeText(parsed.request.requestId) || normalizeText(parsed.request.importId);
        if (executionKey) inFlightRequests.delete(executionKey);
        log("execution_failed", {
          code: "WORKER_EXECUTION_FAILED",
          error: toErrorString(error),
        });
        writeJsonWithStatusLog(
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
      return;
    }

    writeJsonWithStatusLog(
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
  });
}
