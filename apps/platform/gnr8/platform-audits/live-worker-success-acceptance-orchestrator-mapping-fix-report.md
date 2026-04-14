# Live Worker Success Acceptance / Orchestrator Mapping Fix Report

## 1. Exact acceptance/mapping failure point found
Two app-side truth-loss points were still able to turn successful worker truth into fallback/unavailable truth:

1. `apps/platform/gnr8/import-rendered-capture-worker/capture-job-orchestrator.ts`
- `deriveHealthFromResponse(...)` previously checked worker transport-error diagnostics (`CAPTURE_WORKER_HTTP_ERROR`, etc.) before checking `response.status === available|partial`.
- A payload that was status-successful but carried stale failure diagnostics could be mapped to unhealthy/unreachable and then flow into fallback-only narratives.

2. `apps/platform/gnr8/import-rendered-capture-worker/worker-adapter.ts`
- Artifact decoding accepted only `storage=inline` data URIs.
- If a successful worker response referenced artifacts via local URI (`file://...`) and non-inline storage, DOM/screenshots were dropped during mapping, which could force `raw_html_fallback` despite worker success.

## 2. Worker client classification fix
File changed: `apps/platform/gnr8/import-rendered-capture-worker/worker-client.ts`

- Added successful-payload sanitization (`sanitizeSuccessfulWorkerResponse(...)`):
  - for `status=available|partial`, stale transport/failure diagnostics are removed:
    - `CAPTURE_WORKER_HTTP_ERROR`
    - `CAPTURE_WORKER_REQUEST_FAILED`
    - `CAPTURE_WORKER_UNAVAILABLE`
    - `CAPTURE_WORKER_EXECUTION_FAILED`
  - contradictory `failure` object is nulled for successful statuses.
- Result: successful parsed worker responses cannot be reclassified as request-failed/unavailable due stale diagnostics.

## 3. Orchestrator mapping fix
File changed: `apps/platform/gnr8/import-rendered-capture-worker/capture-job-orchestrator.ts`

- In `deriveHealthFromResponse(...)`, success status check (`available|partial`) now takes precedence over transport-diagnostic checks.
- Result: orchestrator health no longer marks successful worker responses as `unreachable`/degraded when stale diagnostics are present.

## 4. Fallback trigger fix
Files changed:
- `apps/platform/gnr8/import-rendered-capture-worker/worker-adapter.ts`
- `apps/platform/src/validation-shell/url-import-operator.test.ts`

- Worker adapter now decodes artifacts from:
  - `inline` data URIs (existing)
  - `file://...` local URIs for non-inline storage
  - absolute local paths for non-inline storage
- Result: successful worker artifacts are no longer silently dropped during app mapping, preventing false fallback trigger caused by missing mapped evidence.

## 5. Persistence outcome
Persistence now preserves rendered-capture truth when successful worker artifacts are mapped:
- source mode remains `rendered_dom`
- rendered capture status remains `available|partial`
- DOM/screenshot/style counts remain non-zero when present
- false transport/unavailable diagnostics are not retained on successful worker payloads

Covered by tests (deterministic):
- worker client successful sanitization
- orchestrator success-health precedence
- URL import success with shared-storage URIs persists rendered truth and avoids fallback diagnostics

## 6. Manual validation results
Manual live run executed on **April 14, 2026**:
- target: `https://chs.sandbox.generator.live`
- command used: live snapshot import with `.env.production`
- output snapshot: `apps/platform/gnr8/validation/.out/url-import-snapshots-live/imported-url-site-b4fd72ae4a7f651e`

Observed in this environment:
- still degraded to `raw_html_fallback`
- worker marked `CAPTURE_WORKER_NOT_CONFIGURED` / `worker_not_configured`
- resolved worker endpoint/token missing (`configStatus=missing_base_url_and_shared_token`)

Conclusion:
- Manual live run in this machine did not have usable worker client config, so end-to-end live success acceptance could not be demonstrated from this environment.
- The acceptance/mapping fixes are validated by deterministic tests and code-path hardening.

## 7. Remaining limitations
This task does **not** include:
- broader computed style sampling redesign
- worker architecture redesign
- queue redesign
- multi-page capture
- OCR
- billing/subscription gating

## 8. Next-step recommendation
Re-run one live import in the deployed environment where worker endpoint + shared token are confirmed present, then verify:
- worker 200 + `workerStatus=available|partial` persists as `sourceMode=rendered_dom`
- no false `CAPTURE_WORKER_HTTP_ERROR` / `CAPTURE_WORKER_UNAVAILABLE` for successful worker payloads
- Site Workspace reflects non-zero rendered capture evidence (DOM/screenshots/style samples)
