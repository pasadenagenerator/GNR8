# GNR8 Bulk Migration Factory Design

BMF-1 implementation-ready architecture for the GNR8 MVP Bulk Migration Factory.

This is a documentation and architecture artifact only. It does not authorize runtime behavior, API changes, database schemas, migrations, worker behavior, import behavior, Command Center runtime/UI changes, DNS/domain behavior, publishing, rollback, billing, Stripe, provider execution, thumbnails, Generated Proposal Bundles, Workspace runtime, Evolution runtime, or autonomous AI execution.

## MVP Definition

The Bulk Migration Factory is the operator-assisted portfolio workflow that turns a validated list of approximately 200 static or mostly static public websites into controlled migration batches, deterministic import jobs, reviewable previews, launch-readiness evidence, domain-readiness evidence, approvals, recoverable failures, and Command Center/Ops Inbox work.

The factory is not an autonomous migration machine. It plans, validates, records, and coordinates. Human operators start batches, pause/resume execution, approve exceptions, decide retries/replays, classify failures, request launch approvals, and control client/domain/publish safety.

## Repository Baseline

BMF-1 reconciles these MVP-1 rules:

- MVP scope is operator-assisted static/mostly static website migration for about 200 sites.
- Supported site classes are limited to static, mostly static, and manually reviewed public website classes.
- Runtime serving truth remains active pointer, site version, immutable artifacts, published overrides, and domain host binding state.
- Command Center is the primary operator surface.
- Ops Inbox is derived from canonical state and must not store independent truth.
- Dry-run is non-destructive and never approval.
- AI/provider outputs are advisory/review-only and never source of truth in MVP.
- Live registrar/DNS mutation, provider execution, autonomous publish, autonomous rollback, autonomous regeneration, and full billing workflows are outside BMF MVP.

## Current Implementation Evidence

| Area | Evidence reviewed | Classification | BMF implication |
| --- | --- | --- | --- |
| Durable migration job tables | `20260603120000_migration_job_store.sql`, `PostgresMigrationJobStore` | Implemented | Current jobs persist state, stages, events, activation history, source URL, site/site version refs, diagnostics, and execution reports. |
| Durable migration batch tables | `20260603130000_migration_batch_store.sql`, `PostgresMigrationBatchStore` | Implemented | Current batches persist batch status, agency/client refs, job membership, metadata, diagnostics, and aggregate progress. |
| Batch execution events | `20260603140000_migration_batch_events.sql`, `migration-batch-types.ts` | Implemented but narrow | Events cover execution start/job start/job complete/job fail/complete/partial fail/fail/paused by limit. Approval, dry-run, recovery, and classification events are not complete. |
| Job stage model | `migration-job-types.ts`, `migration-stage-machine.ts` | Implemented | Current stage sequence is `INTAKE`, `SNAPSHOT`, `LAYOUT_GRAPH`, `CANONICAL`, `QUALITY_GATE`, `ARTIFACT_BUILD`, `SHADOW_BIND_READY`. |
| Job replay | `MigrationFactory.replayMigrationStage` | Partially implemented | Current replay resets selected stage and downstream stages, then optionally reruns. It is stage-level but not yet governed by BMF retry/replay classes. |
| Batch executor | `migration-batch-executor.ts` | Implemented for operator-driven sequential batches | Execution is explicit, sequential, operator-triggered, supports `stop_on_failure`, `continue_on_failure`, `maxJobs`, completed-job skipping, and status updates. |
| Queue workers, leases, heartbeat | Worker registrations and migration docs | Not implemented for BMF | Future implementation candidate only. BMF MVP must not claim unattended orchestration. |
| Batch admin APIs | `app/api/gnr8/admin/migration-batches/**`, `migration-jobs/**` | Implemented | Current admin routes create/list/read jobs and batches, add/remove jobs, run/resume batches, and read observability/timeline. |
| Batch pages | `app/gnr8/command-center/migration-batches/**` | Implemented | Batch list/detail, summary, diagnostics, failures, timeline, run/resume controls exist. |
| Command Center read model | `gnr8/command-center/command-center-read-model.ts` | Partially implemented | Site/cost/runtime-derived portfolio read model exists, but BMF-specific batch/site lifecycle projection is incomplete. |
| Command Center bulk actions | `bulk-migration-actions.ts`, ops table | Partially implemented/adjacent | Direct bulk import/approve/publish actions exist, but they are not the canonical BMF batch/intake workflow. |
| Ops Inbox | Ops table and derived attention filters | Prepared/partial | No complete named Ops Inbox source exists. BMF should define derived work items from canonical state. |
| Client-scoped import route | `agency/clients/[clientId]/sites/import/route.ts` | Implemented | Validates client/agency scope, source URL, deterministic runtime identity, source capture, scoped pipeline, ownership site creation/linking, and response diagnostics. |
| Scoped import pipeline | `site/scoped-import-pipeline.ts` | Implemented | Persists runtime version, provenance, raw imported artifact, evidence baseline, deterministic artifact, content slots, multi-page evidence, and import reporting. |
| Multi-page discovery | `multipage-import/**`, scoped import integration | Partially implemented | Route discovery, sitemap/robots/canonical/redirect/alias evidence, priority balancing, acquisition, raw assembly, and operator summary exist for controlled cases. |
| Rendered capture | `import-rendered-capture/**`, worker server, site render worker | Implemented with variance | Capture status/diagnostics/evidence exist; rendered capture can be available, partial, unavailable, or failed and may depend on browser/network state. |
| Worker coverage | `apps/worker/gnr8/**` | Partially implemented | Workers cover template processing, site template bootstrap, site render capture, domain verification, and import helpers. No BMF queue worker exists. |
| Audit/event coverage | Generic audit repository, migration job/batch events, publish/content/provider events | Partially implemented | Evidence exists across stores, but BMF-specific event taxonomy is not unified or complete. |
| Domain readiness | runtime domain host bindings, Vercel domain route/worker, hosting ops | Partially implemented | Vercel attachment/check and manual DNS instruction evidence exists; registrar/DNS mutation remains out of scope. |
| Cost visibility | `migration_cost_events`, `runtime_usage_events`, `ai_usage_events`, Command Center cost read model | Partially implemented | Cost indicators can be derived; BMF cost anomaly policy still needs implementation later. |
| Tests | migration factory tests, route tests, multipage tests, capture tests, worker tests | Implemented/partial | Focused tests exist for current foundations; BMF lifecycle/dry-run/Ops Inbox/recovery tests do not yet exist. |

