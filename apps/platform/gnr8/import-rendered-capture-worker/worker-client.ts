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

type HttpFailureClass = "not_found" | "unauthorized" | "forbidden" | "bad_response_shape" | "server_error" | "network_error";

const AUTH_HEADER_NAME = "x-gnr8-rendered-capture-worker-token" as const;
const AUTHORIZATION_HEADER_NAME = "authorization" as const;
const EXPECTED_SUCCESS_STATUS_CODES = [200] as const;
const MAX_RESPONSE_SNIPPET_CHARS = 400;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function boundedSnippet(value: string): string {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= MAX_RESPONSE_SNIPPET_CHARS) return normalized;
  return `${normalized.slice(0, MAX_RESPONSE_SNIPPET_CHARS)}...`;
}

function tryParseJson(text: string): unknown {
  if (!normalizeText(text)) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseWorkerErrorPayload(input: {
  response: Response;
  bodyText: string;
}): {
  parsed: boolean;
  errorCode: string | null;
  errorMessage: string | null;
} {
  const contentType = normalizeText(input.response.headers.get("content-type")).toLowerCase();
  if (!contentType.includes("application/json")) {
    return { parsed: false, errorCode: null, errorMessage: null };
  }

  const parsed = tryParseJson(input.bodyText);
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

function classifyFailureFromStatus(status: number): {
  reason: WorkerUnavailableReason;
  failureClass: HttpFailureClass;
} {
  if (status === 401) {
    return { reason: "worker_unauthorized", failureClass: "unauthorized" };
  }
  if (status === 403) {
    return { reason: "worker_unauthorized", failureClass: "forbidden" };
  }
  if (status === 404) {
    return { reason: "worker_http_error", failureClass: "not_found" };
  }
  if (status >= 500) {
    return { reason: "worker_http_error", failureClass: "server_error" };
  }
  return { reason: "worker_http_error", failureClass: "network_error" };
}

function resolveAlternateEndpointUrl(endpointUrl: string): string | null {
  try {
    const parsed = new URL(endpointUrl);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    if (normalizedPath === "/api/internal/gnr8/rendered-capture-worker") {
      parsed.pathname = "/internal/gnr8/rendered-capture-worker";
      return parsed.toString();
    }
    if (normalizedPath === "/internal/gnr8/rendered-capture-worker") {
      parsed.pathname = "/api/internal/gnr8/rendered-capture-worker";
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function resolveEndpointCandidates(endpointUrl: string): string[] {
  const primary = normalizeText(endpointUrl);
  if (!primary) return [];
  const alternate = resolveAlternateEndpointUrl(primary);
  if (!alternate || alternate === primary) return [primary];
  return [primary, alternate];
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

function hasRenderedDomContent(payload: RenderedCaptureWorkerResponse): boolean {
  const qualityDomLength = Number(payload.qualitySummary?.domLength ?? 0);
  if (Number.isFinite(qualityDomLength) && qualityDomLength > 0) return true;

  return payload.artifacts.some((artifact) => {
    if (artifact.artifactType !== "rendered_dom_html") return false;
    const byteLength = Number(artifact.byteLength ?? 0);
    if (Number.isFinite(byteLength) && byteLength > 0) return true;
    const uri = normalizeText(artifact.uri);
    return uri.startsWith("data:text/html") && uri.length > 25;
  });
}

function isEmptyRenderSuccess(payload: RenderedCaptureWorkerResponse): boolean {
  const successStatus = payload.status === "available" || payload.status === "partial";
  if (!successStatus) return false;

  const domNodeCount = Number(payload.qualitySummary?.meaningfulNodeCount ?? 0);
  const screenshotCount = Number(payload.qualitySummary?.screenshotCount ?? 0);
  const hasDom = hasRenderedDomContent(payload);
  return domNodeCount <= 0 && screenshotCount <= 0 && !hasDom;
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

function withFailureDiagnostics(input: {
  request: RenderedCaptureWorkerRequest;
  reason: WorkerUnavailableReason;
  diagnostics: RenderedCaptureDiagnostic[];
  message: string;
  details?: Record<string, unknown>;
}): RenderedCaptureWorkerResponse {
  const specific = reasonToSpecificDiagnostic(input.reason);
  return createWorkerUnavailableResponse({
    request: input.request,
    reason: input.reason,
    diagnostics: [
      ...input.diagnostics,
      createDiagnostic({
        code: specific.code,
        severity: "warning",
        message: specific.message,
        details: input.details,
      }),
      createDiagnostic({
        code: "CAPTURE_WORKER_REQUEST_FAILED",
        severity: "warning",
        message: input.message,
        details: input.details,
      }),
      createDiagnostic({
        code: "RENDERED_CAPTURE_UNAVAILABLE",
        severity: "warning",
        message: input.message,
        details: {
          reason: input.reason,
          ...(input.details ?? {}),
        },
      }),
      createDiagnostic({
        code: "CAPTURE_WORKER_UNAVAILABLE",
        severity: "warning",
        message: "Rendered capture worker unavailable; importer should use fallback path",
        details: {
          reason: input.reason,
          ...(input.details ?? {}),
        },
      }),
    ],
  });
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
      const endpointCandidates = resolveEndpointCandidates(endpointUrl);

      const diagnosticsPrefix: RenderedCaptureDiagnostic[] = [
        createDiagnostic({
          code: "CAPTURE_WORKER_REQUEST_STARTED",
          message: "Rendered capture worker request started",
          details: {
            endpointUrl,
            endpointCandidates,
            method: "POST",
            requestId: canonicalRequest.requestId,
            importId: canonicalRequest.importId,
            correlationId,
            timeoutMs,
            expectedSuccessStatusCodes: [...EXPECTED_SUCCESS_STATUS_CODES],
          },
        }),
        createDiagnostic({
          code: "CAPTURE_WORKER_REQUEST_BUILT",
          message: "Rendered capture worker request payload built",
          details: {
            endpointUrl,
            endpointCandidates,
            requestId: canonicalRequest.requestId,
            contractVersion: canonicalRequest.contractVersion,
            kind: canonicalRequest.kind,
            method: "POST",
            authHeaderName: AUTH_HEADER_NAME,
            authFormat: "raw_shared_token",
            authorizationHeaderName: AUTHORIZATION_HEADER_NAME,
            authorizationFormat: "Bearer <shared_token>",
            hasRequestBody: requestBody.length > 0,
            timeoutMs,
          },
        }),
      ];

      if (endpointCandidates.length === 0) {
        return withFailureDiagnostics({
          request: canonicalRequest,
          reason: "worker_not_configured",
          diagnostics: diagnosticsPrefix,
          message: "Rendered capture worker endpoint URL could not be resolved",
          details: {
            endpointUrl,
          },
        });
      }

      let lastErrorResponse: RenderedCaptureWorkerResponse | null = null;

      for (let attempt = 0; attempt < endpointCandidates.length; attempt += 1) {
        const attemptedEndpointUrl = endpointCandidates[attempt];
        const hasNextCandidate = attempt < endpointCandidates.length - 1;
        const requestSentAt = Date.now();

        try {
          const response = await fetchImpl(attemptedEndpointUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              [AUTH_HEADER_NAME]: sharedToken,
              [AUTHORIZATION_HEADER_NAME]: `Bearer ${sharedToken}`,
              "x-gnr8-request-id": canonicalRequest.requestId,
              "x-gnr8-correlation-id": correlationId,
            },
            body: requestBody,
            signal: AbortSignal.timeout(timeoutMs),
            cache: "no-store",
          });

          const responseText = await response.text().catch(() => "");
          const responseSnippet = boundedSnippet(responseText);
          const errorPayload = parseWorkerErrorPayload({ response, bodyText: responseText });
          const { reason: classifiedReason, failureClass } = classifyFailureFromStatus(response.status);

          diagnosticsPrefix.push(
            createDiagnostic({
              code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
              message: "Rendered capture worker HTTP request sent",
              details: {
                endpointUrl: attemptedEndpointUrl,
                method: "POST",
                attempt,
                attemptCount: endpointCandidates.length,
                correlationId,
              },
            }),
            createDiagnostic({
              code: "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED",
              message: "Rendered capture worker HTTP response received",
              details: {
                endpointUrl: attemptedEndpointUrl,
                status: response.status,
                statusCode: response.status,
                statusText: response.statusText,
                requestLatencyMs: Date.now() - requestSentAt,
                attempt,
                attemptCount: endpointCandidates.length,
                correlationId,
              },
            }),
            createDiagnostic({
              code: "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED",
              message: "Rendered capture worker HTTP response classified",
              severity: response.ok ? "info" : "warning",
              details: {
                endpointUrl: attemptedEndpointUrl,
                attempt,
                attemptCount: endpointCandidates.length,
                statusCode: response.status,
                statusText: response.statusText,
                failureClass,
                workerErrorCode: errorPayload.errorCode,
                workerErrorMessage: errorPayload.errorMessage,
                responseParsed: errorPayload.parsed,
                responseSnippet,
                correlationId,
              },
            }),
          );

          if (!response.ok) {
            if (response.status === 404 && hasNextCandidate) {
              diagnosticsPrefix.push(
                createDiagnostic({
                  code: "CAPTURE_WORKER_HTTP_ERROR",
                  severity: "warning",
                  message: "Rendered capture worker endpoint returned not found; retrying alternate path",
                  details: {
                    endpointUrl: attemptedEndpointUrl,
                    nextEndpointUrl: endpointCandidates[attempt + 1],
                    attempt,
                    attemptCount: endpointCandidates.length,
                    statusCode: response.status,
                    statusText: response.statusText,
                    failureClass,
                    responseSnippet,
                    correlationId,
                  },
                }),
              );
              continue;
            }

            lastErrorResponse = withFailureDiagnostics({
              request: canonicalRequest,
              reason: classifiedReason,
              diagnostics: diagnosticsPrefix,
              message: "Rendered capture worker request failed",
              details: {
                endpointUrl: attemptedEndpointUrl,
                attempt,
                attemptCount: endpointCandidates.length,
                elapsedMs: Date.now() - startedAt,
                statusCode: response.status,
                statusText: response.statusText,
                failureClass,
                workerErrorCode: errorPayload.errorCode,
                workerErrorMessage: errorPayload.errorMessage,
                responseParsed: errorPayload.parsed,
                responseSnippet,
                stage: "http_response",
                correlationId,
              },
            });
            break;
          }

          const parsedPayload = tryParseJson(responseText);
          if (!isWorkerResponseShape(parsedPayload)) {
            lastErrorResponse = withFailureDiagnostics({
              request: canonicalRequest,
              reason: "worker_response_invalid",
              diagnostics: [
                ...diagnosticsPrefix,
                createDiagnostic({
                  code: "CAPTURE_WORKER_RESPONSE_SHAPE_INVALID",
                  severity: "warning",
                  message: "Rendered capture worker response shape invalid",
                  details: {
                    endpointUrl: attemptedEndpointUrl,
                    statusCode: response.status,
                    failureClass: "bad_response_shape" satisfies HttpFailureClass,
                    responseSnippet,
                    attempt,
                    attemptCount: endpointCandidates.length,
                    correlationId,
                  },
                }),
              ],
              message: "Rendered capture worker returned invalid response contract",
              details: {
                endpointUrl: attemptedEndpointUrl,
                statusCode: response.status,
                failureClass: "bad_response_shape",
                responseSnippet,
                attempt,
                attemptCount: endpointCandidates.length,
                correlationId,
              },
            });
            break;
          }

          const sanitizedPayload = sanitizeSuccessfulWorkerResponse({ payload: parsedPayload });
          const responseDiagnostics = Array.isArray(sanitizedPayload.diagnostics) ? sanitizedPayload.diagnostics : [];
          const successDiagnosticsPrefix: RenderedCaptureDiagnostic[] = [
            ...diagnosticsPrefix,
            createDiagnostic({
              code: "CAPTURE_WORKER_RESPONSE_PARSED",
              message: "Rendered capture worker response parsed and validated",
              details: {
                endpointUrl: attemptedEndpointUrl,
                status: sanitizedPayload.status,
                attempt,
                attemptCount: endpointCandidates.length,
                correlationId,
              },
            }),
          ];

          if (isEmptyRenderSuccess(sanitizedPayload)) {
            successDiagnosticsPrefix.push(
              createDiagnostic({
                code: "CAPTURE_WORKER_EMPTY_RENDER_RESULT",
                severity: "warning",
                message: "Rendered capture worker responded but returned no usable evidence",
                details: {
                  endpointUrl: attemptedEndpointUrl,
                  domNodeCount: sanitizedPayload.qualitySummary.meaningfulNodeCount,
                  screenshotCount: sanitizedPayload.qualitySummary.screenshotCount,
                  domLength: sanitizedPayload.qualitySummary.domLength,
                  attempt,
                  attemptCount: endpointCandidates.length,
                  correlationId,
                },
              }),
            );

            sanitizedPayload.status = "failed";
            sanitizedPayload.failure = {
              failureClass: "dom_empty_after_render",
              failureCode: "CAPTURE_WORKER_EMPTY_RENDER_RESULT",
              retryable: true,
              message: "Rendered capture worker returned no usable evidence",
            };
          }

          if (sanitizedPayload.status === "failed") {
            const timeoutFailure = sanitizedPayload.failure?.failureClass === "timed_out";
            if (timeoutFailure && !responseDiagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_TIMEOUT")) {
              successDiagnosticsPrefix.push(
                createDiagnostic({
                  code: "RENDERED_CAPTURE_TIMEOUT",
                  severity: "warning",
                  message: "Rendered capture worker execution timed out",
                  details: {
                    endpointUrl: attemptedEndpointUrl,
                    failureCode: sanitizedPayload.failure?.failureCode ?? null,
                    retryable: sanitizedPayload.failure?.retryable ?? null,
                    correlationId,
                  },
                }),
              );
            }
            successDiagnosticsPrefix.push(
              createDiagnostic({
                code: "CAPTURE_WORKER_EXECUTION_FAILED",
                severity: "warning",
                message: timeoutFailure
                  ? "Rendered capture worker executed but capture timed out"
                  : "Rendered capture worker executed but capture failed",
                details: {
                  endpointUrl: attemptedEndpointUrl,
                  failureClass: sanitizedPayload.failure?.failureClass ?? null,
                  failureCode: sanitizedPayload.failure?.failureCode ?? null,
                  retryable: sanitizedPayload.failure?.retryable ?? null,
                  correlationId,
                },
              }),
            );
          }

          sanitizedPayload.diagnostics = [...successDiagnosticsPrefix, ...responseDiagnostics];
          return sanitizedPayload;
        } catch (error) {
          const aborted = normalizeText((error as { name?: unknown })?.name) === "AbortError";
          const reason: WorkerUnavailableReason = aborted ? "worker_timeout" : "worker_unreachable";
          const failureClass: HttpFailureClass = "network_error";

          lastErrorResponse = withFailureDiagnostics({
            request: canonicalRequest,
            reason,
            diagnostics: [
              ...diagnosticsPrefix,
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_REQUEST_SENT",
                message: "Rendered capture worker HTTP request sent",
                details: {
                  endpointUrl: attemptedEndpointUrl,
                  method: "POST",
                  attempt,
                  attemptCount: endpointCandidates.length,
                  correlationId,
                },
              }),
              createDiagnostic({
                code: "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED",
                severity: "warning",
                message: "Rendered capture worker HTTP response classified",
                details: {
                  endpointUrl: attemptedEndpointUrl,
                  attempt,
                  attemptCount: endpointCandidates.length,
                  failureClass,
                  responseSnippet: "",
                  networkError: toErrorString(error),
                  correlationId,
                },
              }),
            ],
            message: aborted ? "Rendered capture worker request timed out" : "Rendered capture worker request failed",
            details: {
              endpointUrl: attemptedEndpointUrl,
              attempt,
              attemptCount: endpointCandidates.length,
              elapsedMs: Date.now() - startedAt,
              timeoutMs,
              error: toErrorString(error),
              failureClass,
              stage: "network",
              correlationId,
            },
          });
          break;
        }
      }

      if (lastErrorResponse) return lastErrorResponse;

      return withFailureDiagnostics({
        request: canonicalRequest,
        reason: "worker_http_error",
        diagnostics: diagnosticsPrefix,
        message: "Rendered capture worker request failed",
        details: {
          endpointUrl,
          elapsedMs: Date.now() - startedAt,
          stage: "unknown",
          correlationId,
        },
      });
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
      authHeaderName: AUTH_HEADER_NAME,
      authorizationHeaderName: AUTHORIZATION_HEADER_NAME,
      method: "POST",
      expectedSuccessStatusCodes: [...EXPECTED_SUCCESS_STATUS_CODES],
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
