# Successful Worker Result Persistence & Read-Model Selection Fix Report

## 1. Exact truth-loss point found
- Primary truth-loss point was in Site Workspace runtime version selection:
  - `apps/platform/gnr8/site/site-workspace-read-model.ts`
  - `compareRuntimeVersionRows(...)` was timestamp-first (`updated_at`/`created_at` before `version_no`).
- This allowed stale fallback runtime rows to win selection if they were updated later, even when a newer import version held successful rendered-capture provenance.
- Result: Site Workspace could show `raw_html_fallback`/failed-like truth despite a later successful worker-backed import.

## 2. Persistence fix
- File: `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- Enhanced persisted provenance diagnostic truth in `buildImportProvenanceSummary(...)`:
  - always adds `RENDERED_CAPTURE_SUMMARY_PERSISTED`
  - adds `CAPTURE_WORKER_RESULT_PERSISTED` when worker result is successful and selected source is `rendered_dom`
  - adds `CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK` when fallback is selected despite successful/usable worker evidence
- Preserves and persists rendered-capture summary fields already used by Site Workspace:
  - source mode
  - rendered capture status
  - rendered DOM quality/counts
  - screenshot/style counts
  - capture evidence paths

## 3. Fallback overwrite fix
- Selection/persistence diagnostics now make supersession explicit when fallback wins despite worker evidence (`CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK`).
- Successful rendered worker truth now receives explicit persistence marker (`CAPTURE_WORKER_RESULT_PERSISTED`) to prevent silent demotion.

## 4. Read-model selection fix
- File: `apps/platform/gnr8/site/site-workspace-read-model.ts`
- Changed `compareRuntimeVersionRows(...)` ordering to version-first:
  - `version_no` now takes precedence over timestamps.
- This prevents stale fallback rows from winning solely due newer update timestamps.
- Added read-model selection diagnostics:
  - `CAPTURE_WORKER_RESULT_SELECTED`
  - `READMODEL_SELECTED_RENDERED_CAPTURE`
  - `CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK` (surfaced when applicable)

## 5. Manual validation results
- Fresh live-import check using production env in this workspace:
  - command run: `set -a; source .env.production; set +a; ... /tmp/worker-truth-manual-check.ts`
  - result: worker remained `CAPTURE_WORKER_NOT_CONFIGURED` in this local environment (fallback expected)
- Fresh manual successful-worker flow executed against `https://chs.sandbox.generator.live` with direct worker execution path:
  - command run: `... /tmp/worker-persistence-readmodel-manual.ts`
  - snapshot truth:
    - `sourceMode=rendered_dom`
    - `renderedCaptureStatus=partial`
    - `renderedDocCount=1`
    - `screenshotCount=2`
    - worker accepted, no fallback override
  - persisted summary truth:
    - `sourceMode=rendered_dom`
    - `renderedCaptureStatus=partial`
    - `renderedDomNodeCount=376`
    - `screenshotCount=2`
    - contains `CAPTURE_WORKER_RESULT_PERSISTED` + `RENDERED_CAPTURE_SUMMARY_PERSISTED`
  - read-model parse truth:
    - selects `sourceMode=rendered_dom`
    - `renderedCaptureStatus=partial`
    - includes `CAPTURE_WORKER_RESULT_SELECTED` + `READMODEL_SELECTED_RENDERED_CAPTURE`

## 6. Remaining limitations
- Railway-backed worker success for this machine could not be re-verified under `.env.production` because worker config in this local run reported `CAPTURE_WORKER_NOT_CONFIGURED`.
- Validation above confirms end-to-end acceptance/persistence/selection on a fresh live URL import with successful worker execution path, but via direct worker execution rather than Railway HTTP in this environment.

## 7. Next-step recommendation
- Run the same manual flow in deployment where Railway worker is configured and confirm Site Workspace UI reflects:
  - non-`raw_html` source mode
  - non-failed rendered capture status
  - non-zero DOM/screenshot/style truth where available.

## Explicit scope limitations for this task
This task intentionally does **not** include:
- broader computed style sampling redesign
- worker architecture redesign
- queue redesign
- multi-page capture
- OCR
- billing/subscription gating

This task is limited to successful worker result persistence and read-model selection.