## MVP Scope

BMF MVP must support:

- Bulk intake of approximately 200 site candidates.
- CSV/manual intake as MVP default, with API intake as design-ready but implementation-gated.
- Validation before any migration job is created.
- Duplicate source URL and duplicate target domain detection.
- Agency/client/site ownership mapping.
- Site classification against the MVP supported-site-class matrix.
- Batch planning before execution.
- Non-destructive dry-run/readiness preview where possible.
- Operator-assisted batch start, pause/resume, retry/replay, and failure triage.
- Site-level launch readiness, domain readiness, approval tracking, and publish readiness tracking.
- Cost visibility hooks and anomaly classification.
- Command Center batch/site representation.
- Ops Inbox work item derivation.
- Audit and recovery evidence.

BMF MVP must not support:

- Autonomous migration without operator control.
- Autonomous regeneration, autonomous AI execution, autonomous publish, or autonomous rollback.
- Provider execution or live registrar/DNS mutation.
- Full billing/customer Stripe product behavior.
- Unsupported commerce, auth, payment, custom backend, or complex dynamic site migration.
- Treating dry-run, preview, AI summary, UI state, thumbnail, WU/VCU, Generated Proposal Bundle, or Ops Inbox item as source of truth.

## Bulk Intake Model

### Accepted Input Formats

| Format | MVP treatment | Validation timing | Job creation timing |
| --- | --- | --- | --- |
| CSV upload/import list | Required MVP input | Parse and validate all rows before jobs are created | Jobs may be created only for valid, supported/planned rows after batch planning approval. |
| Manual row entry/edit | Required MVP correction path | Validate row on save and revalidate whole batch before dry-run/start | Same as CSV. |
| API intake | Design-ready, implementation-gated | Same validation contract as CSV/manual | Must not bypass validation, classification, approval, or audit. |
| External workflow reference import | Optional design field | Validate references as metadata only | Never creates external-system truth or external mutations. |

### Minimum Required Fields

