# GNR8 Single-Site Implementation Authorization AAF Scope Design

Phase: MVP-16
Scope: Documentation and architecture only

This document designs the AAF approval scope needed before single-site improvement implementation can begin in a later milestone. It does not create scope constants, policy rows, SQL, TypeScript, routes, UI, Command Center actions, Ops Inbox actions, implementation records, or approval records.

## Current AAF Vocabulary

Existing AAF scope names use explicit action nouns such as:

- `batch_start`
- `content_publish`
- `client_review`
- `launch_signoff`
- `publish_activation`
- `external_workflow_reference_acceptance`
- `ai_advisory_plan_acceptance`

Existing AAF evidence package names pair the action with an evidence suffix, such as `publish_activation_evidence` and `ai_advisory_review_evidence`.

## Recommended Scope

Recommended exact scope name:

`single_site_improvement_implementation_authorization`

Recommended evidence package type:

`single_site_improvement_implementation_authorization_evidence`

Recommended subject type:

`single_site_improvement_proposal_plan`

Recommended allowed action:

`start_single_site_improvement_implementation`

Recommended replay class:

`manual_retry_only`

The name is intentionally specific. `implementation_authorization` alone is too broad because AAF already governs many unrelated implementation, provider, domain, publish, rollback, and recovery actions. The scope must bind to one single-site migration proposal plan and one intended implementation attempt boundary.

## Source Of Truth

AAF owns approval truth for this scope:

- request identity;
- decision identity and status;
- exact approval scope;
- subject refs and watermarks;
- policy version;
- allowed requester and approver roles;
- separation-of-duty result;
- evidence package identity and freshness;
- revocation, expiration, supersession, and cancellation;
- audit events.

The single-site proposal planning service stores only:

- AAF request refs;
- AAF decision refs;
- AAF evidence package refs;
- AAF policy evaluation refs;
- derived readiness;
- limitation carry-forward metadata.

## Required Subject Refs

The AAF request, evidence package, and decision must bind to these subject refs:

| Ref | Required | Purpose |
| --- | --- | --- |
| tenant id | Yes | Tenant boundary and policy scope. |
| client id | Yes | Client/account boundary. |
| site id | Yes | Site boundary. |
| single-site migration id | Yes | Migration spine subject. |
| proposal plan id | Yes | Canonical approved plan being implemented. |
| proposal plan version | Yes | Blocks stale approval after plan revision. |
| proposal plan semantic watermark | Yes | Blocks stale approval after meaningful plan changes. |
| proposal approval request id | Yes when available | Shows prior proposal review request. |
| proposal approval decision id | Yes | Proves proposal approval is separate and already granted. |
| proposal evidence package id | Yes when available | Connects implementation evidence to proposal evidence. |
| clone review id | Yes | Binds implementation to the accepted clone review. |
| clone review status | Yes | Must be `accepted` or `accepted_with_limitations`. |
| clone review watermark | Yes | Blocks stale approval after clone review changes. |
| clone site version ref | Yes | Defines the baseline runtime version. |
| runtime artifact ref | Yes | Defines the immutable clone artifact baseline. |
| runtime artifact hash or watermark | Yes when available | Blocks stale approval after artifact change. |
| source evidence review id | Yes | Binds implementation to accepted source evidence. |
| source evidence review status | Yes | Must be accepted or accepted with limitations. |
| source evidence review watermark | Yes | Blocks stale approval after source evidence review changes. |
| selected recommendation ids | Yes | Defines approved implementation scope. |
| selected recommendation watermarks | Yes | Blocks stale approval after recommendation changes. |
| implementation target refs | Yes when available | Future intended target placeholder, draft version, branch, artifact plan, or content scope. |
| implementation attempt id | Yes when available | Binds decision to one future execution attempt. |

If an implementation target or attempt id does not exist at request time, the evidence package must include a placeholder target descriptor. Future execution must bind a concrete attempt to that descriptor and revalidate AAF before mutation.

## Required Evidence Refs

The evidence package must include refs or immutable snapshots for:

- proposal plan snapshot;
- approved proposal decision;
- proposal approval limitations and exclusions;
- clone review acceptance;
- clone review limitations;
- clone site version ref;
- runtime artifact ref and hash/watermark where available;
- source evidence review acceptance;
- source evidence limitations;
- source capture/source evidence refs used by selected recommendations;
- selected recommendation ids and summaries;
- recommendation risk, impact, effort, priority, confidence, target scope, and exclusions;
- implementation scope summary;
- implementation approach classification;
- implementation non-goals;
- limitation carry-forward summary;
- operator notes;
- risk and rollback consideration summary;
- expected output refs if known;
- AI/provider advisory refs, if used later, clearly labeled evidence only;
- generated proposal bundle refs, if used later, clearly labeled advisory evidence only;
- audit timeline refs for proposal planning, proposal approval, request, decision, and validation.

