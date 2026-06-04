# GNR8 Migration Runtime Progress

## Purpose

Track migration-first MVP runtime progress separately from Website OS work.

## Current Status

Migration Runtime + Command Center MVP is operational and smoke-tested through Phase 6A.

Phase 5A adds Command Center migration batch list/detail UI, batch summary, diagnostics, failure reporting, timeline visibility, and operator run/resume controls. Execution remains operator-driven. Queue/worker orchestration and unattended execution do not exist yet.

Phase 6A adds read-only Hosting Operations observability for Command Center, including hosting overview/detail surfaces, readiness reporting, diagnostics reporting, rollback visibility, and production smoke verification. Hosting execution remains read-only.

Website OS runtime expansion remains paused.

## Critical Path

Import -> CMS -> Renderer -> Durable Jobs -> Durable Batches -> Batch Execution -> Batch Execution Observability -> Command Center -> Hosting Operations -> Billing

## Completed Reality Checks

- Production Migration Gap Analysis
- CMS Reality Check
- Renderer Reality Check
- Durable Migration Orchestration Reality Check

## Completed Implementation Milestones

### CMS Slot Materialization

Goal:
- Materialize CMS content slots from canonical scoped imports.

Files changed summary:
- Reused `inferContentSlotsFromSemanticImport`.
- Persisted inferred slots through `upsertContentSlots`.
- Kept the slot model aligned with scoped import semantics.

Diagnostics added:
- Added diagnostics for CMS slot inference and materialization visibility.

Tests passed:
- CMS materialization tests pass.

Remaining gaps:
- This proves slot materialization, not full editorial workflow coverage.
- Public rendering still depends on the migration MVP renderer path.

### Migration MVP Renderer Proof

Goal:
- Prove the migration MVP public renderer path with published CMS overrides.

Canonical MVP renderer:
- The canonical MVP renderer is the raw imported/raw-template runtime renderer.
- The React renderer is not canonical for migration MVP.
- Deterministic artifact rendering remains fallback, integrity, and active-pointer support.

Public published override proof:
- Public raw-template rendering applies published CMS overrides.
- Draft CMS overrides are excluded from public output.

Tests passed:
- Migration MVP renderer path is proven by test.

Remaining risks:
- Renderer coverage is proven for the MVP path, not for every future rendering mode.
- React rendering remains outside the canonical migration MVP path.

### Phase 1 — Durable Migration Job Store

Goal:
- Persist migration job state, stages, events, and activation history in Postgres.

Tables:
- `gnr8_migration_jobs`
- `gnr8_migration_job_stages`
- `gnr8_migration_job_events`
- `gnr8_migration_job_activation_history`

Store:
- Added `PostgresMigrationJobStore`.
- Failed jobs can be reloaded and resumed through a new `MigrationFactory`.

Tests:
- DB-backed migration job store tests pass.

DB verification:
- Real Postgres verification passed for the durable job store.

Remaining gaps:
- Phase 1 stores durable job state only.
- It does not introduce batch execution, queue workers, provider execution, DNS execution, or billing automation.

### Phase 2 — Durable Migration Runtime Wiring

Goal:
- Wire durable job persistence into the migration factory runtime and expose admin job controls.

Runtime factory:
- Added `createMigrationFactoryRuntime`.
- Durable mode uses `PostgresMigrationJobStore`.
- Durable mode fails closed when required DB configuration is missing.

Admin job routes:
- `POST /api/gnr8/admin/migration-jobs`
- `GET /api/gnr8/admin/migration-jobs/[jobId]`
- `POST /api/gnr8/admin/migration-jobs/[jobId]/resume`

Tests:
- Real Postgres admin route tests pass.

Remaining gaps:
- Phase 2 wires durable job administration only.
- It does not introduce batch execution, provider execution, DNS execution, billing automation, or autonomous execution.

### Phase 3 — Durable Batch Migration Model

Goal:
- Add durable batch state and batch/job membership APIs for migration batches.

Tables:
- `gnr8_migration_batches`
- `gnr8_migration_batch_jobs`

Store:
- Added `PostgresMigrationBatchStore`.
- Added batch serializers and admin route handlers.

Admin batch routes:
- `POST /api/gnr8/admin/migration-batches`
- `GET /api/gnr8/admin/migration-batches`
- `GET /api/gnr8/admin/migration-batches/[batchId]`
- `POST /api/gnr8/admin/migration-batches/[batchId]/jobs`
- `DELETE /api/gnr8/admin/migration-batches/[batchId]/jobs/[jobId]`

