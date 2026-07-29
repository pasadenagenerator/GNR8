# GNR8 Single-Site Real Clone Executor Closeout

Date: 2026-07-29
Phase: MVP-12 single-site real clone executor adapter core
Scope: Server-only executor adapter behind the MVP-11 `SingleSiteCloneExecutor` interface, focused tests, existing MVP-9/MVP-11 integration validation, and canonical index update.

MVP-12 did not create UI, API routes, server actions, Command Center wiring, Ops Inbox wiring, proposal generation, improvement flows, billing/domain/publish integration, SQL migrations, worker behavior, provider calls, external calls, production/staging Supabase calls, commits, or pushes.

## 1. Files Reviewed

- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/runtime-store.preallocation.integration.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.active-serving-resolution.integration.test.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `apps/platform/gnr8/runtime/migration-factory.ts`
- `apps/platform/gnr8/runtime/types.ts`

## 2. Files Created/Updated

Created:

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Selected Clone Primitive

MVP-12 selected the existing runtime canonical version/artifact primitives:

- `getSiteVersion(...)`
- `createSiteVersionFromMigration(...)`
- `buildDeterministicArtifactBundle(...)`
- `createArtifact(...)`
- `bindArtifactToVersion(...)`
- `getArtifactById(...)`

The adapter copies the already captured/imported canonical page-version evidence from an accepted source runtime site version into a deterministic clone runtime site version, then creates or reuses a shadow-stage runtime artifact for that clone version and binds it to the clone version.

## 4. Why The Primitive Is Safe

The selected path is server-only, deterministic, and does not call AI providers, external providers, DNS, Vercel, Openprovider, Stripe, billing, proposal, publish, rollback, worker, UI, or route code.

It does not switch the runtime active pointer, mark a version published, create a proposal, approve content, mutate public serving state, or proceed to improvement. It creates a `DRAFT` runtime site version and a `shadow` runtime artifact candidate for clone review.

## 5. Executor Adapter Location

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`

Exports:

- `createSingleSiteRealCloneExecutor(dependencies?)`
- `singleSiteRealCloneExecutor`
- `SINGLE_SITE_REAL_CLONE_EXECUTOR_VERSION`

## 6. Input/Output Contract

The adapter implements MVP-11 `SingleSiteCloneExecutor.execute(input)`.

Required input identity/context:

- `migrationId`
- `clientId`
- `siteId`
- `sourceEvidenceReviewId`
- `actor.actorType`
- `actor.actorId`
- `actor.actorRole`
- `correlationId`
- `idempotencyKey`
- source runtime site version id via `metadataJson.sourceRuntimeSiteVersionId`, `metadataJson.sourceSiteVersionId`, `metadataJson.runtimeSiteVersionId`, or the same keys in `sourceEvidencePackageRef.metadataJson`

Returned result includes:

- `siteVersionRef`
- `runtimeArtifactRef`
- `sourceRefs`
- `evidenceRefs`
- `targetRefs`
- `limitations`
- `warnings`
- `watermarks`
- `idempotencyKey`
- `operationKey`
- `semanticOutputWatermark`
- `reusedExisting`

MVP-11 can continue consuming the existing `siteVersionRef` and `runtimeArtifactRef`; the new fields are additive result metadata.

## 7. Stable Target Refs

The adapter returns stable canonical refs:

- `gnr8:single_site_migration:<migrationId>`
- `gnr8:runtime_site:<runtimeSiteId>`
- `gnr8:site_version:<cloneSiteVersionId>`
- `gnr8:runtime_artifact:<artifactId>`
- `gnr8:source_evidence_review:<reviewId>`
- `gnr8:site_version:<sourceSiteVersionId>`

Transition ref tables use existing source table names:

- `gnr8_runtime_site_versions`
- `gnr8_runtime_artifacts`
- `gnr8_single_site_source_evidence_reviews`

## 8. Idempotency Strategy

The operation key is deterministic:

`single-site-real-clone:<MVP-11 executor idempotency key>`

The clone site version id is either explicitly supplied in `targetRefs.siteVersionId` / target metadata, or deterministically derived as a UUID from operation key, migration id, review id, and source site version id.

The semantic output watermark is `sha256:<stable semantic payload hash>`, covering migration/client/site identity, source evidence review id, accepted-with-limitations state, limitations, source watermark, payload hash, source evidence package ref, source runtime site version, source artifact hash, source page hashes, and target clone site version id.

The adapter stores the operation key and semantic watermark in the clone version `import_provenance_summary.singleSiteCloneExecutor`. On retry:

- same key and same semantic input reuses the existing clone site version and artifact refs;
- same key and changed semantic input throws `SingleSiteIdempotencyConflictError`;
- an existing target version without MVP-12 clone provenance is treated as an idempotency conflict rather than adopted blindly.

## 9. Runtime Artifact/Site Version Behavior

Created/reused:

- one clone runtime site version;
- one runtime artifact bound to that clone version.

The clone version remains a review candidate. The artifact is created with `publishStage: "shadow"` and review-oriented governance:

- shadow allow;
- canary review;
- production review.

Not performed:

- active pointer switch;
- published state transition;
- domain binding;
- DNS action;
- raw template mutation;
- proposal creation.

## 10. Source Evidence Review Dependency

The adapter requires the MVP-11 executor input to include the accepted source evidence review id supplied after MVP-9 gate evaluation. It does not independently mark evidence accepted and does not bypass MVP-9 or MVP-11. Accepted-with-limitations context is preserved in output limitations/warnings and in the semantic watermark.

## 11. What Is And Is Not Clone In MVP-12

MVP-12 clone means:

- a conservative 1:1 clone artifact/version candidate derived from already captured/imported canonical runtime evidence;
- deterministic and review-required;
- not publishable by itself.

MVP-12 clone does not mean:

- redesign;
- improvement proposal;
- generation campaign;
- AI regeneration;
- content approval;
- publish activation;
- domain/DNS readiness;
- billing/subscription flow.

## 12. Orchestrator Compatibility

No broad MVP-11 rewrite was made.

The only compatibility change is an additive `SingleSiteCloneExecutorResult` extension for:

- `targetRefs`
- `idempotencyKey`
- `operationKey`
- `semanticOutputWatermark`
- `reusedExisting`

The orchestrator still:

- runs MVP-9 gate first;
- dry-runs without writes;
- records start before executor;
- records completion and clone review required after executor success;
- records failure through MVP-6 transition semantics;
- uses MVP-6 transition service, not direct `gnr8_single_site_*` table writes.

## 13. Tests Run And Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-real-clone-executor.test.ts`

