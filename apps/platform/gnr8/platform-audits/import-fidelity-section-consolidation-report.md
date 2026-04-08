# Import Fidelity Section Consolidation Report

## 1. Consolidation Strategy

A deterministic Section Consolidation pass was introduced under:

- `apps/platform/gnr8/section-consolidation/`

The pass receives normalized raw semantic blocks, groups them with explicit heuristics, and emits consolidated section candidates with confidence, rationale, and merge decisions. It runs before semantic section typing inside structure preparation.

## 2. Merge Heuristics

Consolidation merges adjacent groups using deterministic scoring with explicit boundaries:

- DOM proximity (`ordinal` distance, near-adjacent tolerance)
- Shared parent container
- Heading anchoring (heading + adjacent copy/CTA/media)
- Density similarity (text density delta threshold)
- Repetition clustering (card/grid/service patterns)
- CTA proximity (action + nearby text)
- Top-window hero recovery and tail-window footer clustering

It does not merge when strong boundaries are detected:

- nav/header/footer boundaries
- semantic conflicts between nav/footer and main content
- large DOM gaps above threshold

## 3. Footer Mitigation

Footer classification is now effectively delayed until after consolidation signals are formed.

Additional mitigation is applied when footer-like candidates conflict with stronger content/CTA signals:

- demotes footer candidate confidence when large content exists above and CTA+heading are present
- emits `FOOTER_FALSE_POSITIVE_PREVENTED`

## 4. Hero Reconstruction

Hero recovery is explicit in consolidation scoring:

- prioritizes top-of-page clustered heading + copy + CTA/media fragments
- merges split hero fragments into one consolidated section candidate
- preserves rationale and merge decisions for explainability

## 5. Rendered Capture Integration

This implementation keeps the pass deterministic and structure-first, and is compatible with rendered-capture-aware flows:

- consolidation consumes deterministic block signals now
- the contract is prepared for optional visual hints
- downstream visual analysis remains available for strategy/treatment decisions

Current deterministic implementation does not depend on OCR/ML/screenshot segmentation.

## 6. Diagnostics

New diagnostics emitted from consolidation and carried into prepared semantic diagnostics:

- `SECTION_CONSOLIDATION_APPLIED`
- `SECTION_MERGE_HEAVY`
- `SECTION_MERGE_MINIMAL`
- `SECTION_BOUNDARY_UNCERTAIN`
- `FOOTER_FALSE_POSITIVE_PREVENTED`

## 7. Limitations

- No ML clustering
- No screenshot segmentation model
- No OCR-driven extraction
- No multi-page inference
- No full visual layout engine

The pass is fully deterministic and heuristic-driven.

## 8. Next-Step Recommendation

Strengthen style signal extraction for section-level visual fidelity after structural consolidation is in place.
