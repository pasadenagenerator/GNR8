# GNR8 MVP Operational State Model

MVP-1 canonical operational state model for a site moving through operator-assisted migration, review, launch, incident handling, and recovery.

This document is documentation-only. States may be implemented later as stored state, derived read model, or a combination, but this document does not authorize implementation changes.

## Model Scope

Site-level operational state is projected from site identity, intake, migration jobs, migration batches, stage events, runtime site versions, runtime artifacts, content overrides, preview/readiness checks, approval records, domain bindings, publish events, rollback events, cost signals, audit events, and incidents.

Command Center is the primary operator representation. Ops Inbox is a derived work queue for blocked or action-required states and is not a separate source of truth.

## Site-Level States

| State | Meaning | Allowed transitions | Prohibited transitions | Required evidence | Operator action | Approval requirement | Audit event | Source-of-truth owner | Command Center representation | Ops Inbox representation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `intake_created` | Site has been entered with initial agency/client/source context. | `intake_validated`, `intake_blocked`, `archived_decommissioned` | `import_running`, `publish_ready`, `published` | Client/site owner, source URL, intake source, initial site class if known. | Complete missing metadata and classify source. | None. | `site_intake_created` | Site/intake records; source URL field. | New intake with completeness status. | None unless required fields are missing. |
| `intake_validated` | Intake has enough evidence to queue import. | `import_queued`, `intake_blocked`, `archived_decommissioned` | `preview_ready`, `approval_pending`, `published` | Valid source URL, supported/manual-review class, owner, migration policy. | Add to job/batch or schedule import. | Batch approval only if batch start is immediate. | `site_intake_validated` | Site/intake plus migration job plan. | Ready for import. | None. |
| `intake_blocked` | Intake cannot proceed because evidence, ownership, site class, source access, or client data is missing. | `intake_created`, `intake_validated`, `archived_decommissioned` | `import_running`, `publish_ready`, `published` | Blocker type, owner, reason, required correction. | Resolve blocker or defer. | Exception approval for unsupported/damaged source continuation. | `site_intake_blocked` | Site/intake blocker record or audit. | Blocked intake badge with owner. | `intake blocked`. |
| `import_queued` | Site has a migration job/batch position but execution is not running. | `import_running`, `intake_blocked`, `archived_decommissioned` | `preview_ready`, `published` | Job id, batch id if any, source URL, input refs, policy. | Start batch/job when approved. | Batch/job start approval. | `import_queued` | Migration job/batch store. | Queued position and batch membership. | None unless stale. |
| `import_running` | Import/capture/discovery/artifact stages are executing. | `import_completed`, `import_completed_with_warnings`, `import_failed` | `approval_pending`, `publish_ready`, `published` | Running job/stage events, system actor, input refs. | Monitor progress; avoid duplicate execution. | Prior batch/job approval. | `import_started`, `stage_started`, `stage_succeeded`, `stage_failed` | Migration job/stage state. | Current stage/progress. | Stuck import if heartbeat/staleness policy flags it. |
| `import_failed` | Import failed before producing acceptable preview/runtime artifacts. | `import_queued`, `import_running`, `intake_blocked`, `archived_decommissioned` | `preview_ready`, `approval_pending`, `published` | Failed stage, diagnostics, retry eligibility, input refs. | Triage, correct, retry/replay, or defer. | Retry/replay approval. | `import_failed` | Migration job/stage/events. | Failure with retry/replay options. | `import failed`. |
| `import_completed_with_warnings` | Import produced artifacts/preview inputs but warnings require review. | `preview_ready`, `review_pending`, `content_changes_requested`, `intake_blocked` | `approved_for_launch`, `published` without review/exception | Artifact refs, warning diagnostics, missing/degraded evidence. | Review warnings, classify risk, request changes or exception. | Exception approval if warnings remain launch-visible. | `import_completed_with_warnings` | Runtime artifacts plus migration diagnostics. | Completed with warnings/degraded badge. | `capture degraded` or `review needed`. |
| `import_completed` | Import produced acceptable artifacts and diagnostics for normal review. | `preview_ready`, `review_pending` | `publish_ready`, `published` | Site version, runtime artifact/raw artifact, route map, diagnostics. | Generate/check preview and start review. | None at this state. | `import_completed` | Runtime artifact store and migration job events. | Import complete; preview next. | None. |
| `preview_ready` | Preview is available for operator/client review. | `review_pending`, `content_changes_requested`, `approval_pending`, `domain_pending` | `published` without approval/publish gates | Preview URL/ref, site version, artifacts, readiness/smoke result. | Inspect preview, share for review if allowed. | Approval required only to share externally when policy requires. | `preview_ready` or `preview_generated` | Preview service derived from runtime artifacts. | Preview ready action. | `review needed` when no review exists. |
| `review_pending` | Human review is required for fidelity, content, forms/widgets/scripts, SEO, or class risk. | `content_changes_requested`, `approval_pending`, `intake_blocked`, `import_queued` | `publish_ready`, `published` | Review checklist, preview, WU/VCU if used, warnings/blockers. | Complete review or request fixes. | Client approval if client review is required. | `review_requested`, `review_completed` | Approval/review records plus evidence refs. | Review status and blockers. | `review needed`. |
| `content_changes_requested` | Content or presentation corrections are needed before approval/launch. | `preview_ready`, `review_pending`, `approval_pending`, `intake_blocked` | `approved_for_launch`, `published` | Change request, draft override diffs, requester, preview refs. | Apply/edit draft overrides and re-preview. | Content approval before published override. | `content_change_requested`, `draft_override_saved` | Content overrides/history and review records. | Content changes pending. | `content change requested`. |
| `approval_pending` | Required human approval is missing for launch, content, exception, domain, publish, rollback, or cost. | `approved_for_launch`, `domain_pending`, `review_pending`, `content_changes_requested` | `published` | Approval type, approver role, evidence package, blocked action. | Route approval request and collect decision. | Required designated approval. | `approval_requested`, `approval_granted`, `approval_rejected` | Approval record/event store. | Approval queue item. | `approval needed`. |
| `approved_for_launch` | Launch approval exists; technical/domain/publish gates may remain. | `domain_pending`, `domain_ready`, `publish_ready`, `approval_pending` | `published` without publish approval | Approval record, reviewed preview, accepted limitations, content state. | Complete domain/readiness/publish checks. | Launch approval is present; publish approval still required later. | `launch_approval_granted` | Approval state and site version refs. | Approved with remaining blockers. | None unless domain/readiness pending. |
| `domain_pending` | Custom domain setup, DNS instructions, Vercel check, or SSL/readiness is incomplete. | `domain_ready`, `approval_pending`, `approved_for_launch`, `intake_blocked` | `published` on custom domain without exception | Domain binding, DNS instruction snapshot, Vercel state, owner. | Perform manual DNS steps, attach/check Vercel domain, recheck. | Domain action approval; client action if client controls DNS. | `domain_check_requested`, `dns_instructions_shown` | Domain host binding and external Vercel snapshot. | Domain pending with action owner. | `domain action needed`. |
| `domain_ready` | Domain readiness is acceptable or an explicit internal-domain exception exists. | `publish_ready`, `approval_pending`, `domain_pending` | `published` without publish gate | Verified status or approved exception, instruction snapshot, freshness timestamp. | Move to publish readiness. | Domain approval complete. | `domain_verified` or `domain_exception_approved` | Domain host binding/readiness snapshot. | Domain ready badge. | None. |
| `publish_ready` | All review, content, approval, domain/readiness, and rollback prerequisites are satisfied. | `published`, `publish_failed`, `approval_pending` | `import_running`, `review_pending`, `domain_pending` | Approved version/artifact, published override plan, readiness snapshot, domain state, rollback target. | Request/execute publish if authorized. | Publish activation approval. | `publish_requested` | Publish readiness projection plus canonical inputs. | Publish-ready action. | `publish ready`. |
| `published` | Approved version/artifact and published overrides are active in public runtime. | `rollback_available`, `incident_open`, `archived_decommissioned`, `content_changes_requested` | `import_running` as same active state | Publish event, active pointer, domain/runtime health, approved content state. | Monitor, record post-launch checks. | Publish approval already completed. | `publish_completed` | Active pointer, site version, runtime artifact, published overrides. | Live status and active version. | None unless incident/cost/domain issue. |
| `publish_failed` | Publish activation failed or produced unacceptable public/readiness state. | `publish_ready`, `rollback_required`, `incident_open` | `published` without success event | Failure log, before/after pointer, readiness/domain state. | Open incident, retry if safe, or rollback. | Retry or rollback approval. | `publish_failed` | Publish event/audit/runtime state. | Critical publish failure. | `publish failed`. |
| `rollback_available` | A known-good runtime version/content state is available for recovery. | `incident_open`, `rollback_required`, `published`, `archived_decommissioned` | None specific | Previous active pointer/version/content history and verification. | Keep recovery path visible. | None until rollback requested. | `rollback_available_recorded` | Version history, publish history, content history. | Recovery available badge. | None. |
| `rollback_required` | An incident or failed launch requires rollback decision/execution. | `rollback_completed`, `incident_open`, `published` | `archived_decommissioned` before recovery decision | Incident/reason, target version/content state, impact, approvals. | Approve and execute rollback or document why not. | Rollback approval; emergency path still audited. | `rollback_requested` | Incident/audit/version/content history. | Critical rollback banner. | `rollback needed`. |
| `rollback_completed` | Rollback action finished and post-action verification is required or complete. | `incident_resolved`, `published`, `publish_ready` | `rollback_required` without before/after record | Before/after pointer or content diff, verification evidence. | Verify public state and close/update incident. | Technical/account signoff per policy. | `rollback_completed` | Active pointer/content history plus rollback event. | Rolled back with verification status. | `incident open` until resolved. |
| `incident_open` | Active incident affects migration, runtime, domain, publish, rollback, content, cost, or client operations. | `incident_resolved`, `rollback_required`, `publish_ready`, `published` | `archived_decommissioned` without resolution | Incident severity, owner, trigger, evidence, current impact. | Triage, communicate, recover. | Depends on recovery action. | `incident_opened`, `incident_updated` | Incident/recovery event model plus related canonical state. | Portfolio/site incident alert. | `incident open`. |
| `incident_resolved` | Incident is closed with evidence and follow-up status. | `published`, `publish_ready`, `review_pending`, `archived_decommissioned` | None without resolution evidence | Resolution note, verification, remaining follow-up, approvals if any. | Close incident and update site operational status. | Technical/account signoff per policy. | `incident_resolved` | Incident/recovery event model. | Resolved history/status. | None. |
| `archived_decommissioned` | Site is removed from active MVP migration/operations wave or decommissioned. | None without future reactivation policy | `published`, `publish_ready` without explicit archive approval | Archive reason, final active state, domain/source handoff, owner approval. | Archive/decommission and preserve audit. | Superadmin or agency admin. | `site_archived` or `site_decommissioned` | Site status/runtime/domain/audit. | Archived filter/status. | None. |