Result: 8 tests passed.

Passed focused regression suite:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-clone-generation-gate.test.ts gnr8/single-site/single-site-clone-start-orchestrator.test.ts gnr8/single-site/single-site-real-clone-executor.test.ts gnr8/single-site/single-site-state-transition-service.test.ts gnr8/single-site/source-evidence-review-service.test.ts gnr8/single-site/single-site-state-read-model.test.ts`

Result: 52 tests passed.

Passed existing disposable DB integration suite when run from repo root:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`

Result: 2 tests passed.

An earlier integration attempt from `apps/platform` failed because the existing integration tests build the migration path from `process.cwd()` and therefore looked for `apps/platform/apps/platform/...`. Rerunning from the repository root passed.

## 14. Type/Static Validation

Passed focused no-emit TypeScript validation with a temporary platform-local tsconfig including only:

- `gnr8/single-site/single-site-real-clone-executor.ts`
- `gnr8/single-site/single-site-real-clone-executor.test.ts`
- `gnr8/single-site/single-site-clone-start-orchestrator.ts`

Full `apps/platform` project typecheck was attempted and failed on pre-existing unrelated drift in candidate-review, first-limited-dry-run, content route resolver, site-create, site workspace, template family, and template intake tests. The errors were not caused by the MVP-12 files after the focused typecheck cleanup.

## 15. Integration Coverage Limitation

No new MVP-12 DB integration test was added. The adapter's default runtime-store path needs the broader runtime schema and app DB wiring, while the single-site disposable DB integration tests intentionally apply only the single-site state evidence spine migration. A disposable runtime-store integration should be added in the next milestone with a local schema fixture that includes runtime site/version/page/artifact tables and no public-serving activation tables beyond read-count guardrails.

## 16. Guardrail Results

Guardrails confirmed by source inspection and tests:

- no UI/API/server action/Command Center/Ops Inbox files changed;
- no worker files changed;
- no SQL migrations changed;
- no direct writes to `gnr8_single_site_*` tables added outside MVP-6 services;
- no proposal/improvement imports or calls added;
- no active pointer switch or publish-state mutation added;
- no domain/DNS/Vercel/Openprovider/Stripe/billing/provider/AI calls added;
- no public runtime route or serving behavior changed.

Expected static-search false positives:

- `publishStage: "shadow"` appears in the adapter because runtime artifact rows require a publish-stage field;
- test text mentions publish/domain/billing/proposal/provider as guardrails;
- runtime primitive names live in `runtime-store`, but the adapter imports only version/artifact creation and binding primitives, not active pointer, domain, rollback, publish, or provider primitives.

## 17. External Provider Non-Call Confirmation

No external providers were called. No production/staging Supabase calls were made. No AI, DNS, Vercel, Openprovider, Stripe, billing, publish, rollback, or worker execution path was invoked.

## 18. Runtime/Public Behavior Impact

No public runtime serving behavior changed. The adapter is not wired to a route or UI. It creates review-candidate runtime refs only when explicitly invoked as an injected MVP-11 executor dependency.

## 19. Issues Found

- Existing runtime-store primitives can safely create version/artifact candidates, but they do not by themselves provide semantic idempotency. MVP-12 adds adapter-level durable idempotency by storing clone provenance in the target clone version import provenance.
- Existing single-site integration tests are cwd-sensitive because migration paths are resolved from `process.cwd()`.
- Full platform typecheck has unrelated drift outside MVP-12.

## 20. Residual Risks

- The adapter currently requires the caller to supply the accepted source runtime site version id through executor metadata or source evidence package metadata.
- Runtime DB integration for the adapter remains unimplemented until a disposable runtime schema fixture is available.
- The runtime primitive may upsert the runtime site row for the same runtime site id as part of `createSiteVersionFromMigration`; this does not publish or activate, but it is still a runtime write and should be observed in next-mile integration.

## 21. Whether MVP-12 Is Safe To Accept

Yes. MVP-12 is safe to accept as a server-only real clone executor adapter core with focused unit/static validation and existing MVP-9/MVP-11 disposable DB regression coverage.

## 22. Recommended Next Milestone

MVP-13: clone review/fidelity acceptance boundary. Add a disposable runtime-store integration fixture for MVP-12 first, then build clone review acceptance/revision semantics without proceeding to proposal, publish, domain/DNS, or billing.

## 23. Git Status Summary

Expected MVP-12 changes:

- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.
