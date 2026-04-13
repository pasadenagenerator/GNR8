# Worker Live Request Visibility & Status-Code Debug Fix Report

## 1) Visibility gaps before
- Worker-side runtime logs did not emit a request lifecycle for every POST (request entry, auth decision, validation decision, execution stage, response status).
- App-side non-200 worker diagnostics were too opaque (`CAPTURE_WORKER_HTTP_ERROR` / `CAPTURE_WORKER_REQUEST_FAILED`) and did not consistently include `statusCode`, parsed worker error code/message, or stage context.
- Correlation between app request and worker logs was weak because there was no explicit propagated correlation header.

## 2) Logs/diagnostics added
### Worker server (`gnr8/rendered-capture-worker-server/server.ts`)
- Added structured lifecycle logs:
  - `request_received` (method/path/auth-header/content-type/content-length)
  - `auth_checked`, `auth_passed`, `auth_failed`
  - `request_validation_started`, `request_validation_passed`, `request_validation_failed`
  - `execution_started`, `capture_service_entered`
  - `navigation_started`, `navigation_succeeded`, `navigation_failed` (derived from execution diagnostics)
  - `launch_probe_status` (passed/failed + failure code when present)
  - `execution_succeeded`, `execution_failed`
  - `response_sent` (status/result/errorCode/workerStatus + stage)
- Added safe response logging for all outcome paths (`auth`, `validation`, `execution`, `health`, `routing`).
- Added response headers for traceability:
  - `x-gnr8-correlation-id`
  - `x-gnr8-request-id` (when known)

### Worker client diagnostics (`gnr8/import-rendered-capture-worker/worker-client.ts`)
- Added status-enriched diagnostics on non-200:
  - `statusCode`
  - `stage` (`http_response`)
  - `workerErrorCode`
  - `workerErrorMessage` (safe subset)
  - `responseParsed` (whether worker error body parse succeeded)
  - `correlationId`
- Preserved `CAPTURE_WORKER_HTTP_ERROR` while enriching details to remove opacity.
- Added correlation-oriented request diagnostics details and header propagation context.

## 3) App-side status-code enrichment
- Non-200 HTTP worker responses now carry `statusCode` in diagnostics details (`CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `CAPTURE_WORKER_UNAUTHORIZED`, `CAPTURE_WORKER_UNAVAILABLE`, `RENDERED_CAPTURE_UNAVAILABLE`).
- Parsed error body metadata is captured when JSON error payload is available:
  - `workerErrorCode`
  - `workerErrorMessage`
  - `responseParsed`
- This now distinguishes `400` vs `401/403` vs `500` class outcomes at the app diagnostics layer without removing existing diagnostic codes.

## 4) Correlation strategy
- App client now sends:
  - `x-gnr8-request-id` = canonical worker `requestId`
  - `x-gnr8-correlation-id` = canonical `requestId` (or import/request fallback)
- Worker server reads and logs incoming correlation/request IDs, and returns `x-gnr8-correlation-id` + `x-gnr8-request-id` headers so one import can be matched end-to-end in logs/diagnostics.

## 5) Manual validation observations
### A. Direct manual POST (invalid + valid)
- Executed local worker manual run script with real HTTP POSTs.
- Invalid request (`kind: invalid`) produced:
  - `request_received` -> `auth_passed` -> `request_validation_started` -> `request_validation_failed` -> `response_sent status=400 errorCode=INVALID_WORKER_REQUEST`
- Valid request produced:
  - `request_received` -> `auth_passed` -> `request_validation_passed` -> `execution_started` -> `capture_service_entered` -> `navigation_started` -> `navigation_succeeded` -> `launch_probe_status passed` -> `execution_succeeded` -> `response_sent status=200`

### B. Fresh app import (`https://chs.sandbox.generator.live`)
- Executed importer probe in this workspace environment.
- Local `.env.production` currently resolves worker client config to `missing_base_url_and_shared_token`, so this run could not exercise the Railway worker HTTP path from this environment.
- Result: rendered capture remained unavailable in this local run due missing worker endpoint/token config, so no live Railway request/response pair was observed from this machine.

## 6) Exact failure now visible after the fix
- For worker HTTP failures, app diagnostics now expose exact HTTP status and parsed worker error metadata (when present), plus stage and correlation fields.
- For worker-side processing, logs now identify whether failure occurred at auth, validation, execution entry, navigation, launch-probe-related browser startup, or final response phase.
- A single failed import can now be mapped to:
  - request arrival
  - auth verdict
  - validation verdict
  - execution stage reached
  - exact response status/error code
  - client-side classification details

## 7) Limitations
- Railway production log validation from this workspace is blocked by missing local worker base URL/shared token configuration for live worker calls.
- This change does not redesign worker architecture or execution strategy.
- This change does not alter importer UX flow.
- Logging remains intentionally payload-safe; full request bodies/tokens are not emitted.

## 8) Next-step recommendation
- Use this instrumentation to run one Railway-connected failing import and capture a single correlated trace (`x-gnr8-correlation-id`) from app diagnostics and Railway logs to isolate the first concrete production failure code.

## Explicit non-goals for this task
- No computed style sampling redesign.
- No worker architecture redesign.
- No queue redesign.
- No multi-page capture.
- No OCR.
- No billing/subscription gating.

