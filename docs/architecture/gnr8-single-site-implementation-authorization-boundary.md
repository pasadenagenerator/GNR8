# GNR8 Single-Site Implementation Authorization Boundary

Phase: MVP-16
Scope: Documentation and architecture only

This document defines the implementation authorization boundary for single-site improvement execution after MVP-15 proposal planning. It does not implement SQL, TypeScript, routes, UI, workers, AI/provider calls, runtime mutation, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, commits, or pushes.

## Baseline Reviewed

MVP-15 created canonical proposal planning persistence and a server-only proposal planning service:

- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`

AAF baseline reviewed:

- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`

## Current MVP-15 Behavior

MVP-15 represents proposal approval as proposal planning truth:

- proposal plan statuses include `approved` and `approved_with_limitations`;
- proposal decision events include `approved` and `approved_with_limitations`;
- proposal approval refs may be stored in `approval_refs_json` and `gnr8_single_site_improvement_proposal_refs` rows with `proposal_approval_request`, `proposal_approval_decision`, or `proposal_evidence_package` roles.

MVP-15 represents implementation authorization only as a separate ref requirement:

- `gnr8_single_site_improvement_proposal_plans.implementation_authorization_refs_json` stores durable authorization ref metadata;
- `gnr8_single_site_improvement_proposal_plans.implementation_authorization_attached` stores a derived boolean flag;
- `gnr8_single_site_improvement_proposal_refs.ref_role` allows `implementation_authorization_request` and `implementation_authorization_decision`;
- `gnr8_single_site_improvement_proposal_events.event_action` allows `implementation_authorization_attached`;
- proposal recommendations have an `implementation_authorization_status` column with MVP-15 vocabulary `not_requested`, `requested`, `authorized`, `authorized_with_limitations`, `rejected`, `expired`, and `superseded`.

The service method `attachImplementationAuthorizationRef`:

- requires the plan status to be `approved` or `approved_with_limitations`;
- inserts an implementation authorization ref row;
- sets `implementation_authorization_attached` to true;
- updates `implementation_authorization_refs_json` with the latest ref id and source record id;
- emits an `implementation_authorization_attached` event.

The transition service currently blocks `improvement_implementation_started` unless:

- the latest proposal plan exists;
- the latest proposal plan status is `approved` or `approved_with_limitations`;
- `implementation_authorization_attached` is true.

The read model derives:

- `implementationAuthorizationRefs` from `implementation_authorization_refs_json`;
- `implementationAuthorizationReady` from `implementation_authorization_attached` plus approved proposal status;
- next action `request_implementation_authorization` or `request_implementation_authorization_with_limitations` when proposal approval exists but authorization is not attached;
- next action `implement_improvements` when proposal approval exists and authorization is attached.

## Missing Today

MVP-15 does not validate the implementation authorization ref against AAF.

The current ref attachment does not prove:

- the referenced AAF approval decision exists;
- the referenced approval request exists;
- the approval scope is implementation authorization;
- the subject matches the tenant, client, site, migration, proposal plan, clone review, clone site version, runtime artifact, and source evidence review;
- the approver role satisfies policy;
- separation of duty was enforced;
- the evidence package exists;
- the evidence package is fresh;
- limitations are carried from clone review and proposal approval into the implementation scope;
- the approval has not expired, been revoked, or been superseded;
- the source watermark still matches the approved proposal and implementation target;
- required audit events exist.

Therefore the current ref can be stale, forged, semantically wrong, scoped to the wrong action, scoped to the wrong subject, or based on stale evidence. It is a durable reference and readiness input, not authorization truth.

## Source-Of-Truth Options

### Option A: Proposal Service Owns Authorization Truth

This option would make the proposal planning service decide whether implementation is authorized.

Rejected. The proposal service owns proposal planning state and durable refs, but it does not own approval policy, approver role rules, evidence freshness, revocation, supersession, or audit truth. Making it authorization truth would duplicate AAF and create a second approval system.

### Option B: AAF Owns Authorization Truth

