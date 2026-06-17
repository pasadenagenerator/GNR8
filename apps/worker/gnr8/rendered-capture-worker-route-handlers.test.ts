import assert from "node:assert/strict";
import test from "node:test";

import { POST as compatibilityRoutePost } from "@/app/api/internal/gnr8/rendered-capture-worker/route";
import { POST as primaryRoutePost } from "@/app/internal/gnr8/rendered-capture-worker/route";
import {
  createRenderedCaptureWorkerRequest,
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
  type RenderedCaptureWorkerRequest,
  type RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";
import { createWorkerRenderedCaptureRouteHandlers } from "@/gnr8/rendered-capture-worker-route-handlers";

const SHARED_TOKEN = "test-worker-token";

function makeWorkerRequest(): RenderedCaptureWorkerRequest {
  return createRenderedCaptureWorkerRequest({
    requestId: "req-route-1",
    importId: "import-route-1",
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

function makeWorkerResponse(request: RenderedCaptureWorkerRequest): RenderedCaptureWorkerResponse {
  return {
    kind: "rendered_capture_worker_response_v1",
    contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
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
    layoutGeometryEvidence: [],
    diagnostics: [],
    qualitySummary: {
      renderedDomQuality: "strong",
      domLength: 120,
      meaningfulNodeCount: 2,
      screenshotCount: 0,
      computedStyleSampleCount: 0,
    },
    failure: null,
    timings: {
      queueLatencyMs: null,
      executionMs: 5,
      totalMs: 5,
    },
  };
}

function requestFor(path: string, input?: { token?: string; body?: unknown }): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (input?.token) {
    headers["x-gnr8-rendered-capture-worker-token"] = input.token;
  }
  return new Request(`https://worker.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input?.body ?? makeWorkerRequest()),
  });
}

test("worker primary rendered-capture POST route exists", () => {
  assert.equal(typeof primaryRoutePost, "function");
});

test("worker compatibility rendered-capture POST route exists and uses the same handler", () => {
  assert.equal(typeof compatibilityRoutePost, "function");
  assert.equal(compatibilityRoutePost, primaryRoutePost);
});

test("worker rendered-capture route rejects missing and invalid auth as JSON", async () => {
  const handlers = createWorkerRenderedCaptureRouteHandlers({
    sharedToken: SHARED_TOKEN,
    executeRequest: async ({ request }) => makeWorkerResponse(request),
    logger: () => {},
  });

  for (const token of [undefined, "wrong-token"]) {
    const response = await handlers.POST(requestFor("/internal/gnr8/rendered-capture-worker", { token }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
    const text = await response.text();
    assert.doesNotMatch(text, /<html/i);
    assert.doesNotMatch(text, new RegExp(SHARED_TOKEN));
    const payload = JSON.parse(text) as { error?: { code?: string } };
    assert.equal(payload.error?.code, "UNAUTHORIZED_WORKER_REQUEST");
  }
});

test("worker rendered-capture primary route reaches delegated handler with valid auth", async () => {
  let capturedRequest: RenderedCaptureWorkerRequest | null = null;
  const handlers = createWorkerRenderedCaptureRouteHandlers({
    sharedToken: SHARED_TOKEN,
    executeRequest: async ({ request }) => {
      capturedRequest = request;
      return makeWorkerResponse(request);
    },
    logger: () => {},
  });

  const response = await handlers.POST(
    requestFor("/internal/gnr8/rendered-capture-worker", { token: SHARED_TOKEN }),
  );

  assert.equal(response.status, 200);
  assert.equal(capturedRequest?.requestId, "req-route-1");
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  const text = await response.text();
  assert.doesNotMatch(text, /<html/i);
  assert.doesNotMatch(text, new RegExp(SHARED_TOKEN));
  const payload = JSON.parse(text) as {
    kind?: string;
    contractVersion?: string;
    requestId?: string;
    status?: string;
  };
  assert.equal(payload.kind, "rendered_capture_worker_response_v1");
  assert.equal(payload.contractVersion, RENDERED_CAPTURE_WORKER_CONTRACT_VERSION);
  assert.equal(payload.requestId, "req-route-1");
  assert.equal(payload.status, "available");
});

test("worker rendered-capture compatibility route reaches the same delegated handler", async () => {
  let calls = 0;
  const handlers = createWorkerRenderedCaptureRouteHandlers({
    sharedToken: SHARED_TOKEN,
    executeRequest: async ({ request }) => {
      calls += 1;
      return makeWorkerResponse(request);
    },
    logger: () => {},
  });

  const response = await handlers.POST(
    requestFor("/api/internal/gnr8/rendered-capture-worker", { token: SHARED_TOKEN }),
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  const payload = (await response.json()) as { kind?: string };
  assert.equal(payload.kind, "rendered_capture_worker_response_v1");
});
