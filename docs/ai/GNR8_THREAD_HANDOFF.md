# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## Active Track

Importer Architecture Evolution

Current status:
- 8B-12K-Retry-F4 Deployed Worker Route / Entrypoint Alignment is complete.

Current Phase:
- Phase 8B-12K-Retry-F4 Deployed Worker Route / Entrypoint Alignment is complete.

Next Phase:
- Phase 8B-12K-Retry-F5 Rendered Capture Smoke Retry After Worker Route Alignment.

Current architecture direction:
- Evidence Capture -> Original Mirror -> Reconstruction.

Website OS branch status:
- Closed/frozen/paused.
- Do not continue Website OS runtime expansion unless explicitly requested.

Latest completed milestone:
- Phase 8B-12K-Retry-F4 — Deployed Worker Route / Entrypoint Alignment.
- Status: COMPLETE.
- Updated `apps/worker` with `POST /internal/gnr8/rendered-capture-worker` and compatibility `POST /api/internal/gnr8/rendered-capture-worker`.
- Both route files use the same `renderedCaptureWorkerRouteHandlers.POST` handler from `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts`.
- Handler delegation path: `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts` -> `apps/platform/gnr8/rendered-capture-worker-server/fetch-handler.ts` -> `apps/platform/gnr8/import-rendered-capture-worker/worker-service.ts` / `worker-contract.ts`.
- Auth behavior: shared-token auth remains `x-gnr8-rendered-capture-worker-token` matched against `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`; token values are not printed or returned.
- Response contract: route errors are JSON worker errors, not generic Next HTML; successful mocked execution returns `kind = rendered_capture_worker_response_v1`, `contractVersion = 1.0.0`, matching `requestId`, and worker `status`.
- Validation: focused worker route tests passed and `apps/worker` build passed. The build output lists both capture routes as dynamic server routes.
- No full capture smoke retry, import retry, Limited Dry Run, reconstruction, AI, React/block generation, publishing, migration, or artifact creation was performed.
- Recommended next phase: Phase 8B-12K-Retry-F5 — Rendered Capture Smoke Retry After Worker Route Alignment.

Previous completed milestone:
- Phase 8B-12K-Retry-F3 — Worker HTTP Error Diagnosis.
- Status: COMPLETE with exact HTTP error classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Diagnostic scope: inspected deployed worker HTTP response, endpoint contracts, platform request contract, and persisted F2 summary without changing importer behavior, Evidence Capture behavior, source resolution behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema.
- A tokened external diagnostic POST was not executed from this local session after escalation review rejected sending the shared worker token to the external worker host. No secret values were printed or persisted. Safe unauthenticated POST probes were used for route existence/status only.
- HTTP result: both `POST https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker` and `POST https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` returned `404 Not Found`, `content-type = text/html; charset=utf-8`, with a generic Next HTML not-found page. The body was not JSON, had no worker `error.code`, no worker diagnostics, and no `rendered_capture_worker_response_v1`.
- Route contract finding: the standalone rendered-capture worker server in `apps/platform/gnr8/rendered-capture-worker-server/server.ts` supports `POST /internal/gnr8/rendered-capture-worker`, compatibility `POST /api/internal/gnr8/rendered-capture-worker`, and `GET /health`; the platform proxy route exists at `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts`; but `apps/worker` source/build exposes only `/health` and no capture POST route.
- Platform request contract: F2 primary path was `/internal/gnr8/rendered-capture-worker`, with client fallback to `/api/internal/gnr8/rendered-capture-worker` after `404`; method `POST`; auth headers present in F2 (`x-gnr8-rendered-capture-worker-token` and bearer auth, values not printed); JSON body keys were `kind`, `contractVersion`, `requestId`, `importId`, `sourceUrl`, `trace`, and `capture`.
- Failure classification: B. route missing / 404. The deployed worker host fails before auth, request validation, payload-size handling, worker runtime execution, Playwright/browser launch, timeout handling, or response-shape validation.
- Recommended next phase: Phase 8B-12K-Retry-F4 — Deployed Worker Route/Entrypoint Alignment. Verify/correct deployment/start command so `gnr8-worker.vercel.app` serves the rendered-capture worker server entrypoint or equivalent route surface before rerunning a full capture.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F2 — Rendered Capture Smoke Retry With Worker Env.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target retried: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- F2 loaded `apps/platform/.env.local` into the local execution process with shell tracing disabled. Worker token presence was confirmed as a boolean only; the token value was not printed, copied into docs, committed, or persisted by the report.
- Preflight passed: production DB URL present, worker enabled, worker base URL present (`https://gnr8-worker.vercel.app`), worker token present, worker capture path present (`/internal/gnr8/rendered-capture-worker`), worker health path present (`/health`), worker timeout `30000`, durable raw import artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` exists, and `index.html` is stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted files.
- The existing `runSiteRenderCapture(...)` path was used. Source resolution succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- The worker was reached in F2. Live diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_BUILT`, `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, `CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `RENDERED_CAPTURE_UNAVAILABLE`, and `CAPTURE_WORKER_UNAVAILABLE`. Existing service logs showed worker config state `enabled = true`, `baseUrlPresent = true`, and `tokenPresent = true`.
- F2 result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, `hasUsableEvidence = false`, failure reason `CAPTURE_WORKER_HTTP_ERROR`, screenshots `0`, computed style samples `0`, rendered DOM length `0`, DOM node count `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
- A baseline-shaped `evidenceCaptureBaselineArtifact` exists and contains capture-expansion keys, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
- Persisted rendered-capture execution reports `failureCode = CAPTURE_WORKER_HTTP_ERROR`, `environmentStatus = unsupported`, `environmentSupported = false`, `browserPackageAvailable = true`, and `browserBinaryAvailable = true`.
- Failure classification: D. worker HTTP error. F2 proves source rehydration works and the configured worker is reached; the remaining blocker is the worker HTTP response/endpoint/runtime behavior.
- Recommended next phase: Phase 8B-12K-Retry-F3 — Worker HTTP Error Diagnosis.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F1 — Production Worker Config Injection / Authenticated Readiness Verification.
- Status: COMPLETE.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Operational modes assessed: A. production admin route/server-side action with env already present, B. local shell with explicit env injection, C. Vercel CLI env pull into local `.env`, and D. dedicated superadmin-only smoke endpoint.
- Recommended mode: B. local shell with explicit env injection. It requires no new route, endpoint, action, schema, queue, worker, or admin UI, and directly fixes the `CAPTURE_WORKER_NOT_CONFIGURED` failure class from the previous local retry.
- Mode C remains a fallback only if the operator cannot safely inject the token at execution time; pulled env files must be gitignored, access-controlled, not pasted into reports, and removed after use.
- Mode A was not recommended because no existing bounded production retry route/action was identified for this exact smoke retry. Mode D was not recommended because it would require new code and a new production execution surface.
- Authenticated readiness method documented: sign in to `https://app.pasadenagenerator.com` as superadmin, call `GET /api/gnr8/admin/rendered-capture-worker/readiness`, and record only non-secret fields (`ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and `diagnostics`).
- F1 production boundary check from this shell: unauthenticated `GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness` returned `401 Unauthorized` at `2026-06-17 11:36:36 UTC` with `{"ok":false,"error":"Unauthorized"}`; in-app browser attempt was blocked before load with `net::ERR_BLOCKED_BY_CLIENT`.
- Latest authenticated-superadmin readiness result carried into F1 from phase context, without secrets: `ok = true`, `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, and diagnostics include `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`. Exact `timeoutMs` and `healthHttpStatus` should be copied from the authenticated response immediately before F2 if available.
- F2 env checklist: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://gnr8-worker.vercel.app`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<secret, do not print>`, optional `GNR8_RENDERED_CAPTURE_WORKER_PATH`, optional `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, and optional `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`.
- Secret handling rule: never commit the token, never paste it into docs, never print it in reports, disable shell tracing before injecting it, do not store pulled Production env files in tracked paths, and unset the token after the retry if exported.
- Safe F2 command shape is documented with placeholder token expansion only; no real token value was recorded.
- Recommended next phase: Phase 8B-12K-Retry-F2 — Rendered Capture Smoke Retry With Worker Env.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry — Rendered Capture Smoke Test On Existing SiteVersion.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target retried: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- Preflight confirmed old local `/tmp` source files are absent and durable raw import artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` has `index.html` stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted artifact files.
- Production admin readiness endpoint could not be independently read from this unauthenticated shell: `GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness` returned `401 Unauthorized`; an in-app browser attempt was blocked with `net::ERR_BLOCKED_BY_CLIENT`.
- The existing `runSiteRenderCapture(...)` path was used. Source resolution succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- The worker was not reached from this local retry process because `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` and `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` were absent. Retry diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_NOT_CONFIGURED`, `CAPTURE_WORKER_UNAVAILABLE`, and `RENDERED_CAPTURE_UNAVAILABLE`; no worker HTTP request was sent by the retry.
- Result remained `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, screenshots `0`, computed style samples `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
- A baseline-shaped `evidenceCaptureBaselineArtifact` now exists after the retry, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
- Failure classification: B. worker not reached, with subtype local worker client not configured.
- Recommended next phase: Phase 8B-12K-Retry-F1 — Production Worker Config Injection/Authenticated Readiness Verification.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-F2 — Rendered Capture Raw Import Artifact Source Resolution Fix.
- Status: COMPLETE.
- Updated `apps/worker/gnr8/site/site-render-capture-service.ts`.
- Updated `apps/worker/gnr8/site/site-render-capture-service.test.ts`.
- Updated `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts`.
- Updated `docs/architecture/EXISTING_SITEVERSION_CAPTURE_SOURCE_REHYDRATION_AUDIT.md`.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target audited: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- Existing import provenance points capture source refs at `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205/index.html` and `response-html.raw.html`.
- Local verification found those `/tmp` files missing, matching the 8B-12K smoke-test failure before worker execution.
- Durable source found: `raw_imported_site` artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7`, `entry_html_path = index.html`, stored in `gnr8_runtime_raw_template_artifact_files.content_bytes`, media type `text/html; charset=utf-8`, size `29715`, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`.
- Raw artifact metadata records `sourceUrl = https://www.odv-cvijanovic.si/`, `finalUrl = https://www.odv-cvijanovic.si/`, `htmlByteLength = 29849`, `persistedAssetCount = 351`, and `externalFallbackAssetCount = 0`.
- Runtime artifact `6d814f11-26bd-45ad-9e67-16fb0014c789` has `html_by_path` for `/`, but it is product/runtime output, not imported source HTML.
- Multipage route discovery has one route `/`; no separate durable `htmlAcquisition` or `rawArtifactAssembly` refs were present for this target.
- F2 fix: rendered capture source resolution now tries existing local provenance file path first; if missing, it performs a read-only lookup for the latest `raw_imported_site` artifact, tries artifact `entry_html_path` then `index.html`, reads selected HTML from `content_bytes`, materializes that HTML into a temporary rehydration path, and passes the file URL to the existing capture runner.
- F2 diagnostics added: `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_MISSING`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- Focused tests cover local provenance precedence, raw artifact fallback, raw artifact root HTML missing, no local/no raw artifact failure, and fallback diagnostics.
- Recommended next phase: Phase 8B-12K-Retry — Rendered Capture Smoke Test On Existing SiteVersion.
- No importer semantics, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, capture retries, or Evidence Capture artifacts were created or changed.

Previous completed milestone:
- Phase 8B-12I — Production Worker Env Configuration Verification.
- Status: COMPLETE.
- Created `docs/architecture/PRODUCTION_WORKER_ENV_CONFIGURATION_VERIFICATION.md`.
- Updated `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Documented required platform Production env vars: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`, `GNR8_RENDERED_CAPTURE_WORKER_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, and `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`.
- Documented that readiness requires an explicit worker base URL and shared token. Platform-origin fallbacks are not sufficient for readiness proof.
- Documented worker-side requirements: deployed Vercel worker production URL, `GET /health`, `POST /internal/gnr8/rendered-capture-worker`, compatibility `POST /api/internal/gnr8/rendered-capture-worker`, matching `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, Node runtime, Playwright package availability, launchable browser availability, and Vercel project configuration that serves the rendered capture worker.
- Documented the 8B-12J production verification flow: configure platform env vars, configure worker env vars, deploy worker, deploy platform, call `GET /api/gnr8/admin/rendered-capture-worker/readiness` as superadmin, and record the response without exposing token values.
- Expected ready proof: `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, and diagnostics including `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`.
- Failure examples now map disabled config, missing base URL, missing token, unreachable worker, and invalid health response to likely root causes.
- Information required for 8B-12J: platform Vercel project name, worker Vercel project name, worker production URL, health endpoint URL, configured path, configured timeout, token-present confirmation without token disclosure, and readiness endpoint response.
- Recommended next phase: Phase 8B-12J — Production Worker Readiness Live Check.
- No token values, copied production secrets, Vercel env changes, deployments, readiness calls, imports, retries, capture POSTs, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, repair jobs, migrations, importer behavior, Evidence Capture behavior, worker code, platform code, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema changes were made.

Previous completed milestone:
- Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.
- Status: COMPLETE.
- Added `apps/platform/gnr8/import-rendered-capture-worker/worker-readiness.ts`.
- Added `apps/platform/app/api/gnr8/admin/rendered-capture-worker/readiness/route.ts`.
- Added `apps/platform/app/api/gnr8/admin/rendered-capture-worker/readiness/rendered-capture-worker-readiness-route-handlers.ts`.
- Added `apps/platform/app/api/gnr8/admin/_tests/rendered-capture-worker-readiness-route.test.ts`.
- Updated `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Implemented a superadmin-only read-only endpoint: `GET /api/gnr8/admin/rendered-capture-worker/readiness`.
- Endpoint returns `ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and deterministic diagnostics.
- Config contract is explicit and fail-closed: enabled worker with missing/invalid `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` is `misconfigured`; enabled worker with missing `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` is `misconfigured`; token value is never returned.
- Default capture path is documented as `/internal/gnr8/rendered-capture-worker`; default health path is `/health`.
- Health check sends only bounded `GET` to the worker health endpoint, respects timeout, performs no retries, sends no capture POST, and runs no browser work from the platform endpoint.
- Health classifications: `ready`, `disabled`, `misconfigured`, `unreachable`, and `invalid_response`.
- Diagnostics added: `RENDERED_CAPTURE_WORKER_CONFIG_DISABLED`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN`, `RENDERED_CAPTURE_WORKER_HEALTH_STARTED`, `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`, `RENDERED_CAPTURE_WORKER_HEALTH_FAILED`, and `RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE`.
- Recommended next phase: Phase 8B-12I — Production Worker Env Configuration Verification.
- No importer semantics, Evidence Capture capture execution, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, retries, or Evidence Capture artifacts were created or changed.

Previous completed milestone:
- Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit.
- Status: COMPLETE.
- Created `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Read-only audit inspected rendered-capture worker config references, expected worker deployment model, existing production diagnostics, representative failed versions, root-cause classification, and production readiness.
- Representative diagnostics: `90b3abf8-7a4c-41b5-af05-244642d1962d` reached `CAPTURE_WORKER_HTTP_REQUEST_SENT` / `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED` / `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, then failed with `CAPTURE_WORKER_HTTP_ERROR`, `workerHealth.status = unreachable`, `captureJob.status = failed_transient`, and raw fallback. `88253466-783e-4484-8b68-df6c83b8a11c` built a request but did not send HTTP; it failed with `CAPTURE_WORKER_NOT_CONFIGURED`, `workerHealth.status = misconfigured`, `captureJob.status = failed_terminal`, and raw fallback.
- Production aggregate remains `14` imported versions, all `sourceMode = raw_html_fallback`, `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `screenshotCount = 0`, `computedStyleSampleCount = 0`, and missing `evidenceCaptureBaselineArtifact`.
- Root-cause classification: primary `H. platform caller misconfigured`; supporting `A. worker URL missing` for config-missing paths/local production env and `C. worker health unavailable` for unreachable paths. `J. unknown` remains for the exact HTTP status/body of transient rows because durable provenance stores diagnostic codes and job/health state but not endpoint/status/body details.
- Not supported by inspected persisted diagnostics: auth mismatch, timeout, browser dependency failure, or deployed-wrong-build as the concrete current failure class.
- Readiness result: NOT PRODUCTION READY for rendered Evidence Capture. Worker deployment/reachability, health response shape, capture response shape, and auth configuration are not proven ready.
- Recommended next phase: Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.
- No importer behavior, Evidence Capture behavior, worker behavior, worker deployment, environment variables, Original Mirror behavior, preview behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, backfills, worker jobs, retries, or imports were changed or created.

Previous completed milestone:
- Phase 8B-12F — Reconstruction Readiness Inventory Audit.
- Status: COMPLETE.
- Created `docs/architecture/RECONSTRUCTION_READINESS_INVENTORY_AUDIT.md`.
- Read-only production inventory found `14` imported runtime site versions with non-null `import_provenance_summary`.
- Bucket counts: `NO_EVIDENCE_CAPTURE = 14`; `BASELINE_ONLY = 0`; `CAPTURE_EXPANDED = 0`; `RECONSTRUCTION_READY = 0`; `DRY_RUN_READY = 0`; `DRY_RUN_COMPLETED = 0`; `UNKNOWN_STATE = 0`.
- Every imported production site version is missing `evidenceCaptureBaselineArtifact`, capture expansion evidence, `ReconstructionInput`, `ReconstructionPlanningPackage`, `ReconstructionCandidateDiscovery` package, `ReconstructionReview` package, `ReconstructionPackage`, `ReconstructionDryRunPackage`, and `FirstLimitedDryRunOutput`.
- Production capture aggregates: all `14` have `sourceMode = raw_html_fallback`, `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `screenshotCount = 0`, and `computedStyleSampleCount = 0`.
- Worker/capture-job signals: worker health is missing on `5`, unreachable on `5`, and misconfigured on `4`; capture job status is missing on `5`, failed transient on `5`, and failed terminal on `4`.
- Dominant blocker: production rendered Evidence Capture/worker readiness, not Limited Dry Run builder behavior or admin surface behavior.
- Representative blocked versions: `90b3abf8-7a4c-41b5-af05-244642d1962d` (`https://www.odv-cvijanovic.si/`) is worker-unreachable/transient-failed; `88253466-783e-4484-8b68-df6c83b8a11c` (`http://www.transportimaver.si/`) is worker-misconfigured/terminal-failed; older generated-host imports have failed rendered capture with no worker/capture-job status in provenance.
- Follow-up completed by Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, worker behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, or backfills were changed or created.

Previous completed milestone:
- Phase 8B-12 — First Real-Site Limited Dry Run Operational Test.
- Status: COMPLETE WITH PREFLIGHT FAIL.
- Created `docs/architecture/FIRST_REAL_SITE_LIMITED_DRY_RUN_OPERATIONAL_TEST.md`.
- Selected attempted target: `https://www.odv-cvijanovic.si/`, `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, `siteId = site_aaa6d44109a38b5d083f`, route count `1`.
- Preflight found no `evidenceCaptureBaselineArtifact`, no layout geometry evidence, no section evidence, no navigation evidence, no accepted `ReconstructionDryRunPackage`, and no existing `first_limited_dry_run_output` artifact for the selected site version.
- Read-only production candidate discovery found `14` site versions with non-null `import_provenance_summary` and `0` qualifying versions with the required baseline/package inputs.
- The staging database endpoint configured in `.env.staging` was checked but was not usable from this environment: `tenant/user postgres.dpkdxllcxnlytgjbnmvp not found`.
- Stopped per the 8B-12 boundary before triggering `POST /api/gnr8/admin/first-limited-dry-run`.
- API trigger result: not executed.
- Persistence verification: no write attempted, no output artifact created, no latest output loaded.
- Admin surface verification: not executed against a real persisted output because no output artifact exists.
- Idempotency check: not executed because the first trigger was not eligible to run.
- Result: FAIL at preflight; the current real-site dataset is not prepared for the existing limited dry-run chain.
- Follow-up completed by Phase 8B-12F — Reconstruction Readiness Inventory Audit.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added.

Previous completed milestone:
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_REASSESSMENT.md`.
- Assessed the implemented and verified admin-only diagnostic chain: superadmin API trigger, deterministic builder, persisted `first_limited_dry_run_output`, latest artifact loader, read-only admin surface, idempotency, forbidden-action absence, and platform build verification from 8B-10.
- Documented what remains forbidden: UI trigger button, approval controls, publish controls, edit controls, tenant-admin/client-user/public access, worker jobs, queues, simulation, reconstruction, AI, React generation, block generation, content generation, design token generation, CMS bindings, persistence schema changes, and publishing behavior.
- Compared next-boundary options: A. UI trigger button, B. limited approval/readiness marker, C. runtime mutation capture, D. first real-site operational test, and E. candidate discovery implementation.
- Recommended next phase: Phase 8B-12 — First Real-Site Limited Dry Run Operational Test.
- Rationale: before adding a UI trigger or approval/readiness system, verify that the existing admin API, persisted artifact, latest loader, and read-only surface work against one real imported site.
- Designed the 8B-12 operational test constraints: superadmin only, existing imported site only, small/static marketing-style site preferred, no ecommerce, no login/cookie-gated content, no publishing, no AI, no reconstruction execution, no worker execution, and no UI trigger.
- Defined 8B-12 pass/fail criteria for artifact creation/reuse, read-only display, forbidden field absence, missing evidence, invalid output, unsafe fields, and forbidden controls.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added.