This option would make AAF the canonical decision, policy, evidence, audit, freshness, revocation, and supersession source.

Accepted as the truth layer. AAF is already the platform approval/audit/evidence foundation. Implementation authorization is an approval-gated action boundary and belongs in AAF.

### Option C: Hybrid

This option makes AAF the approval truth while single-site proposal planning stores refs and derived readiness.

Selected. This is the recommended architecture.

AAF owns:

- approval request truth;
- approval decision truth;
- approval scope and policy;
- approver role and separation-of-duty validation;
- evidence package identity and freshness;
- audit event refs;
- revocation, expiration, and supersession;
- gate evaluation results.

The single-site proposal planning service owns:

- proposal planning records;
- proposal approval status as proposal planning truth;
- durable refs to AAF implementation authorization request/decision/evidence records;
- derived implementation readiness flags for read models and transitions;
- limitation carry-forward metadata.

Future implementation execution owns:

- implementation attempt identity;
- mutation idempotency;
- improved runtime/content/version output refs;
- execution lineage after AAF gate validation succeeds.

It must not own approval truth.

### Option D: Runtime Or Executor Owns Authorization Truth

Rejected. Runtime and implementation execution services can enforce gates before mutation, but they must not invent approval decisions. They should validate AAF before creating or mutating runtime artifacts.

## Final Decision

AAF owns implementation authorization decision truth.

Single-site proposal planning stores implementation authorization refs and derived readiness only.

Single-site read models and transition services may derive "implementation may start" only from:

- an approved or approved-with-limitations proposal plan; and
- a valid AAF implementation authorization decision for the exact scope, subject, evidence package, actor policy, freshness, and action attempt.

Future implementation execution must validate AAF immediately before any mutation. AI/provider output, generated proposal bundles, operator notes, Command Center, and Ops Inbox can be evidence or projection only. None of them can authorize implementation.

## Boundary Rules

- Proposal approval is not implementation authorization.
- Implementation authorization is not content approval.
- Implementation authorization is not client approval.
- Implementation authorization is not launch signoff.
- Implementation authorization is not publish activation approval.
- Content approval is not launch approval.
- Launch signoff is not publish activation approval.
- Publish activation approval authorizes only one publish activation attempt.
- AI/provider output may be advisory evidence only.
- Operator notes may be evidence only.
- Command Center and Ops Inbox may show derived readiness only.
- Direct mutation routes must fail closed if implementation authorization is missing, stale, invalid, revoked, expired, superseded, or scoped to the wrong subject/action.

## Readiness Definition

Implementation readiness is derived, never authored directly.

`implementation_ready = approved_proposal_plan && valid_aaf_implementation_authorization`

Where `valid_aaf_implementation_authorization` requires:

- AAF decision status `granted` or policy-defined equivalent;
- exact approval scope match;
- exact subject match;
- required evidence package match;
- source watermarks still current;
- decision not expired, revoked, or superseded;
- approver actor and role still valid for policy;
- required audit events present;
- limitations carried forward.

The MVP-15 boolean `implementation_authorization_attached` is not enough for future execution. It can remain a storage optimization or read-model hint, but execution gates must revalidate AAF.

## Architecture Warnings

- A ref-only design allows forged refs if AAF is not validated.
- Proposal approval can be mistaken for permission to implement.
- Implementation authorization can be mistaken for content/client/launch/publish approval.
- AI output can be mistaken for authorization unless labeled advisory.
- Evidence can go stale between approval and execution.
- Limitations can be dropped when moving from proposal approval to implementation.
- Command Center or Ops Inbox can accidentally turn a readiness projection into truth.
- Legacy or direct mutation routes can bypass authorization if they do not validate AAF.
- A future executor can incorrectly treat `implementation_authorization_attached = true` as sufficient.

## Required Future Rule

No improvement implementation may begin from MVP-15 behavior alone.

The next implementation milestone may create AAF scope/contracts and validation plumbing, but it must not execute improvements, mutate runtime artifacts, edit content, activate publish, change DNS/domain readiness, or trigger AI/provider execution.
