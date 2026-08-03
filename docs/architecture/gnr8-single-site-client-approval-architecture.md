# GNR8 Single-Site Client Approval Architecture

Phase: MVP-30
Scope: Documentation and architecture only.

This document defines the future single-site client approval boundary after exact-scope content approval and before launch approval, domain readiness, billing readiness, publish readiness, or publish activation. It does not implement TypeScript, SQL, services, routes, UI, client portal behavior, AAF scopes, persistence, runtime mutation, active pointer mutation, billing, domain/DNS, publish, rollback, provider calls, AI calls, commits, or pushes.

## Baseline

MVP-29 made content approval exact-scope AAF-backed through `single_site_content_approval`. Content approval can validate content-facing evidence and carry limitations forward, but it is explicitly not client approval, launch approval, publish activation approval, domain readiness, billing readiness, public runtime publication, or active pointer mutation.

MVP-28 created content approval workflow persistence and read-model projection. It can store AAF content approval refs and expose later client/launch readiness as derived state, but it does not create a client approval architecture.

AAF already contains older broad scope names such as `client_review` and `launch_signoff`; those are not precise enough for the single-site migration MVP because they do not bind directly to one migration, one improved candidate, one content approval, and one carried limitation set.

## Definition

Client approval is the client/account/business acceptance that the improved single-site candidate is acceptable from a client-facing perspective.

It covers:

- acceptance of the improved candidate website as a business-facing replacement candidate;
- acceptance that content approval has passed for the candidate content;
- acceptance of carried limitations where applicable;
- acceptance of not-applied or deferred recommendations where applicable;
- acknowledgement of brand, messaging, business, legal, compliance, or account notes that are visible to the client/account review process;
- approval to proceed toward internal launch readiness work.

Client approval does not cover:

- technical launch approval;
- launch checklist completion;
- domain, DNS, SSL, DDOM, or custom-domain readiness;
- billing, subscription, hosting entitlement, Stripe, pricing, cost, or margin readiness;
- publish activation approval;
- public runtime publication;
- content publish;
- rollback readiness or rollback approval;
- active pointer mutation;
- site version mutation;
- runtime artifact mutation;
- future commercial/legal signoff unless a later scope explicitly designs it.

## Who Can Grant It In MVP

MVP should allow these grantors by policy:

- internal account owner acting on behalf of the client;
- agency admin or account manager with the correct tenant/client/site scope;
- named client reviewer later, once a client portal actor is designed;
- future client portal actor, only after a separate route/UI/auth milestone.

The MVP implementation should start with server-only internal grantors. It should preserve subject refs for the represented client/account identity even when the actor is internal.

## Relationship To Content Approval

Content approval is a prerequisite, not a substitute. Client approval must require a validated `single_site_content_approval` decision for the exact candidate unless policy explicitly says client approval is not required for the site/client.

`approved_with_limitations` content approval may allow client approval only when limitations are presented and carried into the client approval subject/evidence. If those limitations are dropped, stale, or contradicted, client approval must be blocked.

## Relationship To Launch Approval

Client approval is business/account acceptance. Launch approval is internal operational readiness. They remain separate scopes and workflows.

A client approval can allow launch approval to begin when policy requires client acceptance. It cannot itself approve launch preparation, domain/billing readiness, publish readiness, or publish activation.

## Source Truth

Client approval truth should use the hybrid MVP model:

- AAF owns exact approval, evidence, audit, request, decision, revocation, expiration, supersession, and policy truth for `single_site_client_approval`.
- Future single-site client approval persistence owns workflow records, reviewed candidate refs, findings, limitations, reviewer representation, derived readiness, and AAF refs.
- Runtime owns improved candidate site version and artifact truth.
- Command Center, Ops Inbox, client portal pages, emails, chats, tickets, previews, thumbnails, and public runtime rendering are not approval truth.

## Status Vocabulary

Future client approval workflow status:

- `not_required_yet`
- `required`
- `draft`
- `ready_for_review`
- `in_review`
- `changes_requested`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`

Severity vocabulary:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Client finding categories:

- `business_acceptance`
- `content_acceptance`
- `brand_acceptance`
- `limitation_acceptance`
- `deferred_recommendation`
- `legal_or_compliance`
- `manual_note`
- `unknown_or_manual`

## Required MVP Behavior Later

Future implementation should:

- fail closed unless content approval is approved or approved with limitations through exact-scope AAF validation;
- preserve tenant, client, site, migration, improved candidate, proposal, authorization, execution, content approval, limitations, and reviewer refs;
- record findings and limitation acceptance without mutating runtime artifacts or active pointers;
- project read-model state for operators without making the projection authoritative;
- block launch approval when client approval is rejected, stale, superseded, cancelled, or changes requested and client approval is required by policy.

## Warnings

- Do not collapse client approval into content approval.
- Do not let an internal account owner's approval hide the fact that the represented client actor is not yet a true portal actor.
- Do not treat preview visibility, public rendering, email, Slack, ticket status, or client portal button state as canonical approval truth.
- Do not let client approval imply launch approval, publish activation approval, domain readiness, billing readiness, or rollback readiness.
- Do not drop limitations or deferred recommendations between content approval and client approval.
