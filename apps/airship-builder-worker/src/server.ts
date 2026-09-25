import http from "node:http";
import crypto from "node:crypto";

import { readAirshipBuilderWorkerConfig, type AirshipBuilderWorkerConfigReadback } from "./config.js";
import { buildAirshipBuilderWorkerHealthReadback } from "./health.js";

const SESSION_ROUTE_PATTERN = /^\/v1\/airship\/sessions(?:\/[^/]+(?:\/(?:editor-url|capture|stop))?)?$/;

type Logger = (event: { event: string; [key: string]: unknown }) => void;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function pathMatches(inputPath: string, expectedPath: string): boolean {
  const normalized = inputPath.replace(/\/+$/, "") || "/";
  return normalized === expectedPath;
}

function writeJson(res: http.ServerResponse, status: number, payload: unknown, correlationId: string): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-gnr8-correlation-id", correlationId);
  res.end(body);
}

export function createAirshipBuilderWorkerServer(input?: {
  configReadback?: AirshipBuilderWorkerConfigReadback;
  logger?: Logger;
}): http.Server {
  const configReadback = input?.configReadback ?? readAirshipBuilderWorkerConfig();
  const logger: Logger =
    input?.logger ??
    ((event) => {
      process.stdout.write(`[airship-builder-worker] ${JSON.stringify(event)}\n`);
    });

  return http.createServer(async (req, res) => {
    const method = normalizeText(req.method).toUpperCase();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    const correlationId =
      normalizeText(req.headers["x-gnr8-correlation-id"]) ||
      normalizeText(req.headers["x-request-id"]) ||
      `airship-worker-${crypto.randomUUID()}`;

    logger({
      event: "request_received",
      correlationId,
      method,
      path: url.pathname,
    });

    if (method === "GET" && (pathMatches(url.pathname, "/health") || pathMatches(url.pathname, "/v1/health"))) {
      const health = await buildAirshipBuilderWorkerHealthReadback(configReadback);
      writeJson(res, health.ok ? 200 : 503, health, correlationId);
      return;
    }

    if (SESSION_ROUTE_PATTERN.test(url.pathname)) {
      writeJson(
        res,
        501,
        {
          ok: false,
          failureReason: "not_implemented",
          diagnostics: [
            "The VPS worker scaffold does not start target servers, Airship CLI, capture diffs, or cleanup sessions yet.",
            "Runtime execution remains disabled until a later explicitly scoped worker proof task.",
          ],
          boundaries: {
            noPublishMutation: true,
            noLivePointerMutation: true,
            noDnsMutation: true,
            noProviderMutation: true,
            noSourceCaptureImport: true,
          },
        },
        correlationId,
      );
      return;
    }

    writeJson(
      res,
      404,
      {
        ok: false,
        failureReason: "not_found",
        diagnostics: ["Airship builder worker endpoint not found."],
      },
      correlationId,
    );
  });
}
