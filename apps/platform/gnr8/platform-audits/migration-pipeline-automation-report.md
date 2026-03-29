# Migration Pipeline Automation Report

## 1) State Rules

Deterministic rules implemented in `apps/platform/gnr8/command-center/migration-state-automation.ts`:

- `LIVE`
  - `latest_runtime_state = PUBLISHED`
  - or `has_published_runtime_version = true` when latest runtime state is missing
- `APPROVED`
  - `latest_runtime_state = APPROVED`
- `PREVIEW_READY`
  - `latest_runtime_state = READY_FOR_REVIEW`
- `IMPORTED`
  - `latest_runtime_state = DRAFT`
  - or `latest_runtime_state = ARCHIVED` without published history
  - or runtime site version id exists without higher lifecycle evidence
  - or migration events exist without higher lifecycle evidence
- `NOT_STARTED`
  - no runtime lifecycle evidence, no runtime version evidence, no migration evidence, and no error evidence
- `ERROR`
  - unknown runtime lifecycle state
  - or explicit site error/failure signal when no stronger deterministic migration evidence exists

## 2) Automation-Safe Transitions

Auto-advance is flagged only for strict forward lifecycle movement:

- `NOT_STARTED -> IMPORTED -> PREVIEW_READY -> APPROVED -> LIVE`
- No auto-advance into `ERROR`
- No auto-advance from `ERROR`
- Effective state is always canonical derived state; `auto_advanced` is metadata for operator visibility

## 3) Evidence Sources Used

Evidence is derived from the existing consolidated Command Center read model payload:

- `sites.status`
- `migration_cost_events` aggregate (`migration_event_count`)
- `gnr8_runtime_site_versions` snapshot:
  - latest runtime lifecycle state
  - latest runtime site version id
  - published-history boolean

No per-row fan-out queries were introduced.

## 4) What Remains Manual

- Import initiation
- Preview generation
- Approval action
- Publish action
- All governance-sensitive transitions and approvals

Automation does not auto-approve or auto-publish.

## 5) Limitations

- V1 does not persist derived status to a dedicated migration status store.
- V1 uses runtime lifecycle and migration evidence only; richer conflict diagnostics are intentionally conservative.
- Runtime state conflicts are treated conservatively (`ERROR`) when state is unknown.

## 6) Next Step Recommendations

- Add bounded, idempotent persistence of `effective_status` only for forward-safe transitions.
- Add explicit conflict diagnostics in the read model (`conflict_flags`) for operator triage.
- Add API-level regression tests around Command Center row payload shape (`effective_status`, `auto_advanced`, `automation_reason`).