Previous completed milestone:
- Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification.
- Status: COMPLETE.
- Added `apps/platform/app/api/gnr8/admin/_tests/first-limited-dry-run-admin-verification.test.ts`.
- Verified the admin-only diagnostic flow end to end with a fake runtime site-version provenance summary containing an Evidence Capture baseline, layout geometry evidence, section boundary evidence, navigation evidence, and a valid `ReconstructionDryRunPackage`.
- The verification calls the superadmin API trigger handler, asserts a `first_limited_dry_run_output` artifact is created, loads the latest persisted output through `loadLatestFirstLimitedDryRunOutput(...)`, builds the read-only surface projection through `loadLatestFirstLimitedDryRunSurfaceProjection(...)`, and checks Route/Navigation/Section Model counts and read-only page labels.
- Idempotency is verified: first equivalent call creates, second equivalent call reuses without another write, and changed navigation evidence creates a new latest artifact when the rebuilt output differs.
- Safety is verified: unauthorized request rejection, forbidden field rejection, metadata-only trigger response, absence of forbidden generated-output fields in persisted output, and absence of trigger/rebuild/approve/publish/edit/AI/form/button/input controls in the read-only page source.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md`, `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and this handoff.
- Recommended next phase: Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence schema, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, publishing behavior, new API routes, UI controls, worker jobs, queues, generated React, GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-surface-projection.ts`.
- Created `apps/platform/app/gnr8/admin/first-limited-dry-run/[siteVersionId]/page.tsx`.
- Added `loadLatestFirstLimitedDryRunSurfaceProjection(...)`, a defensive read-model projection over persisted `first_limited_dry_run_output` artifacts.
- Projection metadata includes artifact ref/kind, dry-run id, site-version id, output status, validation status, route/navigation/section counts, limitations count, blocker limitations count, diagnostics, created time, persisted time, and Route/Navigation/Section Model arrays.
- The page is dedicated, read-only, superadmin-only, and titled "First Limited Dry Run".
- The page displays Overview, Route Models, Navigation Models, Section Models, Limitations, diagnostics, and empty states for no output, invalid latest output, blocked latest output, no route models, and output limitations.
- Added focused source/projection tests for page labels, missing forbidden controls/phrases, empty states, and safe projection parsing.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and this handoff.
- Recommended next phase: Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, trigger UI, approval workflow, worker jobs, queues, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Earlier completed milestone:
- Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design.
- Status: COMPLETE.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md` with the post-8B-7 reassessment.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`.
- Reassessment: the 8B-7 API-only trigger is sufficient for the next UI phase because it can create or reuse a validated persisted `first_limited_dry_run_output` and returns the metadata needed for read-only inspection.
- Recommended UI location: dedicated admin dry-run page titled "First Limited Dry Run".
- Surface summary should display artifact status, output status, validation status, idempotency result, route/navigation/section model counts, limitations count, blocker limitations count, diagnostics, artifact refs, output id, site version id, dry-run id, reconstruction package id, created time, persisted time, and evidence ref count.
- Route Models display `routePath`, `sourceUrl`, section count, navigation refs, confidence, and limitations.
- Navigation Models display item count, labels, hrefs, confidence, evidence refs, and ordered item details.
- Section Models display ordered sections by route, region type, selector, bounding box, confidence, evidence refs, and limitations.
- Empty states are defined for no dry-run output yet, latest output invalid, latest output blocked, evidence missing, output exists but has no route models, and output exists but has limitations.
- Safety constraints: read-only, initially superadmin/admin-only, no publish controls, no approve controls, no reconstruction controls, no AI controls, no edit controls, no trigger controls, no route-scope controls, no force/rebuild controls, no worker jobs, no queues, no CMS bindings, no public/client-user access, no tenant-admin access, no generated React, no generated GNR8 blocks, no generated content, no design token generation, and no publishing logic.
- Recommended next phase: Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run worker execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, publishing behavior, worker jobs, queues, UI implementation, new API route, approval workflow, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Earlier completed milestone:
- Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation.
- Status: COMPLETE.
- Created `apps/platform/app/api/gnr8/admin/first-limited-dry-run/route.ts`.
- Created `apps/platform/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers.ts`.
- Added a superadmin-only POST API trigger for deterministic first limited dry-run output generation and persistence.
- Request contract accepts only `siteVersionId` and `dryRunId`; `routeScope`, `force`, evidence payloads, generated outputs, and other extra request fields are rejected deterministically.
- Trigger flow loads the runtime site version, latest Evidence Capture baseline, and matching `ReconstructionDryRunPackage`; runs `buildFirstLimitedDryRunOutput(...)`; validates with `validateFirstLimitedDryRunOutput(...)`; persists valid output as `first_limited_dry_run_output`; and returns metadata only.
- Idempotency reuses the latest equivalent artifact for the same `siteVersionId` and `dryRunId`; a new artifact is appended only when the rebuilt output differs.
- Response metadata includes `artifactRef`, `artifactKind`, `outputStatus`, validation, route/navigation/section model counts, limitations counts, blocker limitation count, `idempotencyResult`, and diagnostics.
- Added focused API tests for unauthorized access, missing IDs, forbidden fields, missing baseline, missing dry-run package, valid persistence, idempotent reuse, invalid builder output non-persistence, metadata-only response, and generated-output request rejection.
- Recommended next phase: Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run worker execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, publishing behavior, worker jobs, queues, UI button, approval workflow, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md`.
- Defined the superadmin-only trigger boundary for creating and persisting a `FirstLimitedDryRunOutput`.
- Trigger may load the latest Evidence Capture baseline, load the matching `ReconstructionDryRunPackage`, run the deterministic builder, validate output, persist a valid artifact, and return artifact metadata and model counts.
- Access control is fail-closed, superadmin-only, server-side, with no public access, no client-user access, and no tenant-admin access yet.
- Input contract requires `siteVersionId` and `dryRunId`; `routeScope` override and `force` are forbidden for the first implementation.
- Output contract returns `ok`, artifact reference metadata, output status, validation status, model counts, limitations counts, and deterministic diagnostics.
- Failure cases are deterministic: unauthorized, missing IDs, forbidden overrides, missing dry-run package, site-version mismatch, missing Evidence Capture baseline, invalid builder output, validation failure, and persistence failure.
- Idempotency strategy is deterministic append with latest pointer: reuse the latest artifact when the newly built output is equivalent, append a new artifact only when the output differs, and keep explicit versioning/force out of scope.
- Auditability fields include `triggeredBy`, `triggeredAt`, input refs, validation result, artifact ref, output status, model counts, limitations count, blocker limitations count, and idempotency result.
- Recommended next phase: Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, API route, UI button, queue execution, publishing behavior, source content mutation, domain/DNS mutation, CMS mutation, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-5 — First Limited Dry Run Output Persistence.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-output-persistence.ts`.
- Added `persistFirstLimitedDryRunOutput(...)` for validated persistence of `FirstLimitedDryRunOutput` as artifact kind `first_limited_dry_run_output`.
- Added `loadLatestFirstLimitedDryRunOutput(...)` for latest persisted output readback by `siteVersionId` and optional `dryRunId`.
- Storage uses existing runtime site-version `import_provenance_summary`, under `firstLimitedDryRunOutputArtifacts` and `latestFirstLimitedDryRunOutputArtifact`; no new DB table was added.
- Validation runs before write via `validateFirstLimitedDryRunOutput(...)`; forbidden generated output shapes and mismatched `siteVersionId`/`dryRunId` are rejected before persistence.
- Persisted artifact metadata preserves validation result and diagnostics.
- Recommended next phase: Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design.
- No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, runtime API, UI surface, approval workflow, publishing behavior, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-4 — First Limited Dry Run Builder Re-Assessment.
- Status: COMPLETE.
- Updated `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-8B-3 reassessment.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md` with implemented and still-missing status.
- Previous conceptual Dry Run readiness: 82/100.
- Previous execution Dry Run readiness: 73/100.
- Updated conceptual Dry Run readiness: 86/100.
- Updated execution Dry Run readiness: 77/100.
- Feasibility remains route model feasible, navigation model feasible, section model feasible, content model risky, block model not_ready, and design token model not_ready.
- Runtime readiness: contract, builder, and validation are implemented; persistence, API trigger, UI display, worker execution, approval, and publish remain missing.
- Conclusion: the deterministic builder is sufficient to justify moving toward a controlled runtime dry-run surface, but persistence should come before API/runtime trigger or UI exposure.
- Recommended next phase: Phase 8B-5 — First Limited Dry Run Output Persistence.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, runtime API, UI surface, approval workflow, or publishing logic was added.

Previous completed milestone:
- Phase 8B-3 — First Limited Dry Run Builder Implementation.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-builder.ts`.
- Added `buildFirstLimitedDryRunOutput(...)`, a pure deterministic builder that accepts `ReconstructionDryRunPackage` plus Evidence Capture baseline and/or capture expansion evidence.
- Builds only `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` inside `FirstLimitedDryRunOutput`.
- Route models use only explicit `dryRunPackage.routeScope.routes`, captured Evidence Capture baseline source URLs, emitted section refs, emitted navigation refs, and propagated limitation refs. The builder does not infer routes from navigation hrefs or evidence outside route scope.
- Navigation models use only `NavigationEvidence`, preserving labels, hrefs, confidence, deterministic item ordering, evidence refs, and deterministic dedupe by normalized label plus href when duplicates are present.
- Section models use only `SectionBoundaryEvidence` and `LayoutGeometryEvidence` for traceability/consistency. The builder preserves section ID, route path, region type, selector, bounding box, confidence, evidence refs, and limitation refs, and does not recompute bounding boxes.
- Propagates dry-run package limitations and deterministic missing navigation evidence, missing section evidence, missing source URL, and route/evidence mismatch limitations.
- Builder output is validated with `validateFirstLimitedDryRunOutput(...)`.
- Recommended next phase: Phase 8B-4 — First Limited Dry Run Builder Re-Assessment.
- No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8B-2 — First Limited Dry Run Builder Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_BUILDER_DESIGN.md`.
- Defined exact deterministic mapping rules for creating `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` from existing Evidence Capture baseline data, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, and `NavigationEvidence`.
- Route model mapping uses only explicit dry-run route scope route identities, captured source URLs, section refs, navigation refs, route limitation refs, and conservative aggregate confidence. It does not create routes from navigation hrefs or source-site crawling.
- Navigation model mapping uses `NavigationEvidence` only, with deterministic confidence propagation, duplicate handling, item ordering, rewritten contiguous positions after dedupe, evidence refs, and limitation refs.
- Section model mapping uses `SectionBoundaryEvidence` and `LayoutGeometryEvidence`, with deterministic section ordering, exact selector copying, exact section boundary bounding box copying, confidence propagation, layout geometry used only for traceability/consistency checks, and limitation propagation.
- Defined limitation flow from Evidence Capture, section evidence, navigation evidence, and existing dry-run package limitations into `FirstLimitedDryRunOutput.limitations`.
- Defined traceability rules for `sourceEvidenceRefs`, `limitationRefs`, top-level `evidenceRefs`, and the Phase 8B-1 route model contract's indirect source traceability through `sectionRefs`, `navigationRefs`, and top-level refs.
- Defined determinism rules: same input equals same output, with no randomness, no AI, no live network reads, no preview reads, no Original Mirror product-truth reads, no selector generation, no bounding box recomputation, and no inference outside existing evidence.
- Recommended next phase: Phase 8B-3 — First Limited Dry Run Builder Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, generated route model output, generated navigation model output, generated section model output, or publishing logic was added.

Previous completed milestone:
- Phase 8B-1 — First Limited Dry Run Contract.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-contract.ts`.
- Defined the formal `FirstLimitedDryRunOutput` contract for Route Model, Navigation Model, and Section Model only.
- Defined `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`.
- Output status values are `planned`, `valid`, `invalid`, and `blocked`; no executed, completed, or published statuses exist.
- Added `validateFirstLimitedDryRunOutput(...)` to reject forbidden output payloads including Block Model, Content Model, Design Token Model, React output, CMS bindings, publishing artifacts, and generated output containers.
- Added `createEmptyFirstLimitedDryRunOutput(...)`, which carries IDs, route scope, limitations, and created timestamp from `ReconstructionDryRunPackage`, initializes status as `planned`, creates no route/navigation/section models, and does not execute simulation.
- Recommended next phase: Phase 8B-2 — First Limited Dry Run Builder Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8B-0 — First Limited Dry Run Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md`.
- Defined the first useful limited Dry Run output scope as Route Model, Navigation Model, and Section Model only.
- Allowed inputs are Evidence Capture baseline, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, `NavigationEvidence`, `ReconstructionPackage`, `ReconstructionDryRunPackage`, and `ReconstructionSimulationPlan`.
- Forbidden outputs are Block Model, Content Model, Design Token Model, React, GNR8 blocks, CMS bindings, CMS/content models, publishing artifacts, generated site output, editable blocks, rewritten content, reconstruction workers, runtime mutations, and database writes.
- Output model design is documentation-only for `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`; no TypeScript types, schema changes, generated artifacts, or runtime behavior were added.
- Success means route list, navigation item list, ordered section list per route, evidence traceability, and limitations where confidence is low.
- Failure means no route identity, no source URL, no section evidence, no navigation evidence, contradictory evidence, blocker limitations, insufficient evidence refs, unresolved section order, route-scope mismatch, or navigation hrefs that cannot be tied to captured routes/source URLs.
- Recommended first target is a static marketing site with a small route set, visible navigation, clear sections, stable source capture, and no heavy ecommerce, complex app runtime, login/cookie-gated content, or widget-dominated primary experience.
- Recommended next phase: Phase 8B-1 — First Limited Dry Run Contract.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture implementation, runtime mutation capture, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8A-11 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-10 navigation capture.
- Updated conceptual Dry Run readiness from 77/100 to 82/100.
- Updated execution Dry Run readiness from 68/100 to 73/100.
- Feasibility is now: route model feasible; navigation model feasible; section model feasible; content model risky; block model not_ready; design token model not_ready.
- Evidence coverage: layout geometry, section boundaries, and navigation evidence are READY; runtime mutation evidence remains MISSING.
- Navigation impact: explicit persisted navigation labels, hrefs, stable positions, confidence, item counts, and discovered route counts make route relationships and navigation model planning inspectable. Navigation capture does not add runtime mutation evidence, candidate discovery/review execution, simulation, reconstruction, generated outputs, block/design token generation, or publishing.
- Conclusion: navigation capture makes first limited static Dry Run design viable. Runtime Mutation Capture is still required before meaningful or broad Dry Run execution, but it is not required before designing the first limited static Dry Run boundary.
- Remaining blockers: no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8B-0 — First Limited Dry Run Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, runtime mutation capture, generated output, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8A-10 — Navigation Capture.
- Status: COMPLETE.
- Implemented deterministic `NavigationEvidence` from existing rendered DOM, `LayoutGeometryEvidence`, and `SectionBoundaryEvidence`.
- Captures navigation item label, href, stable position, and `LOW` / `MEDIUM` / `HIGH` confidence.
- Confidence rules are deterministic: `HIGH` for anchors inside `nav`, navigation/menu roles, or header navigation regions; `MEDIUM` for repeated navigation-like link groups; `LOW` for inferred navigation containers.
- Persists navigation evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.navigationEvidence`.
- Exposes summary-only navigation evidence: `navigationCaptured`, `navigationItemCount`, and `navigationRoutesDiscovered`.
- Updates capture-expansion readiness usage so Navigation Model is READY when real `NavigationEvidence` exists. Route Model and Section Model remain READY from existing route/geometry and section boundary evidence.
- Remaining blockers: no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8A-11 — Dry Run Readiness Re-Assessment.
- No importer behavior, Original Mirror behavior, preview behavior, section boundary capture, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-9 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-8 section boundary capture.
- Updated conceptual Dry Run readiness from 72/100 to 77/100.
- Updated execution Dry Run readiness from 63/100 to 68/100.
- Feasibility is now: route model feasible; navigation model risky; section model feasible; content model risky; block model not_ready; design token model not_ready.
- Evidence coverage: layout geometry and section boundaries are READY; navigation evidence and runtime mutation evidence remain MISSING.
- Section boundary impact: deterministic classified section refs now make the Section Model READY and improve future candidate discovery and block grouping context, but they do not add navigation extraction, runtime mutation observation, candidate discovery/review execution, simulation, reconstruction, generated outputs, or publishing.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8A-10 — Navigation Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, navigation capture, runtime mutation capture, generated output, database write, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-8 — Section Boundary Capture.
- Status: COMPLETE.
- Implemented deterministic `SectionBoundaryEvidence` from existing `LayoutGeometryEvidence` and rendered DOM structure.
- Classification is limited to `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- Persists section boundary evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.sectionBoundaryEvidence`.
- Exposes summary-only section evidence presence, count, and types present.
- Updates `evaluateCaptureExpansionReadiness(...)` so Section Model is READY when section boundary evidence exists. Route Model remains READY from route/geometry evidence, and Navigation Model behavior is unchanged.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next phase: Phase 8A-9 — Dry Run Readiness Re-Assessment.
- No importer behavior, Original Mirror behavior, preview behavior, navigation extraction, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-7 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-6 layout geometry capture.
- Updated conceptual Dry Run readiness from 68/100 to 72/100.
- Updated execution Dry Run readiness from 58/100 to 63/100.
- Feasibility remains: route model feasible; navigation model risky; section model risky but improved by real geometry substrate; content model risky; block model not_ready; design token model not_ready.
- Layout geometry impact: real persisted major-region geometry improves route planning, gives section planning a partial substrate, and enables section boundary capture as the next slice.
- Remaining blockers: no section boundary evidence, no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next phase: Phase 8A-8 — Section Boundary Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, generated output, database write, navigation capture, runtime mutation capture, or section boundary capture was added.

