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

Phase 8B-12K Failure Analysis: Existing SiteVersion Capture Source Rehydration.

Recommended focus:

- determine whether existing imported siteVersions should resolve recapture input from durable raw imported artifacts instead of ephemeral `/tmp/...` snapshot paths
- verify whether production worker-side execution has access to the original snapshot files for this siteVersion
- if not, run a constrained re-import or source artifact rehydration path before retrying rendered capture
- after source resolution is fixed, retry this same one-site rendered capture smoke test before moving to `8B-12L Limited Dry Run Real-Site Retry`
