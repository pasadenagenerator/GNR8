import assert from "node:assert/strict";
import test from "node:test";

import { createRenderedCaptureWorkerReadinessRouteHandlers } from "@/app/api/gnr8/admin/rendered-capture-worker/readiness/rendered-capture-worker-readiness-route-handlers";
import {
  checkRenderedCaptureWorkerReadiness,
  resolveRenderedCaptureWorkerReadinessConfigFromEnv,
  type RenderedCaptureWorkerReadinessResult,
} from "@/gnr8/import-rendered-capture-worker/worker-readiness";

function env(input: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return input as NodeJS.ProcessEnv;
}

function readyWorkerHealthResponse(): Response {
  return Response.json({
    ok: true,
    health: {
      authenticated: true,
      authReason: "ok",
      runtimeKind: "nodejs",
      browserPackageAvailable: true,
      browserBinaryAvailable: true,
      captureServiceAvailable: true,
      launchProbe: {
        supported: true,
        failureCode: null,
      },
    },
  });
}

test("rendered capture worker readiness config reports disabled state", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_ENABLED: "false",
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () => {
      throw new Error("fetch should not be called for disabled config");
    },
    sharedToken: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.enabled, false);
  assert.equal(result.configured, false);
  assert.equal(result.healthStatus, "disabled");
  assert.deepEqual(result.diagnostics, ["RENDERED_CAPTURE_WORKER_CONFIG_DISABLED"]);
});

test("rendered capture worker readiness config fails closed when base URL is missing", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "secret-token",
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () => {
      throw new Error("fetch should not be called for missing base URL");
    },
    sharedToken: "secret-token",
  });

  assert.equal(result.ok, false);
  assert.equal(result.configured, false);
  assert.equal(result.baseUrlPresent, false);
  assert.equal(result.healthStatus, "misconfigured");
  assert.ok(result.diagnostics.includes("RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL"));
});

test("rendered capture worker readiness config fails closed when shared token is missing", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () => {
      throw new Error("fetch should not be called for missing shared token");
    },
    sharedToken: null,
  });

  assert.equal(result.ok, false);
  assert.equal(result.configured, false);
  assert.equal(result.baseUrlPresent, true);
  assert.equal(result.sharedTokenConfigured, false);
  assert.equal(result.healthStatus, "misconfigured");
  assert.ok(result.diagnostics.includes("RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN"));
});

test("rendered capture worker readiness returns ready for valid health response", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "secret-token",
      GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS: "2500",
    }),
  );
  const seen: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async (input, init) => {
      seen.push({ input, init });
      return readyWorkerHealthResponse();
    },
    sharedToken: "secret-token",
  });

  assert.equal(result.ok, true);
  assert.equal(result.enabled, true);
  assert.equal(result.configured, true);
  assert.equal(result.baseUrlPresent, true);
  assert.equal(result.path, "/internal/gnr8/rendered-capture-worker");
  assert.equal(result.healthPath, "/health");
  assert.equal(result.timeoutMs, 2500);
  assert.equal(result.healthStatus, "ready");
  assert.equal(result.healthHttpStatus, 200);
  assert.deepEqual(result.diagnostics, [
    "RENDERED_CAPTURE_WORKER_HEALTH_STARTED",
    "RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED",
  ]);
  assert.equal(String(seen[0]?.input), "https://worker.example/health");
  assert.equal(seen[0]?.init?.method, "GET");
  assert.equal(seen[0]?.init?.body, undefined);
});

test("rendered capture worker readiness classifies unreachable health", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "secret-token",
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
    sharedToken: "secret-token",
  });

  assert.equal(result.ok, false);
  assert.equal(result.healthStatus, "unreachable");
  assert.equal(result.healthHttpStatus, null);
  assert.ok(result.diagnostics.includes("RENDERED_CAPTURE_WORKER_HEALTH_FAILED"));
});

test("rendered capture worker readiness classifies invalid health response", async () => {
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "secret-token",
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () =>
      Response.json({
        ok: true,
        health: {
          authenticated: true,
          captureServiceAvailable: false,
        },
      }),
    sharedToken: "secret-token",
  });

  assert.equal(result.ok, false);
  assert.equal(result.healthStatus, "invalid_response");
  assert.equal(result.healthHttpStatus, 200);
  assert.ok(result.diagnostics.includes("RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE"));
});

test("rendered capture worker readiness response never exposes token value", async () => {
  const secret = "secret-token-never-returned";
  const config = resolveRenderedCaptureWorkerReadinessConfigFromEnv(
    env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: secret,
    }),
  );
  const result = await checkRenderedCaptureWorkerReadiness({
    config,
    fetchImpl: async () => readyWorkerHealthResponse(),
    sharedToken: secret,
  });

  assert.equal(result.sharedTokenConfigured, true);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(config).includes(secret), false);
});

test("rendered capture worker readiness route enforces superadmin guard", async () => {
  const handlers = createRenderedCaptureWorkerReadinessRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });

  const response = await handlers.GET();

  assert.equal(response.status, 403);
});

test("rendered capture worker readiness route returns read-only readiness payload", async () => {
  const handlers = createRenderedCaptureWorkerReadinessRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    env: env({
      GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://worker.example",
      GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "secret-token",
      GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH: "/healthz",
    }),
    fetch: async (input, init) => {
      assert.equal(String(input), "https://worker.example/healthz");
      assert.equal(init?.method, "GET");
      assert.equal(init?.body, undefined);
      return readyWorkerHealthResponse();
    },
  });

  const response = await handlers.GET();
  const body = (await response.json()) as RenderedCaptureWorkerReadinessResult;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.healthStatus, "ready");
  assert.equal(body.healthPath, "/healthz");
  assert.equal(body.sharedTokenConfigured, true);
  assert.equal(JSON.stringify(body).includes("secret-token"), false);
});
