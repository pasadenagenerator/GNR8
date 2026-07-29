# GNR8 Single-Site State Evidence Writer Core Closeout

Date: 2026-07-29
Phase: MVP-6 writer/repository and transition service core
Scope: Server-only writer repository, transition service, source evidence review service, focused tests, disposable local PostgreSQL integration tests, and documentation only.

MVP-6 did not implement API routes, server actions, UI, capture/import behavior, clone generation behavior, proposal behavior, content editing behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, workers, providers, AI execution, storage behavior, auth behavior, client portal behavior, commit, or push.

## 1. Files Reviewed

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- DDOM/PTT disposable DB persistence and writer tests.

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Final Module Locations

- Contracts: `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- Writer repository: `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- Transition service: `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- Source evidence review service: `apps/platform/gnr8/single-site/source-evidence-review-service.ts`

## 4. Operations Implemented

Migration writer operations:

- create migration header;
- get migration by id;
- get migration by idempotency key;
- update bounded current state/status/ref fields;
- insert state event;
- insert migration refs;
- upsert mutable stage summary;
- upsert mutable blocker;
- insert closeout.

Source evidence operations:

- create source evidence review;
- get review by id;
- update review current status;
- insert review ref;
- upsert mutable review item;
- insert review event;
- list review items for clone gate checks.

## 5. Transition Enforcement Summary

The MVP-critical subset is implemented server-side:

- terminal states cannot transition;
- direct transition pairs are constrained to the documented MVP path plus failure/cancel terminals;
- clone generation requires accepted or accepted-with-limitations source evidence review, `clone_generation_allowed`, no clone-blocking review items, and source evidence refs;
- proposal approval requires proposal-ready state;
- content approval requires improved preview/content review boundary;
- domain readiness ready requires DDOM readiness snapshot ref;
- subscription created requires billing/subscription/entitlement placeholder refs;
- publish ready requires content, domain, subscription/entitlement, launch approval, publish target, and rollback refs;
- published requires `publish_ready` unless a controlled override flag is explicitly supplied;
- closeout requires published or rollback-available state, rollback readiness where applicable, closeout evidence, and closeout ref.

Remaining enforcement gaps are intentionally deferred: full AAF scope validation, clone fidelity approval truth, proposal/content approval source truth, DDOM freshness interpretation, PTT/PASR/billing source validation, publish activation approval scope matching, rollback execution governance, and projection writes.

## 6. Source Evidence Review Enforcement Summary

The source evidence review service supports create, ref recording, item recording, ready-for-review, review start, accept, accept with limitations, retry required, reject, and supersede.

It enforces:

- no acceptance with zero evidence items;
- no clean acceptance when required source evidence categories are missing, degraded, or unverified without accepted limitations;
- accepted-with-limitations requires limitation details and an AAF approval decision ref;
- retry and reject require reasons;
- supersede requires replacement review ref or reason;
- terminal reviews cannot be edited by service operations.

## 7. Idempotency And Drift Behavior

Idempotent insert operations use `on conflict (idempotency_key) do nothing`, then read the existing row and compare semantic fields. Volatile fields such as generated ids, timestamps, actor display labels, and correlation/request metadata are excluded where appropriate.

Covered idempotent operations include migration creation, state events/transitions, migration refs, source evidence review creation, review refs, review items, review events, and closeouts. Same key plus same semantic payload returns the existing row. Same key plus semantic drift throws `SingleSiteIdempotencyConflictError` or a transition-layer conflict before mutation.

## 8. Transaction Behavior

The repository exposes `withTransaction`, using explicit `begin`, `commit`, and best-effort `rollback`. Transition writes and source evidence lifecycle writes use repository transactions so event insertion and mutable header updates succeed or fail together.

## 9. Append-Only Preservation

The repository exposes no update/delete helpers for append-only tables:

- `gnr8_single_site_migration_state_events`
- `gnr8_single_site_migration_refs`
- `gnr8_single_site_migration_closeouts`
- `gnr8_single_site_source_evidence_review_refs`
- `gnr8_single_site_source_evidence_review_events`

The disposable DB integration test also verifies update/delete failures against the MVP-5 append-only triggers.

## 10. Source-Truth Boundary

AAF, DDOM, PTT, billing, runtime, publish, rollback, capture, and external provider truth remains outside this writer. The spine records those systems as refs only. No runtime/capture/clone/publish/billing/domain integration was added.

## 11. Validation Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/source-evidence-review-service.test.ts apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts`
- `pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node ...new single-site files...`

