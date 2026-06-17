# Existing SiteVersion Capture Source Rehydration Audit

## Scope

Phase: 8B-12K-F1 Existing SiteVersion Capture Source Rehydration Audit

Boundary: read-only failure analysis, plus documentation updates only. No importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, source backfills, imports, or capture retries were changed or created.

## Target

| Field | Value |
| --- | --- |
| siteVersionId | `90b3abf8-7a4c-41b5-af05-244642d1962d` |
| runtime siteId | `site_aaa6d44109a38b5d083f` |
| ownership siteId | `067e3aa9-773c-4d5d-ba2b-a138761a6354` |
| version_no | `1` |
| state | `DRAFT` |
| source | `migration` |
| actor | `agency:client-scoped-import:membership` |
| sourceUrl | `https://www.odv-cvijanovic.si/` |
| sourceHost | `www.odv-cvijanovic.si` |
| runtime artifact id | `6d814f11-26bd-45ad-9e67-16fb0014c789` |

## Inspected References

### Import Provenance

The target runtime site version has `runtime_import_provenance_summary_v1`.

Important persisted values:

| Ref | Value |
| --- | --- |
| `executionIdentity.snapshotId` | `imported-url-site-a5ecc916fe5604f0` |
| `executionIdentity.snapshotRunId` | `client-site-import-1781168573242-43684205` |
| `executionIdentity.snapshotStableRootDirAbs` | `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0` |
| `executionIdentity.snapshotRunRootDirAbs` | `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205` |
| `captureEvidence.entryHtmlPath` | `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205/index.html` |
| `captureEvidence.selectedSourceHtmlPath` | `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205/response-html.raw.html` |
| `captureEvidence.responseHtmlPath` | `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205/response-html.raw.html` |
| `sourceMode` | `raw_html_fallback` |
| `renderedCaptureStatus` | `failed` |
| `renderedDomQuality` | `unusable` |
| `screenshotCount` | `0` |
| `computedStyleSampleCount` | `0` |
| `evidenceCaptureBaselineArtifact` | none |

Local filesystem verification in this execution environment found both provenance candidates missing:

- `/tmp/.../index.html`: missing
- `/tmp/.../response-html.raw.html`: missing

The current capture service source resolver reads only these filesystem-style provenance refs:

- `captureEvidence.entryHtmlPath`
- `captureEvidence.selectedSourceHtmlPath`
- `executionIdentity.snapshotRunRootDirAbs + /index.html`

It checks `fs.existsSync(...)` and fails before calling the rendered-capture worker when those paths do not exist.

### Durable Raw Import Artifact

The target has one durable raw import artifact in `public.gnr8_runtime_raw_template_artifacts`.

| Field | Value |
| --- | --- |
| artifact id | `6f0829d5-a481-4722-b9e1-1b999e65e4b7` |
| artifact type | `raw_imported_site` |
| site id | `site_aaa6d44109a38b5d083f` |
| site version id | `90b3abf8-7a4c-41b5-af05-244642d1962d` |
| entry HTML path | `index.html` |
| asset base path | `.` |
| sourceUrl | `https://www.odv-cvijanovic.si/` |
| finalUrl | `https://www.odv-cvijanovic.si/` |
| metadata htmlByteLength | `29849` |
| persisted file count | `351` |
| persisted total bytes | `11450595` |
| external fallback assets | `0` |

The raw artifact has a persisted `index.html` file row in `public.gnr8_runtime_raw_template_artifact_files`:

| Field | Value |
| --- | --- |
| file_path | `index.html` |
| media_type | `text/html; charset=utf-8` |
| file_size_bytes | `29715` |
| sha256 | `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861` |
| content storage | `content_bytes` bytea row |

The raw artifact file map also contains `index.html` with the same size, media type, and SHA. First observed asset keys include `assets/sitestyle.css`, script files, images, SVGs, and fonts. These are durable DB rows, not `/tmp` files.

### Runtime Artifact

The target has one compiled runtime artifact:

| Field | Value |
| --- | --- |
| artifact id | `6d814f11-26bd-45ad-9e67-16fb0014c789` |
| html path | `/` |
| bundle_sha256 | `4b5c8b1063466e11de3007d587c8cba0fe1ce926b679bd8e85999e2a832f2d84` |

This is a renderable product/runtime artifact, not the original imported source HTML. It is not the canonical source for rendered Evidence Capture of the imported original.

### File Maps And Snapshot Refs

The durable raw artifact file map exists and points to relative artifact paths such as `index.html` and `assets/...`. It is durable as metadata, but the source bytes come from `gnr8_runtime_raw_template_artifact_files.content_bytes`.

The multipage import summary for this target discovered one route only:

| Route | URL | Notes |
| --- | --- | --- |
| `/` | `https://odv-cvijanovic.si/` | Redirect discovery records canonical host redirect to `https://www.odv-cvijanovic.si/`. |

There are no separate `htmlAcquisition` or `rawArtifactAssembly` refs on this target's multipage summary. For this target, the route map does not provide an independent source store beyond the raw imported artifact.

### Preview And Raw Routes

Preview/runtime code can read `raw_imported_site` artifacts through `getRawImportedSiteArtifact(...)` and `getRawTemplateSiteAsset(...)`, then rewrite asset references for preview serving. The preview asset route can serve persisted artifact files from DB by `siteVersionId`, `artifactId`, and file path.

That proves the raw artifact bytes are available to runtime code, but the preview route is a serving projection over the artifact, not the canonical capture source.

## Rehydration Source Classification

