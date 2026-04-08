# Import Fidelity Section Consolidation Tuning Report

## 1. Observed False-Positive Patterns

Primary failure pathways identified and tuned:

- `navbar.basic` overfired when a mixed top block had links plus narrative text.
- `faq.basic` overfired when sections had heading + paragraph pairs without true repeated Q/A structure.
- top-of-page hero fragments (heading/copy/CTA/image split across siblings) were underweighted.
- repeated service/feature card patterns were not consistently promoted over generic content.
- boundary merges could blend nav-like and narrative blocks or content-to-footer tails.

Manual target-site run note:

- attempted: `https://www.evolt.dev`, `https://servis-chs.generator.live`
- environment result: snapshot fetch failed (`ENTRY_FETCH_FAILED`, `NO_USABLE_IMPORT_SOURCE`, `RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE`), so direct in-environment live re-import comparison was blocked.

## 2. Scoring/Threshold Tuning Changes

### Consolidation scoring (`section-consolidation/engine.ts`)

- Added `anchorCount` signal into raw/consolidated section scoring.
- Increased hero top-cluster weighting for heading + (CTA or media) across merged fragments.
- Increased services candidate sensitivity for medium repetition patterns.
- Added content/hero/services penalties when high anchor clusters look nav-like.
- Added footer demotion for narrative-rich, non-bottom sections.

### Semantic classification (`migration/prepared-site-model.ts`)

- Added stricter per-type acceptance thresholds (not one global cutoff).
- Reduced nav/header promotion on mixed narrative top sections (link-density + narrative gating).
- Increased hero reconstruction weighting for top fragmented clusters.
- Increased services/features promotion for repeated structured patterns.

### Legacy detector thresholds (`importer/html-section-detector.ts`)

- `navbar.basic`: now requires stronger link-density and low narrative profile.
- `faq.basic`: now requires stronger repeated Q/A evidence (count/pattern/answer quality), with mixed-content and heavy-link guards.

## 3. Hero/Content/Services Tuning

- Hero reconstruction strengthened for split top-of-page clusters and merged sibling fragments.
- Services/features scoring strengthened when repetition + heading/media structure is present.
- Mixed narrative blocks are less likely to be absorbed by nav/footer pathways.
- Candidate traces now carry richer dominant-candidate metadata.

## 4. Boundary Protection Improvements

- Added hard boundary checks for nav-content and content-footer transitions during merge decisions.
- Added explicit nav-boundary protection diagnostic when merge is blocked to avoid over-merge.
- Preserved existing footer/nav hard boundaries and semantic conflict penalties.

## 5. Diagnostics Improvements

Added/propagated deterministic diagnostics:

- `NAVBAR_BOUNDARY_PROTECTED`
- `NAVBAR_FALSE_POSITIVE_RISK`
- `FAQ_FALSE_POSITIVE_RISK`
- `HERO_RECONSTRUCTION_APPLIED`
- `SERVICES_PATTERN_DETECTED`

Also surfaced section-level explainability fields into scoped import section props:

- `mergedBlockCount`
- `candidateSignals` (including dominant candidate)
- `dominantRationale`
- `classificationDiagnostics`

Structure View now shows merged block count, dominant candidate, top rationale line, and combined diagnostics.

## 6. Limitations

This tuning pass does **not** include:

- full style signal extraction v2
- screenshot semantic segmentation
- high-fidelity design reconstruction
- multi-page inference
- ML/AI clustering
- billing/subscription gating

This task is deterministic heuristic tuning of consolidation + semantic prioritization.

## 7. Next-Step Recommendation

Proceed with **Import Fidelity Hardening (Part 4: Style Signal Extraction V2)** to improve visual/semantic disambiguation once section boundary and semantic false-positive pressure is reduced.