## Site-Level State Groups

| Group | States |
| --- | --- |
| Intake | `intake_created`, `intake_validated`, `intake_blocked` |
| Import | `import_queued`, `import_running`, `import_failed`, `import_completed_with_warnings`, `import_completed` |
| Review | `preview_ready`, `review_pending`, `content_changes_requested`, `approval_pending`, `approved_for_launch` |
| Domain/publish | `domain_pending`, `domain_ready`, `publish_ready`, `published`, `publish_failed` |
| Recovery/incident | `rollback_available`, `rollback_required`, `rollback_completed`, `incident_open`, `incident_resolved` |
| Terminal/inactive | `archived_decommissioned` |

## Batch-Level States

Batch-level states align with current migration-batch evidence while reserving stricter MVP semantics.

| Batch state | Meaning | Allowed transitions | Required evidence | Operator action | Audit event | Ops Inbox representation |
| --- | --- | --- | --- | --- | --- | --- |
| `draft` | Batch exists but is not ready to run. | `ready`, `cancelled` | Batch name, owner, candidate sites. | Complete site list and preflight. | `batch_created` | None unless incomplete. |
| `ready` | Batch passed intake validation and is ready for approved execution. | `running`, `cancelled`, `paused` | Validated site list, site classes, dry-run summary if available. | Approve/start run. | `batch_ready` | `approval needed` if start approval missing. |
| `running` | Operator-triggered batch execution is active. | `paused`, `completed`, `failed`, `partially_failed` | Batch run event, current job/stage. | Monitor and triage. | `batch_started`, batch job events | Stuck/failed jobs only. |
| `paused` | Batch is stopped by operator, policy, maxJobs, cost, failure, or blocker. | `running`, `cancelled`, `partially_failed` | Pause reason, resume eligibility. | Resolve blocker or resume. | `batch_paused` | `batch paused` / blocker-specific item. |
| `completed` | All jobs completed without launch-blocking failures. | None except future archival/reporting | Summary counts and completion event. | Review closeout. | `batch_completed` | None. |
| `partially_failed` | Some jobs completed and some failed/degraded. | `running`, `paused`, `completed`, `cancelled` | Failure/degraded job list and policy. | Triage failed jobs, resume allowed work. | `batch_partially_failed` | `import failed`, `capture degraded`, or `review needed`. |
| `failed` | Batch failed according to policy and should not continue without review. | `paused`, `running`, `cancelled` | Failure reason, failed job/stage, stopped policy. | Open recovery work and decide retry/resume. | `batch_failed` | `batch failed`. |
| `cancelled` | Batch intentionally stopped and will not continue under current plan. | None | Cancellation reason and approver. | Archive/report. | `batch_cancelled` | None. |

