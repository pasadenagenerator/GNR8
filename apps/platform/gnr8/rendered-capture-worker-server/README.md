# Dedicated Rendered Capture Worker Server

This service hosts the rendered capture worker in a standalone Node runtime suitable for Railway Docker deployment.
Production runtime is compiled JavaScript only (no `tsx` runtime transpilation).

## Endpoints

- `POST /internal/gnr8/rendered-capture-worker`
- `POST /api/internal/gnr8/rendered-capture-worker` (legacy compatibility alias)
- `GET /health`

## Minimal Manual Debug POST

```bash
curl -sS -X POST 'http://127.0.0.1:3001/internal/gnr8/rendered-capture-worker' \
  -H 'content-type: application/json' \
  -H 'x-gnr8-rendered-capture-worker-token: <shared-token>' \
  --data '{
    "kind": "rendered_capture_worker_request_v1",
    "contractVersion": "1.0.0",
    "requestId": "manual-debug-req-1",
    "importId": "manual-debug-import-1",
    "sourceUrl": "https://example.com/",
    "trace": {
      "agencyId": null,
      "clientId": null,
      "siteId": null
    },
    "capture": {
      "viewport": { "width": 1366, "height": 768 },
      "readinessPolicy": {
        "navigationTimeoutMs": 20000,
        "networkQuietTimeoutMs": 4000,
        "domStabilizationWindowMs": 2500,
        "domStabilizationPollMs": 250,
        "maxTotalCaptureMs": 30000,
        "shellContentMinLength": 120,
        "shellDetectionRetryCount": 1,
        "shellDetectionRetryDelayMs": 1500
      },
      "captureScreenshots": true,
      "captureComputedStyles": true,
      "captureRenderedDom": true,
      "timeoutBudgetMs": 30000
    }
  }'
```

## Required Environment Variables

- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` (required)
- `PORT` (optional, default `3001`)
- `HOST` (optional, default `0.0.0.0`)

## Local Run

From `apps/platform`:

```bash
pnpm run build:rendered-capture-worker
pnpm run start:rendered-capture-worker
```

Compiled entrypoint:

```bash
dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js
```

## Docker Build

Build from repo root:

```bash
docker build -f apps/platform/gnr8/rendered-capture-worker-server/Dockerfile -t gnr8-rendered-capture-worker .
```

Container runtime command:

```bash
node apps/platform/dist-rendered-capture-worker/gnr8/rendered-capture-worker-server/index.js
```
