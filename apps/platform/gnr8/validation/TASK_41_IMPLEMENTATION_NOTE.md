# TASK 41 Implementation Note

## What Changed

### 1) Primary Stylesheet Capture Hardening (URL import)
- Added explicit primary stylesheet candidate rule:
  - candidate must be `<link rel~="stylesheet" href="...">`
  - must be in HTML `<head>`
  - must resolve to same-origin `http(s)` URL
- Same-origin head stylesheet candidates are now explicitly diagnosed as:
  - `PRIMARY_STYLESHEET_CAPTURED` when fetched/copied
  - `PRIMARY_STYLESHEET_FETCH_FAILED` when fetch fails
  - `PRIMARY_STYLESHEET_NOT_REWRITE_ELIGIBLE` when present but cannot be made rewrite-eligible
- Cross-origin stylesheet links are now deterministically preserved as unsupported (not localized), with info diagnostics.

### 2) Copied-local stylesheet propagation to final preview rewrite
- Persisted-preview stylesheet alias matching now includes URL-import canonical alias mapping:
  - copied path pattern `assets/stylesheet/<hash12>-<basename>`
  - alias candidate `assets/<basename>`
- This improves root-relative source-like stylesheet target matching in persisted preview normalization when copied stylesheet output paths are hashed.
- Existing unmatched/ambiguous warnings remain visible:
  - `[preview.persisted_stylesheet_rewrite] unmatched stylesheet target`
  - `[preview.persisted_stylesheet_rewrite] skipped ambiguous stylesheet target`

### 3) Header/logo placeholder image promotion hardening
- Added deterministic wrapper-context gate for anchor-driven image promotion:
  - placeholder/data URL img source required
  - nearby ancestor anchor href must resolve to fetched local image
  - context must show strong wrapper evidence:
    - header/nav or header/logo tokens (`logo`, `brand`, `masthead`, etc.), or
    - explicit image-wrapper tokens (`gallery`, `thumbnail`, `lightbox`, `media`, etc.)
- Promotion now also works when wrapper anchor href has already been rewritten to local snapshot paths.
- Ordinary placeholder images without deterministic wrapper context are not promoted.

## Degraded Handling (non-hard-failure behavior)
- Stylesheet/image fetch failures remain warnings and are diagnosable via snapshot diagnostics + fetch manifest.
- Warning-mode flows remain materializable/previewable where structurally possible.
- Persisted preview rewrite still warns (not fails) on unmatched stylesheet targets.

## Final Preview HTML Improvements
- Eligible copied local head stylesheets are consistently rewritten to copied local paths in exported/persisted preview HTML.
- Deterministic header/logo placeholder wrappers now emit visible copied image sources in final exported HTML.
- Existing gallery/lazy-image behavior remains preserved.

## Transporti Maver / GpHribar-style Case Impact
- Pages with local theme CSS in head now carry better capture diagnostics and stronger copied-local rewrite eligibility into persisted previews.
- Header/logo regions where placeholder `<img>` is wrapped by deterministic logo/header image anchors now render visible exported images instead of placeholders.
- Cases with unresolved stylesheet targets stay warning-visible instead of silently failing.

## Remaining Limitations
- No browser execution; JS-mutated runtime-only assets are still out of scope.
- No multi-page crawl; only single-entry import context is considered.
- No semantic component inference beyond deterministic structural token/context rules.
- Cross-origin stylesheet localization is intentionally not attempted.