## Failure States

| Failure state | Trigger | Required response | Recovery path |
| --- | --- | --- | --- |
| `intake_blocked` | Missing/invalid source, ownership, site class, or client data. | Assign owner and correction. | Validate intake or archive/defer. |
| `import_failed` | Stage failure before acceptable artifact/preview. | Diagnose stage and retry eligibility. | Correct input, replay deterministic stage, or defer. |
| `import_completed_with_warnings` | Artifact exists but capture/route/widget/form/asset warnings remain. | Manual review and exception decision. | Accept warning with approval, re-import, or defer. |
| `domain_pending` | DNS/Vercel/SSL state incomplete. | Manual DNS action or recheck. | Recheck until ready or approve internal-domain exception. |
| `publish_failed` | Active pointer/publish activation/readiness failed. | Open incident and stop publish wave. | Retry only after root cause or rollback. |
| `rollback_required` | Live issue needs recovery. | Approve rollback target and execute. | Rollback completed then incident resolved. |
| `incident_open` | Any operational issue needs managed response. | Assign owner/severity and run recovery path. | Incident resolved with verification. |

## Recovery States

| Recovery state | Meaning | Gate |
| --- | --- | --- |
| `rollback_available` | A prior known-good version/content state is known. | Must exist or be waived before publish. |
| `rollback_required` | Incident requires rollback decision. | Rollback approval and target evidence. |
| `rollback_completed` | Recovery action happened. | Post-action verification and incident resolution. |
| `incident_resolved` | Recovery is complete enough to close. | Evidence and follow-up recorded. |

