# Import Fidelity Hardening (Part 4.5) — Style Signal Utilization Tuning Report

## 1. Current Underutilization Bottlenecks Found
- Computed-style sampling used `querySelector` first-match probes only, which often hit low-value or non-representative nodes.
- CTA/style inference had weak distinction pressure (many cases collapsed to unknown/weak under partial evidence).
- Design stage in linear pipeline could receive computed-only style signals from scoped import wiring, underusing prepared-site + visual context for merge quality.
- Strategy selection used style signals, but weighting was shallow and often lost to conservative defaults.
- Site Workspace showed style fields but lacked compact “confidence + synthesis” summaries for operator-level quick assessment.

## 2. Sampling/Utilization Improvements Made
- Updated rendered capture probe selectors to better target high-signal regions (`header/nav`, hero patterns, CTA candidates, card/feature/service sections).
- Replaced first-match computed-style probe selection with deterministic candidate scoring over visible nodes:
  - visibility + size filtering
  - target-specific ranking (hero/top placement, CTA phrasing/class hints, footer bottom placement, body-text depth)
  - bounded candidate set for deterministic runtime behavior.
- Added stronger weighted background-tone inference by target salience (root/hero weighted above CTA backgrounds).

## 3. CTA/Color/Typography/Spacing Tuning
- CTA:
  - stronger differentiation between `text_link`, `outline_button`, and `solid_button` using background opacity + padding/radius + interaction class hints.
  - revised prominence scoring to combine contrast + affordance cues.
  - added low-confidence diagnostic when CTA remains weak despite available evidence.
- Color:
  - weighted tone inference from rendered targets improved (reduced noisy mixed/unknown outcomes).
  - stronger CTA color hint propagation when CTA evidence is strong.
  - medium-confidence color diagnostic added for partial but useful computed evidence.
- Typography:
  - medium-confidence typography diagnostic added for partial computed evidence.
  - strategy/typography profile mapping now responds to style (serif/premium/editorial and large-scale marketing cues).
- Spacing/Density:
  - medium-confidence spacing diagnostic added for partial computed evidence.
  - spacing/treatment decisions continue to use computed-first, with visual-density fallback only when computed is weak.

## 4. Design Intelligence Response Changes
- Added style evidence strength gating (`weak|medium|strong`) and used it in strategy selection.
- Strengthened style-driven strategy paths:
  - strong CTA style/prominence -> `cta_focused`
  - strong dark+accent profile -> `visual_gallery`
  - strong premium/editorial typography/tone -> `editorial_readable`
- Kept conservative behavior for weak style evidence.
- Section CTA treatment now consumes style CTA hints so text-link/low-prominence evidence does not over-emphasize CTA blocks.

## 5. Diagnostics/Provenance Behavior
- Added explicit diagnostics:
  - `STYLE_SIGNAL_RENDERED_DOM_USED`
  - `STYLE_SIGNAL_COMPUTED_DOMINANT`
  - `STYLE_SIGNAL_CTA_CONFIDENCE_LOW`
  - `STYLE_SIGNAL_COLOR_CONFIDENCE_MEDIUM`
  - `STYLE_SIGNAL_TYPOGRAPHY_CONFIDENCE_MEDIUM`
  - `STYLE_SIGNAL_SPACING_CONFIDENCE_MEDIUM`
- Preserved existing weak/partial/fallback diagnostics and provenance fields.
- Pipeline design-stage wiring now supports computed samples + rendered-capture context directly, improving style provenance consistency in design decisions.

## 6. Manual Before/After Observations
Manual validation runner executed for:
- `https://nazrob.si`
- `https://polar.sh`
- `https://servis-chs.generator.live`

Observed in this environment:
- all three imports fell back to `raw_html_fallback`
- rendered capture status: `unavailable`
- computed style samples: `0`
- screenshots: `0`
- style diagnostics: weak/fallback set (`STYLE_SIGNAL_COMPUTED_SAMPLE_MISSING`, `STYLE_SIGNAL_WEAK`, etc.)

Interpretation:
- This local run could not validate the intended rendered-dom-driven uplift because rendered capture was unavailable (worker not configured + raw fallback path active).
- This is consistent with import diagnostics like `CAPTURE_WORKER_NOT_CONFIGURED`, `CAPTURE_WORKER_UNAVAILABLE`, `RENDERED_CAPTURE_UNAVAILABLE`.

## 7. Limitations
- No async queue or reliability architecture changes were made.
- No multi-page crawl.
- No OCR.
- No screenshot semantic segmentation.
- No billing/subscription gating changes.
- Local manual validation could not demonstrate rendered-dom style uplift on live targets because rendered capture was unavailable in this runtime.

## 8. Next-Step Recommendation
- Deploy this revision in the worker-enabled runtime and re-run the three target re-imports to verify real rendered-dom/computed-style utilization deltas in Site Workspace and Design View.
