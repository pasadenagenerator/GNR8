# GNR8 Single-Site Improved Version Review Acceptance Closeout

Phase: MVP-25
Scope: Server-only improved candidate review and acceptance truth for the single-site migration MVP.

MVP-25 implements the canonical operator review gate after MVP-24 creates a non-published improved candidate runtime site version and artifact. It records review truth only: improved candidate refs, execution attempt refs, proposal and recommendation refs, findings, limitations, decisions, idempotency, and read-model projection. It does not approve content, client launch, launch, publish, domain/DNS, billing, active pointer changes, runtime mutations, providers, AI, UI, API, public runtime, Command Center, Ops Inbox, or client portal behavior.

## Files Reviewed

- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-dry-run-adapter-closeout.md`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`
- `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `apps/platform/gnr8/single-site/clone-review-service.ts`
- `apps/platform/gnr8/single-site/clone-review-service.test.ts`
- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `docs/product/gnr8-single-site-clone-review-fidelity-acceptance-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.test.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Persistence Strategy

MVP-25 uses dedicated improved-version review persistence. Existing MVP-21 execution attempts cleanly represent execution/output truth, but they deliberately do not represent operator acceptance truth. Keeping review decisions in dedicated tables avoids overloading execution attempt status with content-readiness semantics.

SQL migration: `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`

Tables created:

- `gnr8_single_site_improved_version_reviews`
- `gnr8_single_site_improved_version_review_refs`
- `gnr8_single_site_improved_version_review_items`
- `gnr8_single_site_improved_version_review_events`
- `gnr8_single_site_improved_version_review_supersessions`

The migration is additive, enables RLS on all new tables, adds no broad grants or broad policies, makes refs/events/supersessions append-only, keeps bounded mutable header/items, and includes text vocabulary checks, JSONB shape checks, idempotency uniqueness, semantic ref uniqueness, privacy/retention checks, and non-approval/non-runtime-mutation checks.

## Service

Service location: `apps/platform/gnr8/single-site/improved-version-review-service.ts`

The service is server-only and supports:

- create/reuse review;
- attach improved candidate, execution, proposal, recommendation, dry-run, authorization, evidence, and limitation refs;
- add findings/items;
- mark ready/start review;
- accept, accept with limitations, require retry, reject, cancel, supersede;
- read latest review for migration;
- get content-approval readiness;
- idempotent retry and idempotency drift detection.

## Vocabulary

Status:

- `draft`
- `ready_for_review`
- `in_review`
- `accepted`
- `accepted_with_limitations`
- `retry_required`
- `rejected`
- `superseded`
- `cancelled`

Severity:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Category:

- `proposal_alignment`
- `content_accuracy`
- `visual_quality`
- `brand_consistency`
- `seo`
- `aeo`
- `accessibility`
- `performance`
- `responsive`
- `interaction`
- `technical_integrity`
- `limitation`
- `manual_note`
- `unknown_or_manual`

## Required Refs

Required refs recorded by the review core:

- migration
- client
- site
- proposal plan
- proposal approval
- implementation authorization
- execution attempt
- improved candidate site version
- improved runtime artifact
- clone site version
- clone runtime artifact
- selected recommendations
- dry-run planned change set when present
- source evidence review
- limitations where present
- evidence refs where present

## Decision Behavior

- `accepted` allows a later content approval workflow to begin.
- `accepted_with_limitations` allows a later content approval workflow to begin with limitations carried forward.
- `retry_required` blocks content approval readiness and routes to future improvement revision/execution retry.
- `rejected` blocks content approval readiness.
- `superseded` requires reviewing the latest replacement review.
- `cancelled` blocks progression and projects no action in this phase.

Acceptance is blocked when there are unresolved open `p0_blocker` findings, or when required recommendations are marked unapplied without a limitation/exception.

## Transition Behavior

`improvement_implementation_completed` can move to `improved_version_review_required`. `improved_version_review_required` can move to `content_review_required` only when the latest improved-version review is accepted or accepted with limitations and the migration has an improved-version review ref.

This phase does not implement content approval. The transition to `content_review_required` remains a later workflow handoff, not an approval.

## Read Model Behavior

The read model now projects:

- latest improved version review id/ref;
- status/decision;
- reviewed candidate site version ref;
- reviewed runtime artifact ref;
- execution attempt ref;
- proposal alignment summary;
- counts by severity/category;
- unresolved blocker count;
- limitations;
- accepted readiness for content approval;
- next action.

Next action mapping:

- candidate exists, no review: `review_improved_version` or `review_improved_version_with_limitations`
- ready/in review: `complete_improved_version_review`
- accepted: `prepare_content_approval`
- accepted with limitations: `prepare_content_approval_with_limitations`
- retry required: `retry_improvement_execution`
- rejected: `resolve_improved_version_blockers`
- superseded: `review_latest_improved_version`
- cancelled: `no_action`

The read model remains derived-only, non-enforcing, and non-mutating.

## Boundaries

Content approval boundary: improved-version review acceptance is not content approval. It only marks the candidate ready for a later content approval architecture.

Client/launch/publish boundary: acceptance is not client approval, launch approval, publish approval, publish activation approval, domain readiness, DNS readiness, hosting activation, or billing/subscription approval.

Runtime mutation boundary: the review service never mutates runtime artifacts, site versions, active pointers, clone output, published output, public runtime exposure, rollback refs, provider state, billing records, domain/DNS records, or Generated Proposal Bundles.

## Idempotency

Review creation reuses a canonical semantic review for migration + execution attempt + improved candidate site version ref + improved runtime artifact ref. Inserts use idempotency keys. Replays with matching semantic payload reuse existing rows/events. Drift on an existing idempotency key raises `SingleSiteIdempotencyConflictError`.

## Validation Results

Unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-version-review-service.test.ts`
- Result: passed, 5 tests.

Disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-version-review-service.integration.test.ts`
- Result: passed, 1 test.

Focused affected tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-version-review-service.test.ts gnr8/single-site/improved-version-review-service.integration.test.ts gnr8/single-site/improved-candidate-creation-adapter.test.ts gnr8/single-site/improvement-execution-service.test.ts gnr8/single-site/single-site-state-transition-service.test.ts`
- Result: passed, 25 tests.

MVP-24 disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-candidate-creation-adapter.integration.test.ts`
- Result: passed, 1 test.

MVP-21 disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improvement-execution-service.integration.test.ts`
- Result: passed, 1 test.

Type/static validation:

- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --target es2022 --moduleResolution bundler --module esnext gnr8/single-site/improved-version-review-service.ts gnr8/single-site/improved-version-review-service.test.ts gnr8/single-site/improved-version-review-service.integration.test.ts gnr8/single-site/single-site-state-contracts.ts gnr8/single-site/single-site-state-transition-service.ts gnr8/single-site/single-site-state-read-model.ts gnr8/single-site/single-site-state-read-repository.ts`
- Result: passed.

SQL/disposable DB validation:

- The MVP-25 disposable integration applied the new migration after the single-site base, clone review, proposal planning, and execution migrations.
- It verified new tables exist with RLS enabled.
- It verified append-only refs/events reject update/delete.
- It persisted completed execution -> review creation -> finding -> ready/start -> accepted.
- It persisted accepted-with-limitations with limitations.
- It persisted retry-required as not ready for content approval.
- It verified the read model projects accepted review state and next action.
- It verified no active pointer, publish, domain, billing, provider, runtime artifact mutation, or site version mutation flags/refs were produced by review.

## Guardrails And External Providers

No production Supabase or staging Supabase was called. No AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing system, domain system, public runtime, publish path, rollback path, Generated Proposal Bundle path, route, worker, UI, client portal, Command Center, or Ops Inbox behavior was called or implemented.

Docker was used only for disposable local PostgreSQL validation. Containers were stopped in test cleanup.

## Runtime/Public Impact

No UI, API route, server action, Command Center action, Ops Inbox action, client portal route, worker, public runtime route, publish route, provider integration, billing integration, domain/DNS integration, or runtime serving behavior is exposed by MVP-25.

## Issues Found

- Dedicated persistence was required; MVP-21 execution refs/items can cite the improved candidate output but cannot cleanly own operator review/acceptance truth.
- The new SQL migration initially attempted expression uniqueness as a table constraint; it was corrected to a unique index.
- The unit fake initially failed idempotent ref replay; the fake was fixed to match real idempotency lookup behavior.

## Residual Risks

The review service accepts operator-authored findings and limitations; it does not independently inspect rendered pages or call AI/providers to judge quality. Future UI/API/workflow layers must preserve the same non-approval boundary and must not treat `accepted` as content/client/launch/publish approval.

## Acceptance

MVP-25 is safe to accept as the improved version review/acceptance core. Content approval architecture may begin next, using accepted/accepted-with-limitations improved-version review as a prerequisite but not as content approval itself.

Recommended next milestone: MVP-26 single-site content approval architecture/core, still without client launch approval, publish activation, domain/DNS, billing, UI/public exposure, or active pointer mutation.

Git status at closeout: source changes only. No commit or push was performed.
