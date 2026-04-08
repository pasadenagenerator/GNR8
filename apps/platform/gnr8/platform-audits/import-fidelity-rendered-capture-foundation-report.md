# Import Fidelity Hardening (Part 2) — Rendered Capture Foundation Report

## 1) Rendered capture contract
Implemented `apps/platform/gnr8/import-rendered-capture/` with a dedicated contract:
- `RenderedCaptureResult`
- `RenderedDocumentSnapshot`
- `RenderedScreenshotArtifact`
- `ComputedStyleSample`
- `RenderedCaptureDiagnostic`

The URL snapshot importer now persists/returns:
- `sourceMode: raw_html | rendered_dom`
- `responseHtmlPathAbs`
- `renderedCapture` payload

## 2) Readiness strategy
Implemented bounded deterministic readiness policy:
- navigation timeout (`domcontentloaded`)
- network quiet wait (`networkidle`) with timeout fallback
- DOM stabilization hash window (poll + stability threshold)
- max capture timeout guard

Diagnostics explicitly expose partial/timeout/unavailable states.

## 3) Rendered DOM snapshot model
Rendered DOM is captured as a separate artifact (`rendered-capture/rendered-dom.html`) and tracked through `RenderedDocumentSnapshot`.

Source provenance is explicit via `sourceMode` and is carried into migration-stage diagnostics/output refs.

## 4) Screenshot artifact model
Canonical screenshot artifacts are captured as:
- `desktop_viewport`
- `desktop_fullpage` (best-effort)

Artifacts include capture type, dimensions, full-page flag, and file path.

## 5) Computed style sampling model
Added constrained sampling for key targets:
- root/body
- header/nav
- hero
- h1/h2/h3
- body text
- primary CTA/button
- card/grid item
- footer

Sampled fields include font, color, background, radius, and padding signals.

## 6) Downstream source-preference strategy
Snapshot stage now emits:
- `sourceMode`
- `responseHtmlRef`
- `renderedDomRef`
- `primaryDocumentRef` (prefers rendered DOM when available)

Layout and canonical stages consume `primaryDocumentRef` and carry `sourceMode` into diagnostics/artifacts.

## 7) Diagnostics/fallback behavior
Added explicit diagnostics support:
- `RENDERED_CAPTURE_UNAVAILABLE`
- `RENDERED_CAPTURE_TIMEOUT`
- `RENDERED_CAPTURE_PARTIAL`
- `RENDERED_CAPTURE_FAILED`
- `SCREENSHOT_CAPTURE_FAILED`
- `COMPUTED_STYLE_SAMPLE_WEAK`

Fallback behavior is safe:
- if rendered capture is unavailable/failed, pipeline continues on raw HTML.

## 8) Reused components
Reused existing canonical import spine:
- URL snapshot importer core (`url-single-page-import`)
- deterministic diagnostics and manifest flow
- migration factory stages (`SNAPSHOT -> LAYOUT_GRAPH -> CANONICAL`)
- scoped importer/operator flow and Site Workspace pathing

## 9) Limitations
Current rendered capture is foundation-level:
- browser runtime is optional (Playwright best-effort via dynamic runtime availability)
- no multi-page crawl
- no deep CSS token graph extraction
- no OCR
- no autonomous screenshot-to-code redesign

## 10) Next-step recommendation
Proceed to **Import Fidelity Hardening (Part 3: Section Consolidation & Merge Pass)** to leverage rendered DOM + style/screenshot evidence for robust section boundaries and merge quality.

## Explicit Part 2 Non-Goals
Part 2 intentionally does **not** include:
- section consolidation merge pass
- multi-page crawl
- full CSS token extraction
- screenshot-based autonomous redesign
- OCR-heavy extraction
- full screenshot semantic segmentation
- billing/subscription gating
