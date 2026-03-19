# Task 38 - Generalized Asset Fidelity and Visual Export Hardening (Implementation Note)

## What was added
- URL-import snapshot hardening now includes deterministic gallery-anchor image candidates (`a[href]` when wrapping image/picture content).
- Deterministic visible-image promotion now sets a concrete exported `img[src]` from fetched candidates across `src`, `srcset`, lazy attrs, picture/source, and gallery wrappers.
- Static import asset extraction now supports image-like `a[href]` references.
- Static bundle rewrite now supports rewriting `a[href]` references to copied output assets.
- Render-output now skips non-visual empty blocks when subtree content is script/style/noscript/template-only and no visible fallback exists.

## Exported path rule (explicit)
- Rule: `exported_ref = posix.relative(dirname(page.outputPath), copiedAsset.outputPath)` with deterministic fallback to basename when relative is empty.
- Consequence: rewritten refs are page-relative (no app-root absolute `/...`), so they resolve both:
  - inside local materialized bundles
  - through hosted preview route `/validation/previews/by-output/<previewKey>/...`

## Hosted preview correctness
- Rewritten exported HTML avoids root-absolute copied-asset refs for supported rewritten surfaces (`link[href]`, `img[src]`, `script[src]`, `a[href]`).
- Copied stylesheet links and stylesheet `url(...)` dependencies remain browser-usable after materialization because snapshot CSS rewrites use stylesheet-relative paths that remain valid in bundle structure.

## Visible image selection rule (explicit precedence)
- For each `img`, first fetched local candidate wins in this order:
  1. non-placeholder `img[src]`
  2. best `picture > source[srcset|data-srcset]` candidate
  3. best `img[srcset]`
  4. best `img[data-srcset]`
  5. lazy attrs (`data-src`, `data-original`, `data-lazy-src`)
  6. nearest ancestor gallery `a[href]` (image-like href) when `img[src]` is placeholder-like
  7. placeholder `img[src]` fallback
- `srcset` “best” candidate is deterministic: highest density (`x`), then highest width (`w`), then lexical tie-break.

## Gallery/lazy handling
- Gallery-anchor href fetch/rewrite is conservative: only image-like hrefs and only anchors that wrap image/picture content.
- Lazy attrs remain fetched/rewritten and can be promoted to concrete `img[src]`.

## Stylesheet dependency rewrite behavior
- Direct stylesheet fetch remains in scope.
- One-level CSS `url(...)` dependencies remain in scope for same-origin/local assets.
- Successfully fetched CSS dependencies are rewritten to stylesheet-relative local paths; unsupported or failed refs remain diagnosed.

## Non-visual empty-block filtering rule
- During render-output mapping, blocks are omitted when all are true:
  - subtree is non-visual-only (`script/style/noscript/template`, optionally wrapped by neutral containers),
  - `preservedMarkupHtml` is empty/null,
  - `textExcerpt` is empty/null.
- This removes script-origin empty export sections while keeping conservative behavior for unusual potentially-visual content.

## Degraded handling
- Failed/unsupported asset fetches are still surfaced in diagnostics/fetch-manifest.
- Warning-mode imports remain structured and exportable when blocking conditions are not met.

## GpHribar-style improvement summary
- Placeholder/gallery/lazy image structures now deterministically promote to fetched local visible image sources.
- Exported HTML asset refs are rewritten to hosted-preview-safe relative paths on supported surfaces.
- Script-only noise blocks no longer emit useless empty visible sections.

## Remaining limitations
- No browser execution, no JS hydration, no multi-page crawl.
- No recursive CSS graph traversal beyond one-level `url(...)` in fetched direct stylesheets.
- No full CSS parser/optimizer.
- Fidelity for unsupported surfaces still degrades with explicit diagnostics.
