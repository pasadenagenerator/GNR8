# GNR8 MVP Operational State Model

MVP-1 canonical website operational state model for the operator-assisted migration factory and website operations backbone.

States below describe operator-visible state for one website. They may be projected from several canonical stores: site identity, migration jobs/batches, runtime site versions, artifacts, content state, approval records, domain host bindings, publish events, rollback events, audit events, and incidents.

## State Model

| State | Meaning | Allowed transitions | Prohibited transitions | Required evidence | Required operator action | Required approval | Audit event | Source-of-truth fields/artifacts | Command Center representation | Ops Inbox representation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `intake_created` | Site has been entered for migration with agency/client/site/source context. | `import_pending`, `review_blocked`, `archived_decommissioned` | `published`, `publish_ready` | Site/client/source URL, site class if known | Validate intake and classification | None | `site_intake_created` | `sites`, source URL intake/job input | New site row, intake completeness badge | `intake blocked` if required fields missing |
| `import_pending` | Site is ready to be imported but no active import is running. | `import_running`, `review_blocked`, `archived_decommissioned` | `preview_ready`, `published` | Valid intake, batch/job assignment | Start import or add to batch | Batch start approval if in batch | `import_queued` or `batch_job_added` | `gnr8_migration_jobs`, batch membership | Pending import status | None unless blocked |
| `import_running` | Import/capture/discovery stages are executing. | `import_succeeded`, `import_failed`, `capture_degraded` | `publish_ready`, `published`, `approved_for_launch` | Running job/stage event, system actor | Monitor; avoid duplicate execution | Prior batch/job approval | `import_started`, stage events | Migration job/stage records | Active progress/stage indicator | None unless stuck |
| `import_succeeded` | Import produced runtime artifacts and usable preview inputs. | `review_pending`, `preview_ready`, `capture_degraded` | `published` without review/approval | Artifact refs, route map, diagnostics | Review preview/readiness | None | `import_completed` | Runtime artifacts, site version, job events | Success with readiness next step | None |
| `import_failed` | Import failed before producing acceptable artifact/preview. | `import_pending`, `import_running`, `review_blocked`, `archived_decommissioned` | `preview_ready`, `publish_ready`, `published` | Failure category, diagnostics, failed stage | Triage retry/replay/defer | Retry approval | `import_failed` | Job/stage/events | Failed status with retry eligibility | `import failed` |
| `capture_degraded` | Import exists but rendered capture/evidence is missing or partial. | `review_pending`, `import_running`, `review_blocked` | `approved_for_launch` without exception | Degradation diagnostics, fallback artifact refs | Decide raw fallback/manual review/replay | Exception approval if launch with degraded evidence | `capture_degraded` | Capture evidence, provenance, render jobs | Degraded badge and missing evidence | `capture degraded` |
| `review_pending` | Site needs operator/client/content/technical review. | `preview_ready`, `content_changes_requested`, `review_blocked`, `approval_pending` | `publish_ready`, `published` | Preview, artifacts, classification, blockers | Review fidelity/content/forms/scripts | Client approval if client review required | `review_requested` | Approval/review records TBD, preview refs | Review required status | `review needed` |
| `review_blocked` | Review cannot complete due missing evidence, unsupported class, client input, or technical blocker. | `import_pending`, `review_pending`, `archived_decommissioned` | `approval_pending`, `publish_ready`, `published` | Blocker reason and owner | Resolve blocker or defer | Exception approval for unsupported class | `review_blocked` | Job events, classification, approval/blocker records | Blocked badge with owner | `intake blocked` or `unsupported site class` |
| `preview_ready` | Preview can be inspected for the imported site/version. | `content_changes_requested`, `approval_pending`, `domain_pending`, `review_blocked` | `published` without approval | Preview URL/ref, site version, artifacts | Send/review preview | None unless client review complete | `preview_generated` | Runtime site version/artifacts/preview state | Preview ready action/status | `review needed` if no review |
| `content_changes_requested` | Content corrections are needed before approval. | `preview_ready`, `approval_pending`, `review_blocked` | `approved_for_launch`, `published` | Requested changes, draft overrides/diff | Apply draft, preview, accept/reject | Content approval before publish | `content_change_requested` | `gnr8_content_overrides`, history | Content changes pending | `content change requested` |
| `approval_pending` | Required approval is missing for review, launch, domain, publish, rollback, exception, or cost. | `approved_for_launch`, `review_blocked`, `domain_pending`, `publish_ready` | `published` | Approval type, evidence package, approver role | Route approval request | Approval by designated role | `approval_requested` | Approval records/audit TBD | Approval queue item | `approval needed` |
| `approved_for_launch` | Client/agency/operator launch approval exists, but technical/domain/publish readiness may remain. | `domain_pending`, `domain_ready`, `publish_ready`, `review_blocked` | `published` without publish activation approval | Approval record, preview evidence, content state | Complete domain/readiness checks | Launch approval granted | `approval_granted` | Approval audit, site version refs | Approved badge and remaining blockers | None unless domain/readiness pending |
| `domain_pending` | Custom domain setup or verification is incomplete. | `domain_ready`, `publish_ready`, `review_blocked` | `published` on custom domain | Domain binding, DNS instructions, Vercel status | Manual DNS steps/recheck | Domain change approval | `domain_check_requested` | `gnr8_runtime_domain_host_bindings`, `sites.domain` | Domain pending/readiness detail | `domain action needed` |
| `domain_ready` | Domain binding/DNS verification/SSL readiness is acceptable or an internal-domain exception is approved. | `publish_ready`, `approval_pending`, `review_blocked` | `published` without publish readiness | Verified domain evidence or exception | Move to publish readiness | Domain approval if custom | `domain_verified` | Domain host binding/status/instruction snapshot | Domain ready badge | None |
| `publish_ready` | All launch prerequisites are satisfied and publish can be requested. | `published`, `publish_failed`, `approval_pending` | `import_running`, `review_pending` | Approved version, artifact, content, domain, rollback plan | Request/execute publish if authorized | Publish activation approval | `publish_requested` | Publish readiness projection, approvals, active target | Publish ready queue/action | `publish ready` |
| `published` | Approved version/artifact is active in public runtime. | `rollback_available`, `incident_open`, `archived_decommissioned` | `import_running` as same active state | Publish event, active pointer, domain/runtime health | Monitor site and record launch | Publish approval completed | `publish_completed` | Active pointer/site version/artifact/publish event | Live status with active version | None unless incident |
| `publish_failed` | Publish activation failed or produced invalid public state. | `publish_ready`, `rollback_required`, `incident_open` | `published` without successful event | Publish failure log, active pointer before/after | Open incident, retry or rollback | Retry/rollback approval | `publish_failed` | Publish event/audit/runtime state | Critical failure | `publish failed` |
| `rollback_available` | A known-good prior version/content state exists for recovery. | `incident_open`, `rollback_required`, `archived_decommissioned` | None specific | Previous active version/content history | Keep recovery plan visible | None until rollback requested | `rollback_available_recorded` | Version history/content history | Recovery available badge | None |
| `rollback_required` | Incident/publish/content failure requires rollback decision. | `published`, `incident_open`, `incident_resolved` | `archived_decommissioned` before recovery | Incident, target version, impact | Approve/execute rollback | Rollback approval | `rollback_requested` | Incident/audit/version history | Critical rollback banner | `rollback needed` |
| `incident_open` | Site has active incident affecting migration, launch, domain, runtime, content, or cost. | `incident_resolved`, `rollback_required`, `published` | `archived_decommissioned` without resolution | Incident record, severity, owner, evidence | Triage, communicate, recover | Depends on action | `incident_opened` | Incident/audit records TBD; related canonical state | Incident panel and portfolio alert | `incident open` |
| `incident_resolved` | Incident is closed with recovery evidence. | `published`, `review_pending`, `publish_ready`, `archived_decommissioned` | None without evidence | Resolution note, verification, follow-up | Close incident and update status | Technical/account signoff as policy | `incident_resolved` | Incident/audit record | Resolved status/history | None |
| `archived_decommissioned` | Site is no longer active in the MVP migration/operations wave. | None unless explicitly reactivated by future policy | `published`, `publish_ready` without reactivation | Archive reason, final state, external handoff | Archive/decommission | Superadmin/agency approval | `site_archived` | `sites.status`, runtime state, audit | Archived row/filter | None |

