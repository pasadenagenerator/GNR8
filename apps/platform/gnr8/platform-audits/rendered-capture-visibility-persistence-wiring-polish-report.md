# Rendered Capture Visibility / Persistence Wiring Polish Report

## Before vs After Visibility

- Before:
  - Rendered capture artifacts were partially persisted, but `snapshot/rendered/*` evidence files were not guaranteed.
  - `rendered-capture.json` did not expose deterministic quality/source coverage breakdown fields.
  - Runtime provenance stored coarse capture status and counts, without explicit `used`/coverage/screenshot mode truth.
  - Style signal extraction exposed source mode and diagnostics but did not encode structured provenance (`computedStyle.used`, coverage, fallback usage).
  - Site Workspace overview showed summary signals but lacked a dedicated evidence section and operator-focused debug file path panel.

- After:
  - When rendered capture is attempted, deterministic evidence files are now materialized at:
    - `snapshot/rendered/rendered-dom.html`
    - `snapshot/rendered/computed-styles.json`
    - `snapshot/rendered/screenshots/viewport.png`
    - `snapshot/rendered/screenshots/fullpage.png`
  - `rendered-capture.json` now includes explainability fields:
    - `status` (`available|partial|failed`)
    - `quality`
    - `qualityBreakdown`
    - `styleSampleSummary`
    - `screenshotSummary`
  - `runtime_import_provenance_summary_v1` now carries enriched rendered capture provenance (`used`, quality, style coverage, per-screenshot booleans) plus explicit evidence paths.
  - `StyleSignalModel` now includes provenance with source mode, computed-style usage, coverage, fallback flag, and deterministic diagnostics list.
  - Site Workspace Overview now includes an Import Evidence block and an expandable debug details panel with evidence paths and filtered diagnostics.

## Known Blind Spots Removed

- Silent fallback ambiguity removed:
  - Strong rendered capture + `html_css_inference` now emits `STYLE_SIGNAL_COMPUTED_STYLE_NOT_USED`.
- Weak computed-style footprint ambiguity removed:
  - `styleSampleCount > 0` and coverage `< 0.2` now emits `STYLE_SAMPLE_LOW_COVERAGE`.
- Artifact existence ambiguity removed:
  - Rendered evidence files are now always created after capture attempt, even on weak/failed outcomes (diagnostic-only/empty payload mode).
- Provenance source-of-truth ambiguity reduced:
  - Runtime summary now distinguishes “capture existed” vs “capture used” via `renderedCapture.used`.

## Remaining Unknowns

- Historical rows already persisted with legacy summary shape may not include all enriched fields until re-import/re-run.
- `rendered-capture` legacy artifact directory remains for backward compatibility; operator surfaces now prefer `snapshot/rendered/*` evidence paths.
- Coverage currently uses deterministic fixed expected sample target count (`10`); this is explicit and stable, but may need future versioning if probe set changes.
