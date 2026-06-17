# Fresh Production Import Capture Verification

## Scope

Phase 8B-12K-F7 ran one fresh production import verification for the normal fresh URL import path.

This phase did not modify importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema. It did not create FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, publishing artifacts, migrations, repair jobs, source-serving endpoints, or existing-siteVersion capture retries.

## Target

- Preferred target site: `https://www.odv-cvijanovic.si/`
- Fresh import URL used: `https://www.odv-cvijanovic.si/?gnr8_f7=20260617`
- Reason for query string: force a fresh deterministic scoped-import identity while importing the same public site.
- Target reachability: `200 OK`
- Target content type: `text/html; charset=UTF-8`
- Target HTML byte length: `29849`

## Import Method

The verification used the existing fresh scoped URL import chain:

- `importPublicSinglePageUrlToSnapshot(...)`
- `runScopedImportPipeline(...)`
- production DB-backed runtime persistence
- rendered-capture worker client from production/local env injection

The existing-siteVersion retry path was not used. No new route was created.

## Preflight

- Worker health readiness: ready
- Platform readiness logic: ready via `checkRenderedCaptureWorkerReadiness(...)`
- Worker enabled: `true`
- Worker configured: `true`
- Worker base URL present: `true`
- Worker shared token configured: `true`
- Worker health HTTP status: `200`
- Worker health diagnostics: `RENDERED_CAPTURE_WORKER_HEALTH_STARTED`, `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`
- Worker capture route preflight:
  - `HEAD https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker` returned `405` with `x-matched-path: /internal/gnr8/rendered-capture-worker`
  - `HEAD https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` returned `405` with `x-matched-path: /api/internal/gnr8/rendered-capture-worker`
- Local `file://` source check: no local `file://` source was used in the fresh import worker request.

## Worker Request Evidence

- New siteVersionId: `30100643-0517-4dff-9051-769e20658b25`
- Runtime siteId: `site_1f154c85c4b150f5f4b0`
- Snapshot ID: `imported-url-site-243b84b36b427abf`
- Snapshot run ID: `client-site-import-f7-1781716326679-96ecdcf3`
- Worker request sent: yes
- Worker request endpoint: `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker`
- Worker fallback endpoint candidate: `https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker`
- Source URL sent to worker: `https://www.odv-cvijanovic.si/?gnr8_f7=20260617`
- Source URL classification: public `https`
- Source URL is `file://`: no
- Worker HTTP response received: no
- Worker POST result: timeout after `1000ms`
- Worker request failure diagnostics:
  - `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
  - `CAPTURE_WORKER_URL_RESOLVED`
  - `CAPTURE_WORKER_REQUEST_STARTED`
  - `CAPTURE_WORKER_REQUEST_BUILT`
  - `CAPTURE_WORKER_HTTP_REQUEST_SENT`
  - `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`
  - `CAPTURE_WORKER_HTTP_ERROR`
  - `CAPTURE_WORKER_REQUEST_FAILED`
  - `CAPTURE_WORKER_UNAVAILABLE`
  - `CAPTURE_WORKER_HEALTH_UNAVAILABLE`
- Browser launch/page/navigation diagnostics: absent because the platform-side capture POST timed out before a worker response.

## Capture Result

- Imported mode: `pipeline`
- Version reused: no
- renderedCaptureStatus: `failed` in persisted provenance; `unavailable` in the raw snapshot result
- renderedDomQuality: `unusable`
- sourceMode: `raw_html_fallback`
- screenshots count: `0`
- computed style samples count: `0`
- rendered document count: `0`
- layout geometry count: `0`
- evidenceCaptureBaselineArtifact exists: yes
- section evidence count: `0`
- navigation evidence count: `0`
- capture job status: `failed_transient`
- capture job failure code: `WORKER_UNAVAILABLE`
- worker health in persisted capture result: `unreachable`
- worker health reason in persisted capture result: `worker_http_error`

## Evidence Result

The fresh import proved the source URL contract for the intended production path: the worker request carried a public `https` URL and not a caller-local `file://` URL.