Aggregate progress model:
- Batch aggregate progress derives from durable job states.

Tests:
- Real Postgres batch route/store tests pass.

Remaining gaps:
- Phase 3 is durable state/model/API only.
- It does not execute batches.
- It does not add queue or worker behavior.
- It does not introduce provider execution, DNS execution, billing automation, or autonomous execution.

### Phase 4A — Operator Driven Batch Execution

Goal:
- Execute durable migration batches through operator-triggered sequential run/resume APIs.

Completed:
- `MigrationBatchExecutor`
- sequential execution
- durable batch execution
- run/resume APIs
- execution events
- status transitions
- `stop_on_failure`
- `continue_on_failure`
- `maxJobs` support
- completed-job skipping
- durable batch event persistence

Execution model:
- Batch execution is operator-driven and sequential.
- Execution is durable through persisted batch/job states and batch events.
- Queue/worker orchestration is not implemented.
- Unattended orchestration is not implemented.

Verification:
- local tests passed
- real Postgres tests passed (7/7)

Remaining gaps:
- execution timeline visibility
- batch diagnostics surface
- operator observability
- Command Center integration
- queue/worker orchestration
- retry scheduling
- leases/heartbeat

### Phase 4B — Batch Execution Observability

Goal:
- Add durable read surfaces for operator visibility into batch execution state.

Completed:
- observability read model
- batch execution summary
- execution timeline
- failure surface
- diagnostics surface
- observability API
- timeline API

Verification:
- local tests passed (8/8)
- real Postgres verification passed (1/1)

Execution model:
- Execution remains operator-driven.
- Queue/worker orchestration is not implemented.
- Unattended orchestration is not implemented.

Remaining gaps:
- Command Center integration
- operator UI
- batch execution dashboard
- retry controls
- queue/worker orchestration
- leasing/heartbeat
- advanced operational metrics

### Phase 5A — Command Center Integration MVP

Goal:
- Integrate durable migration batches and batch observability into Command Center operator surfaces.

Completed:
- migration batch list page
- migration batch detail page
- batch summary
- diagnostics
- failure surface
- timeline surface
- run control
- resume control
- service layer
- view model layer

Production smoke-test routes:
- `/gnr8/command-center/migration-batches`
- `/gnr8/command-center/migration-batches/migration_batch_smoke_test_demo_v1`

Production smoke-test observations:
- batch loaded successfully
- summary rendered
- diagnostics rendered
- failures rendered
- timeline rendered
- completed jobs rendered
- pending jobs rendered
- failed jobs rendered

Verification:
- automated tests passed
- production smoke test passed
- DB connection pressure fix validated
- EMAXCONNSESSION issue resolved through composed server read path

Execution model:
- Execution remains operator-driven.
- Queue/worker orchestration is not implemented.
- Retry scheduling is not implemented.
- Unattended orchestration is not implemented.

Remaining gaps:
- job detail page
- stage diagnostics explorer
- advanced batch filters
- hosting hardening
- billing foundation

### Phase 6A — Hosting Operations MVP

Goal:
- Add read-only hosting operations observability to Command Center.

Completed:
- Hosting read model
- Hosting API
- Hosting overview UI
- Hosting detail UI
- Runtime readiness visibility
- Domain readiness visibility
- Asset diagnostics visibility
- Rollback candidate visibility
- Runtime diagnostics visibility

Production smoke-test routes:
- `/gnr8/command-center/hosting`
- `/gnr8/command-center/hosting/[siteId]`

Verification:
- Production smoke test passed.

Verified:
- hosting overview route
- hosting detail route
- active version visibility
- active artifact visibility
- readiness reporting
- rollback reporting
- diagnostics reporting

Fix included:
- ownership site ID -> runtime site ID resolution.

Execution boundary:
- READ ONLY.
- No publish execution.
- No rollback execution.
- No DNS execution.
- No domain execution.

Next milestone:
- Phase 6B — Hosting Operations Workflow Review

## Current Remaining Work

### Near-term

- Phase 6B — Hosting Operations Workflow Review
- Billing Reality Check

### Optional Runtime UX

- Job detail page
- Stage diagnostics explorer
- Advanced batch filters

### Later

- DNS/domain onboarding hardening

## Explicitly Paused

- Website OS runtime expansion
- Execution Artifact Runtime family
- autonomous Website OS loops
- provider execution
