import assert from "node:assert/strict";
import test from "node:test";

import {
  createHttpRenderedCaptureWorkerClient,
  createUnavailableRenderedCaptureWorkerClient,
} from "@/gnr8/import-rendered-capture-worker/worker-client";
import { createRenderedCaptureWorkerRequest } from "@/gnr8/import-rendered-capture-worker/worker-contract";

test("unavailable worker client returns deterministic unsupported response shape", async () => {
  const client = createUnavailableRenderedCaptureWorkerClient({ reason: "worker_unreachable" });
  const request = createRenderedCaptureWorkerRequest({
    requestId: "req-2",
    importId: "import-2",
    sourceUrl: "https://example.com/",
    viewport: { width: 1366, height: 768 },
    readinessPolicy: {
      navigationTimeoutMs: 20000,
      networkQuietTimeoutMs: 4000,
      domStabilizationWindowMs: 2500,
      domStabilizationPollMs: 250,
      maxTotalCaptureMs: 30000,
    },
    timeoutBudgetMs: 30000,
  });

  const response = await client.execute(request);
  assert.equal(response.kind, "rendered_capture_worker_response_v1");
  assert.equal(response.status, "unsupported");
  assert.equal(response.requestId, request.requestId);
  assert.equal(response.environment.environmentSupported, false);
  assert.equal(response.failure?.failureClass, "environment_unsupported");
  assert.equal(response.failure?.failureCode, "WORKER_UNAVAILABLE");
  assert.equal(response.failure?.retryable, true);
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

  const request = createRenderedCaptureWorkerRequest({
    requestId: "req-3",
    importId: "import-3",
    sourceUrl: "https://example.com/",
    viewport: { width: 1366, height: 768 },
    readinessPolicy: {
      navigationTimeoutMs: 20000,
      networkQuietTimeoutMs: 4000,
      domStabilizationWindowMs: 2500,
      domStabilizationPollMs: 250,
      maxTotalCaptureMs: 30000,
    },
    timeoutBudgetMs: 30000,
  });

  const response = await client.execute(request);
  assert.equal(response.status, "unsupported");
  assert.ok(response.diagnostics.some((entry) => entry.code === "CAPTURE_WORKER_RESPONSE_INVALID"));
  assert.ok(response.diagnostics.some((entry) => entry.code === "RENDERED_CAPTURE_UNAVAILABLE"));
});