| Field | Meaning | Validation |
| --- | --- | --- |
| `agencyId` or agency identifier | Owning agency | Must resolve to existing agency or approved intake alias. |
| `clientId` or client identifier | Owning client | Must resolve under agency or be flagged for client creation/review. |
| `siteDisplayName` | Human-readable site name | Non-empty after trim; may be corrected before job creation. |
| `sourceUrl` | Existing public website URL | Must normalize to absolute `http` or `https`; original and normalized values are preserved. |
| `intendedLaunchDomain` or explicit `no_custom_domain_yet` | Launch domain intent | Domain normalized if present; explicit no-domain value required if blank. |
| `siteClassGuess` | Operator/importer initial class | Must map to supported-site-class matrix value or `unknown_manual_review`. |
| `migrationPriority` | Batch planning priority | Required ordered value such as `p0`, `p1`, `p2`, `p3` or numeric rank. |
| `operatorOwner` | Internal migration owner | Must resolve to user/team alias before start approval. |
| `approvalOwner` or `clientReviewer` | Launch/content approval owner if known | Required as person/team/email/ref or explicit `unknown_approval_owner`. |

### Optional Fields

| Field | Use |
| --- | --- |
| `sourcePlatformGuess` | WordPress/Webflow/Wix/Squarespace/static/unknown hint for classification. |
| `expectedPageCount` | Route-count planning and dry-run risk estimate. |
| `expectedForms` | Flags form review requirement. |
| `expectedWidgets` | Flags maps, booking, chat, analytics, or external widget review. |
| `knownUnsupportedFeatures` | Commerce/auth/payment/backend/member/legal concerns. |
| `domainOwnershipNotes` | Client DNS owner, registrar, account manager notes, TTL concern. |
| `contentOwner` | Who validates text/media accuracy. |
| `contactOwner` | Who validates forms/contact CTAs. |
| `seoRedirectNotes` | Known redirects, canonical domain, SEO launch concerns. |
| `externalWorkflowRefs` | Links/IDs to external task, CRM, ticket, sheet, file, or email thread. |
| `batchId` or `batchCandidateGroup` | Proposed batch assignment. |
| `importMode` | `dry_run_only`, `single_page`, `multi_page_controlled`, `import_only_review`, `defer`. |
| `manualReviewFlags` | `forms`, `widgets`, `heavy_js`, `seo_redirects`, `domain_unclear`, `client_approval_unknown`. |
| `unsupportedClassFlags` | `commerce`, `auth`, `payment`, `custom_backend`, `legal_compliance`, `dynamic_catalog`. |
| `costCenter` | Internal cost grouping. |

### Validation Rules

1. Preserve the original intake value and store normalized values separately.
2. Reject rows missing required fields before any migration job is created.
3. Normalize source URLs by trimming, requiring `http`/`https`, removing fragment, preserving path, normalizing host case, and recording final canonical string.
4. Normalize launch domains by host only unless an internal/staging URL exception is explicit.
5. Detect duplicate normalized source URL within intake, active batches, and known sites.
6. Detect duplicate intended launch domain within intake, active batches, active domain host bindings, and known site domains.
7. Flag same source URL with different clients as high-severity manual review.
8. Flag same launch domain with different clients as critical until ownership is resolved.
9. Preclassify site class from operator guess plus obvious intake hints only. Dry-run/capture evidence may refine it later.
10. Mark unsupported-class rows as valid intake only when they are explicitly `import_only_review`, `defer`, or `out_of_scope`; they must not create launch-eligible jobs.
11. Validate external workflow references as references only; BMF does not mutate external systems.
12. Require operator owner before batch start approval.
13. Require launch-domain intent before dry-run completion, either a normalized domain or explicit no-custom-domain value.

### Intake Audit Events

- `bulk_intake_created`
- `bulk_intake_validated`
- `bulk_intake_failed`
- `site_classified`
- `domain_action_required` when ownership/domain handling is unclear

## Dry-Run Model

Dry-run is a non-destructive planning operation. It must not publish, attach live domains, mutate DNS, approve launch, execute providers, create public runtime changes, or create migration jobs unless an implementation ADR later proves a safe internal planning artifact is necessary. For BMF MVP design, dry-run output is append-only evidence and review-only projection.

Dry-run evaluates:

