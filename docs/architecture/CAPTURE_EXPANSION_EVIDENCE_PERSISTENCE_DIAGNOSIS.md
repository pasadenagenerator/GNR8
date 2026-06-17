# Capture Expansion Evidence Persistence Diagnosis

Phase: 8B-12K-F10 Capture Expansion Evidence Persistence Diagnosis

Date: 2026-06-17

Target siteVersionId: `9c1fdafd-ff1a-4d85-8559-5860d5775c1f`

## Boundary

Diagnostics only.

No importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema was modified.

No FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, or migration was created. No import, recapture, Limited Dry Run, reconstruction, AI generation, publishing, or schema operation was run.

## Rendered Capture Data Inspected

The target runtime row was inspected read-only from production using the single `siteVersionId`.

Persisted top-level capture summary:

| Field | Value |
| --- | --- |
| `siteId` | `site_bfabe23af164fb00b3ab` |
| `versionNo` | `1` |
| `state` | `DRAFT` |
| runtime `artifactId` | `f6cecf7a-fe52-461c-a3d0-0bd2a485f33f` |
| `sourceMode` | `rendered_dom` |
| `importFidelityStatus` | `high_fidelity_import` |
| `renderedCaptureStatus` | `available` |
| `renderedDomQuality` | `strong` |
| `screenshotCount` | `2` |
| `computedStyleSampleCount` | `6` |
| `renderedCapture.nodeCount` | `311` |
| `renderedCapture.domLength` | `43491` |

Persisted refs and local evidence-path availability from the current workspace:

| Evidence | Finding |
| --- | --- |
| rendered DOM ref/path | `captureEvidence.renderedDomPath` exists and file exists. |
| screenshot refs | `captureEvidence.screenshotPaths` contains 2 worker screenshot paths and both files exist. |
| computed styles ref/path | `captureEvidence.computedStylesPath` exists and file exists. |
| acquisition evidence | `captureEvidence.acquisitionEvidencePath` exists and file exists. |
| raw capture summary / manifest | `captureEvidence.renderedCaptureManifestPath` exists and file exists. |
| layout geometry path | `captureEvidence.layoutGeometryPath` is absent. |
| baseline layout ref | `evidenceCaptureBaselineArtifact.persistedRefs.layoutGeometryRef` is `null`. |

The rendered capture manifest contains layout-relevant data:

| Manifest field | Value |
| --- | --- |
| `status` | `available` |
| `legacyStatus` | `available` |
| `quality` | `strong` |
| `layoutGeometrySummary.geometryCaptured` | `true` |
| `layoutGeometrySummary.regionCount` | `3` |
| `layoutGeometrySummary.viewport` | `1366 x 768` |
| `layoutGeometryEvidence` | present |
| `layoutGeometryEvidence.length` | `1` |
| style sample summary | `6 / 10`, coverage `0.6` |
| screenshot summary | viewport and full page captured, count `2` |

Conclusion: the worker response and rendered-capture manifest had layout geometry. The persisted baseline artifact did not.

## Expansion Builder Path Findings

The capture expansion builder path is in `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts`.

The baseline builder imports and calls:

- `createLayoutGeometryEvidence(...)`
- `createSectionBoundaryEvidence(...)`
- `createNavigationEvidence(...)`

The builder behavior is:

- `layoutGeometryEvidence` is rebuilt only from `input.layoutGeometryEvidence ?? []`.
- `sectionBoundaryEvidence` is derived from that `layoutGeometryEvidence` plus `input.renderedHtml`.
- `navigationEvidence` is derived from `routePath`, `input.renderedHtml`, layout evidence, and section evidence.
- `artifactStatus = baseline_partial` does not block the builders.

For the fresh import baseline attach call in `apps/platform/gnr8/site/scoped-import-pipeline.ts`, the inputs are:

- `renderedHtml: undefined`
- `computedStyleSamples: input.snapshot.renderedCapture.computedStyleSamples`
- no `layoutGeometryEvidence` argument

Therefore:

| Possible finding | F10 result |
| --- | --- |
| A. builders not called | No. They are called by the baseline artifact builder. |
| B. called but receive empty input | Yes. Layout receives `[]`; section/nav also lack rendered HTML. |
| C. called but output not persisted | No for this path. They output empty arrays, and those empty arrays are persisted. |
| D. output persisted under different path/key | Partially. Worker/import rendered-capture manifest has layout geometry, but baseline expansion keys have empty arrays. |
| E. blocked by `artifactStatus` / `baseline_partial` | No. `baseline_partial` is just artifact status. |
| F. unavailable in fresh import path | No. Fresh import snapshot/manifest has the geometry; the baseline attach input omits it. |
| G. other | The provenance summary also omits `captureEvidence.layoutGeometryPath`, so baseline `layoutGeometryRef` is `null`. |

