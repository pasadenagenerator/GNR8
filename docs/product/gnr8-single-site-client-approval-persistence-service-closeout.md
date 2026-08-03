# GNR8 Single-Site Client Approval Persistence And Service Closeout

Phase: MVP-32
Date: 2026-08-03
Scope: canonical persistence, server-only service core, transition/read-model projection, focused tests, and documentation for single-site client approval.

## Result

MVP-32 implemented the single-site client approval persistence and server-only service core. Client approval is now a canonical workflow downstream of approved or approved-with-limitations content approval. It records required refs, supplied AAF request/decision refs, client-facing evidence refs, findings, limitations, deferred/not-applied recommendation refs, reviewer/representative refs, status, decision, idempotency, and read-model projection.

It does not implement client portal UI, email/Slack/Teams approval, launch approval persistence/service, publish activation approval, publishing, active pointer mutation, runtime artifact/site-version mutation, billing, domain/DNS readiness, external providers, AI calls, routes, server actions, workers, Command Center actions, Ops Inbox actions, or Generated Proposal Bundles.

## Files Reviewed

- `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`
- `docs/product/gnr8-single-site-client-launch-approval-aaf-contracts-closeout.md`
- `docs/product/gnr8-single-site-client-launch-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-service.test.ts`
- `apps/platform/gnr8/single-site/client-approval-service.integration.test.ts`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name:

- `20260803190000_single_site_client_approval_core.sql`

Tables created:

- `gnr8_single_site_client_approvals`
- `gnr8_single_site_client_approval_refs`
- `gnr8_single_site_client_approval_items`
- `gnr8_single_site_client_approval_events`
- `gnr8_single_site_client_approval_supersessions`

The migration is additive, enables RLS on all new tables, adds no grants and no policies, preserves refs/events/supersessions as append-only with the existing single-site append-only trigger, keeps bounded mutable workflow header/items, uses durable refs, validates JSONB object/array shapes, constrains vocabulary, records idempotency keys, and prevents launch/publish/runtime mutation flags from becoming true.

It also extends existing single-site state/ref CHECK constraints to admit `client_approval_required` and the `client_approval` migration ref role.

## Service

Service location:

- `apps/platform/gnr8/single-site/client-approval-service.ts`

The service imports `server-only` and supports create/reuse, ref attachment, AAF request/decision ref attachment, findings/items, ready/start review, changes requested, approval, approval with limitations, rejection, cancellation, supersession, latest-read, launch-readiness read, idempotent retry, and idempotency drift detection.

## Vocabulary

Status:

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

Severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Category:

- `business_acceptance`
- `content_acceptance`
- `brand_acceptance`
- `limitation_acceptance`
- `deferred_recommendation`
- `legal_or_compliance`
- `manual_note`
- `unknown_or_manual`

Event action:

- `created`
- `ref_attached`
- `item_added`
- `ready_for_review`
- `review_started`
- `changes_requested`
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
- limitations where present
- reviewer identity
- reviewer representative role

Optional/evidence refs include AAF client approval request, AAF client approval decision, evidence packages, rendered snapshots, client-facing summaries, deferred/not-applied recommendation refs, operator notes, and external references.

## AAF Ref Behavior

MVP-32 does not create AAF approval requests, decisions, evidence packages, policy evaluations, or audit events.

The service stores supplied client AAF request/decision refs only. It enforces basic exact-scope metadata for client approval refs:

- scope: `single_site_client_approval`
- action: `approve_single_site_client_acceptance`
- subject type: `single_site_improved_candidate_client_acceptance`

Approval and approval-with-limitations require an AAF client approval decision ref. If a validation-shape object is supplied, the service checks scope, subject type, subject id, decision id, and allowed granted status. Full AAF bridge/evidence validation is deferred.

## Decision Behavior

- `approved` marks client approval ready, sets `client_approval_granted = true`, and sets `launch_approval_ready = true` for a later phase.
- `approved_with_limitations` does the same while requiring limitations.
- `changes_requested` blocks launch readiness and projects revision for client approval.
- `rejected` blocks launch readiness.
- `cancelled` blocks launch readiness and projects no action.
- `superseded` records supersession and requires the latest client approval.

Approval is blocked before content approval is approved/approved-with-limitations, without exact-scope AAF content approval decision ref, without improved candidate refs, without reviewer identity when required, without AAF client approval decision ref, with unresolved p0 blockers, or when required deferred recommendations lack a limitation/exception.

## Transition Behavior

