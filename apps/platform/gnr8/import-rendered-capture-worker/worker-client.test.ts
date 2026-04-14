import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpRenderedCaptureWorkerClient,
  createRenderedCaptureWorkerClientFromConfig,
  createRenderedCaptureWorkerClientFromEnv,
  createUnavailableRenderedCaptureWorkerClient,
} from "@/gnr8/import-rendered-capture-worker/worker-client";
import {
  canonicalizeRenderedCaptureWorkerRequest,
  createRenderedCaptureWorkerRequest,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

function makeRequest(requestId = "req-1") {
  return createRenderedCaptureWorkerRequest({
    requestId,
    importId: "import-1",
    sourceUrl: "https://example.com/",
    viewport: { width: 1366, height: 768 },
    readinessPolicy: {
      navigationTimeoutMs: 20_000,
      networkQuietTimeoutMs: 4_000,
      domStabilizationWindowMs: 2_500,
      domStabilizationPollMs: 250,
      maxTotalCaptureMs: 30_000,
    },
    timeoutBudgetMs: 30_000,
  });
}

test("unavailable worker client returns deterministic unsupported response shape", async () => {
  const client = createUnavailableRenderedCaptureWorkerClient({ reason: "worker_unreachable" });
  const request = makeRequest("req-2");

  const response = await client.execute(request);
  assert.equal(response.kind, "rendered_capture_worker_response_v1");
  assert.equal(response.status, "unsupported");
  assert.equal(response.requestId, request.requestId);
  assert.equal(response.environment.environmentSupported, false);
  assert.equal(response.failure?.failureClass, "environment_unsupported");
  assert.equal(response.failure?.failureCode, "WORKER_UNAVAILABLE");
  assert.equal(response.failure?.retryable, true);
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_UNAVAILABLE"));
});

test("config without endpoint emits CAPTURE_WORKER_NOT_CONFIGURED", async () => {
  const client = createRenderedCaptureWorkerClientFromConfig({
    config: {
      enabled: true,
      endpointUrl: null,
      sharedToken: "token",
      timeoutMs: 10_000,
      endpointPath: "/api/internal/gnr8/rendered-capture-worker",
      resolvedBaseUrl: null,
      resolvedBaseUrlSource: null,
      configStatus: "missing_base_url",
    },
  });

  const response = await client.execute(makeRequest("req-not-configured"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_NOT_CONFIGURED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"));
});

test("disabled worker config emits CAPTURE_WORKER_DISABLED", async () => {
  const client = createRenderedCaptureWorkerClientFromConfig({
    config: {
      enabled: false,
      endpointUrl: "https://worker.example.com/capture",
      sharedToken: "token",
      timeoutMs: 10_000,
      endpointPath: "/capture",
      resolvedBaseUrl: "https://worker.example.com",
      resolvedBaseUrlSource: "worker_base_url",
      configStatus: "disabled",
    },
  });

  const response = await client.execute(makeRequest("req-disabled"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_DISABLED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"));
});

test("http worker client maps unauthorized response to CAPTURE_WORKER_UNAUTHORIZED", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
  });

  const response = await client.execute(makeRequest("req-unauthorized"));
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAUTHORIZED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED"));
  const unauthorized = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_UNAUTHORIZED");
  assert.equal(
    (unauthorized?.details as { statusCode?: number; responseParsed?: boolean } | undefined)?.statusCode,
    401,
  );
  assert.equal(
    (unauthorized?.details as { statusCode?: number; responseParsed?: boolean } | undefined)?.responseParsed,
    true,
  );
});

test("http worker client maps timeout to CAPTURE_WORKER_TIMEOUT", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () => {
      const error = Object.assign(new Error("timed out"), { name: "AbortError" });
      throw error;
    },
  });

  const response = await client.execute(makeRequest("req-timeout"));
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_TIMEOUT"));
});

test("env-backed worker client uses external base URL and degrades safely when unreachable", async () => {
  let capturedUrl: string | null = null;
  const client = createRenderedCaptureWorkerClientFromEnv({
    env: {
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://railway-worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token-1",
    } as unknown as NodeJS.ProcessEnv,
    fetchImpl: async (input) => {
      capturedUrl = String(input);
      throw new Error("network down");
    },
  });

  const response = await client.execute(makeRequest("req-env-unreachable"));
  assert.equal(capturedUrl, "https://railway-worker.example/api/internal/gnr8/rendered-capture-worker");
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_UNAVAILABLE"));
});

test("http worker client maps invalid response contract to deterministic unsupported response", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  const response = await client.execute(makeRequest("req-invalid"));
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_INVALID"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_UNAVAILABLE"));
});

