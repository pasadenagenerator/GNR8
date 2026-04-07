# Visual Screenshot-Assisted Design Analysis V1 Report

## 1. Visual analysis contract
- Added canonical contract in `apps/platform/gnr8/visual-analysis/visual-analysis-model.ts`.
- Core output model: `VisualAnalysisModel` (`visual_analysis_model_v1`).
- Includes:
  - Page-level constrained observations (`style family`, `hero prominence`, `visual density`, `spacing rhythm`, `image/text balance`, `CTA prominence`, `readability tendency`).
  - Section-level constrained observations (`prominence`, bounded observation type).
  - `confidence`, `rationale`, and structured `diagnostics`.

## 2. Screenshot input contract
- Added structured input model: `VisualScreenshotInput` (`visual_screenshot_input_v1`).
- Input supports:
  - Screenshot references (`file_path`, `url`, `preview_artifact_ref`) + viewport metadata.
  - Optional page-level metric hints for deterministic heuristics.
  - Optional section bounding hints.
  - Optional semantic alignment hints.
- The layer is optional by contract and can run with missing input.

## 3. Page-level visual observations
- Deterministic heuristics implemented in `visual-analysis-service.ts` classify:
  - `dominantVisualStyleFamily`
  - `heroProminence`
  - `visualDensity`
  - `spacingRhythm`
  - `readabilityTendency`
  - `imageTextBalance`
  - `ctaProminence`
- Output vocabulary is constrained; no free-form labels are propagated.

## 4. Section-level visual observations
- Section-level hints are converted into bounded observations:
  - `balanced_content`
  - `media_forward_section`
  - `compressed_text_block`
  - `standout_cta_band`
  - `repeated_card_grid`
- Section observations include prominence, confidence, and rationale.
- Weak semantic alignment is explicitly diagnosed.

## 5. Confidence, rationale, diagnostics model
- Every model emits:
  - `confidence` (`low|medium|high`)
  - `rationale[]`
  - `diagnostics[]` with stable codes.
- Implemented diagnostics include:
  - `VISUAL_ANALYSIS_UNAVAILABLE`
  - `VISUAL_ANALYSIS_LOW_CONFIDENCE`
  - `VISUAL_ANALYSIS_SECTION_ALIGNMENT_WEAK`
  - `VISUAL_ANALYSIS_SCREENSHOT_MISSING`
  - `VISUAL_ANALYSIS_PAGE_METRICS_MISSING`

## 6. Integration with Design Intelligence
- New pipeline stage added:
  - `visual_analysis` between `structure_preparation` and `design_intelligence`.
- `DesignIntelligence` now consumes `visualAnalysis` as optional, confidence-gated enrichment.
- Deterministic authority preserved:
  - Structure/semantic model remains baseline truth.
  - Visual signals adjust strategy/spacing only under bounded rules.
  - No free-form image-driven redesign path was introduced.

## 7. Fallback behavior
- If no screenshot input is supplied:
  - Visual model returns `status: unavailable`.
  - Pipeline continues normally.
  - Diagnostics are emitted as non-blocking signals.
- If alignment is weak or metrics are incomplete:
  - Confidence degrades.
  - Structured diagnostics are emitted.
  - Deterministic structure/semantics continue to govern downstream decisions.

## 8. Limitations (explicit V1 scope)
- V1 does **not** include:
  - Screenshot-to-code generation
  - Autonomous screenshot-driven full-page redesign
  - Pixel-perfect screenshot segmentation
  - OCR-heavy understanding as critical path
  - Live trend analysis
  - Visual A/B optimization automation
- AI/multimodal extension is only a constrained provider boundary (`visual-analysis-ai-hook.ts`).

## 9. Next-step recommendation
- Add deterministic extraction of page metric hints from controlled preview artifacts so `visual_analysis` can run as `available` by default in validation fixtures while still remaining non-blocking.
