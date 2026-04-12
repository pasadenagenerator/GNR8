import assert from "node:assert/strict";
import test from "node:test";

import {
  createRenderedCaptureWorkerRequest,
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";
import {
  createRenderedCaptureWorkerServer,
  RENDERED_CAPTURE_WORKER_HEALTH_PATH,
  RENDERED_CAPTURE_WORKER_PATH,
} from "@/gnr8/rendered-capture-worker-server/server";

type HealthProbe = {
  runtimeKind: "nodejs" | "edge" | "unknown";
  browserPackageAvailable: boolean;
  browserBinaryAvailable: boolean;
  captureServiceAvailable: boolean;
  launchProbe: {
    supported: boolean;
    failureCode: string | null;
    timeoutMs: number;
    contextTimeoutMs: number;
    executablePath: string | null;
    executablePathExists: boolean | null;
    launchArgs: string[];
    error: string | null;
  };
};

async function startServer(input?: {
  sharedToken?: string;
  health?: HealthProbe;
}) {
  const server = createRenderedCaptureWorkerServer({
    sharedToken: input?.sharedToken ?? "token-123",
    executeRequest: async ({ request }) => ({
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
      diagnostics: [],
      qualitySummary: {
        renderedDomQuality: "strong",
        domLength: 11,
        meaningfulNodeCount: 1,
        screenshotCount: 0,
        computedStyleSampleCount: 0,
      },
      failure: null,
      timings: {
        queueLatencyMs: null,
        executionMs: 20,
        totalMs: 20,
      },
    }),
    probeEnvironment: async () =>
      input?.health ?? {
        runtimeKind: "nodejs",
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        captureServiceAvailable: true,
        launchProbe: {
          supported: true,
          failureCode: null,
          timeoutMs: 8_000,
          contextTimeoutMs: 4_000,
          executablePath: "/usr/bin/chromium",
          executablePathExists: true,
          launchArgs: ["--no-sandbox"],
          error: null,
        },
      },
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server failed to bind test port");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

function makeRequest() {
  return createRenderedCaptureWorkerRequest({
    requestId: "req-1",
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

test("worker server rejects unauthorized capture request", async () => {
  const fixture = await startServer();
  try {
    const response = await fetch(`${fixture.baseUrl}${RENDERED_CAPTURE_WORKER_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(makeRequest()),
    });

    assert.equal(response.status, 401);
    const payload = (await response.json()) as { error?: { code?: string } };
    assert.equal(payload.error?.code, "UNAUTHORIZED_WORKER_REQUEST");
  } finally {
    await fixture.close();
  }
});

test("worker server validates worker request contract", async () => {
  const fixture = await startServer();
  try {
    const response = await fetch(`${fixture.baseUrl}${RENDERED_CAPTURE_WORKER_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gnr8-rendered-capture-worker-token": "token-123",
      },
      body: JSON.stringify({ kind: "invalid" }),
    });

    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: { code?: string } };
    assert.equal(payload.error?.code, "INVALID_WORKER_REQUEST");
  } finally {
    await fixture.close();
  }
});

test("worker server returns contract response for authorized valid request", async () => {
  const fixture = await startServer();
  try {
    const response = await fetch(`${fixture.baseUrl}${RENDERED_CAPTURE_WORKER_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gnr8-rendered-capture-worker-token": "token-123",
      },
      body: JSON.stringify(makeRequest()),
    });

    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      kind?: string;
      status?: string;
      requestId?: string;
      contractVersion?: string;
    };
    assert.equal(payload.kind, "rendered_capture_worker_response_v1");
    assert.equal(payload.contractVersion, RENDERED_CAPTURE_WORKER_CONTRACT_VERSION);
    assert.equal(payload.status, "available");
    assert.equal(payload.requestId, "req-1");
  } finally {
    await fixture.close();
  }
});

test("health endpoint returns explicit auth/availability truth", async () => {
  const fixture = await startServer({
    health: {
      runtimeKind: "nodejs",
      browserPackageAvailable: true,
      browserBinaryAvailable: false,
      captureServiceAvailable: false,
      launchProbe: {
        supported: false,
        failureCode: "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED",
        timeoutMs: 8_000,
        contextTimeoutMs: 4_000,
        executablePath: "/ms-playwright/chromium/chrome-linux/chrome",
        executablePathExists: true,
        launchArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
        error: "sandbox restriction",
      },
    },
  });

  try {
    const healthyWithToken = await fetch(`${fixture.baseUrl}${RENDERED_CAPTURE_WORKER_HEALTH_PATH}`, {
      headers: {
        "x-gnr8-rendered-capture-worker-token": "token-123",
      },
    });
    assert.equal(healthyWithToken.status, 200);
    const healthyPayload = (await healthyWithToken.json()) as {
      health?: {
        authenticated?: boolean;
        browserBinaryAvailable?: boolean;
        captureServiceAvailable?: boolean;
        launchProbe?: { supported?: boolean; failureCode?: string | null };
      };
    };
    assert.equal(healthyPayload.health?.authenticated, true);
    assert.equal(healthyPayload.health?.browserBinaryAvailable, false);
    assert.equal(healthyPayload.health?.captureServiceAvailable, false);
    assert.equal(healthyPayload.health?.launchProbe?.supported, false);
    assert.equal(healthyPayload.health?.launchProbe?.failureCode, "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED");

    const unauthorized = await fetch(`${fixture.baseUrl}${RENDERED_CAPTURE_WORKER_HEALTH_PATH}`, {
      headers: {
        "x-gnr8-rendered-capture-worker-token": "wrong-token",
      },
    });
    assert.equal(unauthorized.status, 401);
  } finally {
    await fixture.close();
  }
});