## Import Pipeline Integration Finding

Fresh URL import enters through:

- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `importPublicSinglePageUrlToSnapshot(...)`
- `runScopedImportPipeline(...)`

Rendered capture and worker integration:

- `RenderedCaptureResult` includes `layoutGeometryEvidence`.
- Worker response contract includes optional `layoutGeometryEvidence`.
- Worker adapter maps `response.layoutGeometryEvidence` into `RenderedCaptureResult.layoutGeometryEvidence`.
- `importPublicSinglePageUrlToSnapshot(...)` materializes `rendered/layout-geometry.json` and writes the rendered-capture manifest with `layoutGeometrySummary` and `layoutGeometryEvidence`.

Baseline integration gap:

- `buildImportProvenanceSummary(...)` records rendered DOM, computed styles, screenshots, acquisition evidence, and rendered-capture manifest paths.
- It does not record `captureEvidence.layoutGeometryPath`.
- `runScopedImportPipeline(...)` attaches the baseline artifact after raw import persistence, but passes `renderedHtml: undefined` and does not pass `layoutGeometryEvidence`.

Result: fresh import runs the worker capture path and persists a rendered-capture manifest that contains geometry, but the Evidence Capture baseline artifact is built from inputs that exclude both layout geometry and rendered DOM HTML.

## Root Cause Classification

Primary cause: **E. persistence mapping missing**.

The rendered capture output contains layout geometry, but the fresh import baseline persistence mapping does not carry `snapshot.renderedCapture.layoutGeometryEvidence`, rendered DOM HTML, or `rendered/layout-geometry.json` into the Evidence Capture baseline artifact/provenance path.

Secondary consequences:

- Section evidence is `0` because it is derived from `LayoutGeometryEvidence` plus rendered HTML.
- Navigation evidence is `0` because it is derived from rendered HTML plus layout/section context.
- The read model is not the primary cause. It reads the baseline summary keys correctly; those keys were persisted as empty.

## Recommended Fix

Recommended next phase: **Phase 8B-12K-F11 - Fresh Import Baseline Capture Expansion Wiring**.

Single recommended fix: adapt the fresh import baseline creation path to pass the already-captured rendered DOM HTML and `snapshot.renderedCapture.layoutGeometryEvidence` into `attachEvidenceCaptureBaselineArtifact(...)`, and persist the existing `rendered/layout-geometry.json` path into `captureEvidence.layoutGeometryPath` so the baseline can store `layoutGeometryRef` under the correct baseline key.

Do not change worker capture semantics, importer source selection semantics, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or schema in that phase.

## F11 Wiring Resolution

Phase 8B-12K-F11 implemented the recommended persistence/wiring fix only.

Fresh scoped imports now:

- persist `captureEvidence.layoutGeometryPath` when the canonical rendered capture geometry file exists at `rendered/layout-geometry.json`;
- read already-persisted rendered DOM HTML from `captureEvidence.renderedDomPath` and pass it to `attachEvidenceCaptureBaselineArtifact(...)`;
- pass `snapshot.renderedCapture.layoutGeometryEvidence` to `attachEvidenceCaptureBaselineArtifact(...)`;
- allow the existing deterministic layout, section, and navigation builders to materialize baseline expansion evidence;
- keep `baseline_partial` behavior when rendered HTML or layout geometry is missing.

Added diagnostics:

- `EVIDENCE_CAPTURE_BASELINE_INPUTS_READY` log with rendered DOM HTML provided, layout geometry provided, and layout geometry path.
- `EVIDENCE_CAPTURE_BASELINE_EXPANSION_MATERIALIZED` log with layout, section, and navigation evidence counts.
- persisted `importDiagnosticCodes` for rendered DOM input, layout geometry input, layout geometry path persistence, and materialized/missing layout, section, and navigation evidence.

Focused F11 validation passed for the fresh scoped pipeline baseline wiring, including the missing-rendered-HTML partial baseline case.

Recommended next phase: **Phase 8B-12K-F12 - Fresh Production Import Capture Verification Retry**.

## Validation

Validation required for F10:

```bash
git diff --check
```
