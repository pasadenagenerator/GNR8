import fs from "node:fs";
import http from "node:http";

import {
  executeRenderedCaptureWorkerRequest,
  parseRenderedCaptureWorkerRequest,
} from "@/gnr8/import-rendered-capture-worker/worker-service";
import type {
  RenderedCaptureWorkerRequest,
  RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

export const RENDERED_CAPTURE_WORKER_PATH = "/internal/gnr8/rendered-capture-worker" as const;
export const LEGACY_RENDERED_CAPTURE_WORKER_PATH = "/api/internal/gnr8/rendered-capture-worker" as const;
export const RENDERED_CAPTURE_WORKER_HEALTH_PATH = "/health" as const;

const DEFAULT_MAX_BODY_BYTES = 1_000_000;

type ExecuteRequest = (input: { request: RenderedCaptureWorkerRequest }) => Promise<RenderedCaptureWorkerResponse>;

type WorkerHealthSummary = {
  runtimeKind: "nodejs" | "edge" | "unknown";
  browserPackageAvailable: boolean;
  browserBinaryAvailable: boolean;
  captureServiceAvailable: boolean;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
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
  };

  try {
    const playwright = (await import("playwright")).chromium;
    summary.browserPackageAvailable = true;
    const executablePath = normalizeText(playwright.executablePath());
    if (executablePath && fs.existsSync(executablePath)) {
      summary.browserBinaryAvailable = true;
    }
  } catch {
    summary.browserPackageAvailable = false;
    summary.browserBinaryAvailable = false;
  }

  summary.captureServiceAvailable =
    summary.runtimeKind === "nodejs" && summary.browserPackageAvailable && summary.browserBinaryAvailable;
  return summary;
}

export function createRenderedCaptureWorkerServer(input?: {
  executeRequest?: ExecuteRequest;
  sharedToken?: string;
  maxBodyBytes?: number;
  probeEnvironment?: () => Promise<WorkerHealthSummary>;
}): http.Server {
  const executeRequest = input?.executeRequest ?? executeRenderedCaptureWorkerRequest;
  const maxBodyBytes = Math.max(10_000, Math.floor(input?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES));
  const resolveExpectedToken = () => normalizeText(input?.sharedToken ?? process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
  const probeEnvironment = input?.probeEnvironment ?? probeWorkerEnvironment;

  return http.createServer(async (req, res) => {
    const method = normalizeText(req.method).toUpperCase();
    const url = new URL(req.url ?? "/", "http://localhost");

    if (method === "GET" && pathMatches(url.pathname, RENDERED_CAPTURE_WORKER_HEALTH_PATH)) {
      const expectedToken = resolveExpectedToken();
      const auth = resolveTokenAuth({ headers: req.headers, expectedToken });
      const environment = await probeEnvironment();

      if (expectedToken && auth.reason === "mismatch") {
        writeJson(res, 401, {
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
        });
        return;
      }

      writeJson(res, 200, {
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
      });
      return;
    }

    const isWorkerPath =
      pathMatches(url.pathname, RENDERED_CAPTURE_WORKER_PATH) || pathMatches(url.pathname, LEGACY_RENDERED_CAPTURE_WORKER_PATH);
    if (method === "POST" && isWorkerPath) {
      const auth = resolveTokenAuth({
        headers: req.headers,
        expectedToken: resolveExpectedToken(),
      });
      if (!auth.authorized) {
        writeJson(res, 401, {
          ok: false,
          error: {
            code: "UNAUTHORIZED_WORKER_REQUEST",
            message: "Rendered capture worker authorization failed.",
            details: {
              authReason: auth.reason,
            },
          },
        });
        return;
      }

      let body: unknown;
      try {
        body = await readJsonBody(req, maxBodyBytes);
      } catch (error) {
        const code = normalizeText((error as Error).message);
        if (code === "REQUEST_BODY_TOO_LARGE") {
          writeJson(res, 413, {
            ok: false,
            error: {
              code,
              message: "Rendered capture worker request body too large.",
            },
          });
          return;
        }
        writeJson(res, 400, {
          ok: false,
          error: {
            code: code || "REQUEST_BODY_INVALID",
            message: "Rendered capture worker request body is invalid.",
          },
        });
        return;
      }

      const parsed = parseRenderedCaptureWorkerRequest(body);
      if (!parsed) {
        writeJson(res, 400, {
          ok: false,
          error: {
            code: "INVALID_WORKER_REQUEST",
            message: "Rendered capture worker request contract is invalid.",
          },
        });
        return;
      }

      try {
        const response = await executeRequest({ request: parsed });
        writeJson(res, 200, response);
      } catch (error) {
        writeJson(res, 500, {
          ok: false,
          error: {
            code: "WORKER_EXECUTION_FAILED",
            message: "Rendered capture worker execution failed.",
            details: {
              error: toErrorString(error),
            },
          },
        });
      }
      return;
    }

    writeJson(res, 404, {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Rendered capture worker endpoint not found.",
      },
    });
  });
}
