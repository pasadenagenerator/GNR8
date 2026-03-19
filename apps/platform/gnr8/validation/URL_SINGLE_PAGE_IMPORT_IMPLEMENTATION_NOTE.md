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
  - No recursive crawling and no browser JS execution.
  - Resolved asset URLs are mapped to deterministic local paths under `assets/`.
  - Collision handling is deterministic: append `-2`, `-3`, ... on path conflicts.

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
  - No CSS `url(...)` recursive asset pulling.
  - Non-fetchable assets are surfaced as structured diagnostics and can remain degraded-but-runnable.