| Source | Available | Durable | Safe | Deterministic | Suitable for rendered capture | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| A. original ephemeral tmp file | No | No | No | No | No | Both persisted `/tmp/.../index.html` and `/tmp/.../response-html.raw.html` are missing locally. These paths are environment-local run outputs. |
| B. persisted raw import artifact HTML | Yes | Yes | Yes | Yes | Yes | `raw_imported_site` artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` has `index.html` stored in `content_bytes` with SHA `371313...7861` and 351 persisted files. This is the best source of original imported HTML. |
| C. persisted runtime file map | Partial | Yes | Partial | Yes | Partial | The raw artifact file map is durable and points to `index.html`, but it is a locator/metadata layer. It must be paired with `content_bytes`. The compiled runtime artifact `html_by_path` is not original source HTML. |
| D. original source URL refetch | Yes | No | No | No | No | `sourceUrl` and `finalUrl` exist, but refetching would capture today's live website, not the immutable 2026-06-11 imported version. It may drift and can introduce network/cookie/runtime variability. |
| E. preview/raw route artifact | Partial | Yes | Partial | Partial | Not primary | Preview can read the raw artifact and serve rewritten output, but that exercises preview behavior and serving transforms. It should not become the source of truth for capture rehydration. It may be useful as a delivery mechanism only if explicitly scoped. |
| F. none available | No | n/a | n/a | n/a | No | A durable source exists: the `raw_imported_site` DB artifact. |

## Root Cause

The failure is a source-resolution limitation in the existing site render capture service, with a provenance shape mismatch from older import evidence.

Specific cause:

1. The old import/capture provenance preserved local snapshot paths under `/tmp/gnr8/validation/url-import-snapshots/...`.
2. Those paths were useful only inside the original import execution environment.
3. The durable raw import artifact was persisted later/alongside the runtime version, but the existing capture service does not consult `gnr8_runtime_raw_template_artifacts` or `gnr8_runtime_raw_template_artifact_files`.
4. `runSiteRenderCapture(...)` therefore fails in `resolveCaptureSource(...)` before the worker is called.
5. The worker readiness work can be correct and still not help this target until capture source resolution can rehydrate source HTML from durable storage.

Classification:

| Category | Applies | Explanation |
| --- | --- | --- |
| old import design | Yes | Provenance stored local run paths as capture source refs. |
| missing persisted source reference | No | A persisted raw imported source exists, but the capture path does not use it. |
| worker capture service limitation | Partial | The worker request contract accepts `sourceUrl`; the platform currently passes a `file://` URL. A remote worker cannot rely on platform-local files. |
| runtime-store lookup limitation | Yes | Capture source resolution does not call `getRawImportedSiteArtifact(...)` / `getRawTemplateSiteAsset(...)`. |
| provenance shape mismatch | Yes | Provenance points to absolute `/tmp` paths, while the durable artifact uses relative artifact paths and DB bytes. |
| other | No | No evidence points to missing source URL, missing raw artifact bytes, or absent raw artifact metadata for this target. |

## Recommendation

Primary path: **A. Teach capture service to use persisted raw import artifact HTML.**

Rendered capture source resolution for existing imported siteVersions should prefer durable source HTML from `raw_imported_site` artifacts when local provenance paths are missing. For this target, that means resolving:

1. `gnr8_runtime_raw_template_artifacts` by `siteVersionId` and `artifact_type = 'raw_imported_site'`.
2. `entry_html_path = index.html`.
3. `gnr8_runtime_raw_template_artifact_files.content_bytes` for `index.html`.
4. Associated artifact file rows/file map for same-version asset serving.

The next implementation phase should decide the worker-accessible delivery shape without changing the source of truth. Acceptable delivery designs include a bounded capture-source materialization path or a scoped internal source route backed by raw artifact bytes. The source must remain the persisted raw import artifact, not a live URL refetch and not the transformed runtime artifact.

Do not use original source URL refetch as the primary path for existing versions. Refetch is non-durable and non-deterministic.

Do not use the compiled runtime artifact as the primary source. It is product/runtime output, not imported-source evidence.

Do not make preview output the source of truth. Preview may be a reference for asset-route mechanics, but capture source rehydration should read the raw artifact directly.

## Phase 8B-12K-F2 Implementation Update

Phase 8B-12K-F2 implemented the source-resolution fix recommended by this audit.

Rendered capture now resolves existing imported siteVersion source HTML in this order:

1. Existing local provenance file path, if present.
2. Durable `raw_imported_site` artifact HTML from persisted `content_bytes`.
3. `SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND`.

The fallback is read-only against raw artifact storage. It selects the latest `raw_imported_site` artifact for the siteVersion, tries the artifact `entry_html_path` first, then `index.html`, and materializes only the selected HTML bytes into a temporary rehydration path for the existing capture runner. It does not refetch the original URL, mutate the raw artifact, create a new raw artifact, or change importer, preview, Original Mirror, dry-run, reconstruction, AI, React/block generation, publishing, or schema behavior.

Deterministic diagnostics added:

- `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`
- `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_MISSING`
- `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`

Focused tests cover local provenance precedence, raw artifact fallback, missing root HTML failure, missing artifact failure, and fallback diagnostics.

## Next Phase

Recommended next phase after the F2 fix: **8B-12K-Retry Rendered Capture Smoke Test On Existing SiteVersion**.

Scope for the retry phase:

- Retry the same target siteVersion only after explicit authorization.
- Confirm source resolution reaches the worker instead of failing at `/tmp` provenance lookup.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, imports, or unrelated repair jobs in the retry phase.

## Validation

F2 validation must include focused tests and `git diff --check`.
