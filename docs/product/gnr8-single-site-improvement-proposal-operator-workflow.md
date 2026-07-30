# GNR8 Single-Site Improvement Proposal Operator Workflow

Date: 2026-07-30
Phase: MVP-14 operator workflow
Scope: Manual single-site improvement proposal planning after clone acceptance

This document is product workflow only. It does not implement UI, API routes, services, SQL, AI generation, improvement generation, content editing, runtime artifact generation, billing, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Purpose

This workflow describes how an operator should plan improvement recommendations for one migrated site after the clone has been accepted or accepted with limitations.

The operator is planning a proposal, not implementing improvements. Proposal approval does not publish, mutate runtime, approve billing, approve DNS, approve launch, approve content, or authorize implementation unless a later narrowly scoped policy explicitly combines proposal approval and implementation authorization.

## Entry Conditions

The operator may start proposal planning only when:

- the migration exists in the single-site spine;
- source evidence review is accepted or accepted with limitations;
- real clone generation completed and clone review is required or complete;
- latest clone review is `accepted` or `accepted_with_limitations`;
- clone site version and runtime artifact refs exist;
- source evidence review refs exist;
- the migration is not terminal, failed, or cancelled.

If clone review is `retry_required`, `rejected`, `superseded`, missing, or not the latest accepted review, proposal planning is blocked.

## Workflow

1. Review accepted clone.

   The operator opens the latest clone review and verifies the accepted clone site version ref, runtime artifact ref, source evidence review ref, fidelity findings, warnings, and limitations.

2. Start proposal planning.

   The operator creates a proposal plan draft tied to the migration, latest accepted clone review, clone runtime refs, source evidence refs, actor, correlation id, and idempotency key. Accepted-with-limitations clone review context is copied into the plan limitations.

3. Inspect source evidence and clone fidelity findings.

   The operator reviews source capture evidence, source evidence review items, clone fidelity findings, source limitations, missing evidence, WU/VCU projections where available, and business/context refs. Generated proposal bundles or AI advisory outputs may be inspected only as advisory input.

4. Define improvement findings.

   The operator records evidence-backed findings such as unclear hero copy, weak CTA structure, mobile layout issue, SEO metadata gap, missing trust signal, accessibility concern, form friction, analytics gap, or legal/compliance concern.

5. Define recommendations.

   Each recommendation should state target scope, category, rationale, expected outcome, impact, risk, effort, confidence, priority, dependencies, limitations, and linked findings. Recommendations should be manual/operator-authored for MVP.

6. Classify recommendations.

   Use the MVP categories:

   `content_clarity`, `visual_design`, `brand_consistency`, `conversion`, `seo`, `aeo`, `accessibility`, `performance`, `mobile_responsive`, `information_architecture`, `trust_credibility`, `forms_and_leads`, `analytics_measurement`, `technical_cleanup`, `legal_or_compliance`, `unknown_or_manual`.

7. Review risk, effort, and impact.

   The operator assigns impact `low`, `medium`, `high`, or `critical`; risk `low`, `medium`, `high`, or `critical`; effort `small`, `medium`, `large`, or `unknown`; confidence `low`, `medium`, or `high`; and priority `p0`, `p1`, `p2`, or `p3`.

8. Preserve limitations.

   Source evidence limitations, clone review limitations, unresolved fidelity findings, unsupported widget/form issues, missing evidence, and external dependencies must remain visible in proposal evidence. A limitation can be accepted, deferred, or converted into a recommendation, but it cannot disappear silently.

9. Request proposal review.

   The operator marks the proposal plan `ready_for_review` only after required refs, findings, recommendations, limitations, and summary are complete. This may create or prepare a proposal evidence package in a future implementation.

10. Handle review.

   A reviewer may move the plan to `in_review`, request changes, approve, approve with limitations, reject, cancel, or supersede. Changes requested returns the plan to draft/planning work with a new event and reason.

11. Approve or reject proposal.

   Approval must cite the proposal plan version, evidence package, approver role/scope, policy version, limitations, and audit refs. Rejection must cite a reason and evidence refs. Approval is a planning approval only.

12. Authorize implementation later.

   Implementation authorization is a separate later decision by default. It must cite approved recommendation ids, target scope, implementation evidence, AAF decision refs, and audit refs. Only after implementation authorization may a future service begin improved version creation.

13. Preserve audit and evidence refs.

   Every transition should preserve actor, role, correlation id, causation id, idempotency key, source refs, evidence refs, approval refs, limitations, and supersession links.

## Operator Decision Outcomes

| Outcome | Meaning | Downstream effect |
| --- | --- | --- |
| `draft` | Planning is in progress | No approval or implementation. |
| `ready_for_review` | Proposal is reviewable | Review may begin; no approval yet. |
| `changes_requested` | Reviewer requested revision | Implementation blocked; operator revises. |
| `approved` | Proposal plan accepted | Implementation still requires authorization by default. |
| `approved_with_limitations` | Proposal plan accepted with limitations | Implementation still requires authorization and must carry limitations. |
| `rejected` | Proposal plan rejected | Implementation blocked; planning may restart or migration may be cancelled separately. |
| `superseded` | Plan is obsolete | Latest plan/revision must be used. |
| `cancelled` | Proposal work stopped | Does not publish or mutate runtime. |

## Required Evidence Shown For Proposal Approval

The proposal approver should see:

- proposal plan id/version and status;
- migration, client, site, clone review, source evidence review, clone version, and runtime artifact refs;
- findings and linked source refs;
- recommendations with category, impact, risk, effort, confidence, and priority;
- accepted source and clone limitations;
- AI/advisory refs clearly labeled advisory, if present;
- excluded/deferred recommendations;
- prohibited actions: no implementation, no content approval, no launch approval, no publish, no billing, no DNS;
- freshness and supersession rules;
- audit timeline refs.

## MVP In Scope

- Operator-authored proposal planning records.
- Stable refs to clone review and source evidence.
- Manual recommendation classification.
- Future AI input-output refs as evidence only.
- Proposal approval boundary.
- Readiness for a future implementation phase.

## MVP Out Of Scope

- Autonomous AI proposal generation.
- Autonomous implementation.
- Full Digital Business Twin advisory.
- Client portal review.
- Billing/domain/publish coupling.
- A/B variants.
- Campaign page generation.
- Full redesign marketplace/playbooks.

## Warnings For Operators

- Do not treat clone acceptance as approval to improve.
- Do not treat proposal approval as permission to implement.
- Do not treat client review as technical publish approval.
- Do not treat generated proposal bundles or AI output as truth.
- Do not close proposal work from Ops Inbox alone.
- Do not remove limitations without a new reviewed decision.
- Do not begin content/runtime work until implementation authorization exists in a later governed phase.
