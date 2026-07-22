# GNR8 Audit And Approval Foundation Design

AAF-1 canonical architecture for GNR8 MVP audit and approval foundations.

This is documentation and architecture only. It does not implement runtime behavior, APIs, schemas, migrations, database code, workers, queues, policy engines, provider execution, DNS/domain mutation, publish/rollback behavior, billing behavior, AI execution, Workspace, Evolution, Generated Proposal Bundles, thumbnails, asset storage, or deployment changes.

## Purpose

The Audit and Approval foundation defines how GNR8 should later record human approvals, approval requests, evidence packages, privileged decisions, audited state transitions, retry/replay requests, publish and rollback decisions, domain/DNS decisions, cost exceptions, incident/recovery decisions, external workflow references, and future AI-assisted advisory decisions for the operator-assisted 200-site migration MVP.

The foundation gives future implementation a canonical vocabulary before Command Center actions, Ops Inbox actions, Bulk Migration Factory execution, Domain/DNS workflows, publish activation workflows, rollback workflows, retry/replay controls, cost exceptions, or AI-assisted actions are expanded.

## MVP Scope

AAF-1 covers:

- conceptual approval architecture;
- conceptual approval persistence model;
- canonical audit event taxonomy;
- evidence package contract;
- operator approval and audit workflows;
- source-of-truth, replay, scope, role, freshness, and external reference boundaries;
- implementation prerequisites and risks.

AAF-1 is scoped to the MVP: operator-assisted migration and operation of approximately 200 static or mostly static public websites.

## Non-Goals

AAF-1 does not:

- create approval tables, audit tables, event stores, migrations, route handlers, UI components, server actions, workers, queues, schedulers, or policy engines;
- change existing approval, publish, rollback, domain, billing, migration, Command Center, Ops Inbox, provider, asset, thumbnail, Workspace, Evolution, AI, or deployment behavior;
- claim full autonomous migration, autonomous AI execution, live DNS/registrar mutation, Openprovider live mutation, full Stripe billing, autonomous regeneration, or storage migration as MVP behavior;
- treat Command Center, Ops Inbox, previews, thumbnails, WU/VCU, Generated Proposal Bundles, Knowledge Workspace, Evolution, AI outputs, provider payloads, billing dashboards, or external workflow snapshots as source of truth.

## Relationship To MVP-1

MVP-1 defines GNR8 MVP as an operator-assisted migration factory and website operations backbone. AAF-1 preserves the MVP-1 source-of-truth boundary:

- production runtime truth is active pointer, site version, runtime artifact, and published override state;
- canonical operational truth lives in ownership/auth records, site records, migration jobs/batches/stages/events, runtime artifacts, active pointers, content slots/overrides/history, domain host bindings, approvals, audit, incident/recovery, and cost events once implemented;
- derived surfaces are not truth.

AAF-1 fills the MVP-1 blocker that approvals and audit must be designed before governed launch, publish, rollback, domain, retry/replay, and cost exception behavior is implemented.

## Relationship To BMF-1

BMF-1 defines batch intake, dry-run, lifecycle, failure recovery, and retry/replay semantics. AAF-1 preserves these rules:

- dry-run is evidence, not approval;
- batch start is approval-gated;
- retry and replay requests require explicit evidence and approval boundaries;
- replay applies only to eligible deterministic or variance-labeled stages;
- human approvals are not replayed;
- publish activation, rollback, external provider actions, DNS checks, cost exceptions, and AI/provider outputs are not deterministic batch replay.

## Relationship To CCO-1

CCO-1 defines Command Center as the primary operator workbench and Ops Inbox as a derived exception queue. AAF-1 preserves these rules:

- Command Center and Ops Inbox are not source of truth;
- no operator action may be enabled from a read model unless canonical state, role permission, approval requirement, audit requirement, evidence refs, and freshness policy are clear;
- Ops Inbox item completion requires a canonical state transition or audited decision;
- UI badges, work items, previews, and partial timelines must never substitute for approval or audit truth.

## Source-Of-Truth Boundaries

