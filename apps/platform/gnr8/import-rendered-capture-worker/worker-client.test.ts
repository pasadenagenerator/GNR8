import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpRenderedCaptureWorkerClient,
  createRenderedCaptureWorkerClientFromConfig,
  createUnavailableRenderedCaptureWorkerClient,
} from "@/gnr8/import-rendered-capture-worker/worker-client";
import { createRenderedCaptureWorkerRequest } from "@/gnr8/import-rendered-capture-worker/worker-contract";

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
    },
  });

  const response = await client.execute(makeRequest("req-not-configured"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_NOT_CONFIGURED"));
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
      ),
  });

  const response = await client.execute(request);
  assert.equal(response.status, "available");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_REQUEST_SENT"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_PARSED"));
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
