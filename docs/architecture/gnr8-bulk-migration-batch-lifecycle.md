# GNR8 Bulk Migration Batch Lifecycle

BMF-1 canonical lifecycle specification for migration batches and site items inside a batch.

This is documentation-only. It does not implement states, transitions, APIs, schemas, workers, Command Center behavior, Ops Inbox behavior, publishing, rollback, DNS/domain behavior, billing, storage, provider execution, Workspace runtime, Evolution runtime, Generated Proposal Bundles, thumbnails, or AI execution.

## Lifecycle Principles

1. Batch lifecycle state is source-of-truth only when later persisted by the canonical BMF batch domain service and audited.
2. Site item lifecycle is projected from intake, classification, preflight/dry-run, migration job/stage state, runtime artifact refs, preview readiness, review blockers, approval refs, domain/publish readiness, incidents, recovery refs, and closeout evidence.
3. Command Center represents state and actions, but it is not source of truth.
4. Ops Inbox items are derived blockers. They cannot be closed without changing underlying canonical evidence or recording an audited decision.
5. Dry-run is evidence, not approval.
6. Publish activation, rollback, domain/provider checks, approvals, billing decisions, and AI/provider outputs are not deterministic batch replay actions.

## Batch States

Required fields for every batch-state transition: `batchId`, current state, requested next state, actor/system actor, reason, evidence refs, policy version, timestamp, and correlation id.

