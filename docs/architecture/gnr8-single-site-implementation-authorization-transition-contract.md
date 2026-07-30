# GNR8 Single-Site Implementation Authorization Transition Contract

Phase: MVP-16
Scope: Documentation and architecture only

This document designs the transition behavior from proposal approval to future improvement implementation. It does not implement transitions, services, SQL, routes, UI, AI, runtime mutation, publish, rollback, billing, domain/DNS, Command Center, Ops Inbox, or client portal behavior.

## Transition Principle

Implementation authorization is a separate gate after proposal approval and before implementation execution.

The transition is:

`accepted clone review -> proposal planning -> proposal approval -> implementation authorization -> implementation execution -> content approval -> launch signoff -> publish activation approval`

No step collapses a later approval boundary.

## Canonical Sources

| Concern | Canonical source |
| --- | --- |
| Proposal plan status | Single-site proposal planning service and tables. |
| Proposal approval status | Proposal planning service plus AAF proposal approval refs when implemented. |
| Implementation authorization truth | AAF request, decision, evidence, policy, gate, and audit records. |
| Implementation readiness | Derived single-site state/read model. |
| Implementation execution | Future implementation executor after AAF gate validation. |
| Content approval | Separate future content/client review approval scope. |
| Launch signoff | Separate AAF launch scope. |
| Publish activation | Separate AAF publish activation scope. |

## State Mapping

| Proposal and authorization condition | Derived implementation authorization status | Transition effect |
| --- | --- | --- |
| No proposal plan | `not_required_yet` | Implementation blocked. |
| Proposal status `draft`, `planning_required`, `ready_for_review`, `in_review`, or `changes_requested` | `not_required_yet` | Implementation blocked. |
| Proposal status `rejected`, `superseded`, or `cancelled` | `invalid` | Implementation blocked. |
| Proposal status `approved` and no authorization request/decision ref | `required` | Implementation blocked; request implementation authorization. |
| Proposal status `approved_with_limitations` and no authorization request/decision ref | `required` | Implementation blocked; request implementation authorization with limitations carried forward. |
| AAF request exists and no effective decision exists | `requested` | Implementation blocked. |
| AAF rejected | `rejected` | Implementation blocked; revise proposal or implementation scope. |
| AAF revoked | `revoked` | Implementation blocked. |
| AAF expired | `expired` | Implementation blocked; request fresh authorization. |
| AAF superseded | `superseded` | Implementation blocked; request authorization against current source refs. |
| AAF wrong scope, subject, evidence, actor, role, or policy | `invalid` | Implementation blocked. |
| AAF stale by proposal, source evidence, clone review, runtime artifact, selected recommendations, target, or policy watermark | `stale` | Implementation blocked. |
| AAF granted and fully valid | `granted` | Implementation may start in a future implementation executor. |
| AAF granted with limitations and fully valid | `granted_with_limitations` | Implementation may start in a future implementation executor with limitations carried forward. |

## Required Transition Rules

- Proposal not approved blocks implementation authorization from being attached as effective readiness.
- Proposal approved makes implementation authorization required.
- Proposal approved with limitations makes implementation authorization required and carries limitations forward.
- Authorization missing blocks implementation.
- Authorization requested but undecided blocks implementation.
- Authorization rejected blocks implementation.
- Authorization stale, invalid, revoked, expired, or superseded blocks implementation.
- Authorization granted allows a future implementation attempt to start only after execution-time AAF validation.
- Authorization granted with limitations allows a future implementation attempt to start only with limitations carried forward.
- Implementation started does not imply content approval.
- Implementation completed does not imply content approval.
- Content approval does not imply client approval unless a future scope explicitly combines them.
- Content approval does not imply launch approval.
- Client approval does not imply technical publish approval.
- Launch approval does not imply publish activation approval.
- Publish activation approval applies only to one publish activation attempt.

## Execution-Time Gate

A future executor must validate AAF immediately before mutation.

The executor must provide:

- tenant id;
- client id;
- site id;
- migration id;
- proposal plan id and version;
- proposal plan semantic watermark;
- proposal approval decision ref;
- implementation authorization request and decision refs;
- evidence package ref;
- clone review ref and watermark;
- clone site version ref;
- runtime artifact ref and watermark;
- source evidence review ref and watermark;
- selected recommendation ids and watermarks;
- implementation target or attempt descriptor;
- actor id, actor role, and requested action;
- policy version;
- idempotency key;
- correlation id.

If AAF returns anything except an allowed gate for the exact scope, subject, evidence, policy, and action attempt, implementation must fail closed.

## Limitation Carry-Forward

Limitations must be preserved across:

- accepted-with-limitations clone review;
- source evidence review acceptance with limitations;
- proposal plan limitations;
- proposal approval limitations;
- implementation authorization limitations;
- implementation execution notes;
- content review and launch readiness evidence.

Limitations cannot be silently dropped by marking a proposal approved, attaching an authorization ref, starting implementation, completing implementation, or moving to content review.

## Supersession Triggers

Implementation authorization must become stale or superseded when any of these change:

- proposal plan version;
- proposal plan semantic watermark;
- proposal approval decision;
- selected recommendation set;
- selected recommendation target refs;
- clone review status or watermark;
- clone site version ref;
- runtime artifact ref or hash;
- source evidence review status or watermark;
- implementation scope summary;
- implementation target or attempt descriptor;
- AAF policy version or scope definition;
- approver role/policy eligibility;
- evidence package content, freshness, or source watermark;
- risk/impact/effort classification for included recommendations.

## Command Center And Ops Inbox Contract

Command Center and Ops Inbox may show:

- implementation authorization required;
- implementation authorization requested;
- implementation authorization granted;
- implementation authorization granted with limitations;
- implementation authorization rejected;
- stale/invalid/revoked/expired/superseded blockers;
- derived next actions.

They must not:

- create canonical authorization truth;
- override AAF decision status;
- convert readiness into approval;
- start implementation from proposal approval alone;
- close work items without AAF-backed state changes.

## Direct Mutation Route Contract

Any route, service, worker, server action, provider adapter, content override path, runtime artifact builder, or AI execution path that can mutate implementation outputs must validate AAF first in a future implementation milestone.

Until that validation exists, improvement implementation must remain blocked.

## Next Implementation Milestone Contract

The next milestone should be MVP-17: AAF scope/contracts for implementation authorization.

It should:

- add the AAF scope and evidence package vocabulary;
- define policy/evidence contract tests;
- define gate validation inputs and fail-closed behavior;
- optionally add read-only validators around existing refs;
- avoid improvement execution.

It should not:

- execute improvements;
- mutate runtime artifacts;
- edit content;
- publish;
- change billing/subscription/hosting activation;
- mutate domain/DNS;
- add UI/API/Command Center/Ops Inbox execution actions.
