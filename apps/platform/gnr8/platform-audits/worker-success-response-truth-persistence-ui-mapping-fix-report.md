# Worker Success Response Truth, Persistence, and UI Mapping Fix Report

## 1. Exact truth mismatch found
- **Mismatch A (worker response assembly):** worker responses could carry `status: available|partial` while still emitting `failure.failureCode=RENDERED_CAPTURE_TIMEOUT` from stale diagnostics, creating contradictory payload truth (`execution_succeeded` + timeout failure code).
- **Mismatch B (app-side source selection):** `resolveSourceSelection(...)` only selected `rendered_dom` when rendered DOM quality was `strong`, so successful/partial worker captures with weak-but-usable rendered DOM were downgraded to `raw_html_fallback`.
- **Mismatch C (fallback overwrite):** fallback diagnostics and source-mode degradation could win even when worker produced meaningful rendered DOM evidence, collapsing partial truth into full fallback truth.

## 2. Worker response assembly fix
- File: `apps/platform/gnr8/import-rendered-capture-worker/worker-service.ts`
- Change:
  - `pickFailure(...)` now receives response status + evidence context.
  - For `status: available`, failure is always `null`.
  - For `status: partial` with real evidence (rendered DOM and/or screenshot and/or style samples), failure is also `null`.
- Effect:
  - Prevents stale timeout/failure leakage into successful/partial worker payloads.
  - Keeps `status`, `failure`, and artifact truth coherent.

## 3. App mapping fix
- File: `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- Change:
  - `resolveSourceSelection(...)` now accepts rendered worker truth when:
    - capture status is `available|partial`, and
    - rendered DOM exists, and
    - rendered DOM is usable (or corroborated by screenshot/style evidence).
  - `rendered_dom` can now be selected in degraded mode (instead of forced raw fallback) when strong quality is not reached.
- Effect:
  - Successful/partial worker output is no longer collapsed to raw fallback solely due a strict `strong`-quality gate.

## 4. Persistence fix
- Persistence path now receives corrected source selection truth (`rendered_dom` + degraded fidelity when appropriate), so provenance summary fields are aligned with actual capture artifacts.
- Added explicit handoff diagnostics in import diagnostics:
  - `CAPTURE_WORKER_RESULT_ACCEPTED`
  - `CAPTURE_WORKER_RESULT_PARTIAL_ACCEPTED`
  - `CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK`
- This improves persisted explainability for accepted vs overridden worker outputs.

## 5. Site Workspace/read-model fix
- No structural read-model schema change was required.
- Read-model fidelity now improves because persisted truth is no longer falsely degraded upstream.
- Existing read-model preference logic (persisted provenance summary over semantic labels) remains valid and now receives truthful upstream payloads more consistently.

## 6. Manual validation results
- Manual imports executed via operator flow (`simulation`) for:
  - `https://chs.sandbox.generator.live`
  - `https://nazrob.si`
- Result in this environment:
  - both runs still degraded to `raw_html_fallback`
  - both emitted `CAPTURE_WORKER_NOT_CONFIGURED` / `CAPTURE_WORKER_UNAVAILABLE`
  - no worker success capture evidence available in these runs
- Why:
  - runtime env did not have usable worker endpoint/token config at execution time.
- Artifact roots from manual run:
  - `apps/platform/gnr8/validation/.out/url-import-snapshots/imported-url-site-b4fd72ae4a7f651e`
  - `apps/platform/gnr8/validation/.out/url-import-snapshots/imported-url-site-a09d2f1ed1c2c7a2`

## 7. Limitations
- This task did **not** include:
  - broader computed style sampling redesign
  - worker architecture redesign
  - queue redesign
  - multi-page capture
  - OCR
  - billing/subscription gating
- Live “worker-phases-completed” validation could not be demonstrated from this machine due missing effective worker runtime configuration.

## 8. Next-step recommendation
- Run one post-deploy import with confirmed worker config and verify:
  - worker emits `status=available|partial` with non-empty rendered artifacts
  - provenance persists `sourceMode=rendered_dom` when rendered DOM is accepted
  - Site Workspace no longer shows false total-failure fallback truth for successful/partial worker capture outputs
