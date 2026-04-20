# Import Severity And Blocking Policy (Task 21)

## Deterministic categories

### Structural blockers
Import is treated as structurally blocking when any of the following is true:
- `ImportOutput.status === "failed"`.
- Any import diagnostic has severity `fatal`.
- Any import diagnostic has severity `error` **except** the explicit non-structural degraded asset codes.
- No structurally usable document exists (`rawDomSnapshot.documents.length === 0` or no document has parsed `dom`).

### Non-structural degraded issues
These remain visible and traceable, but do not block deterministic phase-1 progression by themselves:
- `missing_local_asset`
- `unsupported_remote_asset`
- `unsupported_data_url_asset`

## Manifest status computation

`ImportManifest.status` is computed as:
- `failed` when structural blockers exist.
- `success_with_warnings` when no structural blocker exists and at least one import diagnostic exists.
- `success` otherwise.

## `import_intake` blocking computation

`import_intake` is blocked only when structural blockers exist (or `ImportManifest.status === "failed"`).

When blocked:
- stage status is `failed`
- stage emits `PIPELINE_BLOCKED_BY_IMPORT`
- downstream pipeline stages are skipped

When not blocked:
- stage status is `success`
- downstream stages proceed (possibly in degraded warning mode)

## Visibility and propagation

- All import diagnostic codes are still propagated into pipeline diagnostics.
- Non-structural degraded asset diagnostics are carried as pipeline warnings for approval/execution warning-mode flow.
- Diagnostic codes remain visible in:
  - import diagnostics and manifest summaries
  - pipeline diagnostics
  - approval warning codes
  - execution warning codes
  - migration run report warning summaries
