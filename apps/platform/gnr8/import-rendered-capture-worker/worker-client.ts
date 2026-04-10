import type {
  RenderedCaptureDiagnostic,
  RenderedCaptureDiagnosticCode,
} from "@/gnr8/import-rendered-capture/rendered-capture-contract";
import {
  type RenderedCaptureWorkerRequest,
  type RenderedCaptureWorkerResponse,
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";
import {
  resolveRenderedCaptureWorkerClientConfigFromEnv,
  type RenderedCaptureWorkerClientConfig,
} from "@/gnr8/import-rendered-capture-worker/worker-config";

export type RenderedCaptureWorkerClient = {
  execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse>;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type WorkerUnavailableReason =
  | "worker_not_configured"
  | "worker_unreachable"
  | "worker_timeout"
  | "worker_disabled"
  | "worker_auth_not_configured"
  | "worker_response_invalid"
  | "worker_http_error"
  | "worker_unauthorized"
  | "worker_execution_failed";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function createDiagnostic(input: {
  code: RenderedCaptureDiagnosticCode;
  message: string;
  severity?: RenderedCaptureDiagnostic["severity"];
  details?: Record<string, unknown>;
}): RenderedCaptureDiagnostic {
  return {
    code: input.code,
    message: input.message,
    severity: input.severity ?? "info",
    details: input.details,
  };
}

function reasonToSpecificDiagnostic(reason: WorkerUnavailableReason): {
  code: RenderedCaptureDiagnosticCode;
  message: string;
} {
  if (reason === "worker_disabled") {
    return {
      code: "CAPTURE_WORKER_DISABLED",
      message: "Rendered capture worker is disabled for this runtime",
    };
  }
  if (reason === "worker_not_configured" || reason === "worker_auth_not_configured") {
    return {
      code: "CAPTURE_WORKER_NOT_CONFIGURED",
      message: "Rendered capture worker is not configured for this runtime",
    };
  }
  if (reason === "worker_timeout") {
    return {
      code: "CAPTURE_WORKER_TIMEOUT",
      message: "Rendered capture worker request timed out",
    };
  }
  if (reason === "worker_unauthorized") {
    return {
      code: "CAPTURE_WORKER_UNAUTHORIZED",
      message: "Rendered capture worker authorization failed",
    };
  }
  if (reason === "worker_response_invalid") {
    return {
      code: "CAPTURE_WORKER_RESPONSE_INVALID",
      message: "Rendered capture worker returned invalid response contract",
    };
  }
  if (reason === "worker_execution_failed") {
    return {
      code: "CAPTURE_WORKER_EXECUTION_FAILED",
      message: "Rendered capture worker executed but capture failed",
    };
  }
  return {
    code: "CAPTURE_WORKER_HTTP_ERROR",
    message: "Rendered capture worker transport request failed",
  };
}

function createWorkerUnavailableResponse(input: {
  request: RenderedCaptureWorkerRequest;
  reason: WorkerUnavailableReason;
  diagnostics?: RenderedCaptureDiagnostic[];
}): RenderedCaptureWorkerResponse {
  const diagnostics = input.diagnostics ?? [];
  return {
    kind: "rendered_capture_worker_response_v1",
    contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
    requestId: input.request.requestId,
    status: "unsupported",
    environment: {
      runtimeKind: "unknown",
      environmentSupported: false,
      browserPackageAvailable: false,
      browserBinaryAvailable: false,
      supportDecision: "unknown",
    },
    artifacts: [],
    computedStyleSamples: [],
    diagnostics,
    qualitySummary: {
      renderedDomQuality: "unusable",
      domLength: 0,
      meaningfulNodeCount: 0,
      screenshotCount: 0,
      computedStyleSampleCount: 0,
    },
    failure: {
      failureClass: "environment_unsupported",
      failureCode: "WORKER_UNAVAILABLE",
      retryable:
        input.reason === "worker_unreachable" ||
        input.reason === "worker_timeout" ||
        input.reason === "worker_http_error",
      message: "Rendered capture worker unavailable",
    },
    timings: {
      queueLatencyMs: null,
      executionMs: null,
      totalMs: null,
    },
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorkerResponseShape(value: unknown): value is RenderedCaptureWorkerResponse {
  if (!isObjectRecord(value)) return false;
  if (value.kind !== "rendered_capture_worker_response_v1") return false;
  if (value.contractVersion !== RENDERED_CAPTURE_WORKER_CONTRACT_VERSION) return false;
  if (typeof value.requestId !== "string") return false;
  if (value.status !== "available" && value.status !== "partial" && value.status !== "failed" && value.status !== "unsupported") return false;
  if (!isObjectRecord(value.environment)) return false;
  if (!Array.isArray(value.artifacts)) return false;
  if (!Array.isArray(value.computedStyleSamples)) return false;
  if (!Array.isArray(value.diagnostics)) return false;
  if (!isObjectRecord(value.qualitySummary)) return false;
  if (!isObjectRecord(value.timings)) return false;
  return true;
}

export function createUnavailableRenderedCaptureWorkerClient(input?: {
  reason?: WorkerUnavailableReason;
}): RenderedCaptureWorkerClient {
  const reason = input?.reason ?? "worker_not_configured";

  return {
    async execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse> {
      const specific = reasonToSpecificDiagnostic(reason);
      return createWorkerUnavailableResponse({
        request,
        reason,
        diagnostics: [
          createDiagnostic({
            code: specific.code,
            severity: "warning",
            message: specific.message,
            details: { reason },
          }),
          createDiagnostic({
            code: "CAPTURE_WORKER_UNAVAILABLE",
            severity: "warning",
            message: "Rendered capture worker unavailable; importer should use fallback path",
            details: { reason },
          }),
          createDiagnostic({
            code: "RENDERED_CAPTURE_UNAVAILABLE",
            severity: "warning",
            message: "Rendered capture worker unavailable; importer should use fallback path",
            details: { reason },
          }),
        ],
      });
    },
  };
}

export function createHttpRenderedCaptureWorkerClient(input: {
  endpointUrl: string;
  sharedToken: string;
  timeoutMs: number;
  fetchImpl?: FetchLike;
}): RenderedCaptureWorkerClient {
  const endpointUrl = normalizeText(input.endpointUrl);
  const sharedToken = normalizeText(input.sharedToken);
  const timeoutMs = Math.max(1_000, Math.min(180_000, Math.floor(input.timeoutMs)));
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse> {
      const startedAt = Date.now();
      const startedDiagnostic = createDiagnostic({
        code: "CAPTURE_WORKER_REQUEST_STARTED",
        message: "Rendered capture worker request started",
        details: {
          endpointUrl,
          requestId: request.requestId,
          importId: request.importId,
          timeoutMs,
        },
      });

      const requestBuiltDiagnostic = createDiagnostic({
        code: "CAPTURE_WORKER_REQUEST_BUILT",
        message: "Rendered capture worker request payload built",
        details: {
          endpointUrl,
          requestId: request.requestId,
          timeoutMs,
        },
      });

      try {
        const signal = AbortSignal.timeout(timeoutMs);
        const requestSentAt = Date.now();
        const response = await fetchImpl(endpointUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-gnr8-rendered-capture-worker-token": sharedToken,
          },
          body: JSON.stringify(request),
          signal,
          cache: "no-store",
        });

        const responseReceivedDiagnostic = createDiagnostic({
          code: "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED",
          message: "Rendered capture worker HTTP response received",
          details: {
            endpointUrl,
            status: response.status,
            statusText: response.statusText,
            requestLatencyMs: Date.now() - requestSentAt,
          },
        });

        if (!response.ok) {
          const unauthorized = response.status === 401 || response.status === 403;
          const reason: WorkerUnavailableReason = unauthorized ? "worker_unauthorized" : "worker_http_error";
          const specific = reasonToSpecificDiagnostic(reason);

          return createWorkerUnavailableResponse({
            request,
            reason,
            diagnostics: [
              startedDiagnostic,
              requestBuiltDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
                message: "Rendered capture worker HTTP request sent",
                details: {
                  endpointUrl,
                },
              }),
              responseReceivedDiagnostic,
              createDiagnostic({
                code: specific.code,
                severity: "warning",
                message: specific.message,
                details: {
                  status: response.status,
                  statusText: response.statusText,
                  endpointUrl,
                  elapsedMs: Date.now() - startedAt,
                },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_REQUEST_FAILED",
                severity: "warning",
                message: "Rendered capture worker request failed",
                details: {
                  status: response.status,
                  statusText: response.statusText,
                  endpointUrl,
                  elapsedMs: Date.now() - startedAt,
                },
              }),
              createDiagnostic({
                code: "RENDERED_CAPTURE_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker request failed",
                details: {
                  status: response.status,
                  statusText: response.statusText,
                  reason,
                },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker unavailable; importer should use fallback path",
                details: {
                  reason,
                  status: response.status,
                },
              }),
            ],
          });
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!isWorkerResponseShape(payload)) {
          const reason: WorkerUnavailableReason = "worker_response_invalid";
          return createWorkerUnavailableResponse({
            request,
            reason,
            diagnostics: [
              startedDiagnostic,
              requestBuiltDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
                message: "Rendered capture worker HTTP request sent",
                details: {
                  endpointUrl,
                },
              }),
              responseReceivedDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_RESPONSE_INVALID",
                severity: "warning",
                message: "Rendered capture worker returned invalid response contract",
                details: { endpointUrl, elapsedMs: Date.now() - startedAt },
              }),
              createDiagnostic({
                code: "RENDERED_CAPTURE_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker returned invalid response contract",
                details: { reason: "worker_response_invalid" },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker unavailable; importer should use fallback path",
                details: { reason },
              }),
            ],
          });
        }

        const responseDiagnostics = Array.isArray(payload.diagnostics) ? payload.diagnostics : [];
        const diagnosticsPrefix: RenderedCaptureDiagnostic[] = [
          startedDiagnostic,
          requestBuiltDiagnostic,
          createDiagnostic({
            code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
            message: "Rendered capture worker HTTP request sent",
            details: {
              endpointUrl,
            },
          }),
          responseReceivedDiagnostic,
          createDiagnostic({
            code: "CAPTURE_WORKER_RESPONSE_PARSED",
            message: "Rendered capture worker response parsed and validated",
            details: {
              endpointUrl,
              status: payload.status,
            },
          }),
        ];

        if (payload.status === "failed") {
          diagnosticsPrefix.push(
            createDiagnostic({
              code: "CAPTURE_WORKER_EXECUTION_FAILED",
              severity: "warning",
              message: "Rendered capture worker executed but capture failed",
              details: {
                endpointUrl,
                failureClass: payload.failure?.failureClass ?? null,
                failureCode: payload.failure?.failureCode ?? null,
                retryable: payload.failure?.retryable ?? null,
              },
            }),
          );
        }

        payload.diagnostics = [...diagnosticsPrefix, ...responseDiagnostics];
        return payload;
      } catch (error) {
        const aborted = normalizeText((error as { name?: unknown })?.name) === "AbortError";
        const reason: WorkerUnavailableReason = aborted ? "worker_timeout" : "worker_unreachable";
        const specific = reasonToSpecificDiagnostic(reason);
        return createWorkerUnavailableResponse({
          request,
          reason,
          diagnostics: [
            startedDiagnostic,
            requestBuiltDiagnostic,
            createDiagnostic({
              code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
              message: "Rendered capture worker HTTP request sent",
              details: {
                endpointUrl,
              },
            }),
            createDiagnostic({
              code: specific.code,
              severity: "warning",
              message: specific.message,
              details: {
                endpointUrl,
                elapsedMs: Date.now() - startedAt,
                timeoutMs,
                error: toErrorString(error),
              },
            }),
            createDiagnostic({
              code: "CAPTURE_WORKER_REQUEST_FAILED",
              severity: "warning",
              message: aborted ? "Rendered capture worker request timed out" : "Rendered capture worker request failed",
              details: {
                endpointUrl,
                elapsedMs: Date.now() - startedAt,
                timeoutMs,
                error: toErrorString(error),
              },
            }),
            createDiagnostic({
              code: "RENDERED_CAPTURE_UNAVAILABLE",
              severity: "warning",
              message: aborted ? "Rendered capture worker request timed out" : "Rendered capture worker request failed",
              details: {
                reason,
                error: toErrorString(error),
              },
            }),
            createDiagnostic({
              code: "CAPTURE_WORKER_UNAVAILABLE",
              severity: "warning",
              message: "Rendered capture worker unavailable; importer should use fallback path",
              details: { reason, error: toErrorString(error) },
            }),
          ],
        });
      }
    },
  };
}

