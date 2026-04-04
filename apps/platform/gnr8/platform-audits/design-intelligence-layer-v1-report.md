# Design Intelligence Layer V1 Report

## 1. DesignModel Introduced
- Added canonical model types under `apps/platform/gnr8/design-intelligence/design-model.ts`.
- Core model: `DesignModel` now carries deterministic page strategy, section decisions, component variants, spacing/typography direction, rationale, and diagnostics.
- Added explicit semantic input contract types (`DesignIntelligenceInput`, `DesignPageInput`, `DesignSemanticSectionInput`) to separate structural extraction from design decisions.

## 2. Deterministic Rule System
- Added `createDesignModel` and `createDesignModelFromInput` in `apps/platform/gnr8/design-intelligence/design-intelligence-service.ts`.
- Classification and design intent are rule-based only (no generative HTML/CSS output).
- Rule examples implemented:
  - Hero split when heading + media signals coexist.
  - Readable single-column for text-heavy low-media sections.
  - Primary CTA emphasis when multiple CTA candidates are detected.
  - Gallery treatment based on media/child-density.
- Rules are deterministic, replayable, and tested.

## 3. Strategy Selection Behavior
- Deterministic page strategy selection implemented with explicit outputs:
  - `corporate_balanced`
  - `cta_focused`
  - `editorial_readable`
  - `visual_gallery`
  - `service_split_layout`
- Strategy selection uses page-level features (content density, visual density, CTA signal, page type heuristics).
- Safe default strategy is `corporate_balanced` when weak/ambiguous.

## 4. Section Decision Behavior
- Per-section outputs now include:
  - section reference (`sectionId`, `pageId`, `sourceDomPath`)
  - inferred semantic type
  - selected visual treatment
  - emphasis (`primary`/`secondary`/`neutral`)
  - confidence and rationale
- Layout preparation now consumes this model and maps section design intent into each prepared block.

## 5. Rationale / Explainability Model
- `DesignRationale[]` is emitted at both strategy and section level.
- Rationale entries contain:
  - deterministic code
  - concise explanation
  - normalized evidence (`basedOn`)
- Diagnostics added for fail-closed behavior:
  - `DESIGN_INTELLIGENCE_DEFAULTED`
  - `DESIGN_INTELLIGENCE_LOW_CONFIDENCE`

## 6. Pipeline Integration Points
- Pipeline order updated to:
  - Import
  - Structure Preparation
  - Design Intelligence
  - Layout Preparation
  - Render Preparation
  - Preview Generation
- New pipeline stage: `design_intelligence`.
- `LayoutPreparationStageOutput` now explicitly depends on design output (`designIntelligence`).
- Validation summary now surfaces design layer state and key outputs (strategy, section decisions, rationale summary, diagnostics).
- Migration run report now includes `design_model` artifact and stage facts.

## 7. Limitations
- V1 intentionally excludes:
  - free-form AI redesign
  - trend-aware generative redesign
  - model-generated HTML/CSS
  - continuous optimization loops
  - autonomous redesign iteration
- Brand signal extraction is currently conservative (fallback-first) and can be expanded later.
- Semantic classification remains heuristic/rule-based and may be low-confidence for sparse markup.

## 8. Next-Step Recommendation
- Next best increment: AI-Assisted Design Suggestion Layer (V1), constrained behind deterministic validation and never allowed to bypass the rule-based core.
