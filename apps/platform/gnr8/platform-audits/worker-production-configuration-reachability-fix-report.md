# Worker Production Configuration & Reachability Fix Report

## 1. Exact Production Config / Root Cause Found

Primary root cause in current production-style configuration path:

- Worker client could resolve to `CAPTURE_WORKER_NOT_CONFIGURED` when runtime origin derivation failed (or token was absent), and this was later surfaced as broad availability degradation.
- Existing base URL fallback logic did not include `VERCEL_PROJECT_PRODUCTION_URL`, and did not expose deterministic resolution-source/status diagnostics.
- In this workspace's `apps/platform/.env.production`, these worker keys are not present:
  - `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`
  - `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`
  - `GNR8_RENDERED_CAPTURE_WORKER_PATH`
  - `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`
  - `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `GNR8_APP_URL`
  - `VERCEL_URL`

This means local production-style runs naturally hit config-missing branches unless deployment env supplies these variables.

## 2. Worker URL Resolution Logic (Before vs After)

Before:

1. `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`
2. `NEXT_PUBLIC_APP_URL`
3. `NEXT_PUBLIC_SITE_URL`
4. `GNR8_APP_URL`
5. `VERCEL_URL`
6. else endpoint unresolved (`null`)

After:

1. `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`
2. `NEXT_PUBLIC_APP_URL`
3. `NEXT_PUBLIC_SITE_URL`
4. `GNR8_APP_URL`
5. `VERCEL_URL`
6. `VERCEL_PROJECT_PRODUCTION_URL`
7. production fallback origin `https://app.pasadenagenerator.com` when `NODE_ENV=production`
8. else endpoint unresolved (`null`)

Additional deterministic metadata now produced in config resolution:

- `resolvedBaseUrl`
- `resolvedBaseUrlSource`
- `endpointPath`
- `configStatus` (`ready`, `disabled`, `missing_base_url`, `missing_shared_token`, `missing_base_url_and_shared_token`)

## 3. Auth / Token Behavior

- Worker route still requires `x-gnr8-rendered-capture-worker-token` to match `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
- Missing token in client config remains explicit `CAPTURE_WORKER_NOT_CONFIGURED` (safe fail).
- Token mismatch / missing header at route maps to `CAPTURE_WORKER_UNAUTHORIZED`.
- No auth-bypass behavior was introduced.

## 4. Config vs Reachability vs Unauthorized Distinctions

Distinctions now made explicitly in diagnostics and persisted worker health:

- Disabled: `CAPTURE_WORKER_DISABLED`
- Misconfigured: `CAPTURE_WORKER_NOT_CONFIGURED`
- Unauthorized: `CAPTURE_WORKER_UNAUTHORIZED`
- Timeout: `CAPTURE_WORKER_TIMEOUT`
- Transport/HTTP path failure: `CAPTURE_WORKER_HTTP_ERROR`
- Invalid response contract: `CAPTURE_WORKER_RESPONSE_INVALID`
- Execution reached worker but failed capture: `CAPTURE_WORKER_EXECUTION_FAILED`

Worker health truth now persists:

- `status`: `healthy | disabled | misconfigured | unreachable | unauthorized | execution_failed | timed_out | unknown`
- `reason`: normalized reason string

## 5. Diagnostics Improvements

Added/refined:

- `CAPTURE_WORKER_URL_RESOLVED` (resolved URL + source + status + header-configured truth)
- `CAPTURE_WORKER_DISABLED`
- richer `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED` details (source/status/path/base)
- import runtime health diagnostic now emits specific code by health state instead of always broad `CAPTURE_WORKER_HEALTH_UNAVAILABLE`

## 6. Manual Live Validation Results

Status in this run: **NOT EXECUTED LIVE** (no deployment performed from this environment).

Targets requested:

- `nazrob.si`
- `polar.sh`
- `chs.generator.live`
- `www.pohistvo-feltrin.si`

Expected post-deploy checks:

1. worker config resolves to non-null endpoint with `CAPTURE_WORKER_URL_RESOLVED` details
2. worker request sent (`CAPTURE_WORKER_HTTP_REQUEST_SENT`)
3. worker response received/parsed (`CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_RESPONSE_PARSED`) or specific failure
4. `CAPTURE_WORKER_NOT_CONFIGURED` absent unless env truly missing
5. generic health unavailable no longer used for misconfiguration/disabled/unauthorized cases

## 7. Remaining Limitations

- Live deploy verification is still required to confirm runtime env values and real endpoint reachability in deployed production.
- This change does not alter worker execution internals (browser/page capture behavior).
- If deployment is missing `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, auth/config failures remain explicit by design.

## 8. Next-Step Recommendation

Perform deploy-time configuration verification immediately after release:

- set/verify `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` in deployment env
- verify resolved endpoint source in diagnostics
- run real imports on the four target domains and confirm fallback is due to execution/page causes, not plumbing

## Explicit Scope Limitations (as requested)

This task did **not** implement:

- async queue worker improvements
- multi-page capture
- OCR
- style-signal redesign
- billing/subscription gating

This task is strictly production configuration + worker reachability diagnostics/truth fixes.
