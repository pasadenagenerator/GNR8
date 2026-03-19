# Task 36 - URL Import Asset Fidelity + Visible Noise Filtering (Implementation Note)

## Added Asset Fidelity Improvements
- URL snapshot importer now deterministically supports additional asset surfaces:
  - `img/src`
  - `img|source srcset` candidates
  - lazy image fallback attrs: `data-src`, `data-original`, `data-lazy-src` (when `src` is missing)
  - protocol-relative refs (`//...`) resolved using entry scheme
  - one-level stylesheet-linked same-origin CSS `url(...)` assets from direct fetched stylesheets
- Successful fetches are rewritten to deterministic local snapshot paths.
- Stylesheet `url(...)` references are rewritten to deterministic stylesheet-relative local paths.

## Added Visible-Noise Filter Rule
- Export fallback text extraction now excludes non-visual container subtrees:
  - `script`, `style`, `noscript`, `template`, `iframe`, `object`, `canvas`, `svg`
- This prevents JSON-LD, analytics snippets, and script payloads from leaking into visible exported markup via excerpt fallback.

## Upstream Fields / Contracts
- URL import snapshot contract version bumped to `1.1.0`.
- URL import fetch scope expanded (still deterministic, single-page, no browser execution).
- URL import fetch-manifest entry surfaces expanded for image-related attributes (`srcset` + lazy attrs).
- No migration spine redesign, no browser rendering, no AI logic changes.

## GpHribar-Style Output Improvement
- Better image presence where source uses `srcset` / lazy attributes.
- Better CSS fidelity for deterministic stylesheet-linked local assets.
- Script/JSON-LD/analytics/noscript text no longer appears in visible exported fallback markup.

## Remaining Limitations
- No browser execution and no JS hydration.
- No multi-page crawl.
- CSS handling remains intentionally limited to deterministic one-level `url(...)` extraction in direct stylesheets (no full CSS engine).
- Unsupported/failed assets remain degraded with structured diagnostics (warning-mode preserved).