| State | Meaning | Allowed transitions | Prohibited transitions | Required evidence | Operator action | Approval requirement | Audit event | Source-of-truth owner | Command Center representation | Ops Inbox representation | Recovery behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `draft` | Planning container exists; membership and intake may still change. | `intake_validating`, `ready`, `cancelled`, `archived` | `dry_run_running`, `running`, `completed`, `failed` | Batch id, owner, agency/client scope if known, candidate list or empty-batch reason. | Add/edit/remove candidates; assign owner and priority. | None. | `batch_created` | Future BMF batch service; current batch store is narrower evidence. | Draft badge, incomplete counters, editable membership. | None unless stale/incomplete by policy. | No job execution. Recover by editing batch or cancelling. |
| `intake_validating` | Intake rows are being parsed, normalized, deduped, scoped, and checked for required fields. | `draft`, `ready`, `cancelled`, `archived` | `dry_run_completed`, `approval_pending`, `running`, `completed` | Intake refs, validation result or in-progress validation id. | Wait, correct invalid rows, or defer/remove blockers. | None unless accepting an exception. | `bulk_intake_validating`, `bulk_intake_validated`, `bulk_intake_failed` | Intake records and validation results. | Validation progress with invalid/duplicate counters. | `intake_blocked`, `duplicate_detected`. | Validation can be replayed from original intake values and rules version. |
| `ready` | Intake is valid enough for dry-run or, with an audited dry-run waiver, start approval. | `draft`, `dry_run_running`, `approval_pending`, `cancelled`, `archived` | `running` without approval, `completed`, `failed` | Validated rows, accepted site class decisions or pending manual-review flags, duplicate report, owner assignments. | Start dry-run or request waiver/start approval. | Waiver approval if skipping dry-run. | `batch_ready` | Batch plan and validation result. | Ready badge, dry-run/start-approval actions. | `approval_needed` only when start requested. | If readiness was based on stale inputs, return to `intake_validating`. |
| `dry_run_running` | Non-destructive batch checks/projections are running. | `dry_run_completed`, `dry_run_failed`, `paused`, `cancelled` | `running`, `completed`, `archived` | Dry-run id, immutable input refs, started-at event. | Monitor; avoid duplicate dry-run. | None. | `batch_dry_run_started` | Dry-run result store once implemented. | Dry-run progress and latest check. | None unless stuck by timeout policy. | Dry-run may be retried; previous outputs remain evidence. |
| `dry_run_completed` | Dry-run produced immutable planning evidence and risk summary. | `ready`, `approval_pending`, `dry_run_running`, `cancelled`, `archived` | `running` without approval, `completed` | Dry-run result, risk summary, blockers, cost estimate if available, recommended stop/continue policy. | Review evidence; fix blockers or request start approval. | Start approval next. | `batch_dry_run_completed` | Dry-run evidence plus batch plan. | Dry-run summary, risk, blockers, recommended policy. | `approval_needed`, or blocker-specific items. | Re-run dry-run after input changes; old result is superseded, not overwritten. |
| `dry_run_failed` | Dry-run did not produce acceptable planning evidence. | `ready`, `dry_run_running`, `paused`, `cancelled`, `archived` | `approval_pending` without waiver, `running`, `completed` | Failure diagnostics, failed check, retry eligibility. | Fix inputs/system issue, retry, or request waiver. | Waiver required before approval/start without dry-run. | `batch_dry_run_failed` | Dry-run failure record. | Failed dry-run panel with retry/waiver path. | `dry_run_failed`. | Retry dry-run from same input refs or after correction; no jobs run. |
| `approval_pending` | Batch has enough evidence for an authorized human to approve or reject start/continue/exception. | `ready`, `running`, `paused`, `cancelled`, `archived` | `completed`, `failed` without execution or cancellation evidence | Evidence package, dry-run ref or waiver, policy, site counts, unresolved blocker list, cost threshold. | Route decision to approver; answer questions. | Required approval by migration operator, agency admin, or superadmin according to risk. | `batch_approval_requested`, `batch_approval_granted`, `batch_approval_rejected` | Approval records/events. | Approval queue state and evidence snapshot. | `approval_needed`. | Rejection returns to `ready` or `paused`; approval is append-only and never replayed. |
| `running` | Approved operator-assisted execution is active. | `paused`, `partially_failed`, `failed`, `completed`, `cancelled` | `draft`, `intake_validating`, `dry_run_running` | Start approval, job list, execution policy, current job/stage events. | Monitor, pause, triage failures, avoid duplicate execution. | Prior start/continue approval. | `batch_started`, `batch_job_started`, `batch_job_completed`, `batch_job_failed` | Migration batch/job/stage stores and audit events. | Live progress, current stage, counters, latest failure. | Failure-specific items only. | Safe stop waits for current stage boundary where possible; interruption resumes from first non-succeeded eligible stage. |
| `paused` | Execution is intentionally stopped by operator, max job limit, cost threshold, severity rule, or system guard. | `approval_pending`, `running`, `partially_failed`, `failed`, `cancelled`, `archived` | `completed` if unresolved runnable work remains | Pause reason, current counters, last safe stage/job, blocker refs. | Resolve blocker, request continue, defer/cancel remaining sites. | Resume approval required for high/critical, cost, unsupported, publish, or incident pauses. | `batch_paused`, `batch_resume_requested`, `batch_resumed` | Batch status plus pause event/reason. | Paused banner, resume/triage controls. | `batch_paused` and specific blocker items. | Resume from next eligible item; replay only approved deterministic stages. |
| `partially_failed` | One or more site items failed or are deferred, while other items completed or remain eligible. | `approval_pending`, `running`, `paused`, `failed`, `completed`, `cancelled`, `archived` | `draft`, `dry_run_running` | Failed/deferred item list, severity, recovery eligibility, continue policy. | Triage failed items; continue eligible work or close with failures. | Required to continue after high/critical failures. | `batch_partially_failed` | Batch state plus failure records. | Partial failure counters and grouped failures. | `import_failed`, `review_needed`, `recovery_evidence_needed`, etc. | Eligible site items can retry/replay; unresolved items may be deferred into new batch. |
| `failed` | Batch cannot safely continue under current plan. | `approval_pending`, `paused`, `cancelled`, `archived` | `running` without new approval, `completed` without recovery/closeout | Batch-level failure code, severity, affected items, root cause or unknown classification. | Open incident/recovery plan, request approval to resume or cancel. | Required for any resume/reopen. | `batch_failed` | Batch state plus failure/incident record. | Failed status, owner, recovery plan. | `batch_failed`, `incident_open`, `recovery_evidence_needed`. | Recovery requires new decision context; no blind resume. |
| `completed` | All site items reached the intended batch target with no unresolved batch-blocking failures. | `archived` | `running`, `paused`, `failed` without reopen policy | Final counters, item states, evidence refs, cost summary, no unresolved blockers. | Produce closeout, review reporting summary. | Closeout approval recommended for portfolio wave. | `batch_completed` | Batch closeout record and audit. | Completed badge and closeout report. | None. | Retry/replay requires new batch or explicit reopen policy later. |
| `cancelled` | Batch is intentionally stopped and will not continue under current plan. | `archived` | `running`, `completed`, `failed` without cancellation evidence | Cancellation reason, affected items, approver, remaining work disposition. | Notify owners, defer/archive items, preserve evidence. | Operator approval; superadmin if critical/cross-client. | `batch_cancelled` | Batch status and cancellation event. | Cancelled badge and final disposition. | Follow-up only for unresolved incidents. | No retry/replay in cancelled batch. New batch required. |
| `archived` | Batch is retained for audit/history and removed from active operations. | None unless future reactivation policy exists. | All active execution transitions | Closeout summary, final state, audit timeline, retention classification. | None except reporting/audit retrieval. | Superadmin or agency/admin closeout policy. | `batch_archived` | Archived batch record and audit log. | Hidden or archive-filter status. | None. | Replay/retry requires new decision context and new audit chain. |

