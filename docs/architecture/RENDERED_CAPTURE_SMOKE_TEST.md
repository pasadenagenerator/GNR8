# Rendered Capture Smoke Test

## Scope

Phase 8B-12K ran a one-site rendered capture smoke test against one existing imported runtime site version.

This phase did not modify code, schema, importer behavior, preview behavior, dry-run behavior, reconstruction, AI, publishing, or worker code.

## Target Site

| Field | Value |
| --- | --- |
| siteVersionId | `90b3abf8-7a4c-41b5-af05-244642d1962d` |
| runtime siteId | `site_aaa6d44109a38b5d083f` |
| ownership siteId | `067e3aa9-773c-4d5d-ba2b-a138761a6354` |
| sourceUrl | `https://www.odv-cvijanovic.si/` |
| version_no | `1` |
| state | `DRAFT` |

## Preflight

Read-only production DB preflight against `public.gnr8_runtime_site_versions.import_provenance_summary` showed:

| Check | Result |
| --- | --- |
| `renderedCaptureStatus` | `failed` |
| `renderedDomQuality` | `unusable` |
| `sourceMode` | `raw_html_fallback` |
| screenshots count | `0` |
| computed style samples count | `0` |
| `evidenceCaptureBaselineArtifact` exists | no |
| layout geometry exists | no |
| section evidence exists | no |
| navigation evidence exists | no |

Previous capture job state:

| Field | Value |
| --- | --- |
| jobId | `client-site-import-1781168573242-job` |
| status | `failed_transient` |
| failureClass | `transient` |
| failureCode | `WORKER_UNAVAILABLE` |
| workerHealth.status | `unreachable` |
| workerHealth.reason | `worker_http_error` |
| rendered capture failureCode | `RENDERED_CAPTURE_UNAVAILABLE` |

Preflight also found that the target version's persisted source evidence paths point at `/tmp/gnr8/validation/url-import-snapshots/...`, but the local source files were not present in this execution environment.

## Capture Attempt Method

Capture attempt used the existing worker-side rendered capture path for an existing runtime site version:

`runSiteRenderCapture({ siteId: "067e3aa9-773c-4d5d-ba2b-a138761a6354", siteVersionId: "90b3abf8-7a4c-41b5-af05-244642d1962d" })`

The service was run with the production DB environment loaded and `NODE_OPTIONS='--conditions=react-server'`, matching the repo's server-side worker test condition. No new route, job system, schema, importer behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or worker code was added or modified.

## Result

FAIL.

The existing rendered capture path failed before it could call the rendered-capture worker:

```json
{
  "code": "SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND",
  "message": "Rendered capture source entry HTML could not be resolved for runtime site version."
}
```

The failure is not evidence that the now-ready rendered-capture worker cannot capture the live site. The smoke test did not reach the worker because the existing siteVersion's capture service source resolution depends on persisted local snapshot paths, and those `/tmp/...` source files are no longer available in this execution environment.

## Post-Attempt Verification

Post-attempt production DB verification showed no state change:

| Check | Result |
| --- | --- |
| `renderedCaptureStatus` | `failed` |
| `renderedDomQuality` | `unusable` |
| `sourceMode` | `raw_html_fallback` |
| screenshots count | `0` |
| computed style samples count | `0` |
| `evidenceCaptureBaselineArtifact` exists | no |
| layout geometry exists | no |
| section evidence exists | no |
| navigation evidence exists | no |

Diagnostics remained the prior import/capture diagnostics, including:

- `CAPTURE_JOB_FAILED_TRANSIENT`
- `CAPTURE_WORKER_HEALTH_UNAVAILABLE`
- `CAPTURE_WORKER_HTTP_ERROR`
- `CAPTURE_WORKER_REQUEST_FAILED`
- `CAPTURE_WORKER_UNAVAILABLE`
- `RENDERED_CAPTURE_FAILED`
- `RENDERED_CAPTURE_UNAVAILABLE`
- `RAW_HTML_FALLBACK_USED`
- `RENDERED_DOM_REQUIRED_BUT_UNAVAILABLE`