The fresh import did not produce usable Evidence Capture. The baseline-shaped artifact exists, but rendered evidence and capture expansion evidence are missing:

- layout geometry evidence: missing
- section boundary evidence: missing
- navigation evidence: missing
- browser execution evidence: missing
- screenshots: missing
- computed style samples: missing

## Classification

Result: **FAIL**

Primary classification: **B. worker not reached**, with subtype **capture POST timed out before worker response**.

Secondary classification: **H. capture expansion evidence missing**.

Not classified as:

- A. target URL unreachable: target returned `200 OK`.
- C. worker auth failed: no `401` / `403` response was received.
- D. worker browser/playwright failed: no browser launch/page creation/navigation diagnostics were reached in this run.
- E. navigation failed despite public URL: navigation was not reached.
- F. capture output invalid: no worker capture output was received.
- G. baseline persistence failed: baseline-shaped artifact exists.

## Limitations

- The run used `?gnr8_f7=20260617` to force a fresh siteVersion identity for the same target site.
- The capture worker timeout resolved to `1000ms` in the local production-env execution context. That bounded timeout was enough for health readiness but not enough for the capture POST to return.
- The normal scoped import path materialized its standard import-side persistence, including raw import artifact persistence, runtime preview artifact binding, and CMS slot materialization. No Limited Dry Run or reconstruction output was created.
- Because the capture POST timed out before response, this phase cannot assess Playwright/browser launch, page creation, navigation, screenshot capture, DOM serialization, style sampling, or worker response-shape validity for the fresh public URL.

## Recommended Next Phase

Because F7 failed before worker response, the recommended next phase is targeted failure analysis:

**Phase 8B-12K-F8 — Fresh Import Worker Capture Timeout Diagnosis**

Recommended scope:

- Inspect production/local effective `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` resolution.
- Verify whether deployed platform production uses the same `1000ms` timeout or a longer intended value.
- Run a non-import, tokened capture-route diagnostic only if explicitly bounded and approved, or use existing logs to confirm whether the worker received the F7 request.
- Do not run Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, schema changes, repair jobs, existing-siteVersion retries, or source-serving endpoint implementation in that phase.

## F8 Timeout Diagnosis

Phase 8B-12K-F8 inspected timeout sources only. It did not modify importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema. It did not rerun import, retry capture, create FirstLimitedDryRun outputs, create reconstruction outputs, generate React, generate GNR8 blocks, create CMS bindings, create publishing artifacts, or create migrations.

### Timeout Sources Found

| Source | Finding |
| --- | --- |
| `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` | Wired into `resolveRenderedCaptureWorkerClientConfigFromEnv(...)`; default `35000`; clamped `1000..180000`; used by `createHttpRenderedCaptureWorkerClient(...)` as the HTTP `AbortSignal.timeout(...)`. F7 diagnostics show this resolved to `1000`. |
| Readiness timeout | Wired separately in `worker-readiness.ts`; default `10000`; clamped `1000..60000`; used only for worker health/readiness fetches. It does not control the capture POST once `worker-client.ts` executes. |
| Capture request readiness policy | Fresh import builds `navigationTimeoutMs = 20000`, `networkQuietTimeoutMs = 4000`, `domStabilizationWindowMs = 2500`, `maxTotalCaptureMs = 30000`. F7 job payload preserved these values. |
| Worker request `capture.timeoutBudgetMs` | Fresh import passes `DEFAULT_RENDERED_CAPTURE_READINESS_POLICY.maxTotalCaptureMs`; F7 persisted `requestPayload.capture.timeoutBudgetMs = 30000`. |
| Worker contract clamp | `createRenderedCaptureWorkerRequest(...)` clamps request timeout budget to `1000..180000`; this clamp did not reduce F7 because the input was already `30000`. |
| Capture job wait budget | Fresh import uses `CAPTURE_JOB_WAIT_BUDGET_MS = 40000`; not the source of the one-second abort. |
| Capture job attempt budget | `runJob(...)` computes remaining attempt budget as `min(job.timeoutBudgetMs, waitBudgetMs - elapsed)`, floored at `1000`; F7 attempts had a `30000` job timeout budget and were not reduced to `1000` by this path. |
| HTTP client hardcoded timeout | No hardcoded `1000ms` capture POST timeout was found. The HTTP client clamps whatever config timeout it receives, then aborts with `AbortSignal.timeout(timeoutMs)`. |
| Platform proxy route timeout | The platform proxy route forwards upstream without its own explicit timeout. F7 did not use the platform proxy as the target endpoint; it posted directly to `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker`. |
| Worker execution timeout | Worker-side capture would use the request `timeoutBudgetMs = 30000` and readiness policy if execution began. F7 has no worker response proving worker execution began. |
| Test/smoke runner timeout | The F7 script does not pass a timeout override. The local execution process inherited or injected `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=1000`; the F5 smoke documentation already records a preliminary local invocation that inherited a `1000ms` timeout before final F5 explicitly set `30000ms`. |