Evidence package snapshots must be immutable or append-only ref sets. Heavy artifacts should be stored by ref, hash, version, and watermark rather than embedded as mutable payloads.

## Freshness And Watermark Rules

An implementation authorization is valid only while all required freshness checks pass:

- proposal plan status remains `approved` or `approved_with_limitations`;
- proposal plan id, version, and semantic watermark match the AAF subject refs;
- proposal approval decision remains granted, current, and unsuperseded;
- clone review remains latest accepted or accepted with limitations for the migration;
- clone review watermark matches the AAF subject refs;
- clone site version and runtime artifact refs still identify the intended baseline;
- source evidence review remains accepted or accepted with limitations;
- source evidence review watermark matches the AAF subject refs;
- selected recommendations are still part of the approved proposal plan;
- selected recommendation watermarks match the evidence package;
- implementation scope, target refs, or attempt descriptor have not changed;
- AAF policy version is still effective or the policy evaluation explicitly accepts the older version;
- AAF decision has not expired, been revoked, or been superseded;
- required audit events exist.

Recommended maximum validity window:

- 24 hours for low and medium risk implementation scopes;
- 8 hours for high risk, legal/compliance, forms/leads, analytics, or metadata scopes;
- shorter if policy, source evidence, runtime artifact, proposal plan, or selected recommendations change.

## Authorization Status Vocabulary

This vocabulary is the product/read-model vocabulary for implementation authorization. AAF remains canonical for decision status.

| Status | Meaning | Implementation readiness |
| --- | --- | --- |
| `not_required_yet` | Proposal is not approved yet, so implementation authorization is not requestable. | Blocked |
| `required` | Proposal is approved and authorization must be requested. | Blocked |
| `requested` | AAF request exists but no effective grant exists. | Blocked |
| `granted` | AAF grant exists, is fresh, matches scope/subject/evidence, and has no limitations beyond accepted plan scope. | May start |
| `granted_with_limitations` | AAF grant exists and is fresh, with limitations that must carry into implementation. | May start with limitations |
| `rejected` | AAF decision rejected the request. | Blocked |
| `revoked` | AAF grant was revoked. | Blocked |
| `expired` | AAF grant/request exceeded time or freshness window. | Blocked |
| `superseded` | Source state, policy, evidence, proposal, or target changed. | Blocked |
| `invalid` | Ref is missing, malformed, forged, wrong scope, wrong subject, wrong evidence type, or fails policy. | Blocked |
| `stale` | Ref exists but watermarks or freshness no longer match. | Blocked |

Mapping from existing MVP-15 recommendation status vocabulary:

- `not_requested` maps to `required` after proposal approval, otherwise `not_required_yet`;
- `authorized` maps to `granted` only after AAF validation;
- `authorized_with_limitations` maps to `granted_with_limitations` only after AAF validation;
- `requested`, `rejected`, `expired`, and `superseded` retain their meanings;
- `revoked`, `invalid`, and `stale` are missing from MVP-15 and should be added only in a future implementation milestone.

## Prohibited Actions

The new AAF scope must prohibit:

- treating proposal approval as implementation authorization;
- content approval;
- client approval;
- launch signoff;
- publish activation;
- domain/DNS mutation;
- billing/subscription/hosting activation;
- rollback;
- provider execution unrelated to the named implementation scope;
- AI execution without separate provider/action gate if later required;
- Command Center or Ops Inbox canonical resolution.

## Required Gate Behavior

Future implementation execution must ask AAF for a fail-closed gate evaluation before mutation.

Allowed result:

- `allowed`, with effective AAF decision status `granted` or a future policy-defined `not_required_by_policy` only if policy explicitly allows the exact scope.

Blocking results:

- `approval_required`;
- `evidence_missing`;
- `evidence_stale`;
- `approval_stale`;
- `approval_superseded`;
- `approval_revoked`;
- `audit_unavailable`;
- `policy_error`;
- `fail_closed`;
- wrong scope;
- wrong subject;
- wrong action;
- wrong evidence package type.

Absence of an AAF row never means approval is not required.
