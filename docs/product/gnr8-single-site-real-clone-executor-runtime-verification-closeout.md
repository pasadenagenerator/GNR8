# GNR8 Single-Site Real Clone Executor Runtime Verification Closeout

Date: 2026-07-29
Phase: MVP-12-VERIFY single-site real clone executor runtime-store integration verification
Outcome: Verification success. MVP-12 is now runtime-store verified against a disposable local PostgreSQL fixture.

No commit or push was performed.

## 1. Files Reviewed

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `apps/platform/gnr8/runtime/types.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Created/Updated

Created:

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Runtime-Store Primitives Verified

Verified with real runtime-store functions in a disposable local PostgreSQL database:

- `ensureRuntimeTables`
- `getSiteVersion`
- `createSiteVersionFromMigration`
- `buildDeterministicArtifactBundle`
- `createArtifact`
- `bindArtifactToVersion`
- `getArtifactById`

The executor ran through MVP-11 `startSingleSiteCloneGeneration(...)` in execute mode with MVP-9 gate evaluation and MVP-6 transition recording.

## 4. Fixture Strategy

The integration test uses Docker `postgres:15` with `--pull=never`, applies the existing single-site state/evidence spine SQL migration, then creates runtime-store tables through the existing `ensureRuntimeTables()` runtime primitive. The test binds the runtime-store default pool to the disposable local `pg.Pool`; it does not call production or staging Supabase.

Runtime source evidence is seeded locally using runtime primitives:

- source runtime site/version/page via `createSiteVersionFromMigration`
- source runtime artifact via `createArtifact`
- source artifact binding via `bindArtifactToVersion`

A sentinel `gnr8_runtime_active_pointers` row is fixture-seeded before execution only to prove the MVP-12 path does not mutate it.

Existing migration SQL used:

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`

Runtime table DDL used:

- existing runtime-store `ensureRuntimeTables()` DDL

No new SQL migration was added.

## 5. Required Runtime Fixture Tables And Fields

Runtime site identity:

- `gnr8_runtime_sites`: `id`, `source_url`, `source_host`, `created_at`, `updated_at`
- `gnr8_runtime_host_bindings`: `site_id`, `host`, `status`, `binding_kind`; `createSiteVersionFromMigration` upserts source-host shadow binding, and the clone path reuses the same host row.

Runtime site version truth:

- `gnr8_runtime_site_versions`: `id`, `site_id`, `version_no`, `state`, `source`, `actor`, `renderer_compatibility_version`, `import_provenance_summary`, `artifact_id`, `created_at`, `updated_at`
- Required provenance JSON: `import_provenance_summary.singleSiteCloneExecutor.executorVersion`, `operationKey`, `idempotencyKey`, `semanticOutputWatermark`, `migrationRef`, `runtimeSiteRef`, `cloneSiteVersionRef`, `sourceSiteVersionRef`, `sourceEvidenceReviewRef`, `sourceRuntimeArtifactRef`

Runtime page/version truth:

- `gnr8_runtime_pages`: `id`, `site_id`, `path`, `title`, with unique `(site_id, path)`
- `gnr8_runtime_page_versions`: `site_version_id`, `page_id`, `path`, `title`, `structure_model`, `content_model`, `style_tokens`, `asset_graph`, `semantic_signals`, `migration_governance`, `source`, `actor`

Runtime artifact truth:

- `gnr8_runtime_artifacts`: `id`, `site_id`, `site_version_id`, `renderer_compatibility_version`, `bundle_sha256`, `html_by_path`, `compiled_token_styles`, `asset_fingerprint_map`, `manifest`, `publish_stage`, `shadow_restricted`, `artifact_governance`, `created_at`
- Required artifact metadata: `manifest.sourceKind = "single_site_real_clone_executor"` and `manifest.singleSiteCloneExecutor`

Binding/audit:

- `gnr8_runtime_site_versions.artifact_id` is updated by `bindArtifactToVersion`
- `gnr8_runtime_version_audit` records draft version creation from `createSiteVersionFromMigration`

Active pointer guard:

- `gnr8_runtime_active_pointers`: `site_id`, `active_site_version_id`, `active_artifact_id`
- The sentinel row remained byte-for-byte unchanged after clone execution, replay, drift rejection, accepted-with-limitations execution, and executor failure coverage.

Single-site state/evidence fixture:

- `gnr8_single_site_migrations`
- `gnr8_single_site_migration_state_events`
- `gnr8_single_site_migration_refs`
- `gnr8_single_site_source_evidence_reviews`
- `gnr8_single_site_source_evidence_review_refs`
- `gnr8_single_site_source_evidence_review_items`
- `gnr8_single_site_source_evidence_review_events`

Required source evidence metadata:

- accepted or accepted-with-limitations source evidence review
- source runtime site version id in `metadataJson.sourceRuntimeSiteVersionId`
- source runtime artifact id in review/package metadata
- source evidence package ref metadata carrying the source runtime version id

## 6. Results Proven

Successful clone creation:

- MVP-6 writer/service created a single-site migration and accepted source evidence review.
- MVP-9 gate returned `allowed: true`.
- MVP-11 recorded `clone_generation_started`.
- The real MVP-12 executor created a clone `DRAFT` runtime site version.
- The real runtime artifact builder produced a deterministic artifact bundle.
- `createArtifact` created a `shadow` runtime artifact.
- `bindArtifactToVersion` bound the artifact to the clone version.
- MVP-11 recorded `clone_generation_completed` and `clone_review_required`.
- Stable refs were returned for `gnr8_runtime_site_versions` and `gnr8_runtime_artifacts`.

Idempotent replay:

