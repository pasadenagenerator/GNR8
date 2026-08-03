# GNR8 Single-Site Launch Approval Persistence And Service Closeout

Phase: MVP-34
Date: 2026-08-03
Scope: canonical persistence, server-only service core, transition/read-model projection, focused tests, and documentation for single-site launch approval.

## Result

MVP-34 implemented the single-site launch approval persistence and server-only service core. Launch approval is now canonical internal operational approval after approved/approved-with-limitations content approval and, when policy requires it, approved/approved-with-limitations client approval.

It does not implement launch approval AAF bridge/evidence validation, domain/DNS readiness execution, billing/subscription/hosting activation, rollback readiness execution, publish activation approval, publishing, active pointer mutation, runtime artifact/site-version mutation, UI, API routes, server actions, workers, Command Center actions, Ops Inbox actions, client portal routes, public runtime routes, external providers, AI calls, or Generated Proposal Bundles.

## Files Reviewed

- `docs/architecture/gnr8-single-site-launch-approval-architecture.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-source-of-truth.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`
- `docs/product/gnr8-single-site-client-launch-approval-aaf-contracts-closeout.md`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-client-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260803210000_single_site_launch_approval_core.sql`
- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.integration.test.ts`
- `docs/product/gnr8-single-site-launch-approval-persistence-service-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name:

- `20260803210000_single_site_launch_approval_core.sql`

Tables created:

- `gnr8_single_site_launch_approvals`
- `gnr8_single_site_launch_approval_refs`
- `gnr8_single_site_launch_approval_items`
- `gnr8_single_site_launch_approval_events`
- `gnr8_single_site_launch_approval_supersessions`

The migration is additive, enables RLS on all new tables, adds no grants and no broad policies, preserves refs/events/supersessions as append-only with the existing single-site append-only trigger, keeps bounded mutable workflow header/items, uses durable refs, validates JSONB object/array shapes, constrains vocabulary, records idempotency keys, and prevents publish/runtime/active-pointer mutation flags from becoming true.

## Service

Service location:

- `apps/platform/gnr8/single-site/launch-approval-service.ts`

The service imports `server-only` and supports create/reuse, required ref recording, AAF launch request/decision ref attachment, content/client approval ref attachment through creation, readiness placeholder refs, checklist/blocker/smoke-QA/evidence refs, findings/items, ready/start review, blocked, approval, approval with limitations, rejection, cancellation, supersession, latest-read, readiness read, idempotent retry, and idempotency drift detection.

## Vocabulary

Status:

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

Severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Category:

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

Event action:

- `created`
- `ref_attached`
- `item_added`
- `ready_for_review`
- `review_started`
- `blocked`
- `approved`
- `approved_with_limitations`
- `rejected`
- `superseded`
- `cancelled`
- `aaf_request_attached`
- `aaf_decision_attached`

## Required Refs

The service requires and records:

- migration
- client
- site
- content approval
- AAF content approval decision
- improved candidate site version
- improved runtime artifact
- improved version review
- proposal plan
- proposal approval
- implementation authorization
- improvement execution attempt
- selected recommendations
- client approval and AAF client approval decision when policy requires client approval
- domain readiness placeholder before approval
- billing/hosting entitlement placeholder before approval
- rollback readiness placeholder before approval
- publish target placeholder before approval
- launch checklist refs where supplied
- limitations where present

## AAF Ref Behavior

MVP-34 does not create AAF approval requests, decisions, evidence packages, policy evaluations, or audit events.

The service stores supplied launch AAF request/decision refs only. It enforces basic exact-scope metadata for launch approval refs:

- scope: `single_site_launch_approval`
- action: `approve_single_site_launch_readiness`
- subject type: `single_site_launch_readiness_review`

Approval and approval-with-limitations require an AAF launch approval decision ref. If a validation-shape object is supplied, the service checks scope, subject type, subject id, decision id, and granted/granted-with-limitations status. Full launch approval AAF bridge/evidence validation is deferred to MVP-35.

## Decision Behavior

Launch approval is blocked before content approval is approved/approved-with-limitations. When policy requires client approval, launch approval is blocked until client approval is approved/approved-with-limitations and has an exact-scope AAF client approval decision ref.

Approval/approval-with-limitations requires:

- exact-scope AAF launch approval decision ref
- required canonical workflow refs
- readiness placeholders for domain, billing/hosting, rollback, and publish target
- no unresolved open p0 blocker findings
- no unresolved blocker refs without limitation/exception/accepted limitation

`approved_with_limitations` requires limitations. `blocked`, `rejected`, `cancelled`, and `superseded` are represented distinctly. `approved` and `approved_with_limitations` set readiness-work-ready while keeping publish readiness and publish activation approval separate.

## Transition Behavior

Transition service updates are narrow:

- content approved with no client approval required can move to `launch_approval_required`
- content approved with client approval required moves to `client_approval_required` first
- client approval approved/approved-with-limitations can move to `launch_approval_required`
- launch approval approved/approved-with-limitations allows later domain/billing/publish readiness work to begin
- blocked/rejected blocks readiness work
- cancelled/superseded requires latest launch approval review
- launch approval does not publish, switch active pointer, imply domain readiness, imply billing readiness, or imply publish activation approval

## Read Model Behavior

The read model projects `launchApproval` with:

- latest launch approval id/ref
- status/decision
- content/client approval refs
- AAF request/decision refs
- improved candidate refs
- domain/billing/rollback/publish placeholders
- checklist refs
- finding count and severity/category counts
- unresolved blocker count
- limitations
- readiness-work-ready flag
- publish-readiness-not-granted flag
- next action

Next action behavior:

- no launch approval with ready prerequisites: `start_launch_approval`
- draft: `complete_launch_approval_draft`
- ready_for_review: `review_launch_approval`
- in_review: `complete_launch_approval_review`
- blocked: `resolve_launch_blockers`
- approved: `prepare_domain_billing_publish_readiness`
- approved_with_limitations: `prepare_domain_billing_publish_readiness_with_limitations`
- rejected: `resolve_launch_approval_blockers`
- superseded: `review_latest_launch_approval`
- cancelled: `no_action`

The read model remains derived-only, non-enforcing, and non-mutating.

## Boundaries

Domain/billing/publish boundary:

- Launch approval stores readiness placeholders and can set readiness-work-ready.
- It does not execute DNS/domain work, create subscriptions, activate hosting, create publish targets, approve publish activation, publish, or call providers.

Runtime mutation boundary:

- Launch approval does not mutate runtime artifacts.
- Launch approval does not mutate site versions.
- Launch approval does not switch active pointers.
- Launch approval does not expose public runtime routes.

## Idempotency Strategy

Header/refs/events/items/supersessions use idempotency keys. Inserts reuse existing rows on identical semantic payloads and throw `SingleSiteIdempotencyConflictError` on drift. Workflow create/reuse also uses a semantic watermark across canonical refs so retries reuse the same launch approval workflow for the same migration/content/client/improved candidate scope.

## Validation

Unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-service.test.ts` passed, 5/5.

