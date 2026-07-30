# GNR8 Single-Site Improvement Proposal Transition Contract

Date: 2026-07-30
Phase: MVP-14 transition design
Scope: State transitions from clone review into proposal planning and future implementation

This document is documentation and architecture only. It does not implement transitions, services, SQL, routes, UI, AI generation, improvement generation, content editing, runtime artifacts, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Purpose

MVP-13 established canonical clone review and fidelity acceptance. This contract defines how the single-site state machine should move into improvement proposal planning without confusing clone acceptance, proposal approval, implementation authorization, content approval, launch approval, or publish approval.

## Current Post-MVP-13 Boundary

The current implemented handoff is:

- clone review `accepted` sets `proposal_planning_allowed`;
- clone review `accepted_with_limitations` sets `proposal_planning_allowed` with limitations preserved;
- clone review `retry_required`, `rejected`, or `superseded` blocks proposal planning;
- migration transition from `clone_review_required` to `improvement_proposal_started` requires latest clone review accepted or accepted-with-limitations plus required refs.

MVP-14 keeps that direction but defines the proposal-specific state and approval boundaries required before implementation begins.

## Clone Review To Proposal Planning

| Latest clone review state | Proposal planning transition | Required behavior |
| --- | --- | --- |
| `accepted` | Allow `clone_review_required -> improvement_proposal_started` | Carry clone review id, clone version/artifact refs, source evidence review id, fidelity summary, and proposal planning ref. |
| `accepted_with_limitations` | Allow `clone_review_required -> improvement_proposal_started` with warning | Carry every limitation into proposal plan header and recommendation context. Limitations must be visible in approval evidence. |
| `retry_required` | Block proposal planning | Next action is clone retry or revision. Do not create proposal planning records except optional blocked/readiness projection. |
| `rejected` | Block proposal planning | Resolve clone blockers before planning. Do not treat rejection as proposal rejection. |
| `superseded` | Block proposal planning unless latest replacement review is accepted | Read latest non-superseded clone review. Planning against a superseded clone review is prohibited. |
| missing clone review | Block proposal planning | Clone review is required. |
| migration terminal/failed/cancelled | Block proposal planning | No planning transitions after terminal migration state. |

## Proposal Planning State Contract

Future proposal-specific statuses:

- `not_started`
- `planning_required`
- `draft`
- `ready_for_review`
- `in_review`
- `changes_requested`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Mapping to coarse single-site migration states:

| Proposal plan status | Migration state | Meaning |
| --- | --- | --- |
| `not_started` | `clone_review_required` | Clone accepted readiness may exist, but no plan has started. |
| `planning_required` | `clone_review_required` or `improvement_proposal_started` | Planning is required and can begin when clone review allows. |
| `draft` | `improvement_proposal_started` | Operator is drafting findings/recommendations. |
| `ready_for_review` | `improvement_proposal_ready` | Proposal plan is complete enough for review request/evidence creation. |
| `in_review` | `improvement_proposal_ready` | Review is underway; no implementation authorization. |
| `changes_requested` | `improvement_proposal_started` | Plan must be revised before approval. |
| `approved` | `improvement_proposal_approved` | Proposal plan approved; implementation still not authorized unless separate implementation authorization exists. |
| `approved_with_limitations` | `improvement_proposal_approved` | Proposal plan approved with scoped limitations; implementation still separately authorized. |
| `rejected` | `improvement_proposal_rejected` | Plan rejected; implementation blocked. |
| `superseded` | Depends on replacement | Existing plan obsolete; latest active plan decides next state. |
| `cancelled` | `migration_cancelled` only if migration is cancelled; otherwise proposal cancelled and planning may restart | Cancellation must be scoped. |

## Required Future Transitions

| Transition | Required source truth | Prohibited shortcut |
| --- | --- | --- |
| `proposal planning started` | Accepted/latest clone review plus source evidence/clone refs | Do not infer from Command Center button click alone. |
| `proposal draft ready` | Proposal plan has required findings/recommendations/refs and no blocking missing evidence | Do not infer from generated prose or AI output. |
| `proposal review required` | Evidence package/request created or proposal marked ready for review | Do not treat review request as approval. |
| `proposal approved` | AAF proposal approval decision or explicit future proposal decision event tied to AAF | Do not treat clone acceptance, client comment, AI output, or preview as approval. |
| `proposal approved with limitations` | Approval decision plus limitation refs | Do not drop clone limitations or proposal exclusions. |
| `proposal rejected` | Rejection decision with reason | Do not cancel migration unless separately decided. |
| `implementation authorized` | Separate implementation authorization ref, unless a future policy intentionally combines the exact scope | Do not execute from proposal approval alone by default. |
| `improvement implementation started` | Implementation authorization, approved recommendation ids, target refs, audit refs | Do not call legacy transformation execution directly from proposal approval. |
| `improvement implementation completed` | Improved version/content/artifact refs and implementation lineage | Do not treat completion as content approval. |
| `improved version review required` | Improved preview/version exists and content/review evidence is needed | Do not treat preview readiness as launch or publish approval. |

