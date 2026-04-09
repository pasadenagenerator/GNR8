# Import Source Reliability & Rendered Capture Hardening Report

## 1) Failure Modes Observed
- Entry fetches failed too early under host normalization gaps (`www`/non-`www`), transient timeout/network failures, and non-HTML content-type headers with HTML bodies.
- Rendered capture failures collapsed into broad outcomes, making browser startup/navigation/readiness issues hard to distinguish.
- Shell-like rendered DOM snapshots could force premature fallback without bounded recovery.
- Usable-source gating could over-fail when raw HTML fallback was weak-but-still-usable.

## 2) Fetch Hardening Changes
- Added bounded entry acquisition retries with deterministic policy:
  - URL candidates from normalized host variations (`canonical`, `www` toggle, trailing-slash variant)
  - bounded retries per candidate
  - bounded timeout via `AbortController`
- Added explicit fetch diagnostics:
  - `ENTRY_FETCH_TIMEOUT`
  - `ENTRY_FETCH_REDIRECT_LOOP`
  - `ENTRY_FETCH_UNSUPPORTED_CONTENT_TYPE`
  - richer `ENTRY_FETCH_FAILED` attempt summary
- Improved content-type handling:
  - accepts non-HTML content-type if body is HTML-like (with warning)
  - rejects non-HTML + non-HTML-like bodies with explicit classification
- Persisted fetch attempt evidence into `acquisition-evidence.json`.

## 3) Rendered Capture Reliability Changes
- Expanded rendered-capture diagnostic taxonomy:
  - `RENDERED_CAPTURE_BROWSER_START_FAILED`
  - `BROWSER_NAVIGATION_FAILED`
  - `RENDERED_CAPTURE_DOM_STILL_SHELL`
  - `RENDERED_CAPTURE_RECOVERED_ON_RETRY`
- Added explicit browser startup and navigation error classification before generic capture failure.
- Preserved bounded timeout signaling through readiness phases.

## 4) Readiness / Retry Strategy
- Kept deterministic bounded readiness with:
  - network-quiet wait
  - DOM stabilization polling window
  - max total capture budget
- Added bounded shell-recovery pass:
  - detects shell-like snapshots using text/heading/section/meaningful-node heuristics
  - performs controlled retry with delay
  - emits recovery diagnostics when successful

## 5) Usable-Source Decision Model
- Source gate now evaluates both rendered and raw quality explicitly.
- Priority remains rendered DOM when `strong`.
- If rendered is unavailable/weak, raw HTML fallback is accepted only when raw quality is not `unusable`.
- Added `RAW_HTML_WEAK_BUT_USABLE` warning to distinguish degraded but actionable fallback.
- Hard-fail now reserved for true no-usable-source conditions (`NO_USABLE_IMPORT_SOURCE`).

## 6) Diagnostics / Reporting Improvements
- Preserved and expanded source provenance:
  - `sourceMode`, `fidelityStatus`, `renderedDomQuality`
  - new `rawHtmlQuality` in source selection
- Added `acquisition-evidence.json` artifact with:
  - entry fetch attempts/outcomes
  - response snippet path
  - rendered capture status/diagnostics/readiness states/timings
  - selected-source quality summary
- Site Workspace summary now surfaces compact acquisition diagnostics directly in pipeline summary.

## 7) Limitations
- Manual run quality is constrained by local environment/runtime availability (for example Playwright availability influences rendered capture success state).
- Shell-like heuristics are intentionally conservative and may still misclassify edge-case minimal pages.
- Redirect-loop classification depends on runtime error message surface from fetch implementation.

## 8) Next-Step Recommendation
- Proceed with **Rendered Capture Visibility / Persistence Wiring** to expose attempt-level acquisition evidence and readiness timings directly in operator workflows.

## Manual Validation Notes
Targets executed:
- `https://www.evolt.dev`
- `https://servis-chs.generator.live`
- `https://example.com` (control)

Observed outcomes:
- `www.evolt.dev`: entry fetch succeeded, rendered capture unavailable in current runtime, degraded raw fallback selected, no fatal diagnostics.
- `servis-chs.generator.live`: entry fetch succeeded, rendered capture unavailable in current runtime, degraded raw fallback selected, no fatal diagnostics.
- `example.com`: no usable source in this environment due entry fetch network failures across bounded retries; hard-fail correctly emitted with attempt evidence.

## Explicit Out-of-Scope (Confirmed)
This task does **not** implement:
- multi-page crawl
- OCR-heavy extraction
- full style signal extraction v2
- screenshot semantic segmentation
- autonomous redesign improvements
- billing/subscription gating
