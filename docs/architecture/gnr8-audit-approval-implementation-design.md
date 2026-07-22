# GNR8 Audit, Approval, and Evidence Implementation Design (AAF-2)

## Purpose

This document defines the implementation-ready architecture for the GNR8 MVP audit, approval, evidence, policy, and action-gate foundation. It translates AAF-1 and DDOM-1 into concrete storage, service, API, read-model, and gate responsibilities without implementing runtime behavior.

AAF-2 is documentation only. It does not create schemas, migrations, APIs, services, UI gates, workers, provider calls, DNS mutations, billing behavior, or AI execution behavior.

## Baseline Conclusions

The repository documentation establishes these preserved boundaries:

- MVP-1: GNR8 MVP is an operator-assisted migration and operations platform for static or mostly static public sites. Source-of-truth records live in persisted control-plane and runtime records, while dashboards and read models are derived.
- ADR-001: migration and runtime behavior must preserve deterministic pipeline boundaries. Replay may reuse immutable inputs but must create new execution records and new audit events.
- ADR-003: runtime artifacts and active pointers are runtime truth for serving. Generated proposals, previews, thumbnails, dashboards, and UI state are not publish truth.
- BMF-1: retry and replay are controlled operator actions. Human approvals are not replayed. Publish activation is not deterministic replay. Rollback is an incident/recovery action, not ordinary replay.
- CCO-1: Command Center and Ops Inbox are operator surfaces and derived read models. They must not become approval, audit, evidence, domain, billing, or publish truth.
- AAF-1: approvals are scoped human decisions; audit events are append-only; evidence packages are immutable snapshots or immutable ref sets; privileged actions fail closed when required approval, audit, evidence, or freshness is missing.
- DDOM-1: domain/DNS is operator-assisted coordination. GNR8 may generate DNS instructions and store domain/Vercel readiness snapshots, but MVP does not perform live registrar, DNS provider, or Openprovider mutation. Domain readiness is a publish prerequisite, not publish approval.

## MVP Scope

AAF-2 covers the MVP control-plane architecture for:

- scoped approval requests, decisions, supersession, revocation, expiration, and policy results,
- append-only audit event writes with correlation, causation, actor, subject, severity, replay class, privacy, and retention metadata,
- immutable evidence packages and evidence item references,
- policy evaluation before privileged actions,
- gate validation for batch, retry/replay, exception, content, client review, launch signoff, domain, publish, rollback, incident, cost, external workflow, and AI advisory acceptance scopes,
- derived Command Center and Ops Inbox integration,
- object-storage references for heavy evidence artifacts while storing immutable hashes and metadata in Supabase/Postgres control-plane tables.

## Non-Goals

AAF-2 does not implement or authorize:

- runtime schema migrations or table creation,
- API routes, services, queues, schedulers, leases, or workers,
- changes to TypeScript, JavaScript, SQL migrations, runtime services, billing, provider code, DNS/domain code, publish/rollback code, Command Center, Ops Inbox, AI code, or deployment configuration,
- live DNS, registrar, Vercel, Stripe, Supabase, AI provider, or Openprovider calls,
- treating UI state, provider approval artifacts, external tickets, screenshots, Slack messages, generated proposals, previews, or read models as approval truth,
- autonomous AI approval, mutation, publishing, rollback, Ops Inbox resolution, or execution.

## Current Implementation Evidence

