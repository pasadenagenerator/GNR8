# GNR8 Approval Persistence Model

AAF-1 conceptual approval persistence model for the GNR8 MVP.

This document is conceptual only. It does not create schemas, migrations, tables, routes, UI, workers, actions, or runtime behavior.

## Purpose

The approval persistence model defines the canonical objects, statuses, scopes, roles, lifecycle, and scope boundaries future implementation must use before approval-gated GNR8 actions are expanded.

## Canonical Approval Objects

| Object | Conceptual purpose | Required refs |
| --- | --- | --- |
| Approval request | A scoped request for a human decision before a gated action can proceed. | request id, scope, subject, requested action, policy, requester actor, required approver role, evidence package ref, status, timestamps. |
| Approval decision | Append-only human decision for one request/scope/subject/evidence package. | decision id, request id, actor, actor role/scope, decision status, reason, policy version, evidence package ref, audit ref. |
| Approval evidence package | Immutable snapshot or append-only ref set shown to the approver. | evidence package id, package type, source refs, freshness labels, source watermarks, limitations, audit timeline refs. |
| Approval scope | The exact boundary of what the approval can satisfy. | scope key, subject type, action class, allowed action, prohibited actions. |
| Approval policy | Rule deciding required approver, evidence, expiration, revocation, supersession, and audit event. | policy id/version, scope, role rules, freshness rules, emergency rules. |
| Approval subject | Entity being approved. | batch, job, stage, site, site version, domain binding, content set, incident, cost threshold, external ref, AI advisory bundle. |
| Approval actor | Human or system requesting/deciding. | actor id, actor type, actor role, agency/client/site scope. |
| Approver role | Role allowed to decide. | role key, agency/client/site scope, superadmin override if policy permits. |
| Approval status | Derived lifecycle state. | requested/granted/rejected/revoked/expired/superseded/cancelled/not_required_by_policy. |
| Approval expiration | Rule and timestamp/window after which a decision no longer satisfies a gate. | expires at, freshness basis, launch window, policy version. |
| Approval supersession | Append-only link from old decision/evidence to newer source state or decision. | superseded by, reason, changed source ref, audit ref. |
| Approval revocation | Human decision that removes validity before expiration. | revoker actor, reason, effective time, audit ref. |
| Approval exception | Policy-approved exception to normal gate requirements. | exception scope, risk, approver, limitations, expiration, evidence refs. |
| Approval audit ref | Link to audit event(s) proving request/decision/revocation/supersession. | audit event id(s), correlation id, causation id. |

## Required Approval Statuses

| Status | Meaning |
| --- | --- |
| `requested` | Decision is pending. |
| `granted` | Human decision satisfies the named scope while fresh and unsuperseded. |
| `rejected` | Human decision denies the request. |
| `revoked` | Previously granted decision was withdrawn by authorized human decision. |
| `expired` | Decision/request exceeded time, freshness, source, or policy window. |
| `superseded` | New source state, policy, or decision replaced the prior decision/evidence. |
| `cancelled` | Request was withdrawn before final decision. |
| `not_required_by_policy` | Policy evaluation explicitly says approval is not required for the named scope/action. |

## Required Rule

No approval may enable an action outside its explicit scope. Launch approval does not equal publish activation approval. Domain readiness approval does not equal DNS mutation approval. Client review approval does not equal technical publish approval. AI plan acceptance does not equal execution approval.

## Required Approval Scopes