- Intake field completeness and normalization.
- Duplicate source URL and duplicate target domain conflicts.
- Site class support against the MVP matrix.
- Source URL reachability using non-mutating fetch/checks where available.
- Likely capture mode and capture-risk indicators.
- Expected multi-page route count and route-limit risk.
- Obvious unsupported functionality indicators from intake and optional source checks.
- Domain readiness assumptions and missing ownership evidence.
- Required approval owners and missing approval routes.
- Expected operator review workload.
- Risk level and recommended batch stop/continue policy.
- Estimated cost if current cost foundations can support a projection.

Dry-run artifacts:

| Artifact | Source-of-truth class | Notes |
| --- | --- | --- |
| `BatchDryRunResult` | Append-only evidence and projection | Immutable result of a dry-run attempt; not approval. |
| `SiteClassAssessment` | Projection until operator classification is approved | Must reference evidence and confidence. |
| `DuplicateConflictReport` | Review-only projection from canonical state | Completion requires canonical intake/domain/site correction. |
| `ReadinessPreview` | Derived projection | May be stale; start approval must snapshot evidence shown. |
| `CostEstimate` | Projection | Must be labeled estimated and not billing truth. |
| `RecommendedStopContinuePolicy` | Advisory | Operator approval decides final policy. |

## Execution Model

The BMF MVP default is operator-driven sequential execution, matching current `MigrationBatchExecutor` evidence.

| Decision | MVP design |
| --- | --- |
| Who can start a batch | Superadmin or migration operator with `run_migration` authority and agency scope. |
| Evidence before start | Valid intake, dry-run result or explicit dry-run unavailable note, supported/manual-review/out-of-scope counts, duplicate report, owner assignments, stop/continue policy, cost estimate if available, domain/approval blockers. |
| Required approval | Batch start approval is required; dry-run does not imply approval. |
| Job creation | Jobs are created only after valid intake rows are assigned to an approved batch plan. Unsupported/out-of-scope rows do not become launch-eligible jobs. |
| Execution order | Sequential by priority/position as MVP default. |
| Concurrency | Future implementation candidate. Controlled cohorts may be designed after BMF-1, but current code does not prove queue/worker concurrency. |
| Stop/continue policy | Operator chooses `stop_on_failure` or `continue_on_failure`; BMF extends this with severity-based pause rules. |
| Degraded capture | Site may continue to review, not to launch silently. It creates `capture_degraded` state and Ops Inbox work. |
| Unsupported site class | Blocks launch; may allow import-only review when explicitly approved. |
| Partial completion | Batch may complete with failed/deferred sites if stop/continue policy and severity allow. |
| Automatic pause | Critical failure, publish failure, repeated system/capture failures, cost anomaly threshold, max job/cohort limit, or explicit operator pause. |
| Automatic continue | Only for lower-severity isolated failures under `continue_on_failure` and when next jobs are safe. |
| Operator action required | Approval missing, unsupported class, duplicate conflict, capture degradation exception, route review, domain action, publish readiness failure, cost anomaly, incident, rollback. |

Queue workers, leases, heartbeat, retry scheduler, concurrency manager, and unattended orchestration are future implementation candidates only.

## Data And Artifact Contracts

These are conceptual contracts only. They do not introduce TypeScript types, database schemas, or migrations.

