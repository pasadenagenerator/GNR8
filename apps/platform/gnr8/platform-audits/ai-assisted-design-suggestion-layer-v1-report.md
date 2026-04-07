# AI-Assisted Design Suggestion Layer V1 Report

## 1. AI Suggestion Contract
- Added canonical AI suggestion contract in `apps/platform/gnr8/design-intelligence/ai-suggestion-model.ts`.
- Core types:
  - `AiDesignSuggestion`
  - `AiSectionSuggestion`
  - `AiSuggestionConfidence`
  - `AiSuggestionSource`
  - `AiSuggestionMergeResult`
- Contract supports:
  - Page-level strategy suggestions
  - Section-level treatment/emphasis suggestions
  - Confidence metadata
  - Rationale strings
  - Deterministic downstream merge decisions

## 2. Constrained Input Model
- Added `AiDesignSuggestionInput` and normalized summary payload.
- Input payload is constrained to pipeline artifacts, not unbounded raw DOM.
- Included fields:
  - Page type guess
  - Section list and semantic guesses
  - Text/media density summaries
  - CTA candidate summaries
  - Brand signal summary
  - Deterministic baseline strategy and section decisions

## 3. Merge/Validation Rules
- Deterministic baseline remains authoritative.
- AI suggestions are validated against known vocabularies before merge.
- Unknown values are rejected.
- Unknown section IDs are rejected.
- Structural conflicts (semantic/treatment incompatibility) are rejected.
- Merge output records accepted/rejected/ignored decisions with reason codes.

## 4. Confidence Handling
- Confidence-aware merge policy is explicit:
  - High confidence page strategy: eligible for acceptance.
  - Medium confidence section suggestions: accepted only when deterministic confidence is not already high.
  - Low confidence suggestions: ignored.
- Low-confidence paths are diagnosed and kept explainable.

## 5. Fallback Behavior
- AI layer is optional and non-blocking.
- On unavailable provider, failure, null suggestion, or malformed suggestion:
  - Pipeline still succeeds.
  - Deterministic model is preserved.
  - Diagnostics capture fallback/ignore behavior.

## 6. Explainability Model
- Final `DesignModel` now includes `aiAssistance` summary:
  - enablement state
  - merge status
  - accepted/rejected/ignored counts
  - merge decisions
  - rationale summary
- Merge decisions are converted into deterministic rationale entries.

## 7. Pipeline Integration
- Integrated AI-assisted suggestion + deterministic merge into `design_intelligence` stage.
- Stage output now carries:
  - `deterministicDesignModel`
  - `aiSuggestionInput`
  - `aiSuggestionMerge`
  - `designModel` (final merged canonical model)
- Layout/render continue to consume canonical `designModel` only.

## 8. Limitations (Explicit V1)
- No free-form autonomous redesign.
- No direct HTML/CSS generation by AI.
- No renderer bypass.
- No trend crawling/live trend ingestion.
- No screenshot-based redesign critique.
- No billing/Stripe gating implementation yet (architecture only prepared for future gating).

## 9. Next-Step Recommendation
- Next best step: **Import Quality Hardening (Structure + Semantics)**.
- Reason: higher-quality deterministic structure/semantic signals will improve both baseline quality and safe AI merge yield.