Earlier completed milestone:
- Phase 8A-6 — Layout Geometry Capture.
- Status: COMPLETE.
- Implemented the first real Evidence Capture expansion slice: deterministic `LayoutGeometryEvidence` capture for rendered pages.
- Captures route path, viewport width/height, document height, and major structural regions only: `body`, `main`, `header`, `nav`, `footer`, `aside`, and `section`.
- Region evidence includes region id, tag name, role, selector, normalized bounding box, and child count.
- Persists geometry in the existing Evidence Capture baseline artifact under `captureExpansionEvidence.layoutGeometryEvidence` and stores the JSON evidence file at `rendered/layout-geometry.json`.
- Exposes summary-only geometry presence in the Evidence Capture baseline read path: `geometryCaptured`, `regionCount`, and viewport size.
- `evaluateCaptureExpansionReadiness(...)` now explicitly treats layout geometry as route-model ready evidence; section model remains partial when geometry exists without section boundary evidence; navigation model behavior is unchanged.
- Recommended next phase: Phase 8A-7 — Dry Run Readiness Re-Assessment.
- No section inference, navigation extraction, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, candidate discovery execution, candidate review execution, database schema change, LLM call, or new persistence table was added.
- Canonical architecture doc: `docs/architecture/IMPORTER_ARCHITECTURE_SPLIT.md`.
- Reconstruction control-plane closure doc: `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md`.
- Audit doc: `docs/architecture/EVIDENCE_CAPTURE_INVENTORY_AUDIT.md`.
- Original Mirror Fidelity doc: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`.
- Reconstruction input contract doc: `docs/architecture/RECONSTRUCTION_INPUT_CONTRACT.md`.
- Reconstruction input contract code: `apps/platform/gnr8/architecture/reconstruction-input-contract.ts`.
- Reconstruction planning gate doc: `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md`.
- Reconstruction planning contract code: `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts`.
- Reconstruction candidate discovery contract doc: `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md`.
- Reconstruction candidate discovery contract code: `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts`.
- Reconstruction candidate review contract doc: `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md`.
- Reconstruction candidate review contract code: `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts`.
- Reconstruction package contract doc: `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`.
- Reconstruction package contract code: `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`.
- Reconstruction dry-run boundary doc: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`.
- Simulation readiness review doc: `docs/architecture/SIMULATION_READINESS_REVIEW.md`.
- Capture expansion for first Dry Run doc: `docs/architecture/CAPTURE_EXPANSION_FOR_FIRST_DRY_RUN.md`.
- First limited Dry Run design doc: `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md`.
- Reconstruction dry-run boundary contract code: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`.
- Capture expansion layout contract code: `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts`.
- Capture expansion plan doc: `docs/architecture/CAPTURE_EXPANSION_PLAN.md`.
- Minimum handoff normalizer code: `apps/platform/gnr8/architecture/reconstruction-input-normalizer.ts`.
- Readiness evaluator code: `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts`.
- Original Mirror Fidelity and Reconstruction Readiness read model: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`.
- Evidence Capture coverage against `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`: Supported Now 16/66 fields (24.2%), Partial 33/66 fields (50.0%), Missing 17/66 fields (25.8%).
- Current foundation: raw HTML, rendered DOM, viewport/full-page screenshots, computed style samples, rendered layout geometry, deterministic section boundary evidence, deterministic navigation evidence, direct asset fetch manifests, acquisition evidence, diagnostics, worker job state, worker health, and multi-page route discovery evidence.
- Highest-value gaps: runtime mutation evidence, browser network inventory, media/widget evidence, design token evidence, and normalized fidelity limitations.
- Readiness levels are now deterministic: `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE`.
- Reconstruction Readiness is now surfaced read-only in Site Workspace from the persisted Evidence Capture baseline.
- Original Mirror Fidelity is now surfaced read-only in Site Workspace from the persisted Evidence Capture baseline.
- Reconstruction Planning Gate now defines metadata-only planning eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Reconstruction Planning Package and Reconstruction Candidate contracts exist only as planning metadata. They do not generate React, blocks, workers, approvals, persisted reconstruction, or publishing artifacts.
- Reconstruction Candidate Discovery Contract now defines the future discovery package shape, normalized candidate taxonomy, evidence traceability shape, confidence model, discovery status values, and deterministic discovery eligibility from Planning Gate readiness only.
- Reconstruction Candidate Review Contract now defines the future human review package shape, candidate review item shape, review decisions, review package statuses, deterministic review eligibility from completed discovery metadata, and decision summary behavior.
- Reconstruction Package Contract now defines the reviewed candidate handoff package, approved candidate shape, reconstruction intent values, package statuses, execution readiness values, deterministic package builder behavior, and package summary behavior.
- Reconstruction Control Plane Closure documents the complete Evidence Capture -> Original Mirror Fidelity -> Reconstruction Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package chain and marks Future Dry Run, Future Reconstruction, and Future Publish as NOT IMPLEMENTED YET.
- Reconstruction Dry Run Boundary now defines the future Dry Run contract boundary, deterministic eligibility from `ReconstructionPackage.executionReadiness` / `ReconstructionPackage.packageStatus`, dry-run package creation, dry-run package validation, deterministic Simulation Plan creation, and Simulation Plan validation.
- Simulation Readiness Review concludes that the control plane is ready for planning and limited first-model planning is possible with high risk, but first meaningful Dry Run execution should still wait for runtime mutation evidence, candidate discovery/review execution, and reconstruction execution boundaries.
- Phase 8A-4 creates the contract vocabulary for the highest-value capture-expansion evidence: layout geometry, section boundaries, navigation structure, and runtime mutation evidence.
- Phase 8A-5 reassesses the post-8A-4 state: conceptual readiness improved because evidence shapes are defined; execution readiness remains limited because capture implementation does not populate those shapes.
- Phase 8A-6 implements layout geometry capture and persistence for rendered major structural regions.
- Phase 8A-8 implements deterministic section boundary capture from persisted layout geometry.
- Phase 8A-9 reassesses the post-section-boundary state: conceptual readiness is 77/100, execution readiness is 68/100, route and section models are feasible, navigation and content models remain risky, and block/design token models remain not_ready.
- Phase 8A-10 implements deterministic navigation capture from rendered DOM links plus existing layout and section evidence.
- Phase 8A-11 reassesses the post-navigation state: conceptual readiness is 82/100, execution readiness is 73/100, route/navigation/section models are feasible, content remains risky, block/design token models remain not_ready, and first limited static Dry Run design is viable.
- Phase 8B-0 defines the first limited Dry Run design: Route Model, Navigation Model, and Section Model only, with documentation-only output shapes, input boundaries, success/failure criteria, human review boundary, and recommended first target site type.
- Evidence coverage summary: layout geometry, section boundaries, and navigation evidence are ready; runtime mutation evidence is missing; route identity, rendered DOM, rendered HTML hash, screenshots, computed styles, fonts, widgets, network, media, design-token, and multi-route evidence remain partial.
- Required P0 minimum handoff evidence: evidence artifact status, source URL, route identity, rendered DOM ref, rendered HTML hash, render status, route capture status, and no blocker fidelity limitation.
- P1/P2 evidence remains required for useful and high-confidence reconstruction, but not for `MINIMUM_READY`: settled DOM snapshot, screenshot refs, computed style samples, loaded font inventory, basic layout boxes, failed/blocked browser requests, iframe/embed/widget inventory, console summaries, runtime mutation summaries, media evidence, and broader network evidence.
- 7F-9 comparison confirms that baseline evidence missing rendered DOM remains `NOT_READY`, while 7F-8-enriched rendered DOM ref, rendered HTML hash, and route identity can reach `MINIMUM_READY` when no blocker fidelity limitation remains.
- Optional evidence such as fonts and widgets improves deterministic summaries but cannot override missing required fields or blocker fidelity limitations.
- No reconstruction execution exists yet. No AI reconstruction, React/block generation, semantic reconstruction, preview mutation, capture behavior change, browser instrumentation, new screenshots, route discovery change, asset rewriting change, script policy change, public rendering change, Servo integration, API change, or DB schema change exists in 7F.
- Provider strategy: Chrome / Playwright is the only active provider; there is no secondary provider. Servo is only a possible later research spike and is not on the active roadmap.
- Route sampling strategy for future expanded evidence: root route, top navigation routes, one listing route, one detail/blog route, one contact/form route, and routes with widget/map/form/gallery/embed signals, capped to a small representative MVP sample.
- Settling strategy for future capture: DOMContentLoaded, bounded network idle, max wait cap, mutation quiet window, lazy-load scroll pass, font readiness timeout, and screenshots after settle.
- Next recommended major phase: Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.

Production smoke-test:
- completed successfully.
- verified batch list, batch detail, timeline, diagnostics, failures, and run/resume controls.
- verified `/gnr8/command-center/hosting`.
- verified `/gnr8/command-center/hosting/[siteId]`.
- verified hosting overview, hosting detail, active version, active artifact, publish timestamp, runtime readiness, readiness drilldown, internal/working domains, external/custom domains, DNS instruction visibility, domain recheck workflow, asset diagnostics summary, and runtime diagnostics.
- verified asset diagnostics drilldown summary, severity classification, remediation guidance, and empty-state handling on hosting detail.
- verified Maver (`transportimaver.si`) production serving through the GNR8 runtime.
- verified active pointer resolution, host binding resolution, raw imported artifact serving, governance enforcement, publish activation, asset serving, compatibility rendering, and OpenStreetMap compatibility fallback.

Phase 7B real website validation:
- Viroidoc discovery, acquisition, assembly, and preview completed successfully.
- Paul Graham discovery, acquisition, and assembly completed successfully.
- Paul Graham route-limit warnings surfaced correctly.
- Initial apex/www canonical-host mismatch assembly blocker was discovered and fixed.

Phase 7C real website validation:
- Viroidoc validation completed.
- MDN validation completed.
- GOV.UK validation completed.
- Paul Graham validation completed.
- Slovenia.info validation completed.
- Discovery quality assessment completed.
- Top-level navigation remains represented even under route limits on sitemap-heavy sites.

Phase 7D production Viroidoc verification:
- latest import run: `client-site-import-1780996748493`
- siteVersionId reused deterministically: `e9257245-0256-4291-9989-66a33ee6741e`
- artifactId: `f44a3f28-5635-4237-b73a-a33af993c73d`
- acquired pages: 20
- valid preview routes: 21
- missing preview routes: 0
- rewritten links: 39
- root route is assembled as `root_entry` using `index.html`
- raw multi-page preview links are separated from transformed preview
- transformed preview remains semantic/fallback and is not the source of truth for route-level inspection

Phase 7F importer architecture evolution:
- Evidence Capture captures source-site evidence as a browser/user sees it.
- Original Mirror provides a read-only, non-semantic, non-AI preview/archive labeled `Original Mirror Preview`.
- Reconstruction is the future GNR8-native editable output layer labeled `GNR8 Reconstruction Preview` when implemented.
- Phase 7F is complete through 7F-15: architecture split, Evidence Capture contract/audit/baseline persistence, Original Mirror Fidelity surface, Reconstruction Input Contract, capture expansion planning, minimum handoff normalization, enrichment, readiness evaluation, readiness surface, planning gate, candidate discovery contract, candidate review contract, reconstruction package contract, and reconstruction control-plane closure.
- ViroiDoc blog/news duplication is not solved by raw preview patching.
- Mono/Maver map behavior likely requires evidence capture plus widget reconstruction.
- Dongle showed source-reference preservation risk.
- DB lifecycle issue was fixed before this phase.
- Raw preview remains useful for route-level inspection and Original Mirror behavior, but Evidence Capture is the foundation for future Reconstruction.

Phase 7F-2.5 evidence capture inventory:
- The full `EvidenceCaptureArtifact` object is not emitted today.
- Chrome/Playwright rendered capture and worker orchestration exist.
- Rendered DOM, screenshots, computed style samples, raw HTML, direct asset acquisition, diagnostics, and route evidence exist.
- Full browser network, rendered layout geometry, script runtime observation, full media/widget inventory, and normalized `KnownFidelityLimitation[]` do not yet exist.
- Do not assume Phase 7F-3 has enough coverage for reconstruction-grade persistence unless a Capture Expansion phase has filled those gaps.

Phase 7F-5 reconstruction input contract:
- `ReconstructionInputArtifact` defines the maximum allowed evidence input into future reconstruction.
- `ReconstructionCandidateArtifact` defines a future output contract only; no generation exists.
- Unsupported evidence must never shape reconstruction: contract metadata, provider/run metadata, response headers, inline script signatures, route priority, and raw file paths.
- Explicit blockers are capture unavailable, capture failed, missing source URL, missing route identity, missing rendered DOM, render failed, and blocker fidelity limitation.
- Confidence inputs are defined but not calculated: DOM, asset, font, layout, widget, media, network, runtime, visual reference, and fidelity limitation completeness.

Phase 7F-6 capture expansion planning:
- `docs/architecture/CAPTURE_EXPANSION_PLAN.md` defines the smallest capture expansion path from `NOT_READY` to `MINIMUM_READY`.
- P0 is Minimum Evidence Handoff Normalization from existing capture surfaces.
- P1/P2 expands reconstruction quality with settled DOM, screenshots, computed styles, layout boxes, fonts, failed/blocked requests, widget inventories, console summaries, mutation summaries, media evidence, and broader network evidence.
- Chrome / Playwright remains the only active provider.

Phase 7F-9 reconstruction readiness re-evaluation:
- `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts` adds deterministic evaluation, baseline/enriched comparison, and summary helpers.
- Enriched rendered DOM ref, rendered HTML hash, and route identity can resolve the minimum handoff blocker set and reach `MINIMUM_READY`.
- Missing rendered DOM and blocker fidelity limitations keep readiness at `NOT_READY`.
- Optional fonts/widgets improve summary evidence only; they do not bypass blockers.
- No reconstruction execution exists yet.

Phase 7F-10 reconstruction readiness surface:
- Site Workspace exposes read-only `Reconstruction Readiness` from the persisted Evidence Capture baseline.
- Site Workspace exposes read-only `Original Mirror Fidelity` from the same baseline.
- The surface does not trigger reconstruction, approve reconstruction, mutate preview behavior, change capture behavior, or create new evidence.

Phase 7F-11 reconstruction planning gate:
- `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts` defines metadata-only `ReconstructionPlanningPackage`, `ReconstructionCandidate`, confidence levels, review states, and planning eligibility.
- `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md` documents the Evidence Capture -> Original Mirror -> Readiness -> Planning Gate boundary.
- Eligibility is deterministic from existing Reconstruction Readiness only: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Everything after Planning Gate remains NOT IMPLEMENTED YET: candidate discovery, semantic extraction, AI reconstruction, React/block generation, reconstruction workers, reconstruction persistence, approval execution, and publishing.

Phase 7F-12 reconstruction candidate discovery contract:
- `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts` defines metadata-only `ReconstructionCandidateDiscoveryPackage`, normalized candidate types, evidence traceability, confidence shape, discovery statuses, and discovery eligibility.
- `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery boundary.
- Discovery eligibility is deterministic from Planning Gate readiness only: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Current discovery status is `contract_only`; candidate discovery, review, execution, persistence, AI reconstruction, React/block generation, workers, approvals, and publishing remain NOT IMPLEMENTED YET.

Phase 7F-13 reconstruction candidate review contract:
- `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts` defines metadata-only `ReconstructionCandidateReviewPackage`, `ReconstructionCandidateReviewItem`, review decisions, review package statuses, review eligibility, and review summary behavior.
- `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review boundary.
- Review eligibility is deterministic from Candidate Discovery metadata only: `discovery_complete` with `candidateCount > 0` is eligible; `not_started`, `contract_only`, `discovery_ready`, and `discovery_complete` with zero candidates are not eligible.
- Review decisions are `approved`, `rejected`, `needs_more_evidence`, `defer`, and `unsupported`.
- Package statuses are `pending`, `partially_reviewed`, `approved`, `rejected`, and `needs_more_evidence`.
- Candidate review, review persistence, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, and publishing remain NOT IMPLEMENTED YET.
- Next recommended phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 7F-14 reconstruction package contract:
- `apps/platform/gnr8/architecture/reconstruction-package-contract.ts` defines metadata-only `ReconstructionPackage`, `ApprovedReconstructionCandidate`, reconstruction intent values, package statuses, execution readiness values, package creation from Candidate Review metadata, and package summary behavior.
- `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package boundary.
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md` documents the full Evidence Capture -> Original Mirror Fidelity -> Reconstruction Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package -> Future Dry Run boundary.
- Reconstruction intent values are `recreate_as_native_block`, `preserve_as_embed`, `preserve_as_external_widget`, `convert_to_runtime_provider`, `defer`, and `unsupported`.
- Package statuses are `draft`, `ready_for_reconstruction`, `needs_more_evidence`, `blocked`, and `archived`.
- Execution readiness values are `not_ready`, `ready_for_dry_run`, and `ready_for_future_execution`; Phase 7F-14 never enables future execution and the builder only reaches `ready_for_dry_run` when approved candidates exist with no blocker limitations.
- Approved review items become approved candidates; deferred decisions become deferred candidates; unsupported decisions become unsupported candidates; rejected decisions are excluded from candidate buckets but counted in limitations/notes; `needs_more_evidence` forces package status `needs_more_evidence`.
- Future Dry Run, reconstruction execution, approval execution, AI reconstruction, React/block generation, workers, persistence, and publishing remain NOT IMPLEMENTED YET.
- Next recommended phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 7F-15 reconstruction control-plane closure:
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md` is the canonical closure document for the deterministic Evidence Capture -> Reconstruction Package control plane.
- Contract chain audit result: IDs now link backward through Review, Discovery, and Planning; `siteVersionId`, `routeScope`, and `readinessLevel` are preserved from Planning through Package; readiness remains deterministic and is not recalculated by Review or Package; blockers/limitations remain layer-scoped; status fields are field-qualified.
- Status taxonomy result: Evidence Capture uses `status`; Original Mirror uses mirror status plus fidelity badge/readiness; Reconstruction uses `readinessLevel`; Planning and Review use `reviewStatus`; Discovery uses `discoveryStatus`; Package uses `packageStatus`; execution gating uses `executionReadiness`.
- Future Dry Run, Future Reconstruction, Future Publish, dry-run execution, reconstruction execution, approval execution, AI generation, React/block generation, workers, persistence, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 8A-0 dry-run boundary planning:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` defines metadata-only `ReconstructionDryRunPackage`, dry-run status values, simulation status values, generated output type values, boundary rules, and dry-run eligibility from Reconstruction Package metadata.
- `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md` documents the Reconstruction Package -> Dry Run boundary, allowed inputs, informational outputs, restrictions, safety guarantees, approval requirements, and future flow.
- Dry Run MAY read Reconstruction Package, Evidence Capture artifacts, Reconstruction Candidates, and Review decisions, and may produce simulation artifacts.
- Dry Run MUST NOT publish, modify the source site, modify production content, execute migrations, create live websites, modify domains, modify DNS, or write runtime content.
- Eligibility rules: `ready_for_dry_run` is eligible; `not_ready`, `needs_more_evidence`, and `blocked` are not eligible.
- Dry Run output is informational and is not approved output. Future approval remains required.
- Dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 8A-1 first dry-run contract validation:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` now builds a creation-time `ReconstructionDryRunPackage` from a `ReconstructionPackage` without executing a dry run.
- Ready packages create `status = planned`, `simulationStatus = pending`, `generatedOutputs = []`, `simulationArtifacts = []`, and `blockers = []`.
- Not-ready packages create `status = blocked`, `simulationStatus = unavailable`, `generatedOutputs = []`, `simulationArtifacts = []`, and blockers explaining why.
- `validateReconstructionDryRunPackage(...)` checks required IDs, route scope, status values, blocked-package blockers, empty generated outputs, empty simulation artifacts, non-simulated package status, non-complete simulation status, informational-only output, and future approval required.
- The builder does not accept status, simulation status, simulation artifact, blocker, or generated output overrides.
- Dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.

Phase 8A-2 dry-run simulation planning contract:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` now builds a metadata-only `ReconstructionSimulationPlan` from a `ReconstructionDryRunPackage`.
- Planned Dry Run Packages create `planStatus = planned` with deterministic planned steps.
- Blocked Dry Run Packages create `planStatus = blocked` with blockers and no planned steps.
- Planned step types are `validate_package`, `load_evidence`, `map_candidates`, `plan_route_model`, `plan_section_model`, `plan_block_model`, `plan_content_model`, `plan_design_tokens`, `plan_navigation`, and `produce_simulation_summary`.
- `validateReconstructionSimulationPlan(...)` checks required IDs, route scope, planned-package steps, blocked-plan blockers, planning-only status values, planned descriptor expected outputs, and rejects generated output shapes, simulation artifacts, and executed/running/completed/simulated states.
- Simulation Plan statuses are only `not_started`, `planned`, and `blocked`.
- Simulation execution, dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.
- Phase 8A-2 is superseded by the Phase 8A-3 readiness review for next-step planning.