test("http worker client preserves successful contract and adds call-path diagnostics", async () => {
  const request = makeRequest("req-success");
  let capturedUrl: string | null = null;
  let capturedHeaders: HeadersInit | undefined;
  let capturedBody: string | null = null;
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers;
      capturedBody = typeof init?.body === "string" ? init.body : null;
      return new Response(
        JSON.stringify({
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "available",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [],
          qualitySummary: {
            renderedDomQuality: "strong",
            domLength: 100,
            meaningfulNodeCount: 5,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: null,
          timings: {
            queueLatencyMs: null,
            executionMs: 120,
            totalMs: 120,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });

  const response = await client.execute(request);
  assert.equal(response.status, "available");
  assert.equal(capturedUrl, "https://worker.example.com/capture");
  const headers = new Headers(capturedHeaders);
  assert.equal(headers.get("x-gnr8-rendered-capture-worker-token"), "token-1");
  assert.equal(headers.get("x-gnr8-request-id"), "req-success");
  assert.equal(headers.get("x-gnr8-correlation-id"), "req-success");
  assert.ok(capturedBody);
  const serializedPayload = JSON.parse(capturedBody ?? "{}");
  const canonicalJsonPayload = JSON.parse(JSON.stringify(canonicalizeRenderedCaptureWorkerRequest(request)));
  assert.deepEqual(serializedPayload, canonicalJsonPayload);
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_REQUEST_SENT"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_PARSED"));
});

test("http worker client enriches CAPTURE_WORKER_HTTP_ERROR with status code and worker error details", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "INVALID_WORKER_REQUEST",
            message: "request invalid",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(makeRequest("req-http-400"));
  const httpError = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR");
  assert.ok(httpError);
  assert.equal(
    (httpError?.details as { statusCode?: number; workerErrorCode?: string; responseParsed?: boolean } | undefined)?.statusCode,
    400,
  );
  assert.equal(
    (httpError?.details as { statusCode?: number; workerErrorCode?: string; responseParsed?: boolean } | undefined)
      ?.workerErrorCode,
    "INVALID_WORKER_REQUEST",
  );
  assert.equal(
    (httpError?.details as { statusCode?: number; workerErrorCode?: string; responseParsed?: boolean } | undefined)
      ?.responseParsed,
    true,
  );
});

test("http worker client distinguishes execution-failed worker response", async () => {
  const request = makeRequest("req-failed");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "failed",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [],
          qualitySummary: {
            renderedDomQuality: "unusable",
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "navigation_failed",
            failureCode: "NAVIGATION_FAILED",
            retryable: true,
            message: "nav failed",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 120,
            totalMs: 120,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "failed");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_EXECUTION_FAILED"));
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"), false);
});

test("http worker client classifies HTTP 200 timeout payload as execution timeout (not transport failure)", async () => {
  const request = makeRequest("req-timeout-payload");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "failed",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [],
          qualitySummary: {
            renderedDomQuality: "unusable",
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "timed_out",
            failureCode: "RENDERED_CAPTURE_TIMEOUT",
            retryable: true,
            message: "timed out",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 120,
            totalMs: 120,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "failed");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_PARSED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_TIMEOUT"));
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"), false);
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"), false);
});

test("http worker client keeps worker-phase timeout truth without transport misclassification", async () => {
  const request = makeRequest("req-phase-timeout-payload");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "failed",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [
            {
              code: "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT",
              severity: "warning",
              message: "style phase timeout",
            },
            {
              code: "RENDERED_CAPTURE_TIMEOUT",
              severity: "warning",
              message: "timeout",
            },
          ],
          qualitySummary: {
            renderedDomQuality: "unusable",
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "timed_out",
            failureCode: "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT",
            retryable: true,
            message: "style timeout",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 120,
            totalMs: 120,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "failed");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_TIMEOUT"));
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"), false);
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"), false);
});

test("http worker client sanitizes stale transport-failure diagnostics for successful worker payloads", async () => {
  const request = makeRequest("req-success-sanitized");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "available",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [
            { code: "CAPTURE_WORKER_HTTP_ERROR", severity: "warning", message: "stale transport failure" },
            { code: "CAPTURE_WORKER_REQUEST_FAILED", severity: "warning", message: "stale request failure" },
            { code: "CAPTURE_WORKER_UNAVAILABLE", severity: "warning", message: "stale unavailable mapping" },
          ],
          qualitySummary: {
            renderedDomQuality: "strong",
            domLength: 100,
            meaningfulNodeCount: 5,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "internal_error",
            failureCode: "STALE_FAILURE",
            retryable: true,
            message: "stale failure",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 120,
            totalMs: 120,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "available");
  assert.equal(response.failure, null);
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"), false);
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_REQUEST_FAILED"), false);
  assert.equal(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAVAILABLE"), false);
});

test("env client emits URL resolution diagnostics for missing endpoint/token configuration", async () => {
  const client = createRenderedCaptureWorkerClientFromEnv({
    env: {
      NODE_ENV: "development",
    } as unknown as NodeJS.ProcessEnv,
  });

  const response = await client.execute(makeRequest("req-env-config-missing"));
  const resolved = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_URL_RESOLVED");
  assert.ok(resolved);
  assert.equal(resolved?.severity, "warning");
  assert.equal(
    (resolved?.details as { endpointConfigured?: boolean; sharedTokenConfigured?: boolean } | undefined)?.endpointConfigured,
    false,
  );
  assert.equal(
    (resolved?.details as { endpointConfigured?: boolean; sharedTokenConfigured?: boolean } | undefined)?.sharedTokenConfigured,
    false,
  );
});