## Pass/Fail

FAIL for Phase 8B-12K.

The bounded one-site capture attempt was executed through the existing rendered capture service, but it could not resolve source HTML from the existing siteVersion's persisted `/tmp/...` paths and therefore produced no Evidence Capture baseline artifacts.

## Next Recommended Phase

Phase 8B-12K-F1 completed the failure analysis, and Phase 8B-12K-F2 implemented the rendered capture source-resolution fallback.

Current source resolution order after F2:

1. Existing local provenance file path, if present.
2. Durable `raw_imported_site` artifact HTML from persisted `content_bytes`.
3. `SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND`.

The F2 fallback does not refetch the original URL, mutate raw artifacts, create raw artifacts, change importer or preview behavior, or run capture by itself.

Recommended next phase: **8B-12K-Retry Rendered Capture Smoke Test On Existing SiteVersion**.

Retry focus:

- retry the same one-site rendered capture smoke test only with explicit authorization
- verify the source resolver uses the durable raw import HTML when `/tmp` provenance paths are gone
- verify whether the request now reaches the rendered-capture worker
- do not run Limited Dry Run, reconstruction, imports, AI, React/block generation, publishing, or unrelated artifact generation in the retry phase

## 8B-12K-Retry Result

Phase 8B-12K-Retry reran the one-site rendered capture smoke test against the same existing imported runtime site version after the raw import artifact source-resolution fallback was available.

No new route, worker job system, importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema change was made. No Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, or publishing artifact was created.

### Retry Preflight

| Check | Result |
| --- | --- |
| production admin readiness endpoint | reachable but not readable from this unauthenticated shell; `GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness` returned `401 Unauthorized` |
| in-app browser readiness check | blocked before load with `net::ERR_BLOCKED_BY_CLIENT` |
| local retry process worker env | `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` missing; `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` missing |
| old local `/tmp` entry HTML | absent |
| old local `/tmp` selected source HTML | absent |
| durable `raw_imported_site` artifact | exists: `6f0829d5-a481-4722-b9e1-1b999e65e4b7` |
| durable root HTML bytes | exists: `index.html`, `text/html; charset=utf-8`, `29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861` |
| durable artifact file count | `351` |
| pre-retry `evidenceCaptureBaselineArtifact` | absent |

The durable raw import artifact metadata still identifies `sourceUrl = https://www.odv-cvijanovic.si/`, `finalUrl = https://www.odv-cvijanovic.si/`, `htmlByteLength = 29849`, `persistedAssetCount = 351`, and `externalFallbackAssetCount = 0`.

### Retry Method

The retry used the existing worker-side rendered capture service path:

`runSiteRenderCapture({ siteId: "067e3aa9-773c-4d5d-ba2b-a138761a6354", siteVersionId: "90b3abf8-7a4c-41b5-af05-244642d1962d" })`

### Source Resolution Diagnostics

Source resolution passed.

Diagnostics emitted:

- `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`
- `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`

The service rehydrated the selected durable raw import HTML to:

`/var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8/rendered-capture-source-rehydration/90b3abf8-7a4c-41b5-af05-244642d1962d/6f0829d5-a481-4722-b9e1-1b999e65e4b7/index.html`

### Worker Reachability Diagnostics

Worker execution did not reach a configured rendered-capture worker from this local retry process.

The retry process resolved worker client config with:

| Field | Result |
| --- | --- |
| enabled | `true` |
| base URL present | `false` |
| shared token present | `false` |
| worker status | `unavailable` |
| failure reason | `CAPTURE_WORKER_NOT_CONFIGURED` |

