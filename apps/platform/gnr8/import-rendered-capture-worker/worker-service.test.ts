import assert from "node:assert/strict";
import test from "node:test";

import { createRenderedCaptureWorkerRequest } from "@/gnr8/import-rendered-capture-worker/worker-contract";
import { parseRenderedCaptureWorkerRequestDetailed } from "@/gnr8/import-rendered-capture-worker/worker-service";

test("parseRenderedCaptureWorkerRequestDetailed accepts canonical valid payload", () => {
  const payload = createRenderedCaptureWorkerRequest({
    requestId: "req-parse-valid",
    importId: "import-parse-valid",
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

  const parsed = parseRenderedCaptureWorkerRequestDetailed(payload);
  assert.ok(parsed.request);
  assert.equal(parsed.error, null);
  assert.equal(parsed.request?.kind, "rendered_capture_worker_request_v1");
});

test("parseRenderedCaptureWorkerRequestDetailed accepts legacy wrapped payload", () => {
  const request = createRenderedCaptureWorkerRequest({
    requestId: "req-wrapped",
    importId: "import-wrapped",
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

  const parsed = parseRenderedCaptureWorkerRequestDetailed({ request });
  assert.ok(parsed.request);
  assert.equal(parsed.error, null);
  assert.equal(parsed.request?.requestId, "req-wrapped");
});

test("parseRenderedCaptureWorkerRequestDetailed returns structured missing/invalid field details", () => {
  const parsed = parseRenderedCaptureWorkerRequestDetailed({
    kind: "legacy_rendered_capture_request",
    contractVersion: "0.9.0",
    capture: {
      viewport: { width: "wide" },
      readinessPolicy: {
        navigationTimeoutMs: "soon",
      },
      captureScreenshots: "yes",
    },
  });

  assert.equal(parsed.request, null);
  assert.equal(parsed.error?.code, "INVALID_WORKER_REQUEST");
  assert.equal(parsed.error?.details.expectedKind, "rendered_capture_worker_request_v1");
  assert.equal(parsed.error?.details.expectedContractVersion, "1.0.0");
  assert.ok(parsed.error?.details.missingFields.includes("requestId"));
  assert.ok(parsed.error?.details.missingFields.includes("capture.viewport.height"));
  assert.ok(parsed.error?.details.missingFields.includes("capture.readinessPolicy.networkQuietTimeoutMs"));
  assert.ok(parsed.error?.details.invalidFields.some((field) => field.path === "kind"));
  assert.ok(parsed.error?.details.invalidFields.some((field) => field.path === "capture.viewport.width"));
  assert.ok(parsed.error?.details.invalidFields.some((field) => field.path === "capture.captureScreenshots"));
});
