# Worker Response Classification & Timeout Handling Fix Report

## 1) Previous misclassification behavior
- A worker response that represented timeout execution truth could be flattened into generic transient/terminal failure paths.
- Fallback reason selection could prefer worker health labels before job timeout truth, making timeout look like generic worker failure.
- Site Workspace parse layer did not carry persisted `captureJob` / `workerHealth` fields from runtime provenance, reducing timeout/unavailability observability.
- Execution truth mapping did not explicitly include timeout codes as page-level failure codes.

## 2) Exact code location of the bug
- `apps/platform/gnr8/import-rendered-capture-worker/capture-job-orchestrator.ts`
  - `classifyJobStatusFromWorkerResponse(...)`:
    - retryable failures were classified as `failed_transient` before identifying timeout class.
  - `deriveHealthFromResponse(...)`:
    - timeout execution responses (`failureClass: timed_out`) were treated as generic `execution_failed`.
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
  - `resolveWorkerFallbackReason(...)`:
    - timeout fallback reason could be overshadowed by worker-health-first mapping.
  - `buildRenderedCaptureExecutionTruth(...)`:
    - timeout codes were not part of explicit page failure code mapping.
- `apps/platform/gnr8/site/site-workspace-read-model.ts`
  - `parseImportProvenanceSummary(...)`:
    - persisted `captureJob` and `workerHealth` were not parsed into the read model.
  - `parseImportFidelity(...)`:
    - evidence diagnostics did not prioritize capture-job/worker diagnostics and lacked explicit fallback reason derivation.

## 3) Transport vs execution distinction
- Transport-success path is now preserved when HTTP returns `200` + valid worker contract:
  - no transport failure diagnostics are emitted for valid parsed payloads.
- Execution timeout is explicitly represented from worker payload truth:
  - timeout class is recognized via `failureClass: timed_out` and/or `RENDERED_CAPTURE_TIMEOUT` diagnostics.
- Transport timeout/unreachable remains distinct:
  - transport timeout maps to worker timeout/unreachable handling, not execution timeout.

## 4) Timeout/fallback mapping changes
- `capture-job-orchestrator` now classifies worker execution timeout explicitly as job `timed_out` (instead of generic transient/terminal).
- Health derivation now maps execution timeout responses to `status: timed_out` with reachable transport truth when applicable.
- Fallback reason mapping now separates:
  - `capture_timed_out` for execution timeout truth
  - `worker_timeout` for transport timeout truth
  - preserves terminal/transient/unavailable classes for non-timeout cases.
- Site Workspace fidelity parser now:
  - parses and exposes `captureJob` and `workerHealth`
  - derives `captureFallbackReason`
  - includes `CAPTURE_JOB_*` and `CAPTURE_WORKER_*` in evidence diagnostics.

## 5) Timeout-budget findings
- Current budgets inspected:
  - navigation timeout: `20_000ms`
  - network quiet timeout: `4_000ms`
  - DOM stabilization window: `2_500ms`
  - total capture timeout budget: `30_000ms`
  - orchestrator wait budget: `40_000ms`
- No timeout-budget increase was applied in this task.
- Rationale: avoid blind inflation without a validated live timeout reproduction under correctly configured worker connectivity.

## 6) Manual validation results
- Manual live re-import checks executed via runtime import script:
  - `https://chs.sandbox.generator.live`
  - `https://nazrob.si`
- Both runs reported worker environment as `misconfigured` (`worker_not_configured`) in this runtime.
- Observed truth in both manual runs:
  - no false `CAPTURE_WORKER_HTTP_ERROR`
  - fallback reason persisted as terminal unavailable path (`capture_failed_terminal`) with explicit worker misconfiguration diagnostics
- Because worker connectivity was misconfigured in this environment, a live execution-timeout case could not be produced here.

## 7) Limitations
- Live timeout-path confirmation on Railway worker could not be completed in this local runtime due worker misconfiguration (`worker_not_configured`).
- This task does **not** include:
  - computed style sampling redesign
  - queue redesign
  - multi-page capture
  - OCR
  - billing/subscription gating

## 8) Next-step recommendation
- Re-run manual import on a runtime with valid worker endpoint/token to confirm the live timeout path emits:
  - transport success
  - execution timeout (`capture_timed_out`)
  - no false `CAPTURE_WORKER_HTTP_ERROR` / `CAPTURE_WORKER_UNAVAILABLE` on HTTP 200 timeout payloads.
