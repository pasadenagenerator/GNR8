# GNR8 Single-Site State Read Model Core Closeout

Date: 2026-07-29
Phase: MVP-7 single-site state read model core
Scope: Server-only read repository, derived read model builder, focused tests, disposable local PostgreSQL integration test, and documentation only.

MVP-7 did not implement API routes, server actions, UI, capture/import behavior, clone generation behavior, proposal behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, workers, providers, AI execution, storage behavior, auth behavior, client portal behavior, commit, or push.

## 1. Files Reviewed

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- MVP-5 tests and MVP-6 writer/transition/source evidence tests.
- MVP-5 and MVP-6 closeouts.
- Representative AAF, PASR, DDOM, Command Center, Ops Inbox, and runtime hosting read-model/read-repository patterns.

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Final Read-Model Module Location

- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`

## 4. Final Read Repository Location

- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`

## 5. Read Model Fields Summary

The read model exposes boundary flags, generated/captured timestamps, migration identity, current state/stage lifecycle, stage summaries, state history, source evidence review summary, evidence completeness, blockers, refs, closeout, recommended next action, freshness, MVP workflow readiness flags, and diagnostics.

## 6. Lookup Methods Implemented

- `readByMigrationId`
- `listBySiteId`
- `listByClientId`
- `listActiveNonTerminalMigrations`
- `readLatestSourceEvidenceReviewForMigration`
- `readBlockersForMigration`
- `readStateHistoryForMigration`

`listBySiteId` matches `site_id`, `ownership_site_id`, or `runtime_site_id` as text. If writer-created rows omit tenant/client/site fields, lookup completeness is limited to the identifiers present in the spine.

## 7. Source Evidence Summary Behavior

The builder selects the migration-linked latest review when available, otherwise the newest review row. It summarizes review status, completeness, decisions, accepted-with-limitations details, clone allowance, retry/rejection status, required evidence gaps, clone-blocking items, review refs, and review events.

## 8. Blocker Summary Behavior

The read model reports total/open/resolved counts, highest open severity, severity counts, and normalized blocker details. Open `p0`, `p1`, or `p2` blockers project `investigate_blocker` ahead of normal workflow recommendations.

## 9. Recommended Next Action Behavior

Recommended actions are derived only from the current state, source evidence review status, refs, blockers, and closeout presence. Implemented action keys include capture start/retry, source evidence review/acceptance, clone generation/review/revision, proposal approval, improvement review, domain readiness, subscription/hosting, launch approval, publish preparation, published verification/rollback confirmation, closeout, blocker investigation, and no-action-required terminal states.

## 10. Derived-Only Source-Of-Truth Boundary

Every read model includes:

- `derivedOnly: true`
- `sourceTruth: "gnr8_single_site_state_spine"`
- `mutatesSourceTruth: false`
- `nonEnforcing: true`

The builder performs no database calls and no writes.

## 11. Mutation Non-Change Confirmation

The read repository uses `begin isolation level repeatable read read only` and `select` queries only. The disposable DB integration test counted all ten `gnr8_single_site_*` tables before and after read calls and confirmed no row count changed.

## 12. Runtime/Capture/Clone/Publish/UI Non-Integration Boundary

No capture/import, clone, proposal, billing/Stripe, domain/DNS, publish, rollback, Command Center, Ops Inbox, API route, server action, worker, provider, public runtime, AI, storage, auth, or client portal integration was added.

## 13. Unit Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`

Result: 8 tests passed.

## 14. Integration Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`

Result: 1 test passed. The test used a disposable local Docker `postgres:15` container with `--pull=never`, applied only the MVP-5 migration, created migration/review/ref/item/blocker/closeout data through MVP-6 writer/service helpers, validated read-model projection, confirmed read-only row counts, and stopped the container.

## 15. Type/Static Validation Results

Passed:

- `pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node apps/platform/gnr8/single-site/single-site-state-read-model.ts apps/platform/gnr8/single-site/single-site-state-read-repository.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `git diff --check`

## 16. Guardrail Results

Passed guardrails confirmed:

- new read-model/repository runtime files start with `import "server-only";`;
- no provider, DNS, Vercel, Openprovider, registrar, Stripe, billing, AI, worker, Command Center, Ops Inbox, runtime publish, or rollback imports were added;
- read-model/repository files contain no insert/update/delete SQL;
- no SQL migrations were created or changed;
- no API routes, UI, workers, providers, DNS/domain implementation, billing/Stripe implementation, publish/rollback implementation, Command Center implementation, Ops Inbox implementation, public runtime, AI, storage, auth, or client portal files were modified;
- no production/staging/remote Supabase or external providers were called;
- Docker container cleanup check found no `gnr8-single-site` containers running.

## 17. Issues Found

- Initial read SQL used `select *` plus timestamp text aliases and ambiguous `order by` columns. The repository now qualifies timestamp order clauses.
- `tsx` local IPC pipe creation requires the same sandbox escalation/TMPDIR handling used by recent MVP-6 validation.

## 18. Residual Risks

- Freshness/staleness is limited to available `fresh_until`, event ids, watermarks, and explicit stale warnings. It does not dereference AAF/DDOM/PTT/runtime/billing source truths.
- Recommended next action is advisory and non-enforcing. Transition validity remains owned by MVP-6 services and later source-truth integrations.
- `listBySiteId` depends on whichever site identifier fields are populated by the writer or future integration.

## 19. Whether MVP-7 Is Safe To Accept

Yes. MVP-7 is safe to accept as a server-only, read-only, derived projection core.

## 20. Whether Capture Integration May Begin

Yes. Capture integration may begin in a later milestone, provided it uses the MVP-6 writer/service boundary and does not bypass transition/source evidence review guardrails.

## 21. Recommended Next Milestone

MVP-8: server-only capture completion integration into the single-site state spine, followed by operator surfacing once runtime capture writes are proven.

## 22. Git Status Summary

At closeout drafting time, the MVP-7 changes were the new read-model/repository/test files, this closeout, and a narrow canonical index update. No commit or push was performed.

## 23. Commands Run

- `sed -n ...` over MVP-5 SQL, MVP-6 contracts/repositories/services/tests, and closeouts.
- `rg --files ...` and `rg ...` over single-site and read-model patterns.
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/source-evidence-review-service.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node ...new MVP-7 files...`
- `git diff --check`
- `git status --short`
- `rg ...` guardrails for server-only posture, forbidden imports/calls, read-only SQL, and changed-file boundaries.
- `docker ps --filter name=gnr8-single-site --format '{{.Names}}'`

## 24. Runtime Behavior Confirmation

No runtime behavior changed.