## Site Item States

Required fields for every site item state transition: `batchItemId`, `batchId`, source URL normalized, client/site refs, current state, next state, evidence refs, actor/system actor, timestamp, and correlation id.

| State | Meaning | Allowed transitions | Prohibited transitions | Required evidence | Operator action | Approval requirement | Audit event | Source-of-truth owner | Command Center representation | Ops Inbox representation | Recovery behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `candidate` | Intake row is a possible site for the batch. | `classified`, `blocked`, `deferred`, `cancelled` | `queued`, `running`, `completed`, `approved_for_launch` | Intake row, original/normalized source URL, agency/client refs, required fields status. | Complete fields, validate duplicates, assign owner. | None. | `site_intake_created` | Site intake record. | Candidate row with completeness status. | `intake_blocked` when incomplete. | Correct row or defer/cancel. |
| `classified` | Site class decision is recorded against MVP supported-site-class matrix. | `blocked`, `queued`, `deferred`, `cancelled` | `approved_for_launch`, `completed` without job evidence | Site classification decision, risk flags, exception need. | Accept class, change import mode, or defer unsupported sites. | Superadmin for unsupported/import-only launch exception. | `site_classified` | Classification decision record. | Site class badge and launch eligibility. | `unsupported_site_class` when high risk. | Reclassify only with new evidence/audit; do not overwrite prior decision silently. |
| `blocked` | Site item cannot proceed because required evidence, ownership, classification, source, domain, approval, or system dependency is missing. | `candidate`, `classified`, `queued`, `deferred`, `cancelled` | `running`, `completed`, `approved_for_launch` | Blocker type, severity, owner, needed evidence. | Resolve, escalate, defer, or cancel. | Depends on blocker/exception. | `site_blocked` | Blocker/review/failure record. | Blocked badge and owner. | Specific blocker item. | Recovery requires canonical blocker resolution evidence. |
| `queued` | Site item has an approved migration job/batch position but is not executing. | `running`, `blocked`, `deferred`, `cancelled` | `completed`, `approved_for_launch` | Job id, position, input refs, batch start approval. | Start/continue batch when allowed. | Batch start/continue approval already required. | `site_queued` | Migration job/batch membership. | Queued position and stage readiness. | None unless stale. | If prior failure was reset, replay request refs must be visible. |
| `running` | Site migration job/stage is executing. | `completed`, `completed_with_warnings`, `failed`, `review_required`, `blocked` | `approved_for_launch`, `cancelled` without safe-stop evidence | Running job/stage event, attempt id, input refs. | Monitor; pause batch if needed. | Prior batch/job approval. | `site_import_started`, `stage_started`, `stage_succeeded`, `stage_failed` | Migration job/stage store. | Current stage and attempt. | Stuck/failure item if threshold exceeded. | Safe stop after stage boundary; process interruption resumes from current/first non-succeeded stage after audit. |
| `completed` | Import target for the site item completed without launch-blocking warnings. | `review_required`, `approved_for_launch`, `deferred` | `running`, `cancelled` without reopen/cancel policy | Import result, runtime artifact refs, source capture refs, preview readiness if generated. | Review preview/readiness; prepare approval. | Launch approval still required later. | `site_import_completed` | Migration job, runtime artifact, provenance refs. | Import completed badge. | None unless review pending. | Deterministic downstream checks may be replayed; import result remains immutable evidence. |
| `completed_with_warnings` | Import produced usable output but warnings require review or exception. | `review_required`, `approved_for_launch`, `failed`, `deferred` | `approved_for_launch` without reviewed warning/exception | Warning diagnostics, degraded capture, missing assets, route warnings, review blocker refs. | Triage warnings, replay eligible stages, request exception, or defer. | Exception approval for launch-visible warnings. | `site_import_completed_with_warnings`, `site_capture_degraded` | Import result and review blocker records. | Completed-with-warnings badge and warning groups. | `capture_degraded`, `route_review_needed`, `review_needed`. | Recover by replay, correction, or accepted limitation with approval. |
| `failed` | Site item failed before acceptable batch target. | `queued`, `running`, `review_required`, `deferred`, `cancelled` | `completed`, `approved_for_launch` without recovery evidence | Failure code, failed stage, diagnostics, attempt count, retry/replay eligibility. | Classify failure, retry/replay/defer/escalate. | Retry/replay approval required. | `site_import_failed` | Failure record plus job/stage events. | Failure panel with allowed actions. | `import_failed`, `preview_failed`, or specific failure item. | Eligible deterministic stages can replay; non-deterministic checks create new evidence; side effects not replayed. |
| `review_required` | Human review is required before launch eligibility. | `approved_for_launch`, `completed_with_warnings`, `blocked`, `deferred`, `cancelled` | `running`, `published` | Preview readiness result, review checklist, content/route/form/widget/domain blockers. | Review, request content correction, accept limitation, or reject. | Client/content/technical approval according to blocker. | `review_requested`, `review_completed`, `review_rejected` | Review blocker and approval records. | Review-required status and checklist. | `review_needed`, `approval_needed`. | Manual repeat after correction; human review decisions are not replayed. |
| `approved_for_launch` | Required launch approval is recorded for this site item. | `completed`, `completed_with_warnings`, `deferred`, `cancelled` | `running`, `failed` without approved recovery, publish activation without separate gate | Approval reference, evidence snapshot, accepted limitations, rollback target or recovery plan if publish-ready. | Hand off to publish/domain readiness workflow when applicable. | Launch approval present; publish activation approval remains separate. | `site_approved_for_launch` | Approval record/event. | Approved badge with remaining domain/publish blockers. | None unless domain/publish blocker exists. | Approval may expire or be superseded; never replayed. |
| `deferred` | Site intentionally leaves the current batch wave. | `candidate`, `classified`, `queued`, `cancelled` by new decision | `running`, `completed`, `approved_for_launch` without re-entry evidence | Defer reason, owner, follow-up ref/date. | Replan later or archive. | Operator/account approval; superadmin for critical exceptions. | `site_deferred` | Site item disposition record. | Deferred badge and reason. | Optional follow-up item only. | New batch or audited re-entry required. |
| `cancelled` | Site item is intentionally stopped and will not continue in this batch. | None unless future reactivation policy. | All active transitions | Cancellation reason, actor, final evidence refs. | Preserve final disposition. | Operator approval; superadmin if critical/cross-client. | `site_cancelled` | Site item disposition record. | Cancelled row. | None unless incident remains. | Retry/replay requires new item/batch context. |