Worker diagnostics:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
- `CAPTURE_WORKER_URL_RESOLVED`
- `CAPTURE_WORKER_NOT_CONFIGURED`
- `CAPTURE_WORKER_UNAVAILABLE`
- `RENDERED_CAPTURE_UNAVAILABLE`

No `CAPTURE_WORKER_HTTP_REQUEST_SENT` or `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED` diagnostic was produced by this retry attempt, because the local process had no worker base URL or shared token to send a request.

### Capture Result

| Check | Result |
| --- | --- |
| `renderedCaptureStatus` | `failed` |
| `renderedDomQuality` | `unusable` |
| `sourceMode` | `raw_html_fallback` |
| `hasUsableEvidence` | `false` |
| failure reason | `CAPTURE_WORKER_NOT_CONFIGURED` |
| screenshots count | `0` |
| computed style samples count | `0` |
| rendered DOM path exists locally | yes, but empty |
| computed styles path exists locally | yes, but empty |
| layout geometry file path exists locally | yes, but contains `0` captured regions |

### Evidence Artifact Result

Post-retry production DB verification:

| Check | Result |
| --- | --- |
| `evidenceCaptureBaselineArtifact` exists | yes |
| baseline kind | `evidence_capture_baseline` |
| layout geometry exists | no usable layout geometry; count `0` |
| section evidence exists | no; count `0` |
| navigation evidence exists | no; count `0` |
| screenshots count | `0` |
| computed style samples count | `0` |

The retry therefore created/persisted a baseline-shaped evidence artifact record, but it is not a passing Evidence Capture baseline because it contains no usable rendered evidence and no capture-expansion evidence.

### Retry Pass/Fail

FAIL.

PASS criteria were not met:

- worker reached: no
- `renderedCaptureStatus` not failed: no
- baseline artifact exists: yes
- layout geometry exists: no
- section evidence exists: no
- navigation evidence exists: no

### Failure Classification

Classification: **B. worker not reached**.

More specific subtype: worker client not configured in the local retry execution context. The source rehydration fallback worked; the failure occurred after source resolution and before any worker HTTP request could be sent.

This retry does not disprove the production readiness statement. It shows that the current shell used for the retry did not have the production rendered-capture worker base URL or shared token available, and the production admin readiness endpoint could not be read from the unauthenticated shell.

### Next Recommendation

Recommended next phase: **8B-12K-Retry-F1 Production Worker Config Injection/Authenticated Readiness Verification**.

The next phase should supply the same rendered-capture worker env used by production, or invoke the already authenticated production readiness/capture context, then rerun this exact one-site smoke test. Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, or unrelated artifact generation in that phase.

## 8B-12K-Retry-F1 Operational Config Finding

Phase 8B-12K-Retry-F1 audited how to run the next rendered capture smoke retry with rendered-capture worker configuration available, without changing code or exposing secrets.

This phase did not retry capture. It did not run Limited Dry Run, reconstruction, imports, repair jobs, migrations, AI, React/block generation, publishing, worker jobs, or capture POSTs. It did not create FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, or new Evidence Capture artifacts.

### Operational Mode Audit

| Mode | Safety | Secret exposure risk | Implementation cost | Repeatability | Production parity | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| A. Production admin route / server-side action with env already present | Medium to high if an existing bounded server action exists; otherwise not appropriate for this phase | Low for worker secret because it remains in production env | Medium to high if a new route/action is needed | High once implemented | Highest | Not recommended for F2 because no existing bounded retry route was identified and new code would expand the surface area. |
| B. Local shell with explicit env injection | High when scoped to the existing one-site retry command and run with no shell tracing | Medium unless the token is supplied from a secure local secret source and never printed | Low | High for repeated operator smoke retries | Good when production DB env plus production worker base URL/token are injected | Recommended. It needs no new code and directly fixes the F1 failure class. |
| C. Vercel CLI env pull into local `.env` file | Medium; easy to reproduce but copies production secrets to disk | Medium to high because the token persists in a local file unless tightly controlled | Low | High | Good if pulled from the exact Production project/environment | Not recommended as the default because persistent local secret files increase handling risk. Only acceptable if the file is gitignored, access-controlled, and deleted after use. |
| D. Dedicated superadmin-only smoke endpoint | Potentially high with strong guardrails, but it would be an execution endpoint | Low for worker secret, higher operational blast radius because it can trigger capture | High | High | Highest | Not recommended for F2 because it requires new code and a new execution surface. |

