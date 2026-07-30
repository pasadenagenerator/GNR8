# GNR8 Single-Site Improvement Proposal Planning Core Closeout

Date: 2026-07-30
Phase: MVP-15 implementation
Scope: Canonical single-site improvement proposal planning persistence and server-only service core after clone review/fidelity acceptance

MVP-15 implemented additive proposal planning persistence, a server-only service core, focused repository/read-model support, focused tests, and documentation. It did not implement AI proposal generation, Generated Proposal Bundles, runtime artifact/version mutation, improved version creation, content editing, billing/subscription/hosting activation, domain/DNS readiness, publish, rollback, UI, API routes, server actions, Command Center actions, Ops Inbox actions, client portal routes, public runtime routes, commit, or push behavior.

## Files Reviewed

- `docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-transition-contract.md`
- `docs/product/gnr8-single-site-improvement-proposal-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/clone-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/clone-review-service.test.ts`
- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name:

- `20260730143000_single_site_improvement_proposal_planning_core.sql`

Tables created:

- `gnr8_single_site_improvement_proposal_plans`
- `gnr8_single_site_improvement_proposal_refs`
- `gnr8_single_site_improvement_proposal_recommendations`
- `gnr8_single_site_improvement_proposal_findings`
- `gnr8_single_site_improvement_proposal_events`
- `gnr8_single_site_improvement_proposal_supersessions`

SQL behavior:

- Additive only.
- RLS enabled on every new table.
- No broad grants.
- No broad policies.
- Append-only triggers on refs, events, and supersessions.
- Bounded mutable plan, recommendation, and finding rows for draft/review lifecycle changes.
- Check constraints for status/category/risk/impact/effort/event/ref vocabularies.
- JSONB object/array shape checks.
- Idempotency uniqueness.
- Semantic uniqueness for proposal plans and proposal refs.
- Internal FKs to single-site migrations, clone reviews, source evidence reviews, and proposal lineage where safe.

## Service Core

Service location:

- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`

Supported operations:

- create or reuse proposal plan
- attach clone review refs
- attach source evidence refs
- attach fidelity finding refs
- add findings
- add improvement recommendations
- mark ready for review
- start review
- request changes
- approve
- approve with limitations
- reject
- supersede
- cancel
- attach implementation authorization ref
- read latest proposal plan for migration
- idempotent retry with drift detection

The service is server-only and uses the existing single-site writer repository transaction pattern.

## Vocabulary

Proposal plan statuses:

`not_started`, `planning_required`, `draft`, `ready_for_review`, `in_review`, `changes_requested`, `approved`, `approved_with_limitations`, `rejected`, `superseded`, `cancelled`.

Improvement categories:

`content_clarity`, `visual_design`, `brand_consistency`, `conversion`, `seo`, `aeo`, `accessibility`, `performance`, `mobile_responsive`, `information_architecture`, `trust_credibility`, `forms_and_leads`, `analytics_measurement`, `technical_cleanup`, `legal_or_compliance`, `unknown_or_manual`.

Risk:

`low`, `medium`, `high`, `unknown`.

Impact:

`low`, `medium`, `high`, `unknown`.

Effort:

`small`, `medium`, `large`, `unknown`.

Decision/event actions:

`created`, `recommendation_added`, `finding_added`, `ready_for_review`, `review_started`, `changes_requested`, `approved`, `approved_with_limitations`, `rejected`, `superseded`, `cancelled`, `implementation_authorization_attached`.

## Boundaries

Clone review dependency:

- Proposal planning requires the latest clone review to be `accepted` or `accepted_with_limitations`.
- The clone review must have proposal planning allowed.
- Required clone refs must exist: clone site version ref, runtime artifact ref, and source evidence review ref.
- `retry_required`, `rejected`, and `superseded` clone reviews block proposal planning unless a later latest clone review is accepted.

Accepted-with-limitations behavior:

- Clone review limitations are carried into the proposal plan limitations.
- `approved_with_limitations` requires explicit proposal limitations.
- Limitations remain visible in read-model projection and approval evidence refs.

Proposal approval boundary:

- Proposal approval records planning approval only.
- Approval requires recommendations.
- Approval with unresolved high-risk blockers requires an explicit limitation or decision record.
- Proposal approval does not authorize implementation by default.
- Proposal approval does not approve content, client acceptance, launch, publish activation, billing, DNS/domain, rollback, or runtime mutation.

Implementation authorization boundary:

- Implementation authorization can only be attached after `approved` or `approved_with_limitations`.
- Implementation authorization is recorded as a separate ref and event.
- The transition service now blocks `improvement_implementation_started` unless the latest proposal plan is approved or approved with limitations and has implementation authorization attached.
- Authorization does not implement changes or create runtime versions.

Rejection/supersession/cancellation behavior:

- `rejected`, `superseded`, and `cancelled` are terminal for the current plan.
- Supersession creates append-only lineage in `gnr8_single_site_improvement_proposal_supersessions`.
- Historical plan decisions are not rewritten to appear current.

Proposal bundle and AI boundary:

- No AI providers are called.
- AI/provider refs are allowed only as evidence-only future refs.
- Generated Proposal Bundles are not created, imported, or treated as canonical truth.
- AI output, bundles, previews, thumbnails, chat transcripts, Command Center, and Ops Inbox remain non-authoritative for proposal truth.

Runtime, publish, domain, and billing boundary:

- No runtime artifact rows are mutated.
- No runtime site versions are created or updated.
- No active pointer mutation occurs.
- No improved runtime versions are created.
- No content editing is implemented.
- No publish, rollback, domain/DNS, billing, subscription, hosting entitlement, Vercel, Openprovider, Stripe, Supabase production/staging, or external provider calls are made.

## Read Model Projection

The read model now includes proposal planning projection:

- latest proposal plan id
- proposal status
- proposal decision
- recommendation count
- findings count
- recommendations by category
- risk, impact, and effort summaries
- limitations
- approval refs
- implementation authorization refs and readiness
- proposal readiness flags
- proposal-specific next action

Next-action mapping:

- accepted clone with no proposal plan: `start_improvement_proposal_planning`
- `draft`: `complete_proposal_draft`
- `ready_for_review`: `review_improvement_proposal`
- `in_review`: `complete_proposal_review`
- `changes_requested`: `revise_improvement_proposal`
- `approved`: `request_implementation_authorization`
- `approved_with_limitations`: `request_implementation_authorization_with_limitations`
- `rejected`: `resolve_or_cancel_proposal`
- `superseded`: `review_latest_proposal`
- `cancelled`: `no_action_required`

Projection remains derived-only:

- `derivedOnly: true`
- `mutatesSourceTruth: false`
- `nonEnforcing: true`

## Idempotency Strategy

- Plan, ref, event, recommendation, finding, and supersession writes include idempotency keys.
- Append-only inserts reuse exact semantic payloads on retry.
- Recommendation and finding upserts detect idempotency drift before bounded mutation.
- Proposal event replay compares target decision payload, actor, refs, limitations, metadata, privacy, and retention.
- Semantic uniqueness prevents duplicate plan/ref source-truth records.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/clone-review-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- Focused TypeScript no-emit validation for changed single-site files and focused tests.

Passed:

- `git diff --check`
- `rg -n "[ \t]$" ...` across changed/new files returned no trailing whitespace matches.
- Guardrail search for forbidden AI/runtime/provider/proposal-bundle imports/calls in MVP-15 changed code returned no matches.
- Guardrail search for direct `gnr8_single_site_*` writes outside the approved writer/repository/service layer, migrations, and disposable integration fixtures returned no matches.
- Docker cleanup check for `gnr8-single-site` disposable containers returned no running containers.

## Issues Found

- The first disposable PostgreSQL run found duplicate semantic insertion of a clone-review migration ref. The proposal service no longer inserts a duplicate migration ref; proposal-specific refs are written to the new proposal refs table.
- Existing read-model test snapshots did not include proposal arrays. The read model now treats absent proposal arrays as empty for compatibility.
- Existing clone/read-model assertions expected pre-MVP-15 proposal next-action labels. Focused tests were updated to the MVP-15 action vocabulary.
- Older disposable read-model fixtures do not apply the MVP-15 migration. The read repository now checks `to_regclass` before querying proposal tables and projects `not_started` when the proposal table family is absent.

## Residual Risks

- The persistence model is intentionally minimal and does not yet integrate AAF table validation; approval and implementation authorization refs are durable refs only.
- Recommendation/finding mutability is bounded by service policy, but database constraints do not freeze rows by status without service participation.
- No UI/API/operator workflow invokes this service yet.
- Full platform typecheck may still be affected by unrelated repository drift; MVP-15 relies on focused no-emit validation for changed files.

## Acceptance

MVP-15 is safe to accept.

Implementation authorization planning may begin next only as a separate approval-scope milestone. Improvement execution planning may begin only after implementation authorization remains distinct from proposal approval and still avoids AI-to-runtime shortcuts.

Recommended next milestone:

- MVP-16: single-site implementation authorization persistence/service boundary, limited to authorization truth and approved recommendation scope selection, with no improvement execution.

## Git Status Summary

Modified:

- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Untracked:

- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`

No commit or push was performed.
