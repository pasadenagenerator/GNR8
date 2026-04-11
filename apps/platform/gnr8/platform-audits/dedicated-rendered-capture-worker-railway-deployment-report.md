# Dedicated Rendered Capture Worker Railway Deployment Report

## 1. Deployment architecture chosen

A dedicated standalone Node HTTP worker service was added under `apps/platform/gnr8/rendered-capture-worker-server` and prepared for Railway Docker deployment.

Chosen shape:
- separate Railway service
- Docker runtime based on official Playwright image
- standalone worker server process (no Next route runtime dependency)

## 2. Worker server shape

Implemented server:
- `apps/platform/gnr8/rendered-capture-worker-server/server.ts`
- `apps/platform/gnr8/rendered-capture-worker-server/index.ts`

Endpoints:
- `POST /internal/gnr8/rendered-capture-worker` (primary)
- `POST /api/internal/gnr8/rendered-capture-worker` (legacy compatibility alias)
- `GET /health`

Behavior:
- validates `x-gnr8-rendered-capture-worker-token`
- validates request contract with existing parser
- executes existing worker execution service
- returns existing worker response contract
- returns explicit 401/400/413/500 API error classes for auth/validation/runtime errors

## 3. Docker/runtime setup

Added Dockerfile:
- `apps/platform/gnr8/rendered-capture-worker-server/Dockerfile`

Runtime characteristics:
- base image: `mcr.microsoft.com/playwright:v1.54.2-noble`
- Node + Playwright browser dependencies bundled via image
- worker starts via `tsx` entrypoint in app workspace
- exposes `PORT=3001`

## 4. Auth model

Shared-token trust boundary is preserved.

- app sends `x-gnr8-rendered-capture-worker-token`
- worker validates against `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`
- unauthorized capture requests return `401 UNAUTHORIZED_WORKER_REQUEST`
- `/health` supports explicit auth-truth (`authenticated`, auth reason), and returns `401` on token mismatch

## 5. App integration model

Core worker logic was reused unchanged:
- request/response contract (`worker-contract.ts`)
- request validation + execution (`worker-service.ts`)
- worker client + fallback mapping (`worker-client.ts`)
- orchestrator + persisted worker health truth (`capture-job-orchestrator.ts`)

App worker config remains env-driven and now has explicit test coverage confirming:
- external `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` takes precedence over app-origin fallbacks
- fallback behavior remains deterministic and safe when worker is unreachable

## 6. Env vars required

### Railway worker service

Required:
- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` (must match Vercel app)

Recommended:
- `PORT=3001` (Railway usually injects this)
- `HOST=0.0.0.0`

### Vercel app service

Required:
- `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true`
- `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://<railway-service-domain>`
- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<same-shared-token>`

Optional:
- `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=35000`
- `GNR8_RENDERED_CAPTURE_WORKER_PATH=/internal/gnr8/rendered-capture-worker`

Note: default app path remains `/api/internal/gnr8/rendered-capture-worker`; the dedicated worker supports both paths for compatibility.

## 7. Manual validation results

Manual production deployment/validation could not be executed in this environment.

Not completed here:
- Railway deploy execution
- Vercel env update execution
- live import validation for `nazrob.si`, `polar.sh`, `chs.generator.live`

Prepared verification runbook steps:
1. Deploy Railway service with Dockerfile path `apps/platform/gnr8/rendered-capture-worker-server/Dockerfile`.
2. Set worker token in Railway.
3. Set Vercel worker envs to Railway URL + same token.
4. Verify worker health:
   - `GET https://<worker-domain>/health` with header `x-gnr8-rendered-capture-worker-token`.
5. Run scoped imports for required sites and verify:
   - request path goes to Railway domain
   - no `CAPTURE_WORKER_NOT_CONFIGURED`
   - no Vercel runtime `ENVIRONMENT_UNSUPPORTED`
   - at least one import yields `sourceMode = rendered_dom`, non-zero DOM, screenshot artifacts
   - raw fallback remains available when real capture failures occur

## 8. Limitations

This task delivers dedicated Railway/Docker worker deployment surface and integration wiring only.

Not included:
- async queue capture redesign
- autoscaling orchestration
- multi-page crawl
- OCR
- screenshot semantic segmentation
- billing/subscription gating

## 9. Next-step recommendation

Worker Phase 2.5 (Computed Style Sampling Reliability)