Phase 8A-3 simulation readiness review:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` audits Evidence Capture baseline, enrichment, Reconstruction Readiness, Planning Gate, Candidate Discovery, Candidate Review, Reconstruction Package, Dry Run Package, and Simulation Plan readiness.
- Dry Run Readiness score: 58/100.
- Evidence coverage summary: source URL is ready; route identity, rendered DOM, rendered HTML hash, screenshots, computed styles, fonts, widgets, network, media, navigation, section, design-token, and multi-route evidence are partial; layout geometry and runtime mutation evidence are missing.
- First-model feasibility: route model is feasible; navigation, section, and content models are risky; block and design token models are not ready.
- Critical gaps: minimum route-level handoff normalization, rendered layout geometry, runtime mutation evidence, and actual candidate discovery/review availability.
- Recommended next major phase: Phase 8A-4 — Capture Expansion For First Dry Run.

Phase 8A-4 capture expansion for first Dry Run:
- `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts` defines contract-only `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, `NavigationEvidence`, and `RuntimeMutationEvidence`.
- Allowed section region types are `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- Confidence levels are `LOW`, `MEDIUM`, and `HIGH`.
- Allowed runtime mutation types are `dom_insert`, `dom_remove`, `dom_replace`, `style_change`, `attribute_change`, and `unknown`.
- `evaluateCaptureExpansionReadiness(...)` reports `READY`, `PARTIAL`, or `MISSING` for route, navigation, and section model support using evidence presence only.
- `docs/architecture/CAPTURE_EXPANSION_FOR_FIRST_DRY_RUN.md` documents why these evidence types matter, how they relate to route/navigation/section models, why block generation remains out of scope, and how this feeds future Dry Run readiness.
- Capture implementation, runtime observers, inference engines, Dry Run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, database writes, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-5 — Dry Run Readiness Re-Assessment.

Phase 8A-5 dry-run readiness re-assessment:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-4 reassessment.
- Previous score: 58/100.
- Updated conceptual score: 68/100.
- Updated execution score: 58/100.
- Feasibility: route model feasible; navigation model risky; section model risky; block model not_ready; content model risky; design token model not_ready.
- Implementation gaps: layout geometry, section boundary evidence, navigation evidence, and runtime mutation evidence have contracts, but capture is not implemented, persistence is not implemented, and readiness use is contract-level only.
- Recommended next major phase: Phase 8A-6 — First Capture Implementation Slice.
- Recommended first 8A-6 path: layout geometry capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, capture implementation, browser instrumentation, generated output, database write, or publishing logic was changed.

Phase 8A-6 layout geometry capture:
- `apps/platform/gnr8/architecture/layout-geometry-capture.ts` adds deterministic normalization and major-region filtering for layout geometry evidence.
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts` captures rendered layout geometry from Playwright pages for `body`, `main`, `header`, `nav`, `footer`, `aside`, and `section` only.
- `RenderedCaptureResult` and worker response plumbing carry `layoutGeometryEvidence`.
- `apps/worker/gnr8/site/site-render-capture-service.ts` persists geometry to `rendered/layout-geometry.json`, records `captureEvidence.layoutGeometryPath`, and attaches geometry to the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores geometry under `captureExpansionEvidence.layoutGeometryEvidence` and exposes `summaries.layoutGeometry`.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only geometry presence: `geometryCaptured`, `regionCount`, and viewport size.
- `evaluateCaptureExpansionReadiness(...)` treats layout geometry as route-model ready evidence and section-model partial evidence when section boundary evidence is absent. Navigation readiness is unchanged.
- Section boundary capture, navigation capture, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-7 — Dry Run Readiness Re-Assessment.

Phase 8A-7 dry-run readiness re-assessment after layout geometry:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-6 reassessment.
- Previous conceptual score: 68/100.
- Previous execution score: 58/100.
- Updated conceptual score: 72/100.
- Updated execution score: 63/100.
- Feasibility: route model feasible; navigation model risky; section model risky but improved by the persisted geometry substrate; block model not_ready; content model risky; design token model not_ready.
- Evidence implementation: layout geometry now has a contract, capture implementation, persistence through `rendered/layout-geometry.json` and the baseline artifact, and readiness helper usage.
- Geometry impact: route planning has real viewport/document/major-region evidence; section planning has a partial substrate; section boundary capture is now the correct next slice.
- Remaining blockers: no section boundary evidence, no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next major phase: Phase 8A-8 — Section Boundary Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, generated output, database write, navigation capture, runtime mutation capture, or section boundary capture was changed.

Phase 8A-8 section boundary capture:
- `apps/platform/gnr8/architecture/section-boundary-capture.ts` adds deterministic section boundary classification from existing layout geometry plus rendered DOM structure.
- Allowed section types remain limited to `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores section boundary evidence under `captureExpansionEvidence.sectionBoundaryEvidence` in the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only section evidence: `sectionEvidenceCaptured`, `sectionCount`, and `sectionTypesPresent`.
- `evaluateCaptureExpansionReadiness(...)` now marks Section Model READY when section boundary evidence exists. Route Model remains READY from route/geometry evidence, and Navigation Model behavior is unchanged.
- Navigation extraction, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, generated outputs, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-9 — Dry Run Readiness Re-Assessment.

Phase 8A-9 dry-run readiness re-assessment after section boundaries:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-8 reassessment.
- Previous conceptual score: 72/100.
- Previous execution score: 63/100.
- Updated conceptual score: 77/100.
- Updated execution score: 68/100.
- Feasibility: route model feasible; navigation model risky; section model feasible; block model not_ready; content model risky; design token model not_ready.
- Evidence coverage: layout geometry READY; section boundaries READY; navigation evidence MISSING; runtime mutation evidence MISSING.
- Section boundary impact: section evidence now provides classified selectors, boxes, region types, and confidence, making the Section Model READY while leaving navigation extraction, runtime stability, candidate discovery/review, simulation, reconstruction, generated outputs, and publishing unchanged.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next major phase: Phase 8A-10 — Navigation Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, navigation capture, runtime mutation capture, generated output, database write, or publishing logic was changed.

Phase 8A-10 navigation capture:
- `apps/platform/gnr8/architecture/navigation-capture.ts` adds deterministic navigation extraction from rendered DOM anchors, existing layout geometry, and section boundary evidence.
- Captured navigation item fields are label, href, stable position, and confidence level.
- Confidence levels remain limited to `LOW`, `MEDIUM`, and `HIGH`.
- `HIGH` is assigned to anchors inside `nav`, navigation/menu roles, or header navigation regions; `MEDIUM` is assigned to repeated navigation-like link groups; `LOW` is assigned to inferred navigation containers.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores navigation evidence under `captureExpansionEvidence.navigationEvidence` in the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only navigation evidence: `navigationCaptured`, `navigationItemCount`, and `navigationRoutesDiscovered`.
- `evaluateCaptureExpansionReadiness(...)` marks Navigation Model READY when `NavigationEvidence` exists; Route Model and Section Model remain READY from existing route/geometry and section boundary evidence.
- Runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, generated outputs, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-11 — Dry Run Readiness Re-Assessment.

Dedicated progress doc:
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`

Current completed chain:
- Production Migration Gap Analysis
- CMS Reality Check
- CMS Slot Materialization
- Renderer Reality Check
- Migration MVP Renderer E2E Readiness Test
- Durable Migration Job Store
- Durable Migration Runtime Wiring
- Durable Batch Migration Model
- Operator Driven Batch Execution
- Batch Execution Observability
- Command Center Integration MVP
- Hosting Operations MVP
- Hosting Hardening
- Hosting Operations Workflow Review
- Readiness & Domain Operations MVP
- Internal vs Custom Domain Visibility
- Asset Diagnostics Drilldown
- Active Serving Consistency
- Imported Runtime Reconciliation
- Governance Reconciliation
- Publish Lineage Reconciliation
- Host-Binding Raw Template Serving
- Mono Map Compatibility Restoration
- Maver Production Validation
- Multi-Page Import MVP
- Discovery Expansion
- Multi-Page Raw Preview Correctness + Observability
- Importer Architecture Split
- Evidence Capture Inventory Audit

Latest completed migration capabilities:
- `MigrationBatchExecutor`
- batch run/resume routes
- execution policies
- batch event persistence
- batch observability service
- batch summary model
- timeline API
- observability API
- failure reporting
- diagnostics surfaces
- Command Center migration batch section
- migration batch list page
- migration batch detail page
- batch summary surface
- batch timeline surface
- run/resume controls
- real Postgres verification
- production smoke-test verification
- hosting overview page
- hosting detail page
- active version visibility
- active artifact visibility
- publish history visibility
- runtime readiness visibility
- domain readiness visibility
- readiness drilldown visibility
- internal/working domain visibility
- external/custom domain visibility
- DNS instruction visibility
- domain recheck workflow visibility
- asset diagnostics visibility
- asset diagnostics summary visibility
- asset diagnostics drilldown visibility
- asset diagnostics severity classification
- asset diagnostics remediation guidance
- asset diagnostics empty-state handling
- runtime diagnostics visibility
- ownership site ID to runtime site ID detail resolution
- Hosting Operations
- Asset Diagnostics
- Active Serving Consistency
- Imported Runtime Reconciliation
- Production Validation
- Mono Compatibility Validation
- multi-page discovery integration
- route candidate discovery
- multi-page acquisition
- acquisition diagnostics
- fetched-page evidence persistence
- deterministic route-map assembly
- routeMap persistence
- htmlPathMap persistence
- preview-only route-map resolver
- nested route preview support
- explicit route misses
- internal link rewriting
- route-aware navigation
- multi-page preview validation
- readiness classification
- route validation
- link validation
- operator summary
- route tables
- operator-readable warnings, blockers, recommendations, and diagnostics
- sitemap.xml discovery
- sitemap_index.xml discovery
- nested sitemap traversal
- sitemap provenance
- sitemap operator visibility
- robots.txt parsing
- sitemap declarations
- allow/disallow evidence
- route governance evidence
- canonical URL extraction
- hreflang extraction
- canonical conflict detection
- canonical provenance
- redirect evidence
- alias groups
- route collision evidence
- redirect provenance
- tiered route prioritization
- seed-visible navigation protection
- route-budget balancing
- sitemap-heavy site protection
- raw multi-page preview route correctness
- raw multi-page preview observability
- deterministic siteVersionId reuse verification
- raw preview route coverage verification
- raw preview link rewrite verification
- root route assembly as `root_entry` from `index.html`
- raw/transformed preview boundary clarification
- importer architecture split into Evidence Capture, Original Mirror, and Reconstruction
- evidence capture inventory audit baseline and coverage matrix
- reconstruction input contract, readiness model, blocker model, and future candidate contract

Completed migration-first chain:
- Import
- CMS
- Renderer
- Durable Jobs
- Durable Batches
- Batch Execution
- Batch Execution Observability
- Command Center Integration
- Hosting Operations
- Hosting Hardening
- Imported Runtime Reconciliation
- Governance Reconciliation
- Publish Lineage Reconciliation
- Host-Binding Raw Template Serving
- Mono Map Compatibility Restoration
- Maver Production Validation
- Multi-Page Import MVP
- Discovery Expansion
- Multi-Page Raw Preview Correctness + Observability
- Importer Architecture Split

Phase 6 completion notes:
- Phase 6 is COMPLETE.
- Hosting Operations MVP is complete.
- Hosting Hardening is complete.
- Canonical Active Serving Resolution is complete.
- Imported Runtime Reconciliation is complete.
- Raw imported production serving is complete.
- Compatibility-based runtime adaptation has been validated in production.
- Readiness drilldown and domain operations are operational in Hosting Operations.
- Internal/working domains and external/custom domains are separated for operator visibility.
- DNS instructions and domain recheck workflow are visible without introducing DNS execution.
- Asset Diagnostics Drilldown is operational on hosting detail.
- Asset diagnostics now expose summary, severity classification, remediation guidance, and empty-state handling.
- Production hosting smoke verification passed for the hosting overview and hosting detail routes.
- Production asset diagnostics drilldown smoke verification passed.
- Maver (`transportimaver.si`) successfully serves through the GNR8 runtime as a pixel-perfect production clone.
- Mono compatibility validation restored map rendering through the Leaflet/OpenStreetMap runtime provider.
- Publish workflow remains read-only from Hosting Operations.
- Rollback UI remains intentionally excluded.
- No DNS/provider execution was introduced.
- Website OS remains frozen.

Phase 7B completion notes:
- Phase 7B is COMPLETE.
- Phase 7B moved GNR8 from single-page import validation to static multi-page website import validation.
- Scope remained intentionally limited to static websites.
- Discovery-only integration identifies internal page candidates from a seed page.
- Controlled acquisition fetches discovered child pages and preserves evidence.
- Raw artifact assembly creates a durable deterministic multi-page route structure.
- Controlled preview renders child routes from assembled route maps.
- Internal link rewriting enables imported navigation inside controlled preview mode.
- Validation classifies preview readiness as `ready`, `ready_with_warnings`, or `blocked`.
- Operators can determine import readiness, remaining warnings, blockers, and next actions without provenance JSON, debug endpoints, or database inspection.
- Public production multi-page serving was not activated.
- Automatic publish activation was not added.

Phase 7C completion notes:
- Phase 7C is COMPLETE.
- Phase 7C classification is A/B successful.
- No architectural blockers were found.
- Discovery expansion is operational.
- Sitemap discovery now covers `sitemap.xml`, `sitemap_index.xml`, nested sitemap traversal, sitemap provenance, and sitemap operator visibility.
- Robots discovery now covers `robots.txt` parsing, sitemap declarations, allow/disallow evidence, route governance evidence, and operator visibility.
- Canonical discovery now covers canonical URL extraction, hreflang extraction, canonical conflict detection, canonical provenance, and operator visibility.
- Redirect / Alias discovery now covers redirect evidence, alias groups, route collision evidence, redirect provenance, and operator visibility.
- Discovery quality validation covered Viroidoc, MDN, GOV.UK, Paul Graham, Slovenia.info, and discovery quality assessment.
- Discovery priority balancing now covers tiered route prioritization, seed-visible navigation protection, route-budget balancing, sitemap-heavy site protection, and operator diagnostics.
- Key real-world outcome: top-level navigation remains represented even under route limits on sitemap-heavy sites.

Phase 7D completion notes:
- Phase 7D is COMPLETE through 7D-9.
- Phase 7D final checkpoint validated multi-page raw preview correctness and observability in production.
- Latest Viroidoc import run: `client-site-import-1780996748493`.
- Deterministic siteVersionId reuse verified: `e9257245-0256-4291-9989-66a33ee6741e`.
- Verified artifactId: `f44a3f28-5635-4237-b73a-a33af993c73d`.
- Viroidoc acquired 20 pages.
- Viroidoc produced 21 valid preview routes.
- Viroidoc produced 0 missing preview routes.
- Viroidoc rewrote 39 links.
- Root route assembly is `root_entry` using `index.html`.
- Raw multi-page preview links are separated from transformed preview.
- Transformed preview remains semantic/fallback and is not the source of truth for route-level inspection.
- No runtime behavior was changed.
- No import logic was changed.

Phase 7F completion notes:
- Phase 7F is COMPLETE through 7F-15 as importer architecture evolution and reconstruction control-plane closure.
- Canonical architecture doc: `docs/architecture/IMPORTER_ARCHITECTURE_SPLIT.md`.
- Type scaffolding: `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`.
- Required terminology: Evidence Capture, Capture Provider, Original Mirror Preview, GNR8 Reconstruction Preview, Known Fidelity Limitation, Reconstruction Candidate.
- No ViroiDoc fix, Maver/Mono map fix, active Servo provider, AI reconstruction, reconstruction execution, React/block generation, preview renderer rewrite, import-limit change, or script-policy change was included.

Phase 8A-0 completion notes:
- Phase 8A-0 is COMPLETE as Dry Run Boundary Planning.
- Canonical dry-run boundary doc: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`.
- Dry-run boundary contract: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`.
- No dry-run execution, reconstruction execution, AI generation, React/block generation, runtime writes, database writes, domain/DNS changes, workers, or publishing was included.

Current critical path:
- Phase 8A-2 — Dry Run Simulation Planning Contract
- Billing

Next recommended milestone:
- Phase 8A-2 — Dry Run Simulation Planning Contract.

Explicit exclusions still in force:
- no Website OS runtime expansion
- no provider execution
- no DNS execution
- no billing automation yet
- no queue/worker unless a future phase explicitly introduces it
- no autonomous execution
- no dynamic route discovery
- no authenticated/private areas
- no JavaScript click-path crawling
- no e-commerce discovery
- no CMS page materialization
- no compatibility-provider extraction
- no public production multi-page serving
- no dynamic content extraction
- no automatic publish activation

## A) Current Project State