## Transition Rules

1. No state may transition to `publish_ready` unless review, content, approval, domain/readiness, and rollback evidence requirements are satisfied or explicitly waived by an audited exception.
2. No state may transition to `published` without publish activation approval and a publish audit event.
3. No unsupported or out-of-scope site class may transition beyond `review_blocked` without a superadmin exception.
4. `capture_degraded` may continue to review but cannot launch silently. The degradation evidence must be shown to approvers.
5. Rollback is a governed recovery action, not a replay. It requires incident/reason evidence and before/after active pointer records.
6. Ops Inbox items are derived from state and blockers. Completing an Ops Inbox item requires updating the canonical underlying state, not only dismissing the item.
7. AI may recommend a transition only as advisory evidence. AI may not execute transitions in MVP.

## Command Center State Projection

Command Center must project these fields for each site:

| Field | Source |
| --- | --- |
| Current operational state | Derived from migration job, site version, approval, domain, publish, incident state. |
| Site class and risk | Supported-site-class classification and exception records. |
| Owner role/person | Assignment or derived work item owner. |
| Active blockers | Review, approval, domain, publish, incident, cost, unsupported class. |
| Latest evidence refs | Import artifacts, capture evidence, preview, DNS instruction snapshot, readiness snapshot. |
| Allowed actions | Derived from role permissions, state, approvals, and forbidden-action policy. |
| Blocked actions | Explicit reason and required approval/evidence. |
| Audit trail link | Unified event timeline or related event stores. |

## Minimum State Evidence Contract

Each state transition must include:

- actor or system actor;
- timestamp;
- prior state;
- next state;
- site id and runtime site version id if known;
- batch/job/stage id if relevant;
- approval ref if relevant;
- artifact/input/output refs if relevant;
- diagnostic codes;
- human-readable reason;
- correlation id.

