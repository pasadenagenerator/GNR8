# GNR8 Single-Site Clone Generation Gate Closeout

Date: 2026-07-29
Phase: MVP-9 clone generation gating by accepted source evidence review
Scope: Server-only read-model gate, pure and DB-backed tests, validation, and documentation only.

MVP-9 did not improve clone fidelity, rewrite clone generation, create clone output, create proposals, modify capture/import behavior, modify content editing, modify billing/Stripe, modify domain/DNS, modify publish, modify rollback, modify Command Center, modify Ops Inbox, modify public runtime, call providers, call AI, call Vercel, call DNS providers, call Openprovider, call Stripe, create SQL migrations, commit, or push.

## 1. Files Reviewed

- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/*.{test,integration.test}.ts`
- Clone/generation-adjacent files were inspected read-only: `apps/platform/gnr8/runtime/runtime-store.ts`, `apps/platform/gnr8/runtime/migration-factory.ts`, `apps/platform/gnr8/migration/runtime/run-linear-migration-pipeline.ts`, `apps/platform/app/api/gnr8/ai/migration-run/route.ts`, `apps/platform/gnr8/site-actions/site-action-service.ts`, import/capture routes, and generated proposal contract/persistence surfaces.

## 2. Files Created/Updated

Created:

- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Existing Clone Boundary Found

No safe single-site clone generation start boundary was found for runtime integration. Existing generation-adjacent surfaces are either generic runtime site version/artifact creation, older migration factory execution, import/capture runtime output creation, proposal tooling, or AI/billing/page-storage mutation routes.

## 4. Runtime Integration Decision

Runtime integration was deferred. The implemented gate is core-only and repository-ready. No clone start, artifact creation, proposal generation, runtime route, or generation internals were modified.

## 5. Gate Module Location

- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`

## 6. Gate Input Strategy

`evaluateCloneGenerationGate(...)` supports:

- pure evaluation from an injected MVP-7 `SingleSiteMigrationReadModel`;
- repository-backed evaluation from `SingleSiteStateReadRepository.readByMigrationId`;
- injected read repository test doubles for service integration.

If no read model is supplied, `migrationId` is required. Repository failures return a deterministic `read_model_unavailable` result rather than throwing through a future clone workflow.

## 7. Gate Output/Result Vocabulary

Every result includes:

- `allowed`
- `mode`
- `reason`
- `migrationId`
- `siteId`
- `currentState`
- `sourceEvidenceReviewStatus`
- `sourceEvidenceReviewId`
- `acceptedWithLimitations`
- `limitations`
- `missingRequirements`
- `recommendedNextAction`
- `derivedOnly: true`
- `mutatesSourceTruth: false`

Supported reasons are exactly:

`source_evidence_accepted`, `source_evidence_accepted_with_limitations`, `source_evidence_missing`, `source_evidence_not_ready`, `source_evidence_review_in_progress`, `source_evidence_retry_required`, `source_evidence_rejected`, `source_evidence_superseded`, `migration_not_found`, `migration_terminal`, `migration_failed`, `migration_cancelled`, `read_model_unavailable`, `unsafe_missing_identity`.

## 8. Allow Rules

The gate allows clone generation only when:

- the migration identity is present and matches the read model;
- the migration exists;
- the migration is not terminal, failed, or cancelled;
- the latest source evidence review exists;
- the latest source evidence review status is `accepted` or `accepted_with_limitations`;
- the MVP-7 projection still reports `cloneGenerationAllowed`.

## 9. Block Rules

The gate blocks when:

- migration identity is missing or mismatched;
- the read model cannot be loaded;
- the migration is missing;
- the migration is closed out, failed, or cancelled;
- the latest review is missing;
- the latest review is `not_started`, `ready_for_review`, `review_in_progress`, `retry_required`, `rejected`, or `superseded`;
- accepted evidence is internally inconsistent with `cloneGenerationAllowed: false`.

## 10. Accepted-With-Limitations Behavior

`accepted_with_limitations` returns `allowed: true`, `mode: "warning"`, `reason: "source_evidence_accepted_with_limitations"`, `acceptedWithLimitations: true`, and carries the read-model limitations array unchanged. It does not create an AAF approval, mutate review status, or alter clone output.

## 11. Read Model Usage

The gate consumes the MVP-7 read model fields:

- `migration.migrationId`
- `migration.siteId`
- `currentState.state`
- `currentState.terminal`
- `currentState.failed`
- `currentState.cancelled`
- `sourceEvidenceReview.reviewStatus`
- `sourceEvidenceReview.reviewId`
- `sourceEvidenceReview.acceptedWithLimitations`
- `sourceEvidenceReview.cloneGenerationAllowed`
- `sourceEvidenceReview.limitations`

The DB-backed path uses `SingleSiteStateReadRepository`, which runs repeatable-read read-only transactions.

## 12. Mutation Non-Change Confirmation

The gate performs no writes. Unit tests verify supplied read models are not mutated. The integration test counts all ten `gnr8_single_site_*` tables before and after gate evaluation and confirms counts are unchanged.

## 13. Clone/Proposal/Publish Non-Integration Boundary

No clone internals, runtime artifact creation, site version creation, generated proposal, publish, rollback, billing, domain/DNS, Command Center, Ops Inbox, public runtime, provider, or AI integration was added.

## 14. Unit Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`

Result: 18 tests passed.

Coverage includes accepted, accepted-with-limitations, missing review, ready-for-review, review-in-progress, retry-required, rejected, superseded with accepted replacement latest, failed migration, cancelled migration, closed migration, missing identity, read model unavailable, migration not found, deterministic result stability, server-only/no-forbidden-import posture, and no mutation behavior.

## 15. Integration Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`

Result: 1 disposable local PostgreSQL test passed.

The test used local Docker `postgres:15` with `--pull=never`, applied only the MVP-5 migration, wrote migrations/reviews through MVP-6 writer/services, read through MVP-7 repository/model, proved accepted and accepted-with-limitations allow, proved missing/retry/rejected block, confirmed no single-site row counts changed, confirmed runtime/proposal clone-output tables were not created, and stopped the container.

## 16. Type/Static Validation Results

Passed:

- `pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `git diff --check`

Required inherited validations also passed:

- MVP-7 read model tests: 9 tests passed.
- MVP-8 capture spine tests: 8 tests passed.

## 17. Guardrail Results

Passed guardrails confirmed:

- no SQL migrations were created or changed;
- no direct `gnr8_single_site_*` writes were added in the gate;
- no capture/import behavior was changed;
- no clone internals were changed;
- no proposal, billing, domain/DNS, publish, rollback, UI, Command Center, Ops Inbox, provider, Vercel, Openprovider, Stripe, or AI imports/calls were added in the gate;
- no production, staging, remote Supabase, external provider, Stripe, Vercel, DNS, Openprovider, or AI provider was called;
- `git diff --check` passed;
- trailing whitespace checks passed for MVP-9 changed/new files and the canonical index;
- Docker cleanup check found no running disposable containers.

## 18. Issues Found

- No safe current clone generation boundary was found for a blocking runtime integration.
- The first sandboxed `tsx` test attempts failed because local IPC pipe creation was denied; reruns with the existing unsandboxed local validation pattern passed.
- Focused TypeScript validation initially caught a too-direct partial read-model cast in the unit test helper; it was fixed by casting through `unknown`.

## 19. Residual Risks

- Runtime clone generation is not yet wired to this gate. A future integration milestone must identify or create a narrow start boundary with `migrationId` available.
- The gate relies on MVP-7 projection correctness and does not dereference AAF, runtime, capture, proposal, billing, DDOM, PTT, or publish source truths.
- Accepted-with-limitations policy specifics remain owned by the review/transition services and future AAF scope validation.

## 20. Whether MVP-9 Is Safe To Accept

Yes. MVP-9 is safe to accept as a deterministic server-only clone generation gate core.

## 21. Whether Runtime Integration/Fidelity Hardening May Begin

Clone generation runtime integration may begin after MVP-9 acceptance, but it should first establish a narrow single-site clone-start boundary with `migrationId` and focused tests. Clone fidelity hardening should wait until that boundary can call this gate without touching proposal, publish, billing, domain/DNS, or provider behavior.

## 22. Recommended Next Milestone

MVP-10: define and implement the narrow single-site clone generation start boundary that calls `evaluateCloneGenerationGate(...)` in blocking mode, then transitions through MVP-6 services only when the gate allows.

## 23. Git Status Summary

MVP-9 expected changes:

- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Pre-existing before MVP-9 began:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- untracked `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`

No commit or push was performed.

## 24. Commands Run

- `git status --short`
- `rg --files docs apps/platform/gnr8/single-site`
- `rg -n ...` over MVP spine, source evidence, clone/generation, proposal, runtime, capture, and transition terms.
- `sed -n ...` over MVP-5/MVP-6/MVP-7/MVP-8 closeouts, contracts, writer/repository/services, read model/repository, capture adapter, runtime store, migration factory, site actions, and AI migration route.
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node ...MVP-9 files...`
- `git diff --name-only -- apps/platform/supabase/migrations supabase db`
- `rg` guardrails for direct spine writes, forbidden imports/calls, and trailing whitespace.
- `git diff --check`
- `docker ps --format '{{.Names}}'`

## 25. Explicit Confirmation Of Runtime Behavior Impact

MVP-9 has no runtime behavior impact. Clone generation is not blocked at runtime yet because no safe clone start boundary was integrated. The new gate is a server-only, read-only integration point for the next clone workflow milestone.
