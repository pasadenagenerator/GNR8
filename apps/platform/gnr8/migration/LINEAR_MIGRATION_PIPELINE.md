# Linear Migration Pipeline (Runtime Skeleton)

## Stage sequence (fixed)

1. `import_intake`
2. `structure_preparation`
3. `layout_preparation`
4. `render_preparation`

Stage order is defined by `LINEAR_MIGRATION_STAGE_ORDER` in `apps/platform/gnr8/migration/pipeline-contract.ts`.

## Status computation rules

- Each stage returns a `PipelineStageResult` with `status`:
  - `success` — stage ran and prerequisites were satisfied
  - `failed` — stage ran and a prerequisite or invariant was not satisfied
  - `skipped` — stage did not run because a prior stage was not `success`
- Pipeline `status`:
  - `failed` if any stage is `failed`
  - `success` otherwise
- Normal failures are represented structurally in the `PipelineResult`; the runner does not throw for import/content problems.

## Placeholder behavior (current)

- `import_intake`
  - Passes through `PipelineInput` deterministically.
  - Imports diagnostics from `ImportOutput.importDiagnostics.issues` into the pipeline diagnostics stream (attributed to `import_intake` with `source: "import"`).
  - Blocks the pipeline when `ImportManifest.status === "failed"` or `ImportOutput.status === "failed"`, emitting a deterministic `PIPELINE_BLOCKED_BY_IMPORT` diagnostic.
- `structure_preparation`
  - Deterministically emits `PreparedSiteModel` (`prepared_site_model_v1`) derived from `PipelineInput`.
- `layout_preparation`
  - Deterministically emits `LayoutPreparationModel` (`layout_preparation_model_v1`) derived from `PreparedSiteModel`.
- `render_preparation`
  - Deterministically emits `RenderOutput` (`render_output_v1`) derived from `LayoutPreparationModel`.

## Phase-1 LayoutPreparationModel (implementation note)

Model fields included (high-level):
- `kind`, `modelVersion`, `source` (prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `siteSummary` (page/block counts)
- `pages` (stable page records with traceability + blocks)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` (references/summary from preparation)

Block extraction rule (fixed, replayable):
- Each direct child *element* of `<body>` becomes one block in document order.
- If `<body>` is unavailable or has no child elements, `blocks: []` is produced.

Status computation rule:
- `blocked` if `PreparedSiteModel.status === "blocked"` OR there are no pages.
- `ready` if not blocked AND `PreparedSiteModel.status === "ready"` AND all pages are `eligible`.
- `ready_with_warnings` otherwise.

Pipeline stage emitting the model:
- `layout_preparation` now emits `LayoutPreparationModel` as `LayoutPreparationStageOutput.layoutModel`.

## Phase-1 RenderOutput (implementation note)

Render output fields included (high-level):
- `kind`, `modelVersion`, `mapping` (rule id + wrapper tag)
- `source` (layout/prepared/import version references + fingerprints)
- `status` (`ready` | `ready_with_warnings` | `blocked`)
- `siteSummary` (page eligibility + rendered node counts)
- `pages` (stable page render records with traceability + render nodes)
- `pageSummaries` (compact per-page summary)
- `diagnostics.carried.import` (carried summary from preparation) + `diagnostics.renderer.warnings.codes`

Phase-1 render mapping rule (fixed, replayable):
- Each layout block becomes one top-level render node.
- Node order is canonical by `ordinalIndex` (0-based).
- Every node uses a stable wrapper tag: `section`.
- Original `sourceTagName` is preserved for traceability.

Render status computation rule:
- `blocked` if `LayoutPreparationModel.status === "blocked"` OR there are no eligible pages.
- `ready` if not blocked AND `LayoutPreparationModel.status === "ready"` AND there are no ineligible pages.
- `ready_with_warnings` otherwise.

Pipeline stage emitting the model:
- `render_preparation` now emits `RenderOutput` as `RenderPreparationStageOutput.renderOutput`.
