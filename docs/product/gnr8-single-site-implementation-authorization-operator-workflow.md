# GNR8 Single-Site Implementation Authorization Operator Workflow

Phase: MVP-16
Scope: Product workflow design only

This document describes the operator workflow for requesting and deciding single-site implementation authorization after proposal approval. It does not implement UI, API routes, server actions, Command Center actions, Ops Inbox actions, approvals, AAF scopes, SQL, TypeScript, AI calls, runtime mutation, billing, domain/DNS, publish, rollback, or improvement execution.

## Workflow Boundary

Implementation authorization is a human and policy approval boundary before future improvement execution.

It is not:

- proposal approval;
- content approval;
- client approval;
- launch signoff;
- publish activation approval;
- billing/subscription/hosting activation approval;
- domain/DNS approval;
- AI/provider approval.

## Preconditions

The operator may prepare an implementation authorization request only when:

- the single-site migration exists and is non-terminal;
- the latest clone review is accepted or accepted with limitations;
- clone site version and runtime artifact refs exist;
- source evidence review exists and is accepted or accepted with limitations;
- a proposal plan exists;
- the proposal plan is `approved` or `approved_with_limitations`;
- proposal approval refs and limitations are visible;
- selected recommendation ids and target scope are known.

If the proposal is not approved, the operator must return to proposal planning or proposal review.

## Operator Steps

1. Review the approved proposal.

   The operator opens the latest approved proposal plan and verifies status, plan version, selected recommendations, findings, limitations, exclusions, risk, impact, effort, confidence, proposal approval refs, and audit refs.

2. Verify upstream evidence.

   The operator verifies clone review acceptance, clone limitations, clone site version ref, runtime artifact ref, source evidence review acceptance, source evidence limitations, source capture refs, and any source evidence watermarks.

3. Prepare implementation scope.

   The operator selects recommendation ids for the next implementation attempt and records target scope, non-goals, expected output shape, implementation approach, implementation notes, risk and rollback considerations, and limitations that must carry forward.

4. Attach evidence package inputs.

   The operator assembles refs for the proposal plan snapshot, approved proposal decision, clone review acceptance, source evidence review acceptance, selected recommendations, source refs, operator notes, limitations, and any advisory AI/provider or generated proposal bundle refs.

5. Request implementation authorization.

   The operator requests AAF approval under scope `single_site_improvement_implementation_authorization`. The request must identify tenant, client, site, migration, proposal plan, proposal approval, clone review, clone version, runtime artifact, source evidence review, selected recommendations, implementation target or attempt descriptor, requester actor, policy version, evidence package, and correlation id.

6. Reviewer decides.

   The authorization reviewer may grant, grant with limitations, reject, or require changes. The reviewer must decide only the implementation authorization scope. They must not approve content, client acceptance, launch, publish activation, billing, hosting, domain/DNS, rollback, or AI execution through this decision.

7. If rejected, revise.

   The operator revises the proposal plan, selected recommendation set, implementation scope, or evidence package. A rejected implementation authorization must not be treated as proposal rejection unless a separate proposal decision is made.

8. If granted, preserve refs.

   The operator records AAF request, decision, evidence, policy evaluation, and audit refs back onto the proposal planning record. The single-site read model may show implementation readiness only after AAF validation succeeds.

9. Start implementation later.

   A future implementation executor may begin only after it validates AAF at execution time. Starting implementation is not part of MVP-16.

10. Carry limitations forward.

   Limitations from clone review, source evidence review, proposal approval, and implementation authorization must remain visible in implementation execution and downstream review.

## Reviewer Decision Guide

Grant when:

- the proposal is approved;
- implementation scope matches approved recommendations;
- source, clone, proposal, and target refs are fresh;
- evidence package is complete;
- limitations are explicit;
- approver role and separation-of-duty policy pass;
- no prohibited downstream approval is being implied.

Grant with limitations when:

- implementation may proceed only with constrained target scope;
- one or more recommendation exclusions must remain;
- source or clone limitations are accepted but unresolved;
- the reviewer needs additional downstream review before content or launch.

Reject when:

- proposal approval is missing or stale;
- selected recommendations do not match the approved proposal;
- source evidence is stale or incomplete;
- clone review is stale or not accepted;
- implementation scope is too broad;
- risk/impact/effort classification is missing or wrong;
- evidence package is incomplete;
- actor/role/policy requirements fail;
- the request attempts to combine implementation with content, launch, publish, billing, hosting, domain/DNS, rollback, or AI execution approval.

## Statuses Operators See

| Status | Operator meaning | Next action |
| --- | --- | --- |
| `not_required_yet` | Proposal is not approved. | Finish proposal planning/review. |
| `required` | Proposal is approved and implementation authorization must be requested. | Prepare evidence and request authorization. |
| `requested` | Request is awaiting decision. | Wait for reviewer or respond to requested changes. |
| `granted` | AAF grant is valid. | Future implementation may start after execution-time validation. |
| `granted_with_limitations` | AAF grant is valid with limitations. | Future implementation may start with limitations carried forward. |
| `rejected` | Reviewer denied implementation authorization. | Revise proposal or implementation scope. |
| `revoked` | Prior grant was withdrawn. | Stop and request fresh authorization if still needed. |
| `expired` | Prior request or grant is too old. | Refresh evidence and request again. |
| `superseded` | Source, proposal, target, evidence, or policy changed. | Rebuild evidence and request again. |
| `invalid` | Ref cannot satisfy AAF policy. | Correct refs or restart request. |
| `stale` | Ref exists but watermarks/freshness do not match. | Refresh evidence and request again. |

## Evidence Labels

AI/provider outputs, generated proposal bundles, external workflow refs, and operator notes must be labeled as evidence or advisory evidence. They are never authorization truth.

Command Center and Ops Inbox may show this workflow, but they are not approval truth. Their status is a projection of proposal planning plus AAF.

## Completion Criteria

The workflow is complete only when:

- AAF has an effective grant or grant with limitations for `single_site_improvement_implementation_authorization`;
- the grant matches the exact subject and evidence package;
- the proposal planning service stores durable AAF refs;
- derived readiness is true only after AAF validation;
- limitations are carried forward.

Even then, implementation execution is deferred to a later milestone and must revalidate AAF immediately before mutation.
