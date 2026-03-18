# GNR8 Validation (Phase-1)

This folder contains deterministic, file-based validation fixtures and runners for exercising the full phase-1 migration spine end-to-end (no browser required).

## Fixture location & conventions

- First real site fixture: `apps/platform/gnr8/validation/fixtures/real-site-01/`
- Fixture spec file: `fixture.json`
  - `fixtureId` (fixed)
  - `entryHtmlPath` (root-relative)
  - `assetsDirPath` (root-relative or null)

## Runtime availability (Vercel-safe)

The validation shell and runner read fixture files from disk at runtime. To keep this deterministic and deployment-safe:

- Source fixture lives at: `apps/platform/gnr8/validation/fixtures/real-site-01/`
- Runtime resolver lives at: `apps/platform/gnr8/validation/runtime/fixture-spec.ts`
  - Prefers `process.cwd()`-relative lookup (dev + bundled standalone runtime)
  - Falls back to monorepo-root lookup (tests run from repo root)
  - Avoids relying on module-relative paths in production (Next server bundling can relocate modules)
- Packaging into deployed runtime bundle:
  - `apps/platform/next.config.mjs` uses `outputFileTracingIncludes` for `/validation/real-site-01` and `/api/validation/real-site-01`

## Runner

- Entrypoint: `apps/platform/gnr8/validation/runtime/run-first-real-site-validation.ts`
- Function: `runFirstRealSiteValidation(options): Promise<ValidationRunResult>`

Returned artifacts (minimum surface):
- `ImportOutput`
- `ImportManifest`
- `PipelineResult` (`LinearMigrationPipelineResult`)
- `PreviewDocument`
- `ApprovalPackage`
- `ExecutionPlan`
- `ExecutionResult`
- `MigrationRunReport`
- `ValidationSummary`

## Validation status rule

Overall validation status is derived directly from `MigrationRunReport.overallStatus`:
- `success` → `passed`
- `success_with_warnings` → `passed_with_warnings`
- `blocked` → `blocked`
- `failed` → `failed`

## Optional deterministic snapshots

Snapshots are optional and deterministic:
- Fixed directory structure: `<snapshotOutDirAbs>/<fixtureId>/...`
- Canonical filenames (no timestamps, no run ids)
- Stable JSON serialization via the shared `stableStringify` helper

If `writeSnapshots: true` is provided without `snapshotOutDirAbs`, the default output directory is:
- `apps/platform/gnr8/validation/.out/<fixtureId>/`

## Future temporary frontend shell integration

The runner returns all phase-1 artifacts in one structured object (`ValidationRunResult`), so a future temporary frontend shell can:
- invoke `runFirstRealSiteValidation(...)`
- render `PreviewDocument` pages
- display the deterministic `ValidationSummary`
- optionally surface snapshot output paths for inspection

### Preview visibility (phase-1)

`PreviewDocument` preview markup is intentionally minimal, but it is not visually empty:
- Each preview `<section>` includes a deterministic visible header plus either a compact text excerpt (when available) or a stable structural fallback placeholder.
- No semantic inference or design reconstruction is performed; the projection is fixed and replayable.