| Repository area | Files inspected | Current capability | Gap against AAF-1 | Implementation implication |
|---|---|---|---|---|
| Auth/RBAC | `apps/platform/src/auth/rbac.ts`, `apps/platform/src/auth/require-actor-user-id.ts` | Coarse agency roles and permissions such as `run_migration`, `approve_migration`, `publish`, and `bulk_actions`. | RBAC is not scoped approval, policy evaluation, evidence validation, or audit truth. | AAF gates must use RBAC as one input, not as the decision record. |
| Audit/activity | `packages/core/src/modules/audit-log/*`, `apps/platform/supabase/migrations/20260407_site_actions_layer_v1.sql` | Activity listing and several event-like tables exist. Some records are mutable or read-only from app services. | No unified append-only audit envelope, no fail-closed writer, incomplete actor/subject/correlation/evidence/policy links. | Add canonical append-only audit tables and writer; existing logs become source refs or derived history only. |
| Migration jobs/batches | `apps/platform/gnr8/migration-factory/*`, `20260603120000_migration_job_store.sql`, `20260603130000_migration_batch_store.sql`, `20260603140000_migration_batch_events.sql` | Jobs, stages, batch memberships, batch events, replay requests, and activation history are persisted. | Job and batch state is mutable; activation history can be rewritten; events do not satisfy AAF envelope; batch start/resume/replay gates are absent. | AAF gates must wrap BMF actions before mutation and write independent audit events. |
| Publish activation | `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, `publish-activation-guard.ts`, `publish-safety-check.ts`, runtime publish route | Publish activation checks runtime safety and switches active pointer for approved versions. | Runtime approval state is not AAF scoped publish activation approval; no evidence package gate; audit is not AAF-complete. | Publish activation needs a dedicated `publish_activation` approval/evidence/policy gate. |
| Rollback | `apps/platform/gnr8/runtime/rollback-switch.ts`, runtime rollback route | Rollback switches active pointer to a selected version after coarse publish permission. | Rollback lacks incident/recovery approval, evidence package, and AAF audit gate. | Rollback must be treated as incident/recovery action with its own approval and audit path. |
| Content publish/rollback | Content publish and rollback API routes, runtime-store content functions | Draft content overrides can be published and rolled back under current scope/RBAC checks. | Client review, content publish, and rollback scopes are not separated by AAF policy. | Content actions need distinct approval scopes and cannot stand in for launch/publish activation. |
| Domain/DNS | domain route, domain verification worker, runtime domain readiness, DNS provider execution gate, domain binding migrations | GNR8 can attach/check Vercel domains, generate DNS instructions, mutate GNR8 domain binding state, and block live DNS provider execution in current phase. | Domain/Vercel actions are not AAF-gated; readiness snapshots are not immutable evidence; Openprovider read-only inventory is not mutation approval. | Domain instruction, Vercel attach/check, and domain exception paths need scoped gates while preserving no-live-DNS boundary. |
| Provider governance | provider operation approval, approval artifact, execution handoff repositories and migrations | Provider-specific approval artifacts and handoffs exist. | These are deterministic/provider artifacts, not unified human approval decisions; rows can be state-mutated. | Preserve as source refs/evidence inputs, not canonical AAF approval truth. |
| Cost/billing | cost model, billing modules, cost event migrations | Cost estimates and usage/cost event tables exist. | No cost exception approval or auditable policy decision path. | Cost exception becomes AAF scope linked to usage/cost source refs. |
| Command Center/Ops | command-center services/components, bulk actions | Command Center derives portfolio state and triggers import/approve/publish routes, including retries for failed bulk items. | Derived UI can initiate risky actions with coarse checks and without final AAF gates. | Read models display gate state only; action routes must enforce AAF independently. |
| AI advisory/execution | AI autonomous execution route and policy modules | AI policy can produce advisory/execution decisions and an `apply` flag exists in route surface. | AAF-1 prohibits AI from approval truth or autonomous MVP execution authority. | AI outputs may be advisory evidence only; acceptance is human and non-executing. |

## State Classification

Current implemented behavior:

- RBAC, agency scope checks, migration batch/job stores, runtime publish activation, runtime rollback, content publish/rollback, domain binding/Vercel check flows, provider approval artifacts, cost events, and Command Center bulk actions exist in the repository.
- These implemented surfaces are not canonical AAF approval, audit, evidence, or policy gates unless specifically integrated later.

Current partial or scaffolded behavior:

- Event-like tables, provider approval artifacts, provider handoff records, publish events, migration events, domain readiness snapshots, and cost event rows provide useful source refs.
- They do not satisfy AAF-1 by themselves because they lack complete scoped human decision records, immutable evidence packages, append-only audit envelopes, fail-closed gate validation, and unified policy evaluation.

AAF-2 implementation design decisions:

- Create new canonical Supabase/Postgres AAF control-plane records and link them to existing source records.
- Keep Command Center and Ops Inbox derived.
- Require fail-closed validation for privileged actions.
- Store heavy evidence in object storage only through immutable refs, hashes, and metadata persisted in the control plane.

Future or post-MVP ideas:

- AI advisory may summarize evidence gaps or propose plans.
- External workflow integrations may improve evidence capture.
- More provider automation may be considered after explicit post-MVP approval and audit boundaries.

Prohibited MVP behavior:

- No live DNS, registrar, or Openprovider mutation.
- No autonomous AI approval, execution, mutation, publish, rollback, or Ops Inbox closure.
- No use of external references, UI state, provider artifacts, generated proposals, previews, billing dashboards, or read models as approval truth.
- No replay of human approvals, publish activation, rollback, external acceptance, or AI advisory acceptance.

## Target Implementation Architecture

AAF-2 chooses a hybrid implementation:

- create new canonical Supabase/Postgres control-plane tables for approvals, audit events, evidence packages, policy evaluations, and gate attempts,
- link these records to existing migration, runtime, domain, cost, provider, content, and external-reference records by immutable subject refs,
- keep existing domain/runtime/migration tables as domain source records, not approval/audit/evidence truth,
- store heavy evidence artifacts in object storage only when needed, with immutable object refs, content hashes, size, media type, redaction label, and storage metadata persisted in Postgres.

The core implementation modules should be:

- `approval-request-service`: creates scoped requests and subject refs.
- `approval-decision-service`: records granted/rejected/revoked/expired/superseded/cancelled/not-required decisions.
- `audit-writer`: writes append-only audit envelopes and fails closed for privileged actions when unavailable.
- `evidence-package-builder`: creates immutable evidence packages from source refs and stored artifacts.
- `approval-policy-evaluator`: records auditable policy results.
- `action-gate-validator`: runs the gate sequence before privileged mutation.
- `read-model-projector`: derives Command Center and Ops Inbox state from canonical records and source subject state.

## Source-Of-Truth Model

Canonical AAF control-plane truth must live in Supabase/Postgres-backed records. Heavy artifacts may live in object storage, but the control plane must store immutable refs, hashes, metadata, source watermarks, privacy labels, and retention labels.

Existing runtime, migration, domain, billing, provider, and content records remain their own domain source records. AAF records reference them by typed subject refs. Command Center, Ops Inbox, dashboards, external tools, generated proposals, previews, and AI outputs are derived or evidentiary only.

## Approval Truth Model

Approval truth is a scoped decision over a specific subject, scope, policy version, evidence package, actor, role, timestamp, expiration, freshness state, and audit event. No approval may satisfy an action outside its explicit scope.

Approval records must be append-only at the decision layer. Revocation, supersession, expiration, and cancellation create new records or links. They must not overwrite historical granted/rejected decisions.

## Audit Truth Model

Audit events are append-only. Corrections are compensating events. Historical audit event payloads must not be edited to reinterpret an action after the fact.

Privileged action paths must write a pre-action audit event before executing and an outcome event after execution. If the pre-action audit write is unavailable, the action must fail closed except for an explicitly documented emergency policy path, which still must create an audit-failure record and a later compensating event.

## Evidence Package Truth Model

Evidence packages are immutable snapshots or immutable append-only ref sets. They must never silently mutate under an existing approval. Any evidence change creates a new package version or a supersession link.

Evidence packages prove only the source state captured at their recorded source watermarks and freshness window. They do not prove future readiness, approval, publish authorization, DNS truth, billing authorization, or AI execution authority.

## Policy Evaluation Model

Every privileged action gate records an `approval_policy_evaluations` entry with one result:

- `approval_required`
- `approval_not_required_by_policy`
- `approval_blocked`
- `approval_stale`
- `approval_superseded`
- `emergency_exception_required`
- `emergency_exception_granted`
- `policy_error`

Policy results are auditable and linked to the subject, intended action, approval scope, policy version, evidence package, requester actor, and correlation id. `not_required_by_policy` is a decision record, not absence of a decision.

## Action Gate Model

Privileged actions must use this validation sequence:

1. Load canonical subject state from the relevant domain source records.
2. Evaluate approval policy and persist the policy evaluation.
3. Verify the required evidence package type and subject refs.
4. Verify freshness, staleness, expiration, supersession, and revocation state.
5. Verify a granted approval decision or `not_required_by_policy` decision for the exact scope.
6. Verify actor role, tenant/client/site/batch/job scope, and separation-of-duty constraints.
7. Write a pre-action audit event.
8. Execute the action only if allowed.
9. Write an outcome audit event or compensating failure event.
10. Update derived read models asynchronously or compute them on read.

## Role/Scope Model

AAF roles should map current RBAC roles into gate-specific requester and approver capabilities. MVP roles should include:

- `operator`: can request ordinary operational approvals and execute approved actions.
- `agency_admin`: can request and approve within agency/client scope unless separation of duty blocks self-approval.
- `superadmin`: can approve high-risk, cross-tenant, incident, domain, publish, rollback, and cost exception scopes.
- `client_reviewer`: can approve client review only, never technical publish activation.
- `system`: can record policy and audit outcomes but cannot approve.
- `ai_advisory`: can provide advisory refs only and cannot request, approve, execute, or resolve gates.

Tenant, agency, client, site, batch, job, version, domain, and cost-center scopes must be explicit on subject refs and decisions.

## Freshness/Staleness Model

Freshness belongs to evidence and policy, not to UI badges. Each evidence package must record source watermarks, captured timestamps, expiration timestamp, freshness label, and stale reason. Policy evaluation must compare those fields with current canonical subject state.

Staleness triggers include subject mutation, new preview/runtime version, new domain/Vercel verification snapshot, changed DNS instruction set, updated cost estimate, new batch failure, new rollback target, superseded external reference, or policy version change.

## Fail-Closed Model

Privileged actions fail closed when:

- audit writer is unavailable for the pre-action event,
- required policy evaluation cannot be persisted,
- approval is missing, expired, revoked, stale, superseded, out of scope, or role-invalid,
- evidence package is missing, stale, mutable, invalid, redaction-blocked, or subject-mismatched,
- subject state changed after approval/evidence capture,
- Command Center or Ops Inbox state is the only available proof,
- external workflow reference or AI output is offered as approval truth.

Emergency policy can allow an incident recovery path only when explicitly scoped, superadmin-approved where required, and followed by compensating audit/evidence records.

## Idempotency/Correlation Model

All write paths must accept or derive:

- `correlation_id` for the operator workflow or batch/job/action attempt,
- `causation_id` for the prior event or request that caused the write,
- `idempotency_key` for safe retry of request creation, policy evaluation, evidence creation, and audit event creation,
- `request_id` for API calls,
- source ids for subject, evidence, policy, approval, and audit links.

Idempotency may deduplicate creation of the same request/evaluation/event, but it must not replay human decisions or privileged mutations.

## Read Model Relationship

Read models consume canonical AAF records plus source subject records. They may cache derived gate state, blocked reasons, freshness labels, and timeline summaries. They must never be the system of record for approval, audit, evidence, domain readiness, publish authorization, rollback authorization, cost exception authorization, external workflow acceptance, or AI advisory acceptance.

## Command Center Relationship

Command Center displays portfolio gate state and may initiate approval requests or approved actions. It must call action routes that independently run AAF gates. Command Center bulk actions must not bypass per-subject approval scope, evidence freshness, policy evaluation, or audit writes.

## Ops Inbox Relationship

Ops Inbox items are derived from canonical blockers, policy evaluations, stale evidence, requested approvals, failed audit writes, incident recovery needs, and external evidence acceptance requests. Items resolve only when canonical state changes or an audited decision is recorded.

## Bulk Migration Factory Relationship

BMF remains the source for batch/job/stage execution state. AAF adds gates for batch start, batch resume, dry-run waiver, retry request, replay request, unsupported site exception, degraded capture exception, route coverage exception, and form/widget/booking exception.

Retry and replay create new audit events. Deterministic replay may reuse immutable input refs but must not reuse human approval decisions as replayed outputs.

## Domain/DNS Relationship

DDOM-1 is preserved. AAF gates cover domain instruction generation/share, Vercel domain attach/check, domain exception, and domain action approval. A domain action approval does not authorize live DNS mutation, registrar mutation, Openprovider mutation, or publish activation. Domain readiness evidence is a prerequisite input to publish readiness, not approval truth.

## Publish Activation Relationship

Publish activation is a privileged action with its own `publish_activation` scope, evidence package, policy evaluation, audit events, and final gate. Launch signoff, client review, content publish, site version approved state, domain readiness, and migration approval do not equal publish activation approval.

## Rollback Relationship

Rollback is an incident/recovery action. It is not ordinary replay and not deterministic publish replay. Rollback requires rollback evidence, subject state, target artifact refs, policy evaluation, approval or emergency exception, pre-action audit, outcome audit, and Ops Inbox/Command Center updates derived from canonical state.

## Retry/Replay Relationship

Retry is a manual operational action against a failed or blocked attempt. Replay is deterministic recomputation from immutable inputs when eligible. Both may require scoped approvals. Neither may replay human approvals, approval decisions, publish activation, rollback, external acceptance, or AI advisory acceptance.

## Cost Exception Relationship

Cost exception approval is scoped to a cost subject such as batch, site, provider operation, usage event, or cost center. Cost estimates and usage events are source refs. Stripe/customer billing dashboards are not approval truth and AAF-2 does not implement Stripe behavior.

## External Workflow Reference Relationship

External tickets, emails, spreadsheets, CRM records, screenshots, Slack messages, and similar references may be linked as evidence. They do not become GNR8 approval truth. Accepting an external reference requires its own approval scope, evidence package, policy evaluation, audit event, and freshness/retention labels.

## AI Advisory Future Relationship

AI may later summarize evidence gaps or propose advisory plans. AI cannot approve, execute, mutate, publish, rollback, close Ops Inbox items, create approval truth, or satisfy gates. `ai_advisory_plan_acceptance` is a human decision accepting an advisory plan as evidence only.

## Privacy/Redaction Model

AAF records must carry privacy and redaction labels such as `public_operational`, `internal_operational`, `client_confidential`, `credential_sensitive`, `billing_sensitive`, `provider_sensitive`, and `legal_sensitive`. Heavy evidence items must store redaction state and hashes for both original and redacted forms when applicable.

Approval and audit payloads should store minimal necessary data, with object-storage refs for large or sensitive artifacts. Read models must respect privacy labels and should not duplicate sensitive payloads.

## Retention Model

Retention classes should include:

- `short_operational`: transient diagnostics and non-privileged traces.
- `mvp_operational`: ordinary approval/evidence/audit records needed for MVP operations.
- `compliance_long`: publish, rollback, domain, cost exception, incident, and admin exception evidence/audit.
- `legal_hold`: records explicitly retained by superadmin/legal policy.

Retention policy must not mutate historical audit meaning. Expiration removes or tombstones according to policy while preserving required compliance refs.

## Implementation Sequencing

1. Implement schema/migrations for approval, audit, evidence, policy, subject refs, and gate-attempt core.
2. Implement core service modules with typed contracts and no privileged integration.
3. Implement policy evaluator and persist policy evaluations.
4. Implement audit writer with fail-closed behavior and compensating event support.
5. Implement evidence package builder with immutable refs and freshness checks.
6. Implement approval request and decision APIs.
7. Implement gate validation helper with subject loading adapters.
8. Add tests for scoped approvals, audit immutability, evidence immutability, policy outcomes, and fail-closed behavior.
9. Integrate one low-risk action first, preferably a non-publish exception request or dry-run waiver.
10. Integrate BMF retry/replay/batch gates.
11. Integrate Domain/DNS gates while preserving no-live-DNS boundary.
12. Integrate Publish/Rollback gates.
13. Integrate Command Center and Ops Inbox read model projection.

Do not integrate all gates at once; that would create excessive blast radius.

## Migration Risk

The main migration risk is confusing existing event-like, provider-approval-like, runtime-state, or Command Center records with canonical AAF truth. Existing tables should be linked, backfilled, or referenced conservatively. Backfill records must be labeled as historical/imported and must not imply approvals that were not captured under AAF policy.

Heavy evidence payloads should not be stored directly in Postgres. Store hashes, metadata, and immutable object refs in the control plane to avoid Supabase egress and storage cost surprises.

## Architecture Warnings

- Existing publish and rollback routes can mutate active runtime state before unified AAF gates exist.
- Existing domain routes and domain verification jobs mutate GNR8/Vercel/domain binding state before AAF domain gates exist, though they do not prove live DNS authority.
- Existing Command Center bulk actions call import/approve/publish routes directly and can retry failed items without fine-grained approval scopes.
- Existing provider approval and handoff artifacts overlap semantically but do not satisfy AAF scoped human approvals.
- Existing audit/event structures do not prove append-only AAF semantics across all privileged actions.
- Existing migration replay/reset behavior can reset stage/downstream state and must not be confused with approval replay.
- Existing content publish/rollback routes mutate content state under current RBAC without AAF scope separation.
- External workflow references can become false truth if accepted without GNR8 policy/evidence/audit.
- Evidence packages can silently mutate if implemented as live queries instead of immutable snapshots/refs.
- Heavy evidence payloads in Postgres could create storage, egress, privacy, and retention risk.
- AI advisory/execution surfaces must remain advisory-only for MVP and cannot create approval truth.
