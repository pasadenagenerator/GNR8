# Import Fidelity Hardening (Part 2.5) - Enforced Rendered DOM Capture Report

## 1. Source Selection Policy
- `rendered_dom` is selected only when rendered capture produces a document and the rendered-content quality gate marks it `strong`.
- `raw_html_fallback` is selected only as explicit degraded fallback when rendered DOM is unavailable/weak but raw HTML is still usable.
- Import fails with explicit diagnostics when neither rendered DOM nor raw HTML is usable.

## 2. Rendered DOM Authority Model
- Scoped URL import now runs authoritative source selection before any downstream rewrite/asset extraction.
- Downstream structure/import operates on the selected authoritative document, not implicit raw entry HTML.
- `sourceSelection.selectedSourceHtmlPathAbs` records the exact artifact path used as import authority.

## 3. Degraded Fallback Model
- Fallback emits explicit diagnostics and fidelity downgrade state.
- `raw_html_fallback` is never treated as equivalent to `rendered_dom`.
- Fidelity status is persisted as one of:
  - `high_fidelity_import`
  - `degraded_import`
  - `capture_failed`

## 4. Rendered-Content Quality Gate
- Rendered DOM quality evaluation computes:
  - body text length
  - meaningful node count
  - section candidate count
  - heading presence
- Quality classification: `strong`, `weak`, `unusable`.
- `weak`/`unusable` rendered DOM triggers explicit degradation diagnostics and fallback policy.

## 5. Diagnostics and Status Model
- Added explicit diagnostics:
  - `RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE`
  - `RAW_HTML_FALLBACK_USED`
  - `IMPORT_FIDELITY_DEGRADED`
  - `RENDERED_DOM_EMPTY_OR_WEAK`
  - `NO_USABLE_IMPORT_SOURCE`
- Snapshot now persists source/fidelity metadata via `sourceSelection`.

## 6. Workspace and Reporting Visibility
- Scoped pipeline reporting now includes:
  - source mode
  - fidelity status / degraded flag
  - rendered capture status
  - rendered DOM quality
  - screenshot count
  - computed style sample count
  - import diagnostic codes
- Runtime semantic signals persist provenance/fidelity so Site Workspace can surface import source and fidelity state.
- Site Workspace Overview now visibly shows source mode, fidelity status, capture status, quality, screenshot count, and computed style sample count.

## 7. Limitations
- This work does not introduce multi-page crawling.
- No OCR or screenshot-to-code conversion was added.
- Section consolidation logic itself was not redesigned.
- Style intelligence remains current-generation (no extraction v2 in this task).

## 8. Next-Step Recommendation
- Proceed with **Import Fidelity Hardening (Part 3: Section Consolidation & Merge Pass Tuning)** to improve section quality now that source authority/fidelity state are enforced.

## Explicit Scope Boundary
This task intentionally does not include:
- section consolidation improvements beyond current state
- style signal extraction v2
- full screenshot semantic reasoning
- multi-page crawl
- OCR-heavy extraction
- autonomous redesign improvements

This task delivered: source authority + fidelity state enforcement.
