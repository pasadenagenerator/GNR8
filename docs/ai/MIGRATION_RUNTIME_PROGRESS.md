# GNR8 Migration Runtime Progress

## Purpose

Track migration-first MVP runtime progress separately from Website OS work.

## Current Status

Migration Runtime + Command Center MVP is operational and smoke-tested through Phase 7B.

Phase 5A adds Command Center migration batch list/detail UI, batch summary, diagnostics, failure reporting, timeline visibility, and operator run/resume controls. Execution remains operator-driven. Queue/worker orchestration and unattended execution do not exist yet.

Phase 6A adds read-only Hosting Operations observability for Command Center, including hosting overview/detail surfaces, readiness reporting, diagnostics reporting, and production smoke verification. Hosting execution remains read-only.

Phase 6B completes Hosting Operations Workflow Review.

Phase 6C-A adds Readiness & Domain Operations MVP surfaces for runtime readiness drilldown, domain operations visibility, DNS instruction visibility, domain recheck workflow visibility, and asset diagnostics summary.

Phase 6C-A2 separates internal/working domains from external/custom domains so operators can distinguish platform working URLs from customer-owned domains.

Phase 6C-B completes Asset Diagnostics Drilldown, including asset diagnostics summary, severity classification, remediation guidance, and empty-state handling on hosting detail.

Phase 6C completes Hosting Hardening, Active Serving Consistency, Imported Runtime Reconciliation, Governance Reconciliation, Publish Lineage Reconciliation, and Host-Binding Raw Template Serving.

Phase 6D completes Mono Map Compatibility Restoration and Maver Production Validation.

Phase 6 is COMPLETE.

Phase 7B completes static Multi-Page Import MVP validation, including discovery integration, controlled child-page acquisition, route-map assembly, controlled route-map preview, internal link rewriting, validation, real website smoke testing, operator visibility, and operator validation completion.

Phase 7B is COMPLETE.
Phase 7B classification is SUCCESSFUL.
Phase 7B operator classification is A. Operator Ready.

Website OS runtime expansion remains paused.

## Critical Path

Import -> CMS -> Renderer -> Durable Jobs -> Durable Batches -> Batch Execution -> Batch Execution Observability -> Command Center -> Hosting Operations -> Hosting Hardening -> Multi-Page Import MVP -> Phase 7C Discovery Expansion -> Billing

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

### Phase 6C-B — Asset Diagnostics Drilldown

Goal:
- Extend Hosting Operations detail visibility with asset diagnostics drilldown for operator review.

Implementation summary:
- Documented asset diagnostics summary visibility on hosting detail.
- Documented severity classification for asset diagnostics.
- Documented remediation guidance for asset diagnostics findings.
- Documented empty-state handling when no asset diagnostics are present.
- Kept Asset Diagnostics Drilldown inside the read-only Hosting Operations surface.

Production verification:
- `/gnr8/command-center/hosting` loaded successfully.
- `/gnr8/command-center/hosting/[siteId]` loaded successfully.
- Hosting detail rendered asset diagnostics summary successfully.
- Severity classification rendered successfully.
- Remediation guidance rendered successfully.
- Empty-state handling rendered successfully.
- Production asset diagnostics drilldown smoke verification completed successfully.

Explicit exclusions:
- No runtime code changes in this documentation checkpoint.
- No migrations.
- No tests.
- No publish workflow controls.
- No rollback workflow UI.
- No DNS execution.
- No provider execution.
- No CDN/object storage strategy changes.
- No synthetic monitoring.
- No provider execution automation.

### Phase 6 Final Completion — Hosting Operations + Hosting Hardening

Goal:
- Close the full Phase 6 track after production validation.

Phase 6C completion summary:
- Hosting Hardening completed.
- Active Serving Consistency completed.
- Canonical Active Serving Resolution completed.
- Imported Runtime Reconciliation completed.
- Governance Reconciliation completed.
- Publish Lineage Reconciliation completed.
- Host-Binding Raw Template Serving completed.
- Raw imported production serving completed.

Phase 6D completion summary:
- Mono Map Compatibility Restoration completed.
- Compatibility-based runtime adaptation validated in production.
- OpenStreetMap compatibility fallback validated.
- Maver Production Validation completed.

Production Maver validation summary:
- Maver (`transportimaver.si`) successfully serves through the GNR8 runtime.
- Active pointer resolution validated.
- Host binding resolution validated.
- Raw imported artifact serving validated.
- Governance enforcement validated.
- Publish activation validated.
- Imported runtime reconciliation validated.
- Asset serving validated.
- Compatibility rendering validated.
- OpenStreetMap compatibility fallback validated.
- Result: pixel-perfect production clone successfully served through GNR8 runtime.

