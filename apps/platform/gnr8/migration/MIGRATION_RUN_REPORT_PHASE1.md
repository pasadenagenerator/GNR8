# Phase-1 Migration Run Report (Deterministic Observability)

This note documents the deterministic run-level observability surface introduced for the phase-1 migration flow.

## Where it lives

- Report contract + generator:
  - `apps/platform/gnr8/migration/migration-run-report.ts`
- Runtime integration (approve → execute):
  - `apps/platform/gnr8/migration/runtime/run-linear-migration-phase1-approve-execute.ts`

## Overall run status rule (deterministic)

`MigrationRunReport.overallStatus` is computed deterministically from existing artifacts:

1. `failed` if:
   - `pipeline.status === "failed"`, OR
   - `executionResult.status === "failed"`
2. `blocked` if not failed AND any of:
   - `approvalPackage.eligibility.status === "blocked"`, OR
   - `executionPlan.eligibility.status === "blocked"`, OR
   - `executionResult.status === "blocked"`
3. `success_with_warnings` if not failed/blocked AND warnings are present (canonical union across pipeline/render/preview/approval/execution)
4. `success` otherwise

## Event generation rule (deterministic + canonical)

`MigrationRunReport.events` is a deterministic, canonical event list derived from the report itself:

- Iterate `stageExecutionOrder` in order.
- For each stage:
  1. Emit `artifact_presence_v1` events for the stage’s `artifactKeys` (sorted lexicographically by `artifactKey`).
  2. Emit exactly one `stage_summary_v1` event.
- `ordinal` is contiguous `0..N-1`.
- `eventId` is derived only from `(ordinal, stageId, kind)` (no timestamps, no randomness).

## Artifact coverage (explicit availability)

The report includes explicit artifact availability summaries for:

- `import_output`
- `import_manifest`
- `prepared_site_model`
- `layout_preparation_model`
- `render_output`
- `preview_document`
- `approval_package`
- `execution_plan`
- `execution_result`

Only compact references and summaries are included (no large payload embedding).

