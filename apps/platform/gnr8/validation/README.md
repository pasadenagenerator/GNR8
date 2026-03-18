# GNR8 Validation (Phase-1)

This folder contains deterministic, file-based validation fixtures and runners for exercising the full phase-1 migration spine end-to-end (no browser required).

## Fixture location & conventions

- First real site fixture: `apps/platform/gnr8/validation/fixtures/real-site-01/`
- Fixture spec file: `fixture.json`
  - `fixtureId` (fixed)
  - `entryHtmlPath` (root-relative)
  - `assetsDirPath` (root-relative or null)

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

