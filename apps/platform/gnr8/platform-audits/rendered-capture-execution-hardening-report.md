# Rendered Capture Execution Hardening Report

## 1. Failure and Partial-Success Modes Found
- Browser runtime unavailable (`RENDERED_CAPTURE_UNAVAILABLE`) produced raw fallback with limited evidence.
- Browser startup/context initialization failures (`RENDERED_CAPTURE_BROWSER_START_FAILED`) produced hard capture failure.
- Navigation failure (`BROWSER_NAVIGATION_FAILED`) produced hard capture failure.
- Timeout during readiness (`RENDERED_CAPTURE_TIMEOUT`) could still produce partial evidence.
- DOM shell persistence (`RENDERED_CAPTURE_DOM_STILL_SHELL`) could recover on bounded retry (`RENDERED_CAPTURE_RECOVERED_ON_RETRY`) or degrade.
- Screenshot-only outcomes were previously flattened; now explicitly diagnosed as `RENDERED_CAPTURE_SCREENSHOT_ONLY`.
- DOM serialization failure/empty DOM are now explicitly diagnosed as:
  - `RENDERED_CAPTURE_DOM_SERIALIZATION_FAILED`
  - `RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION`
- Style extraction failures are now explicitly diagnosed as `RENDERED_CAPTURE_STYLE_SAMPLING_FAILED`.

## 2. Execution Sequencing Changes
- Final sequencing hardened to:
  1. Navigate (`domcontentloaded`) with bounded timeout.
  2. Bounded readiness wait (`networkidle` + DOM stabilization).
  3. Capture DOM/style/asset pass.
  4. Capture viewport/full-page screenshots (best effort).
  5. If evidence is weak/empty, run a bounded post-screenshot stabilization pass and re-capture DOM/style.
  6. Resolve status from actual evidence (`available` / `partial` / `failed` / `unavailable`).

## 3. DOM Extraction Hardening
- DOM serialization is no longer assumed successful.
- Explicit serialization error capture added with diagnostic emission.
- Empty DOM after navigation is now distinct from generic failure.
- Capture status now reflects DOM reality; screenshot-only no longer masquerades as full success.

## 4. Computed-Style Sampling Hardening
- Style extraction failures are now explicit and not silently flattened.
- Low/zero sample outcomes now distinguish:
  - weak sample count (`COMPUTED_STYLE_SAMPLE_WEAK`)
  - style sampling failure (`RENDERED_CAPTURE_STYLE_SAMPLING_FAILED`)
- Post-screenshot stabilization pass improves odds of non-zero style samples on late-hydrating pages.

## 5. Screenshot Consistency Rules
- `rendered/screenshots/*` artifacts are now created only when real screenshot bytes exist.
- Placeholder zero-byte screenshots are no longer written for missing captures.
- Manifest `screenshotSummary` now includes coherent:
  - `viewportCaptured`
  - `fullPageCaptured`
  - `count`
  - `paths`
- Acquisition evidence screenshot counts now align with real captured artifacts.

## 6. Persistence Summary Truth Improvements
- Rendered capture status now supports explicit `partial`.
- Snapshot/manifests now preserve partial-success truth instead of flattening to generic failure.
- Scoped import provenance now derives screenshot presence/count from evidence-first logic while preserving fixture compatibility.
- Persisted summary now better aligns:
  - status
  - DOM quality and size signals
  - style sample counts
  - screenshot evidence

## 7. Limitations
- Manual live-browser validation for:
  - `nazrob.si`
  - `www.evolt.dev`
  - `servis-chs.generator.live`
  was not executed in this environment.
- This hardening improves execution quality and truth consistency but does not redesign capture intent/coverage semantics.

## 8. Next-Step Recommendation
- Proceed to **Import Fidelity Hardening (Part 4.5: Style Signal Utilization Tuning)**.

## Explicit Out of Scope
- Multi-page crawl
- Structure/consolidation redesign
- Style signal extraction redesign
- Billing/subscription gating
- Screenshot-to-code and OCR
