# Runtime Cost Accuracy Improvements Report

Date: 2026-03-27  
Environment: `apps/platform` with `.env.production` loaded

## 1. Executive Summary
Runtime usage logging is now serverless-safe on the real request path by persisting runtime usage events per request instead of relying on process-local in-memory aggregation + interval flushing. DB-backed validation confirms new `public.runtime_usage_events` rows are created from real Maver runtime requests, with billing attribution fields populated and unified cost status moving from `AI_ONLY` to `PARTIAL_SIGNAL`.

## 2. Root Cause of Missing Runtime Signal
The original implementation failed in production-backed behavior due to two combined issues:

1. Architecture/runtime-lifecycle mismatch:
- Public runtime path wrote to process-local memory (`runtime-usage-collector`) and depended on timer flush (`runtime-usage-flusher`).
- In serverless-style execution, timers/process lifetime are not reliable for eventual flush persistence.

2. Billing-context key mismatch on runtime path:
- Runtime artifact resolution emitted runtime site IDs like `site_a978f53fa5aadbb51fdf`.
- Billing resolution / cost event writes expect ownership site UUIDs (`public.sites.id`), causing UUID-cast failures and skipped writes.

Observed failure evidence during DB-backed validation before fix:
- `invalid input syntax for type uuid: "site_a978f53fa5aadbb51fdf"`
- `runtime_usage_events` remained empty and unified cost stayed `AI_ONLY`.

## 3. New Runtime Logging Strategy
Implemented strategy: immediate per-request persistence in request scope.

Key changes:
- Added `gnr8/runtime/runtime-usage-event-logger.ts`:
  - resolves billing context once per request
  - writes `runtime_usage_events` immediately via `logRuntimeUsageEventWithAttribution`
  - `estimated_cost` fixed to `0`
  - skip/warn behavior for missing site or missing billing context
  - warn/skip on persistence errors (runtime response not broken)

- Added `logRuntimeUsageEventWithAttribution(...)` in `cost-event-logging-service.ts`:
  - allows runtime logger to reuse resolved attribution and avoid duplicate context resolution work
  - preserves existing validation and insert guarantees

- Updated runtime render hook (`src/public-site/public-runtime-render.tsx`):
  - removed dependency on flush loop from request path
  - runtime usage logging is now awaited per request window (`periodStart`/`periodEnd` around request)

- Kept collector/flusher as legacy compatibility modules, explicitly marked as no longer on critical runtime signal path.

## 4. Real Request Path Coverage
Coverage is in the actual public runtime serving path:
- `app/route.ts` -> `renderPublicPathResponse`
- `app/(public)/[[...slug]]/route.ts` -> `renderPublicPathResponse`

Fix for ownership mapping in diagnostics path:
- `resolveActiveArtifactForHostAndPathWithDiagnostics` now also returns `ownershipSiteId` (UUID) from `gnr8_runtime_site_versions.ownership_site_id`.
- Runtime logging now uses `ownershipSiteId ?? siteId`, ensuring billing context resolution uses canonical ownership UUID when available.

No duplicate runtime write per request was introduced.

## 5. Validation Results
### Required build/type/test checks
1. `pnpm exec tsc --noEmit`
- pass

2. Relevant runtime tests
- command:
  - `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/runtime-usage-collector.test.ts gnr8/runtime/runtime-usage-flusher.test.ts gnr8/runtime/runtime-usage-event-logger.test.ts src/public-site/public-runtime-render.test.ts gnr8/runtime/runtime-happy-path.integration.test.ts`
- result:
  - pass: 15
  - fail: 1 (`runtime-happy-path.integration.test.ts`)
- failing reason:
  - `DATABASE_URL is required for real runtime verification` (environment gate)

3. `pnpm exec next build`
- pass

### DB-backed verification (real conditions)
Actions:
- Triggered 3 real public runtime requests for Maver through runtime render path with production DB env loaded.
- Queried `public.runtime_usage_events` for Maver site (`91fb0854-9b84-4c4b-aff4-777043ab6451`).

Results:
- Before requests: `0` recent runtime events
- After requests: `3` recent runtime events (`newRowsCount=3`)
- Request statuses: `200, 200, 200`
- Persisted fields confirmed on inserted rows:
  - `billing_account_id`: populated (`c7ed82fb-ec8d-4d84-8654-708d657dde6c`)
  - `agency_id`: populated (`00000000-0000-4000-8000-000000000001`)
  - `client_id`: populated (`61b953f8-ca84-417a-b275-eca1bb18bca7`)
  - `site_id`: populated (`91fb0854-9b84-4c4b-aff4-777043ab6451`)
  - `artifact_id`: populated (`e437c4a3-c9d2-42b0-a041-4719e1628f2b`)
  - `request_count`: `1`
  - `bandwidth_bytes`: `9209`
  - `compute_ms`: populated (`111`, `164`, `938` observed)
  - `estimated_cost`: `0.000000`
  - `period_start` / `period_end`: request window timestamps persisted

## 6. Unified Cost Impact
For Maver (`site_id=91fb0854-9b84-4c4b-aff4-777043ab6451`) after runtime writes:
- `runtime_event_count`: `3`
- `runtime_request_count`: `3`
- `cost_completeness_status`: `PARTIAL_SIGNAL`

Status transition observed:
- Before: `AI_ONLY`
- After: `PARTIAL_SIGNAL`

(`FULL_SIGNAL` not reached because migration signal remains absent.)

## 7. Remaining Limitations
- Per-request write is intentionally correctness-first and may have higher DB write volume than batched aggregation.
- Legacy collector/flusher modules still exist for compatibility/tests; they are no longer used in live request-path runtime logging.
- Runtime integration test requiring `DATABASE_URL` still fails in non-DB test contexts by design.
- This change does not attempt runtime cost pricing calibration (`estimated_cost` remains `0`).

## 8. Recommended Next Step
**Unified Cost Operational Re-Review**

Reason: runtime signal is now materially present and attributed in production-backed verification. The next highest-value step is a focused re-review across AI/runtime/migration signals to confirm current completeness class and operational decision readiness with the corrected runtime pipeline.