## Prohibited Shortcuts

- `intake_created` or `intake_blocked` to `import_running` without `intake_validated`.
- Any import state to `publish_ready` without preview/review/approval/domain/rollback evidence.
- `preview_ready` to `published` without `approval_pending`/`approved_for_launch` and `publish_ready`.
- `import_completed_with_warnings` to `approved_for_launch` without reviewed warnings or exception approval.
- `domain_pending` to `published` on a custom domain without domain readiness or explicit internal-domain exception.
- `publish_failed` to `published` without a new successful publish event.
- `rollback_required` to `incident_resolved` without rollback completion or documented alternative recovery.
- Any AI/provider/projection/thumbnail/proposal artifact to mutate state directly.
- Ops Inbox item dismissal without updating the underlying source-of-truth state.

## Approval Gates

| Gate | Applies before | Evidence required |
| --- | --- | --- |
| Batch start approval | `import_queued` to `import_running` for batch jobs | Validated batch, site list, policy, known blockers. |
| Retry/replay approval | `import_failed` to `import_queued`/`import_running` | Failed stage, immutable input refs, retry reason. |
| Warning/exception approval | `import_completed_with_warnings` to `approval_pending`/`approved_for_launch` | Warnings, risk owner, accepted limitation. |
| Client/content approval | `content_changes_requested` to `approval_pending`/`approved_for_launch` | Diff, preview, requested change source. |
| Launch approval | `approval_pending` to `approved_for_launch` | Preview, readiness, known limitations, client/agency signoff. |
| Domain approval | `domain_pending` to `domain_ready` | DNS instruction snapshot, Vercel/check status, client DNS action if needed. |
| Publish activation approval | `publish_ready` to `published` | Approved version/artifact, domain readiness, rollback target, readiness snapshot. |
| Rollback approval | `rollback_required` to `rollback_completed` | Incident, target version/content state, impact, before/after plan. |
| Cost exception approval | Any cost-blocked state | Cost event summary, threshold, approver, decision. |

