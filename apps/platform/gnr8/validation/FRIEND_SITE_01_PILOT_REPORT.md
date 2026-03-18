# FRIEND_SITE_01_PILOT_REPORT

## Pilot metadata
- Date: 2026-03-18
- Fixture ID: `friend-site-01`
- Source site snapshot: `https://startbootstrap.github.io/startbootstrap-landing-page/`
- Fixture root: `apps/platform/gnr8/validation/fixtures/friend-site-01/`
- Acquisition mode: deterministic file snapshot (HTML + downloaded local assets)

## Migration outcome summary
- End-to-end phase-1 flow completed in both operator modes:
  - `simulation`: success (`executed_with_warnings`)
  - `materialize`: success (`executed_with_warnings`)
- Deterministic preview URL generated:
  - `/validation/previews/by-output/L1VzZXJzL2dyZWdvcnppZ29uL0RvY3VtZW50cy9Db2RleC9HTlI4L2FwcHMvcGxhdGZvcm0vZ25yOC92YWxpZGF0aW9uL2ZpeHR1cmVzL2ZyaWVuZC1zaXRlLTAxLy5nbnI4LXN0YXRpYy1vdXRwdXQvN2VhYWJmNzgzNTlmZjNjMQ/index.html`
- Deterministic static export bundle materialized at:
  - `/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/gnr8/validation/fixtures/friend-site-01/.gnr8-static-output/7eaabf78359ff3c1`
- Overall validation status: `passed_with_warnings`

## Structured run artifacts
- Simulation response:
  - `apps/platform/gnr8/validation/.out/friend-site-01-pilot/simulation-response.json`
- Materialize response:
  - `apps/platform/gnr8/validation/.out/friend-site-01-pilot/materialize-response.json`
- Pilot summary:
  - `apps/platform/gnr8/validation/.out/friend-site-01-pilot/pilot-summary.json`

## Diagnostics overview
- Key diagnostic codes:
  - `unsupported_remote_asset`
  - `UNSUPPORTED_REMOTE_ASSET`
  - `ASSET_REFERENCE_REWRITE_SKIPPED_RAW_MISMATCH`
- Materialization summary:
  - page files: `1`
  - copied assets: `6`
  - skipped assets: `4` (all remote)
  - missing assets: `0`
  - failed assets/pages: `0`

## Preview inspection
- Accessibility:
  - validated via route handler against generated `previewKey` (entry HTML + CSS asset returned `200`)
- Layout block extraction quality:
  - extracted nodes: `10`
  - source tags represented: `nav`, `header`, `section`, `footer`, `script`
  - script tags surfaced as empty structural sections (`3` textless nodes)
- Visible content fidelity:
  - textual content is present but reduced to excerpted structural text; original visual hierarchy/components are not preserved in phase-1 preview
- Asset load correctness:
  - preview route can serve generated page and copied local assets
  - remote assets remain external references and are warning-only

## Export inspection
- HTML structure correctness:
  - exported `index.html` is valid and deterministic, with structural sectionized output
- Asset path rewrites:
  - local assets were rewritten/copied under bundle `assets/assets/...`
  - rewrite warning emitted: `ASSET_REFERENCE_REWRITE_SKIPPED_RAW_MISMATCH`
- Stylesheet fidelity:
  - stylesheet file is copied and link preserved (`assets/css/styles.css`)
  - visual fidelity is still limited by phase-1 structural rendering model
- Missing asset handling:
  - no missing-local-asset errors in this fixture run
- Unsupported asset handling:
  - remote CSS/JS assets correctly flagged and skipped with warnings

## Fidelity issues
- Visual output is intentionally not a pixel-faithful export in phase-1; output is structure-first content projection.
- Background imagery in original markup (hero/showcase treatment) is not represented in exported structure-first HTML rendering.
- External icon/font/script dependencies remain remote and are not mirrored in phase-1.

## Extraction issues
- Script tags from source were promoted into renderable structural blocks, producing non-content sections in preview/export.
- Current asset extraction did not capture all style-driven image usage patterns needed for high-fidelity static parity.

## Export issues
- Asset destination includes nested prefix (`assets/assets/...`), which is deterministic but operator-hostile for manual bundle inspection.
- Warning code casing is duplicated (`unsupported_remote_asset` vs `UNSUPPORTED_REMOTE_ASSET`), reducing diagnostic clarity.

## Operator UX friction
- Operator run is deterministic and usable, but warning semantics require internal familiarity (mixed-case code variants).
- Bundle inspection requires manual understanding of deterministic output-root hashing and nested asset paths.
- Fidelity expectations are not explicitly surfaced as a first-class warning category (structure-first vs visual parity).

## Required phase-2 capabilities
- Deterministic, explicit style-asset coverage for style-embedded references (without heuristic DOM rewrites).
- Deterministic filtering/classification of non-render-content tags (e.g., scripts) during structural projection.
- Canonical diagnostic code normalization to remove casing duplicates.
- Operator-facing fidelity classification layer (e.g., structural parity vs visual parity indicators).
- Export path ergonomics improvements while preserving deterministic invariants.

## Readiness signal
- Phase-1 migration spine is production-usable for deterministic structural migration runs on real external static landing input.
- Phase-2 is required for visual-fidelity scaling, stronger asset completeness, and operator-grade diagnostics/UX.
