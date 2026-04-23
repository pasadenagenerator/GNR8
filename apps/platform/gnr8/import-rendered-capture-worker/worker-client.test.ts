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

function makeAvailableResponse(input: { requestId: string; domLength?: number; meaningfulNodeCount?: number; screenshotCount?: number }) {
  return {
    kind: "rendered_capture_worker_response_v1",
    contractVersion: "1.0.0",
    requestId: input.requestId,
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
      domLength: input.domLength ?? 120,
      meaningfulNodeCount: input.meaningfulNodeCount ?? 5,
      screenshotCount: input.screenshotCount ?? 0,
      computedStyleSampleCount: 0,
    },
    failure: null,
    timings: {
      queueLatencyMs: null,
      executionMs: 120,
      totalMs: 120,
    },
  };
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

test("http worker client sends expected auth/request headers and canonical payload", async () => {
  const request = makeRequest("req-success");
  let capturedUrl: string | null = null;
  let capturedHeaders: HeadersInit | undefined;
  let capturedBody: string | null = null;
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/api/internal/gnr8/rendered-capture-worker",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async (input, init) => {
      capturedUrl = String(input);
      capturedHeaders = init?.headers;
      capturedBody = typeof init?.body === "string" ? init.body : null;
      return new Response(JSON.stringify(makeAvailableResponse({ requestId: request.requestId })), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const response = await client.execute(request);
  assert.equal(response.status, "available");
  assert.equal(capturedUrl, "https://worker.example.com/api/internal/gnr8/rendered-capture-worker");

  const headers = new Headers(capturedHeaders);
  assert.equal(headers.get("x-gnr8-rendered-capture-worker-token"), "token-1");
  assert.equal(headers.get("authorization"), "Bearer token-1");
  assert.equal(headers.get("x-gnr8-request-id"), "req-success");
  assert.equal(headers.get("x-gnr8-correlation-id"), "req-success");

  assert.ok(capturedBody);
  const serializedPayload = JSON.parse(capturedBody ?? "{}");
  const canonicalJsonPayload = JSON.parse(JSON.stringify(canonicalizeRenderedCaptureWorkerRequest(request)));
  assert.deepEqual(serializedPayload, canonicalJsonPayload);

  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_PARSED"));
});

test("http worker client retries alternate endpoint path on 404", async () => {
  const request = makeRequest("req-404-fallback");
  const seenUrls: string[] = [];
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/api/internal/gnr8/rendered-capture-worker",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async (input) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.endsWith("/api/internal/gnr8/rendered-capture-worker")) {
        return new Response(JSON.stringify({ ok: false, error: { code: "NOT_FOUND" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(makeAvailableResponse({ requestId: request.requestId })), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const response = await client.execute(request);
  assert.equal(response.status, "available");
  assert.deepEqual(seenUrls, [
    "https://worker.example.com/api/internal/gnr8/rendered-capture-worker",
    "https://worker.example.com/internal/gnr8/rendered-capture-worker",
  ]);
});

test("http worker client classifies 401 unauthorized", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false, error: { code: "UNAUTHORIZED_WORKER_REQUEST" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
  });

  const response = await client.execute(makeRequest("req-unauthorized"));
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_UNAUTHORIZED"));
  const classified = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED");
  assert.equal((classified?.details as { failureClass?: string } | undefined)?.failureClass, "unauthorized");
});

test("http worker client classifies 500 as server_error", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () => new Response("boom", { status: 500, headers: { "content-type": "text/plain" } }),
  });

  const response = await client.execute(makeRequest("req-500"));
  const classified = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED");
  assert.equal((classified?.details as { failureClass?: string } | undefined)?.failureClass, "server_error");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_ERROR"));
});

test("http worker client classifies invalid JSON/shape as bad_response_shape", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () => new Response("{invalid-json", { status: 200, headers: { "content-type": "application/json" } }),
  });

  const response = await client.execute(makeRequest("req-invalid-shape"));
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_SHAPE_INVALID"));
  const classified = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_SHAPE_INVALID");
  assert.equal((classified?.details as { failureClass?: string } | undefined)?.failureClass, "bad_response_shape");
});

test("http worker client classifies thrown fetch error as network_error", async () => {
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () => {
      throw new Error("connect ECONNREFUSED");
    },
  });

  const response = await client.execute(makeRequest("req-network-error"));
  assert.equal(response.status, "unsupported");
  const classified = response.diagnostics.find((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED");
  assert.equal((classified?.details as { failureClass?: string } | undefined)?.failureClass, "network_error");
});

test("http worker client rejects empty render success as execution failure", async () => {
  const request = makeRequest("req-empty-success");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify(
          makeAvailableResponse({
            requestId: request.requestId,
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
          }),
        ),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "failed");
  assert.equal(response.failure?.failureCode, "CAPTURE_WORKER_EMPTY_RENDER_RESULT");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_EMPTY_RENDER_RESULT"));
});

test("http worker client keeps timeout payload as execution timeout (not transport failure)", async () => {
  const request = makeRequest("req-timeout-payload");
  const client = createHttpRenderedCaptureWorkerClient({
    endpointUrl: "https://worker.example.com/capture",
    sharedToken: "token-1",
    timeoutMs: 10_000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ...makeAvailableResponse({ requestId: request.requestId }),
          status: "failed",
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
