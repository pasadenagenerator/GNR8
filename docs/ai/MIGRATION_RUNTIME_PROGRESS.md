# GNR8 Migration Runtime Progress

## Purpose

Track migration-first MVP runtime progress separately from Website OS work.

## Current Status

Migration Runtime + Command Center MVP is operational and smoke-tested through Phase 6C-A2.

Phase 5A adds Command Center migration batch list/detail UI, batch summary, diagnostics, failure reporting, timeline visibility, and operator run/resume controls. Execution remains operator-driven. Queue/worker orchestration and unattended execution do not exist yet.

Phase 6A adds read-only Hosting Operations observability for Command Center, including hosting overview/detail surfaces, readiness reporting, diagnostics reporting, and production smoke verification. Hosting execution remains read-only.

Phase 6B completes Hosting Operations Workflow Review.

Phase 6C-A adds Readiness & Domain Operations MVP surfaces for runtime readiness drilldown, domain operations visibility, DNS instruction visibility, domain recheck workflow visibility, and asset diagnostics summary.

Phase 6C-A2 separates internal/working domains from external/custom domains so operators can distinguish platform working URLs from customer-owned domains.

Website OS runtime expansion remains paused.

## Critical Path

Import -> CMS -> Renderer -> Durable Jobs -> Durable Batches -> Batch Execution -> Batch Execution Observability -> Command Center -> Hosting Operations -> Asset Diagnostics Drilldown -> Billing

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
- diagnostics reporting

Fix included:
- ownership site ID -> runtime site ID resolution.

Execution boundary:
- READ ONLY.
- No publish execution.
- No rollback workflow UI.
- No DNS execution.
- No domain execution.

Next milestone:
- Phase 6B — Hosting Operations Workflow Review

### Phase 6B — Hosting Operations Workflow Review

Goal:
- Review Hosting Operations workflow coverage after the Phase 6A observability MVP.

Completed:
- Confirmed Hosting Operations remains an operator visibility surface.
- Confirmed publish workflow remains read-only from Hosting Operations.
- Confirmed rollback workflow UI remains excluded.
- Confirmed no DNS/provider execution belongs in the current Hosting Operations surface.

Execution boundary:
- READ ONLY.
- No publish execution.
- No rollback workflow UI.
- No DNS execution.
- No provider execution.

### Phase 6C-A — Readiness & Domain Operations MVP

Goal:
- Extend Hosting Operations with readiness and domain operations visibility for operator review.

Implementation summary:
- Added runtime readiness drilldown visibility.
- Added domain operations visibility.
- Added DNS instruction visibility.
- Added domain recheck workflow visibility.
- Added asset diagnostics summary visibility.
- Kept Hosting Operations as a read-only operational surface.

Production verification:
- `/gnr8/command-center/hosting` loaded successfully.
- `/gnr8/command-center/hosting/[siteId]` loaded successfully.
- Hosting Overview and Hosting Detail rendered successfully.
- Runtime readiness, readiness drilldown, DNS instructions, domain recheck workflow, and asset diagnostics summary rendered successfully.

Explicit exclusions:
- No publish workflow controls.
- No rollback workflow UI.
- No DNS execution.
- No provider execution.
- No runtime mutation.
- No migration, schema, or test changes in this documentation checkpoint.

### Phase 6C-A2 — Internal vs Custom Domain Visibility

Goal:
- Separate internal/working domains from external/custom domains in Hosting Operations visibility.

Implementation summary:
- Documented internal/working domain visibility as distinct from external/custom domain visibility.
- Clarified that working domains are platform/internal reachability surfaces.
- Clarified that custom domains are customer-owned external domain surfaces.
- Kept DNS instructions and domain recheck workflow visible without adding provider execution.

Production verification:
- `/gnr8/command-center/hosting` loaded successfully.
- `/gnr8/command-center/hosting/[siteId]` loaded successfully.
- Internal/working domains and external/custom domains rendered as separate operator-visible concepts.
- Production readiness and domain operations smoke verification completed successfully.

Explicit exclusions:
- No DNS/provider execution was introduced.
- No custom domain automation was introduced.
- No publish workflow controls were introduced.
- Rollback UI remains intentionally excluded.
- Hosting Operations remains read-only.

## Current State

Hosting Operations MVP is complete through:
- Phase 6A
- Phase 6B
- Phase 6C-A
- Phase 6C-A2

## Current Remaining Work

### Near-term

- Phase 6C-B — Asset Diagnostics Drilldown
- Billing Reality Check

### Optional Runtime UX

- Job detail page
- Stage diagnostics explorer
- Advanced batch filters

### Later

- DNS/domain onboarding hardening

### Deferred

- rollback workflow
- publish workflow controls
- CDN/object-storage strategy
- synthetic monitoring
- provider execution automation

## Explicitly Paused

- Website OS runtime expansion
- Execution Artifact Runtime family
- autonomous Website OS loops
- provider execution
