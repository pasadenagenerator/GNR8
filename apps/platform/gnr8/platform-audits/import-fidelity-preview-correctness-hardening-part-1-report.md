# Import Fidelity & Preview Correctness Hardening (Part 1) Report

## 1) Canonical import flow chosen
- Canonical scoped flow: `scoped_snapshot_import_v1`.
- Scoped agency/client import endpoint: `/api/gnr8/agency/clients/[clientId]/sites/import`.
- Operational sequence remains:
  1. Scoped Site Import Entry
  2. Snapshot importer (`importPublicSinglePageUrlToSnapshot`)
  3. HTML-to-page (`importHtmlToPage`)
  4. Canonical draft runtime version creation (`migrateImportedPageToCanonicalDraft`)
  5. Ownership/site linking (`ownership_site_id` + scoped `sites` row)
  6. Preview-ready Site Workspace redirect (scoped workspace URL)
- Legacy endpoints were retained for compatibility but now explicitly self-identify as `legacy_non_canonical`.

## 2) Preview type separation
- Added explicit preview concepts in code contracts:
  - `raw_imported`
  - `transformed`
  - `debug_inspect`
- Added explicit runtime preview modes:
  - `mode=transformed`
  - `mode=debug`
- Site Workspace preview resolution now explicitly distinguishes transformed vs debug-only states and does not conflate them.

## 3) Site Workspace preview source decision
- Main Site Workspace preview now resolves from transformed artifact availability only.
- When transformed artifact exists, it becomes the primary preview URL.
- Debug preview is preserved as a secondary/operator path and is labeled separately.
- If transformed artifact is unavailable, the workspace shows explicit readiness/fallback state instead of embedding misleading blank output.

## 4) Runtime preview wiring changes
- Runtime preview route now accepts explicit mode selection:
  - `mode=transformed` -> artifact-backed transformed HTML
  - `mode=debug` -> deterministic debug preview bundle
- Site Workspace preview URLs are now generated via explicit mode contract:
  - primary: transformed
  - optional secondary: debug
- Runtime preview route now returns explicit HTML fallback pages (not ambiguous blank states) when preview cannot be resolved.

## 5) Fallback / preview readiness behavior
- Added explicit readiness states:
  - `preview_available`
  - `preview_unavailable`
  - `debug_only_artifact_available`
  - `import_captured_not_transformed`
- Site Workspace read model now carries readiness + diagnostics so UI can show deterministic state.
- Preview fallback behavior is now intentional:
  - show transformed preview when available
  - otherwise show explicit unavailable/debug-only status and diagnostics
  - preserve debug preview access for operator inspection

## 6) Reused components
- Reused without rebuild:
  - snapshot importer core
  - html-to-page core
  - migration/runtime version creation primitives
  - runtime artifact store/model
  - Site Workspace tenancy/scope enforcement
  - design/structure read-model layers

## 7) Limitations
- Part 1 does not implement:
  - headless browser rendered capture
  - JS-executed final DOM capture
  - computed-style extraction
  - section consolidation merge pass
  - stronger style signal extraction
  - screenshot fidelity upgrades
- Legacy compatibility endpoints still exist and are marked non-canonical rather than removed.
- Transformed preview availability still depends on artifact availability for the selected runtime version.

## 8) Next-step recommendation
- Recommended next phase: **Import Fidelity Hardening (Part 2: Rendered Capture Foundation)**.