## Batch Creation Rules

- A batch must have a name, owner, agency scope, created-by actor, creation timestamp, and purpose.
- A batch may start as empty `draft`, but it cannot become `ready` without at least one non-cancelled candidate or an audited empty-batch closeout reason.
- Batch membership order is stable and explicit. Reordering after approval requires a new audit event and may require renewed approval.
- BMF MVP recommends batches of 10 to 25 sites for execution, with a hard design warning above 50 sites. A 200-site migration wave should be split into multiple batches/cohorts.
- Batch priority is determined by `priority`, client/account urgency, site class risk, domain readiness, approval owner availability, and cost threshold policy.

## Batch Membership Rules

- A site item belongs to one active migration batch at a time unless a future ADR defines parallel comparison batches.
- A site item must reference intake, client/agency scope, normalized source URL, intended domain/no-domain intent, classification decision, and operator owner before it becomes `queued`.
- Membership removal after `running` requires cancellation or deferral evidence.
- Import-only, deferred, and out-of-scope rows may remain in the batch for reporting but must not count as launch-ready.

## Duplicate URL And Site Handling

- Duplicate normalized source URL in the same intake blocks affected rows until merged, intentionally duplicated, or deferred.
- Duplicate normalized source URL across different clients is high severity and requires superadmin/account review.
- Duplicate intended domain across clients or active domain bindings is critical and pauses batch start for affected rows.
- Existing site identity must be reused only when ownership scope matches; cross-client mismatch blocks import.
- Redirect/canonical variants must be recorded as aliases, not silently merged.