### Effective Timeout

The effective F7 capture POST timeout was the rendered-capture worker HTTP client config timeout, not the capture readiness timeout and not the worker request budget.

Persisted F7 evidence:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED.details.timeoutMs = 1000`
- `CAPTURE_WORKER_REQUEST_STARTED.details.timeoutMs = 1000`
- `CAPTURE_WORKER_REQUEST_BUILT.details.timeoutMs = 1000`
- `CAPTURE_WORKER_HTTP_ERROR.details.timeoutMs = 1000`
- `CAPTURE_WORKER_REQUEST_FAILED.details.timeoutMs = 1000`
- capture job `timeoutBudgetMs = 30000`
- request payload `capture.timeoutBudgetMs = 30000`
- request readiness `maxTotalCaptureMs = 30000`

Therefore `1000ms` came from the local rendered-capture worker client env/config value used by the F7 process. The env timeout is not ignored; it is wired into the client and was the value that aborted the POST. The phase/job budget did not override the worker timeout downward. The F7 script itself did not pass a short timeout, so the short value was inherited from the local production-env execution context rather than from fresh import code.

If platform production has `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000`, the same code path would use `30000ms`. If production lacks that variable, the worker client default would be `35000ms`. This F7 result therefore does not prove production platform would use `1000ms`; it proves the local F7 process did.

### Worker Receipt Check

Available local evidence proves the platform-side client attempted to send the HTTP request, but does not prove worker receipt:

- Worker request sent from client: yes, by `CAPTURE_WORKER_HTTP_REQUEST_SENT`.
- Worker HTTP response received by client: no, no `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`.
- Worker-side receipt: unknown.
- Worker execution started: unknown.
- Worker browser launched: unknown.

Vercel-side worker logs were not accessible from this workspace during F8: no `vercel` CLI was available on PATH and no `.vercel` project metadata existed in the checked workspace roots. The worker fetch handler would log `request_received`, `request_validation_passed`, `execution_started`, `capture_service_entered`, and later browser/navigation milestones if the request reached and progressed inside the deployed worker, but those logs could not be inspected here.

### F8 Classification

Primary cause: **D. local smoke runner override**, more precisely local execution env/config inheritance of `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=1000`.

Not primary:

- A. client hardcoded `1000ms` timeout: not found.
- B. env timeout not wired into capture client: false; it is wired and was effective.
- C. phase budget overrides worker timeout: false; F7 job/request budget remained `30000ms`.
- E. Vercel/serverless platform timeout: not supported by F7 timing or local diagnostics.
- F. worker hung before response: possible but unproven because worker receipt is unknown.
- G. unknown: no for timeout origin; unknown only for worker receipt.

### F8 Recommended Next Phase

Recommended next phase: **increase smoke runner timeout**.

The next bounded fresh-production verification should explicitly set or assert `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000` in the local execution context before invoking the fresh import path. Do not change importer behavior, Evidence Capture behavior, worker behavior, preview behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or schema as part of that timeout correction.

## F9 Fresh Import Capture Retry With 30s Worker Timeout

Phase 8B-12K-F9 ran one fresh production import verification for:

`https://www.odv-cvijanovic.si/?gnr8_f9=20260617`