Provider Architecture decision summary:
- Canonical provider architecture has three provider classes: Infrastructure Providers, Runtime Service Providers, and Compatibility Providers.
- Compatibility Providers convert source-system functionality into GNR8-native blocks rendered through approved runtime providers.
- Mono Map compatibility uses the compatibility provider path: Mono Map -> extract address/coords -> generate GNR8 Map Block -> render through Leaflet/OpenStreetMap Runtime Provider.

Execution boundary:
- Hosting Operations remains read-only.
- No DNS/provider execution was introduced.
- No rollback workflow UI was introduced.
- No autonomous execution was introduced.

Status:
- Phase 6 COMPLETE.

Next milestone at Phase 6 closure:
- Phase 7B — Multi-Page Import MVP

### Phase 7B — Multi-Page Import MVP

Goal:
- Move GNR8 from single-page import validation to static multi-page website import validation.

Scope boundary:
- Static websites only.
- No dynamic content.
- No commerce.
- No CMS expansion.
- No public production multi-page activation.
- No sitemap or robots discovery yet.

Completed:
- 7B-1 Discovery Integration.
- 7B-2 HTML Acquisition.
- 7B-3 Raw Artifact Assembly.
- 7B-4 Controlled Route-Map Preview.
- 7B-5 Internal Link Rewriting.
- 7B-6 Validation Engine.
- 7B-7 Real Website Smoke Testing.
- 7B-8 Operator Visibility.
- 7B-9 Operator Verification.
- 7B-10 Operator Validation Completion.

Implementation summary:
- Added discovery-only integration with `multiPageDiscovery`, route candidate discovery, and manifest persistence in provenance.
- Added controlled child-page acquisition with acquisition manifest, acquisition diagnostics, and fetched-page evidence persistence.
- Added deterministic route-map assembly with multi-page raw artifact evidence, `routeMap` persistence, and `htmlPathMap` persistence.
- Added preview-only route-map resolver with nested route support, explicit route misses, and route-map diagnostics.
- Added controlled preview link rewriting with route-aware navigation, route normalization reuse, and deterministic diagnostics.
- Added multi-page preview validation with readiness classification, warnings, blockers, route validation, and link validation.
- Added Multi-Page Import operator summary, route tables, discovery/acquisition/assembly visibility, and validation visibility.
- Completed validation status alignment, recommendation generation, warning/blocker visibility, operator-readable diagnostics, and developer diagnostics isolation.

Readiness statuses:
- ready
- ready_with_warnings
- blocked

Real website validation:
- Viroidoc: discovery successful, acquisition successful, assembly successful, preview successful.
- Paul Graham: discovery successful, acquisition successful, assembly successful, route-limit warnings surfaced correctly.

Finding resolved:
- Initial assembly blocker from apex/www canonical-host mismatch was discovered and fixed.

Capabilities proven:
- internal page discovery
- multi-page acquisition
- route-map assembly
- child-page preview rendering
- internal navigation rewriting
- route validation
- operator diagnostics
- static website import readiness evaluation

Operator readiness:
- Operators can determine import readiness, remaining warnings, blockers, and next actions without provenance JSON, debug endpoints, or database inspection.

Explicitly not included:
- sitemap.xml discovery
- robots.txt discovery
- canonical URL expansion
- dynamic content import
- CMS page-scoped materialization
- commerce import
- compatibility-provider extraction
- public production multi-page serving
- automatic publish activation

Status:
- Phase 7B COMPLETE.
- Classification: SUCCESSFUL.
- Operator Classification: A. Operator Ready.

Next milestone:
- Phase 7C — Discovery Expansion.
- Static websites only.
- No dynamic content.
- No commerce.
- No compatibility-provider work yet.

## Current State

Hosting Operations state:

Completed:
- Phase 6A
- Phase 6B
- Phase 6C-A
- Phase 6C-A2
- Phase 6C-B
- Phase 6C
- Phase 6D
- Phase 7B

Hosting Operations MVP complete.
Hosting Hardening complete.
Phase 6 complete.
Phase 7B complete.

## Current Remaining Work

### Near-term

- Phase 7C — Discovery Expansion
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
- CDN/object storage strategy
- synthetic monitoring
- provider execution automation
- advanced hosting hardening

## Explicitly Paused

- Website OS runtime expansion
- Execution Artifact Runtime family
- autonomous Website OS loops
- provider execution
