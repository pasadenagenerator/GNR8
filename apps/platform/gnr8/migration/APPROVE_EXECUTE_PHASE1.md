# Phase-1 Deterministic Approve → Execute Skeleton

This phase introduces the first strict operational handoff from previewable artifacts to a controlled, simulation-only execution boundary.

## Approval status rule (ApprovalPackage)

Computed deterministically from existing pipeline outputs (no new parsing passes):

- `blocked` if:
  - `pipeline.status === "failed"`, or
  - `previewDocument.status === "blocked"`, or
  - any pipeline diagnostic has severity `fatal` or `error`
- `approvable_with_warnings` if not blocked and any warning codes exist
- `approvable` otherwise

Warning codes are derived only from:
- pipeline diagnostics with severity `warning`
- `renderOutput.diagnostics.renderer.warnings.codes`
- `previewDocument.diagnostics.preview.warnings.codes`

## Execution status rule (ExecutionResult)

- `blocked` if `executionPlan.eligibility.status === "blocked"` OR `approvalPackage.eligibility.status === "blocked"`
- `executed` if simulation executed and there are no warning codes
- `executed_with_warnings` if simulation executed and there are warning codes
- `failed` only for unexpected internal errors (captured as structured data; no throw for normal blocked/failed conditions)

## Execution step sequence (ExecutionPlan / ExecutionResult)

Canonical ordered steps (stable and replayable):

1. `validate_approval_package_v1`
2. `enumerate_preview_pages_v1`
3. `compute_target_artifacts_v1`
4. `emit_simulation_result_v1`

## Where artifacts live in the runtime flow

- Deterministic builders:
  - `apps/platform/gnr8/migration/approval-package-model.ts`
  - `apps/platform/gnr8/migration/execution-plan-model.ts`
  - `apps/platform/gnr8/migration/execution-result-model.ts`
- Runtime entrypoint:
  - `apps/platform/gnr8/migration/runtime/run-linear-migration-phase1-approve-execute.ts`

