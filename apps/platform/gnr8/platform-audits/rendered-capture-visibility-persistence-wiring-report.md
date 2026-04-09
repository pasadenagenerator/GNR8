# Rendered Capture Visibility / Persistence Wiring Report

## 1. Current Metadata Flow
- `url-single-page-import` produces rendered-capture status/artifacts/diagnostics (`sourceSelection`, `renderedCapture`, `importDiagnostics`, snapshot evidence files).
- `scoped-import-pipeline` computed fidelity labels for `semantic_signals` and reporting, but visibility depended on parsing those labels later.
- Runtime page persistence kept those labels in `gnr8_runtime_page_versions.semantic_signals`, but no canonical site-version summary existed.
- Site Workspace read model parsed label strings from page semantic signals; any signal drift/absence yielded `unknown`.

## 2. Persistence Shape Chosen
- Canonical persisted shape: `runtime_import_provenance_summary_v1`.
- Location: `gnr8_runtime_site_versions.import_provenance_summary` (`jsonb`).
- Fields:
  - `sourceMode`
  - `importFidelityStatus`
  - `renderedCaptureStatus`
  - `renderedDomQuality`
  - `screenshotCount`
  - `computedStyleSampleCount`
  - `importDiagnosticCodes`
  - `captureEvidence` refs:
    - selected source HTML path
    - response HTML path
    - entry HTML path
    - `rendered-capture.json` path (if present)
    - `acquisition-evidence.json` path (if present)
    - screenshot file paths (if present)

## 3. Runtime Summary Mapping
- Scoped import now builds `RuntimeImportProvenanceSummary` once from snapshot truth.
- Summary is persisted on success and on legacy fallback via runtime site-version update.
- Site Workspace read model resolves import fidelity from persisted summary first, with semantic-signal fallback for older versions.

## 4. Workspace Display Wiring
- Overview pipeline summary now reads canonical provenance fields and displays:
  - source mode
  - fidelity status
  - rendered capture status
  - rendered DOM quality
  - screenshot/style counts
  - import diagnostics
  - capture evidence references
- Structure / Design / Preview surfaces now show the same provenance truth line to reduce cross-tab inconsistency.

## 5. Unknown vs Zero Normalization Rules
- `unknown` is used only when a status field is absent from both persisted summary and semantic-signal fallback.
- Counts are numeric (`0+`) and never rendered as unknown.
- Explicit persisted values always win over derived semantic-signal labels.
- Diagnostics are merged/deduped and sorted.

## 6. Limitations
- This task did **not** change rendered capture execution behavior.
- This task did **not** implement style signal extraction v2.
- This task did **not** add screenshot semantic reasoning.
- This task did **not** add multi-page crawl behavior.
- This task did **not** add billing/subscription gating.
- `next build` currently fails on pre-existing Stripe ESM export mismatch (`app/api/stripe/webhook/route.ts` import trace), unrelated to rendered-capture wiring.

## 7. Next-Step Recommendation
- Continue with **Import Fidelity Hardening (Part 4: Style Signal Extraction V2)** now that provenance persistence and visibility are stable.