Integration tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-service.integration.test.ts` passed, 1/1, with disposable PostgreSQL and Docker cleanup assertion.

Affected tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.test.ts apps/platform/gnr8/single-site/content-approval-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts` passed, 23/23.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.integration.test.ts apps/platform/gnr8/single-site/content-approval-service.integration.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts` passed, 3/3.

Type/static validation:

- Focused no-emit validation with a temporary platform tsconfig covering changed single-site files passed.
- Full `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false` was attempted and failed on pre-existing unrelated repository-wide type errors; MVP-34-specific errors from the first run were fixed and focused no-emit passed.

SQL/disposable DB validation:

- The launch approval migration applied in disposable PostgreSQL as part of the integration test.
- RLS was verified enabled for all five launch approval tables.
- Append-only refs/events behavior was verified by rejected update/delete attempts.
- Docker cleanup check passed with no leftover named container.

Guardrails:

- Runtime artifact/site version mutation flags remain false.
- Active pointer mutation flag remains false.
- Publish activation approval remains false.
- Publish readiness remains explicitly not granted.
- Forbidden migration refs for active pointer, publish event, domain binding, subscription, hosting entitlement, billing account, and Stripe subscription remained absent in the launch integration test.

External provider non-call confirmation:

- No production Supabase, staging Supabase, Vercel, Openprovider, DNS/registrar, Stripe, AI provider, or external provider calls were added or invoked.

Runtime/public behavior impact:

- No UI, API route, server action, worker, client portal, Command Center, Ops Inbox, public runtime route, runtime artifact, site version, active pointer, or publish behavior changed.

## Issues Found

- Launch approval persistence and service did not exist before MVP-34.
- The existing transition path still allowed approval-to-readiness jumps; MVP-34 narrowed it to require launch approval first.
- Full launch approval AAF bridge/evidence validation is intentionally not implemented in MVP-34.

## Residual Risks

- Publish-ready transition still has legacy prerequisite assumptions and should be revisited when domain/billing/publish readiness architecture is implemented.
- Launch AAF request/decision truth is only ref-shape checked in MVP-34. MVP-35 should add exact-scope AAF bridge/evidence validation.
- Domain, billing/hosting, rollback, and publish target refs are placeholders only; their canonical readiness truth remains future work.

## Acceptance

MVP-34 is safe to accept for launch approval persistence and server-only service core.

Launch approval AAF bridge/evidence validation may begin next. Domain/billing readiness architecture may also begin next, but should keep publish activation approval separate.

Recommended next milestone: MVP-35 launch approval AAF bridge/evidence validation, followed by domain/billing/publish readiness architecture.

## Git

No commit or push was performed.
