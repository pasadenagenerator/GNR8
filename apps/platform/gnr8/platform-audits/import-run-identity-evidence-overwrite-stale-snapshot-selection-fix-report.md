# Import Run Identity / Evidence Overwrite / Stale Snapshot Selection Fix Report

## 1. Exact stale truth-loss point found
- URL snapshot identity was split incorrectly:
  - Stable identity: `snapshotId = imported-url-site-<url-hash16>`.
  - Execution identity: **missing**.
- Evidence artifacts were written directly to the stable path:
  - `<snapshotBase>/<snapshotId>/...`
- Repeated imports of the same URL therefore shared paths for `rendered-capture.json`, `acquisition-evidence.json`, diagnostics, and all capture artifacts.
- This enabled cross-run truth contamination and made stale failure truth difficult to supersede deterministically.

## 2. Import/run identity behavior before fix
- Before:
  - `snapshotId` was deterministic by normalized URL.
  - `snapshotRootDirAbs` was also deterministic by URL (no per-run segregation).
  - Worker request `importId` reused `snapshotId`.
- After:
  - `snapshotId` remains stable (backward compatible site-level identity).
  - New `snapshotRunId` is created for every execution.
  - New run root path:
    - `<snapshotBase>/<snapshotId>/runs/<snapshotRunId>/...`
  - Worker request `importId` now includes run identity:
    - `<snapshotId>:<snapshotRunId>`
  - `latest-run.json` is written under stable root to point to authoritative latest execution evidence.

## 3. Evidence overwrite or stale selection bug found
- Found bug:
  - Shared snapshot/evidence path by URL caused stale reuse risk and ambiguous authority across executions.
- Fix:
  - Evidence is now run-isolated (`runs/<snapshotRunId>`).
  - Previous run evidence is preserved (not destructively merged into current run).
  - Current run root is clean-created before write.
  - `latest-run.json` gives explicit latest-evidence pointer.

## 4. Diagnostics persistence/selection fix
- Added explicit run/evidence diagnostics:
  - `IMPORT_RUN_ID_CREATED`
  - `EVIDENCE_RUN_ISOLATED`
  - `STALE_EVIDENCE_SUPERSEDED` (when prior runs exist)
- Added provenance-level selection markers:
  - `LATEST_EXECUTION_EVIDENCE_SELECTED`
  - `FALLBACK_EVIDENCE_SUPERSEDED_BY_RENDERED_CAPTURE` (when applicable)
- Result:
  - Fresh runs no longer silently inherit stale failure-only diagnostics as authoritative truth.

## 5. Read-model/evidence selection fix
- Runtime row selection for Site Workspace was hardened:
  - Previously version-first ordering across all rows could prefer stale cross-site/version drift.
  - Now execution recency (`updated_at`, then `created_at`) is preferred, with capture-status signal and version as tie-breakers.
- Runtime provenance now carries execution identity (`snapshotId`, `snapshotRunId`, stable/run roots), and read-model evidence refs include run root.

## 6. Manual validation results
- Manual command run against `https://chs.sandbox.generator.live/` (twice, with `.env.production` loaded) produced:
  - same stable `snapshotId`: `imported-url-site-b4fd72ae4a7f651e`
  - distinct `snapshotRunId` values per execution
  - distinct run paths under `.../runs/<snapshotRunId>`
  - second run emitted `STALE_EVIDENCE_SUPERSEDED`
  - selected source path pointed to current run root, not stale root
- In this local environment, worker remained not configured (`CAPTURE_WORKER_NOT_CONFIGURED` / `CAPTURE_WORKER_UNAVAILABLE`), so rendered-capture-success UI validation could not be fully reproduced locally.

## 7. Limitations
- Live UI proof for "successful worker run becomes Site Workspace truth" requires a runtime where worker is reachable/configured for this environment.
- Local run confirmed run isolation and stale supersession semantics, but did not confirm worker-success branch end-to-end due environment configuration.

## 8. Next-step recommendation
- Run one production-like import where worker is confirmed healthy/reachable and verify Site Workspace reads latest execution row + latest run evidence path.
- Keep `snapshotId` stable for continuity, and treat `snapshotRunId` as authoritative execution identity everywhere evidence/provenance is read.
