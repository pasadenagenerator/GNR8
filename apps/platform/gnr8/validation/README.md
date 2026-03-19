# GNR8 Validation (Phase-1)

This folder contains deterministic, file-based validation fixtures and runners for exercising the full phase-1 migration spine end-to-end (no browser required).

## Fixture location & conventions

- Real site fixtures:
  - `apps/platform/gnr8/validation/fixtures/real-site-01/`
  - `apps/platform/gnr8/validation/fixtures/real-site-02/`
  - `apps/platform/gnr8/validation/fixtures/real-site-03/`
  - `apps/platform/gnr8/validation/fixtures/friend-site-01/`
- Fixture spec file: `fixture.json`
  - `fixtureId` (fixed)
  - `entryHtmlPath` (root-relative)
  - `assetsDirPath` (root-relative or null)

## Runtime availability (Vercel-safe)

The validation shell and runner read fixture files from disk at runtime. To keep this deterministic and deployment-safe:

- Source fixtures live at:
  - `apps/platform/gnr8/validation/fixtures/real-site-01/`
  - `apps/platform/gnr8/validation/fixtures/real-site-02/`
  - `apps/platform/gnr8/validation/fixtures/real-site-03/`
  - `apps/platform/gnr8/validation/fixtures/friend-site-01/`
- Runtime resolver lives at: `apps/platform/gnr8/validation/runtime/fixture-spec.ts`
  - Prefers `process.cwd()`-relative lookup (dev + bundled standalone runtime)
  - Falls back to monorepo-root lookup (tests run from repo root)
  - Avoids relying on module-relative paths in production (Next server bundling can relocate modules)
- Packaging into deployed runtime bundle:
  - `apps/platform/next.config.mjs` uses `outputFileTracingIncludes` for:
    - `/validation/real-site-01`
    - `/validation/real-site-02`
    - `/validation/real-site-03`
    - `/validation/friend-site-01`
    - `/api/validation/real-site-01`
    - `/api/validation/real-site-02`
    - `/api/validation/real-site-03`
    - `/api/validation/friend-site-01`

## Runner

- Entrypoint: `apps/platform/gnr8/validation/runtime/run-first-real-site-validation.ts`
- Functions:
  - `runRealSiteValidation({ fixtureId, ...options }): Promise<ValidationRunResult>`
  - `runFirstRealSiteValidation(options): Promise<ValidationRunResult>` (compat wrapper for `real-site-01`)

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
- invoke `runRealSiteValidation({ fixtureId: "real-site-01" | "real-site-02" | "real-site-03" | "friend-site-01", ... })`
- render `PreviewDocument` pages
- display the deterministic `ValidationSummary`
- optionally surface snapshot output paths for inspection

### Preview visibility (phase-1)

`PreviewDocument` preview markup is intentionally minimal, but it is not visually empty:
- Each preview `<section>` includes a deterministic visible header plus either a compact text excerpt (when available) or a stable structural fallback placeholder.
- No semantic inference or design reconstruction is performed; the projection is fixed and replayable.

## Materialized Preview Persistence (Task 37)

Materialize-mode preview hosting now supports persistent bundle storage so preview URLs can remain valid across requests and runtime instances.

- Persistent backend preference:
  - Supabase Storage (when `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are configured)
  - Optional deterministic local persistent object root for dev/tests: `GNR8_PREVIEW_PERSISTENT_FS_ROOT`
- Deterministic storage root key:
  - `phase1-materialized-previews/v1/<executionPlanId>`
- Deterministic file mapping:
  - Each materialized file at `<relPath>` is stored as:
    - `phase1-materialized-previews/v1/<executionPlanId>/<relPath>`
  - Entry file rule:
    - `phase1-materialized-previews/v1/<executionPlanId>/index.html`

### Serving behavior

- Preview route key resolution supports:
  - persistent storage-backed keys
  - local filesystem keys (controlled `.gnr8-static-output` roots only)
- Path traversal is blocked for both modes.
- Missing bundle roots and missing files return structured not-found payloads.

### Local fallback behavior

- Materialized runs attempt persistent publish first.
- If persistent publish is unavailable:
  - local filesystem fallback remains available by default in non-hosted runtime
  - hosted/prod can force persistent-only behavior by disabling fallback:
    - `GNR8_PREVIEW_ALLOW_LOCAL_FALLBACK=0`