| Contract | Purpose | Required fields | Optional fields | Truth class | Owner module | Writer | Readers | Immutability/audit | Existing evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `BulkIntake` | Intake file/list header | `intakeId`, `agencyId`, `createdBy`, `sourceFormat`, `createdAt`, `status`, `rowCount` | `externalRef`, `notes` | Canonical for intake | Future BMF | Operator/importer | Command Center, dry-run | Mutable status, append-only events | Not implemented. |
| `BulkIntakeRow` | One candidate site | `rowId`, `intakeId`, `clientId`, `siteDisplayName`, `sourceUrlOriginal`, `sourceUrlNormalized`, `launchDomainIntent`, `siteClassGuess`, `priority`, `operatorOwner`, `approvalOwner` | optional fields from intake model | Canonical intake row | Future BMF | Operator/importer | Batch planner, dry-run | Corrections audited; normalized values reproducible | Not implemented; import route has one-site body. |
| `SiteClassAssessment` | Supported-class decision | `assessmentId`, `rowId/siteId`, `classification`, `risk`, `evidenceRefs`, `assessedAt` | `confidence`, `exceptionRequired` | Projection until accepted | Future BMF | Dry-run/system + operator | Command Center, Ops Inbox | Assessment immutable; accepted decision audited | Supported matrix documented. |
| `BatchPlan` | Planned batch before execution | `planId`, `batchId`, `siteRows`, `policy`, `order`, `owner`, `dryRunRef`, `approvalRequired` | `cohorts`, `costEstimateRef` | Canonical plan once approved | Future BMF | Operator | Batch executor, Command Center | Plan version append-only after approval | Current batch metadata only. |
| `BatchDryRunResult` | Non-destructive preview | `dryRunId`, `batchId`, `inputRefs`, `startedAt`, `completedAt`, `status`, `siteResults`, `riskSummary` | `costEstimate`, `recommendedPolicy` | Append-only evidence/projection | Future BMF | System/operator-triggered | Command Center, approvers | Immutable result; new dry-run supersedes | Admin first-limited dry-run is unrelated/provider-ish; BMF dry-run not implemented. |
| `MigrationBatch` | Executable batch | `batchId`, `agencyId`, `name`, `status`, `createdBy`, `createdAt` | `clientId`, `metadata`, `diagnostics` | Canonical | `migration-factory` | Batch API/store | Command Center, Ops Inbox | Mutable status + events | Implemented as `gnr8_migration_batches`. |
| `MigrationBatchSite` | Site membership in batch | `batchId`, `jobId/siteId`, `position`, `sourceUrl` | `siteVersionId`, `metadata` | Canonical membership | `migration-factory` | Batch API/store | Executor, Command Center | Membership changes audited | Implemented as `gnr8_migration_batch_jobs`, but row-level intake link absent. |
| `MigrationStageResult` | Stage output | `jobId`, `stage`, `status`, `startedAt`, `endedAt`, `diagnostics`, `outputRefs` | `error` | Canonical within job | `migration-factory` | Stage runner | Executor, observability | Stage records mutable current + event trail | Implemented. |
| `FailureRecord` | Classified failure | `failureId`, `subjectType`, `subjectId`, `failureType`, `severity`, `sourceOfTruthRef`, `detectedAt`, `ownerRole` | `retryEligibility`, `escalationRef` | Canonical/recovery evidence | Future BMF/recovery | System/operator | Ops Inbox, Command Center | Append-only or superseded by recovery record | Partially in job errors/events only. |
| `RetryRequest` | Request to rerun same action | `retryId`, `subjectId`, `stage`, `reason`, `requestedBy`, `policy`, `inputRefs` | `maxAttempts` | Approval event/request | Future BMF | Operator | Executor | Append-only | Current resume exists; governed retry request absent. |
| `ReplayRequest` | Deterministic replay request | `replayId`, `jobId`, `fromStage`, `immutableInputRefs`, `requestedBy`, `runAfterReplay` | `expectedOutputRefs` | Approval event/request | Future BMF | Operator | MigrationFactory | Append-only | Current `replayMigrationStage` exists without BMF policy. |
| `RecoveryRecord` | Evidence that failure recovered | `recoveryId`, `failureId`, `status`, `evidenceRefs`, `verifiedBy`, `verifiedAt` | `followUpRefs` | Canonical recovery evidence | Future BMF | Operator/system | Command Center, closeout | Append-only | Not implemented. |
| `BatchAuditEvent` | BMF event | `eventId`, `eventType`, `actor`, `subject`, `payload`, `correlationIds`, `createdAt` | `humanGenerated`, `systemGenerated` | Append-only event | Audit/BMF | System/services | Audit timeline, recovery | Immutable | Current generic/migration events partial. |
| `OpsInboxItem` | Derived operator queue item | `workItemKey`, `type`, `severity`, `ownerRole`, `sourceTruthRef`, `allowedActions`, `completionCondition` | `displayHints` | Derived only | Command Center/Ops Inbox | Read-model derivation only | Operators | Recomputed; no independent truth | Prepared/partial only. |
| `CommandCenterBatchReadModel` | Operator projection | `batchId`, `status`, `progress`, `classCounts`, `failureCounts`, `approvalCounts`, `domainCounts`, `nextAction` | `costIndicators`, `runbookLinks` | Derived projection | Command Center | Read model | Operators | Rebuildable from canonical state | Current batch observability partial. |

## BMF Audit Taxonomy

Each event must include actor, subject, required payload, correlation IDs, immutable references, level, and human/system origin.

