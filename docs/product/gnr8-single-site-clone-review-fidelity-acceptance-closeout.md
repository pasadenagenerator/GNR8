# GNR8 Single-Site Clone Review Fidelity Acceptance Closeout

Date: 2026-07-30
Phase: MVP-13 single-site clone review and fidelity acceptance core
Scope: Server-only clone review persistence, writer/repository/service core, transition gate enforcement, read-model projection, focused tests, disposable local PostgreSQL integration, and documentation only.

MVP-13 does not implement proposal generation, improvement generation, AI redesign/regeneration, billing/subscription/hosting activation, domain/DNS readiness changes, publish, rollback, UI, API routes, server actions, Command Center actions, Ops Inbox actions, client portal routes, public runtime routes, workers, provider calls, external calls, production/staging Supabase calls, commits, or pushes.

## Files Reviewed

- MVP-2: `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- MVP-3: `docs/product/gnr8-single-site-end-to-end-gap-audit.md`, `docs/product/gnr8-single-site-end-to-end-gap-audit-closeout.md`
- MVP-4: `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`
- MVP-5: `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`, `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- MVP-6: `apps/platform/gnr8/single-site/single-site-state-contracts.ts`, `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`, `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`, `apps/platform/gnr8/single-site/source-evidence-review-service.ts`, `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- MVP-7: `apps/platform/gnr8/single-site/single-site-state-read-model.ts`, `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`, `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- MVP-9: `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`, `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- MVP-11: `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`, `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- MVP-12 and verify: `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`, `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`, `docs/product/gnr8-single-site-real-clone-executor-closeout.md`, `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/clone-review-service.ts`
- `apps/platform/gnr8/single-site/clone-review-service.test.ts`
- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`
- `docs/product/gnr8-single-site-clone-review-fidelity-acceptance-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- focused single-site tests under `apps/platform/gnr8/single-site/**`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Persistence Strategy

Existing MVP-5 migration refs, state events, stage summaries, and blockers are reused for cross-stage state/ref projection, but source evidence review tables are not reused. They are explicitly source-capture truth and would blur source evidence acceptance with clone fidelity acceptance.

A minimal additive SQL migration was needed: `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`.

New canonical clone review tables:

- `gnr8_single_site_clone_reviews`
- `gnr8_single_site_clone_review_refs`
- `gnr8_single_site_clone_review_items`
- `gnr8_single_site_clone_review_events`

The migration is additive, uses text vocabulary checks, JSONB object/array shape checks, idempotency uniqueness, semantic ref uniqueness, append-only review refs/events, bounded mutable review headers/items, RLS enabled, no broad grants, and no broad policies.

## Service Location

Clone review service:

- `apps/platform/gnr8/single-site/clone-review-service.ts`

It is server-only and uses the MVP-6 writer/repository transaction pattern.

## Vocabulary

Clone review statuses:

`draft`, `ready_for_review`, `in_review`, `accepted`, `accepted_with_limitations`, `retry_required`, `rejected`, `superseded`

Clone review decisions:

`accept`, `accept_with_limitations`, `retry_clone`, `reject_clone`, `supersede`

Fidelity severity:

`p0_blocker`, `p1_major`, `p2_minor`, `p3_note`

Fidelity categories:

`layout`, `content`, `image`, `asset`, `font`, `color`, `spacing`, `responsive`, `interaction`, `seo_metadata`, `accessibility`, `performance`, `unknown_or_manual`

## Required Clone Refs

Acceptance requires stable clone review refs for:

- clone site version ref: `runtime_site_version_clone`
- runtime artifact ref: `runtime_artifact_clone`
- source evidence review ref: `source_evidence_review`

Optional refs include clone generation event/ref, source evidence refs, screenshots, DOM, assets, fidelity findings, limitations, and external references.

## Decision Behavior

- `accepted`: clone can proceed toward improvement proposal planning in a later phase.
- `accepted_with_limitations`: clone can proceed toward improvement proposal planning with limitations carried forward.
- `retry_required`: proposal planning remains blocked and the next action is clone retry.
- `rejected`: proposal planning remains blocked and clone blockers must be resolved.
- `superseded`: proposal planning remains blocked unless a newer accepted review replaces it.

Clone acceptance is not publish approval, client approval, improvement approval, proposal approval, content approval, launch approval, or source evidence approval.

## Transition Behavior

Creating clone review is allowed after `clone_generation_completed` or while `clone_review_required`. If creation starts from `clone_generation_completed`, the service records `clone_review_required`.

`clone_review_required -> improvement_proposal_started` remains the existing post-clone transition, but now the transition service requires the latest clone review to be `accepted` or `accepted_with_limitations`, `proposal_planning_allowed`, required review refs, and a `clone_review` migration ref.

No new post-clone accepted state was added. Accepted clone review truth is represented in clone review persistence and read-model projection. Retry/reject record clone review truth and block proposal readiness; they do not trigger proposal, publish, or revision orchestration in this phase.

Terminal failed, cancelled, or closed migrations cannot accept clone review.

## Read Model Projection

MVP-7 now projects:

- latest clone review id/ref
- clone review status and decision
- clone site version, runtime artifact, source evidence review, and clone generation refs
- fidelity summary
- finding counts by severity and category
- open p0/p1 finding count
- limitations, warnings, blockers
- clone acceptance readiness
- proposal planning allowed
- clone review events and refs

