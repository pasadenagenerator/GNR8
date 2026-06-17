# Production Evidence Capture Worker Readiness Audit

## Audit Scope

Phase 8B-12G is a read-only root-cause audit for production rendered Evidence Capture failures across imported site versions.

This audit inspected existing code, configuration references, historical deployment notes, and persisted production diagnostics only. It did not change importer behavior, Evidence Capture behavior, worker behavior, deployment, environment variables, preview behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema. It did not create Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, backfills, worker jobs, retries, or import retries.

Primary persisted diagnostic source:

- `public.gnr8_runtime_site_versions.import_provenance_summary`

Representative versions inspected:

- `90b3abf8-7a4c-41b5-af05-244642d1962d`
- `88253466-783e-4484-8b68-df6c83b8a11c`

## Rendered Capture Configuration References

The platform worker client is configured in `apps/platform/gnr8/import-rendered-capture-worker/worker-config.ts`.

Configuration references:

- Enable flag: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`
- Worker base URL: `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`
- Worker path: `GNR8_RENDERED_CAPTURE_WORKER_PATH`
- Shared token: `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`
- Timeout: `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`
- Base URL fallbacks: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `GNR8_APP_URL`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, and production default origin `https://app.pasadenagenerator.com`

Default values and behavior:

- Worker enabled defaults to `true`.
- Default timeout is `35000ms`, clamped between `1000ms` and `180000ms`.
- Default platform client path is `/api/internal/gnr8/rendered-capture-worker`.
- The dedicated worker primary path is `/internal/gnr8/rendered-capture-worker`.
- The dedicated worker also supports `/api/internal/gnr8/rendered-capture-worker` for compatibility.
- Missing endpoint or missing shared token makes the client unavailable before an HTTP capture request is sent.
- Non-healthy worker results fall back to raw HTML and persist `CAPTURE_WORKER_FALLBACK_TO_RAW_HTML` / `RENDERED_CAPTURE_FAILED_FALLBACK_USED`.

Local production env file presence audit:

- `apps/platform/.env.production` does not define `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`.
- `apps/platform/.env.production` does not define `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`.
- `apps/platform/.env.production` does not define `GNR8_RENDERED_CAPTURE_WORKER_PATH`.
- `apps/platform/.env.production` does not define `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
- `apps/platform/.env.production` does not define `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`.
- `apps/platform/.env.production` does not define the inspected app-origin fallbacks.

This local env finding matches the `worker_not_configured` failure class seen in persisted production-style imports, but the audit did not change or verify deployed platform environment variables.

## Worker Deployment Assumptions

Expected deployment model:

- The app/platform import runner builds a `rendered_capture_worker_request_v1` request.
- The platform caller uses a shared-token HTTP client.
- The long-term production target is a dedicated standalone Node HTTP worker service, prepared for Railway Docker deployment.
- The platform may also expose `app/api/internal/gnr8/rendered-capture-worker/route.ts` as a proxy route, but that route still requires upstream worker configuration and must not self-target.

Expected app/platform caller:

- Builds request IDs and import IDs from the URL import snapshot run.
- Submits a file-backed capture job with `maxAttempts = 2`.
- Uses `DEFAULT_RENDERED_CAPTURE_READINESS_POLICY.maxTotalCaptureMs` as the worker request timeout budget.
- Persists capture job and worker health truth into import provenance.
- Selects raw HTML fallback when rendered capture is unavailable or unusable.

Expected dedicated worker endpoint:

- `POST /internal/gnr8/rendered-capture-worker`
- Compatibility alias: `POST /api/internal/gnr8/rendered-capture-worker`
- Auth header: `x-gnr8-rendered-capture-worker-token`
- Expected token source: `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`

Expected health endpoint:

- `GET /health`
- Returns `ok: true` with a `health` object when the service responds.
- Health includes auth truth, runtime kind, browser package availability, browser binary availability, launch probe result, and capture service availability.
- Returns `401` on token mismatch.

Expected response shape:

- `kind = rendered_capture_worker_response_v1`
- `contractVersion = 1.0.0`
- `requestId`
- `status = available | partial | failed | unsupported`
- `environment`
- `artifacts`
- `computedStyleSamples`
- `diagnostics`
- `qualitySummary`
- `failure`
- `timings`

Expected failure modes:

- Missing client config: `CAPTURE_WORKER_NOT_CONFIGURED`
- Auth mismatch: `CAPTURE_WORKER_UNAUTHORIZED`
- Transport or non-OK HTTP response: `CAPTURE_WORKER_HTTP_ERROR`
- Timeout: `CAPTURE_WORKER_TIMEOUT`
- Invalid response shape: `CAPTURE_WORKER_RESPONSE_INVALID`
- Worker executed but failed capture: `CAPTURE_WORKER_EXECUTION_FAILED`
- Browser/package/launch dependency failure: worker response failure class such as `browser_launch_failed` or `environment_unsupported`

## Representative Diagnostics

### `90b3abf8-7a4c-41b5-af05-244642d1962d`

Persisted summary:

- `sourceMode = raw_html_fallback`
- `renderedCaptureStatus = failed`
- `renderedDomQuality = unusable`
- `screenshotCount = 0`
- `computedStyleSampleCount = 0`
- `evidenceCaptureBaselineArtifact` missing

Worker/capture diagnostics:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
- `CAPTURE_WORKER_URL_RESOLVED`
- `CAPTURE_WORKER_REQUEST_BUILT`
- `CAPTURE_WORKER_REQUEST_STARTED`
- `CAPTURE_WORKER_HTTP_REQUEST_SENT`
- `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`
- `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`
- `CAPTURE_WORKER_HTTP_ERROR`
- `CAPTURE_WORKER_REQUEST_FAILED`
- `CAPTURE_WORKER_HEALTH_UNAVAILABLE`
- `CAPTURE_WORKER_UNAVAILABLE`
- `CAPTURE_WORKER_FALLBACK_TO_RAW_HTML`
- `CAPTURE_JOB_QUEUED`
- `CAPTURE_JOB_STARTED`
- `CAPTURE_JOB_RETRIED`
- `CAPTURE_JOB_FAILED_TRANSIENT`
- `RENDERED_CAPTURE_UNAVAILABLE`
- `RENDERED_CAPTURE_FAILED`
- `RENDERED_CAPTURE_FAILED_FALLBACK_USED`
- `RENDERED_CAPTURE_SUMMARY_PERSISTED`

Persisted job and health:

- `captureJob.status = failed_transient`
- `captureJob.failureClass = transient`
- `captureJob.failureCode = WORKER_UNAVAILABLE`
- `captureJob.attemptCount = 2`
- `captureJob.maxAttempts = 2`
- `workerHealth.status = unreachable`
- `workerHealth.reason = worker_http_error`
- `workerHealth.reachable = true`
- `workerHealth.browserAvailable = false`
- `workerHealth.lastFailureCode = WORKER_UNAVAILABLE`

Audit interpretation:

- Worker URL/request path was resolved enough for an HTTP request to be sent.
- An HTTP response was received and classified.
- No valid worker response was parsed.
- No capture execution reached usable browser evidence.
- Fallback was used.
- Failure is transient at the capture-job layer.
- Persisted summary does not retain the HTTP status code or endpoint URL details, so the exact HTTP response class for this row cannot be reconstructed from durable provenance alone.

### `88253466-783e-4484-8b68-df6c83b8a11c`

Persisted summary:

- `sourceMode = raw_html_fallback`
- `renderedCaptureStatus = failed`
- `renderedDomQuality = unusable`
- `screenshotCount = 0`
- `computedStyleSampleCount = 0`
- `evidenceCaptureBaselineArtifact` missing

Worker/capture diagnostics:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
- `CAPTURE_WORKER_URL_RESOLVED`
- `CAPTURE_WORKER_REQUEST_BUILT`
- `CAPTURE_WORKER_NOT_CONFIGURED`
- `CAPTURE_WORKER_UNAVAILABLE`
- `CAPTURE_WORKER_FALLBACK_TO_RAW_HTML`
- `CAPTURE_JOB_QUEUED`
- `CAPTURE_JOB_STARTED`
- `CAPTURE_JOB_FAILED_TERMINAL`
- `RENDERED_CAPTURE_UNAVAILABLE`
- `RENDERED_CAPTURE_FAILED`
- `RENDERED_CAPTURE_FAILED_FALLBACK_USED`
- `RENDERED_CAPTURE_SUMMARY_PERSISTED`

Persisted job and health:

- `captureJob.status = failed_terminal`
- `captureJob.failureClass = unsupported_environment`
- `captureJob.failureCode = WORKER_UNAVAILABLE`
- `captureJob.attemptCount = 1`
- `captureJob.maxAttempts = 2`
- `workerHealth.status = misconfigured`
- `workerHealth.reason = worker_not_configured`
- `workerHealth.reachable = false`
- `workerHealth.browserAvailable = false`
- `workerHealth.lastFailureCode = WORKER_UNAVAILABLE`

Audit interpretation:

- A worker request payload was built.
- The durable diagnostic code `CAPTURE_WORKER_URL_RESOLVED` exists, but persisted provenance does not retain the endpoint-configured details from that diagnostic.
- No `CAPTURE_WORKER_HTTP_REQUEST_SENT` diagnostic exists.
- The client classified the worker as not configured before an HTTP capture request was sent.
- Fallback was used.
- Failure is terminal at the capture-job layer because the environment/config state is unsupported for capture.

## Production Aggregate

Read-only production aggregate over all imported runtime site versions with non-null `import_provenance_summary`:

- Total imported versions: `14`
- `sourceMode = raw_html_fallback`: `14`
- `renderedCaptureStatus = failed`: `14`
- `renderedDomQuality = unusable`: `14`
- `screenshotCount = 0`: `14`
- `computedStyleSampleCount = 0`: `14`
- `evidenceCaptureBaselineArtifact` missing: `14`

Worker health:

- Missing: `5`
- Unreachable: `5`
- Misconfigured: `4`

Capture job:

- Missing: `5`
- `failed_transient`: `5`
- `failed_terminal`: `4`

Failure code:

- `WORKER_UNAVAILABLE`: `9`
- Missing job/health failure code: `5`

The five older rows without persisted job/health still include worker HTTP failure/fallback diagnostic codes, but not the newer structured capture-job and worker-health objects.

## Root-Cause Classification

Primary classification:

- **H. platform caller misconfigured**

Supporting classification:

- **A. worker URL missing** for the local production env file and for persisted rows where worker config did not become a sendable HTTP request.
- **C. worker health unavailable** for rows with `CAPTURE_WORKER_HEALTH_UNAVAILABLE` and `workerHealth.status = unreachable`.
- **B. worker URL incorrect** is plausible for rows that sent HTTP requests and received non-OK responses, but the durable provenance does not retain endpoint/status details needed to prove it.
- **E. worker route missing** is plausible for rows that sent HTTP requests and received non-OK responses, but the durable provenance does not retain status details needed to prove a `404`.
- **J. unknown** remains for the exact HTTP status/body of the five transient rows because persisted provenance stores codes but not the response classification details.

Not supported by current persisted evidence:

- **D. worker auth mismatch**: no representative row has `CAPTURE_WORKER_UNAUTHORIZED`.
- **F. worker timeout**: no representative row has `CAPTURE_WORKER_TIMEOUT`, `CAPTURE_JOB_TIMED_OUT`, or `RENDERED_CAPTURE_TIMEOUT`.
- **G. worker capture dependency failure**: no representative row reached parsed worker execution diagnostics such as browser launch or Playwright probe failure.
- **I. worker deployed but wrong app/build target**: historical notes mention deployment/startup risks, but the inspected persisted import diagnostics do not prove this as the production failure class.

Root-cause statement:

Production rendered Evidence Capture is failing before raw fallback because the platform cannot obtain a valid usable worker response. Some imports fail before sending an HTTP request due to missing worker configuration/shared-token readiness. Other imports send a request and receive/classify an HTTP failure, but the persisted provenance does not retain the response status/body needed to distinguish wrong URL, missing route, upstream-not-configured proxy, or dead worker. In no inspected current imported version does the capture path reach a parsed worker success or browser-capture dependency failure.

## Production Readiness Checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Worker deployed | Unknown / not proven | Dedicated Railway worker surface exists in code and docs, but this audit did not deploy or verify a live worker. |
| Worker reachable from platform | Fail | `5` rows have `workerHealth.status = unreachable`; `5` older rows have worker HTTP failure diagnostics without persisted health. |
| Health endpoint returns expected shape | Fail / not verified | `/health` exists in worker server code, but persisted imports show `CAPTURE_WORKER_HEALTH_UNAVAILABLE`; no live health check was performed. |
| Capture endpoint returns expected shape | Fail | No inspected row has `CAPTURE_WORKER_RESPONSE_PARSED`; all `14` have failed rendered capture and raw fallback. |
| Auth configured | Fail / partial | `4` rows are `worker_not_configured`; local production env file lacks the shared token. No `CAPTURE_WORKER_UNAUTHORIZED` evidence was found. |
| Timeout acceptable | Pass for current failure class | Representative rows use `30000ms` job budget and do not fail with timeout diagnostics. |
| Browser dependencies available | Unknown | The worker response never reaches parsed browser execution truth in inspected persisted versions. |
| Diagnostics persist correctly | Partial | Codes, job state, and health state persist for newer rows; endpoint URL, status code, response body/error code details are not durable in the summary. |
| Fallback path does not mask root cause | Partial | Fallback is explicit via diagnostic codes and job/health state, but exact HTTP failure details are not durable. |

Overall readiness result: **NOT PRODUCTION READY** for rendered Evidence Capture.

## Recommended Fix Phase

Recommended next phase:

**8B-12H Production Evidence Capture Worker Readiness Fix**

Minimum safe scope for the fix phase:

- Verify/set platform worker envs in deployed production: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`, `GNR8_RENDERED_CAPTURE_WORKER_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, and timeout.
- Verify/set dedicated worker service envs, especially `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
- Verify `GET /health` against the dedicated worker with the shared token.
- Verify one authenticated POST to `/internal/gnr8/rendered-capture-worker` returns the expected worker response shape.
- Confirm the platform caller reaches the dedicated worker domain rather than a self-targeting app proxy or unconfigured platform route.
- Persist enough response classification detail to disambiguate status code, endpoint URL, worker error code, and response snippet when capture fails before response parsing.

The fix phase should still avoid import retries, backfills, or Evidence Capture artifact creation until worker readiness is proven with explicit deployment and health/capture endpoint checks.
