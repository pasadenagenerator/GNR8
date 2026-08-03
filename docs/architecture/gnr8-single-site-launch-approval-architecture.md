# GNR8 Single-Site Launch Approval Architecture

Phase: MVP-30
Scope: Documentation and architecture only.

This document defines the future single-site launch approval boundary after content approval and, when required, client approval. It does not implement TypeScript, SQL, services, routes, UI, launch checklist execution, billing activation, domain/DNS mutation, publish activation approval, runtime mutation, active pointer mutation, provider calls, AI calls, commits, or pushes.

## Baseline

The current single-site transition service has a coarse `publish_ready` guard that expects a launch approval ref alongside content approval, DDOM/domain readiness, subscription/hosting entitlement, publish target, and rollback target refs. That code has no single-site launch approval persistence/service architecture behind the placeholder yet.

PASR already treats launch signoff as separate from publish activation approval. DDOM treats domain readiness as a publish prerequisite, not approval. Billing/cost/entitlement services provide operating readiness inputs, not launch approval truth.

## Definition

Launch approval is the internal operational approval that the improved site candidate is ready to enter final launch preparation after content approval and client/account acceptance requirements have been satisfied.

It covers:

- confirmation that required pre-launch blockers are resolved or explicitly accepted;
- confirmation that content approval is current and exact to the candidate;
- confirmation that client approval is current when policy requires it;
- acknowledgement of known limitations and unresolved blockers;
- approval to proceed toward billing, domain, publish target, rollback, smoke/QA, and publish readiness checks.

Launch approval does not cover:

- publish activation approval;
- domain, DNS, SSL, DDOM, or custom-domain readiness itself;
- billing, subscription, hosting entitlement, Stripe, pricing, cost, or margin readiness itself;
- active pointer mutation;
- public runtime publication;
- site version mutation;
- runtime artifact mutation;
- client approval;
- content approval;
- rollback approval or rollback execution;
- automatic checklist execution.

## Dependency Model

Launch approval should depend on:

- content approval for the exact improved candidate;
- client approval when required by site/client/agency policy;
- carried limitations from improved version review, content approval, and client approval;
- unresolved blockers and operator findings;
- future rollback readiness requirements;
- future domain/DDOM readiness snapshots as prerequisite evidence or separate gates;
- future billing/subscription/hosting entitlement readiness as prerequisite evidence or separate gates;
- future publish target refs as prerequisite evidence or separate gates.

Launch approval may be prepared before every downstream readiness source exists, but the approval evidence must mark missing readiness sources as placeholders or limitations. It must not claim missing domain, billing, rollback, or publish target truth as ready.

## Relationship To Publish Activation

Launch approval is not publish activation approval. It should never be consumed as the AAF `publish_activation` decision. PASR/PTT remains responsible for publish activation evidence, publish target truth, publish shadow readiness, and eventual enforcement design.

Launch approval can permit the organization to start final readiness work. It cannot permit pointer switch, public publish, runtime activation, rollback, or provider mutation.

## Source Truth

Launch approval truth should use the hybrid MVP model:

- AAF owns exact approval, evidence, audit, request, decision, revocation, expiration, supersession, and policy truth for `single_site_launch_approval`.
- Future single-site launch approval persistence owns workflow records, refs, findings, blockers, limitations, checklist snapshots, readiness placeholders, derived readiness, and AAF refs.
- Runtime owns candidate version/artifact truth.
- DDOM owns domain readiness snapshots.
- Billing/entitlement services own subscription and hosting readiness.
- PASR/PTT owns publish activation readiness, publish target truth, and shadow truth.
- Command Center and Ops Inbox remain derived-only.

## Status Vocabulary

Future launch approval workflow status:

- `not_required_yet`
- `required`
- `draft`
- `ready_for_review`
- `in_review`
- `blocked`
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

Launch finding categories:

- `content_ready`
- `client_ready`
- `domain_ready`
- `billing_ready`
- `rollback_ready`
- `qa_ready`
- `seo_ready`
- `accessibility_ready`
- `performance_ready`
- `limitation`
- `manual_note`
- `unknown_or_manual`

## Required MVP Behavior Later

Future implementation should:

- fail closed unless content approval is current and exact-scope AAF-backed;
- require client approval when policy requires it;
- carry limitations from content/client approval into launch evidence;
- distinguish blockers from accepted limitations;
- record readiness refs as evidence or placeholders without treating them as approval truth;
- project launch readiness to read models without allowing projections to grant approval;
- require separate publish activation approval before any active pointer mutation.

## Warnings

- Do not turn launch approval into publish activation approval.
- Do not treat domain readiness or billing readiness as launch approval.
- Do not infer launch approval from PASR shadow readiness, Command Center status, Ops Inbox work items, hosting detail views, or route readiness labels.
- Do not let launch approval mutate runtime artifacts, site versions, active pointers, content overrides, domains, DNS, billing, subscriptions, hosting, or publish targets.
- Do not drop limitations between client approval, launch approval, and publish activation.
