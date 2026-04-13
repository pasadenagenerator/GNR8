# Railway Worker Post-Navigation Capture Timeout Root Cause & Budget Fix Report

## 1) Measured Post-Navigation Phases
Implemented explicit post-navigation phases with start/completion/timeout/failure diagnostics and per-phase duration/budget details:

- `stabilization`
  - `CAPTURE_PHASE_STABILIZATION_STARTED`
  - `CAPTURE_PHASE_STABILIZATION_COMPLETED`
  - `CAPTURE_PHASE_STABILIZATION_TIMED_OUT`
  - `CAPTURE_PHASE_STABILIZATION_FAILED`
- `dom_serialization`
  - `CAPTURE_PHASE_DOM_SERIALIZATION_STARTED`
  - `CAPTURE_PHASE_DOM_SERIALIZATION_COMPLETED`
  - `CAPTURE_PHASE_DOM_SERIALIZATION_TIMED_OUT`
  - `CAPTURE_PHASE_DOM_SERIALIZATION_FAILED`
- `screenshot_viewport`
  - `CAPTURE_PHASE_SCREENSHOT_VIEWPORT_STARTED`
  - `CAPTURE_PHASE_SCREENSHOT_VIEWPORT_COMPLETED`
  - `CAPTURE_PHASE_SCREENSHOT_VIEWPORT_TIMED_OUT`
  - `CAPTURE_PHASE_SCREENSHOT_VIEWPORT_FAILED`
- `style_sampling`
  - `CAPTURE_PHASE_STYLE_SAMPLING_STARTED`
  - `CAPTURE_PHASE_STYLE_SAMPLING_COMPLETED`
  - `CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT`
  - `CAPTURE_PHASE_STYLE_SAMPLING_FAILED`
- `screenshot_fullpage`
  - `CAPTURE_PHASE_SCREENSHOT_FULLPAGE_STARTED`
  - `CAPTURE_PHASE_SCREENSHOT_FULLPAGE_COMPLETED`
  - `CAPTURE_PHASE_SCREENSHOT_FULLPAGE_TIMED_OUT`
  - `CAPTURE_PHASE_SCREENSHOT_FULLPAGE_FAILED`
- `asset_manifest_finalization`
  - `CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_STARTED`
  - `CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_COMPLETED`
  - `CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_TIMED_OUT`
  - `CAPTURE_PHASE_ASSET_MANIFEST_FINALIZATION_FAILED`
- `response_assembly`
  - `CAPTURE_PHASE_RESPONSE_ASSEMBLY_STARTED`
  - `CAPTURE_PHASE_RESPONSE_ASSEMBLY_COMPLETED`
  - `CAPTURE_PHASE_RESPONSE_ASSEMBLY_TIMED_OUT`
  - `CAPTURE_PHASE_RESPONSE_ASSEMBLY_FAILED`

Each phase emits `durationMs` + `timeoutBudgetMs`; timeout phases also emit `RENDERED_CAPTURE_TIMEOUT` with `phase` metadata.

## 2) Exact Timeout Bottleneck Found
Root-cause model from code-path analysis and new instrumentation target:

- Prior implementation had one global `maxTotalCaptureMs` budget and ran expensive DOM + style extraction together before screenshots.
- A slow `page.evaluate(...)` style sampling pass could consume the remaining global budget and starve screenshot/assembly phases.
- This produced generic `RENDERED_CAPTURE_TIMEOUT` after successful navigation without truthful post-navigation phase attribution.

The new phase diagnostics make the bottleneck explicit at runtime (for example `CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT`).

## 3) Old vs New Phase Ordering/Budgeting
Old post-navigation order:

1. Readiness wait
2. DOM + style sampling (same pass)
3. Viewport screenshot
4. Full-page screenshot
5. Optional post-screenshot second pass (DOM + style)
6. Return

Old budget model:

- Single global budget (`maxTotalCaptureMs`) with no explicit per-phase limits.

New post-navigation order:

1. Stabilization/readiness
2. DOM serialization
3. Viewport screenshot
4. Computed style sampling
5. Full-page screenshot (best-effort)
6. Asset manifest finalization
7. Response assembly

New budget model:

- Keep global max budget (`maxTotalCaptureMs`)
- Add per-phase bounded timeout caps, each constrained by remaining global budget
- Emit phase-level timeout diagnostics when a specific phase exhausts budget

## 4) Partial-Success Strategy
All-or-nothing behavior was replaced by preservation of completed artifacts:

- If DOM and/or screenshots exist and a later phase times out, result remains `partial` rather than generic failed timeout.
- Timeout/failure remains truthful via phase diagnostics + `RENDERED_CAPTURE_TIMEOUT` details.
- Worker failure selection now recognizes phase-timeout codes directly (for example `CAPTURE_PHASE_STYLE_SAMPLING_TIMED_OUT`) and classifies as `timed_out` without transport misclassification.

## 5) Duplicate Execution Findings
Observed issue risk:

- Repeated handling for same correlation/request path can duplicate expensive execution and waste timeout budget.

Fix implemented:

- Worker server now dedupes concurrent identical request ids/import ids by joining in-flight execution promise.
- Added log event `duplicate_request_detected` with `dedupe=join_inflight`.

## 6) Manual Validation Results
Local deterministic validation completed:

- New phase-budget tests pass.
- Worker server phase-log + dedupe tests pass.
- Worker client timeout-truth classification test pass.
- `pnpm exec next build` passes.
- `pnpm exec tsc --noEmit` passes.

Production manual validation status:

- Railway redeploy + live import verification (`chs.sandbox.generator.live`, optional `nazrob.si`) was not executed from this environment.
- Required live confirmation should verify that logs now show `post_navigation_phase` and `post_navigation_timeout_phase` and that at least one import returns usable partial/full artifacts beyond navigation.

## 7) Limitations
This change is strictly scoped to post-navigation timeout root-cause visibility and budgeting.
It does not include:

- computed style sampling redesign as a broader feature
- worker architecture redesign
- queue redesign
- multi-page capture
- OCR
- billing/subscription gating

## 8) Next-Step Recommendation
Use live Railway telemetry after redeploy to collect first real phase-timeout distribution and tune phase budget caps (`style_sampling` vs `screenshot_fullpage`) with production evidence.