Content approval approved/approved-with-limitations can move the coarse migration state to `client_approval_required` when client approval is required. Client approval approval/approval-with-limitations projects launch approval readiness for a later phase but does not create launch approval truth. Changes requested, rejected, cancelled, and superseded client approvals block later launch readiness.

Client approval does not publish, does not switch active pointers, does not mutate runtime artifacts or site versions, and does not imply launch approval or publish activation approval.

## Read Model Behavior

The read model now projects `clientApproval` with latest id/ref, status/decision, content approval refs, AAF refs, improved candidate refs, reviewer/representative refs, client-facing summary refs, findings count, severity/category counts, unresolved blocker count, limitations, deferred/not-applied recommendation refs, client approval readiness, launch approval readiness for a later phase, and next action.

Next action mapping:

- content approval approved, no client approval: `start_client_approval`
- `draft`: `complete_client_approval_draft`
- `ready_for_review`: `review_client_approval`
- `in_review`: `complete_client_approval_review`
- `changes_requested`: `revise_for_client_approval`
- `approved`: `prepare_launch_approval`
- `approved_with_limitations`: `prepare_launch_approval_with_limitations`
- `rejected`: `resolve_client_approval_blockers`
- `superseded`: `review_latest_client_approval`
- `cancelled`: `no_action`

Projection remains derived-only, non-enforcing, and non-mutating.

## Validation

Unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.test.ts`: passed, 5 tests.

Disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.integration.test.ts`: passed, 1 test.

Affected adjacent tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-service.test.ts apps/platform/gnr8/single-site/content-approval-service.integration.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`: passed, 20 tests.

Type/static validation:

- Focused TypeScript no-emit validation for changed single-site files passed.
- `git diff --check`: passed.
- trailing whitespace check across changed files: passed.
- Docker cleanup check after disposable PostgreSQL integration: passed.

SQL/disposable DB validation:

- The disposable PostgreSQL integration applied the migration chain through `20260803190000_single_site_client_approval_core.sql`, verified RLS enabled on all new tables, verified append-only refs/events, persisted refs/findings/approval, projected client approval read-model state, and verified no forbidden migration refs for active pointer, publish, domain, subscription, hosting entitlement, billing account, or Stripe subscription.

External provider non-call confirmation:

- No production/staging Supabase, Vercel, Openprovider, DNS provider, registrar, Stripe, AI provider, external provider, publish, route, worker, Command Center, Ops Inbox, client portal, or public runtime surfaces were called.
- Guardrail search found only existing/ref vocabulary mentions, a `.example.test` fixture URL, boundary documentation, and negative assertions proving forbidden refs were absent.

## Boundaries

Launch/publish boundary:

- client approval does not grant launch approval
- client approval does not grant publish activation approval
- client approval does not publish
- client approval does not create launch approval persistence or service behavior

Runtime mutation boundary:

- no runtime artifacts are mutated
- no runtime site versions are mutated
- no active pointer is changed
- no content overrides, publish events, rollback events, public runtime routes, worker paths, provider paths, domain/DNS paths, billing paths, Stripe, Vercel, Openprovider, or AI/provider behavior is invoked

## Idempotency Strategy

The service uses idempotency keys on client approval headers, refs, items, events, and supersessions. Replays with identical semantic payloads reuse existing rows/events. Replays with semantic drift throw `SingleSiteIdempotencyConflictError`.

Semantic client approval uniqueness is based on migration id, content approval id, improved version review id, improved candidate site version ref, improved runtime artifact ref, and supersession root.

## Issues And Risks

Issues found:

- Client approval persistence did not exist before MVP-32.
- Client approval service did not exist before MVP-32.
- Full client approval AAF bridge/evidence validation is not implemented in this phase by design.

Residual risks:

- Client AAF request/decision refs are shape-checked and persisted, but full AAF read-only validation is deferred to MVP-33 or MVP-32A.
- Launch approval persistence/service core remains future work and should consume `launchApprovalReady` without treating it as launch approval truth.

## Acceptance

MVP-32 is safe to accept.

Client approval AAF bridge/evidence validation may begin next, or launch approval persistence/service core may begin next if it consumes client approval strictly as prerequisite truth and remains separate from publish activation.

Recommended next milestone:

- MVP-33 Single-Site Client Approval AAF Bridge And Evidence Validation.

Git status summary:

- Added client approval SQL migration, server-only service, unit test, integration test, and closeout.
- Updated single-site contracts, transition service, read repository, read model, and canonical index.

No commit or push was performed.
