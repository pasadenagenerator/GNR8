# Rendered Capture Runtime Environment Audit + Fix Report

## 1. Real Runtime Environment Findings
- Scoped import route already runs on `nodejs` runtime (`app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`).
- Rendered capture executor uses dynamic `import("playwright")`.
- `apps/platform/package.json` did not include `playwright`, so browser runtime availability depended on accidental external install state.
- In this state, rendered capture frequently resolves to unavailable/failed and degrades to `raw_html_fallback`.
- Rendered capture now emits runtime environment probe diagnostics:
  - runtime (`NEXT_RUNTIME`/nodejs)
  - Node version/platform/arch
  - tmp-dir and snapshot-dir writability

## 2. Exact Failure Mode(s) Found
- Primary environment failure mode:
  - Browser runtime dependency missing (`playwright` not installed in platform package dependency set).
- Secondary observability failure mode:
  - Capture failures were visible but not step-by-step self-describing across browser launch, navigation, DOM serialization, screenshot, style sampling.

## 3. Root Cause Classification (Environment vs Page)
- Environment-level:
  - `ENVIRONMENT_UNSUPPORTED`
  - `RENDERED_CAPTURE_UNAVAILABLE`
  - `BROWSER_LAUNCH_FAILED` (when launch fails due to binary/runtime constraints)
- Page-level:
  - `NAVIGATION_FAILED` / `BROWSER_NAVIGATION_FAILED`
  - `DOM_EMPTY_AFTER_RENDER` / `RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION`
  - `STYLE_SAMPLING_FAILED` / `RENDERED_CAPTURE_STYLE_SAMPLING_FAILED`
  - `SCREENSHOT_FAILED` / `SCREENSHOT_CAPTURE_FAILED`

## 4. Fix Applied
- Added `playwright` dependency to `apps/platform/package.json`.
- Added explicit runtime environment probe at capture start.
- Added stage-by-stage diagnostics:
  - browser launch start/success/failure
  - page creation start/success
  - navigation start/success/failure (+ final URL)
  - readiness wait start/completed
  - screenshot capture start/success/failure
  - DOM serialization start/success/failure
  - style sampling start/success/failure
  - cleanup start/completed
- Added structured `executionTruth` to:
  - `rendered-capture.json`
  - `acquisition-evidence.json`
  - persisted runtime import provenance summary (`renderedCapture.execution`)

## 5. New Diagnostics
- Added precise/structured rendered-capture diagnostic codes:
  - `RENDERED_CAPTURE_RUNTIME_ENVIRONMENT`
  - `ENVIRONMENT_UNSUPPORTED`
  - `BROWSER_LAUNCH_STARTED|SUCCEEDED|FAILED`
  - `PAGE_CREATION_STARTED|SUCCEEDED`
  - `NAVIGATION_STARTED|SUCCEEDED|FAILED`
  - `READINESS_WAIT_STARTED|COMPLETED`
  - `SCREENSHOT_CAPTURE_STARTED|SUCCEEDED`
  - `SCREENSHOT_FAILED`
  - `DOM_SERIALIZATION_STARTED|SUCCEEDED`
  - `DOM_EMPTY_AFTER_RENDER`
  - `STYLE_SAMPLING_STARTED|SUCCEEDED|FAILED`
  - `CLEANUP_STARTED|COMPLETED`

## 6. Remaining Limitations
- No multi-page crawl.
- No consolidation redesign.
- No style-signal redesign.
- No screenshot semantic segmentation.
- No billing/subscription gating logic.
- Live-site manual re-import validation still required for:
  - `nazrob.si`
  - `www.evolt.dev`
  - `servis-chs.generator.live`
  - `polar.sh`

## 7. Next-Step Recommendation
- Continue with **Import Fidelity Hardening (Part 4.5: Style Signal Utilization Tuning)** after confirming rendered-capture environment availability and diagnostic truth on live imports.
