import assert from "node:assert/strict";
import test from "node:test";

import { resolveRenderedCaptureWorkerClientConfigFromEnv } from "@/gnr8/import-rendered-capture-worker/worker-config";

test("worker config resolves endpoint from explicit base URL", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    GNR8_RENDERED_CAPTURE_WORKER_BASE_URL: "https://app.example.com",
    GNR8_RENDERED_CAPTURE_WORKER_PATH: "/api/internal/gnr8/rendered-capture-worker",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://app.example.com/api/internal/gnr8/rendered-capture-worker");
  assert.equal(config.sharedToken, "token");
  assert.equal(config.resolvedBaseUrlSource, "worker_base_url");
  assert.equal(config.configStatus, "ready");
});

test("worker config falls back to VERCEL_URL when explicit base URL is missing", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    VERCEL_URL: "my-app.vercel.app",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://my-app.vercel.app/api/internal/gnr8/rendered-capture-worker");
  assert.equal(config.resolvedBaseUrlSource, "vercel_url");
});

test("worker config falls back to NEXT_PUBLIC_APP_URL when worker base URL is missing", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    NEXT_PUBLIC_APP_URL: "https://custom-origin.example",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://custom-origin.example/api/internal/gnr8/rendered-capture-worker");
  assert.equal(config.resolvedBaseUrlSource, "next_public_app_url");
});

test("worker config falls back to VERCEL_PROJECT_PRODUCTION_URL when VERCEL_URL is missing", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    VERCEL_PROJECT_PRODUCTION_URL: "app.production-host.example",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://app.production-host.example/api/internal/gnr8/rendered-capture-worker");
  assert.equal(config.resolvedBaseUrlSource, "vercel_project_production_url");
});

test("worker config falls back to default platform origin in production when no origin env is set", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    NODE_ENV: "production",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://app.pasadenagenerator.com/api/internal/gnr8/rendered-capture-worker");
  assert.equal(config.resolvedBaseUrlSource, "default_platform_origin");
  assert.equal(config.configStatus, "ready");
});

test("worker config reports missing pieces deterministically", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    NODE_ENV: "development",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, null);
  assert.equal(config.sharedToken, null);
  assert.equal(config.configStatus, "missing_base_url_and_shared_token");
});
