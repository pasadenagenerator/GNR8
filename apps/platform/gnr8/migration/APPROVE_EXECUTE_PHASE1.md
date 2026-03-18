# Phase-1 Deterministic Approve → Execute

This phase introduces the strict operational handoff from previewable artifacts to an explicit execution boundary with two deterministic modes.

## Execution mode contract

- `simulation`
  - No export files are written.
  - Full approval/eligibility boundary is still enforced.
  - Returns structured execution result with deterministic target-artifact references.
- `materialize`
  - Uses the same approval/eligibility boundary.
  - Calls deterministic static bundle materialization (`materializeStaticOutputBundle`) to write real export files.
  - Returns structured execution result with bundle/output metadata and materialization summary.

Default mode is `simulation` unless caller explicitly selects `materialize`.

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
- `executed` if execution completed and there are no warning codes
- `executed_with_warnings` if execution completed and there are warning codes
- `failed` only for unexpected internal errors (captured as structured data; no throw for normal blocked/failed conditions)

Materialize mode can also return deterministic `failed` status when materialization reports bundle error codes.

## Execution step sequence (ExecutionPlan / ExecutionResult)

Canonical ordered steps (stable and replayable):

Simulation mode:

1. `validate_approval_package_v1`
2. `enumerate_preview_pages_v1`
3. `compute_target_artifacts_v1`
4. `emit_execution_result_v1`

Materialize mode:

1. `validate_approval_package_v1`
2. `enumerate_preview_pages_v1`
3. `compute_target_artifacts_v1`
4. `materialize_static_output_bundle_v1`
5. `emit_execution_result_v1`

## Output directory rule (materialize mode)

- If `outputRootDir` is provided by caller, writes there (`caller_provided_output_root_v1`).
- Otherwise, writes to deterministic default under import root (`deterministic_default_under_import_root_v1`) via static bundle rule:
  - `<importRootDir>/.gnr8-static-output/<inputContentSha256-first-16>`
- Core execution logic never hardcodes machine-specific absolute paths.

## Result surface (materialize mode)

Execution result includes:

- `executionMode`
- execution `status`
- `trace` (`approvalPackageId`, `executionPlanId`)
- `materialization.outputRootPath`
- `materialization.summary` (page/asset totals, copied/missing/skipped/failed counts)
- explicit `pageFiles` / `assetFiles` records
- `blockingReasons` and `warningCodes`

## Where artifacts live in the runtime flow

- Deterministic builders:
  - `apps/platform/gnr8/migration/approval-package-model.ts`
  - `apps/platform/gnr8/migration/execution-plan-model.ts`
  - `apps/platform/gnr8/migration/execution-result-model.ts`
  - `apps/platform/gnr8/migration/static-output-bundle.ts`
- Runtime entrypoint:
  - `apps/platform/gnr8/migration/runtime/run-linear-migration-phase1-approve-execute.ts`