- Rerunning the same migration/input/idempotency key after `clone_review_required` returned `idempotent_replay`.
- The executor was not called again.
- No duplicate runtime site version or artifact was created.
- The replay returned the same persisted `runtime_site_version_clone` and `runtime_artifact_clone` refs.
- State was not rewound and no duplicate clone state events were inserted.

Idempotency drift:

- Reusing the same executor idempotency key with semantic drift threw `SingleSiteIdempotencyConflictError`.
- Runtime clone version/artifact counts did not increase.

Accepted with limitations:

- Accepted source evidence with limitations was allowed in warning mode.
- Limitations and warnings were preserved in the orchestrator result and executor refs/metadata.
- No proposal or improvement artifact was created.

No forbidden side effects:

- Active pointer row remained unchanged.
- `gnr8_runtime_domain_host_bindings`, raw template artifacts, content slots/overrides/history stayed at zero rows.
- Optional proposal, billing, Stripe, and provider tables stayed missing/unchanged.
- No proposal, domain, subscription, Stripe, publish event, or active pointer refs were recorded in the single-site spine.
- No improvement proposal, content approval, publish-ready, or published states were recorded.
- No Vercel, Openprovider, DNS, Stripe, billing, AI provider, production Supabase, or staging Supabase calls were made.

## 7. Issues Found And Fixed

Runtime page identity:

- Finding: the executor originally generated a new runtime page id for a cloned page in the same runtime site/path. `gnr8_runtime_pages` correctly enforces unique `(site_id, path)`, so the disposable DB test failed with `23505` on `gnr8_runtime_pages_site_id_path_key`.
- Fix: the executor now reuses the canonical runtime page id from the source page while creating a new page-version row for the clone site version.

Replay refs:

- Finding: MVP-11 post-completion replay returned `idempotent_replay` but did not hydrate the previously recorded clone refs.
- Fix: MVP-11 now reads the latest active `runtime_site_version_clone` and `runtime_artifact_clone` refs from the read model for post-completion replay.

## 8. Validation Results

Passed MVP-12/MVP-11/MVP-9 unit suite:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.test.ts gnr8/single-site/single-site-clone-start-orchestrator.test.ts gnr8/single-site/single-site-clone-generation-gate.test.ts`
- Result: 38 tests passed.

Passed existing MVP-9/MVP-11 disposable DB integration suite:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- Result: 2 tests passed.

Passed new MVP-12 runtime-store disposable DB integration test:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- Result: 1 test passed.

Passed focused TypeScript no-emit validation:

- `pnpm exec tsc -p tmp-mvp12-verify-tsconfig.json --noEmit`
- Result: passed after temporary focused config cleanup.

Full platform typecheck:

- Not run in this phase. Focused TypeScript validation was used because the requested validation scope was the changed single-site/runtime verification files.

Static/guardrail validation:

- `git diff --check`: passed.
- trailing whitespace check on changed/new files: passed, no matches.
- changed-file guardrail: passed; only allowed single-site files, closeout docs, and canonical index changed.
- forbidden UI/API/route/worker/public runtime/provider/DNS/Vercel/Openprovider/Stripe/billing/domain/publish/rollback/proposal code search: passed, no matches in changed runtime/orchestrator/test code.
- direct `gnr8_single_site_*` table write guardrail search in changed MVP-12/MVP-11 files: passed, no direct writes outside MVP-6 writer/repository/transition service.
- active pointer mutation guardrail search in executor/orchestrator/integration path: passed, no `switchActivePointer`, active pointer update, or active pointer delete.
- forbidden route/worker/platform-area diff check: passed, no changes under `apps/platform/app`, Command Center, AAF, billing, provider, site, or worker paths.

Docker cleanup:

- Disposable containers were stopped in `finally` blocks after each integration run.
- Final `docker ps --format '{{.Names}}'` cleanup check returned no running disposable test container.

## 9. Source-Of-Truth Boundary Confirmation

- Single-site spine remains operational state truth.
- Runtime site version/artifact rows are runtime clone output truth.
- Source evidence review remains gate input truth.
- Proposal/improvement state was not created.
- Publish/active pointer truth was not mutated.
- Command Center and Ops Inbox remain derived and unmodified.

## 10. Residual Risks

- The fixture uses `ensureRuntimeTables()` rather than applying a full runtime migration chain. This is acceptable for MVP-12 verification because it verifies the exact runtime primitives used by the executor, but it is not a complete platform schema rehearsal.
- The active pointer row is fixture-seeded directly as a sentinel for non-mutation proof; no publish activation primitive is invoked.
- Full platform typecheck was not run.

## 11. Milestone Decision

MVP-12 is fully safe to accept as runtime-store verified for the single-site real clone executor adapter.

MVP-13 clone review/fidelity acceptance may begin next.

Recommended next milestone: MVP-13 clone review and fidelity acceptance, still without proposal generation, publish activation, billing/subscription, or domain/DNS changes until their dedicated phases.

## 12. Git Status Summary

Expected changed files at closeout:

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 13. Commands Run

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.test.ts gnr8/single-site/single-site-clone-start-orchestrator.test.ts gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `pnpm exec tsc -p tmp-mvp12-verify-tsconfig.json --noEmit`
- `git diff --name-only`
- `git status --short`
- `git diff --stat`
- `git diff --check`
- `rg -n "[ \t]+$" ...changed files...`
- forbidden import/call guardrail `rg` searches over changed executor/orchestrator/test code
- direct `gnr8_single_site_*` write guardrail `rg` search
- active pointer mutation guardrail `rg` search
- forbidden platform-area diff check
- `docker ps --format '{{.Names}}'`