## Approval Boundary Transitions

Proposal plan approval may transition the migration to `improvement_proposal_approved`, but it must not transition to:

- `improvement_implementation_started`
- `improvement_implementation_completed`
- `improved_preview_ready`
- `content_approved`
- `launch_approval_required`
- `publish_ready`
- `published`

Implementation authorization may allow transition to `improvement_implementation_started`, but it must not imply:

- generated output approval;
- content approval;
- client approval;
- launch approval;
- publish activation approval;
- billing/subscription approval;
- domain/DNS approval.

Content approval may allow downstream launch readiness, but it must not imply launch or publish activation approval.

Launch approval may allow downstream publish readiness assembly, but it must not switch active pointer.

Publish activation approval may approve one publish attempt only after all prerequisite refs are current.

## Required Refs For Starting Proposal Planning

Starting proposal planning should require:

- migration id;
- client id;
- site id when available;
- latest clone review id;
- clone review status of `accepted` or `accepted_with_limitations`;
- clone site version ref;
- runtime artifact clone ref;
- source evidence review id;
- source evidence package/source refs;
- actor, role, correlation id, idempotency key;
- limitations carried forward from source evidence and clone review.

## Required Refs For Proposal Ready

Marking a proposal ready for review should require:

- proposal plan id;
- accepted clone review ref;
- source evidence refs;
- at least one finding or explicit no-improvement rationale;
- recommendation records or explicit no-change recommendation;
- category/impact/risk/effort vocabulary for each recommendation;
- operator summary;
- limitations and deferrals;
- evidence package readiness or evidence refs prepared for AAF.

## Required Refs For Proposal Approval

Approving a proposal should require:

- proposal plan id and version;
- approved recommendation ids or approved no-change decision;
- AAF proposal approval request/decision refs or equivalent future canonical approval refs;
- proposal evidence package ref;
- actor/role/scope;
- policy version;
- expiration/freshness;
- audit refs;
- limitations/prohibited action list.

## Required Refs For Implementation Authorization

Implementation authorization should require:

- approved proposal plan id/version;
- exact recommendation ids;
- exact target scope;
- implementation approach classification;
- risk/effort/impact summary;
- AAF implementation authorization refs;
- audit refs;
- expiration/freshness;
- prohibited action list.

## Supersession Rules

Proposal planning is superseded when:

- latest clone review is superseded;
- clone version/artifact changes;
- source evidence review is superseded or materially changes;
- accepted limitations change;
- proposal plan receives changes requested after ready/review;
- generated/advisory refs used as evidence are replaced;
- policy version changes;
- approval evidence becomes stale;
- implementation authorization scope changes.

Supersession creates a new plan revision and invalidates stale approval/authorization refs through AAF policy. It must not edit prior decision rows to appear current.

## Derived Surface Rules

Command Center may show:

- proposal planning required;
- proposal draft status;
- proposal approval needed;
- implementation authorization missing;
- changes requested;
- limitations carried forward.

Ops Inbox may derive work items such as:

- `proposal_planning_required`;
- `proposal_review_required`;
- `proposal_changes_requested`;
- `proposal_approval_needed`;
- `implementation_authorization_needed`;
- `proposal_evidence_stale`.

Neither surface may approve, reject, authorize implementation, resolve canonical status, or close work independently.

## Acceptance Criteria For Future Implementation

The next implementation milestone may begin only if it:

- creates additive proposal planning persistence and service boundaries;
- consumes accepted/latest clone review truth;
- preserves accepted-with-limitations context;
- separates proposal approval from implementation authorization;
- stores AAF refs rather than duplicating approval truth;
- performs no AI calls, runtime mutation, content editing, billing, domain/DNS, publish, rollback, UI/API, Command Center, Ops Inbox, or client portal integration unless separately authorized.