This phase did not modify code, schema, importer behavior, preview behavior, dry-run behavior, reconstruction, AI, publishing, or worker code. It did not create FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, publishing artifacts, or migrations. To honor the no-CMS-binding boundary while still using the normal fresh import and capture chain, the existing scoped pipeline dependency injection used a no-op `upsertContentSlots`; CMS slot inference ran, but persisted CMS slot count was `0`.

### F9 Required Env

Confirmed without printing the shared token:

| Env | Result |
| --- | --- |
| `DATABASE_URL` | present |
| `GNR8_RENDERED_CAPTURE_WORKER_ENABLED` | `true` |
| `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` | `https://gnr8-worker.vercel.app` |
| `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` | present |
| `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` | `30000` |

### F9 Preflight

| Check | Result |
| --- | --- |
| effective worker client timeout | `30000ms` |
| worker client endpoint | `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` |
| worker client config | `ready` |
| worker health readiness | ready, HTTP `200` |
| readiness diagnostics | `RENDERED_CAPTURE_WORKER_HEALTH_STARTED`, `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED` |
| worker route exists | `HEAD /internal/gnr8/rendered-capture-worker` -> `405`, `x-matched-path: /internal/gnr8/rendered-capture-worker` |
| compatibility route exists | `HEAD /api/internal/gnr8/rendered-capture-worker` -> `405`, `x-matched-path: /api/internal/gnr8/rendered-capture-worker` |
| target URL reachable | `200 OK`, `text/html; charset=UTF-8`, `29849` bytes |
| source URL sent to worker | public `https`, not `file://` |

### F9 Import And Worker Request

The verification used the existing fresh URL import chain:

- `importPublicSinglePageUrlToSnapshot(...)`
- `runScopedImportPipeline(...)`
- production DB-backed runtime persistence
- rendered-capture worker client from explicit env with `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000`

The existing-siteVersion retry path was not used.

| Field | Value |
| --- | --- |
| new `siteVersionId` | `9c1fdafd-ff1a-4d85-8559-5860d5775c1f` |
| runtime `siteId` | `site_bfabe23af164fb00b3ab` |
| versionNo | `1` |
| reused | `false` |
| runtime artifactId | `f6cecf7a-fe52-461c-a3d0-0bd2a485f33f` |
| raw import artifactId | `61f44492-828a-4566-8ec9-c00e3b621f2d` |
| worker request endpoint | `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` |
| sourceUrl sent to worker | `https://www.odv-cvijanovic.si/?gnr8_f9=20260617` |
| worker request sent | yes |
| worker response received | yes, HTTP `200 OK` |
| worker response latency | `15373ms` |

