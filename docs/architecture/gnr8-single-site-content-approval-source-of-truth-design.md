# GNR8 Single-Site Content Approval Source Of Truth Design

Phase: MVP-26
Scope: Documentation and architecture only.

## Decision

Use a hybrid source-of-truth model:

- AAF owns scoped approval, audit, policy, evidence, request, decision, revocation, expiration, and supersession truth for content approval.
- Single-site content approval persistence owns workflow records, reviewed candidate refs, findings, limitation carry-forward, recommendation coverage, readiness, and AAF refs.
- Runtime remains the source truth for candidate site version and runtime artifact identity/content payloads.
- Existing content override and publish routes are not canonical single-site content approval truth unless a later milestone adapts and gates them explicitly.
- Command Center and Ops Inbox remain derived-only.

## Options Evaluated

| Option | Assessment |
| --- | --- |
| A. Single-site content approval tables own all content approval truth | Rejected as complete truth because it would duplicate AAF approval/audit/evidence semantics and risk unscoped boolean approvals. Useful only for workflow/readiness and reviewed refs. |
| B. AAF owns all content approval truth | Rejected as complete workflow truth because AAF should not own detailed single-site findings, item lifecycle, recommendation coverage, or read-model workflow state. |
| C. Hybrid AAF plus single-site workflow records | Recommended. AAF remains canonical for approval/evidence/audit; single-site records remain canonical for migration-specific workflow, candidate refs, findings, limitations, and projection. |
| D. Existing content routes own content approval truth | Rejected. Existing routes mutate/read content overrides and history but do not bind to MVP-25 accepted improved version review, AAF scoped approval, or single-site transition contracts. |

## Source Truth Boundaries

| Domain | Canonical owner | Notes |
| --- | --- | --- |
| Candidate site version identity | Runtime site version records | Referenced by single-site content approval; not mutated by approval. |
| Candidate artifact identity/content payload | Runtime artifact records | Approval cites artifact refs/watermarks; runtime remains payload truth. |
| Improved version review acceptance | MVP-25 improved version review tables | Prerequisite only; not content approval. |
| Content approval request/decision/evidence/audit | AAF | Exact scope, subject refs, evidence freshness, policy, actor, decision status, audit events. |
| Content approval workflow status/findings | Future single-site content approval tables | Review state, findings, limitation carry-forward, coverage, AAF refs, supersession. |
| Content override draft/published state | Runtime content override tables | Editing/publish state only; not approval truth. |
| Client approval | Future client review scope/workflow | Separate from content approval. |
| Launch approval | Future launch signoff scope/workflow | Separate from content approval. |
| Publish activation | PASR/AAF publish activation scope and runtime publish path | Separate from content approval. |
| Domain/DNS/billing/hosting | Existing/future domain, billing, hosting source truth | Separate readiness domains. |
| Command Center/Ops Inbox | Derived projections | Never source truth. |

## AAF Ownership

AAF owns content approval truth for:

- approval request identity;
- approval decision identity and status;
- exact scope `single_site_content_approval`;
- subject refs and watermarks;
- policy version and evaluation result;
- requester and approver roles;
- separation-of-duty result where required;
- evidence package identity, type, freshness, redaction, and source refs;
- revocation, expiration, supersession, cancellation, and not-required decisions;
- audit events and timeline refs.

## Single-Site Ownership

Future single-site content approval persistence should own:

- migration-bound content approval workflow id;
- content approval status;
- reviewed improved version review id;
- reviewed improved candidate site version ref;
- reviewed improved runtime artifact ref;
- reviewed proposal plan and selected recommendation refs;
- content findings and item lifecycle;
- recommendation coverage summary;
- limitations and caveats carried forward;
- not-applied/unsupported recommendation records;
- SEO/AEO/accessibility/legal review summaries;
- AAF request, evidence, policy evaluation, decision, audit, revocation, and supersession refs;
- read-model projection fields and recommended next action.

Single-site rows should not attempt to be the canonical AAF approval decision. They should cite AAF and project readiness from AAF plus single-site workflow facts.

## Runtime Ownership

Runtime remains canonical for:

- candidate site version existence and state;
- runtime artifact identity and payload;
- artifact/site version watermarks where available;
- active pointer state;
- published content override state.

Content approval must not mutate runtime. If content must change after content approval findings, a later content revision milestone must create a new candidate or governed content-editing workflow, then supersede/reopen approval.

## Existing Content Route Reuse Rules

Existing content routes may be reused later only when all rules are true:

- the route is wrapped by a server-only adapter that binds tenant/client/site/migration/improved candidate refs;
- the adapter checks the latest single-site state and AAF gate for the exact action;
- content approval workflow records cite the route output as evidence or revision input, not as approval truth;
- mutation routes are never called by approval decision code;
- content publish routes require separate content publish or publish activation gates;
- rollback routes require separate rollback/recovery approval where policy requires it;
- all writes are audited and correlated to the single-site migration.

## Supersession Rules

Content approval must be superseded when any material reviewed source changes:

- accepted improved version review changes or is superseded;
- improved candidate site version ref changes;
- improved runtime artifact ref changes;
- artifact/content watermark changes;
- selected recommendation refs or coverage change;
- limitations or blocker findings change;
- evidence package becomes stale;
- AAF request/decision is revoked, expired, cancelled, or superseded;
- policy version change invalidates the prior decision.

## Read Model Boundary

The read model may project:

- latest content approval id and status;
- AAF decision status and refs;
- reviewed candidate refs;
- finding counts by severity/category;
- unresolved blockers;
- limitations and not-applied recommendation counts;
- next action such as `request_content_approval`, `complete_content_review`, `revise_content_candidate`, or `prepare_client_launch_approval`.

The read model remains derived-only, non-enforcing, and non-mutating.

## Recommendation

Implement MVP-27 as AAF scope/contracts first because current AAF vocabulary does not include `single_site_content_approval`. Implement MVP-28 persistence/service after the scope exists, so the service can cite exact AAF request/evidence/decision refs from day one.