### Recommended Mode

Recommended mode: **B. local shell with explicit env injection**.

Rationale:

- It requires no new route, endpoint, action, schema, queue, worker, or admin UI.
- It preserves the exact existing retry path that failed with `CAPTURE_WORKER_NOT_CONFIGURED`.
- It lets the next phase inject only the missing worker config while keeping the target site, source rehydration path, and retry harness unchanged.
- It avoids committing or persisting the shared token when the token is supplied at execution time from a secure local secret source.

Mode C is the fallback only if the operator cannot provide the token safely at execution time. If C is used, the pulled env file must be gitignored, must not be pasted into reports, and should be removed after the retry.

### Authenticated Readiness Verification Method

Authenticated superadmin call path:

1. Sign in to `https://app.pasadenagenerator.com` as a superadmin.
2. Open:

```http
GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness
```

3. Record only non-secret response fields:
   - `ok`
   - `enabled`
   - `configured`
   - `baseUrlPresent`
   - `path`
   - `healthPath`
   - `sharedTokenConfigured`
   - `timeoutMs`
   - `healthStatus`
   - `healthHttpStatus`
   - `diagnostics`
4. Do not copy cookies, session headers, Authorization headers, or token values into docs or terminal reports.

Equivalent same-origin browser console shape after signing in as superadmin:

```js
await fetch("/api/gnr8/admin/rendered-capture-worker/readiness", {
  credentials: "include",
  cache: "no-store",
}).then((response) => response.json())
```

F1 production boundary check from this shell:

| Check | Result |
| --- | --- |
| unauthenticated production call | `401 Unauthorized` |
| unauthenticated response time | `2026-06-17 11:36:36 UTC` |
| unauthenticated response body | `{"ok":false,"error":"Unauthorized"}` |
| in-app browser authenticated attempt | blocked before load with `net::ERR_BLOCKED_BY_CLIENT` |

Latest authenticated-superadmin readiness result carried into F1 from the phase context, without secrets:

```json
{
  "ok": true,
  "enabled": true,
  "configured": true,
  "baseUrlPresent": true,
  "path": "/internal/gnr8/rendered-capture-worker",
  "healthPath": "/health",
  "sharedTokenConfigured": true,
  "healthStatus": "ready",
  "diagnostics": [
    "RENDERED_CAPTURE_WORKER_HEALTH_STARTED",
    "RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED"
  ]
}
```

The exact `timeoutMs` and `healthHttpStatus` should be copied from the authenticated response immediately before F2 if the browser/session can access the endpoint. The retry must not proceed on an unauthenticated response.

### Env Injection Checklist

Required local/runtime values for the next retry:

| Variable | Required value for F2 | Secret | Notes |
| --- | --- | --- | --- |
| `GNR8_RENDERED_CAPTURE_WORKER_ENABLED` | `true` | No | Explicitly enables the worker path for the retry process. |
| `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` | `https://gnr8-worker.vercel.app` | No | Must be the worker base URL only, with no capture or health path appended. |
| `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` | `<secret, do not print>` | Yes | Must match the worker project's production token. |
| `GNR8_RENDERED_CAPTURE_WORKER_PATH` | Optional, default `/internal/gnr8/rendered-capture-worker` | No | Set only if production uses a non-default capture path. |
| `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH` | Optional, default `/health` | No | Set only if production uses a non-default health path. |
| `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` | Optional, default `10000` | No | Use the production timeout if different; valid values are clamped between `1000` and `60000`. |