Next action behavior:

- no clone review: `review_clone`
- draft/ready/in-review: `complete_clone_review`
- accepted: `prepare_improvement_proposal`
- accepted_with_limitations: `prepare_improvement_proposal_with_limitations`
- retry_required: `retry_clone_generation`
- rejected: `resolve_clone_blockers`
- superseded: `review_latest_clone`

The read model remains `derivedOnly: true`, `mutatesSourceTruth: false`, and `nonEnforcing: true`.

## Idempotency Strategy

Creation reuses existing reviews by semantic migration/clone-version/runtime-artifact/source-evidence-review refs and idempotency key. Inserts compare semantic fields and throw `SingleSiteIdempotencyConflictError` on drift.

Decision events are append-only and idempotent. Replaying the same idempotency key with the same semantic decision returns the existing event/review. Replaying with changed semantic decision details throws drift conflict.

## Boundary Confirmation

Proposal boundary: MVP-13 only sets `proposal_planning_allowed` and transition/read-model readiness. It does not create proposal rows, proposal artifacts, proposal bundles, proposal approvals, or improvement work.

Publish/client/domain/billing boundary: MVP-13 does not mutate active pointers, public runtime, publish state, publish targets, rollback state, domain bindings, DNS/Openprovider/Vercel, billing, Stripe, subscriptions, hosting entitlement, client approvals, or provider jobs.

## Tests And Validation

Passed unit/static tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/clone-review-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- Result: 22 tests passed.

Passed disposable DB integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- Result: 1 test passed.

Passed MVP-7/MVP-11/MVP-12 focused validations:

- Clone review integration + MVP-7 read model integration + MVP-11 unit + MVP-12 unit batch: clone review, read model, and MVP-11 passed; MVP-12 unit failed only when invoked from repo root due platform `@/*` alias resolution.
- Rerun from `apps/platform`: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.test.ts`
- Result: 8 tests passed.
- MVP-11/MVP-12 disposable integration from `apps/platform`: `single-site-clone-start-orchestrator.integration.test.ts` and `single-site-real-clone-executor.integration.test.ts`
- Result: 2 tests passed.
- Capture/read and clone generation gate disposable integrations: 2 tests passed.

Type/static validation:

- Full `apps/platform` typecheck was attempted and remains blocked by unrelated existing drift outside this MVP-13 scope.
- Focused no-emit validation passed with a temporary `apps/platform/tmp-mvp13-single-site-tsconfig.json`; the temporary file was removed afterward.

SQL validation:

- Static SQL test assertions are included in `clone-review-service.test.ts`.
- Disposable PostgreSQL integration applied MVP-5 and MVP-13 migrations successfully.

Guardrails:

- `git diff --check` passed.
- trailing whitespace check on changed/new files passed.
- forbidden UI/API/route/worker/public runtime/provider/DNS/Vercel/Openprovider/Stripe/billing/domain/publish/rollback/proposal guardrail search passed for changed files.
- direct `gnr8_single_site_*` write guardrail search passed; direct writes remain inside MVP-6 writer/repository/transition/service core.
- Docker cleanup check found no running `gnr8-single-site` disposable containers.

External provider non-call confirmation: no production/staging Supabase, Vercel, Openprovider, DNS provider, registrar, Stripe, billing provider, AI provider, or other external provider was called.

Runtime/public behavior impact: none. No UI/API/public runtime route, active pointer, publish, domain, billing, worker, or provider behavior was changed.

## Issues Found

- Existing source evidence review tables are not generic enough for clone review without semantic confusion, so a small clone review migration was required.
- Full platform TypeScript still has unrelated historical test/type drift; focused validation was used for changed files.
- Several existing disposable DB tests that use the read repository needed to apply the new clone review migration because the read repository now projects clone review tables.

## Residual Risks

- No visual scoring engine or screenshot comparison automation exists in MVP-13.
- Accepted clone review is represented as review truth plus proposal-readiness gating, not as a new migration state.
- AAF scope validation for clone acceptance is not implemented.
- Proposal generation and improvement planning remain future work and must consume clone review limitations explicitly.

## Acceptance Recommendation

MVP-13 is safe to accept as the canonical server-only clone review and fidelity acceptance core.

Proposal/improvement planning may begin next only as a new milestone that consumes accepted or accepted-with-limitations clone review truth. It must not treat clone acceptance as publish approval, client approval, improvement approval, or source evidence approval.

Recommended next milestone: MVP-14 single-site improvement proposal source truth and proposal readiness boundary, consuming accepted clone review refs and limitations without generating improvements or publishing.

## Git Status Summary

MVP-13 created/updated single-site core files, the additive SQL migration, this closeout, and the canonical index. No commit or push was performed.

## Commands Run

- `rg --files ...`
- `rg -n ...`
- `sed -n ...`
- `git status --short`
- `pnpm exec tsx --test ...`
- `cd apps/platform && pnpm exec tsx --test ...`
- `cd apps/platform && pnpm exec tsc -p tmp-mvp13-single-site-tsconfig.json --noEmit`
- `git diff --check`
- changed-file trailing whitespace and guardrail searches
- disposable local Docker PostgreSQL commands from integration tests

No commit or push was performed.
