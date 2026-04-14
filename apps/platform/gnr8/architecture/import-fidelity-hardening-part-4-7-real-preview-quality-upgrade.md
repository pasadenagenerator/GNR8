# Import Fidelity Hardening (Part 4.7) — Real Preview Quality Upgrade

## 1) Problem
The import pipeline produced structurally valid but visually weak preview input. Section boundaries, hierarchy, layout, and style evidence were often under-inferred, causing generic/fallback-heavy previews.

## 2) Fidelity Definition
Import fidelity is deterministic confidence that imported truth preserves:
- structure (section boundaries + roles)
- layout intent (stack/columns/grid/split)
- visual hierarchy (heading + grouping cues)
- style signals (colors/typography/spacing/surfaces/CTA)
- content/action cues (media prominence + CTA + repeatable groups)

## 3) Pipeline Boundaries
In scope:
- deterministic heuristics in import semantic preparation
- style-signal extraction hardening
- provenance/diagnostic surfacing

Out of scope:
- renderer redesign
- content-resolution redesign
- merge-engine redesign
- AI/LLM reasoning
- full CSS rendering engine

## 4) Structure Inference Model
Section preparation now adds richer deterministic signals:
- role scoring (`hero|feature|cta|gallery|faq|pricing|footer|generic`)
- ambiguity detection (`SECTION_CLASSIFICATION_AMBIGUOUS`)
- structure-confidence guardrail (`IMPORT_STRUCTURE_CONFIDENCE_LOW`)
- repeatable-group detection (`REPEATABLE_GROUP_INFERRED`)

## 5) Layout Inference Model
Per section, deterministic layout inference is computed from sibling/repetition/depth/media signals:
- `stack` (fallback)
- `columns`
- `grid`
- `split`

Fallback is explicit via `LAYOUT_INFERENCE_FALLBACK`.

## 6) Style Signal Model
Style extraction now includes stronger coverage heuristics and component profiling:
- color/typography/spacing/surface/CTA signals
- coverage diagnostics (`STYLE_SIGNAL_LOW_COVERAGE`, `STYLE_SIGNAL_PARTIAL`)
- component profiles (button/card/section contrast)

## 7) Media/CTA Detection
The model now emits stronger deterministic diagnostics for weak or missing cues:
- `MEDIA_PROMINENCE_UNCLEAR`
- `CTA_NOT_DETECTED`

CTA/media are also reflected in section scoring and grouping.

## 8) Rendered Capture Strategy
Rendered capture is surfaced explicitly in provenance diagnostics:
- `RENDERED_CAPTURE_USED` when rendered DOM is selected
- deterministic capture status/quality propagation into preview/runtime summary

## 9) Fallback Strategy
When fallback is selected, quality does not collapse silently:
- fallback is explicit (`RENDERED_CAPTURE_FAILED_FALLBACK_USED`)
- structure/style/content/layout are still heuristically scored
- diagnostics remain deterministic and sorted

## 10) Fidelity Scoring Model
A deterministic score object is computed and persisted:
- `structureScore`
- `styleScore`
- `contentScore`
- `layoutScore`
- `overallScore`
- `fidelityLevel` (`low|medium|high`)

Score computation emits `IMPORT_FIDELITY_SCORE_COMPUTED`.

## 11) Diagnostics Model
Diagnostics are additive, deterministic, and sorted at semantic stage and provenance stage. New required diagnostics are propagated into runtime-readable summary surfaces.

## 12) Preview Impact
Preview receives stronger section props:
- section role
- heading hierarchy hint
- layout inference
- grouping signals
- structural layout intent metadata

Result: higher-credibility structure and hierarchy in downstream preview behavior.

## 13) Determinism Strategy
All heuristics use fixed thresholds, bounded arithmetic, stable ordering, and sorted diagnostics. Same input yields same score/diagnostics/section layout outcomes.

## 14) Risks
- heuristic threshold drift across atypical templates
- over/under-classification for sparse pages
- partial style evidence may still require conservative rendering

## 15) Open Questions
- Should fidelity thresholds be per vertical (agency/corp/ecommerce)?
- Should style coverage include rendered screenshot-derived non-CSS proxies?
- Should section-role and renderer section-type mapping converge further?

## 16) Rollout
- deterministic tests added/extended for role/layout/style/fidelity score/provenance parsing
- rollout is backward-compatible: new fidelity score is optional in provenance schema

## 17) Recommendation
Proceed with calibrated production telemetry on new diagnostics and fidelity-score distribution, then gate future automation decisions on `overallScore` bands.
