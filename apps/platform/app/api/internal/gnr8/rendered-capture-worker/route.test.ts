import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/internal/gnr8/rendered-capture-worker/route";
import { createRenderedCaptureWorkerRequest } from "@/gnr8/import-rendered-capture-worker/worker-contract";

function makeWorkerRequest() {
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

test("route rejects missing/invalid auth token", async () => {
  const previous = process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
  process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = "test-shared-token";

  try {
    const req = new Request("http://localhost/api/internal/gnr8/rendered-capture-worker", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(makeWorkerRequest()),
    });

    const response = await POST(req);
    assert.equal(response.status, 401);
    const body = (await response.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, "UNAUTHORIZED_WORKER_REQUEST");
  } finally {
    if (previous === undefined) {
      delete process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
    } else {
      process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = previous;
    }
  }
});

test("route accepts valid x-header auth and proceeds to payload validation", async () => {
  const previous = process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
  process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = "test-shared-token";

  try {
    const req = new Request("http://localhost/api/internal/gnr8/rendered-capture-worker", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gnr8-rendered-capture-worker-token": "test-shared-token",
      },
      body: JSON.stringify({ kind: "invalid" }),
    });

    const response = await POST(req);
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, "INVALID_WORKER_REQUEST");
  } finally {
    if (previous === undefined) {
      delete process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
    } else {
      process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = previous;
    }
  }
});

test("route accepts bearer auth and proceeds to payload validation", async () => {
  const previous = process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
  process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = "test-shared-token";

  try {
    const req = new Request("http://localhost/api/internal/gnr8/rendered-capture-worker", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-shared-token",
      },
      body: JSON.stringify({ kind: "invalid" }),
    });

    const response = await POST(req);
    assert.equal(response.status, 400);
    const body = (await response.json()) as { error?: { code?: string } };
    assert.equal(body.error?.code, "INVALID_WORKER_REQUEST");
  } finally {
    if (previous === undefined) {
      delete process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN;
    } else {
      process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN = previous;
    }
  }
});
