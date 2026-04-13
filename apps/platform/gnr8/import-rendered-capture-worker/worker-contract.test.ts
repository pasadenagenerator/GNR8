import assert from "node:assert/strict";
import test from "node:test";

import {
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
  canonicalizeRenderedCaptureWorkerRequest,
  createRenderedCaptureWorkerRequest,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

test("createRenderedCaptureWorkerRequest normalizes bounds and defaults deterministically", () => {
  const request = createRenderedCaptureWorkerRequest({
    requestId: " req-1 ",
    importId: " import-1 ",
    sourceUrl: " https://example.com/ ",
    viewport: { width: 99999, height: -1 },
    readinessPolicy: {
      navigationTimeoutMs: -500,
      networkQuietTimeoutMs: 999999,
      domStabilizationWindowMs: 999999,
      domStabilizationPollMs: -1,
      maxTotalCaptureMs: 999999,
      shellContentMinLength: -3,
      shellDetectionRetryCount: 999,
      shellDetectionRetryDelayMs: 999999,
    },
    timeoutBudgetMs: 0,
  });

  assert.equal(request.kind, "rendered_capture_worker_request_v1");
  assert.equal(request.contractVersion, RENDERED_CAPTURE_WORKER_CONTRACT_VERSION);
  assert.equal(request.requestId, "req-1");
  assert.equal(request.importId, "import-1");
  assert.equal(request.sourceUrl, "https://example.com/");
  assert.equal(request.capture.viewport.width, 3840);
  assert.equal(request.capture.viewport.height, 320);
  assert.equal(request.capture.readinessPolicy.navigationTimeoutMs, 1000);
  assert.equal(request.capture.readinessPolicy.networkQuietTimeoutMs, 30000);
  assert.equal(request.capture.readinessPolicy.domStabilizationWindowMs, 30000);
  assert.equal(request.capture.readinessPolicy.domStabilizationPollMs, 50);
  assert.equal(request.capture.readinessPolicy.maxTotalCaptureMs, 180000);
  assert.equal(request.capture.readinessPolicy.shellContentMinLength, 0);
  assert.equal(request.capture.readinessPolicy.shellDetectionRetryCount, 5);
  assert.equal(request.capture.readinessPolicy.shellDetectionRetryDelayMs, 15000);
  assert.equal(request.capture.timeoutBudgetMs, 1000);
  assert.equal(request.capture.captureScreenshots, true);
  assert.equal(request.capture.captureComputedStyles, true);
  assert.equal(request.capture.captureRenderedDom, true);
  assert.equal(request.trace.agencyId, null);
  assert.equal(request.trace.clientId, null);
  assert.equal(request.trace.siteId, null);
});

test("canonicalizeRenderedCaptureWorkerRequest yields stable contract-complete payload", () => {
  const canonical = canonicalizeRenderedCaptureWorkerRequest({
    requestId: "req-stable",
    importId: "import-stable",
    sourceUrl: "https://example.com/stable",
    capture: {
      viewport: { width: 1366, height: 768 },
      readinessPolicy: {
        navigationTimeoutMs: 20_000,
        networkQuietTimeoutMs: 4_000,
        domStabilizationWindowMs: 2_500,
        domStabilizationPollMs: 250,
        maxTotalCaptureMs: 30_000,
      },
      timeoutBudgetMs: 30_000,
    },
  });

  const serialized = JSON.stringify(canonical);
  assert.equal(
    serialized,
    '{"kind":"rendered_capture_worker_request_v1","contractVersion":"1.0.0","requestId":"req-stable","importId":"import-stable","sourceUrl":"https://example.com/stable","trace":{"agencyId":null,"clientId":null,"siteId":null},"capture":{"viewport":{"width":1366,"height":768},"readinessPolicy":{"navigationTimeoutMs":20000,"networkQuietTimeoutMs":4000,"domStabilizationWindowMs":2500,"domStabilizationPollMs":250,"maxTotalCaptureMs":30000},"captureScreenshots":true,"captureComputedStyles":true,"captureRenderedDom":true,"timeoutBudgetMs":30000}}',
  );
});
