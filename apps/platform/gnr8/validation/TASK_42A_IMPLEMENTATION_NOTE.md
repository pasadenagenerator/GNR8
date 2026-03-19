# TASK 42A Implementation Note

## Regression Source (from Task 42)
- Gallery/lazy placeholder promotion regressed because wrapper-anchor promotion was narrowed to require header/logo context, which excluded previously working gallery/image-wrapper cases.
- Primary stylesheet preference was too broad in practice and needed a guard so it cannot reorder away from already-local/exportable stylesheet outcomes.

## What Was Restored
- Restored pre-Task-42 deterministic wrapper context behavior for placeholder image promotion:
  - wrapper anchor promotion works when deterministic wrapper evidence exists via header/logo OR image-wrapper/gallery/lightbox tokens.
- This brings back previously working gallery placeholder-to-visible-image promotion in final exported preview HTML.

## Primary Stylesheet Rule Narrowing
- Kept deterministic same-origin primary stylesheet detection/selection diagnostics.
- Narrowed head preference rule:
  - only promote selected primary stylesheet when current first stylesheet is non-local/remote
  - do not reorder when first stylesheet is already local/exportable
- This prevents remote-only preference from displacing better copied/local stylesheet outcomes.

## Transporti Maver / GpHribar-style Impact After Fix
- Gallery placeholder images in deterministic gallery wrapper contexts are visible again (copied local image src in final output).
- Remote-first stylesheet heads no longer displace better local/exportable stylesheet outcomes.
- Repeated runs remain deterministic for both HTML output and diagnostics.

## Remaining Limits
- No browser execution.
- No multi-page crawl.
- No cross-origin stylesheet localization.