Secret handling warnings:

- Never commit the token.
- Never paste the token into docs.
- Never print the token in reports.
- Disable shell tracing before injecting the token.
- Do not store pulled Production env files in tracked paths.
- Unset the token after the retry if it was exported into the shell.

### Safe Retry Command Shape For F2

Use this shape only in the next phase, after explicitly authorizing the retry. The token must already be available in the shell from a secure local source and must not be expanded into docs or logs.

```sh
set +x

GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true \
GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://gnr8-worker.vercel.app \
GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN="$GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN" \
NODE_OPTIONS='--conditions=react-server' \
pnpm exec tsx <existing-rendered-capture-smoke-retry-harness>.ts
```

If the token is exported rather than injected inline, clear it after the command:

```sh
unset GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN
```

Do not include the real token in the command text recorded in reports.

### F1 Conclusion

The next retry should use a local shell with explicit worker env injection. This is the smallest operational change that addresses the `CAPTURE_WORKER_NOT_CONFIGURED` failure while avoiding new code, new production execution endpoints, and persistent local secret files.

Recommended next phase: **8B-12K-Retry-F2 Rendered Capture Smoke Retry With Worker Env**.

## 8B-12K-Retry-F2 Result

Phase 8B-12K-Retry-F2 reran the one-site rendered capture smoke test against the same existing imported runtime site version with production DB env and rendered-capture worker env available in the local execution context.

No code, schema, importer behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or worker code was changed. No Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, or unrelated artifact was created.

The worker shared token was loaded from local execution env only. The token value was not printed, copied into docs, committed, or persisted by this report.

### F2 Preflight

| Check | Result |
| --- | --- |
| local env file used | `apps/platform/.env.local` loaded into process env |
| production DB URL present | yes |
| worker enabled | yes |
| worker base URL present | yes: `https://gnr8-worker.vercel.app` |
| worker shared token present | yes, value not printed |
| worker capture path configured | yes: `/internal/gnr8/rendered-capture-worker` |
| worker health path configured | yes: `/health` |
| worker timeout | `30000` ms |
| target runtime siteVersion exists | yes |
| runtime siteId | `site_aaa6d44109a38b5d083f` |
| ownership siteId | `067e3aa9-773c-4d5d-ba2b-a138761a6354` |
| durable `raw_imported_site` artifact | exists: `6f0829d5-a481-4722-b9e1-1b999e65e4b7` |
| durable root HTML bytes | exists: `index.html`, `text/html; charset=utf-8`, `29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861` |
| durable artifact file count | `351` |
| pre-retry `evidenceCaptureBaselineArtifact` | exists, but not usable |
| pre-retry layout geometry | absent; count `0` |
| pre-retry section evidence | absent; count `0` |
| pre-retry navigation evidence | absent; count `0` |

Preflight status: passed. Source rehydration was possible, the durable raw import artifact existed, and the worker env was configured with token presence confirmed as a boolean only.

### F2 Method

The retry used the existing worker-side rendered capture service path:

`runSiteRenderCapture({ siteId: "067e3aa9-773c-4d5d-ba2b-a138761a6354", siteVersionId: "90b3abf8-7a4c-41b5-af05-244642d1962d" })`

No new route, harness code, worker code, importer behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or schema behavior was added or modified.

### F2 Source Resolution Diagnostics

Source resolution passed from durable raw import artifact bytes.

Diagnostics emitted:

- `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`
- `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`

The selected durable raw import HTML was rehydrated to:

`/var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8/rendered-capture-source-rehydration/90b3abf8-7a4c-41b5-af05-244642d1962d/6f0829d5-a481-4722-b9e1-1b999e65e4b7/index.html`

### F2 Worker Reachability Diagnostics

The worker was reached.

The live retry emitted worker diagnostics showing:

