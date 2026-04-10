# Import Fidelity Capture-Driven Design Quality Lift Report

## 1. Bottlenecks Found
- Rendered capture evidence was present but underweighted in semantic type scoring, especially for hero and CTA when DOM was fragmented.
- CTA extraction was overly binary (`hasCTA`) and underused position/prominence cues from consolidated rendered structure.
- Section grouping confidence from consolidation was not translated strongly enough into final semantic decisions.
- Media prominence was detected but too weakly reflected in section-type confidence and downstream strategy decisions.
- Content recovery rendering used generic heading/paragraph loops and did not prioritize recovered hero/CTA/media hierarchy from section payloads.
- Design strategy selection remained conservative and frequently defaulted to generic outcomes even when capture-informed section cues were strong.

## 2. Capture-Driven Lift Mechanisms Added
- Added confidence-aware capture-driven semantic diagnostics:
  - `CAPTURE_DRIVEN_HERO_LIFT_APPLIED`
  - `CAPTURE_DRIVEN_CTA_LIFT_APPLIED`
  - `CAPTURE_DRIVEN_SECTION_GROUPING_LIFT`
  - `CAPTURE_DRIVEN_MEDIA_PROMINENCE_USED`
- Added capture-evidence strength gating (`weak` / `partial` / `strong`) within consolidated section classification.
- Added targeted score lifts for hero/CTA/grouping/media only when evidence is partial or strong.
- Persisted capture lift strength into section rationale (`capture_lift_strength=*`) for provenance and downstream consumers.
- Improved CTA candidate recovery to reflect stronger multi-action sections deterministically.

## 3. Hero / CTA / Grouping / Media Improvements
- Hero reconstruction now receives explicit top-of-page prominence boosts when heading+CTA/media and grouped block evidence align.
- CTA classification is lifted by rendered prominence/position cues and not just phrase presence.
- Grouped multi-block sections now influence semantic confidence more directly through capture-driven grouping diagnostics.
- Media-forward sections receive stronger gallery/hero interpretation boosts under deterministic thresholds.
- Primary CTA selection now prioritizes upper-page hero/cta sections with stronger capture-informed confidence.

## 4. Strategy Selection Impact
- Design Intelligence now consumes capture-lift rationale from section semantics.
- Strategy selection now prefers:
  - `cta_focused` for strong top hero+CTA capture evidence
  - `visual_gallery` for capture-confirmed media-forward section distributions
- Weak capture evidence remains conservative and does not force aggressive strategy shifts.

## 5. Diagnostics / Provenance Behavior
- Capture-driven lift diagnostics are emitted at semantic classification time and propagated through semantic diagnostics.
- Section-level rationale now includes capture lift strength markers, enabling traceable decision provenance.
- Site Workspace can surface capture-driven lift presence via section key diagnostics (`CAPTURE_DRIVEN_*`).

## 6. Manual Validation Observations
Required manual validation targets:
- `nazrob.si`
- `polar.sh`
- `servis-chs.generator.live`

Status in this implementation run:
- Manual re-import/deploy validation was **not completed in this environment**.
- Code and deterministic tests were implemented for capture-driven behavior, but live before/after workspace/preview visual comparison remains pending deployment + runtime re-import.

## 7. Limitations
- No multi-page crawl.
- No OCR.
- No screenshot semantic segmentation.
- No full visual-to-code reconstruction.
- No billing/subscription gating work.
- This change remains deterministic and bounded to capture-driven quality lifts in existing pipeline layers.

## 8. Next-Step Recommendation
Proceed with **Worker Phase 2.5 (Computed Style Sampling Reliability)** to improve stability/coverage of style capture inputs that feed both semantic confidence and strategy selection.