GNR8 is currently in Migration Platform MVP Buildout mode.
The active emphasis is website migration, renderer, CMS, durable jobs, durable batches, hosting, domains, billing, deterministic contracts, approval/handoff safety, and no hidden execution.
Bootstrap runtime state (`2026-06-03`): Observation Runtime v1 completed; Insight Runtime v1 completed; Recommendation Runtime v1 completed; Optimization Runtime v1 completed; Optimization Scoring Runtime v1 completed; Proposal Candidate Runtime v1 completed; Proposal Approval Runtime v1 completed; Approval State Runtime v1 completed; Approval Queue Preview Runtime v1 completed; Execution Readiness Runtime v1 completed; Execution Package Preview Runtime v1 completed; Execution Package Readiness Runtime v1 completed; Execution Contract Preview Runtime v1 completed; Execution Authorization Readiness Runtime v1 completed; Execution Authorization Package Runtime v1 completed; Execution Plan Readiness Runtime v1 completed; Execution Candidate Runtime v1 completed; Execution Candidate Readiness Runtime v1 completed; Execution Candidate Package Runtime v1 completed; Execution Candidate Authorization Runtime v1 completed; Execution Candidate Authorization Readiness Runtime v1 completed; Execution Candidate Authorization Package Runtime v1 completed.
Completed:
- Execution Candidate Runtime v1
- Execution Candidate Readiness Runtime v1
- Execution Candidate Package Runtime v1
- Execution Candidate Authorization Runtime v1
- Execution Candidate Authorization Readiness Runtime v1
- Execution Candidate Authorization Package Runtime v1
Current validated runtime endpoint:
- Workspace Overview
Website OS runtime expansion status:
- PAUSED
Dedicated pause note:
- Website OS runtime expansion is intentionally paused.
- Future continuation point: Execution Artifact Runtime family.
- Execution Artifact Runtime family is not currently part of the migration-critical path.
Next migration platform milestone:
- Phase 8A-1 — First Dry Run Contract Validation.
- Phase 5A completed Command Center integration for migration batches; execution remains operator-driven and queue/worker orchestration does not exist yet.
- Phase 6A completed read-only hosting operations observability for Command Center; hosting overview/detail are operational and production smoke-tested.
- Phase 6B completed Hosting Operations workflow review.
- Phase 6C-A completed Readiness & Domain Operations MVP.
- Phase 6C-A2 completed Internal vs Custom Domain Visibility.
- Phase 6C-B completed Asset Diagnostics Drilldown, including severity and remediation model visibility.
- Hosting Operations MVP is functionally complete.
- Phase 6 completed Hosting Operations, Hosting Hardening, Active Serving Consistency, Imported Runtime Reconciliation, Production Validation, and Mono Compatibility Validation.
- Phase 7B completed static multi-page import validation and is Operator Ready.
- Phase 7C completed Discovery Expansion and is operational.
Current completed runtime chain:
- `Proposal Approval Queue → Execution Readiness Execution Package → Execution Contract Execution Contract Readiness → Execution Bundle Execution Bundle Readiness → Execution Authorization Execution Authorization Readiness Execution Authorization Package → Execution Intent Execution Intent Readiness → Execution Plan Execution Plan Readiness → Execution Candidate Execution Candidate Readiness Execution Candidate Package → Execution Candidate Authorization Execution Candidate Authorization Readiness Execution Candidate Authorization Package`
Candidate Authorization Family completed. Governance graph expanded. Execution remains blocked. Website OS remains read-only.
Execution Candidate Authorization Family milestone is complete and documented (completion date: `2026-06-03`; completed milestones: `Execution Candidate Authorization Runtime v1`, `Execution Candidate Authorization Readiness Runtime v1`, `Execution Candidate Authorization Package Runtime v1`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-package.ts`; runtime summary: candidate authorization preview layer, candidate authorization readiness evaluation, and candidate authorization package assembly; verified Maver results: `Homepage Conversion Flow authorization blocked readiness incomplete package incomplete`, `Homepage Quality & Messaging authorization ready preview readiness nearly ready package ready`, `Validation Runtime authorization ready preview readiness ready package ready`; governance states: `execution_candidate_authorization_preview_only`, `execution_candidate_authorization_readiness_preview_only`, `execution_candidate_authorization_package_preview_only`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`; preserved boundaries: read-only, non-executable, no execution, no mutation, no publishing, no provider execution, no AI actions; conclusion: Execution Candidate Authorization Family completed successfully, governance graph extended, all governance boundaries preserved, execution remains blocked, mutation remains blocked, publishing remains blocked, provider execution remains blocked; Website OS runtime expansion is paused; future continuation point: `Execution Artifact Runtime family`, not active and not migration-critical).
Execution Candidate Runtime family v1 milestone is complete and documented (completion date: `2026-06-03`; completed milestones: `Execution Candidate Runtime v1`, `Execution Candidate Readiness Runtime v1`, `Execution Candidate Package Runtime v1`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-candidate.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-package.ts`; runtime summary: deterministic preview-only candidate generation, candidate qualification evaluation, and candidate package assembly; verified Maver results: `Homepage Conversion Flow Candidate=blocked_candidate Candidate Readiness=incomplete Candidate Package=package_incomplete`, `Homepage Quality & Messaging Candidate=candidate_ready_preview Candidate Readiness=nearly_ready Candidate Package=package_ready`, `Validation Runtime Candidate=candidate_ready_preview Candidate Readiness=ready Candidate Package=package_ready`; governance states: `execution_candidate_preview_only`, `execution_candidate_readiness_preview_only`, `execution_candidate_package_preview_only`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`; preserved boundaries: no execution, no mutations, no publishing, no provider execution, no AI actions, no jobs, no queues, no workers; architecture chain: `Proposal → Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Candidate → Execution Candidate Readiness → Execution Candidate Package`; conclusion: Website OS now supports deterministic preview-only candidate generation, candidate qualification evaluation, and candidate package assembly; no execution, mutation, provider execution, or publishing capability exists; next dependency milestone now completed: `Execution Candidate Authorization Family`).
Execution Plan Readiness Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime file: `apps/platform/gnr8/runtime/twin/twin-execution-plan-readiness.ts`; implemented function: `buildExecutionPlanReadinessRecords(...)`; emitted records: `executionPlanReadinessRecords`; fields: `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionPlanPresent`, `planningArtifactsPresent`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`; verified Maver results: `Homepage Conversion Flow readinessState=incomplete readinessScore=80`, `Homepage Quality & Messaging readinessState=nearly_ready readinessScore=90`, `Validation Runtime readinessState=ready readinessScore=100`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_plan_readiness_preview_only`; preserved boundaries: no execution, no approval workflow, no mutation execution, no publishing, no provider execution, no queues/workers, no API changes, no database schema changes, no UI changes, no AI model calls; architecture chain: `Planning Candidates → Governance Review → Approval Records → Approval States → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Artifact Preview`; conclusion: Workspace Overview now exposes deterministic read-only Execution Plan Readiness records derived from Execution Plan Preview and planning artifact presence; no execution capability exists; next dependency milestone now completed: `Execution Candidate Runtime v1`).
Execution Authorization Package Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.test.ts`; implemented function: `generateTwinExecutionAuthorizationPackageRecords(authorizationPreviews, authorizationReadinessRecords)`; model: `TwinExecutionAuthorizationPackageRecord`; fields: `proposalId`, `proposalTitle`, `packageState`, `readinessState`, `readinessScore`, `authorizationType`, `includedComponents`, `missingComponents`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; package states: `package_incomplete`, `package_ready`; verified Transporti Maver results: `Improve Homepage Conversion Flow packageState=package_incomplete readinessState=not_ready readinessScore=85 authorizationType=conversion_authorization missingComponents=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging packageState=package_ready readinessState=nearly_ready readinessScore=95 authorizationType=content_authorization missingComponents=[design_evidence]`, `Maintain Read-Only Validation Mode packageState=package_ready readinessState=ready readinessScore=100 authorizationType=governance_validation_authorization missingComponents=[]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_authorization_package_preview_only`; diagnostics: `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED`, `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED`; preserved boundaries: no authorization workflow, no approval workflow, no execution workflow, no operator actions, no publishing, no provider execution, no mutations, no AI model calls, no background jobs, no API routes, no database schema changes, read-only deterministic package modeling only; architecture chain: `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`; conclusion: Workspace Planning Console now exposes deterministic read-only Execution Authorization Package records derived from Execution Authorization Preview and Execution Authorization Readiness records; no execution capability exists; next dependency milestone now completed: `Execution Plan Readiness Runtime v1`).
Execution Authorization Readiness Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.test.ts`; implemented function: `generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews)`; model: `TwinExecutionAuthorizationReadinessRecord`; fields: `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `not_ready`, `nearly_ready`, `ready`; verified Transporti Maver results: `Improve Homepage Conversion Flow readinessState=not_ready readinessScore=85 requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=nearly_ready readinessScore=95 requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready readinessScore=100 requirementsMissing=[]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_authorization_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED`, `TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED`; preserved boundaries: no authorization workflow, no approval workflow, no execution workflow, no operator actions, no publishing, no provider execution, no mutations, no AI model calls, read-only deterministic runtime only; architecture chain: `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`; conclusion: Workspace Planning Console now exposes deterministic read-only Execution Authorization Readiness records derived from Execution Authorization Preview records; no execution capability exists; next dependency milestone now completed: `Execution Authorization Package Runtime v1`).
Proposal Candidate Operator UX Cleanup v1 milestone is complete and verified (completion date: `2026-06-01`; Workspace Overview hierarchy: `Overview` -> `Proposal Candidates` -> `Optimization Ranking` -> `Validation Surfaces` -> `Provider Governance Snapshot` -> `Explicit Boundaries` -> `Advanced Runtime Analysis`; operator-first update: `Proposal Candidates` is now the primary operator-facing section; `Advanced Runtime Analysis` is collapsed by default and contains `Observations`, `Insights`, `Recommendations`, `Optimization Opportunities`, `Debug Diagnostics`, and `Twin Source chain`; visible operator-facing deployed sections for `Transporti Maver`: `Proposal Candidates`, `Optimization Ranking`, `Provider Governance Snapshot`, `Explicit Boundaries`; preserved boundaries: no runtime logic changes, no proposal generation changes, no approval workflow, no API changes, no database changes, no execution controls, no approve/reject controls, no publish controls, no AI action controls; validation: workspace overview tests passed and `next build` passed; conclusion: Workspace Overview now behaves as an operator-first Website OS console rather than a runtime/debug transcript; success criteria: future bootstrap resumes from Proposal Candidate Operator UX Cleanup v1 as the canonical Workspace Overview UX baseline; recommended next milestone: `Proposal Approval Preview Runtime v1`).
Workspace Navigation Wiring v1 milestone is complete and verified (connected surfaces: `/gnr8/admin/providers`, `/gnr8/admin/workspace-overview`, `/gnr8/admin/twin-preview`, `/gnr8/admin/twin-preview-real`; navigation sections implemented: `Website OS`, `Validation Surfaces`, `Website OS Navigation`; preserved boundaries: UI/navigation only + read-only links only + no runtime/API/database/Provider/Twin changes + no forms/actions/editing/publish/AI controls; validation: admin test suite passed `148/148` and `next build` passed; conclusion: Website OS runtime surfaces are now discoverable through navigation rather than requiring direct URL knowledge; recommended next milestone: Real Imported Site Workspace Overview Runtime).
Persisted Migration OS Evidence -> Website OS Workspace Overview milestone is complete and verified (completion date: `2026-06-01`; verified runtime chain: `Persisted Migration OS runtime evidence` -> `buildWebsiteDigitalTwin()` -> `generateTwinObservations(twin)` -> `generateTwinInsights(observations)` -> `generateTwinRecommendations(insights)` -> `generateTwinOptimizationOpportunities(recommendations)` -> `scoreOptimizationOpportunities(opportunities)` -> `generateTwinProposalCandidates(input)` -> `Workspace Overview UI`; verified deployed runtime values: `selectedSource=persisted_runtime_import_evidence`, `persistedEvidenceSelected=true`, `persistedEvidenceReason=persisted_runtime_evidence_selected`, `persistedEvidenceShapeStatus=valid`, `providerState=persisted/runtime-import-evidence`; verified imported site: `title=Transporti Maver d.o.o.`, `siteVersionId=88253466-783e-4484-8b68-df6c83b8a11c`, `importId=maver-reimport-1778654629704-63c7fcad`, `pages=2`, `sections=1`, `homepagePath=index.html`; successful diagnostics: `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`, `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`, `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`; canonical bootstrap snapshot update: Website OS no longer depends exclusively on fixtures and Workspace Overview can hydrate from persisted Migration OS evidence; success criteria: future bootstrap resumes from `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console` as the completed canonical runtime chain; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Execution Contract Preview Runtime v1 milestone is complete and documented (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.test.ts`; implemented function: `generateTwinExecutionContractPreviews(packageReadinessRecords)`; model: `TwinExecutionContractPreview`; states: `contract_preview_ready`, `contract_preview_incomplete`, `contract_preview_blocked`; verified Transporti Maver results: `Improve Homepage Conversion Flow contractPreviewState=contract_preview_incomplete readinessScore=70 contractType=conversion_execution_contract`, `Improve Homepage Quality and Messaging contractPreviewState=contract_preview_ready readinessScore=90 contractType=content_execution_contract`, `Maintain Read-Only Validation Mode contractPreviewState=contract_preview_ready readinessScore=100 contractType=governance_validation_contract`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_contract_preview_only`; diagnostics: `TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED`, `TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED`; preserved boundaries: no execution, no approval workflow, no mutation execution, no publishing, no provider execution, no AI model calls, deterministic preview modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Contract Preview artifacts derived from Execution Package Readiness Runtime records; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Twin Observation Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-observations.ts`, `apps/platform/gnr8/runtime/twin/twin-observations.test.ts`; implemented function: `generateTwinObservations(twin)`; implemented deterministic observation rules: `Small Site Footprint`, `No Asset Evidence Detected`, `Homepage Successfully Identified`, `Read-Only Runtime Validation`; diagnostics: `TWIN_OBSERVATIONS_STARTED`, `TWIN_OBSERVATIONS_COMPLETED`; preserved boundaries: no AI model calls, no recommendations, no optimization engine, no editing, no publishing, read-only deterministic observations only).
Twin Insight Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-insights.ts`, `apps/platform/gnr8/runtime/twin/twin-insights.test.ts`; implemented function: `generateTwinInsights(observations)`; implemented deterministic insight rules: `Focused Website Footprint`, `Primary Entry Experience Detected`, `Limited Design Evidence Available`, `Governance Boundary Enforced`; verified deployed insights for `Transporti Maver`: `Focused Website Footprint`, `Primary Entry Experience Detected`, `Limited Design Evidence Available`, `Governance Boundary Enforced`; supporting observation relationships: `Focused Website Footprint <- Small Site Footprint`, `Primary Entry Experience Detected <- Small Site Footprint + Homepage Successfully Identified`, `Limited Design Evidence Available <- No Asset Evidence Detected`, `Governance Boundary Enforced <- Read-Only Runtime Validation`; diagnostics: `TWIN_INSIGHTS_STARTED`, `TWIN_INSIGHTS_COMPLETED`; preserved boundaries: no AI model calls, no recommendations, no optimization engine, no editing, no publishing, deterministic read-only insights only).
Twin Recommendation Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-recommendations.ts`, `apps/platform/gnr8/runtime/twin/twin-recommendations.test.ts`; implemented function: `generateTwinRecommendations(insights)`; implemented deterministic recommendation rules: `Prioritize Core Page Quality`, `Evaluate Homepage Conversion Flow`, `Collect Additional Design Evidence`, `Maintain Read-Only Validation Mode`; verified deployed recommendations for `Transporti Maver`: `Prioritize Core Page Quality`, `Evaluate Homepage Conversion Flow`, `Collect Additional Design Evidence`, `Maintain Read-Only Validation Mode`; insight-to-recommendation relationships: `Focused Website Footprint -> Prioritize Core Page Quality`, `Primary Entry Experience Detected -> Evaluate Homepage Conversion Flow`, `Limited Design Evidence Available -> Collect Additional Design Evidence`, `Governance Boundary Enforced -> Maintain Read-Only Validation Mode`; diagnostics: `TWIN_RECOMMENDATIONS_STARTED`, `TWIN_RECOMMENDATIONS_COMPLETED`; preserved boundaries: no AI model calls, no optimization engine, no proposal generation, no editing, no publishing, deterministic read-only recommendations only; conclusion: Workspace Overview now displays deterministic Website OS recommendations derived from deterministic insights; next dependency milestone now completed: `Twin Optimization Runtime v1`).
Twin Optimization Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-optimizations.ts`, `apps/platform/gnr8/runtime/twin/twin-optimizations.test.ts`; implemented function: `generateTwinOptimizationOpportunities(recommendations)`; implemented deterministic optimization opportunities: `Homepage Quality Improvement`, `Homepage Conversion Review`, `Design Evidence Collection`, `Validation Stability Preservation`; verified deployed optimization opportunities for `Transporti Maver`: `HIGH Homepage Quality Improvement`, `HIGH Homepage Conversion Review`, `MEDIUM Design Evidence Collection`, `LOW Validation Stability Preservation`; recommendation-to-optimization mapping: `Prioritize Core Page Quality -> Homepage Quality Improvement`, `Evaluate Homepage Conversion Flow -> Homepage Conversion Review`, `Collect Additional Design Evidence -> Design Evidence Collection`, `Maintain Read-Only Validation Mode -> Validation Stability Preservation`; diagnostics: `TWIN_OPTIMIZATIONS_STARTED`, `TWIN_OPTIMIZATIONS_COMPLETED`; optimization fields: `impact`, `effort`, `priority`, `supportingRecommendations`; preserved boundaries: no AI model calls, no optimization engine, no mutation execution, no editing, no publishing, deterministic read-only optimization opportunities only; conclusion: Workspace Overview now displays deterministic optimization opportunities derived from deterministic recommendations; next dependency milestone completed: `Optimization Scoring Runtime v1`).
Optimization Scoring Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.ts`, `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.test.ts`; implemented function: `scoreOptimizationOpportunities(opportunities)`; scoring fields: `impactScore`, `effortScore`, `confidenceScore`, `evidenceQualityScore`, `totalScore`, `rank`; scoring mappings: `impact(high=100, medium=60, low=20)`, `effort(low=100, medium=60, high=20)`, `confidence(default=100)`, `evidenceQuality(Homepage Conversion Review=90, Homepage Quality Improvement=80, Design Evidence Collection=50, Validation Stability Preservation=100)`; verified deployed ranking for `Transporti Maver`: `#1 Homepage Conversion Review totalScore=390`, `#2 Homepage Quality Improvement totalScore=340`, `#3 Validation Stability Preservation totalScore=320`, `#4 Design Evidence Collection totalScore=270`; diagnostics: `TWIN_OPTIMIZATION_SCORING_STARTED`, `TWIN_OPTIMIZATION_SCORING_COMPLETED`; preserved boundaries: no AI model calls, no proposal generation, no optimization execution, no editing, no publishing, deterministic scoring only; conclusion: Workspace Overview now displays deterministic ranked optimization opportunities derived from optimization scoring; recommended next milestone: `Proposal Candidate Runtime v1`).
Proposal Candidate Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`, `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`; implemented function: `generateTwinProposalCandidates(input)`; proposal candidate fields: `proposalId`, `status`, `executionState`, `title`, `summary`, `priority`, `expectedImpact`, `expectedEffort`, `risk`, `optimizationRank`, `optimizationScore`, `sourceOpportunityId`, `supportingRecommendations`, `reason`, `boundaries`; verified deployed Proposal Candidates for `Transporti Maver`: `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`, `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`, `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`; selection behavior: top-ranked optimization opportunities only with default limit `3`, and `Design Evidence Collection` remains optimization-only because it is ranked `#4`; preserved boundaries: read-only, non-executable, no content mutation, no design mutation, no publishing, no provider execution, no approval workflow yet, no AI model calls; conclusion: Workspace Overview now displays read-only, non-executable Proposal Candidates derived from ranked Optimization Opportunities; recommended next milestone: `Proposal Candidate Operator UX Cleanup v1`, followed by: `Proposal Approval Preview Runtime v1`).
Approval State Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`, `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`; implemented function: `generateTwinApprovalStateRecords(approvalRecords)`; approval state model: `TwinApprovalState` with values `approval_required`, `pending_review`, `ready_for_future_approval`; current runtime emits only `pending_review` and future values are typing/contract-only; approval state record fields: `approvalId`, `proposalId`, `proposalTitle`, `approvalState`, `requiredApprovals`, `receivedApprovals`, `approvalComplete`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; verified deployed approval state record for `Transporti Maver`: `proposalTitle=Improve Homepage Conversion Flow`, `approvalState=pending_review`, `requiredApprovals=1`, `receivedApprovals=0`, `approvalComplete=false`, `governanceState=approval_state_preview_only`; all deployed approval state records currently share identical governance state; diagnostics: `TWIN_APPROVAL_STATE_STARTED`, `TWIN_APPROVAL_STATE_COMPLETED`; preserved boundaries: no approval workflow, no approve action, no reject action, no request-review action, no execution, no provider execution, no publishing, no mutation execution, no AI model calls, read-only deterministic state modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Approval State records derived from Proposal Approval Records, and approval governance modeling now exists independently from approval workflow execution; next dependency milestone now completed: `Approval Queue Preview Runtime v1`).
Approval Queue Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.test.ts`; implemented function: `generateTwinApprovalQueueItems(approvalStates, proposalCandidates)`; approval queue item fields: `queueId`, `proposalId`, `proposalTitle`, `approvalState`, `queueRank`, `queuePriority`, `optimizationScore`, `governanceState`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `summary`; verified deployed Approval Queue for `Transporti Maver`: `#1 Improve Homepage Conversion Flow queuePriority=high optimizationScore=390 approvalState=pending_review`, `#2 Improve Homepage Quality and Messaging queuePriority=medium optimizationScore=340 approvalState=pending_review`, `#3 Maintain Read-Only Validation Mode queuePriority=medium optimizationScore=320 approvalState=pending_review`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=approval_queue_preview_only`; diagnostics: `TWIN_APPROVAL_QUEUE_PREVIEW_STARTED`, `TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED`; preserved boundaries: no approval workflow, no approval state changes, no approve action, no reject action, no review action, no request approval action, no execution, no publishing, no provider execution, no mutation execution, no AI model calls, read-only deterministic queue preview only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays a deterministic Approval Queue derived from Approval State records and ranked Proposal Candidates; next dependency milestone now completed: `Execution Readiness Runtime v1`).
Execution Readiness Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-readiness.test.ts`; implemented function: `generateTwinExecutionReadinessRecords({ approvalQueueItems, executionPlanPreviews, executionArtifactPreviews })`; Execution Readiness model fields: `readinessId`, `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `not_ready`, `partially_ready`, `ready_for_future_planning`; verified deployed Transporti Maver readiness records: `Improve Homepage Conversion Flow readinessState=partially_ready readinessScore=60 requirementsMet=[homepage_detected, approval_queue_ranked, execution_plan_available] requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=ready_for_future_planning readinessScore=80 requirementsMet=[homepage_detected, messaging_surface_identified, execution_plan_available, artifact_preview_available] requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready_for_future_planning readinessScore=100 requirementsMet=[governance_boundary_present, validation_runtime_active, execution_plan_available, artifact_preview_available] requirementsMissing=[none]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_READINESS_STARTED`, `TWIN_EXECUTION_READINESS_COMPLETED`; preserved boundaries: no execution, no execution planning execution, no publishing, no provider execution, no mutation execution, no approval actions, no workflow execution, no AI model calls, deterministic read-only readiness modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Readiness records derived from Approval Queue items, Execution Plan Preview artifacts, and Execution Artifact Preview artifacts; execution readiness modeling remains governance-blocked and non-executable; next dependency milestone now completed: `Execution Package Preview Runtime v1`).
Execution Package Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.test.ts`; implemented function: `generateTwinExecutionPackagePreviews({ readinessRecords, executionPlanPreviews, executionArtifactPreviews })`; Execution Package Preview model fields: `packageId`, `proposalId`, `proposalTitle`, `packageState`, `readinessState`, `readinessScore`, `includedArtifacts`, `includedPlans`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; package states: `preview_ready`, `preview_incomplete`; verified deployed Transporti Maver package previews: `Improve Homepage Conversion Flow packageState=preview_ready readinessState=partially_ready readinessScore=60 includedPlans=[analyze_homepage_conversion_flow, identify_primary_conversion_path, prepare_conversion_improvement_plan] includedArtifacts=[conversion_review_document, conversion_improvement_plan]`, `Improve Homepage Quality and Messaging packageState=preview_ready readinessState=ready_for_future_planning readinessScore=80 includedPlans=[analyze_homepage_content, identify_messaging_improvements, prepare_content_improvement_plan] includedArtifacts=[messaging_review_document, content_improvement_plan]`, `Maintain Read-Only Validation Mode packageState=preview_ready readinessState=ready_for_future_planning readinessScore=100 includedPlans=[maintain_read_only_runtime, continue_validation_observation] includedArtifacts=[validation_status_report]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_package_preview_only`; diagnostics: `TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED`, `TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED`; preserved boundaries: no execution, no artifact generation, no approval workflow, no approval state changes, no publishing, no provider execution, no mutation execution, no AI model calls, deterministic read-only package preview only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Package Preview records assembled from Execution Readiness, Execution Plan Preview, and Execution Artifact Preview runtime layers; execution package modeling remains governance-blocked and non-executable; next dependency milestone now completed: `Execution Package Readiness Runtime v1`).
Execution Package Readiness Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.test.ts`; implemented function: `generateTwinExecutionPackageReadinessRecords(packagePreviews)`; Execution Package Readiness model fields: `packageId`, `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `incomplete`, `nearly_ready`, `ready`; verified deployed Transporti Maver package readiness records: `Improve Homepage Conversion Flow readinessState=incomplete readinessScore=70 requirementsMet=[execution_package_present, planning_artifacts_present, homepage_detected] requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=nearly_ready readinessScore=90 requirementsMet=[execution_package_present, planning_artifacts_present, messaging_surface_identified, homepage_detected] requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready readinessScore=100 requirementsMet=[execution_package_present, governance_boundary_present, validation_runtime_active] requirementsMissing=[none]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_package_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_PACKAGE_READINESS_STARTED`, `TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED`; preserved boundaries: no execution, no workflow, no approvals, no artifact generation, no publishing, no provider execution, no mutation execution, no AI model calls, deterministic read-only package readiness modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Package Readiness records derived from Execution Package Preview records; execution package readiness remains governance-blocked and non-executable; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Execution Artifact Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.test.ts`; implemented function: `generateTwinExecutionArtifactPreviews(executionPlanPreviews)`; verified deployed Execution Artifact Preview artifacts for `Transporti Maver`: `#1 Improve Homepage Conversion Flow artifactType=conversion_improvement_plan affectedAreas=[homepage, primary_conversion_path] plannedOutputs=[conversion_review_document, conversion_improvement_plan]`, `#2 Improve Homepage Quality and Messaging artifactType=content_improvement_plan affectedAreas=[homepage_hero, homepage_messaging] plannedOutputs=[messaging_review_document, content_improvement_plan]`, `#3 Maintain Read-Only Validation Mode artifactType=validation_continuation_plan affectedAreas=[runtime_governance] plannedOutputs=[validation_status_report]`; governance values: `executionState=preview_only`, `mutationBlocked=true`, `governanceState=preview_non_executable`; diagnostics: `TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED`, `TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED`; preserved boundaries: no execution, no artifact generation, no approval workflow, no provider execution, no publishing, no mutation execution, no AI model calls; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Overview now displays deterministic, read-only Execution Artifact Preview artifacts derived from Execution Plan Preview artifacts; recommended next milestone: `Workspace Planning Console UX Cleanup v1`).
Workspace Overview Bundled Stable Import Snapshot milestone is complete and verified (fixture: `apps/platform/gnr8/runtime/twin/fixtures/stable-import-snapshot.ts`; source resolution order: `stable artifact on filesystem` -> `imported-url snapshot directory` -> `bundled stable import snapshot fixture` -> `fallback No imported site available.`; verified deployed values: `selectedSource=bundled_stable_import_snapshot`, `fallbackReason=none`, `pages=18`, `sections=74`, `detectedTitle=GNR8 Validation Site`, `homepagePath=index.html`, `assets=133`, `navigationEvidence=available`, `homepageDetected=true`, `environmentScope=preview`, `providerState=preview/runtime-only`; diagnostics: `WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED`, `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED`, `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING`, `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED`, `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0`, `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED`, `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED`; preserved boundaries: read-only + no DB/schema changes + no API + no AI + no scoring + no recommendations + no editing + no publishing; conclusion: Workspace Overview is now useful in deployed environments even without local validation snapshot files; recommended next milestone: Real Imported Runtime Evidence Persistence Path).
Twin Runtime Types and Deterministic Builder milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-types.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`; implemented types: `TwinIdentity`, `TwinStatus`, `TwinSnapshot`, `TwinMetadata`, `WebsiteDigitalTwin`, `TwinViewerPayload`; implemented functions: `buildWebsiteDigitalTwin(input)` and `toTwinViewerPayload(twin)`; deterministic behavior: `twinId` from `siteId+siteVersionId+environmentScope`, controlled timestamps via `nowIso|clock`, `ready` for valid input, deterministic throws for missing `siteId/siteVersionId`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`; validation: twin-builder tests passed and `next build` passed; boundaries unchanged: no DB persistence/API/UI, no scoring/recommendations/AI/optimization/publish execution; this milestone's follow-up (Twin In-Memory Store / Read-Model Store) is now complete).
Twin In-Memory Store and Read-Model Repository milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-store.ts`, `apps/platform/gnr8/runtime/twin/twin-store.test.ts`; implemented interface: `TwinStore`; implemented methods: `saveTwin(twin)`, `getTwin(twinId)`, `getTwinBySiteVersion(siteVersionId)`, `listTwins()`, `clear()`; implemented implementation: `InMemoryTwinStore`; diagnostics: `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`; behavior: map-based storage, latest twin per `siteVersionId` tracking, multiple twins supported, twin payloads are not mutated, runtime-memory only; validation: twin-store tests passed and `next build` passed; boundaries unchanged: no database, no Supabase, no persistence, no API routes, no Workspace UI, no scoring, no recommendations, no AI; conclusion: first runtime Twin Repository layer for storing/retrieving Website Digital Twins in memory is now in place; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore as the minimal Twin runtime foundation).
Twin Viewer Read-Model Helper milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-viewer.ts`, `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`; implemented type: `TwinOverview`; implemented function: `createTwinOverview(twin)`; mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`; implemented diagnostic: `TWIN_OVERVIEW_CREATED`; validation: twin-viewer tests passed and `next build` passed; boundaries unchanged: no Workspace UI yet, no React, no database, no API, no AI, no optimization, no scoring, no recommendations; conclusion: GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation; recommended next milestone: Workspace Overview Twin Preview UI; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + TwinOverview read-model).
Workspace Overview Twin Preview UI milestone is complete and verified (route: `/gnr8/admin/twin-preview`; runtime chain: `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified deployed values: `title=Website Digital Twin Runtime Preview`, `subtitle=Read-only validation surface`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/actions/forms/publish/AI/scoring/recommendations; conclusion: GNR8 now has the first browser-visible Website Digital Twin runtime surface; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview preview route).
Twin Snapshot Hydration from Imported Site Model milestone is complete and verified (route: `/gnr8/admin/twin-preview-real`; source fixture: `real-site-01`; runtime chain: `real-site-01 fixture` -> `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified values: `title=Website Digital Twin Runtime Preview (Real Site)`, `sourceSiteVersionId=site_version_real-site-01_072929becae7`, `sourceImportId=import_real-site-01_c167859409d8`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/publish/AI/scoring/recommendations and no DB/schema changes; conclusion: GNR8 now proves an imported real-site fixture can become a visible Website Digital Twin runtime surface with evidence-hydrated read-model summaries; deterministic placeholder summaries remain fallback-only when evidence input is omitted; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview + real-site fixture preview route).
Twin Snapshot Hydration implemented evidence fields are now documented as `pageCount`, `sectionCount`, `assetCount`, `detectedTitle`, `detectedHomepagePath`, and `providerStateSummary`.
Twin Snapshot Hydration boundary is unchanged: no scoring, no recommendations, no AI, no optimization, no editing, no publishing.
Twin Snapshot Hydration conclusion: Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.
Twin Runtime Contract milestone is complete and verified as canonical contract baseline (`docs/architecture/TWIN_RUNTIME_CONTRACT.md` is now the canonical implementation source for first operational Website Digital Twin runtime objects; contract scope covers Twin Identity, Twin Status, Twin Snapshot, Twin Metadata, Twin Store rules, Twin Viewer payload, and Workspace Overview integration boundary; canonical identity fields are `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `createdAt`, `updatedAt`; status lifecycle is `building|ready|stale|failed`; snapshot fields are `contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`; metadata fields are `sourceImportId`, `sourceSiteVersionId`, `sourceModels`, `generatedAt`, `generatedBy`, `diagnostics`; storage rules are immutable per site version with stale marking allowed and failed generation diagnostics required; viewer payload contract is `identity/status/snapshot/metadata/diagnostics`; explicit out-of-scope includes scoring, recommendations, optimization, proposal generation, publish execution, runtime observation engine, and runtime optimization engine; runtime baseline now includes implemented twin types/builder with persistence/API/UI still intentionally out of scope).
First Operational Twin Roadmap Draft milestone is complete and verified as documentation-only (`docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md` is now the canonical minimal implementation slice for first visible Twin runtime value; target outcome is website imported -> twin generated -> twin stored -> twin displayed in Workspace Overview; required components are Twin Identity, Twin Snapshot, Twin Builder, Twin Store, Twin Viewer, and Workspace Overview Integration; canonical inputs are Import Pipeline, Canonical Models, Site Version, and Provider State; canonical outputs are Twin Snapshot, Twin Metadata, and Twin State Summary; out-of-scope boundary is explicit for scoring/recommendations/optimization/AI editing/publish automation; no runtime/API/UI/database implementation changes).
Provider Governance Cockpit v1 / Section Ordering Pass milestone is complete and verified (Provider Fleet has been consolidated into a coherent governance-first cockpit on `/gnr8/admin/providers` rather than an accumulated list of provider surfaces; visible-by-default canonical order is `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; collapsible detail canonical order is `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; UI/read-model only; no runtime/API changes; no provider execution; no writes; no secret resolution; no AI model calls; recommended next milestone options: Founder Docs Canonical Repo Commit, AI Credential Boundary Preview, Second Real Provider Read-only Connector; success criteria: future bootstrap resumes from Provider Governance Cockpit v1 as the canonical Provider Fleet UX baseline).
Provider Contract Registry Extraction milestone is complete and verified (Provider Fleet no longer depends on inline UI provider definitions; canonical provider contract registry now drives provider fleet read-model rendering; no runtime/API/provider execution changes).
AI Provider Capability Matrix UI milestone is complete and verified (Provider Fleet now exposes read-only AI provider routing metadata in `AI Provider Capability Matrix` on `/gnr8/admin/providers` for OpenAI/Anthropic/Gemini/Groq/Mistral including model families, strengths, routing hints, latency class, cost class, and context window class; advisory metadata only; no model calls performed; UI/read-model only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Policy Registry Extraction milestone is complete and verified (Provider Fleet `AI Routing Policy Preview` now consumes canonical read-model registry rows from `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`; preferred/secondary provider names resolve from `provider-contract-registry` where possible; all row execution states are `preview_only`; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Policy Preview / Task-to-Provider Mapping Matrix milestone is complete and verified (Provider Fleet now includes `AI Routing Policy Preview` on `/gnr8/admin/providers` with strategic task-to-provider mappings across OpenAI/Anthropic/Gemini/Groq/Mistral; advisory strategy only; no live AI routing performed; UI/read-model/docs only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Readiness Advisor milestone is complete and verified (Provider Fleet now includes `AI Routing Readiness Advisor` with explicit current state, limitations, missing requirements, and next-step guidance; badge mapping reflects success/warning/critical readiness semantics; UI/read-model only; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Evaluator Preview Model milestone is complete and verified (deterministic preview evaluator implemented in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`; evaluator matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`, uses preferred/secondary providers when matched, defaults to `openai` + `anthropic` fallback when unmatched, resolves `selectedModelFamily` from provider registry metadata, applies request preferences as constraints, always emits `execution_blocked` and `preview_only` diagnostics context, and always returns `executionAllowed:false` and `executionBlocked:true`; preview evaluator tests passed and next build passed; deterministic preview only, no model calls, no credential resolution, no provider dispatch, no runtime execution, no API endpoint yet).
AI Routing Evaluator Preview UI milestone is complete and verified (Provider Fleet now includes `AI Routing Evaluator Preview` in `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.tsx`, mounted in `provider-fleet-view.tsx`, with deterministic local task selector preview for `site_migration_planning`, `long_architecture_review`, `layout_visual_understanding`, `fast_interactive_generation`, `eu_sensitive_workloads`, and `structured_tool_orchestration`; preview result includes provider/model/strategy/fallback/reason/constraints/diagnostics and execution state is always visibly blocked; advisory text explicitly states deterministic non-executable preview and no AI providers called; no runtime execution/model calls/provider dispatch/API execution layer).
Provider Fleet Operational Snapshot milestone is complete and verified (Provider Fleet now includes visible-by-default `Operational Snapshot` above detailed sections on `/gnr8/admin/providers` with compact control-plane overview cards for `Control Plane Status`, `Connected Providers`, `Operational Read-only Capabilities`, `AI Routing Preview`, `Execution Layer`, `Governance State`, and `Recommended Next Step`; verified values are `Operational (read-only)`, connected providers derived from registry totals, operational read-only capabilities derived from registry capabilities, `AI Routing Preview: Available`, `Execution Layer: Blocked`, and `Governance State: Preview / non-executable`; derivation model is registry-driven + boundary-driven + evaluator/policy-registry-driven with no hardcoded totals where possible; no forms/buttons/actions/execution controls added; Provider Category Summary, AI Routing Readiness Advisor, Openprovider links, evaluator preview, and collapsible detail sections preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes; conclusion: Provider Fleet now exposes an executive operational overview above all detailed provider and AI orchestration surfaces; recommended next milestone: Provider Fleet Multi-Tenant / Environment Awareness; success criteria: future bootstrap resumes from Provider Fleet Operational Snapshot milestone).
Provider Fleet UI Density / Collapsible Sections milestone is complete and verified (Provider Fleet now renders governance-first with visible-by-default section order `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; dense sections are collapsible by default via native `details/summary` labels in deterministic order: `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; no content removed, no behavior removed, no new actions/forms/buttons, Openprovider link preserved, evaluator preview preserved, category summary preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Category Summary Cards milestone is complete and verified (Provider Fleet now includes `Provider Category Summary` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`, with one card per provider category showing category label, total providers, connected providers, preview/read-model capabilities count, and category execution status; current expected examples: registrar `4/1/3/blocked`, AI `5/0/10/blocked`, communication `3/0/0/blocked`, ERP/accounting `1/0/0/blocked`; no execution controls/actions/forms added; UI/read-model/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Environment Awareness Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Environment Awareness Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; provider contract registry now includes `environmentScope` and `bindingScope` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`; scope vocabularies are explicit and read-model-only; current expected mapping: Openprovider `environmentScope:sandbox` + `bindingScope:global`, placeholder providers `environmentScope:global` + `bindingScope:global`; advisory note explicitly states governance preview only with no tenant credentials managed and no provider execution performed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; canonical provider contracts now include `credentialBoundary` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts` with `credentialsRequired`, `credentialStatus`, `secretResolution`, and `bindingRequired`; summary cards render providers requiring credentials, configured references, missing references, secret resolution state, and binding required; compact per-category credential breakdown renders total/configured/missing/secret-resolution-disabled counts; current expected mapping: Openprovider `credentialStatus:configured_reference_only`, placeholders `credentialStatus:missing`, and `secretResolution:disabled` for all providers; advisory note explicitly states read-only preview and no secrets stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Advisor milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Advisor` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with governance cards for `Current State`, `Current Limitations`, `Missing Requirements`, and `Recommended Next Step`; card items explicitly document modeled references, preview availability, disabled secret resolution, blocked execution, missing governance architecture requirements, and recommended contract-first next steps while keeping execution blocked; advisory note explicitly states credential governance is preview-only and no secrets are stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no credential storage/secret management/secret resolution/provider execution/writes).
Provider Execution Governance Chain Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Execution Governance Chain Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with six explicit stages and current states: `Provider Contract` (`modeled`), `Credential Reference` (`previewed`), `Secret Resolution` (`design_only_disabled`), `Authorization Context` (`design_only_not_issued`), `Execution Approval` (`design_only_not_requested`), and `Execution` (`blocked`); stage badge mapping is explicit (success for modeled/previewed, warning for design-only states, critical for blocked); advisory note explicitly states governance preview only and that no secrets, approvals, authorization contexts, or executions are created; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Experience Workspace Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md` is now the canonical workspace architecture defining workspace purpose, areas, responsibilities, identity fields, relationship graph, AI assistant governance boundary, governance principles, current architecture-only state, and future integration anchors; no runtime/API/UI/editor/database implementation changes).
Workspace Information Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md` is now the canonical workspace information architecture defining workspace areas, navigation model, homepage information surfaces, content/design/experience/governance/AI information domains, current architecture-only boundaries, and success condition before first workspace UI design; no runtime/UI/editor/API/database implementation changes).
Workspace UI Concept Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md` is now the canonical workspace UI concept architecture defining workspace purpose, philosophy, primary areas, overview-as-digital-twin surfaces, navigation concept, AI governed-editor boundaries, governance domains, operations domains, architecture-only constraints, and the conceptual baseline that wireframe specs build on; no runtime/API/UI implementation/database changes).
Website Digital Twin Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md` is now the canonical architecture document defining the Website Digital Twin as the continuously updated operational representation of a website, with canonical twin domains, twin identity, twin relationships to content/design/experience/workspace/intelligence/governance/operations layers, twin observations, score surfaces, AI and governance boundaries, and architecture-only current state; no runtime/API/UI/database implementation changes; no twin runtime, no scoring engine, and no recommendation engine implemented yet).
Twin Generation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_GENERATION_ARCHITECTURE.md` is now the canonical architecture document defining how websites become Website Digital Twins from imported evidence, canonical models, and intelligence observations through staged generation from import to twin assembly; architecture/docs only; no runtime/API/UI/database implementation changes; no twin generation runtime, no scoring engine, and no observation engine implemented yet).
Twin Observation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md` is now the canonical observation architecture document defining observation purpose, observation inputs, canonical observation types, observation flow from signals to proposal candidates, observation severity levels, AI interpretation/recommendation assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no observation runtime and no recommendation runtime implemented yet).
Twin Optimization Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md` is now the canonical optimization architecture document defining optimization purpose, optimization inputs, optimization types, optimization opportunity structure, prioritization dimensions, optimization opportunity to proposal candidate generation, AI optimization/prioritization assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no optimization runtime and no prioritization engine implemented yet).
Website Intelligence Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md` is now the canonical intelligence architecture defining observation-and-understanding domains, canonical signals, score surfaces, recommendation progression, and explicit AI publish boundary for the Website Overview Digital Twin; architecture/docs only; no runtime/UI/API/database implementation changes; no scoring engine and no recommendation engine implemented yet).
Workspace Wireframes v1 Draft milestone is complete and verified as documentation-only (`docs/product/WORKSPACE_WIREFRAMES_V1.md` is now the canonical first structural workspace wireframe specification covering Website Overview, Content Workspace, Design Workspace, Experience Workspace, Governance Workspace, AI Workspace, and Operations Workspace with required sections for purpose, primary objects, information hierarchy, left navigation, center area, right context panel, actions, and AI surfaces; no runtime/API/UI implementation/database changes).
Content & Experience Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md` is now the canonical parent architecture for how websites are represented, edited, versioned, governed, and published across Content/Design/Experience/Editing/Publish layers with explicit governance principles and child architecture anchors; no runtime/API/UI/editor implementation changes).
AI Editor Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/AI_EDITOR_ARCHITECTURE.md` is now the canonical editing architecture for governed proposal-first editing across Content/Design/Experience models with explicit editor types, editing targets, editing operations, proposal model, proposal lifecycle, human + AI intent modes, governance principles, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Content Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_CONTENT_MODEL.md` is now the canonical content architecture child document defining structured/governed/versionable website content, core content entities, content types, content identity fields, content relationship patterns, governance principles, AI editing implications, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Design Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_DESIGN_MODEL.md` is now the canonical design architecture child document defining design as reusable experience structure, core design entities, design responsibilities, design identity fields, design relationship chain, governance principles, AI design editing intent, content-design separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Experience Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_EXPERIENCE_MODEL.md` is now the canonical experience architecture child document defining experience as user movement through a digital system, core experience entities, experience types, experience identity fields, experience relationship chain, governance principles, AI experience editing intents, content-design-experience separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Versioning & Rollback Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md` is now the canonical architecture document defining versioned models, version identity, change sets, rollback model, version lifecycle, rollback lifecycle, governance principles, and AI editing relationship for governed website evolution and first-class rollback safety; architecture/docs only; no runtime/API/UI/database/editor implementation changes).
Publish Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md` is now the canonical publish governance architecture document defining publish purpose, targets, inputs, publish plan, publish lifecycle, environment promotion chain, governance principles, AI editing publish boundary, current state, and future integration points; architecture/docs only; no runtime/API/UI/database/publish implementation changes).
Authorization Context Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md` is now the canonical contract for temporary/scoped/redacted provider authorization contexts, core fields, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/secret resolution/provider execution changes).
Execution Approval Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/EXECUTION_APPROVAL_CONTRACT.md` is now the canonical contract for governed execution approval decisions, core fields, approval types, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/provider execution changes).
Credential Reference Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md` is now the canonical contract for credential reference metadata, core fields, ownership scopes, states, and explicit boundaries; no runtime/database/API/secret storage/secret resolution/provider execution changes).
Credential Reference Registry Preview milestone is complete and verified (deterministic read-model registry implemented in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.test.ts`; Provider Fleet now includes collapsible `Credential Reference Registry Preview` section with summary counts for total/configured/missing/secret-resolution-disabled/execution-blocked references and a table for provider, binding scope, environment scope, secret type, status, resolution state, and execution; advisory note explicitly states metadata only and no secrets stored/resolved/exposed; all preview references are execution-blocked with secret resolution disabled; read-model/UI/docs only; no database changes, no APIs, no secret storage, no secret resolution, no provider execution, no writes).
Global Provider Taxonomy Expansion milestone is complete and verified (Provider Fleet now operates as the Global Provider Control Plane taxonomy across registrar, deployment, communication, ERP/accounting, edge infrastructure, commerce, execution, source control, AI, storage, and identity provider categories; registry/docs/read-model only; no runtime/API/provider execution changes).
Provider Orchestration Contract Architecture Draft milestone is complete and verified as documentation-only (first canonical multi-provider orchestration contract; no runtime/API/provider execution changes).
Second Provider Placeholder Readiness Contract milestone is complete and verified (Realtime Register placeholder now rendered with explicit orchestration contract/readiness/boundary/identity fields and provider-specific readiness advisor text in Provider Fleet Cockpit; UI/read-model only; no runtime/API/provider execution changes).
Provider Fleet Cockpit milestone is complete and verified (global provider control plane route with deterministic seeded provider registry, UI/read-model only, execution blocked).
Provider Navigation Wiring milestone is complete and verified (agency dashboard to provider fleet, provider fleet to Openprovider cockpit, and cockpit links into read-only provider surfaces).
Provider Capability Detail Cards / Readiness Explainer milestone is complete and verified (provider capability guidance layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider` with status/explanation/readiness semantics for domains, dns, availability, registration, and execution).
Provider Readiness Advisor Layer milestone is complete and verified (operator guidance/readiness interpretation layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider`; UI/read-model only; execution blocked).
Openprovider Availability Search Panel milestone is complete and verified (read-only GET availability search on `/gnr8/admin/providers/openprovider` using `?domain=<domain>` with default fallback `levi-testis.com`; real sandbox availability lookups visible in cockpit UI; no write or registration paths).
Openprovider Domain Availability Read-only Connector milestone is complete and verified (real provider-read availability check with shared sandbox auth, execution still blocked).
Openprovider Domain Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only inventory, execution still blocked).
Openprovider DNS Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only DNS inventory, execution still blocked).
Openprovider DNS Records Read-only Connector milestone is complete and verified (sandbox auth + read-only DNS inventory, execution still blocked).
Provider handoff readiness with Execution Job Shape Preview / Planned Job Materialization Contract milestone is complete and testable end-to-end from deployed UI (seed + inspection surfaces), and execution remains explicitly blocked.
The deployed dev-seed governance loop is manually verified end-to-end including governance decision package surfaces (still control-plane only).
Provider Execution Contract Envelope / Worker Payload Contract Preview milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Provider Execution Safety Manifest / No-Execution Boundary Proof milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Evidence Surface Consolidation / Operator Cockpit Layout Pass milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Cockpit Evidence Status Badges / Severity System milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Evidence Provenance Layer milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).

Current snapshot sources:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md`
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Read `docs/ai/GNR8_COLLABORATION_PROTOCOL.md` before generating Codex tasks.

## C) Rules

- Slovenian conversation.
- English Codex tasks.
- step-by-step work.
- deterministic contracts.
- no hidden execution.
- no autonomous live execution.

## D) Current Architecture Status

- Architectural baseline remains modular monolith + service-layer discipline (`SYSTEM.md`, `architecture.md`).
- GNR8 runtime/control-plane work lives primarily under `apps/platform/gnr8/runtime/**`.
- Migration/import/validation subsystems are active and contract-driven (`apps/platform/gnr8/migration/**`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/validation/**`).

## E) Current Provider-Control-Plane Status

Implemented control-plane layers include provider settings, credential references contract, provider selection/communicator, job planner/repository foundation, approval artifacts/transitions, execution handoff, and worker pickup readiness checks.
Readiness inspection now includes deterministic `workerPickupEvidence` projection from persisted `handoffArtifact`, read-only API inspection route, internal debug UI route, deployed superadmin readiness-test UI, admin seed API for deterministic persisted handoff creation/reuse, operator review intent persistence/creation surfaces, and deterministic governance snapshot surfacing.

Completed readiness inspection routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (read-only governance authorization)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (admin-only governance authorization intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate` (read-only execution readiness gate)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions` (read-only execution preconditions ledger)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan` (read-only execution blocker remediation planner)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan` (read-only dry-run planned jobs simulation evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview` (read-only execution job shape preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview` (read-only provider worker envelope preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest` (read-only no-execution boundary proof evidence)
- `GET /api/gnr8/admin/providers/openprovider/domains` (read-only Openprovider domain inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/dns` (read-only Openprovider DNS records inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>` (read-only Openprovider domain availability evidence)

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

Evidence and diagnostics milestone:
- Provider Contract Registry Extraction is deployed:
  - canonical registry file:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
  - canonical registry test:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`
  - current UI consumers:
    - `apps/platform/app/gnr8/admin/providers/page.tsx`
    - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
  - current providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - canonical contract fields:
    - `providerId`
    - `displayName`
    - `providerType`
    - `providerCategory`
    - `environment`
    - `status`
    - `capabilities`
    - `readiness`
    - `boundaries`
    - `advisor`
    - `links`
  - Openprovider links:
    - `cockpit`
    - `domains`
    - `dns`
  - provider capabilities are category-aware:
    - registrar: `domains`, `dns`, `availability`, `registration`, `execution`
    - deployment: `deployments`, `previews`, `rollbacks`, `domains`, `environment_variables`
    - communication: `email_delivery`, `transactional_email`, `inbound_email`, `domains`, `webhooks`
    - erp/accounting: `accounting`, `invoicing`, `bookkeeping`, `tax`, `synchronization`
    - edge infrastructure: `dns`, `edge_compute`, `object_storage`, `cdn`, `routing`
    - commerce: `billing`, `subscriptions`, `invoices`, `webhooks`, `checkout`
    - execution: `jobs`, `workflows`, `retries`, `schedules`, `events`
    - source control: `repositories`, `branches`, `pull_requests`, `webhooks`, `commits`
    - AI: `model_metadata`, `routing_policy`, `inference`, `embeddings`, `multimodal`
    - storage: `database`, `object_storage`, `backups`, `vector_search`, `file_storage`
    - identity: `auth`, `users`, `sessions`, `oauth`, `sso`
  - summary behavior:
    - `Read-only Capabilities` remains `3` (Openprovider operational reads only)
  - boundary remains explicit:
    - deterministic read-model registry
    - no runtime provider execution
    - no provider APIs added
    - no writes
    - no queue/worker execution
  - conclusion:
    - Provider Fleet is no longer backed by inline UI objects. It now consumes a canonical provider contract registry, creating the foundation for multi-provider orchestration.
  - strategic direction:
    - evolve Provider Fleet into global GNR8 provider control plane covering registrar/domain, DNS, deployment, communication, ERP/accounting, edge infrastructure, commerce/billing, execution/job, source control, AI, storage/data, and identity providers
  - recommended next milestone:
    - Global Provider Taxonomy Expansion
  - success criteria:
    - future thread bootstrap resumes from registry-backed provider fleet, not hardcoded UI provider definitions
- Provider Fleet Cockpit is deployed:
  - UI route: `/gnr8/admin/providers`
  - milestone scope:
    - UI/read-model only
    - deterministic seeded provider registry
    - no runtime/provider execution changes
  - providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - verified provider states:
    - Openprovider:
      - `status`: `connected`
      - `mode`: `sandbox`
      - capabilities:
        - `domains`: `true`
        - `dns`: `true`
        - `availability`: `true`
        - `registration`: `false`
        - `execution`: `false`
    - Realtime Register: `not_configured`
    - INWX: `not_configured`
    - Netim: `not_configured`
  - verified UI values:
    - `title`: `Provider Fleet Cockpit`
    - `subtitle`: `Global provider control plane`
    - `Providers`: `4`
    - `Connected`: `1`
    - `Read-only Capabilities`: `3`
    - `Execution`: `blocked`
  - boundary remains explicit:
    - read-only
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secrets
    - no action buttons
  - conclusion:
    - GNR8 now has the first provider-level control tower above individual provider integrations.
    - this is the beginning of multi-provider orchestration/readiness visibility.
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from global provider fleet cockpit milestone
- Provider Navigation Wiring is deployed:
  - completed navigation flow:
    - Agency Dashboard -> `/gnr8/admin/providers`
    - Provider Fleet Cockpit -> `/gnr8/admin/providers/openprovider`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/domains`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/dns`
  - changed UI files:
    - `app/gnr8/admin/agencies/[agencyId]/dashboard/page.tsx`
    - `app/gnr8/admin/providers/provider-fleet-view.tsx`
    - `app/gnr8/admin/providers/openprovider/openprovider-provider-cockpit-view.tsx`
  - verified UX:
    - Agency Dashboard includes Provider Fleet card
    - Openprovider is the only navigable provider row
    - Realtime Register, INWX, Netim remain non-linked / `not_configured`
    - Openprovider cockpit includes Provider Surfaces section
    - Provider Surfaces links to Domain Inventory and DNS Inventory
    - Availability remains embedded in Openprovider cockpit
  - boundary remains explicit:
    - UI/navigation only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret changes
  - conclusion:
    - provider features are no longer hidden behind manually typed admin URLs
    - GNR8 now has a navigable provider control-plane flow from agency dashboard into provider fleet, provider cockpit, and read-only provider surfaces
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from navigable Provider Control Plane UX
- Provider Capability Detail Cards / Readiness Explainer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - capability explainer coverage:
    - `domains`
    - `dns`
    - `availability`
    - `registration`
    - `execution`
  - explainer semantics:
    - capability name
    - current status
    - explanation
    - readiness level
  - readiness states:
    - `sandbox_verified`
    - `not_enabled`
    - `control_plane_only`
  - verified Openprovider guidance:
    - `availability`: working / `sandbox_verified`
    - `registration`: disabled / `not_enabled`
    - `execution`: blocked / `control_plane_only`
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes capability explanations and readiness semantics in the provider control-plane flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance milestone
- Provider Readiness Advisor Layer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - new section:
    - `Readiness Advisor`
  - advisor cards:
    - `Current State`
    - `Current Limitations`
    - `Missing Requirements`
    - `Recommended Next Step`
  - provider fleet guidance:
    - one provider connected
    - multi-provider registry initialized
    - provider fleet navigation operational
    - only Openprovider connected
    - no production execution providers
    - no orchestration layer
    - missing provider abstraction layer
    - missing execution governance
    - missing multi-provider failover
    - missing production verification
    - recommended: connect second provider, normalize provider capabilities, introduce provider orchestration contracts
  - Openprovider guidance:
    - availability intelligence operational
    - DNS inventory operational
    - domain inventory operational
    - sandbox verified
    - read-only boundary active
    - registration disabled
    - execution blocked
    - no provider writes
    - no live environment verification
    - missing execution orchestration
    - missing approval workflows
    - missing worker/provider execution layer
    - missing live provider verification
    - missing mutation safety review
    - recommended: verify live environment behavior, prepare provider execution architecture, add approval-driven registration flow
  - preserved UI:
    - availability search panel preserved
    - provider surfaces links preserved
    - capability cards preserved
    - read-only messaging preserved
  - boundary remains explicit:
    - UI/read-model only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
  - conclusion:
    - provider UX now includes operator guidance/readiness interpretation, not only raw diagnostics and statuses
  - recommended next milestone:
    - Provider Orchestration Contract Draft
    - or Second Provider Placeholder Readiness Contract
  - success criteria:
    - future thread bootstrap resumes from Provider Readiness Advisor milestone
- Openprovider Availability Search Panel is deployed:
  - route:
    - `/gnr8/admin/providers/openprovider`
  - search behavior:
    - GET-only form
    - action: `/gnr8/admin/providers/openprovider`
    - query param: `?domain=<domain>`
    - default fallback: `levi-testis.com`
  - verified behavior:
    - real Openprovider availability lookups operational
    - sandbox provider responses visible through cockpit UI
    - no registration/write paths introduced
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes real provider availability intelligence search inside cockpit flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance + availability search milestone
- Openprovider Domain Availability Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-domain-availability.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>`
  - env support:
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT`
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_METHOD`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domain`: `levi-testis.com`
    - `available`: `true`
    - `status`: `available`
    - `endpoint path`: `/v1beta/domains/check`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_AVAILABILITY_ENDPOINT_PATH:/v1beta/domains/check`
    - `OPENPROVIDER_AVAILABILITY_METHOD_POST`
    - `OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED`
    - `OPENPROVIDER_AVAILABILITY_STARTED`
    - `OPENPROVIDER_AVAILABILITY_SUCCEEDED`
  - conclusion:
    - GNR8 can now perform real Openprovider read-only domain availability checks.
    - this is the first directly user-facing provider intelligence capability: `is this domain available?`
  - boundary remains explicit:
    - read-only
    - no registration
    - no DNS writes
    - no domain update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Domain Availability Admin UI
    - or Provider Reality Dashboard linking Domains + DNS + Availability
  - success criteria:
    - future thread bootstrap resumes from working real Openprovider availability lookup
- Openprovider DNS Inventory Admin UI is deployed:
  - UI route: `/gnr8/admin/providers/openprovider/dns`
  - backing API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified UI values:
    - `title`: `Openprovider DNS Inventory`
    - `banner`: `Read-only provider boundary active`
    - `provider`: `openprovider`
    - `mode`: `read only`
    - `execution`: `blocked`
    - `domains`: `0`
    - `records`: `0`
    - `inventory status`: `empty`
    - `empty message`: `No DNS records found in current Openprovider sandbox account.`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 now has a real provider-read UI surface for Openprovider DNS inventory.
    - the current sandbox account has no domains, so DNS inventory is empty, but auth, read boundary, API, and UI rendering are verified end-to-end.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Sandbox Domain Fixture / Seed Real Test Domain
    - or Provider Reality Dashboard linking Domain Inventory + DNS Inventory
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS Inventory UI milestone
- Openprovider DNS Records Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domains`: `[]`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 can now authenticate against Openprovider sandbox and perform read-only DNS inventory access.
    - current sandbox has no domains, so DNS inventory is empty but successful.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Provider Reality UI: DNS Inventory Page
    - or Sandbox Domain Fixture / Seed Real Test Domain
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS read-only milestone
- Operator Evidence Provenance Layer is deployed:
  - Executive Summary includes visible provenance support
  - Evidence Sources chips are present for provenance cues
  - static source mapping approach is used
  - no runtime lineage engine
  - no API changes
  - no runtime changes
  - no execution controls
  - verified source mappings:
    - Current Situation: `Readiness`, `Safety Manifest`
    - Primary Blockers: `Execution Preconditions Ledger`, `Execution Readiness Gate`, `Execution Remediation Plan`
    - Verified Positives: `Governance Decision Package`, `Execution Preconditions Ledger`, `Safety Manifest`
  - recommended next step:
    - `Execution Remediation Plan`
  - conclusion:
    - operator can now answer `How do we know this?` using visible evidence provenance
  - boundary remains:
    - execution impossible
    - simulation only
    - no provider execution
    - no queue execution
    - no secret resolution
  - recommended next milestone:
    - Operator Cockpit Completion / UI Freeze Candidate
  - success criteria:
    - future thread bootstrap resumes from provenance-enabled cockpit milestone
- Operator Cockpit Evidence Status Badges / Severity System is deployed:
  - badge severity levels: `critical`, `warning`, `success`, `info`, `neutral`
  - verified counters: `Critical: 8`, `Warnings: 4`, `Success: 8`
  - verified top cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - verified sticky banner: `Execution impossible. Control-plane simulation only.`
  - verified grouping: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - UI/read-model only, no runtime changes, no API changes, no behavior changes
  - no execution controls added
  - milestone note: some badge chips currently render as a compact raw evidence strip below counters; acceptable for this milestone and may be refined later
  - execution boundary remains explicit:
    - no provider execution
    - no sandbox execution
    - no DNS writes
    - no Openprovider/registrar calls
    - no queue/Inngest/worker execution
    - no secret resolution
  - conclusion:
    - operator can now identify execution risk, readiness state, governance state, and safety state quickly through counters and visual badges
  - recommended next milestone:
    - Operator Cockpit Compact Evidence Strip / Visual Polish Pass
    - still no execution
- Evidence Surface Consolidation / Operator Cockpit Layout Pass is deployed:
  - readiness page reorganized from linear debug layout into operator-oriented cockpit layout
  - sticky summary banner: `Execution impossible. Control-plane simulation only.`
  - top summary cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - grouped sections: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - default-collapsed sections: `Timelines`, `Diagnostics`, `Payload JSON Blocks`
  - UI/read-model only, no runtime model changes, no API changes, no behavior changes
  - all evidence artifacts preserved
  - no execution controls added
  - execution remains impossible
- seed creates/reuses deterministic persisted handoff
- readiness page shows persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`
- `workerPickupEvidence.blockedReasons` is normalized with no contradictory approval/handoff/planned-job reasons; reasons are deterministic and operator-readable
- operator review persistence exists via `gnr8_runtime_provider_operator_reviews`
- reviews API returns deterministic `reviewSummary` in `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`
- governance snapshot model exists: `runtime-provider-governance-snapshot.ts`
- governance snapshot combines: handoff readiness, `workerPickupEvidence`, operator `reviewSummary`, diagnostics
- governance snapshot fields: `snapshotId`, `handoffId`, `correlationKey`, `readinessStatus`, `executionBlocked: true`, `workerPickupEvidence`, `reviewSummary`, `diagnostics`, `createdAt`
- governance snapshot persistence table exists: `gnr8_runtime_provider_governance_snapshots`
- governance authorization model exists: `runtime-provider-governance-authorization.ts`
- governance authorization persistence table exists: `gnr8_runtime_provider_governance_authorizations`
- readiness API includes `governanceSnapshot`
- governance timeline API exists: `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline`
- readiness UI displays Governance Snapshot section
- readiness UI displays Governance Timeline section
- readiness UI displays Authorization section
- readiness UI displays Dry-run Job Plan section
- readiness UI displays Execution Job Preview section
- readiness UI displays Provider Worker Envelope Preview section
- readiness UI displays Provider Execution Safety Manifest section
- readiness UI displays Execution Readiness Gate section
- readiness UI displays Execution Preconditions Ledger section
- readiness UI displays Execution Remediation Plan section
- runtime dry-run job plan model exists: `runtime-provider-dryrun-job-plan.ts`
- runtime execution job preview model exists: `runtime-provider-execution-job-preview.ts`
- runtime provider worker envelope preview model exists: `runtime-provider-worker-envelope-preview.ts`
- runtime provider execution safety manifest model exists: `runtime-provider-execution-safety-manifest.ts`
- provider execution safety manifest verified deployed values:
  - `overallStatus`: `execution_impossible`
  - `summary`: `Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.`
  - diagnostics include:
    - `EXECUTION_SAFETY_BOUNDARY_PROVEN`
    - `EXECUTION_SAFETY_MANIFEST_CREATED`
- provider execution safety manifest verified barriers:
  - `governance_boundary_active`
  - `worker_dispatch_disabled`
  - `queue_allocation_disabled`
  - `provider_execution_disabled`
  - `secret_resolution_disabled`
  - `runtime_execution_boundary_active`
- provider execution safety manifest critical distinction:
  - safety manifest proves no-execution boundary
  - governance remains advisory
  - worker dispatch is disabled
  - queue allocation is disabled
  - provider execution is disabled
  - credential/secret resolution remains disabled
  - runtime remains simulation-only
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- UI note:
  - secret-related barrier IDs may be redacted because generic redaction treats `secret` as sensitive
  - this is safe and non-blocking
- dry-run job plan verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 simulated provider jobs generated for readiness evidence.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `status`: `simulated`
    - `reason`: `Deterministic simulation for operationKind=upsert_dns_record; execution remains disabled.`
- dry-run job plan is simulated evidence only:
  - no persisted execution jobs are created
  - `plannedJobIds` are not changed
  - no workers are enqueued
  - no provider calls are made
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- execution job preview verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 execution job preview artifact(s) generated; execution remains disabled.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `queueTarget`: `provider-control-plane`
    - `workerTarget`: `provider-execution-worker`
    - `simulatedStatus`: `preview_only`
    - `payloadShape` includes:
      - `providerId`: `openprovider`
      - `operationKind`: `upsert_dns_record`
      - `siteId`: `dev_readiness_seed_site`
      - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
      - `correlationKey`: `eed1514dcd76dcd5a14f7d07c59b982b550e18558090d5ee7eadb7e3ccecbd6a`
  - diagnostics include:
    - `EXECUTION_JOB_PREVIEW_INTENT_ONLY`
    - `EXECUTION_JOB_PREVIEW_JOB_CREATED`
- execution job preview is evidence only:
  - no persisted execution jobs are created
  - no `plannedJobIds` are changed
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider calls occur
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- provider worker envelope preview verified deployed values:
  - `summary`: `Deterministic provider worker envelope preview generated; execution remains disabled.`
  - `queueTarget`: `provider-control-plane`
  - `workerTarget`: `provider-execution-worker`
  - `payloadVersion`: `v1`
  - `executionIntent`: `control_plane_simulation_only`
  - `executionBlocked`: `true`
  - `executionAllowed`: `false`
  - `providerId`: `openprovider`
  - `operationKind`: `upsert_dns_record`
  - `environment`: `sandbox`
  - `siteId`: `dev_readiness_seed_site`
  - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
  - diagnostics include:
    - `PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY`
- provider worker envelope preview is evidence only:
  - worker envelope is preview/evidence only
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider execution occurs
  - no payload is sent to a runtime worker
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- governance authorization statuses:
  - `not_requested`
  - `pending_authorization`
  - `authorized_for_future_execution`
  - `denied`
- readiness UI keeps detailed operator review list visible
- readiness UI includes create operator review form with:
  - status dropdown values: `pending_review`, `approved_for_future_execution`, `rejected`, `needs_changes`
  - reason textarea
  - Save review intent action
- diagnostics include:
  - `GOVERNANCE_SNAPSHOT_CREATED`
  - `GOVERNANCE_SNAPSHOT_REUSED`
  - `GOVERNANCE_SNAPSHOT_AUDIT_READ`
  - `GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED`
- `approved_for_future_execution` is intent-only; it does not authorize execution
- `authorized_for_future_execution` is intent-only; it does not authorize execution
- `executionBlocked` remains `true`
- governance snapshot is evidence only
- execution readiness gate verified values:
  - `gateStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `blockingReasons`:
    - `approval_status_blocked`
    - `global_execution_boundary_active`
    - `handoff_status_blocked`
    - `no_planned_jobs`
- execution preconditions ledger verified values:
  - `overallStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `missingRequirements`:
    - `execution_planned_jobs_present:missing`
  - `blockedRequirements`:
    - `approval_status_not_blocked:blocked`
    - `execution_handoff_status_not_blocked:blocked`
- execution remediation plan verified values:
  - `overallStatus`: `blocked`
  - `summary`: `Execution remains blocked because 4 remediation actions are still unresolved.`
  - `diagnostics`:
    - `EXECUTION_REMEDIATION_ACTIONS_GENERATED`
    - `EXECUTION_REMEDIATION_INTENT_ONLY`
    - `EXECUTION_REMEDIATION_PLAN_CREATED`
  - `remediationActions`:
    1. `critical` / `ledger`
       - `reason`: `Approval status is blocked.`
       - `recommendedAction`: `Review approval workflow before execution eligibility can be evaluated.`
    2. `high` / `ledger`
       - `reason`: `No planned jobs are present.`
       - `recommendedAction`: `Create deterministic planned jobs before execution readiness evaluation.`
    3. `critical` / `handoff`
       - `reason`: `Handoff status is blocked.`
       - `recommendedAction`: `Resolve handoff blockers and regenerate readiness evidence.`
    4. `normal` / `gate`
       - `reason`: `Global execution boundary is active.`
       - `recommendedAction`: `Execution boundary intentionally active. No action required.`
- governance conditions satisfied/passed while execution remained blocked:
  - `review_approved_for_future_execution`: satisfied/passed
  - `authorization_authorized_for_future_execution`: satisfied/passed
- conclusion:
  - governance intent can be satisfied while execution readiness remains blocked
  - GNR8 can now explain not only why execution is blocked, but what remediation steps remain before future execution could ever become possible.

Deployed manual verification loop (completed):
- readiness-test UI creates/reuses deterministic handoff
- readiness inspection loads `handoffArtifact`
- `workerPickupEvidence` is displayed
- operator review form creates persisted review intent
- authorization form creates persisted authorization intent
- governance snapshot updated after authorization/review state changed
- governance timeline contains multiple snapshots
- operator review summary displays persisted review state
- Governance Snapshot is displayed
- Governance Timeline is displayed
- Governance Decision Package is displayed
- Governance Timeline verified fields:
  - `snapshotId`
  - `createdAt`
  - `reviewSummaryStatus`
  - `reviewCount`
  - `readinessStatus`
  - `diagnostics`
- `executionBlocked` remains `true`

Governance Decision Package milestone verification:
- verified deployed flow:
  - readiness
  - operator review summary
  - governance authorization
  - governance snapshot
  - governance timeline
  - governance decision package
- verified values:
  - `recommendedAction`: `remain_blocked`
  - `executionBlocked`: `true`
  - `reviewStatus`: `approved_for_future_execution`
  - `authorizationStatus`: `authorized_for_future_execution`
  - `snapshotCount`: `3`
- boundary reminder:
  - decision package remains advisory only
  - execution remains blocked

Example verified values:
- `authorizationStatus`: `authorized_for_future_execution`
- `authorizationReason`: `1234`
- `intentOnly`: `true`
- `executionBlocked`: `true`
- diagnostics include:
  - `GOVERNANCE_AUTHORIZATION_CREATED`
  - `GOVERNANCE_AUTHORIZATION_INTENT_ONLY`

Future note:
- deterministic `createdAt` may show epoch values for dev-seed artifacts
- potential future improvement: add `snapshotCreatedAt` and `persistedAt`
- recommended next milestone: Operator Cockpit Compact Evidence Strip / Visual Polish Pass (still no execution)

Hard boundaries remain:
- no live provider execution
- no sandbox execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no queue/Inngest execution for provider handoff readiness inspection
- no queue/Inngest/worker execution
- no external registrar calls
- no secret reads/stores
- no secret resolution
- no persisted execution job creation from dry-run job plan
- no `plannedJobIds` mutation from dry-run job plan
- no persisted execution job creation from execution job preview
- no `plannedJobIds` mutation from execution job preview
- no queue record allocation from execution job preview
- no worker dispatch from execution job preview
- no queue record allocation from worker envelope preview
- no worker dispatch from worker envelope preview
- no provider execution from worker envelope preview
- no runtime worker payload send from worker envelope preview
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## F) Current Active Implementation Phase

Active phase: Phase 8A-2 — Dry Run Simulation Planning Contract is complete.

Phase 7F importer architecture evolution is complete through 7F-15:
- Evidence Capture captures source-site evidence as a browser/user sees it.
- Original Mirror provides a read-only, non-semantic, non-AI preview/archive labeled `Original Mirror Preview`.
- Reconstruction is the future GNR8-native editable output layer labeled `GNR8 Reconstruction Preview` when implemented.
- Evidence Capture is the foundation for future Reconstruction.
- Raw preview remains useful for route-level inspection and Original Mirror behavior.
- Chrome / Playwright is the primary capture provider.
- Servo is research only.
- No reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, or reconstruction publishing exists yet.

Original Mirror Fidelity surface is complete:
- read-model projection: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`
- workspace threading: `apps/platform/gnr8/site/site-workspace-read-model.ts`
- operator UI: Site Workspace overview section titled `Original Mirror Fidelity`
- documentation: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`
- projection source: persisted `evidence_capture_baseline` only
- surfaced summary: capture status, coverage status, supported/partial/missing evidence counts and percentages
- surfaced badge: `HIGH` at supported >= 70 percent, `MEDIUM` at supported >= 40 percent, `LOW` below 40 percent
- readiness states: `READY`, `PARTIAL`, `NOT_READY`
- readiness boundary: `NOT_READY` when artifact is missing, rendered capture is missing, or blocker limitations are present
- limitation categories: Capture, Styles, Layout, Runtime, Assets, Maps / Widgets
- route-level fidelity support: displayed only when route-specific known fidelity limitations already exist in the persisted artifact
- behavior boundary: no capture/importer/provider/Playwright/preview/reconstruction/route-discovery/asset/script/persistence/public-rendering changes

Reconstruction Readiness surface is complete:
- read-model projection: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`
- evaluator: `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts`
- input normalizer: `apps/platform/gnr8/architecture/reconstruction-input-normalizer.ts`
- operator UI: Site Workspace overview section titled `Reconstruction Readiness`
- readiness levels: `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, `HIGH_CONFIDENCE`
- behavior boundary: read-only projection only; no reconstruction execution or approval

Reconstruction Planning Gate is complete:
- planning contract: `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md`
- eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible
- review states: `pending`, `approved`, `rejected`, `needs_more_evidence`
- confidence states: `LOW`, `MEDIUM`, `HIGH`
- behavior boundary: metadata-only planning contract; no candidate discovery, generation, worker, approval execution, persistence, or publishing

Reconstruction Candidate Discovery Contract is complete:
- discovery contract: `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md`
- eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible
- discovery statuses: `not_started`, `contract_only`, `discovery_ready`, `discovery_complete`
- current discovery status: `contract_only`
- confidence states: `LOW`, `MEDIUM`, `HIGH`
- behavior boundary: metadata-only discovery contract; no candidate generation, semantic extraction, worker, approval execution, persistence, reconstruction execution, or publishing

Reconstruction Candidate Review Contract is complete:
- review contract: `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md`
- eligibility: `discovery_complete` with `candidateCount > 0` is eligible for human review
- not eligible: `not_started`, `contract_only`, `discovery_ready`, and completed discovery with zero candidates
- review decisions: `approved`, `rejected`, `needs_more_evidence`, `defer`, `unsupported`
- package statuses: `pending`, `partially_reviewed`, `approved`, `rejected`, `needs_more_evidence`
- behavior boundary: metadata-only review contract; no candidate review execution, review persistence, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, or publishing

Reconstruction Package Contract is complete:
- package contract: `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`
- reconstruction intents: `recreate_as_native_block`, `preserve_as_embed`, `preserve_as_external_widget`, `convert_to_runtime_provider`, `defer`, `unsupported`
- package statuses: `draft`, `ready_for_reconstruction`, `needs_more_evidence`, `blocked`, `archived`
- execution readiness: `not_ready`, `ready_for_dry_run`, `ready_for_future_execution`
- builder behavior: approved review items become approved candidates; deferred and unsupported decisions are separated; rejected decisions are excluded from candidate buckets but counted in limitations/notes; `needs_more_evidence` forces package status `needs_more_evidence`
- behavior boundary: metadata-only package contract; no dry-run execution, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, persistence, or publishing

Reconstruction Dry Run Boundary is complete:
- dry-run contract: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`
- dry-run statuses: `not_started`, `planned`, `simulation_ready`, `simulated`, `blocked`
- simulation statuses: `unavailable`, `pending`, `complete`, `failed`
- simulation plan statuses: `not_started`, `planned`, `blocked`
- generated output types: `route_model`, `section_model`, `block_model`, `content_model`, `design_token_model`, `navigation_model`, `unknown`
- eligibility: `ready_for_dry_run` is eligible; `not_ready`, `needs_more_evidence`, and `blocked` are not eligible
- package creation: ready packages become planned/pending with no outputs or blockers; not-ready packages become blocked/unavailable with blockers
- validation: required IDs, route scope, empty generated outputs, empty simulation artifacts, blocked-package blockers, non-simulated status, non-complete simulation status, and future approval gating
- simulation plan creation: planned dry runs become planned Simulation Plans with deterministic steps; blocked dry runs become blocked Simulation Plans with blockers
- simulation plan validation: required IDs, route scope, planned steps for planned plans, blockers for blocked plans, planning-only statuses, planned descriptor outputs, no generated output shapes, and no simulation artifacts
- behavior boundary: metadata-only dry-run boundary, validation, and simulation planning; no simulation execution, dry-run execution, reconstruction execution, AI generation, React/block generation, workers, persistence, runtime writes, domain/DNS changes, or publishing
- simulation readiness review: Phase 8A-3 completed with Dry Run Readiness score 58/100 and led to Phase 8A-4 Capture Expansion For First Dry Run
- capture expansion for first Dry Run: Phase 8A-4 completed contract-only layout geometry, section boundary, navigation, and runtime mutation evidence shapes
- dry-run readiness re-assessment: Phase 8A-5 completed with conceptual readiness 68/100, execution readiness 58/100, and recommended Phase 8A-6 Layout Geometry Capture first
- layout geometry capture: Phase 8A-6 completed deterministic rendered major-region geometry capture, baseline persistence, read-model summary, and readiness integration; recommended next milestone Phase 8A-7 Dry Run Readiness Re-Assessment
- post-geometry dry-run readiness re-assessment: Phase 8A-7 completed with conceptual readiness 72/100, execution readiness 63/100, route model feasible, section model improved but still risky, and recommended Phase 8A-8 Section Boundary Capture
- section boundary capture: Phase 8A-8 completed deterministic section evidence classification, baseline artifact persistence, summary-only read model, and readiness integration; recommended next milestone Phase 8A-9 Dry Run Readiness Re-Assessment
- post-section-boundary dry-run readiness re-assessment: Phase 8A-9 completed with conceptual readiness 77/100, execution readiness 68/100, route model feasible, section model feasible, navigation model risky, block model not_ready, design token model not_ready, and recommended Phase 8A-10 Navigation Capture
- navigation capture: Phase 8A-10 completed deterministic navigation extraction, baseline artifact persistence, summary-only read model, and readiness integration; recommended next milestone Phase 8A-11 Dry Run Readiness Re-Assessment
- first limited dry-run design: Phase 8B-0 completed documentation-only scope for Route Model, Navigation Model, and Section Model only; recommended next milestone Phase 8B-1 First Limited Dry Run Contract
- first limited dry-run contract: Phase 8B-1 completed TypeScript contracts for `FirstLimitedDryRunOutput`, `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`; recommended next milestone Phase 8B-2 First Limited Dry Run Builder Design
- first limited dry-run builder design: Phase 8B-2 completed deterministic mapping design for Route, Navigation, and Section Models only; recommended next milestone Phase 8B-3 First Limited Dry Run Builder Implementation
- first limited dry-run builder implementation: Phase 8B-3 completed `buildFirstLimitedDryRunOutput(...)` for deterministic Route, Navigation, and Section Models from existing evidence only; recommended next milestone Phase 8B-4 First Limited Dry Run Builder Re-Assessment
- first limited dry-run builder re-assessment: Phase 8B-4 completed post-builder reassessment with conceptual readiness 86/100, execution readiness 77/100, and recommended next milestone Phase 8B-5 First Limited Dry Run Output Persistence
- first limited dry-run output persistence: Phase 8B-5 completed durable provenance artifact persistence and latest-output readback for validated `FirstLimitedDryRunOutput`; recommended next milestone Phase 8B-6 Admin-Only First Limited Dry Run Trigger Design
- first limited dry-run trigger design: Phase 8B-6 completed superadmin-only trigger boundary design, request/response contract, deterministic failures, idempotency, and auditability; recommended next milestone Phase 8B-7 Admin-Only First Limited Dry Run Trigger Implementation
- first limited dry-run trigger implementation: Phase 8B-7 completed the superadmin-only POST API trigger, metadata-only response, validation-before-persistence, and idempotent latest-artifact reuse; recommended next milestone Phase 8B-8 Admin Trigger Re-Assessment / Read-Only Surface Design
- first limited dry-run surface design: Phase 8B-8 completed post-trigger reassessment and designed the read-only operator surface for persisted First Limited Dry Run outputs; recommended next milestone Phase 8B-9 Read-Only First Limited Dry Run Surface Implementation
- first limited dry-run surface implementation: Phase 8B-9 completed the dedicated read-only superadmin page and defensive persisted-output projection; recommended next milestone Phase 8B-10 First Limited Dry Run End-to-End Admin Verification
- first limited dry-run end-to-end admin verification: Phase 8B-10 completed focused verification that the superadmin trigger creates or reuses a persisted output, latest readback loads it, the read-only surface projection/page can inspect it, idempotency works for equivalent and changed evidence inputs, and forbidden actions/outputs remain absent; recommended next milestone Phase 8B-11 First Limited Dry Run Re-Assessment / Next Safe Boundary
- first limited dry-run reassessment: Phase 8B-11 completed the next safe boundary decision, compared UI trigger, approval/readiness marker, runtime mutation capture, real-site operational test, and candidate discovery implementation, and recommended Phase 8B-12 First Real-Site Limited Dry Run Operational Test
- first real-site limited dry-run operational test: Phase 8B-12 completed a read-only real-site preflight against `https://www.odv-cvijanovic.si/`; the phase failed at preflight because checked runtime data had no qualifying real imported site version with the required Evidence Capture baseline, layout geometry, section evidence, navigation evidence, and `ReconstructionDryRunPackage`; Phase 8B-12F completed the follow-up production readiness inventory and Phase 8B-12G completed the production Evidence Capture worker readiness root-cause audit
- reconstruction readiness inventory audit: Phase 8B-12F completed a read-only production inventory of all `14` imported runtime site versions; all `14` classify as `NO_EVIDENCE_CAPTURE`, all lack the baseline/package chain required for Limited Dry Run, and the dominant blocker is production rendered Evidence Capture/worker readiness
- production Evidence Capture worker readiness root-cause audit: Phase 8B-12G completed a read-only audit of worker config, deployment assumptions, and persisted diagnostics; primary root cause is platform/worker readiness before usable rendered capture, with the next recommended phase Phase 8B-12H Production Evidence Capture Worker Readiness Fix
- rendered capture raw import source fallback: Phase 8B-12K-F2 completed the source-resolution fix for existing imported siteVersions; rendered capture now falls back from missing local `/tmp` provenance paths to durable `raw_imported_site` artifact HTML bytes, with the next recommended phase Phase 8B-12K-Retry Rendered Capture Smoke Test On Existing SiteVersion

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Documentation Discipline

Rules:
- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- If a document is historical, mark or index it as secondary/archive.
- Baseline/checkpoint docs are evidence, not the primary doctrine.
- When current state changes, update `docs/ai/GNR8_CURRENT_STATE.md` and relevant baseline/checkpoint docs.

## Ready-to-Copy Prompt

"Read these files first in this exact order: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_COLLABORATION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Read docs/ai/GNR8_COLLABORATION_PROTOCOL.md before generating Codex tasks. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact."