- `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`
- `CAPTURE_WORKER_URL_RESOLVED`
- `CAPTURE_WORKER_REQUEST_STARTED`
- `CAPTURE_WORKER_REQUEST_BUILT`
- `CAPTURE_WORKER_HTTP_REQUEST_SENT`
- `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`
- `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`
- `CAPTURE_WORKER_HTTP_ERROR`
- `CAPTURE_WORKER_REQUEST_FAILED`
- `RENDERED_CAPTURE_UNAVAILABLE`
- `CAPTURE_WORKER_UNAVAILABLE`

The live worker config state logged by the existing service was:

| Field | Result |
| --- | --- |
| enabled | `true` |
| base URL present | `true` |
| token present | `true` |

The persisted diagnostic-code set still includes older stale diagnostics from prior retries, including `CAPTURE_WORKER_NOT_CONFIGURED`, but the live F2 output summary showed the current request was configured and sent.

### F2 Capture Result

| Check | Result |
| --- | --- |
| worker status | `unavailable` |
| normalized worker status | `failed` |
| `renderedCaptureStatus` | `failed` |
| `renderedDomQuality` | `unusable` |
| `sourceMode` | `raw_html_fallback` |
| `hasUsableEvidence` | `false` |
| failure reason | `CAPTURE_WORKER_HTTP_ERROR` |
| rendered DOM length | `0` |
| rendered DOM node count | `0` |
| screenshots count | `0` |
| computed style samples count | `0` |
| layout geometry count | `0` |

Persisted rendered-capture execution details:

| Field | Result |
| --- | --- |
| `dom` | `empty_or_failed` |
| `navigation` | `failed` |
| `screenshot` | `none` |
| `failureCode` | `CAPTURE_WORKER_HTTP_ERROR` |
| `runtimeKind` | `nodejs` |
| `browserLaunch` | `failed` |
| `styleSampling` | `failed_or_empty` |
| `failureCategory` | `page` |
| `environmentStatus` | `unsupported` |
| `environmentSupported` | `false` |
| `browserPackageAvailable` | `true` |
| `browserBinaryAvailable` | `true` |

### F2 Evidence Artifact Result

Post-retry production DB verification:

| Check | Result |
| --- | --- |
| `evidenceCaptureBaselineArtifact` exists | yes |
| baseline kind | `evidence_capture_baseline` |
| capture expansion keys present | `layoutGeometryEvidence`, `sectionBoundaryEvidence`, `navigationEvidence` |
| layout geometry exists | no usable layout geometry; count `0` |
| section evidence exists | no; count `0` |
| navigation evidence exists | no; count `0` |
| screenshots count | `0` |
| computed style samples count | `0` |

The baseline-shaped evidence artifact persisted, but it is not a passing Evidence Capture baseline because it contains no usable rendered DOM, screenshots, computed style samples, layout geometry, section evidence, or navigation evidence.

### F2 Pass/Fail

FAIL.

PASS criteria were not met:

- worker reached: yes
- rendered capture succeeds or produces usable/partial rendered DOM: no
- evidence baseline exists: yes
- layout geometry exists: no
- section evidence exists: no
- navigation evidence exists: no

### F2 Failure Classification

Classification: **D. worker HTTP error**.

The F2 retry proves that the local execution context can rehydrate source from durable raw import artifact bytes and reach the configured worker with token-present worker env. The remaining blocker is no longer source rehydration or local worker-client configuration. The worker request receives HTTP-error responses and returns no usable rendered capture output.

### F2 Next Recommendation

Recommended next phase: **8B-12K-Retry-F3 Worker HTTP Error Diagnosis**.

The next phase should inspect the worker endpoint deployment/path/auth/runtime response for the bounded capture POST only, including whether `https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker` and its compatibility path are deployed and returning the expected worker contract. Continue to avoid Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation unless separately authorized.

## 8B-12K-Retry-F3 Worker HTTP Error Diagnosis