| Domain | Canonical truth | Non-authoritative evidence/projection |
| --- | --- | --- |
| Approval | Future append-only approval request/decision records and policy refs. | UI badge, preview state, dry-run result, Ops Inbox item, external ticket, email, AI output. |
| Audit | Future append-only audit events or federated append-only refs. | Mutable status fields, dashboards, toasts, logs without actor/scope/evidence/correlation. |
| Runtime production | Active pointer, site version, runtime artifact, published overrides. | Preview URL, thumbnail, Generated Proposal Bundle, Workspace/Evolution view. |
| Migration | Intake, classification, batch/job/stage records and events. | Command Center rollup, dry-run summary, operator notes without audit. |
| Domain/DNS | GNR8 domain binding state and snapshots; external provider remains authoritative externally. | DNS instruction display, stale Vercel check, external registrar page screenshot. |
| Cost | AI/runtime/migration cost events and threshold decisions; Stripe remains Stripe truth. | Billing dashboard projection, estimate, external invoice snapshot. |
| AI advisory | Immutable input/output bundle refs with human review decision. | Model recommendation, provider payload, generated plan, autonomous action proposal. |
| External workflow | GNR8 reference/snapshot acceptance record. | Ticket status, spreadsheet row, Slack message, CRM task as approval truth. |

Required assertions:

- Approval is a human decision record, not a UI badge, not a preview state, not a dry-run result, and not an Ops Inbox item.
- Audit is append-only evidence of action/decision context, not a mutable status field.
- Evidence packages must cite canonical source refs and freshness labels.
- Publish, rollback, domain actions, cost exceptions, unsupported exceptions, retry/replay, batch start, and launch signoff require approval boundaries.
- Human approvals are not replayed.
- Publish activation is not deterministic replay.
- Rollback is incident/recovery action, not deterministic replay.
- External workflow references can be cited as evidence but do not become GNR8 approval truth.
- AI/provider outputs can be advisory evidence only and cannot approve or mutate MVP state.

## Approval Foundation Principles

1. Approval is a scoped human decision. It names one actor, one role/scope, one subject, one action class, one evidence package, one policy, and one outcome.
2. No approval may enable an action outside its explicit scope.
3. Approvals are append-only decisions with revocation/supersession records, not mutable booleans.
4. Approval status must be derived from decision records, policy, expiration, evidence freshness, and supersession state.
5. A granted approval does not execute the action. It only satisfies one gate for a later action attempt.
6. Launch approval, publish activation approval, domain action approval, client review approval, content publish approval, rollback approval, cost exception approval, and AI advisory acceptance are separate.
7. Approval requests may be derived from blockers, but the request record and decision record are canonical only when persisted by the future approval service.

## Audit Foundation Principles

1. Audit is append-only evidence of action and decision context.
2. Audit must distinguish requested, attempted, succeeded, failed, cancelled, superseded, expired, and revoked outcomes.
3. Audit must distinguish human action, system action, and external snapshot.
4. Audit events must cite source refs and evidence refs rather than embedding large payloads.
5. Audit events must not expose secrets, credentials, tokens, private client data beyond policy, or provider secrets.
6. Privileged actions must fail closed if the required audit write path is unavailable, unless emergency policy explicitly records a compensating event.
7. Audit event streams may be federated initially, but Command Center must label partial timelines.

## Evidence Package Principles

1. Evidence packages are immutable snapshots or append-only references.
2. Evidence packages cite canonical source refs, source watermarks, freshness labels, limitations, and audit timeline refs.
3. Evidence packages prove what was shown to the approver at decision time. They do not prove that source state remains valid forever.
4. If canonical source state changes, the evidence package must become stale or superseded; it must not silently remain valid.
5. External workflow references and AI/provider bundles may be cited as evidence, but neither becomes GNR8 truth or approval.

## Actor, Role, And Scope Model

| Actor type | Examples | Scope rule | Approval ability |
| --- | --- | --- | --- |
| `human_operator` | Migration operator, technical operator, content operator. | Agency/client/site/batch scoped by RBAC and assignment. | Only scopes allowed by role and policy. |
| `agency_admin` | Agency owner/admin. | Agency and client portfolio scope. | Launch, client coordination, cost exceptions within policy. |
| `superadmin` | Platform superadmin. | Cross-agency privileged scope. | Critical exceptions, emergency, cross-client, high-risk decisions. |
| `client_reviewer` | Named client/account reviewer. | Client/site and client-safe evidence scope. | Client review and launch signoff only when policy permits. |
| `system_actor` | Worker, scheduler, importer, readiness checker. | Service account with explicit action class. | Cannot grant approval; may request approval or emit audit. |
| `external_actor_ref` | Ticket assignee, registrar user, CRM owner. | External system scope only. | Cannot grant GNR8 approval without a GNR8 human decision record. |
| `ai_advisory_actor` | Model/provider output. | Evidence bundle scope only. | Cannot approve or mutate MVP state. |