| Scope | Purpose | Subject type | Required approver role | Evidence package | Expiration rule | Revocation/supersession triggers | Audit event | Action enabled | Action not enabled | Command Center visibility | Ops Inbox effect | Implementation risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `batch_start` | Permit an approved batch plan to begin execution. | Batch plan/batch. | Migration operator lead, agency admin, or superadmin by risk. | `batch_start_evidence`. | Batch plan/input freshness or launch window. | Batch membership, dry-run, classification, cost, owner, policy change. | `approval.batch_start.granted`. | Start named batch under policy. | Publish, rollback, DNS, retry/replay, launch signoff. | Shows start gate and evidence freshness. | Creates/resolves `batch_start_approval_needed`. | Starting from stale dry-run or partial intake. |
| `batch_resume` | Permit resume after pause, high-risk stop, or policy block. | Batch. | Migration/technical operator; superadmin for critical/cost. | `retry_replay_evidence` or batch recovery evidence. | Pause reason freshness. | New failure, cost anomaly, incident, policy change. | `approval.batch_resume.granted`. | Resume named batch under stated policy. | New retries, publish, rollback, launch. | Shows resume gate and blockers. | Resolves resume approval item. | Treating resume as blanket continuation. |
| `dry_run_waiver` | Permit start planning/execution without current dry-run. | Batch plan. | Superadmin or migration lead by policy. | `dry_run_waiver_evidence`. | Short; until intake/plan changes. | Any intake/batch/classification/cost change. | `approval.dry_run_waiver.granted`. | Allows batch start request to proceed without dry-run. | Does not start batch by itself. | Shows waiver label and limitations. | Resolves dry-run waiver blocker; may create batch start approval. | Waiver hiding unknown risk. |
| `retry_request` | Permit retry of same action/stage after failure. | Job/stage/action. | Migration or technical operator; superadmin for high/critical/cost. | `retry_replay_evidence`. | Until input/state/failure changes. | New attempt, failure classification change, source input change. | `approval.retry_request.granted`. | Retry named failed action. | Replay, publish, rollback, DNS mutation. | Shows attempt count and approval. | Resolves retry approval item. | Retrying side effects without idempotency. |
| `replay_request` | Permit deterministic replay from immutable input refs. | Job/stage. | Migration/technical operator; superadmin for critical. | `retry_replay_evidence`. | Until input refs or downstream outputs change. | Source capture/input refs change, new replay, non-replayable classification. | `approval.replay_request.granted`. | Replay named eligible stage. | Human approval replay, publish, rollback, domain/provider actions. | Shows replay class and reset scope. | Resolves replay approval item. | Resetting downstream state without evidence. |
| `unsupported_site_exception` | Accept unsupported/import-only/deferred site risk for a limited path. | Intake row/site. | Superadmin. | `unsupported_exception_evidence`. | Until source/classification/review changes. | New classification, new capture, client scope change. | `approval.unsupported_site_exception.granted`. | Proceed only with stated exception path. | Normal launch/publish unless separately approved. | Shows exception banner and limits. | Resolves unsupported blocker or keeps launch blocked. | Exception becomes accidental support claim. |
| `degraded_capture_exception` | Accept degraded capture for review/limited launch path. | Job/site version. | Technical operator or superadmin by severity. | `unsupported_exception_evidence`. | Until new capture/import/preview. | New capture, route/asset/readiness change. | `approval.degraded_capture_exception.granted`. | Continue review or limited path as stated. | Publish without publish approval/readiness. | Shows accepted degradation. | Resolves degraded capture item. | Hiding broken assets/routes. |
| `route_coverage_exception` | Accept incomplete route coverage. | Site/version/route map. | Technical operator, agency admin, or superadmin by risk. | `unsupported_exception_evidence`. | Until route map/source changes. | New discovery, critical page list change, client rejection. | `approval.route_coverage_exception.granted`. | Continue review/launch signoff with limitation. | Domain/publish activation. | Shows route limitation. | Resolves route review blocker or downgrades severity. | Missing high-value pages. |
| `form_widget_booking_exception` | Accept form/widget/booking limitation or externalization. | Site/version integration inventory. | Technical operator plus agency/client owner by policy. | `unsupported_exception_evidence`. | Until widget/form evidence changes. | New test result, source widget change, client rejection. | `approval.form_widget_booking_exception.granted`. | Accept stated limitation for launch review. | Claims form/widget migration success. | Shows critical integration warning. | Resolves integration exception item. | Lost leads/bookings. |
| `content_publish` | Permit draft overrides to become published content. | Content slot/override set/site version. | Content operator plus agency/client reviewer by policy. | `content_publish_evidence`. | Until draft, slot, preview, or review changes. | Draft update, conflict, preview stale, client rejection. | `approval.content_publish.granted`. | Publish named content override set. | Runtime version publish/domain/rollback. | Shows content approval state. | Resolves content approval item. | Publishing stale/unreviewed copy. |
| `client_review` | Record client/account review outcome for site content/preview. | Site version/review package. | Client reviewer or agency account owner. | `launch_signoff_evidence` or `content_publish_evidence`. | Review window/source freshness. | Preview/content/readiness/source changes. | `approval.client_review.granted`. | Satisfies client review gate. | Technical publish activation. | Shows client review status. | Resolves client review item. | Confusing client acceptance with technical safety. |
| `launch_signoff` | Approve site for launch path after review/readiness limitations. | Site/site version. | Agency owner/admin, client reviewer, or superadmin by policy. | `launch_signoff_evidence`. | Launch window; until preview/readiness/domain/content changes. | New version/artifact/content/domain/incident/cost blocker. | `approval.launch_signoff.granted`. | Mark site launch-approved. | Publish activation, DNS mutation, rollback. | Shows launch approved with remaining gates. | Resolves launch approval item; may create publish readiness item. | Treating signoff as publish button. |
| `domain_action` | Permit GNR8 domain binding/check/instruction/provider-side action within MVP boundary. | Domain binding/DNS plan. | Technical operator or superadmin; client actor if client controls DNS evidence. | `domain_action_evidence`. | Short DNS freshness window. | DNS instruction/check/binding/owner changes. | `approval.domain_action.granted`. | Perform named GNR8 domain action/check/instruction step. | Live registrar mutation unless separately authorized by future ADR. | Shows action owner and stale labels. | Resolves domain action item. | Mistaking Vercel/manual checks for DNS control. |
| `domain_exception` | Accept domain readiness exception such as internal-host launch or stale external evidence. | Domain readiness state. | Technical operator or superadmin; agency/client owner for launch risk. | `domain_exception_evidence`. | Launch window or DNS freshness window. | New check, failed verification, owner change, launch domain change. | `approval.domain_exception.granted`. | Proceed under stated domain exception. | DNS mutation or publish activation. | Shows exception limitation. | Resolves domain blocker or downgrades to warning. | Launching with broken custom domain. |
| `publish_activation` | Permit explicit runtime activation after all gates. | Site version/artifact/active pointer/content set. | Technical operator or superadmin. | `publish_activation_evidence`. | Very short; until any publish readiness ref changes. | Version/artifact/content/domain/readiness/rollback/incident/cost change. | `approval.publish_activation.granted`. | Execute one publish activation attempt. | Launch signoff, DNS mutation, rollback, future publishes. | Shows separate publish approval. | Resolves publish approval item. | Treating publish as deterministic replay. |
| `rollback` | Permit incident/recovery rollback to known target. | Incident plus runtime/content target. | Technical operator or superadmin; emergency path may compensate. | `rollback_evidence`. | Incident window; until target/current state changes. | Active pointer/content/history/incident severity change. | `approval.rollback.granted`. | Execute named rollback/recovery attempt. | Future publish or root-cause closure. | Shows incident recovery decision. | Resolves rollback approval item; incident remains until verified. | Rolling to wrong/stale target. |
| `cost_exception` | Permit continue/launch/retry/replay despite threshold/anomaly/missing cost signal. | Cost event/anomaly/batch/site. | Superadmin or agency owner/admin. | `cost_exception_evidence`. | Cost window or budget period. | New cost event/anomaly/threshold/batch scope. | `approval.cost_exception.granted`. | Continue named cost-blocked action. | Billing truth, publish unless separate approval. | Shows threshold and exception. | Resolves cost anomaly item for named scope. | Masking runaway cost. |
| `incident_recovery` | Approve recovery plan or non-rollback incident decision. | Incident/recovery record. | Technical operator, agency owner/admin, or superadmin by severity. | `incident_recovery_evidence`. | Incident window. | New impact, failed recovery, customer escalation, state change. | `approval.incident_recovery.granted`. | Execute named recovery plan or accept documented alternative. | Rollback unless included and separately scoped. | Shows recovery decision and owner. | Updates incident item. | Closing incident without proof. |
| `external_workflow_reference_acceptance` | Accept external ref/snapshot as evidence only. | External ref linked to GNR8 subject. | Operator owning subject; superadmin for critical gates. | `external_workflow_reference_evidence`. | External snapshot freshness. | External ref changes, source unavailable, subject changes. | `approval.external_ref_acceptance.granted`. | Use ref as evidence in package. | Treat external system as GNR8 approval/state truth. | Shows external evidence label. | Resolves missing external evidence item. | External task drift. |
| `ai_advisory_plan_acceptance` | Accept AI/provider plan as advisory evidence. | AI/provider bundle. | Human operator qualified for downstream domain. | `ai_advisory_review_evidence`. | Until inputs/policy/cost/source state changes. | New bundle, source state change, model/provider limitation change. | `approval.ai_advisory_plan_acceptance.granted`. | Cite plan as advisory evidence. | Execution, publish, rollback, DNS, cost exception, approval. | Shows AI advisory accepted/rejected. | Resolves AI review item only. | Automation by implication. |

## Derived Validity Rules

Future implementation should derive whether an approval can satisfy a gate from:

- approval status is `granted` or `not_required_by_policy`;
- actor and approver role still satisfy policy;
- subject and action class match exactly;
- evidence package is fresh and not superseded;
- approval has not expired, been revoked, or been superseded;
- required audit events are present or emergency compensating policy applies;
- idempotency key and request/action context match the named attempt where applicable.

## Explicit Deferrals

- Physical schema and migration design.
- Policy engine implementation.
- Command Center approval UI.
- Ops Inbox approval item persistence.
- Approval notification routing.
- External signature/legal approval workflows.
- Customer-facing approval portal.
