# Dedicated Rendered Capture Worker Server

This service hosts the rendered capture worker in a standalone Node runtime suitable for Railway Docker deployment.
Production runtime is compiled JavaScript only (no `tsx` runtime transpilation).

## Endpoints

- `POST /internal/gnr8/rendered-capture-worker`
- `POST /api/internal/gnr8/rendered-capture-worker` (legacy compatibility alias)
- `GET /health`

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
