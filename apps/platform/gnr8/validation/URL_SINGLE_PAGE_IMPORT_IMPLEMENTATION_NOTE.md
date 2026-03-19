# URL Single-Page Import - Implementation Note

- Snapshot structure:
  - `<snapshot_root>/imported-url-site-<hash16>/`
  - `fixture.json`
  - `index.html`
  - `assets/<kind>/<urlHash12>-<basename>[ -N ].<ext>`
  - `url-import-diagnostics.json`
  - `url-fetch-manifest.json`

- Snapshot root selection (runtime-safe, deterministic rule):
  - Explicit caller override: `snapshotRootDirAbs` (if provided).
  - Else env override: `GNR8_URL_IMPORT_SNAPSHOT_ROOT_ABS` (absolute or resolvable path).
  - Else deployed Vercel runtime (`VERCEL=1|true`): `${os.tmpdir()}/gnr8/validation/url-import-snapshots`.
  - Else local/dev default: `apps/platform/gnr8/validation/.out/url-import-snapshots` (resolved from validation runtime module location, not `process.cwd()`).

- URL normalization/key rule:
  - Accept only one `http(s)` URL input.
  - Normalize by removing fragment (`#...`), keeping query string, and clearing default port (`:80`/`:443`).
  - Snapshot key: `imported-url-site-${sha256(normalizedUrl).slice(0,16)}`.

- Entry HTML + asset mapping rules:
  - Entry is always written as `index.html`.
  - Fetch scope is single-page only:
    - entry HTML
    - direct `<link rel="stylesheet" href>`
    - direct `<img src>`
    - direct `<script src>` (static file references only)
    - image candidate URLs from `<img|source srcset>` and `<img data-srcset>`
    - lazy-image fallback attrs when `<img src>` is missing: `data-src`, `data-original`, `data-lazy-src`
    - one-level stylesheet-linked local assets from CSS `url(...)` inside fetched direct stylesheets
  - No recursive crawling and no browser JS execution.
  - Resolved asset URLs are mapped to deterministic local paths under `assets/`.
  - Collision handling is deterministic: append `-2`, `-3`, ... on path conflicts.

- Deterministic asset-fidelity hardening rule (v1.2):
  - Standard image `src`:
    - resolve against entry URL, fetch when `http(s)`, rewrite to `/<snapshot-local-asset-path>` when fetched.
  - Root-relative + relative paths:
    - both are resolved with URL semantics against the entry URL and treated equivalently for deterministic fetch/rewrite.
  - Protocol-relative URLs (`//host/path`):
    - resolved against entry URL scheme (for example `https:`), then fetched/re-written under the same deterministic rule.
  - `srcset` policy:
    - parse candidate URLs deterministically, fetch each candidate independently, rewrite each successfully fetched candidate URL in-place, preserve descriptors (`1x`, `2x`, `640w`, etc.).
    - failed/unsupported candidates remain original and are diagnosed.
  - Visible image selection policy (deterministic precedence):
    - For each `<img>`, choose the first fetched local candidate in this fixed order:
      - non-placeholder `img[src]`
      - best `picture > source[srcset|data-srcset]` candidate (highest `x`, then highest `w`, then lexical tiebreak)
      - best `img[srcset]`
      - best `img[data-srcset]`
      - lazy fallback attrs in order: `data-src`, `data-original`, `data-lazy-src`
      - nearest ancestor gallery-anchor `a[href]` (image-like href only) when `img[src]` is placeholder-like
      - placeholder/fallback `img[src]` last
    - Placeholder-like `img[src]` is detected conservatively (`data:` URLs, `about:blank`, known placeholder tokens).
    - Selected candidate is promoted to concrete `img[src]` so downstream static import/materialize can copy and rewrite a browser-usable visible source.
  - Gallery-anchor policy:
    - `<a href>` references are fetched as image candidates only when the anchor wraps image/picture content and the href is image-like.
    - fetched gallery hrefs are rewritten in snapshot HTML and remain visible in fetch-manifest diagnostics.
  - Lazy-image attribute policy:
    - supported fallback attrs are `data-src`, `data-original`, `data-lazy-src` when `src` is absent/empty.
    - fetched fallback is rewritten and also promoted to `src` for static usability.
  - Stylesheet-linked local assets:
    - fetch one level of CSS `url(...)` references from fetched direct stylesheets when same-origin/local to entry URL.
    - rewrite CSS `url(...)` to deterministic stylesheet-relative local paths; remote/off-origin CSS URLs are preserved and diagnosed as unsupported-reference info.
  - Degraded handling:
    - unresolved/failing assets remain non-fatal, stay visible via structured diagnostics and fetch-manifest statuses.

- Operator trigger path:
  - API: `POST /api/validation/url-import`
  - Optional operator hard-gate: `GNR8_VALIDATION_OPERATOR_KEY` with header `x-gnr8-validation-operator-key`.

- Pipeline integration:
  - The URL snapshot is imported through existing deterministic runtime:
    - `importStaticSite` -> `createImportManifest` -> `runLinearMigrationPhase1ApproveExecute`
  - Supports both `simulation` and `materialize` execution modes.

- Current limitations:
  - Single page only (no multi-page crawl).
  - No JS rendering/browser automation.
  - No auth/session flows.
  - CSS asset pulling is intentionally one-level only (`url(...)` in direct stylesheets); no recursive crawler and no full CSS parser.
  - Non-fetchable assets are surfaced as structured diagnostics and can remain degraded-but-runnable.
  - `srcset` is used for deterministic candidate discovery/promotion, but final downstream export fidelity still centers on concrete promoted `img[src]`.
