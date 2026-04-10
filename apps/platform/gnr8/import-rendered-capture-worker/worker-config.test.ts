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
});

test("worker config falls back to VERCEL_URL when explicit base URL is missing", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    VERCEL_URL: "my-app.vercel.app",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://my-app.vercel.app/api/internal/gnr8/rendered-capture-worker");
});

test("worker config falls back to NEXT_PUBLIC_APP_URL when worker base URL is missing", () => {
  const config = resolveRenderedCaptureWorkerClientConfigFromEnv({
    NEXT_PUBLIC_APP_URL: "https://custom-origin.example",
    GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN: "token",
  } as unknown as NodeJS.ProcessEnv);

  assert.equal(config.endpointUrl, "https://custom-origin.example/api/internal/gnr8/rendered-capture-worker");
});
