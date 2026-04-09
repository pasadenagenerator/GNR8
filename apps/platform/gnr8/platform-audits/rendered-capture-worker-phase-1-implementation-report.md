# Rendered Capture Worker Phase 1 Implementation Report

Date: April 9, 2026

## 1. Worker Implementation Shape
- Implemented a dedicated internal worker endpoint at `app/api/internal/gnr8/rendered-capture-worker/route.ts` (`nodejs`, bounded sync request/response).
- Implemented worker execution service in `gnr8/import-rendered-capture-worker/worker-service.ts`.
- Worker executes browser capture via `runRenderedCapture(...)` in worker runtime surface, then returns worker-contract response.
- Worker now emits explicit worker diagnostics (`CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_FAILED`, `CAPTURE_WORKER_RENDERED_DOM_USED`).

## 2. Request/Response Contract Usage
- Request contract: `createRenderedCaptureWorkerRequest(...)` from `worker-contract.ts` is used by scoped import integration.
- Response contract: `RenderedCaptureWorkerResponse` is validated in `worker-client.ts` (shape + version).
- Invalid responses are handled deterministically with explicit diagnostics:
  - `CAPTURE_WORKER_RESPONSE_INVALID`
  - `RENDERED_CAPTURE_UNAVAILABLE`

## 3. Artifact Handoff Used
- Phase 1 handoff uses contract `artifacts[]` with `storage: inline` and data URI payloads for:
  - rendered DOM HTML
  - viewport/fullpage PNG screenshots
  - computed-style JSON blob
- Importer-side adapter (`worker-adapter.ts`) materializes worker artifacts into deterministic local snapshot files and maps back to `RenderedCaptureResult`.
- This removes dependency on cross-service `/tmp` path assumptions at the app↔worker boundary.

## 4. Integration Into Scoped Import
- Canonical scoped import path now attempts rendered capture through worker client by default in `url-single-page-import.ts`.
- Legacy in-process `renderedCaptureExecutor` path is preserved only as explicit test override.
- Flow now is:
  - URL import request
  - worker request build + worker client execute
  - worker response adapter to capture result
  - source selection
  - pipeline continuation + persistence/provenance

## 5. Security/Trust Model
- Worker endpoint requires `x-gnr8-rendered-capture-worker-token` and validates against `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
- Worker client config supports:
  - `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`
  - `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`
  - `GNR8_RENDERED_CAPTURE_WORKER_PATH`
  - `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`
  - `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`
- Missing/invalid config fails closed to deterministic unsupported response and raw fallback path.

## 6. Fallback Behavior
- If worker is unavailable/invalid/unsupported/failed, source selection degrades to `raw_html_fallback` (unchanged safety behavior).
- Explicit worker fallback diagnostic added:
  - `CAPTURE_WORKER_FALLBACK_TO_RAW_HTML`
- No silent rendered capture success is possible when worker output is unusable.

## 7. Manual Validation Results
Executed on April 9, 2026 with worker-backed path (direct worker service invocation through worker client contract):

1. `https://nazrob.si`
- worker path used: yes
- sourceMode: `raw_html_fallback`
- renderedCaptureStatus: `unavailable`
- rendered DOM length: 0
- screenshots: 0
- computed style samples: 0
- fallback diagnostic: present

2. `https://polar.sh`
- worker path used: yes
- sourceMode: `raw_html_fallback`
- renderedCaptureStatus: `unavailable`
- rendered DOM length: 0
- screenshots: 0
- computed style samples: 0
- fallback diagnostic: present

3. `https://servis-chs.generator.live`
- worker path used: yes
- sourceMode: `raw_html_fallback`
- renderedCaptureStatus: `unavailable`
- rendered DOM length: 0
- screenshots: 0
- computed style samples: 0
- fallback diagnostic: present

Interpretation:
- Worker integration path is active and deterministic.
- In this execution environment, Playwright/browser runtime support remained unavailable, so fallback behavior was exercised and persisted truthfully.

## 8. Limitations
- This phase does not include async queue capture.
- This phase does not include multi-page crawl.
- This phase does not include richer screenshot/OCR analysis.
- This phase does not include billing/subscription gating.
- This phase does not include full worker autoscaling/orchestration.
- Phase 1 currently uses inline artifact payloads for service-boundary handoff; object storage handoff remains a next-step hardening item.

## 9. Next-Step Recommendation
- Proceed to **Rendered Capture Worker Implementation (Phase 2: Async / Queue)** after runtime environment support (Playwright package/binary availability) is confirmed in deployed worker infrastructure.