export function createRenderedCaptureWorkerClientFromConfig(input: {
  config: RenderedCaptureWorkerClientConfig;
  fetchImpl?: FetchLike;
}): RenderedCaptureWorkerClient {
  const config = input.config;
  if (!config.enabled) {
    return createUnavailableRenderedCaptureWorkerClient({ reason: "worker_disabled" });
  }
  if (!config.endpointUrl) {
    return createUnavailableRenderedCaptureWorkerClient({ reason: "worker_not_configured" });
  }
  if (!config.sharedToken) {
    return createUnavailableRenderedCaptureWorkerClient({ reason: "worker_auth_not_configured" });
  }

  return createHttpRenderedCaptureWorkerClient({
    endpointUrl: config.endpointUrl,
    sharedToken: config.sharedToken,
    timeoutMs: config.timeoutMs,
    fetchImpl: input.fetchImpl,
  });
}

export function createRenderedCaptureWorkerClientFromEnv(input?: {
  fetchImpl?: FetchLike;
  env?: NodeJS.ProcessEnv;
}): RenderedCaptureWorkerClient {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv(input?.env);
  const endpointConfigured = Boolean(config.endpointUrl);
  const sharedTokenConfigured = Boolean(config.sharedToken);
  const configuredDiagnostic = createDiagnostic({
    code: "CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED",
    message: "Rendered capture worker client configuration resolved",
    details: {
      enabled: config.enabled,
      endpointConfigured,
      sharedTokenConfigured,
      endpointUrl: config.endpointUrl,
      endpointPath: config.endpointPath,
      resolvedBaseUrl: config.resolvedBaseUrl,
      resolvedBaseUrlSource: config.resolvedBaseUrlSource,
      configStatus: config.configStatus,
      timeoutMs: config.timeoutMs,
    },
  });
  const urlResolvedDiagnostic = createDiagnostic({
    code: "CAPTURE_WORKER_URL_RESOLVED",
    severity: endpointConfigured ? "info" : "warning",
    message: endpointConfigured
      ? "Rendered capture worker endpoint URL resolved"
      : "Rendered capture worker endpoint URL could not be resolved",
    details: {
      endpointConfigured,
      endpointUrl: config.endpointUrl,
      endpointPath: config.endpointPath,
      resolvedBaseUrl: config.resolvedBaseUrl,
      resolvedBaseUrlSource: config.resolvedBaseUrlSource,
      configStatus: config.configStatus,
      sharedTokenConfigured,
      authHeaderConfigured: sharedTokenConfigured,
    },
  });

  const client = createRenderedCaptureWorkerClientFromConfig({
    config,
    fetchImpl: input?.fetchImpl,
  });

  return {
    async execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse> {
      const response = await client.execute(request);
      response.diagnostics = [configuredDiagnostic, urlResolvedDiagnostic, ...(Array.isArray(response.diagnostics) ? response.diagnostics : [])];
      return response;
    },
  };
}
