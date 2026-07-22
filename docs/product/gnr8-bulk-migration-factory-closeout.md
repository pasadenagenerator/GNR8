# GNR8 Bulk Migration Factory Closeout

BMF-1 closeout for Bulk Migration Factory design.

BMF-1 is a documentation and architecture phase only. No runtime behavior, APIs, database schemas, migrations, worker behavior, import behavior, Command Center runtime/UI behavior, billing/Stripe behavior, DNS/domain behavior, provider execution, publishing, rollback, thumbnails, Generated Proposal Bundles, Workspace runtime, or Evolution runtime were intentionally changed.

## BMF-1 Status

BMF-1 is complete pending architectural review.

The repository now contains implementation-ready design documentation for the Bulk Migration Factory MVP:

- Bulk intake and validation model.
- Batch lifecycle.
- Site-level lifecycle within a batch.
- Non-destructive dry-run model.
- Operator-assisted execution model.
- Retry/replay boundaries.
- Failure taxonomy.
- Stop/continue policy.
- Command Center requirements.
- Ops Inbox derived work item requirements.
- BMF audit event taxonomy.
- Conceptual data/artifact contracts.
- Future implementation validation plan.
- Architecture warnings.

## Files Reviewed

Required MVP-1 documents were present and reviewed:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`
- `docs/product/future-gnr8-mvp-bridge.md`
- `docs/product/future-gnr8-strategy-closeout.md`
- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-mvp-readiness-map.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Implementation evidence inspected read-only:

- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/gnr8/migration/**`
- `apps/platform/gnr8/site/**`
- `apps/platform/gnr8/runtime/**`
- `apps/platform/gnr8/command-center/**`
- `apps/platform/app/gnr8/command-center/**`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/app/api/gnr8/admin/migration-jobs/**`
- `apps/platform/app/api/gnr8/admin/migration-batches/**`
- `apps/platform/gnr8/multipage-import/**`
- `apps/platform/gnr8/import-rendered-capture/**`
- `apps/platform/gnr8/rendered-capture-worker-server/**`
- `apps/worker/gnr8/**`
- `apps/platform/supabase/migrations/**`
- `packages/data/src/repositories/**`
- `packages/core/src/modules/**`

## Files Created Or Changed

Created:

- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`

Changed:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` was updated to reference the new BMF-1 documents as canonical architecture/product docs.

## MVP-1 Repository Status

At BMF-1 start, all required MVP-1 documents existed.

`git status --short -- <required MVP-1 files>` reported:

- Modified: `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- Untracked: `docs/architecture/gnr8-mvp-operational-state-model.md`
- Untracked: `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- Untracked: `docs/product/gnr8-mvp-boundary-closeout.md`
- Untracked: `docs/product/gnr8-mvp-boundary.md`
- Untracked: `docs/product/gnr8-mvp-supported-site-classes.md`
- No status output for the other required MVP-1 docs, indicating they were tracked and clean at inspection time.

BMF-1 did not normalize, revert, stage, or commit pre-existing MVP-1 status.

## Current Implementation Evidence Summary

| Area | Evidence | Classification |
| --- | --- | --- |
| Existing batch tables/stores | `gnr8_migration_batches`, `gnr8_migration_batch_jobs`, `PostgresMigrationBatchStore` | Implemented |
| Existing job tables/stores | `gnr8_migration_jobs`, `gnr8_migration_job_stages`, `gnr8_migration_job_events`, activation history, `PostgresMigrationJobStore` | Implemented |
| Existing stage/event model | Fixed stages and job/batch event enums | Implemented but narrower than BMF taxonomy |
| Existing batch executor | `MigrationBatchExecutor` | Implemented for operator-driven sequential execution |
| Queue/worker orchestration | Worker registrations do not include BMF queue worker | Not implemented/future candidate |
| Current batch pages | Command Center migration batch list/detail | Implemented |
| Current Command Center read models | Site/cost/runtime read model, batch observability | Partially implemented for BMF |
| Current import route behavior | Client-scoped URL import validates agency/client and source URL, preallocates runtime identity, runs scoped pipeline, links ownership | Implemented |
| Current scoped import pipeline | Static import, provenance, raw artifacts, evidence baseline, content slots, artifacts, multi-page evidence | Implemented |
| Current multi-page discovery | Discovery, sitemap/robots/canonical/redirect/alias evidence, route limits, acquisition/assembly, operator summary | Partially implemented for controlled static cases |
| Current rendered capture | Capture contract, service, worker server, site render capture worker, status/diagnostics | Implemented with external variance |
| Current worker coverage | Template processing, site bootstrap, site render capture, domain verification, static import helpers | Partially implemented; no BMF queue worker |
| Current audit/event coverage | Generic audit log, migration job/batch events, publish/content/domain/provider event stores | Partially implemented; BMF taxonomy not unified |
| Current tests | Migration factory, route, multipage, capture, worker, runtime tests | Implemented for existing foundations; BMF lifecycle tests missing |
| Provider execution | Provider control-plane/dry-run/readiness artifacts exist | Prepared/deferred; forbidden for BMF MVP execution |
| Openprovider live DNS mutation | Read-only/sandbox/control-plane evidence only | Deferred/forbidden before ADR |

## Bulk Migration Factory Design Summary

BMF MVP is an operator-assisted planning and execution factory for static or mostly static public websites. It turns validated intake rows into approved batch plans, runs non-destructive dry-runs, executes migration jobs only under human-approved policies, records deterministic evidence, and projects operator work through Command Center and derived Ops Inbox items.

The factory does not autonomously regenerate, publish, rollback, mutate DNS, execute providers, or perform billing/customer Stripe workflows.

## Bulk Intake Summary

MVP intake supports CSV and manual entry as required paths. API intake is design-ready but must not bypass validation.

Required fields:

- Agency/client identifier.
- Site display name.
- Source URL.
- Intended launch domain or explicit no-custom-domain value.
- Site class guess.
- Migration priority.
- Operator owner.
- Approval owner or client reviewer if known.

Rows are normalized, deduped, classified, assigned owners, and blocked/deferred before any migration job is created.

## Batch Lifecycle Summary

BMF defines:

- `draft`
- `intake_validating`
- `intake_invalid`
- `ready_for_dry_run`
- `dry_run_running`
- `dry_run_completed`
- `dry_run_failed`
- `awaiting_batch_start_approval`
- `approved_to_start`
- `running`
- `paused`
- `partially_completed`
- `completed`
- `completed_with_failures`
- `blocked`
- `cancelled`
- `archived`

Each state has meaning, allowed/prohibited transitions, evidence, operator action, approval requirement, audit event, Command Center representation, Ops Inbox representation, and retry/replay implication in the lifecycle doc.

## Site-Level Lifecycle Summary

BMF defines batch-adapted site states:

- `intake_created`
- `intake_validated`
- `intake_blocked`
- `classified_supported`
- `classified_manual_review`
- `classified_import_only`
- `classified_out_of_scope`
- `import_pending`
- `import_running`
- `import_succeeded`
- `import_failed`
- `capture_degraded`
- `route_review_needed`
- `preview_ready`
- `review_pending`
- `review_blocked`
- `approval_pending`
- `approved_for_launch`
- `domain_pending`
- `domain_ready`
- `publish_ready`
- `published`
- `publish_failed`
- `rollback_required`
- `incident_open`
- `deferred`
- `archived_decommissioned`

Each state includes source-of-truth fields/artifacts, audit event, operator role, allowed/blocked actions, retry/replay policy, Command Center surface, and Ops Inbox item.

## Dry-Run Model

Dry-run is non-destructive, review-only planning evidence. It evaluates intake validity, duplicates, site class support, source reachability, capture risk, likely route count, unsupported indicators, domain assumptions, approvals, workload, risk, cost estimates where available, and recommended stop/continue policy.

Dry-run is not approval and cannot create public runtime changes, publish, mutate domains/DNS, execute providers, or start migration jobs.

## Execution Model

BMF MVP preserves current evidence as default:

- Operator-triggered.
- Sequential.
- Batch start approval required.
- `stop_on_failure` and `continue_on_failure` policies.
- `maxJobs`/cohort-like pause by limit.
- Completed-job skipping.
- Batch events and observability.

Queue workers, leases, heartbeat, retry scheduler, unattended orchestration, and concurrency are future implementation candidates only.

## Retry/Replay Model

BMF classifies each stage/action as:

- Replayable in MVP.
- Replayable with external variance.
- Manually repeatable only.
- Not replayable.
- Future replay candidate.
- Forbidden.

Publish activation, rollback, approvals, provider execution, live DNS mutation, billing mutation, and autonomous AI actions are not replayable BMF stages.

## Failure Taxonomy Summary

The taxonomy covers invalid intake, duplicate source URL, duplicate target domain, unsupported site class, source unavailable/blocked, TLS/SSL errors, rendered capture failures/degradation, route count/ambiguity, asset failures, unsupported forms/widgets/heavy JavaScript, import/runtime/preview/content failures, review rejection, approval missing, domain/DNS failures, publish readiness failure, publish failure, rollback required, cost anomaly, worker/system failure, and ambiguous unknown failure.

Each failure type defines severity, source of truth, detection point, owner, retry/replay eligibility, auto-pause rule, batch policy, Ops Inbox item, recovery evidence, and escalation requirement.

## Stop/Continue Policy Summary

Default policy:

- Low severity: continue batch; record warning.
- Medium severity: continue other sites; block affected site milestone.
- High severity: block affected site; continue batch only if isolated and policy allows.
- Critical severity: pause batch, publish wave, or affected cohort by default.

Critical triggers include duplicate target domain conflict, publish failure, rollback-required incident, cost anomaly threshold, repeated system/capture/import failures, forbidden provider/DNS/AI execution attempts, and unsupported site class entering launch readiness.

## Command Center Requirements Summary

Command Center must show batch list/status, progress counters, site class distribution, supported/manual-review/out-of-scope counts, import success/failure/degraded counts, route coverage, preview readiness, review status, approval status, domain readiness, publish readiness, incidents, cost indicators, owner assignment, next action, retry/replay controls, and runbook links.

Specialized pages remain drilldowns only.

## Ops Inbox Requirements Summary

Ops Inbox items are derived from canonical state and include:

- Intake blocked.
- Duplicate detected.
- Unsupported site class.
- Dry-run failed.
- Batch start approval needed.
- Import failed.
- Capture degraded.
- Route review needed.
- Preview failed.
- Review needed.
- Approval needed.
- Domain action needed.
- DNS verification failed.
- Publish readiness failed.
- Publish failed.
- Rollback needed.
- Incident open.
- Cost anomaly.
- Recovery evidence needed.

Completing a work item requires updating underlying canonical state/evidence.

## Audit Requirements Summary

BMF audit taxonomy includes bulk intake, validation, batch creation/dry-run/start/pause/resume/completion/cancellation, site classification/import/capture/retry/replay/recovery/defer/approval, domain action, publish readiness, incidents, and cost anomalies.

Every event requires actor, subject, payload, correlation IDs, immutable references, batch/site level, and human/system origin.

## Data And Artifact Contracts Summary

Conceptual contracts defined:

- `BulkIntake`
- `BulkIntakeRow`
- `SiteClassAssessment`
- `BatchPlan`
- `BatchDryRunResult`
- `MigrationBatch`
- `MigrationBatchSite`
- `MigrationStageResult`
- `FailureRecord`
- `RetryRequest`
- `ReplayRequest`
- `RecoveryRecord`
- `BatchAuditEvent`
- `OpsInboxItem`
- `CommandCenterBatchReadModel`

No schemas or TypeScript code were added.

## Future Validation Plan

BMF implementation must pass unit, integration, read-model, lifecycle, failure taxonomy, retry/replay, dry-run, Command Center read-model, Ops Inbox derivation, permission/approval, audit event, representative batch smoke, static fixture cohort, degraded capture fixture, unsupported class fixture, domain readiness fixture, and cost anomaly fixture tests before MVP readiness.

## Architecture Warnings

Critical warnings documented:

- Bulk factory accidentally becoming autonomous.
- Dry-run mistaken for approval.
- Ops Inbox becoming independent state store.
- UI pages becoming source of truth.
- Retry/replay re-running non-deterministic side effects.
- Rendered capture variance hiding source drift.
- Domain failures blocking entire portfolio unnecessarily.
- Publish failures continuing batch launch waves.
- Cost anomalies ignored during large migration.
- Unsupported site classes sneaking into launch.
- AI summaries being treated as canonical.
- Future queue/worker design implied before implementation.
- Overbuilding external integrations before migration MVP.

Most mitigations are required before implementation.

## Recommended Next Milestone

Recommended next milestone: Command Center and Ops Inbox Design.

Command Center and Ops Inbox Design should be next because BMF-1 defines the lifecycle, blockers, work item types, and operator actions, but the current Command Center/Ops Inbox read model and UX are only partially aligned with BMF. The next gate should map all BMF canonical state, derived projections, owner roles, allowed/blocked actions, and drilldowns into the primary operator surface.

Migration Factory MVP Implementation is not safe to start immediately after BMF-1 alone unless architectural review explicitly waives remaining design gates. The safer sequence remains:

1. Command Center and Ops Inbox Design.
2. Domain/DNS Operating Model Decision.
3. Audit, Replay, and Failure Recovery Design or explicit acceptance that BMF-1 covers enough for MVP.
4. Migration Factory MVP Implementation.

## Validation Performed

BMF-1 validation completed:

- Required MVP-1 docs exist.
- BMF docs exist.
- `git status --short` was reviewed.
- `git diff --stat` was reviewed.
- `git diff --name-only` was reviewed.
- The tracked diff is documentation-only and limited to `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`.
- The new BMF files are untracked Markdown documentation files under `docs/architecture/` and `docs/product/`.
- No runtime/API/schema/migration/worker/import/Command Center runtime/DNS/publish/rollback/billing/provider/thumbnail/Workspace/Evolution code was changed by BMF-1.

## Commands Run

Key commands used:

- `git status --short -- <required MVP-1 docs>`
- `ls <required MVP-1 docs>`
- `sed -n ... <required docs>`
- `rg --files <implementation evidence paths>`
- `rg -n <migration/domain/audit/cost table and behavior patterns>`
- `find <implementation evidence paths> -type f`
- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `git diff -- docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `wc -l <BMF-1 docs>`

Command outcomes are summarized in the final BMF-1 report.