Phase 8B-12K-Retry-F3 inspected the rendered-capture worker HTTP failure class from F2 without changing importer behavior, Evidence Capture behavior, source resolution behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema.

No FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, full capture retry, or Evidence Capture artifact was created. A tokened diagnostic POST was not executed from this local session after escalation review rejected sending the shared worker token to the external worker host. The route diagnosis therefore used the persisted F2 summary plus unauthenticated POST probes that send no secrets.

### F3 HTTP Response

Unauthenticated diagnostic POSTs to the deployed worker host returned:

| Path | Status | Content type | Body shape |
| --- | --- | --- | --- |
| `/internal/gnr8/rendered-capture-worker` | `404 Not Found` | `text/html; charset=utf-8` | HTML Next not-found page |
| `/api/internal/gnr8/rendered-capture-worker` | `404 Not Found` | `text/html; charset=utf-8` | HTML Next not-found page |

Safe body summary: the response starts as a generic HTML document for a Next app, preloading `/_next/static/...` chunks. It is not JSON, contains no worker `error.code`, contains no `rendered_capture_worker_response_v1`, and contains no worker diagnostics.

Persisted F2 DB read still only exposes the coarse transport classification: `workerHealth.reason = worker_http_error`, `workerHealth.status = unreachable`, `captureJob.status = failed_transient`, `captureJob.failureCode = WORKER_UNAVAILABLE`, and `renderedCaptureStatus = failed`. It does not persist the enriched F2 HTTP diagnostic details.

### F3 Route Contract Check

Source routes/contracts found:

| Surface | Route status |
| --- | --- |
| `apps/platform/gnr8/rendered-capture-worker-server/server.ts` | standalone rendered-capture worker server supports `POST /internal/gnr8/rendered-capture-worker`, legacy `POST /api/internal/gnr8/rendered-capture-worker`, and `GET /health` |
| `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts` | platform Next proxy route exists at source path `/api/internal/gnr8/rendered-capture-worker`; it validates auth/body and forwards to upstream worker path default `/internal/gnr8/rendered-capture-worker` |
| `apps/platform/.next/server/app-paths-manifest.json` | built platform app contains `/api/internal/gnr8/rendered-capture-worker/route` |
| `apps/worker/app` source | no rendered-capture-worker route found; only `/health` is present |
| `apps/worker/.next/server/app-paths-manifest.json` | built worker app contains `/health/route` only; no capture route |
| deployed `https://gnr8-worker.vercel.app` | both capture POST paths return `404` HTML |

The configured F2 primary platform-called path was `/internal/gnr8/rendered-capture-worker`. The platform worker client has fallback logic that retries the compatibility path `/api/internal/gnr8/rendered-capture-worker` after a `404` on the primary path. F3 showed both deployed paths return `404`.

### F3 Request Contract Check

Platform worker client request contract:

| Field | Summary |
| --- | --- |
| method | `POST` |
| primary path | `/internal/gnr8/rendered-capture-worker` in F2 env |
| alternate path | `/api/internal/gnr8/rendered-capture-worker` after primary `404` |
| auth header present | yes in F2: `x-gnr8-rendered-capture-worker-token`; value not printed |
| bearer auth present | yes in worker client: `Authorization: Bearer <shared_token>`; value not printed |
| content type | `application/json` |
| request body keys | `kind`, `contractVersion`, `requestId`, `importId`, `sourceUrl`, `trace`, `capture` |
| capture body keys | `viewport`, `readinessPolicy`, `captureScreenshots`, `captureComputedStyles`, `captureRenderedDom`, `timeoutBudgetMs` |
| expected success status | `200` |
| expected response shape | JSON `kind = rendered_capture_worker_response_v1`, `contractVersion = 1.0.0`, matching `requestId`, `status`, `environment`, `artifacts`, `computedStyleSamples`, `diagnostics`, `qualitySummary`, optional `failure`, and `timings` |

