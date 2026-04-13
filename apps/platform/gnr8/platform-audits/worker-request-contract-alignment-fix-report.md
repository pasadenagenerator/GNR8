# Worker Request Contract Alignment Fix Report

## 1. Authoritative contract shape
The authoritative worker request contract is now enforced by `parseRenderedCaptureWorkerRequestDetailed(...)` in:
- `apps/platform/gnr8/import-rendered-capture-worker/worker-service.ts`

Accepted canonical JSON shape (`rendered_capture_worker_request_v1`):
- `kind`: `rendered_capture_worker_request_v1`
- `contractVersion`: `1.0.0`
- `requestId`: non-empty string
- `importId`: non-empty string
- `sourceUrl`: non-empty string
- `trace`: object with `agencyId|clientId|siteId` (`string|null`)
- `capture.viewport.width|height`: finite number
- `capture.readinessPolicy.navigationTimeoutMs|networkQuietTimeoutMs|domStabilizationWindowMs|domStabilizationPollMs|maxTotalCaptureMs`: finite numbers
- optional readiness fields when present must be finite numbers: `shellContentMinLength|shellDetectionRetryCount|shellDetectionRetryDelayMs`
- `capture.captureScreenshots|captureComputedStyles|captureRenderedDom`: booleans
- `capture.timeoutBudgetMs`: finite number

## 2. Previous app payload shape
App payload was built through `createRenderedCaptureWorkerRequest(...)` and sent via:
- `apps/platform/gnr8/import-rendered-capture-worker/worker-client.ts` (`body: JSON.stringify(request)`)

Before this fix, runtime serialization accepted any ad-hoc `RenderedCaptureWorkerRequest` object passed into `execute(...)` and did not force canonical normalization at the transport boundary.

## 3. Exact mismatch found
The concrete mismatch class fixed was contract strictness/shape drift at runtime boundaries:
- Worker-side parser previously performed only shallow checks and returned a generic `INVALID_WORKER_REQUEST` without field-level diagnostics.
- Transport layer did not canonicalize request objects before serialization, so non-canonical caller payloads (including legacy wrapped payloads and partial runtime-shaped objects) could diverge from strict contract expectations.

Field-level incompatibilities now explicitly surfaced include:
- Missing required fields (`capture`, `trace`, `requestId`, etc.)
- Invalid field path/type (`kind`, `capture.viewport.width`, `capture.captureScreenshots`, etc.)
- Contract discriminator mismatches (`expectedKind`, `expectedContractVersion`)

## 4. Fix applied
Implemented end-to-end alignment in one canonical path:
- Added canonical request normalization:
  - `canonicalizeRenderedCaptureWorkerRequest(...)` in `worker-contract.ts`
- Enforced canonical serialization in app worker client before HTTP POST:
  - `worker-client.ts`
- Replaced shallow parser with strict detailed validator:
  - `parseRenderedCaptureWorkerRequestDetailed(...)` in `worker-service.ts`
- Kept legacy compatibility for wrapped payloads (`{ request: { ... } }`) while still validating full contract.

## 5. Improved validation diagnostics
`INVALID_WORKER_REQUEST` now returns structured safe details:
- `details.expectedKind`
- `details.expectedContractVersion`
- `details.missingFields[]`
- `details.invalidFields[]` with `path`, `expected`, `actual`

This is wired in both:
- `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts`
- `apps/platform/gnr8/rendered-capture-worker-server/server.ts`

## 6. Correct manual POST example
Documented canonical minimal debug POST payload in:
- `apps/platform/gnr8/rendered-capture-worker-server/README.md`

## 7. Manual validation results
### A. Direct worker POST (`/internal/gnr8/rendered-capture-worker`)
Local dedicated worker run:
- `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=local-worker-token`
- host `127.0.0.1`, port `4011`

Results:
- Valid canonical payload: HTTP `200`, worker returned `rendered_capture_worker_response_v1` (no `INVALID_WORKER_REQUEST`).
- Invalid payload (`{"kind":"invalid"}`): HTTP `400` with structured details (`missingFields`, `invalidFields`, `expectedKind`, `expectedContractVersion`).

### B. Fresh app import checks
Manual import run through app pipeline (`importPublicSinglePageUrlToSnapshot`) using worker endpoint:
- `https://chs.sandbox.generator.live`
- `https://nazrob.si`

With explicit worker timeout (`GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=35000`) both imports:
- moved past request validation
- reached worker execution (`CAPTURE_WORKER_RESPONSE_PARSED`, `NAVIGATION_STARTED`, `NAVIGATION_SUCCEEDED`)
- had no `INVALID_WORKER_REQUEST`
- had no `CAPTURE_WORKER_HTTP_ERROR` / `CAPTURE_WORKER_REQUEST_FAILED`

## 8. Remaining limitations
This task intentionally does **not** include:
- computed style sampling redesign
- worker queue redesign
- multi-page capture
- OCR
- billing/subscription gating

## 9. Next-step recommendation
Contract alignment is complete; next high-value step should be:
- **A. Worker Phase 2.5 (Computed Style Sampling Reliability)**
