# GNR8 Single-Site Content Approval Persistence And Service Closeout

Phase: MVP-28
Date: 2026-08-03
Scope: canonical persistence, server-only service core, transition/read-model projection, focused tests, and documentation for single-site content approval.

## Result

MVP-28 implemented the single-site content approval persistence and server-only service core. Content approval is now a canonical workflow over the accepted improved candidate version. It records required refs, AAF request/decision refs supplied by callers, evidence refs, findings, limitations, not-applied recommendation exceptions, status, decision, idempotency, and read-model projection.

It does not implement UI/API routes, content editing, client approval, launch approval, publish activation approval, active pointer mutation, public runtime publication, runtime artifact/site version mutation, billing, domain/DNS readiness, external providers, AI calls, or Generated Proposal Bundles.

## Files Reviewed

- `docs/architecture/gnr8-single-site-content-approval-source-of-truth-design.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-db-verification-closeout.md`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`
- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.test.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name:

- `20260803143000_single_site_content_approval_core.sql`

Tables created:

- `gnr8_single_site_content_approvals`
- `gnr8_single_site_content_approval_refs`
- `gnr8_single_site_content_approval_items`
- `gnr8_single_site_content_approval_events`
- `gnr8_single_site_content_approval_supersessions`

The migration is additive, enables RLS on all new tables, adds no grants and no policies, preserves refs/events/supersessions as append-only with the existing single-site append-only trigger, keeps bounded mutable workflow header/items, uses durable source refs, validates JSONB object/array shapes, constrains vocabulary, records idempotency keys, and prevents runtime/client/launch/publish mutation flags from becoming true.

## Service

Service location:

- `apps/platform/gnr8/single-site/content-approval-service.ts`

The service is guarded by `import "server-only"` and supports:

- create or reuse content approval workflow records
- attach improved candidate, improved version review, proposal, authorization, execution, source evidence, clone, selected recommendation, AAF, evidence, snapshot, coverage, caveat, limitation, and not-applied recommendation refs
- add findings/items
- mark ready for review
- start review
- request changes
- approve
- approve with limitations
- reject
- cancel
- supersede
- read latest content approval for a migration
- read later client/launch readiness
- idempotent retry and idempotency drift detection

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

- `content_accuracy`
- `copy_quality`
- `metadata`
- `seo`
- `aeo`
- `accessibility`
- `legal_compliance`
- `brand_voice`
- `cta`
- `internal_links`
- `structured_data`
- `translation_or_locale`
- `limitation`
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
- improved version review
- improved candidate site version
- improved runtime artifact
- proposal plan
- proposal approval
- implementation authorization
- improvement execution attempt
- selected recommendations
- source evidence review
- clone review
- clone site version
- clone runtime artifact
- limitations where present

Optional/evidence refs include AAF request/decision, evidence packages, rendered snapshots, content snapshots, metadata snapshots, recommendation coverage, SEO/AEO/accessibility/legal caveats, operator notes, and unresolved/not-applied recommendation refs.

## AAF Ref Behavior

MVP-28 does not create AAF approval requests, decisions, evidence packages, policy evaluations, or audit events. It stores supplied AAF refs only.

The service validates basic exact-scope shape when AAF refs are supplied:

- scope: `single_site_content_approval`
- action: `approve_single_site_content`
- subject type: `single_site_improved_version_review`

Approval and approval-with-limitations require an AAF content approval decision ref. Full AAF bridge/evidence validation is deferred to MVP-29.

## Decision Behavior

- `approved` marks content approval ready and allows a later client/launch approval workflow to begin separately.
- `approved_with_limitations` does the same while requiring limitations.
- `changes_requested` marks content revision required and blocks later readiness.
- `rejected` blocks later readiness.
- `cancelled` blocks later readiness and projects no action.
- `superseded` records supersession and requires the latest content approval.

Approval is blocked before the improved version review is `accepted` or `accepted_with_limitations`, without improved candidate refs, without improved version review refs, without exact-scope AAF decision ref, with unresolved p0 blockers, or when required not-applied recommendations lack a limitation/exception.

## Transition Behavior

The content approval service moves accepted improved review workflows to `content_review_required` when needed. Approved or approved-with-limitations content approval may move the coarse migration state to `content_approved`.

The transition service now verifies approved content approval workflow truth before `content_approved` and before later `publish_ready` checks. Content approval remains distinct from client approval, launch approval, publish activation approval, domain readiness, subscription/hosting readiness, and publish readiness.

## Read Model Behavior

The read model projects `contentApproval` with:

- latest content approval id/ref
- status and decision
- improved candidate refs
- improved version review refs
- AAF request/decision refs
- evidence refs
- finding count
- counts by severity/category
- unresolved blocker count
- limitations
- content approval readiness
- later client/launch readiness flag
- next action

Next action mapping:

- improved review accepted and no content approval: `start_content_approval`
- `draft`: `complete_content_approval_draft`
- `ready_for_review`: `review_content_approval`
- `in_review`: `complete_content_approval_review`
- `changes_requested`: `revise_content`
- `approved`: `prepare_client_or_launch_approval`
- `approved_with_limitations`: `prepare_client_or_launch_approval_with_limitations`
- `rejected`: `resolve_content_blockers`
- `superseded`: `review_latest_content_approval`
- `cancelled`: `no_action`

Projection remains derived-only, non-enforcing, and non-mutating.

## Boundaries

Client/launch/publish boundary:

- content approval does not grant client approval
- content approval does not grant launch approval
- content approval does not grant publish activation approval
- content approval does not publish
- content approval does not prepare domain/DNS/billing/hosting readiness by itself

Runtime mutation boundary:

- no runtime artifacts are mutated
- no runtime site versions are mutated
- no active pointer is changed
- no content overrides, publish events, rollback events, public runtime routes, worker paths, provider paths, domain/DNS paths, billing paths, Stripe, Vercel, Openprovider, or AI/provider behavior is invoked

## Idempotency Strategy

The service uses idempotency keys on content approval headers, refs, items, events, and supersessions. Replays with identical semantic payloads reuse existing rows/events. Replays with semantic drift throw `SingleSiteIdempotencyConflictError`.

Semantic content approval uniqueness is based on migration id, improved version review id, improved candidate site version ref, improved runtime artifact ref, and supersession root.

## Validation

Unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/content-approval-service.test.ts`
- Result: passed, 5 tests.

Disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/content-approval-service.integration.test.ts`
- Result: passed, 1 test.

Focused affected regression set:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/content-approval-service.test.ts gnr8/single-site/content-approval-service.integration.test.ts gnr8/single-site/improved-version-review-service.test.ts gnr8/single-site/single-site-state-transition-service.test.ts gnr8/single-site/single-site-state-read-model.test.ts`
- Result: passed, 24 tests.

MVP-25/read-model disposable regressions:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-version-review-service.integration.test.ts gnr8/single-site/single-site-state-read-model.integration.test.ts`
- Result: passed, 2 tests.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target es2022 --moduleResolution bundler --module esnext gnr8/single-site/content-approval-service.ts gnr8/single-site/content-approval-service.test.ts gnr8/single-site/content-approval-service.integration.test.ts gnr8/single-site/single-site-state-contracts.ts gnr8/single-site/single-site-state-transition-service.ts gnr8/single-site/single-site-state-read-model.ts gnr8/single-site/single-site-state-read-repository.ts`
- Result: passed.

SQL/disposable DB validation:

- The MVP-28 disposable integration applied `20260803143000_single_site_content_approval_core.sql` after the single-site base, clone review, proposal planning, execution, and improved review migrations.
- It verified all five content approval tables exist with RLS enabled.
- It verified append-only refs/events reject update/delete.
- It persisted accepted improved review -> content approval creation -> AAF request/decision ref attach -> finding -> ready/start -> approved.
- It persisted approved-with-limitations.
- It persisted rejected and changes-requested as not ready for later client/launch approval.
- It verified read-model projection of content approval state.
- It verified no forbidden migration refs for active pointer, publish, domain, billing, subscription, hosting, or Stripe were created.

## Guardrails

Guardrail search was run over changed implementation/test/migration files for forbidden runtime artifact/site version mutation, active pointer, public runtime, provider, DNS, Vercel, Openprovider, Stripe, billing, domain, publish, rollback, AI, Generated Proposal Bundle, route, worker, UI, client portal, Command Center, and Ops Inbox changes.

Results were expected boundary strings, existing transition/read-model vocabulary, false-flag assertions, and negative test checks only. No forbidden implementation surface was added.

No production Supabase or staging Supabase instance was called.

## External Provider Non-Call Confirmation

No AI providers, external providers, Vercel, Openprovider, Stripe, DNS providers, registrars, billing systems, domain systems, hosting systems, public runtime routes, publish paths, rollback paths, runtime artifact/site version mutation services, workers, UI/API routes, Command Center actions, Ops Inbox actions, client portal routes, or Generated Proposal Bundle paths were called.

Docker was used only for disposable local PostgreSQL validation. Test cleanup stopped and removed disposable containers.

## Runtime/Public Behavior Impact

No runtime/public serving behavior changes are exposed. There are no new routes, server actions, worker entry points, UI surfaces, Command Center actions, Ops Inbox actions, client portal routes, public runtime routes, provider integrations, billing integrations, domain/DNS integrations, publish integrations, rollback integrations, or active-pointer mutations.

## Issues Found

- Carried-forward improved-review limitations can be descriptive JSON without source record ids. The service was adjusted to preserve those limitations on the header without forcing every limitation into an append-only ref row.
- The first disposable integration fixture used text-shaped AAF decision refs where state events expect UUID-shaped AAF decision ids. The fixture now uses UUID-shaped decision refs.
- The transition unit fake did not expose a raw `query` method. The transition guard now fails closed when content approval table reads are unavailable in such fakes.
- The first sandboxed `tsx` unit run failed with local IPC `listen EPERM`; the same tests passed outside the sandbox.

## Residual Risks

- MVP-28 validates only basic exact-scope AAF ref shape. It does not read or validate full AAF request/decision/evidence truth.
- MVP-28 trusts operator-supplied findings, limitations, evidence refs, and snapshot refs. It does not inspect rendered content or call AI/providers.
- Future content editing/revision workflows must create or govern new candidate/content-change truth, then supersede/reopen content approval rather than mutating approved runtime output.

## Acceptance

MVP-28 is safe to accept as the content approval persistence and server-only service core.

Content approval AAF bridge/evidence validation may begin next. Client/launch approval architecture may begin after preserving this content approval boundary and should not collapse content approval into client, launch, publish activation, domain, DNS, billing, or hosting readiness.

Recommended next milestone: MVP-29 single-site content approval AAF bridge/evidence validation, still without UI/API/public runtime/publish/client-launch implementation.

## Git Status Summary

Expected changed files:

- modified `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- modified `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- modified `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- modified `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- added `apps/platform/gnr8/single-site/content-approval-service.ts`
- added `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- added `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- added `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- added `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.
