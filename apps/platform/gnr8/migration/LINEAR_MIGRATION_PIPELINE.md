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
  - No-op placeholder that emits an empty `structure_model_v0` structure.
- `layout_preparation`
  - No-op placeholder that emits an empty `layout_model_v0` structure.
- `render_preparation`
  - No-op placeholder that emits an empty `render_plan_v0` structure.