| Event | Actor | Subject | Required payload | Level | Origin |
| --- | --- | --- | --- | --- | --- |
| `bulk_intake_created` | Operator/importer | Intake | intake id, source format, row count, agency/client refs | Batch | Human/system |
| `bulk_intake_validated` | System | Intake | valid count, invalid count, duplicate count, warnings | Batch | System |
| `bulk_intake_failed` | System/operator | Intake | failure codes, invalid rows, owner | Batch | System/human |
| `batch_created` | Operator | Batch | batch id, owner, intake refs, site count | Batch | Human |
| `batch_dry_run_started` | Operator | Batch | batch id, input refs | Batch | Human |
| `batch_dry_run_completed` | System | Batch | dry-run id, risk summary, blockers | Batch | System |
| `batch_dry_run_failed` | System | Batch | dry-run id, error class, diagnostics | Batch | System |
| `batch_start_requested` | Operator | Batch | evidence package refs | Batch | Human |
| `batch_start_approved` | Approver | Batch | approval ref, policy, evidence shown | Batch | Human |
| `batch_started` | Operator/system | Batch | policy, job count, dry-run ref | Batch | Human/system |
| `batch_paused` | Operator/system | Batch | reason, severity, current counters | Batch | Human/system |
| `batch_resumed` | Operator | Batch | reason, prior state, policy | Batch | Human |
| `batch_completed` | System | Batch | success counts, evidence refs | Batch | System |
| `batch_completed_with_failures` | System | Batch | failed/deferred sites, recovery refs | Batch | System |
| `batch_cancelled` | Operator | Batch | reason, remaining sites | Batch | Human |
| `site_classified` | System/operator | Site | class, evidence refs, risk | Site | System/human |
| `site_import_started` | System | Site/job | job id, source URL, stage refs | Site | System |
| `site_import_completed` | System | Site/job | site version, artifact refs, diagnostics | Site | System |
| `site_import_failed` | System | Site/job | stage, failure type, retry eligibility | Site | System |
| `site_capture_degraded` | System | Site | capture status, missing evidence, fallback | Site | System |
| `site_retry_requested` | Operator | Site/job | stage, reason, max attempts | Site | Human |
| `site_replay_requested` | Operator | Site/job | from stage, immutable input refs | Site | Human |
| `site_recovered` | Operator/system | Site/failure | recovery evidence, verification | Site | Human/system |
| `site_deferred` | Operator | Site | reason, next review date/ref | Site | Human |
| `site_approved_for_launch` | Approver | Site | approval ref, evidence shown, limitations | Site | Human |
| `domain_action_required` | System/operator | Site/domain | domain, missing evidence/action | Site | System/human |
| `publish_readiness_passed` | System | Site/version | readiness snapshot, domain/approval refs | Site | System |
| `publish_readiness_failed` | System | Site/version | blockers, severity | Site | System |
| `incident_opened` | Operator/system | Site/batch | severity, trigger, owner | Site/batch | Human/system |
| `incident_resolved` | Operator | Incident | resolution, recovery evidence | Site/batch | Human |
| `cost_anomaly_detected` | System | Batch/site | threshold, observed cost, owner | Site/batch | System |

## Command Center Requirements

Command Center must remain the primary operator surface. Specialized pages are drilldowns only.

Required BMF views:

- Batch list with status, owner, agency/client scope, planned site count, current counters, latest event, next operator action.
- Batch detail with lifecycle state, dry-run summary, start approval evidence, execution policy, progress, timeline, failure groups, recovery records, pause reason, and runbook links.
- Site table within a batch showing site class, import state, preview readiness, review state, approval state, domain state, publish readiness, incidents, cost indicators, and owner assignment.
- Counters for supported/manual-review/import-only/out-of-scope, import success/failure/degraded, route coverage, preview readiness, review/approval/domain/publish readiness, incidents, and cost anomalies.
- Links or controls for approved retry/replay decisions, not hidden automatic retries.
- Explicit blocked action reasons.

## Ops Inbox Requirements

Ops Inbox is a derived queue from canonical state. It must not store independent truth, and completing a work item must update the underlying canonical state/evidence.

Required derived item types:

- `intake_blocked`
- `duplicate_detected`
- `unsupported_site_class`
- `dry_run_failed`
- `batch_start_approval_needed`
- `import_failed`
- `capture_degraded`
- `route_review_needed`
- `preview_failed`
- `review_needed`
- `approval_needed`
- `domain_action_needed`
- `dns_verification_failed`
- `publish_readiness_failed`
- `publish_failed`
- `rollback_needed`
- `incident_open`
- `cost_anomaly`
- `recovery_evidence_needed`

