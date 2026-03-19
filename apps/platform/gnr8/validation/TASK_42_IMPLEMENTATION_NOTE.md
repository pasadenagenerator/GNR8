# TASK 42 Implementation Note

## What Changed

### 1) Deterministic primary/site stylesheet rule (URL import)
- Added one explicit selection rule for primary/site stylesheet localization:
  - candidate must be `<link rel~="stylesheet" href="...">`
  - candidate must be inside `<head>`
  - candidate must resolve to same-origin `http(s)` URL
  - choose exactly one primary candidate by deterministic ranking:
    - highest role score from URL/path tokens (`site/theme/main/style/global/app/brand`, with css/styles path bonus)
    - tie-break by earliest source occurrence
- Added explicit diagnostics for primary lifecycle:
  - `PRIMARY_STYLESHEET_DETECTED`
  - `PRIMARY_STYLESHEET_SELECTED`
  - `PRIMARY_STYLESHEET_CAPTURED`
  - `PRIMARY_STYLESHEET_FETCH_FAILED`
  - `PRIMARY_STYLESHEET_NOT_REWRITE_ELIGIBLE`
  - `PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML`

### 2) Primary stylesheet localization/copy/rewrite + final preview emission
- Stylesheet href rewrite eligibility now requires fetched/copied local asset (no silent stylesheet href rewrite to missing local file).
- When selected primary stylesheet is fetched/copied, importer prefers it as the first stylesheet link in `<head>` before writing final snapshot HTML.
- If selected primary cannot be preferred in final HTML despite capture, import remains warning-mode with explicit `PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML`.

### 3) Deterministic header/logo placeholder image promotion hardening
- Wrapper-anchor promotion now stays conservative for the target class of issue:
  - placeholder/data URL image required
  - header/logo context required
  - nearby anchor/image-wrapper context evidence required
  - fetched local image target required
- This keeps promotion constrained to explicit header/logo wrapper use-cases and avoids broad content-anchor image promotion.

## Final Preview HTML Improvement
- Eligible primary/site stylesheet now appears as a usable copied local stylesheet and is preferred in final persisted/exported HTML head order.
- Header/logo placeholder image wrappers now reliably resolve to visible copied local logo/image where deterministic evidence exists.
- Existing gallery/lazy-image improvements remain in place.

## Transporti Maver / GpHribar-style Impact
- Same-origin head theme/site stylesheets are now deterministically selected and promoted when fetchable, reducing CSS-missing preview cases.
- Header/logo placeholder wrappers with deterministic anchor/image evidence now promote to visible copied local logos.
- Non-fetchable stylesheet cases remain structured degraded states with explicit warning diagnostics, not silent success.

## Remaining Limitations
- No browser execution.
- No multi-page crawl.
- No cross-origin stylesheet localization.
- No full CSS engine/render simulation.