## Action Classification Model

| Action class | Meaning | Approval default | Replay class |
| --- | --- | --- | --- |
| `read_projection` | Read derived status or timeline. | Usually not required. | Rebuildable projection. |
| `evidence_snapshot` | Create evidence package from refs. | Not required to create; required to decide. | New snapshot, not replay of decision. |
| `intake_mutation` | Change intake/planning state. | Required for waivers/exceptions. | Deterministic validation replay where inputs fixed. |
| `batch_execution` | Start/resume/cancel batch execution. | Required for start and high-risk resume. | Execution not blindly replayed. |
| `retry_replay_control` | Retry or replay job/stage. | Required. | Per BMF replay class. |
| `content_mutation` | Draft/published override changes. | Required before client-visible publish. | Content history rollback is recovery, not replay. |
| `domain_dns_side_effect` | Domain binding/check/instruction/provider step. | Required. | External checks may repeat; not deterministic replay. |
| `publish_activation` | Activate runtime pointer/version/content state. | Required separately. | Not deterministic replay. |
| `rollback_recovery` | Revert pointer/content or alternative recovery. | Required except emergency compensating path. | Incident/recovery action, not replay. |
| `cost_exception` | Continue or override threshold/anomaly. | Required. | Not replay. |
| `external_reference_acceptance` | Accept external ref as evidence. | Required if used to unblock a gate. | New acceptance record. |
| `ai_advisory_review` | Accept/reject AI plan as advisory. | Required to use plan as evidence. | New advisory bundle and human decision. |

## Approval Lifecycle Model

1. Request: a human or system creates an approval request for a specific scope, subject, policy, approver role, and evidence package.
2. Review: approver views the evidence package, source watermarks, limitations, freshness labels, blocked action, and prohibited action list.
3. Decision: approver grants, rejects, cancels, or records not-required-by-policy.
4. Validity: decision remains valid only inside its scope, subject, evidence freshness, policy version, actor role/scope, and expiration rule.
5. Consumption: later action attempts cite the approval ref; consumption does not mutate the approval into execution truth.
6. Revocation: an authorized human revokes a still-valid approval with reason and audit event.
7. Supersession: source changes, policy changes, new evidence, new request, or conflicting decision supersedes the old decision.
8. Expiration: time/window/resource freshness expiry changes status to expired.

## Audit Lifecycle Model

1. Intent/request event records the desired action or decision need.
2. Evidence event records immutable package creation or source refs used.
3. Authorization event records role/scope/policy check for privileged action attempts.
4. Approval event records human decision status.
5. Attempt event records that an action was started with approval/audit refs where applicable.
6. Outcome event records success, failure, cancellation, no-op, rollback, or compensation.
7. Supersession/expiration/revocation events record why prior decisions or evidence are no longer valid.
8. Timeline views reconstruct from append-only events and label missing source families.

## Decision Supersession Model

Supersession is required when any material source ref changes after approval:

- intake row, classification, dry-run, batch plan, job/stage output, failure record, retry/replay input refs;
- source capture, runtime artifact, site version, active pointer, content slot/override, preview/readiness, review;
- domain binding, DNS instruction/check, Vercel snapshot, publish readiness, rollback target, incident, cost event, external ref, AI/provider bundle;
- policy version, approver role, actor scope, launch window, or client requirement.

Supersession creates a new decision lineage. It does not edit the prior decision in place.

## Expiration And Staleness Model

| Object | Expiration/staleness basis |
| --- | --- |
| Approval request | Expires when evidence package expires, policy window ends, subject changes, or request is cancelled. |
| Approval decision | Expires by scope rule, launch window, source watermark drift, role/scope loss, or incident/cost policy. |
| Evidence package | Stale when cited canonical refs change, freshness window closes, source read fails, or source is marked partial. |
| External snapshot | Stale by external-source policy; never current truth unless re-captured and accepted. |
| AI advisory bundle | Stale when inputs, policy, cost estimate, site state, or provider context changes. |

