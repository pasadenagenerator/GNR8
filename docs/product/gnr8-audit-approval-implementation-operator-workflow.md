# GNR8 Audit, Approval, and Evidence Implementation Operator Workflow (AAF-2)

## Purpose

This document defines the operator-facing MVP workflow for approvals, audit, evidence, policy gates, Command Center, and Ops Inbox. It is documentation only and does not implement UI, APIs, services, schemas, workers, or runtime behavior.

## Blocked Action View

When an operator attempts a privileged action, the surface shows the canonical gate state derived from approval, audit, evidence, policy, and source subject records:

- `blocked_by_policy`
- `approval_required`
- `evidence_missing`
- `evidence_stale`
- `approval_stale`
- `approval_superseded`
- `approval_revoked`
- `audit_unavailable`
- `ready_to_execute`
- `not_required_by_policy`

The UI must not imply that a disabled button, badge, checklist, preview, external ticket, domain readiness state, or AI recommendation is approval truth.

## Evidence Assembly

For a gated action, the operator starts by assembling or refreshing the required evidence package. The evidence builder captures source refs, source watermarks, hashes, package type, limitations, privacy labels, redaction labels, freshness label, expiration timestamp, and audit links.

Large artifacts such as screenshots, rendered previews, logs, provider payloads, PDFs, or external snapshots are stored by immutable object ref. The control plane stores hashes and metadata.

## Freshness And Staleness Display

Fresh evidence is shown with:

- package type,
- subject,
- captured timestamp,
- source watermarks,
- expiration timestamp,
- limitations,
- dependent source refs.

Stale evidence shows the stale reason and the source that changed, such as content draft change, new runtime artifact, changed active pointer, new Vercel snapshot, changed DNS instructions, new batch failure, new cost estimate, or policy version change.

## Requesting Approval

The requester chooses the exact action and subject. The system derives the approval scope, required evidence package type, allowed requester roles, allowed approver roles, freshness rule, separation-of-duty rule, and policy version.

The request creates canonical `approval_requests`, subject refs, evidence links, policy evaluation, and `approval.requested` audit event. If any required write fails, the request is not considered created.

## Approver Review

The approver sees:

- exact scope and allowed action,
- prohibited actions,
- subject refs and tenant/client/site/batch/job/domain/cost scope,
- evidence package and limitations,
- freshness and expiration state,
- requester identity and role,
- policy version and result,
- separation-of-duty status,
- privacy/redaction state,
- prior approvals, revocations, supersessions, and related audit timeline.

The approver can grant, reject, or request new evidence. Approval never carries outside the displayed scope.

## Decision Lifecycle

`granted`, `rejected`, `revoked`, `expired`, `superseded`, `cancelled`, and `not_required_by_policy` states are canonical decisions or derived from canonical links:

- Grant records a scoped approval decision and audit event.
- Reject records a terminal denial and audit event.
- Revoke records a new revocation row and audit event; the original grant remains.
- Expire is recorded when time/freshness passes and blocks execution.
- Supersede is recorded when subject, evidence, or policy changes.
- Cancel withdraws an unresolved request.
- `not_required_by_policy` is displayed as an explicit policy-backed decision, not as absence of approval.

## Execution After Gate Validation

The action executes only after the route/service reruns gate validation. The UI cannot bypass this by carrying a prior `ready` state.

Execution requires current source state, persisted policy evaluation, fresh evidence, effective approval or `not_required_by_policy`, role/scope validation, pre-action audit event, and outcome audit event.

If pre-action audit is unavailable, privileged action execution fails closed except for documented incident emergency policy.

## Audit Timeline

The timeline displays canonical audit events grouped by correlation id. It includes request, policy, evidence, approval, gate, execution, outcome, stale, supersession, revocation, and compensating events.

Partial timelines are shown as degraded. A partial timeline never proves approval. Ops Inbox receives an audit reconciliation item when a side effect occurred but an outcome event is missing.

## Ops Inbox Resolution

Ops Inbox items are derived from canonical state:

- approval requested,
- evidence missing or stale,
- approval expired/revoked/superseded,
- policy blocked,
- audit write failure,
- incident recovery follow-up,
- external reference review,
- AI advisory review.

Items resolve only through canonical evidence refresh, approval decision, policy result, compensating audit event, revocation/supersession, or source subject state change. Manual dismissal is not approval truth.

## Command Center Gate State

Command Center shows per-site, per-batch, and per-action gate state. Bulk actions must split into per-subject gate checks. A batch-level approval may start a batch only when policy says the exact membership and action are covered; it must not approve unrelated publish, rollback, domain, or cost actions.

## Emergency And Incident Flow

Emergency recovery uses `incident_recovery` or `rollback` scopes. It is time-limited, high-retention, and normally superadmin-approved. If an explicitly documented emergency policy allows action during audit degradation, the system must create a partial timeline blocker and later compensating audit/evidence records.

Emergency approval is not a general bypass and cannot be reused for ordinary replay, publish activation, domain mutation, or future actions.

## Client-Facing Versus Technical Approval

Client review is client-facing acceptance of preview/content within its scope. Launch signoff is business readiness. Content publish is content state mutation. Publish activation is technical active pointer switch. These are separate decisions.

Client review, content publish, and launch signoff do not authorize publish activation unless a separate `publish_activation` policy evaluation and decision says so.

## Domain/DNS Operator Flow

Operators may request domain action approval for DNS instruction generation/share or allowed Vercel attach/check. The review shows DDOM-1 limitations: GNR8 MVP does not perform live DNS, registrar, or Openprovider mutation.

Domain readiness and domain exceptions are shown as publish prerequisites or blockers. They are not publish approval.

## External Workflow References

External tickets, emails, spreadsheets, CRM records, screenshots, Slack messages, and similar refs may be captured as evidence. Accepting an external reference creates a GNR8-scoped decision that the reference may be used as evidence only. It does not become approval truth for execution.

## AI Advisory

AI may summarize evidence gaps or propose a plan in a future implementation. Human acceptance of an AI advisory plan creates advisory evidence only. AI cannot approve, execute, mutate, publish, rollback, close Ops Inbox items, create approval truth, or satisfy an action gate.

## Prohibited MVP Displays

The UI must not show or imply that:

- launch signoff equals publish activation,
- domain readiness equals publish approval,
- domain action approval equals DNS mutation approval,
- domain exception equals publish approval,
- client review equals technical publish approval,
- AI advisory acceptance equals execution approval,
- external workflow acceptance equals GNR8 approval,
- human approvals are replayable,
- rollback is ordinary replay,
- publish activation is deterministic replay.
