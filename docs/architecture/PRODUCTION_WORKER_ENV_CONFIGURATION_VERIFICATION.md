# Production Worker Env Configuration Verification

## Scope

Phase 8B-12I verifies and documents the production environment configuration required for rendered Evidence Capture worker readiness.

This phase is documentation and preparation only. It does not modify importer behavior, Evidence Capture behavior, worker code, platform code, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema. It does not create Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, imports, retries, repair jobs, or migrations. It does not change Vercel environment variables, deploy the platform, deploy the worker, or call the production readiness endpoint.

The question answered by this phase:

> What exact Vercel configuration and environment variables must exist so the platform can reach the rendered capture worker?

## Platform Environment Variable Inventory

Configure these variables on the production `apps/platform` Vercel project. They must be present in the Vercel dashboard or CLI for the Production environment before deploying the platform.

| Variable | Required | Example value shape | Safe default | Secret | Vercel location |
| --- | --- | --- | --- | --- | --- |
| `GNR8_RENDERED_CAPTURE_WORKER_ENABLED` | Optional | `true`, `1`, `yes`, or `on` to enable; `false` to disable | Defaults to enabled when unset | No | Platform Vercel project -> Settings -> Environment Variables -> Production |
| `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` | Required for readiness | `https://<worker-project-domain>.vercel.app` or `https://<custom-worker-domain>` with no path | None for readiness. Must be explicit. | No, but treat as operational config | Platform Vercel project -> Settings -> Environment Variables -> Production |
| `GNR8_RENDERED_CAPTURE_WORKER_PATH` | Optional | `/internal/gnr8/rendered-capture-worker` | `/internal/gnr8/rendered-capture-worker` for readiness | No | Platform Vercel project -> Settings -> Environment Variables -> Production |
| `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH` | Optional | `/health` | `/health` | No | Platform Vercel project -> Settings -> Environment Variables -> Production |
| `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` | Required | Opaque random shared secret string. Placeholder only: `<shared-rendered-capture-worker-token>` | None | Yes | Platform Vercel project -> Settings -> Environment Variables -> Production, marked secret/sensitive |
| `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` | Optional | `10000`, `30000`, `60000` | Readiness default is `10000`; values are clamped from `1000` to `60000` | No | Platform Vercel project -> Settings -> Environment Variables -> Production |

Important platform readiness rule:

- The readiness endpoint intentionally requires an explicit `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`.
- Platform-origin fallbacks such as `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `GNR8_APP_URL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and the production default app origin are not sufficient to prove dedicated worker readiness.
- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` is reported only as `sharedTokenConfigured`; the token value must never be returned, copied into docs, or pasted into verification reports.

Expected platform endpoint resolution:

- Health check URL: `new URL(GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH || "/health", GNR8_RENDERED_CAPTURE_WORKER_BASE_URL)`
- Capture URL: `new URL(GNR8_RENDERED_CAPTURE_WORKER_PATH || "/internal/gnr8/rendered-capture-worker", GNR8_RENDERED_CAPTURE_WORKER_BASE_URL)`
- Auth header sent to the worker: `x-gnr8-rendered-capture-worker-token: <shared-token>`

## Worker Deployment Inventory

Configure the production rendered capture worker as its own Vercel project. The worker project name recorded for the architecture is `gnr8-worker`, but the live project name must be confirmed in Vercel before 8B-12J.

Required worker URL:

- Production base URL shape: `https://<worker-production-domain>`
- Do not include `/health` or `/internal/gnr8/rendered-capture-worker` in the platform base URL.
- The worker URL must be reachable from the deployed platform runtime over HTTPS.

Required worker endpoints:

- Health endpoint: `GET /health`
- Rendered capture endpoint: `POST /internal/gnr8/rendered-capture-worker`
- Compatibility capture endpoint: `POST /api/internal/gnr8/rendered-capture-worker`

Expected worker shared token environment variable:

- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`
- Required on the worker Vercel project.
- Must exactly match the platform project's `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
- Must be stored as a Vercel Production environment variable/secret.
- Must not be copied into documentation, logs, issue comments, or handoff text.

Worker health response expectations:

- The platform readiness check sends `GET /health` with `x-gnr8-rendered-capture-worker-token`.
- A ready worker returns HTTP `200` JSON with `ok: true`.
- The JSON must include `health.authenticated = true`.
- The JSON must include `health.captureServiceAvailable = true`.
- Any non-OK HTTP status is classified as `unreachable`.
- HTTP `200` with missing or false readiness fields is classified as `invalid_response`.

Playwright/browser dependency expectations:

- The worker runtime must be Node.js, not Edge runtime.
- The worker deployment must include the `playwright` package.
- The deployment must include a launchable Chromium/browser binary or a compatible hosted browser dependency.
- The health probe must be able to import Playwright, find the browser binary, launch Chromium, create a context, and report `captureServiceAvailable = true`.
- A Vercel deployment that serves generic worker/Inngest routes but does not deploy the rendered capture worker server and browser dependencies is not sufficient for rendered Evidence Capture readiness.

Vercel project configuration requirements:

- The worker must be deployed as the rendered capture worker service, not as a self-targeting platform route.
- The runtime must support long-running Node capture work within the timeout budget used by the caller.
- The build/start command must produce and start the rendered capture worker server entrypoint.
- The project must expose the health and capture paths at the production domain.
- The project must run with Node.js 22-compatible settings, matching the package engine requirement.
- The project must have enough memory/runtime allowance for Chromium launch and screenshot capture.

Worker Vercel environment variable requirements:

| Variable | Required | Example value shape | Safe default | Secret | Vercel location |
| --- | --- | --- | --- | --- | --- |
| `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` | Required | `<shared-rendered-capture-worker-token>` | None | Yes | Worker Vercel project -> Settings -> Environment Variables -> Production |
| `PORT` | Usually managed by Vercel | Vercel-managed port or `3001` for local standalone debugging | Local standalone default is `3001` | No | Usually not manually configured on Vercel |
| `HOST` | Usually managed by Vercel | `0.0.0.0` for standalone server | Local standalone default is `0.0.0.0` | No | Usually not manually configured on Vercel |

## Readiness Endpoint Verification Procedure

This procedure is for Phase 8B-12J. Do not execute it in 8B-12I.

1. Configure platform env vars in the production platform Vercel project:
   - `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true`
   - `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://<worker-production-domain>`
   - `GNR8_RENDERED_CAPTURE_WORKER_PATH=/internal/gnr8/rendered-capture-worker`
   - `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH=/health`
   - `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<shared-token>`
   - `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=<timeout-ms>`
2. Configure worker env vars in the production worker Vercel project:
   - `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<same-shared-token>`
3. Deploy the worker Vercel project.
4. Deploy the platform Vercel project so it receives the production env changes.
5. Sign in as a superadmin on the production platform.
6. Call:

```http
GET /api/gnr8/admin/rendered-capture-worker/readiness
```

