import type {
  RenderedCaptureDiagnostic,
  RenderedCaptureDiagnosticCode,
} from "@/gnr8/import-rendered-capture/rendered-capture-contract";
import {
  canonicalizeRenderedCaptureWorkerRequest,
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

async function parseWorkerErrorResponse(
  response: Response,
): Promise<{ parsed: boolean; errorCode: string | null; errorMessage: string | null }> {
  const contentType = normalizeText(response.headers.get("content-type")).toLowerCase();
  if (!contentType.includes("application/json")) {
    return { parsed: false, errorCode: null, errorMessage: null };
  }

  const parsed = (await response.json().catch(() => null)) as unknown;
  if (!isObjectRecord(parsed)) {
    return { parsed: false, errorCode: null, errorMessage: null };
  }

  const error = isObjectRecord(parsed.error) ? parsed.error : null;
  return {
    parsed: true,
    errorCode: error ? normalizeText(error.code) || null : null,
    errorMessage: error ? normalizeText(error.message) || null : null,
  };
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

function sanitizeSuccessfulWorkerResponse(input: {
  payload: RenderedCaptureWorkerResponse;
}): RenderedCaptureWorkerResponse {
  const { payload } = input;
  const successfulStatus = payload.status === "available" || payload.status === "partial";
  if (!successfulStatus) return payload;

  const droppedCodes = new Set<RenderedCaptureDiagnosticCode>([
    "CAPTURE_WORKER_HTTP_ERROR",
    "CAPTURE_WORKER_REQUEST_FAILED",
    "CAPTURE_WORKER_UNAVAILABLE",
    "CAPTURE_WORKER_EXECUTION_FAILED",
  ]);
  const filteredDiagnostics = (Array.isArray(payload.diagnostics) ? payload.diagnostics : []).filter(
    (entry) => !droppedCodes.has(entry.code),
  );

  return {
    ...payload,
    failure: null,
    diagnostics: filteredDiagnostics,
  };
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
      const canonicalRequest = canonicalizeRenderedCaptureWorkerRequest(request);
      const requestBody = JSON.stringify(canonicalRequest);
      const startedAt = Date.now();
      const correlationId = canonicalRequest.requestId || canonicalRequest.importId;
      const startedDiagnostic = createDiagnostic({
        code: "CAPTURE_WORKER_REQUEST_STARTED",
        message: "Rendered capture worker request started",
        details: {
          endpointUrl,
          requestId: canonicalRequest.requestId,
          importId: canonicalRequest.importId,
          correlationId,
          timeoutMs,
        },
      });

      const requestBuiltDiagnostic = createDiagnostic({
        code: "CAPTURE_WORKER_REQUEST_BUILT",
        message: "Rendered capture worker request payload built",
        details: {
          endpointUrl,
          requestId: canonicalRequest.requestId,
          contractVersion: canonicalRequest.contractVersion,
          kind: canonicalRequest.kind,
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
            "x-gnr8-request-id": canonicalRequest.requestId,
            "x-gnr8-correlation-id": correlationId,
          },
          body: requestBody,
          signal,
          cache: "no-store",
        });

        const responseReceivedDiagnostic = createDiagnostic({
          code: "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED",
          message: "Rendered capture worker HTTP response received",
          details: {
            endpointUrl,
            status: response.status,
            statusCode: response.status,
            statusText: response.statusText,
            requestLatencyMs: Date.now() - requestSentAt,
            correlationId,
          },
        });

        if (!response.ok) {
          const unauthorized = response.status === 401 || response.status === 403;
          const reason: WorkerUnavailableReason = unauthorized ? "worker_unauthorized" : "worker_http_error";
          const specific = reasonToSpecificDiagnostic(reason);
          const workerError = await parseWorkerErrorResponse(response);

          return createWorkerUnavailableResponse({
            request: canonicalRequest,
            reason,
            diagnostics: [
              startedDiagnostic,
              requestBuiltDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
                message: "Rendered capture worker HTTP request sent",
                details: {
                  endpointUrl,
                  correlationId,
                },
              }),
              responseReceivedDiagnostic,
              createDiagnostic({
                code: specific.code,
                severity: "warning",
                message: specific.message,
                details: {
                  status: response.status,
                  statusCode: response.status,
                  statusText: response.statusText,
                  endpointUrl,
                  elapsedMs: Date.now() - startedAt,
                  requestId: canonicalRequest.requestId,
                  stage: "http_response",
                  workerErrorCode: workerError.errorCode,
                  workerErrorMessage: workerError.errorMessage,
                  responseParsed: workerError.parsed,
                  correlationId,
                },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_REQUEST_FAILED",
                severity: "warning",
                message: "Rendered capture worker request failed",
                details: {
                  status: response.status,
                  statusCode: response.status,
                  statusText: response.statusText,
                  endpointUrl,
                  elapsedMs: Date.now() - startedAt,
                  requestId: canonicalRequest.requestId,
                  stage: "http_response",
                  workerErrorCode: workerError.errorCode,
                  workerErrorMessage: workerError.errorMessage,
                  responseParsed: workerError.parsed,
                  correlationId,
                },
              }),
              createDiagnostic({
                code: "RENDERED_CAPTURE_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker request failed",
                details: {
                  statusCode: response.status,
                  status: response.status,
                  statusText: response.statusText,
                  reason,
                  requestId: canonicalRequest.requestId,
                  workerErrorCode: workerError.errorCode,
                  workerErrorMessage: workerError.errorMessage,
                  responseParsed: workerError.parsed,
                  correlationId,
                },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_UNAVAILABLE",
                severity: "warning",
                message: "Rendered capture worker unavailable; importer should use fallback path",
                details: {
                  reason,
                  statusCode: response.status,
                  status: response.status,
                  requestId: canonicalRequest.requestId,
                  stage: "http_response",
                  workerErrorCode: workerError.errorCode,
                  workerErrorMessage: workerError.errorMessage,
                  responseParsed: workerError.parsed,
                  correlationId,
                },
              }),
            ],
          });
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!isWorkerResponseShape(payload)) {
          const reason: WorkerUnavailableReason = "worker_response_invalid";
          return createWorkerUnavailableResponse({
            request: canonicalRequest,
            reason,
            diagnostics: [
              startedDiagnostic,
              requestBuiltDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
                message: "Rendered capture worker HTTP request sent",
                details: {
                  endpointUrl,
                  correlationId,
                },
              }),
              responseReceivedDiagnostic,
              createDiagnostic({
                code: "CAPTURE_WORKER_RESPONSE_INVALID",
                severity: "warning",
                message: "Rendered capture worker returned invalid response contract",
                details: { endpointUrl, elapsedMs: Date.now() - startedAt, correlationId },
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

        const sanitizedPayload = sanitizeSuccessfulWorkerResponse({ payload });
        const responseDiagnostics = Array.isArray(sanitizedPayload.diagnostics) ? sanitizedPayload.diagnostics : [];
        const diagnosticsPrefix: RenderedCaptureDiagnostic[] = [
          startedDiagnostic,
          requestBuiltDiagnostic,
          createDiagnostic({
            code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
            message: "Rendered capture worker HTTP request sent",
            details: {
              endpointUrl,
              correlationId,
            },
          }),
          responseReceivedDiagnostic,
          createDiagnostic({
            code: "CAPTURE_WORKER_RESPONSE_PARSED",
            message: "Rendered capture worker response parsed and validated",
            details: {
              endpointUrl,
              status: sanitizedPayload.status,
            },
          }),
        ];

        if (sanitizedPayload.status === "failed") {
          const timeoutFailure = sanitizedPayload.failure?.failureClass === "timed_out";
          if (timeoutFailure && !responseDiagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_TIMEOUT")) {
            diagnosticsPrefix.push(
              createDiagnostic({
                code: "RENDERED_CAPTURE_TIMEOUT",
                severity: "warning",
                message: "Rendered capture worker execution timed out",
                details: {
                  endpointUrl,
                  failureCode: sanitizedPayload.failure?.failureCode ?? null,
                  retryable: sanitizedPayload.failure?.retryable ?? null,
                },
              }),
            );
          }
          diagnosticsPrefix.push(
            createDiagnostic({
              code: "CAPTURE_WORKER_EXECUTION_FAILED",
              severity: "warning",
              message: timeoutFailure
                ? "Rendered capture worker executed but capture timed out"
                : "Rendered capture worker executed but capture failed",
              details: {
                endpointUrl,
                failureClass: sanitizedPayload.failure?.failureClass ?? null,
                failureCode: sanitizedPayload.failure?.failureCode ?? null,
                retryable: sanitizedPayload.failure?.retryable ?? null,
              },
            }),
          );
        }

        sanitizedPayload.diagnostics = [...diagnosticsPrefix, ...responseDiagnostics];
        return sanitizedPayload;
      } catch (error) {
        const aborted = normalizeText((error as { name?: unknown })?.name) === "AbortError";
        const reason: WorkerUnavailableReason = aborted ? "worker_timeout" : "worker_unreachable";
        const specific = reasonToSpecificDiagnostic(reason);
        return createWorkerUnavailableResponse({
          request: canonicalRequest,
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
                correlationId,
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
                correlationId,
              },
            }),
            createDiagnostic({
              code: "RENDERED_CAPTURE_UNAVAILABLE",
              severity: "warning",
              message: aborted ? "Rendered capture worker request timed out" : "Rendered capture worker request failed",
              details: {
                reason,
                error: toErrorString(error),
                correlationId,
              },
            }),
            createDiagnostic({
              code: "CAPTURE_WORKER_UNAVAILABLE",
              severity: "warning",
              message: "Rendered capture worker unavailable; importer should use fallback path",
              details: { reason, error: toErrorString(error), correlationId },
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