## Publish Gates

Publish is allowed only when all are true:

- Site state is `publish_ready`.
- Site class is supported or supported with manual review and required review is complete.
- Runtime site version and artifact are present and approved.
- Published override state is reviewed or explicitly empty.
- Preview smoke/readiness is current.
- Domain is `domain_ready` or an internal/staging-domain exception is approved.
- Rollback target or recovery plan is recorded.
- Publish activation approval is recorded.

## Rollback Gates

Rollback is allowed only when all are true:

- State is `rollback_required`, `publish_failed`, or `incident_open` with rollback decision.
- Target version/artifact or content history entry is known-good or explicitly selected with risk acceptance.
- Before/after pointer or content state can be recorded.
- Technical operator or superadmin approval exists, except emergency rollback where approval and audit must still be captured immediately.
- Post-rollback verification is required before `incident_resolved`.

## Domain Gates

Custom-domain publish requires:

- Domain binding exists for the site.
- DNS instructions were generated from current provider/Vercel state and are not stale.
- Vercel/domain verification is `ready`/acceptable or an explicit exception exists.
- Client DNS action is recorded when the client controls DNS.
- No live registrar/DNS mutation is assumed.
- Openprovider/provider state is read-only in MVP unless a future ADR changes it.

## Command Center Projection Contract

Command Center must show for each site:

- current operational state;
- site class and launch eligibility;
- owner and next required action;
- batch/job/stage state;
- latest import/capture/artifact evidence;
- preview/readiness status;
- approval blockers;
- domain/DNS state;
- publish/rollback readiness;
- incident/recovery status;
- cost anomaly flags;
- allowed and prohibited actions with reasons;
- audit timeline links.

## Ops Inbox Taxonomy

Ops Inbox items are derived from source state:

- `intake blocked`
- `batch paused`
- `batch failed`
- `import failed`
- `capture degraded`
- `review needed`
- `content change requested`
- `approval needed`
- `domain action needed`
- `publish ready`
- `publish failed`
- `rollback needed`
- `incident open`
- `cost anomaly`
- `external workflow update`
- `ai plan review`

Closing an item requires a canonical state transition or an audited decision that the work is no longer required.