## Retry And Replay Relationship

Retry and replay approvals authorize a future retry/replay attempt only for the named subject and stage/action. They do not approve downstream publish, rollback, domain mutation, cost exception, or launch signoff.

Replay may reset deterministic outputs from immutable input refs. Human approvals are not replayed. Publish activation is not deterministic replay. Rollback is not deterministic replay. External checks may be repeated as new checks, not replayed as proof of past truth.

## Incident And Recovery Relationship

Incident and recovery approvals govern exceptional decisions under known impact. They require incident refs, severity, current production state, target recovery state, expected impact, rollback/alternative plan, communication notes where applicable, and compensating audit if emergency action precedes normal approval.

Rollback is an incident/recovery action, not deterministic replay.

## External Workflow Relationship

External systems remain authoritative for their own records. GNR8 may store external workflow refs or snapshots as evidence. A GNR8 human must explicitly accept the reference as evidence before it can unblock a GNR8 gate. External approval language in a ticket, email, CRM, Slack, spreadsheet, or support tool does not become GNR8 approval truth.

## Cost Exception Relationship

Cost exceptions are privileged decisions to continue, pause, cancel, retry, replay, or launch despite cost estimate, threshold, anomaly, missing cost data, or budget concern. They rely on internal AI/runtime/migration cost events and estimates, not full Stripe/customer billing.

## Domain, Publish, And Rollback Relationship

Domain readiness, DNS action, publish activation, and rollback are separate approval domains:

- Domain readiness approval does not equal DNS mutation approval.
- DNS instruction acceptance does not equal external DNS completion.
- Launch approval does not equal publish activation approval.
- Client review approval does not equal technical publish approval.
- Publish readiness projection does not equal publish activation approval.
- Rollback approval is tied to incident/recovery evidence and does not authorize future publish.

MVP must not claim live registrar/DNS mutation or Openprovider live mutation as implemented behavior.

## Future AI Advisory Relationship

AI/provider outputs may be advisory evidence only. They cannot approve, revoke, supersede, mutate runtime state, mutate DNS/domain/provider state, publish, rollback, regenerate, bill, retry, replay, or close Ops Inbox items. Human acceptance of an AI advisory plan records that the plan may be considered evidence; it does not approve execution.

## Required Implementation Prerequisites

Before implementation of approval-gated actions, GNR8 must define and test:

1. canonical approval request/decision/evidence persistence;
2. append-only audit write path and privileged-action fail-closed policy;
3. role/scope/policy evaluation for each approval scope;
4. evidence package generation and staleness detection;
5. correlation/causation/idempotency conventions;
6. Command Center and Ops Inbox action gating from canonical sources;
7. partial/federated audit timeline labels;
8. emergency compensating audit procedure;
9. privacy/redaction policy for audit and evidence refs;
10. migration path from provider-specific approval artifacts without treating them as universal approval truth.

## Architecture Risks

- Existing Command Center bulk actions are too coarse for final approval/audit gating.
- Existing provider approval artifacts are useful evidence but not a universal GNR8 approval model.
- Existing migration job/batch events are narrower than the required audit taxonomy.
- Existing publish/rollback primitives can mutate runtime state but do not prove the future approval foundation.
- External DNS/provider checks are variable and can become stale quickly.
- Cost visibility is partial operating evidence and must not be confused with customer billing truth.
- If audit writes are optional for privileged actions, enterprise readiness collapses at the exact boundary where evidence matters most.

## Explicit Deferrals

- Approval persistence implementation.
- Audit event store implementation.
- Database migrations and schemas.
- Command Center/Ops Inbox action implementation.
- Bulk Migration Factory execution changes.
- Domain/DNS operating model implementation.
- Publish activation and rollback workflow implementation.
- Cost exception implementation.
- External workflow integrations beyond references.
- AI-assisted execution, autonomous regeneration, or autonomous migration.
- Asset storage migration, Vercel Blob, Supabase Storage changes, thumbnails, Workspace, Evolution, Generated Proposal Bundle runtime, and deployment configuration.
