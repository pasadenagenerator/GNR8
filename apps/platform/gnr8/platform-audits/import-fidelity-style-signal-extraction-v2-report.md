# Import Fidelity Hardening — Style Signal Extraction V2 Report

## 1. Style Signal Contract
- Added canonical contract layer in `apps/platform/gnr8/style-signals/`.
- Core model: `StyleSignalModel` (`style_signal_model_v2`) with:
  - `sourceMode`: `computed_style | html_css_inference | mixed`
  - `colors`: background tone, primary/secondary accents, neutral palette, CTA color hint
  - `typography`: heading/body family hints, category hints, scale hint, weight contrast hint
  - `spacing`: rhythm, section spacing, layout density
  - `surfaces`: radius/shadow hints
  - `cta`: prominence + style hint
  - `visualToneHint`
  - explicit diagnostics with deterministic diagnostic codes

## 2. Computed-Style-First Extraction Strategy
- Primary extraction now consumes rendered capture `computedStyleSamples` when available.
- The extractor scores repeated/salient style evidence by probe target (`root`, `h1/h2`, `primary_cta`, etc.) to avoid overfitting one-off colors.
- Derived from computed evidence:
  - dominant background tone
  - accent colors and CTA color hint
  - typography family/category and scale hints
  - spacing rhythm + density hints
  - CTA style/prominence
  - radius/shadow tendency hints

## 3. Fallback Inference Strategy
- When computed samples are weak/missing, extraction degrades to deterministic HTML/CSS signal inference from prepared semantic/brand signals.
- Fallback remains explicit via diagnostics:
  - `STYLE_SIGNAL_COMPUTED_SAMPLE_MISSING`
  - `STYLE_SIGNAL_USING_HTML_FALLBACK`
  - category-specific weak diagnostics
- No fake precision: unresolved fields remain `unknown`/`null`.

## 4. Color / Typography / Spacing / CTA Extraction
- Implemented deterministic extraction in `style-signal-extractor.ts` for:
  - color tone/accent/neutral/CTA hints
  - heading/body typography families + categories
  - typography scale + weight contrast hints
  - spacing rhythm + section spacing + layout density
  - CTA style and prominence
  - surface style hints (radius/shadow)
- Added explicit weak/partial diagnostics:
  - `STYLE_SIGNAL_WEAK`, `STYLE_SIGNAL_PARTIAL`
  - `STYLE_COLOR_SIGNAL_WEAK`, `STYLE_TYPOGRAPHY_SIGNAL_WEAK`, etc.

## 5. Persistence + Workspace Visibility
- Style signals are persisted in runtime import provenance summary (`runtime_import_provenance_summary_v1`) under `styleSignals`.
- Scoped import now also emits style semantic labels and style tokens into runtime page snapshots.
- Site Workspace read model parses and exposes persisted style signals.
- Site Workspace UI now surfaces compact style summary:
  - source mode
  - tone/accent
  - typography hint
  - spacing/density
  - CTA hint
  - style diagnostics

## 6. Design Intelligence Integration
- Design Intelligence now accepts/retains style signals in `DesignIntelligenceInput` and `DesignModel`.
- Strategy selection now safely uses style evidence (without overriding structure recklessly):
  - strong CTA prominence can bias to `cta_focused`
  - dark + strong accent can bias to `visual_gallery`
- Spacing and color systems now consume style signals in deterministic derivation.
- Pipeline wiring passes style signals into design stage when computed-style evidence exists.

## 7. Limitations
- This task does **not** implement:
  - full CSS recreation
  - screenshot semantic segmentation
  - high-fidelity visual reconstruction
  - multi-page crawl
  - OCR-heavy extraction
  - subscription/billing gating
- Shadow usage inference remains lightweight/class-token-driven.
- Computed-style probes are still single-target snapshots, not full page-wide CSS telemetry.

## 8. Next-Step Recommendation
- Strengthen computed-style probe coverage with additional deterministic salience sampling for repeated CTA/card variants and section-level spacing deltas.