## Future Implementation Validation Plan

BMF implementation is MVP-ready only when these pass:

- Unit tests for intake parsing, normalization, validation, duplicate detection, site-class mapping, batch planning, state transitions, severity mapping, and data-contract serializers.
- Integration tests for CSV/manual/API intake creating no jobs until validation and approval gates pass.
- Read-model tests proving Command Center and Ops Inbox derive from canonical state.
- Batch lifecycle tests for every allowed/prohibited transition.
- Site lifecycle tests for supported, manual-review, import-only, out-of-scope, degraded, domain-blocked, publish-ready, publish-failed, rollback-required, and archived cases.
- Failure taxonomy tests for every required failure type.
- Retry/replay tests proving deterministic stages reset downstream state and side-effect stages cannot be blindly replayed.
- Dry-run tests proving non-destructive behavior and no approval side effects.
- Permission/approval tests for batch start, retry/replay, unsupported exception, launch approval, domain action, publish, rollback, and cost exception.
- Audit event tests for all BMF audit events and correlation IDs.
- Representative 200-row batch smoke test with static site fixture cohort.
- Degraded capture fixture, unsupported site class fixture, domain readiness fixture, publish failure fixture, and cost anomaly fixture.

## Architecture Warnings

| Warning | Risk | Why it matters | Likely failure mode | Mitigation | Required before implementation |
| --- | --- | --- | --- | --- | --- |
| Factory becomes autonomous | Operators lose control of client-visible and external side effects | MVP trust depends on approvals | Batch runs/publishes/rolls forward without review | Keep start/retry/replay/publish human-gated | Yes |
| Dry-run mistaken for approval | Unsafe launch or batch execution | Dry-run is only evidence | Operator clicks start based on stale projection | Label dry-run as non-approval and snapshot evidence in start approval | Yes |
| Ops Inbox becomes state store | Divergent truth | Work items are projections | Dismissing item hides canonical blocker | Derive from canonical state only | Yes |
| UI pages become source of truth | Hidden state drift | UI is read model/control surface | Manual UI flags override runtime truth | All writes through domain services and audit | Yes |
| Replay reruns side effects | External/client-visible damage | Publish/domain/approval are not deterministic | Replay publishes or rolls back blindly | Replay classification and guardrails | Yes |
| Capture variance hides source drift | Inconsistent evidence | Browser/network/source may change | Replay produces different DOM but treated same | Immutable input/output refs and variance labels | Yes |
| Domain failures block portfolio | Throughput stalls | Site domain readiness is site-scoped | One DNS issue pauses 200 sites | Severity stop/continue policy | Yes |
| Publish failures continue launch wave | Public incident spreads | Publish side effects are high risk | Multiple sites fail live | Critical pause for publish wave | Yes |
| Cost anomalies ignored | 200-site cost spike | Batch scale amplifies spend | Capture/import loop burns budget | Cost thresholds and pause rule | Yes |
| Unsupported classes sneak into launch | Commerce/auth/payment break | MVP does not support dynamic flows | Static snapshot replaces live app | Classification gates and superadmin exceptions | Yes |
| AI summaries treated canonical | Hallucinated state | AI is advisory only | Operator approves false state | Evidence-linked summaries only | Yes |
| Queue/worker design implied | False reliability claim | Current BMF is sequential/operator-driven | Operators expect unattended recovery | Mark queue as future candidate | Yes |
| External integrations overbuilt | MVP delays and source-of-truth confusion | Migration MVP needs internal control first | Project tools become partial truth | Link refs only before integration design | No, but recommended |

## Recommended Next Milestone

Recommended next milestone: Command Center and Ops Inbox Design.

Reason: BMF-1 defines batch/site lifecycle, failure/recovery, and required derived work items, but the current Command Center/Ops Inbox surfaces are partial. Implementation should wait for a dedicated Command Center/Ops Inbox design that maps every BMF state, action, blocker, and work item to canonical state and role-gated controls.

Migration Factory MVP Implementation should not start immediately after BMF-1 alone. It can follow soon only after Command Center/Ops Inbox Design, Domain/DNS Operating Model Decision, and Audit, Replay, and Failure Recovery Design are closed or explicitly waived by architectural review.