## Safe Stop And Safe Continue

- Safe stop means the batch stops at the next stage boundary, records current job/stage/attempt refs, and leaves already succeeded stages intact.
- If a worker/process interruption happens mid-stage, the resumed run must classify the prior attempt as interrupted/unknown before retry or replay.
- Safe continue means only eligible queued/failed items continue under approved policy while blocked/high-risk items remain stopped.
- Critical failures, publish failures, rollback-required incidents, duplicate target domain conflicts, cost anomalies above threshold, and unsupported launch attempts pause the batch or publish wave by default.

## Partial Failure Policy

- Low/medium site-level failures may allow the batch to continue when the approved policy allows.
- High failures block affected sites and require owner assignment before continuation.
- Critical failures pause the batch or affected launch wave.
- A batch can close as `completed` only when no unresolved failures remain for the declared batch target.
- Failed/deferred/import-only/out-of-scope sites must be listed in closeout and may be moved to a later batch only by new audited decision.

## Retry And Replay Eligibility

- Retry repeats an approved action and must record reason, actor, attempt count, prior failure, and expected stop condition.
- Replay resets deterministic stage outputs from immutable input refs and must reset downstream derived outputs.
- Fully deterministic replay applies to intake validation, URL normalization, static import from persisted inputs, route assembly from persisted acquisition, runtime artifact creation from immutable inputs, content slot inference, and preview generation from canonical artifacts.
- Deterministic replay with external input refs applies when persisted external inputs are used, such as captured HTML, robots/sitemap snapshots, or source capture refs.
- Replay with environmental variance applies to source reachability, rendered capture, raw fetch, multi-page discovery against a live source, and domain/provider checks.
- Manual retry only applies to review, content correction, domain owner follow-up, and client approval routing.
- Not replayable: human approvals, publish activation, rollback, external workflow truth, and cost exception decisions.
- Forbidden replay: live DNS/registrar mutation, provider execution, autonomous AI execution, autonomous regeneration, and billing mutation in MVP.

## Escalation And Cost Pause Policy

- Superadmin escalation is required for cross-client duplicates, unsupported launch exceptions, critical failures, publish failures, rollback-required incidents, cost-threshold overrides, and any request to bypass source-of-truth guardrails.
- Technical escalation is required for repeated capture/import/artifact/preview failures and worker/process interruption.
- Account/client escalation is required for missing approval owner, unclear domain ownership, form/widget/booking acceptance, SEO redirects, and external workflow blockers.
- Cost pause occurs when dry-run estimate or execution cost event exceeds the approved threshold, when a cost anomaly is detected, or when repeated retries would exceed the approved budget. Resume requires cost exception approval.

## Unsupported Site Class Pause Policy

- Unsupported classes include commerce, auth/member, payment flows, custom backend apps, compliance-heavy sites without separate approval, and heavy JavaScript sites that cannot be proven as static snapshots.
- Unsupported rows may be `deferred`, `cancelled`, or retained as import-only review items.
- Any unsupported site item attempting to become `approved_for_launch` pauses the site and may pause the batch when systemic classification drift is suspected.

## Domain And Publish Boundary

- Domain readiness is site-scoped and may block custom-domain publish without blocking import/review for unrelated sites.
- BMF may record intended domain, DNS owner notes, manual DNS instruction snapshots, and Vercel/domain readiness evidence where current foundations support checks.
- BMF must not claim live registrar/DNS mutation, Openprovider live mutation, autonomous domain changes, or provider execution as MVP behavior.
- Publish activation is outside batch import execution and remains a separately approved side effect.
- Publish failure stops the publish wave and opens incident/recovery flow; it is not a deterministic replay.

## Batch Closeout Requirements

Every batch closeout must include:

- Final batch state and closeout actor.
- Site item counts by state and site class.
- Completed, completed-with-warnings, failed, deferred, cancelled, import-only, and out-of-scope lists.
- Dry-run result refs and start/continue approval refs.
- Failure/recovery summary and unresolved blocker list.
- Retry/replay requests and outcomes.
- Preview/review/approval/domain/publish readiness summaries.
- Cost estimate/events/anomaly decisions.
- Incident/rollback refs if any.
- Audit timeline refs and external workflow refs.
- Confirmation that Command Center/Ops Inbox items derive from canonical state.
