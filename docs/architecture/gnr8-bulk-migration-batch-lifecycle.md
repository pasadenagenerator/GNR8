# GNR8 Bulk Migration Batch Lifecycle

BMF-1 lifecycle specification for migration batches and site-level migration state within a batch.

This is documentation-only. It does not implement states, transitions, APIs, schemas, workers, Command Center behavior, or runtime behavior.

## Lifecycle Principles

1. Batch state is canonical only when persisted through the future BMF batch domain service and audited.
2. Site state is projected from intake, classification, migration job/stage, runtime version/artifact, preview, review, approval, domain, publish, rollback, incident, and recovery evidence.
3. Command Center displays lifecycle state and allowed actions; it is not itself the source of truth.
4. Ops Inbox work items are derived from lifecycle state and blockers.
5. Dry-run is evidence, not approval.
6. Publish, rollback, domain mutation, provider execution, billing mutation, and autonomous AI execution are not batch replay actions.

## Batch Lifecycle

Current repository status supports `draft`, `ready`, `running`, `paused`, `completed`, `failed`, `partially_failed`, and `cancelled`. BMF MVP expands the conceptual lifecycle below. Implementation must map or migrate states deliberately later; this document does not change schemas.

| State | Meaning | Allowed transitions | Prohibited transitions | Required evidence | Operator action | Approval | Audit event | Command Center | Ops Inbox | Retry/replay implication |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` | Batch exists as a planning container; intake may still be incomplete. | `intake_validating`, `cancelled`, `archived` | `running`, `completed`, `published` actions | Batch id, owner, agency/client scope if known | Add/edit rows, assign owners | None | `batch_created` | Draft badge, incomplete counters | None unless rows blocked | No jobs should run. |
| `intake_validating` | Intake rows are being parsed, normalized, deduped, and scoped. | `intake_invalid`, `ready_for_dry_run`, `cancelled` | `approved_to_start`, `running` | Intake refs, validation run id | Wait/review validation | None | `bulk_intake_validated` or `bulk_intake_failed` | Validation progress | `intake_blocked` for invalid rows | Validation can be rerun deterministically from intake. |
| `intake_invalid` | One or more rows fail required validation or duplicate checks. | `draft`, `intake_validating`, `cancelled`, `archived` | `ready_for_dry_run`, `running` | Invalid row list, duplicate report, owner | Correct rows or defer/remove them | None unless exception | `bulk_intake_failed` | Invalid counters and reasons | `intake_blocked`, `duplicate_detected` | No migration jobs for invalid rows. |
| `ready_for_dry_run` | Intake is valid enough for a non-destructive planning run. | `dry_run_running`, `draft`, `cancelled` | `running`, `approved_to_start` | Validated intake, class guesses, domain intent | Start dry-run | None | `batch_dry_run_ready` if implemented | Ready for dry-run action | None | Dry-run only; no approval implied. |
| `dry_run_running` | Non-destructive checks/projections are running. | `dry_run_completed`, `dry_run_failed`, `paused`, `cancelled` | `running`, `completed` | Dry-run id, input refs | Monitor | None | `batch_dry_run_started` | Dry-run progress | None unless stuck | Dry-run stages may be rerun; outputs supersede prior dry-run. |
| `dry_run_completed` | Dry-run produced reviewable results and risk summary. | `awaiting_batch_start_approval`, `ready_for_dry_run`, `draft`, `cancelled` | `running` without approval | Dry-run result, blocker list, policy recommendation | Review evidence, choose policy | Start approval required next | `batch_dry_run_completed` | Dry-run summary, risk, blockers | `batch_start_approval_needed` if clean enough | Dry-run output is immutable evidence/projection. |
| `dry_run_failed` | Dry-run could not complete. | `ready_for_dry_run`, `draft`, `blocked`, `cancelled` | `awaiting_batch_start_approval` unless explicitly waived | Failure diagnostics | Fix inputs/system or request waiver | Waiver if start without dry-run | `batch_dry_run_failed` | Failure summary | `dry_run_failed` | Dry-run retry allowed; no site execution. |
| `awaiting_batch_start_approval` | Evidence is ready and start approval is requested. | `approved_to_start`, `draft`, `blocked`, `cancelled` | `running` | Evidence package, dry-run ref or waiver, policy, site counts | Approver reviews | Required | `batch_start_requested` | Approval pending | `batch_start_approval_needed` | No execution until approval. |
| `approved_to_start` | Batch has human approval to create/run jobs under a policy. | `running`, `paused`, `cancelled` | `draft` without audit, `completed` | Approval ref, evidence snapshot, policy | Start execution or schedule operator window | Completed | `batch_start_approved` | Approved badge, run action | None | Jobs may be created/run. Approval can expire by policy. |
| `running` | Batch jobs are executing under operator-approved policy. | `paused`, `partially_completed`, `completed`, `completed_with_failures`, `blocked`, `cancelled` | `draft`, `intake_validating` | Batch start event, job list, current stage/events | Monitor, pause if needed | Prior start approval | `batch_started`, job events | Live progress/timeline | Failure items as derived | Retry/replay only by policy; no side-effect replay. |
| `paused` | Execution is stopped by operator, maxJobs/cohort limit, severity rule, or system guard. | `running`, `blocked`, `cancelled`, `completed_with_failures` | `completed` if runnable jobs remain without decision | Pause reason, counters, failed/stuck refs | Triage, resume, cancel, defer sites | Resume may require approval for high/critical reason | `batch_paused`, `batch_resumed` | Paused banner, reason, resume action | Failure/recovery items | Failed deterministic stages may be replayed after approval. |
| `partially_completed` | Some sites completed import/review milestones while remaining sites are pending/failed/deferred. | `running`, `completed`, `completed_with_failures`, `paused`, `blocked` | `archived` without closeout | Progress counters and pending list | Decide continue/defer/close | Depends on remaining failures | `batch_partially_completed` if implemented | Partial progress counters | Remaining blockers | Retry/replay only for eligible failed sites. |
| `completed` | All batch sites reached intended non-publish execution target with no unresolved failures. | `archived` | `running`, `paused` without reopening policy | Completion summary, site evidence refs | Review closeout | None | `batch_completed` | Completed status | None | No further retry unless batch is reopened by future policy. |
| `completed_with_failures` | Batch is closed with failed/deferred/import-only/out-of-scope sites recorded. | `archived`, `blocked` if reopened by policy | `running` without reopen approval | Failure/deferred summary, recovery/defer refs | Closeout failed sites separately | Closeout approval recommended | `batch_completed_with_failures` | Completed with failures counters | `recovery_evidence_needed` for unresolved records | Eligible site retries belong to new batch or reopened plan. |
| `blocked` | Batch cannot safely progress because a required decision/evidence/system dependency is missing. | `paused`, `running`, `cancelled`, `completed_with_failures` | `completed` without resolution | Blocker record, owner, severity | Resolve blocker/escalate | Depends on blocker | `batch_blocked` if implemented | Blocked banner and owner | Derived blocker item | No retry unless blocker policy allows. |
| `cancelled` | Batch is intentionally stopped before completion. | `archived` | `running`, `completed` | Cancel reason, affected sites, owner | Record cancellation | Operator approval | `batch_cancelled` | Cancelled status | None unless site follow-up remains | No retries in cancelled batch. |
| `archived` | Batch is retained for audit/history but not active. | None unless future reactivation policy | All active transitions | Closeout, final counters, audit timeline | None | Superadmin/account closeout if policy | `batch_archived` if implemented | Hidden/filterable archive | None | Replay/retry must create new decision context. |

## Batch Transition Rules

1. `running` requires `approved_to_start`.
2. `approved_to_start` requires valid intake and either a completed dry-run or an audited dry-run waiver.
3. `completed` requires no unresolved failed, blocked, unsupported, approval, domain, publish-readiness, or recovery items for the batch target.
4. `completed_with_failures` must preserve failed/deferred/out-of-scope site list and recovery evidence requirements.
5. Critical severity pauses the batch or publish wave by default.
6. Publish waves are not part of import execution unless separately approved; publish failure pauses further launch actions.
7. `archived` requires a closeout summary.

## Site-Level Lifecycle Within A Batch

The site lifecycle adapts the MVP operational state model for batch execution. State may be stored later or projected; source-of-truth fields/artifacts are listed conceptually.

| State | Meaning | Transition rules | Source-of-truth fields/artifacts | Audit event | Operator role | Allowed actions | Blocked actions | Retry/replay policy | Command Center surface | Ops Inbox item |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `intake_created` | Row exists with required owner context not yet validated. | To `intake_validated` or `intake_blocked`. | `BulkIntakeRow`, original/normalized fields | `bulk_intake_created` | Account/migration operator | Edit row, validate | Create job if invalid | Validation replayable | Intake row | None unless incomplete |
| `intake_validated` | Required fields and duplicates pass or are classified. | To classification states or `intake_blocked`. | Validation result, duplicate report | `bulk_intake_validated` | Migration operator | Classify, plan batch | Launch/publish | Validation replayable | Valid intake badge | None |
| `intake_blocked` | Missing/invalid fields or unresolved duplicate/domain/client issue. | Back to `intake_validated`, `deferred`, or archive. | Invalid fields, blocker owner | `bulk_intake_failed` | Account/migration | Correct/defer/escalate | Create job/start import | Validation retry after correction | Blocker badge | `intake_blocked`, `duplicate_detected` |
| `classified_supported` | Site class is MVP supported. | To `import_pending`. | `SiteClassAssessment` accepted | `site_classified` | Migration | Assign to job/batch | Publish before review | Classification update audited | Supported badge | None |
| `classified_manual_review` | Site may be imported but needs manual review. | To `import_pending`, `review_blocked`, `deferred`. | Assessment, flags | `site_classified` | Migration/technical/content | Import with review flags | Launch without review | Classification re-evaluation allowed | Manual review badge | `unsupported_site_class` if high risk |
| `classified_import_only` | Site may be imported for review but is not launch-ready. | To `import_pending`, `review_blocked`, `deferred`. | Assessment, import-only reason | `site_classified` | Superadmin/migration | Import-only review | Launch/publish | No automatic launch retry | Import-only badge | `unsupported_site_class` |
| `classified_out_of_scope` | Site is not in MVP scope. | To `deferred` or `archived_decommissioned`; exception to import-only only. | Assessment, out-of-scope reason | `site_classified` | Superadmin/account | Defer/archive/exception | Import for launch | Forbidden for launch | Out-of-scope badge | `unsupported_site_class` |
| `import_pending` | Valid site has approved job plan but import not running. | To `import_running`, `deferred`. | Batch plan/job input refs | `site_import_queued` if implemented | Migration | Run as batch/site | Publish/review | No replay before first run | Pending row | None |
| `import_running` | Import/capture/stages executing. | To `import_succeeded`, `import_failed`, `capture_degraded`. | Job/stage records/events | `site_import_started` | Migration/technical | Monitor/pause batch | Duplicate import | Current stage controls | Stage progress | None unless stuck |
| `import_succeeded` | Import produced usable site version/artifacts. | To `preview_ready`, `route_review_needed`, `review_pending`. | Runtime version, artifact refs, provenance | `site_import_completed` | Migration/content | Review preview/routes | Launch | Deterministic downstream projections replayable | Success badge | None |
| `import_failed` | Import failed before usable output. | To `import_pending`, `import_running`, `review_blocked`, `deferred`. | Failed stage, diagnostics, failure record | `site_import_failed` | Migration/technical | Retry/replay/defer | Preview/launch | By stage policy | Failure panel | `import_failed` |
| `capture_degraded` | Capture partial/raw fallback/missing evidence. | To `review_pending`, `route_review_needed`, `import_running`, `review_blocked`. | Rendered capture status/diagnostics/provenance | `site_capture_degraded` | Technical/content | Review fallback, replay capture, accept exception | Launch silently | Rendered capture replayable with external variance | Degraded badge | `capture_degraded` |
| `route_review_needed` | Multi-page route map/discovery needs human coverage review. | To `preview_ready`, `review_blocked`, `deferred`. | Route map, discovery evidence, preview validation | `route_review_requested` if implemented | Migration/content/SEO | Approve route coverage, adjust future plan | Launch without review | Discovery replayable with source drift note | Route coverage panel | `route_review_needed` |
| `preview_ready` | Preview is available for review. | To `review_pending`, `approval_pending`, `review_blocked`, `domain_pending`. | Preview URL/ref, runtime artifact, content state | `preview_generated` | Content/client/account | Review, request changes | Publish | Preview regenerable from artifacts | Preview link/status | `review_needed` |
| `review_pending` | Human review is required. | To `approval_pending`, `review_blocked`, `preview_ready`, `deferred`. | Review checklist, preview evidence | `review_requested` | Content/client/technical | Accept/reject/request changes | Approval if blockers | Manual repeat only | Review queue | `review_needed` |
| `review_blocked` | Review cannot finish. | To `review_pending`, `import_pending`, `deferred`. | Blocker record | `review_blocked` | Owner by blocker | Resolve/escalate/defer | Approval/publish | Retry depends on blocker | Blocked state | `review_needed` or specific blocker |
| `approval_pending` | Required human approval missing. | To `approved_for_launch`, `review_blocked`, `domain_pending`. | Approval request/evidence package | `approval_requested` | Approver/account | Approve/reject/request changes | Publish | Approval not replayable | Approval status | `approval_needed` |
| `approved_for_launch` | Launch approval exists. | To `domain_pending`, `domain_ready`, `publish_ready`. | Approval ref, evidence snapshot | `site_approved_for_launch` | Approver/technical | Run readiness/domain checks | Publish if readiness missing | Approval append-only | Approved badge | None unless domain/readiness |
| `domain_pending` | Custom domain evidence/action incomplete. | To `domain_ready`, `review_blocked`, `deferred`. | Domain intent, host binding, DNS instructions | `domain_action_required` | Technical/account/client | Record DNS action, recheck | Publish custom domain | Domain check manually repeatable | Domain panel | `domain_action_needed` |
| `domain_ready` | Domain or internal-domain exception is acceptable. | To `publish_ready`, `approval_pending`. | Verification evidence/exception | `domain_verified` | Technical | Mark readiness input | Mutate registrar DNS | Checks repeatable with external variance | Domain ready badge | None |
| `publish_ready` | Review, approval, domain, artifact, rollback plan pass. | To `published`, `publish_failed`, `approval_pending`. | Readiness snapshot | `publish_readiness_passed` | Technical/superadmin | Request/execute approved publish | AI/autonomous publish | Not replay; side effect | Publish ready status | None or `publish_readiness_failed` |
| `published` | Approved version active in public runtime. | To `incident_open`, `rollback_required`, `archived_decommissioned`. | Publish event, active pointer, domain/runtime state | `publish_completed` | Technical/account | Monitor, incident if needed | Import over active without plan | Not replayable | Live status | None |
| `publish_failed` | Publish action failed. | To `publish_ready`, `rollback_required`, `incident_open`. | Publish failure event, before/after pointer | `publish_readiness_failed` or `publish_failed` | Technical/superadmin | Incident, retry after cause, rollback | Continue publish wave | No blind retry | Critical publish panel | `publish_failed` |
| `rollback_required` | Incident requires rollback decision. | To `published`, `incident_open`, `deferred`. | Incident, prior good version, impact | `rollback_requested` | Technical/superadmin | Approve/execute rollback | Archive before recovery | Rollback is side effect, not replay | Critical banner | `rollback_needed` |
| `incident_open` | Active incident affects site/batch. | To `incident_resolved`, `rollback_required`, `deferred`. | Incident record/evidence | `incident_opened` | Technical/account | Triage, communicate, recover | Publish wave continuation if critical | Recovery by runbook | Incident panel | `incident_open` |
| `deferred` | Site intentionally postponed. | To `intake_validated`, `import_pending`, `archived_decommissioned` by new decision. | Defer reason, owner, follow-up | `site_deferred` | Account/migration | Replan later | Launch | New batch recommended | Deferred badge | None or follow-up |
| `archived_decommissioned` | Site leaves active migration wave. | None unless future reactivation policy. | Archive reason, final state | `site_archived` | Superadmin/account | View audit | Active execution | New intake required | Archived filter | None |

## Site Transition Rules

1. `classified_out_of_scope` cannot become `publish_ready` or `published`.
2. `classified_import_only` cannot become `publish_ready` without superadmin exception and launch-readiness redesign.
3. `capture_degraded` can proceed to review but not silently to launch.
4. `route_review_needed` must resolve before launch for multi-page sites.
5. `approved_for_launch` does not imply `domain_ready` or `publish_ready`.
6. `domain_pending` blocks custom-domain publish but may allow preview/internal staging.
7. `publish_ready` requires launch approval, domain readiness or exception, artifact/readiness evidence, and rollback plan.
8. `publish_failed` or `rollback_required` stops further launch actions for that site and may pause the batch/publish wave.
9. Approval decisions are append-only and not replayable.
10. Retry/replay actions must reference immutable input refs and allowed stage policy.

## Current-To-BMF Mapping

| Current evidence | Current states | BMF lifecycle mapping |
| --- | --- | --- |
| `gnr8_migration_batches.status` | `draft`, `ready`, `running`, `paused`, `completed`, `failed`, `partially_failed`, `cancelled` | BMF adds pre-run validation/dry-run/approval and completed-with-failures/archive distinctions. |
| `gnr8_migration_jobs.status` | `PENDING`, `RUNNING`, `PAUSED`, `FAILED`, `COMPLETED` | Maps to site import execution only, not full launch/domain/review lifecycle. |
| Runtime site version states | `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `PUBLISHED`, `ARCHIVED` in read model logic | Maps to preview/review/approval/live portions of site lifecycle. |
| Domain host binding status | Vercel/domain binding state | Feeds `domain_pending`/`domain_ready`. |
| Batch observability | Summary, diagnostics, failures, timeline | Feeds Command Center batch projection; not full lifecycle source. |