7. Capture the JSON response without copying token values.
8. Record `ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and `diagnostics`.

## Expected READY Response

Expected success shape:

```json
{
  "ok": true,
  "enabled": true,
  "configured": true,
  "baseUrlPresent": true,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": true,
  "timeoutMs": 10000,
  "healthStatus": "ready",
  "healthHttpStatus": 200,
  "diagnostics": [
    "RENDERED_CAPTURE_WORKER_HEALTH_STARTED",
    "RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED"
  ]
}
```

The exact `timeoutMs` may differ if Production sets a different valid timeout.

This response proves:

- The platform production environment enables the rendered capture worker.
- The platform has an explicit worker base URL.
- The platform has a configured shared token.
- The platform can reach the worker health endpoint.
- The worker accepted the token and reported capture service availability.

## Failure Response Examples

### Disabled

Example shape:

```json
{
  "ok": false,
  "enabled": false,
  "configured": false,
  "baseUrlPresent": false,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": false,
  "timeoutMs": 10000,
  "healthStatus": "disabled",
  "healthHttpStatus": null,
  "diagnostics": ["RENDERED_CAPTURE_WORKER_CONFIG_DISABLED"]
}
```

Likely root cause:

- `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=false` or another false-like value is configured on the platform project.

### Missing Base URL

Example shape:

```json
{
  "ok": false,
  "enabled": true,
  "configured": false,
  "baseUrlPresent": false,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": true,
  "timeoutMs": 10000,
  "healthStatus": "misconfigured",
  "healthHttpStatus": null,
  "diagnostics": ["RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL"]
}
```

Likely root cause:

- `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` is missing, empty, invalid, or configured only on the wrong Vercel environment.

### Missing Token

Example shape:

```json
{
  "ok": false,
  "enabled": true,
  "configured": false,
  "baseUrlPresent": true,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": false,
  "timeoutMs": 10000,
  "healthStatus": "misconfigured",
  "healthHttpStatus": null,
  "diagnostics": ["RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN"]
}
```

Likely root cause:

- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` is missing from the platform project, configured in the wrong Vercel environment, or present only on the worker project.

### Unreachable Worker

Example shape:

```json
{
  "ok": false,
  "enabled": true,
  "configured": true,
  "baseUrlPresent": true,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": true,
  "timeoutMs": 10000,
  "healthStatus": "unreachable",
  "healthHttpStatus": 404,
  "diagnostics": [
    "RENDERED_CAPTURE_WORKER_HEALTH_STARTED",
    "RENDERED_CAPTURE_WORKER_HEALTH_FAILED"
  ]
}
```

Likely root causes:

- Worker production URL is wrong.
- Worker project is not deployed.
- Worker project deploys the wrong app/build target.
- Worker health path is wrong.
- Worker returns non-OK status, including `401` from token mismatch.
- Worker is timing out or failing before returning health JSON.

If `healthHttpStatus` is `null`, the likely root cause is DNS, TLS, network, timeout, or process startup failure rather than a received HTTP status.

### Invalid Health Response

Example shape:

```json
{
  "ok": false,
  "enabled": true,
  "configured": true,
  "baseUrlPresent": true,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": true,
  "timeoutMs": 10000,
  "healthStatus": "invalid_response",
  "healthHttpStatus": 200,
  "diagnostics": [
    "RENDERED_CAPTURE_WORKER_HEALTH_STARTED",
    "RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE"
  ]
}
```

Likely root causes:

- Worker `/health` returns JSON but not the rendered capture worker health contract.
- Worker token is missing on the worker side, causing `health.authenticated` to be false.
- Worker cannot import Playwright, cannot find/launch Chromium, or reports `captureServiceAvailable = false`.
- The configured base URL points to a generic app route instead of the rendered capture worker service.

## Information Required Before 8B-12J

Collect these values before the live check phase:

- Platform Vercel project name.
- Worker Vercel project name.
- Worker production base URL.
- Worker health endpoint URL.
- Configured capture path.
- Configured readiness timeout.
- Confirmation that the same shared token is configured on platform and worker, without revealing the token.
- Readiness endpoint response from `GET /api/gnr8/admin/rendered-capture-worker/readiness`.

Do not collect or paste the actual token value.

## No Secret Exposure Confirmation

This document uses placeholders only.

- No token values are included.
- No production secrets are copied.
- No production env var values are exposed.
- Any future 8B-12J report must use boolean/token-present language only, such as `sharedTokenConfigured = true`.

## Recommended Next Phase

Recommended next phase:

**8B-12J Production Worker Readiness Live Check**

The next phase should verify the deployed Vercel settings and call the production readiness endpoint as superadmin. It should still avoid imports, retries, capture POSTs, Evidence Capture artifact creation, dry-run output creation, reconstruction execution, AI generation, publishing, repair jobs, and migrations until the readiness response proves success.

