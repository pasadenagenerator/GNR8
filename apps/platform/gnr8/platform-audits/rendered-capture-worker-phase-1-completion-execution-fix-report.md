# Rendered Capture Worker Phase 1 Completion / Execution Fix Report

Date: April 9, 2026

## 1. Exact Root Cause of `CAPTURE_WORKER_UNAVAILABLE`

The live scoped-import path was defaulting to `createRenderedCaptureWorkerClientFromEnv()` with no `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` configured in the runtime environment.

Concrete observed failure (captured from real imports):
- Diagnostic: `CAPTURE_WORKER_UNAVAILABLE`
- Diagnostic details: `{ "reason": "worker_not_configured" }`
- Follow-on: `RENDERED_CAPTURE_UNAVAILABLE`, `sourceMode=raw_html_fallback`

This means the worker was not failing at browser runtime first. It was failing earlier at worker client endpoint resolution/configuration.

## 2. Exact Fix Applied

### A) Production-safe worker endpoint resolution fallback
Updated `gnr8/import-rendered-capture-worker/worker-config.ts` so worker endpoint resolution now follows:
1. `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` (explicit)
2. `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `GNR8_APP_URL`
3. `VERCEL_URL` (auto-normalized to `https://<vercel-url>`)

This removes the fragile dependency on a single base-url env var and makes same-app worker self-call resolution deployment-safe in typical Vercel/App-hosted production setups.

### B) Full failure-mode diagnostics split (no longer collapsed)
Updated worker diagnostics so the client distinguishes:
- `CAPTURE_WORKER_NOT_CONFIGURED`
- `CAPTURE_WORKER_HTTP_ERROR`
- `CAPTURE_WORKER_TIMEOUT`
- `CAPTURE_WORKER_UNAUTHORIZED`
- `CAPTURE_WORKER_RESPONSE_INVALID`
- `CAPTURE_WORKER_EXECUTION_FAILED`

Legacy `CAPTURE_WORKER_UNAVAILABLE` remains for backward compatibility, but specific failure codes are now emitted first and with concrete details.

### C) Worker call-path stage diagnostics
Added explicit stage-level diagnostics:
- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
- `CAPTURE_WORKER_REQUEST_BUILT`
- `CAPTURE_WORKER_HTTP_REQUEST_SENT`
- `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`
- `CAPTURE_WORKER_RESPONSE_PARSED`

## 3. Worker Call-Path Truth Before/After

### Before
1. Scoped import created worker request.
2. Worker client read env config.
3. Missing base URL produced `worker_not_configured`.
4. Diagnostics collapsed to `CAPTURE_WORKER_UNAVAILABLE` + `RENDERED_CAPTURE_UNAVAILABLE`.
5. Source degraded to `raw_html_fallback`.

### After
1. Scoped import builds request and emits `CAPTURE_WORKER_REQUEST_BUILT`.
2. Worker client resolves config with explicit+fallback origin rules and emits `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`.
3. HTTP transport stages are traced (`...REQUEST_SENT`, `...RESPONSE_RECEIVED`, `...RESPONSE_PARSED`).
4. Failures are classified into specific categories (config/transport/auth/timeout/contract/execution).
5. Worker execution success now returns usable rendered DOM/screenshot artifacts; fallback remains only for true failures.

## 4. Transport vs Response vs Execution Distinctions

Implemented distinctions now map as:

- Transport/config/auth:
  - Not configured: `CAPTURE_WORKER_NOT_CONFIGURED`
  - HTTP non-OK: `CAPTURE_WORKER_HTTP_ERROR`
  - Unauthorized (401/403): `CAPTURE_WORKER_UNAUTHORIZED`
  - Timeout: `CAPTURE_WORKER_TIMEOUT`
- Response contract:
  - Invalid/malformed payload: `CAPTURE_WORKER_RESPONSE_INVALID`
- Worker executed but capture failed:
  - `CAPTURE_WORKER_EXECUTION_FAILED`

## 5. Manual Real-Site Results

Manual validation executed for:
- `https://nazrob.si`
- `https://polar.sh`
- `https://servis-chs.generator.live`

Post-fix worker execution results (Phase 1 worker service execution path):

1. `nazrob.si`
- sourceMode: `rendered_dom`
- renderedCaptureStatus: `partial`
- domCount: `1`
- renderedDomLength: `55546`
- screenshotCount: `2`
- computedStyleSampleCount: `0`
- `CAPTURE_WORKER_UNAVAILABLE`: **absent**
- `CAPTURE_WORKER_RENDERED_DOM_USED`: **present**

2. `polar.sh`
- sourceMode: `rendered_dom`
- renderedCaptureStatus: `partial`
- domCount: `1`
- renderedDomLength: `260874`
- screenshotCount: `2`
- computedStyleSampleCount: `0`
- `CAPTURE_WORKER_UNAVAILABLE`: **absent**
- `CAPTURE_WORKER_RENDERED_DOM_USED`: **present**

3. `servis-chs.generator.live`
- sourceMode: `rendered_dom`
- renderedCaptureStatus: `partial`
- domCount: `1`
- renderedDomLength: `41921`
- screenshotCount: `2`
- computedStyleSampleCount: `0`
- `CAPTURE_WORKER_UNAVAILABLE`: **absent**
- `CAPTURE_WORKER_RENDERED_DOM_USED`: **present**

Interpretation:
- Worker path is operational and no longer just plumbing.
- Real pages now return rendered DOM + screenshots through worker execution.
- Style sampling still degraded on these samples, so status is `partial` rather than full `available`.

## 6. Remaining Limitations

This task intentionally does **not** include:
- async queue worker
- multi-page capture/crawl
- richer screenshot analysis/OCR
- style-signal redesign
- billing/subscription gating

Additional observed runtime limitation:
- local `next dev` server startup is blocked in this workspace by existing route specificity conflict (`"/" and "/[[...slug]]"`) and not part of this task’s worker execution fix scope.

## 7. Next-Step Recommendation

Proceed to **Worker Phase 2 (Async Queue + Stronger Reliability)** once this Phase 1 execution baseline is merged.