The MVP-5 run passed 10 tests. The MVP-6 run passed 10 tests. The disposable DB tests used local Docker PostgreSQL and stopped their containers in cleanup.

Full `apps/platform` TypeScript validation was attempted but remains blocked by pre-existing unrelated type errors outside `apps/platform/gnr8/single-site/`. Focused validation for all new/changed single-site files passed.

## 12. Guardrail Results

Passed guardrails confirmed:

- new writer/service files begin with `import "server-only";`;
- no provider, DNS, Vercel, Openprovider, registrar, Stripe, AI, worker, Command Center, Ops Inbox, runtime publish, or rollback mutation imports were added;
- repository mutations target `public.gnr8_single_site_*` tables only;
- no SQL migrations were created or changed during MVP-6;
- no API routes, UI, workers, providers, DNS/domain implementation, billing/Stripe implementation, publish/rollback implementation, Command Center implementation, Ops Inbox implementation, public runtime, AI, storage, auth, or client portal files were modified;
- no production/staging/remote Supabase or external providers were called;
- Docker containers used for validation were stopped.

## 13. Issues Found

- MVP-4 docs contain a stage-table wording mismatch around `source_evidence_review_required`; MVP-6 follows the MVP-5 SQL mapping where that state belongs to `source_evidence_review`.
- Full platform TypeScript validation is noisy from unrelated existing test/type drift. Focused validation was used for the new writer files.

## 14. Residual Risks

- AAF audit/approval scope validation is represented as refs and basic requirement checks only.
- DDOM/PTT/billing/runtime refs are not dereferenced or freshness-validated in MVP-6.
- Clone review, proposal approval, content approval, publish activation, rollback execution, and closeout approval source truths still need later milestones.
- The writer is intentionally not integrated, so capture integration must explicitly call this service in a future phase.

## 15. Acceptance Recommendation

MVP-6 is safe to accept as the server-only writer core. Capture integration may begin in the next milestone, provided it remains server-only and uses these writer services rather than writing the tables directly.

Recommended next milestone: MVP-7 read model for Command Center/Ops Inbox projections, or MVP-8 capture completion integration if the team wants to wire the state spine before projection work.

## 16. Git Status Summary

At closeout drafting time, the MVP-6 worktree changes were the new single-site TypeScript modules/tests, this closeout, and the canonical doc index update. No commit or push was performed.

## 17. Commands Run

- `sed -n ...` over MVP-5 SQL/tests/closeout.
- `sed -n ...` over MVP-4 transition/source evidence/operator docs.
- `rg ...` over AAF/DDOM/PTT writer and test patterns.
- `pnpm exec tsc ...` focused validation for new single-site files.
- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false` full platform validation attempt, blocked by unrelated existing errors.
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test ...` for MVP-5 and MVP-6 tests.
- `git status --short`
- `git diff --name-only`
- `git diff --check`
- `rg ...` guardrails for trailing whitespace, forbidden imports/calls, RLS policies/grants, non-single-site SQL mutations, and remote/provider terms.
- `docker ps --filter name=gnr8-single-site --format '{{.Names}}'`
- `git checkout -- apps/platform/tsconfig.tsbuildinfo` to remove generated metadata from the worktree.

## 18. Runtime Behavior Confirmation

No runtime behavior changed.