The F3 response did not reach auth, validation, payload-size, browser launch, navigation, timeout, or worker response-shape handling. It failed at route resolution before the worker contract could run.

### F3 Failure Classification

Classification: **B. route missing / 404**.

Primary cause: the deployed worker host does not expose either rendered-capture capture POST route. The live response class is `404 text/html` from a generic Next route surface, not a rendered-capture worker JSON response. This is not auth failure, method mismatch, request body invalid, payload too large, worker runtime exception, Playwright/browser dependency failure, timeout, or response shape mismatch.

### F3 Next Recommendation

Recommended next phase: **8B-12K-Retry-F4 Deployed Worker Route/Entrypoint Alignment**.

F4 should verify and correct the worker deployment/start command so `gnr8-worker.vercel.app` serves the rendered-capture worker server entrypoint or an equivalent route surface that exposes `GET /health`, `POST /internal/gnr8/rendered-capture-worker`, and compatibility `POST /api/internal/gnr8/rendered-capture-worker`. Stop short of rerunning full capture until the route returns a worker JSON auth/contract response instead of `404` HTML.

## 8B-12K-Retry-F4 Deployed Worker Route / Entrypoint Alignment

Phase 8B-12K-Retry-F4 added the missing rendered-capture POST route surface to `apps/worker` without changing importer semantics, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema.

No FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, full capture retry, or Evidence Capture artifact was created.

### F4 Routes Added

| Route | Status |
| --- | --- |
| `POST /internal/gnr8/rendered-capture-worker` | added in `apps/worker/app/internal/gnr8/rendered-capture-worker/route.ts` |
| `POST /api/internal/gnr8/rendered-capture-worker` | added as compatibility alias in `apps/worker/app/api/internal/gnr8/rendered-capture-worker/route.ts` |

Both route files use the same `renderedCaptureWorkerRouteHandlers.POST` function from `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts`.

### F4 Handler Delegation

The worker route delegates to `createRenderedCaptureWorkerFetchHandler(...)` in `apps/platform/gnr8/rendered-capture-worker-server/fetch-handler.ts`.

That fetch handler reuses the existing rendered-capture worker request parsing/execution contract from:

- `apps/platform/gnr8/import-rendered-capture-worker/worker-service.ts`
- `apps/platform/gnr8/import-rendered-capture-worker/worker-contract.ts`

Capture execution remains delegated to `executeRenderedCaptureWorkerRequest(...)`; no capture/browser logic was duplicated in the worker route files.

### F4 Auth And Response Contract

The route preserves shared-token auth with `x-gnr8-rendered-capture-worker-token` matched against `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.

Token values are not printed or included in responses. Auth failures return JSON with `UNAUTHORIZED_WORKER_REQUEST`, not generic Next HTML.

Successful mocked route execution returns the existing worker response shape, including:

- `kind = rendered_capture_worker_response_v1`
- `contractVersion = 1.0.0`
- matching `requestId`
- worker `status`
- JSON `content-type`

### F4 Validation

Focused worker route tests passed:

```sh
cd apps/worker && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/rendered-capture-worker-route-handlers.test.ts
```

Covered:

- primary route export exists
- compatibility route export exists
- missing/invalid auth rejected
- valid auth reaches the injected handler
- response is JSON, not HTML
- response does not expose the shared token

Worker build passed:

```sh
cd apps/worker && pnpm run build
```

The build output lists both dynamic worker routes:

- `/internal/gnr8/rendered-capture-worker`
- `/api/internal/gnr8/rendered-capture-worker`

### F4 Result

F4 aligns the deployed worker route entrypoint in source/build. After deployment, the platform caller should no longer receive a generic Next `404` HTML response from the worker capture endpoint. The next live check should verify the deployed worker returns worker JSON auth/contract responses on both POST paths before rerunning the full rendered-capture smoke test.

Recommended next phase: **8B-12K-Retry-F5 Rendered Capture Smoke Retry After Worker Route Alignment**.
