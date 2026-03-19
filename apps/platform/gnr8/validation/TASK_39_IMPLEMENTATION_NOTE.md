# TASK #39 — Relative Asset Paths + Safe Anchor Rewrite (Hosted Preview Export)

## What changed
- Exported asset destination rule changed from `assets/<resolvedPath>` to `<resolvedPath>`.
- Rewritten HTML references still use page-relative browser paths, computed from page output dir to copied output file.
- Anchor `<a href>` rewrite now has explicit safety guards and rewrites only deterministic gallery/image anchors.

## Deterministic path-generation rule
- Copy eligible local assets to `<outputRoot>/<resolvedPath>`, where `resolvedPath` is the importer-normalized local path.
- Do not prepend another export prefix.
- Rewrite HTML refs to page-relative paths from `dirname(page.outputPath)` to copied output path.

This keeps exported refs browser-usable for both:
- hosted preview routes (`.../index.html` loading sibling bundle files),
- static materialized bundle roots.

## Duplicate-prefix prevention
- Because copied output path now preserves `resolvedPath` exactly, paths like `assets/assets/...` are no longer generated when source already resolves under `assets/...`.

## Safe anchor rewrite eligibility
- Rewrite `<a href>` only when all are true:
  - reference is local + validated + copied,
  - href is image-like,
  - anchor wraps image/picture content.
- Explicitly preserve unchanged:
  - `tel:`
  - `mailto:`
  - `javascript:`
  - `#fragment`
  - ordinary internal navigation/content links
  - ordinary external `http(s)` content links
  - non-gallery/button-like anchors that are not image/picture targets

If an anchor reference is local/copyable but fails safe-anchor eligibility, rewrite is skipped and warning code `ASSET_REFERENCE_REWRITE_SKIPPED_UNSAFE_ANCHOR` is emitted.

## Test coverage added/updated
- Stylesheet and image rewrite paths now assert `assets/...` (not `assets/assets/...`).
- URL-import operator export assertions updated to expect browser-usable relative asset refs without duplicate prefixes.
- New safe-anchor test verifies:
  - gallery/image anchor rewrite still works,
  - `tel/mailto/#/navigation/external` links remain unchanged,
  - unsafe anchor rewrite skips remain diagnosable.
- Determinism tests remain unchanged and continue to pass with the updated rule.

## Real URL-import impact (Transporti Maver / GpHribar-style)
- Exported preview HTML no longer emits duplicate-prefixed bundle paths.
- Copied stylesheet/image refs are now page-relative and hosted-preview compatible.
- Non-image link semantics are preserved instead of being over-rewritten.

## Remaining limitations
- No browser execution/crawl expansion.
- No CSS transformation engine changes.
- Anchor safety policy is intentionally strict; non-gallery image file links are preserved unless they meet deterministic gallery/image-anchor criteria.