Worker and browser diagnostics included:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED` with `timeoutMs = 30000`
- `CAPTURE_WORKER_REQUEST_STARTED`
- `CAPTURE_WORKER_REQUEST_BUILT`
- `CAPTURE_WORKER_HTTP_REQUEST_SENT`
- `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`
- `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`
- `CAPTURE_WORKER_RESPONSE_PARSED`
- worker-side `CAPTURE_WORKER_REQUEST_STARTED` with the public `https` source URL
- `BROWSER_LAUNCH_CONFIGURATION`
- `BROWSER_LAUNCH_STARTED`
- `BROWSER_LAUNCH_SUCCEEDED`
- `PAGE_CREATION_STARTED`
- `PAGE_CREATION_SUCCEEDED`
- `NAVIGATION_STARTED`
- `NAVIGATION_SUCCEEDED`
- `DOM_SERIALIZATION_STARTED`
- `DOM_SERIALIZATION_SUCCEEDED`
- `SCREENSHOT_CAPTURE_STARTED`
- `SCREENSHOT_CAPTURE_SUCCEEDED`
- `STYLE_SAMPLING_STARTED`
- `STYLE_SAMPLING_SUCCEEDED`
- `CAPTURE_WORKER_RENDERED_DOM_USED`
- `CAPTURE_WORKER_RESULT_ACCEPTED`

### F9 Capture Result

| Check | Result |
| --- | --- |
| renderedCaptureStatus | `available` |
| renderedDomQuality | `strong` |
| sourceMode | `rendered_dom` |
| importFidelityStatus | `high_fidelity_import` |
| rendered DOM length | `43491` persisted summary, `43552` worker diagnostic |
| rendered DOM node count | `311` |
| screenshots count | `2` |
| computed style samples count | `6` |
| evidenceCaptureBaselineArtifact exists | yes |
| baseline artifactStatus | `baseline_partial` |
| baseline captureStatus | `partial` |
| baseline coverageStatus | `baseline_partial_not_reconstruction_grade` |
| raw imported files persisted | `397` |
| external asset fallbacks | `0` |

### F9 Evidence Result

Rendered capture and baseline persistence succeeded, but capture expansion evidence was still absent:

| Evidence | Result |
| --- | --- |
| rendered DOM ref | exists |
| screenshot refs | `2` |
| computed style sample ref | exists; summary sample count `6` |
| layout geometry count | `0` |
| section evidence count | `0` |
| navigation evidence count | `0` |
| layout geometry captured | `false` |
| section evidence captured | `false` |
| navigation captured | `false` |

### F9 Classification

Result: **FAIL**

Primary classification: **H. capture expansion evidence missing**.

The 30s timeout fixed the F7 transport cutoff: the worker was reached, returned within the explicit 30s client timeout, launched the browser, created the page, navigated the public `https` URL, serialized DOM, captured screenshots, sampled styles, and produced usable rendered capture. However, the stricter F9 PASS criteria also require layout geometry, section evidence, and navigation evidence, and all three persisted counts were `0`.

Not classified as:

- A. target URL unreachable: target returned `200 OK`.
- B. worker not reached: worker request was sent and HTTP `200` was received.
- C. worker auth failed: no `401` or `403`; authenticated worker request succeeded.
- D. worker browser/playwright failed: browser launch, page creation, navigation, DOM serialization, screenshots, and style sampling succeeded.
- E. navigation failed despite public URL: `NAVIGATION_SUCCEEDED`.
- F. capture output invalid: worker response parsed and was accepted.
- G. baseline persistence failed: baseline artifact exists.
- I. timeout after `30000ms`: response arrived in `15373ms`.

### F9 Recommended Next Phase

Recommended next phase: **Phase 8B-12K-F10 - Capture Expansion Evidence Persistence Diagnosis**.

Focus only on why fresh rendered-capture evidence with `renderedCaptureStatus = available` and `renderedDomQuality = strong` still persists `layout geometry = 0`, `section evidence = 0`, and `navigation evidence = 0`. Do not run Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, schema changes, or additional fresh imports unless explicitly authorized.

## F10 Capture Expansion Evidence Persistence Diagnosis

Phase 8B-12K-F10 inspected the target `siteVersionId = 9c1fdafd-ff1a-4d85-8559-5860d5775c1f` and the fresh import/baseline builder path without changing code or rerunning import/capture.

Read-only persisted data inspection found that rendered capture evidence exists: rendered DOM path exists, computed styles path exists, acquisition evidence path exists, rendered-capture manifest path exists, and both screenshot paths exist. The rendered-capture manifest reports `layoutGeometrySummary.geometryCaptured = true`, `regionCount = 3`, viewport `1366 x 768`, and `layoutGeometryEvidence.length = 1`.

The Evidence Capture baseline artifact does not carry that geometry: `captureEvidence.layoutGeometryPath` is absent, `persistedRefs.layoutGeometryRef = null`, `captureExpansionEvidence.layoutGeometryEvidence.length = 0`, `sectionBoundaryEvidence.length = 0`, and `navigationEvidence.length = 0`.

Builder path finding: `buildEvidenceCaptureBaselineArtifact(...)` does call `createLayoutGeometryEvidence(...)`, `createSectionBoundaryEvidence(...)`, and `createNavigationEvidence(...)`, but the fresh import attach call passes `renderedHtml: undefined` and does not pass `layoutGeometryEvidence`. `artifactStatus = baseline_partial` does not block the builders.

Import integration finding: `importPublicSinglePageUrlToSnapshot(...)` and worker mapping carry `RenderedCaptureResult.layoutGeometryEvidence` and materialize `rendered/layout-geometry.json`; `buildImportProvenanceSummary(...)` omits `captureEvidence.layoutGeometryPath`; `runScopedImportPipeline(...)` omits rendered HTML and layout geometry when attaching the baseline artifact.

Root cause classification: **E. persistence mapping missing**. Worker capture and rendered-capture manifest persistence have layout geometry, but the fresh baseline artifact/provenance mapping does not carry that geometry or rendered HTML into the Evidence Capture baseline expansion builders.

Recommended next phase: **Phase 8B-12K-F11 - Fresh Import Baseline Capture Expansion Wiring**. Adapt the fresh import baseline creation path to pass the already-captured rendered DOM HTML and `snapshot.renderedCapture.layoutGeometryEvidence` into `attachEvidenceCaptureBaselineArtifact(...)`, and persist the existing `rendered/layout-geometry.json` path into `captureEvidence.layoutGeometryPath`.

## F11 Fresh Import Baseline Capture Expansion Wiring

Phase 8B-12K-F11 implemented the fresh import baseline persistence wiring only. No fresh import, Limited Dry Run, FirstLimitedDryRun output, reconstruction, AI, React/block generation, publishing, migration, worker behavior change, browser capture behavior change, importer semantic change, Original Mirror behavior change, preview behavior change, dry-run behavior change, or database schema change was run or created.

Implemented behavior:

- `buildImportProvenanceSummary(...)` now persists the existing canonical rendered capture layout geometry ref at `captureEvidence.layoutGeometryPath` when `rendered/layout-geometry.json` exists.
- `runScopedImportPipeline(...)` reads already-persisted rendered DOM HTML from `captureEvidence.renderedDomPath` and passes it to `attachEvidenceCaptureBaselineArtifact(...)`.
- `runScopedImportPipeline(...)` passes `snapshot.renderedCapture.layoutGeometryEvidence` to `attachEvidenceCaptureBaselineArtifact(...)`.
- The existing deterministic baseline builders can now materialize `layoutGeometryEvidence`, `sectionBoundaryEvidence`, and `navigationEvidence` from captured rendered DOM and geometry.
- Missing rendered HTML or geometry keeps the baseline partial and records missing-input diagnostics instead of failing the import.

Diagnostics added/reused:

- logs: `EVIDENCE_CAPTURE_BASELINE_INPUTS_READY` and `EVIDENCE_CAPTURE_BASELINE_EXPANSION_MATERIALIZED`;
- persisted diagnostic codes for rendered DOM baseline input, layout geometry baseline input, layout geometry path persistence, and materialized/missing layout, section, and navigation evidence;
- write-path provenance summary now includes rendered DOM path presence, layout geometry path presence/path, and baseline expansion counts when the baseline exists.

Focused tests passed:

```bash
cd apps/platform
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test --test-name-pattern 'F11|Evidence Capture baseline expansion|rendered DOM HTML is missing' gnr8/site/scoped-import-pipeline.test.ts
```

Recommended next phase: **Phase 8B-12K-F12 - Fresh Production Import Capture Verification Retry**.
