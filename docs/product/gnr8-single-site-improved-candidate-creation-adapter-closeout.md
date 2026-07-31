# GNR8 Single-Site Improved Candidate Creation Adapter Closeout

Phase: MVP-24
Scope: Server-only real improved candidate creation adapter core for single-site migration.

MVP-24 implements the first real improved candidate runtime output after approved proposal planning, implementation authorization, MVP-20 execution-time AAF validation, MVP-21 execution attempt readiness, and MVP-23 dry-run match. It creates only a non-published improved candidate runtime site version and runtime artifact. It does not publish, switch active pointer, mutate the accepted clone, mutate production, call AI/providers, create Generated Proposal Bundles, create approvals, touch billing/domain/DNS, expose UI/API/routes/actions, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-dry-run-adapter-closeout.md`
- `docs/architecture/gnr8-single-site-improved-candidate-adapter-design.md`
- `docs/architecture/gnr8-single-site-improved-candidate-dry-run-contract.md`
- `docs/architecture/gnr8-single-site-improved-candidate-runtime-primitive-map.md`
- `docs/architecture/gnr8-single-site-improved-candidate-evidence-watermark-contract.md`
- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Adapter Module And API

The adapter lives at `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts` and is guarded with `import "server-only"`.

Primary API:

- `createImprovedCandidate(input, dependencies?)`
- `computeImprovedCandidateCreationSemanticInputWatermark(input)`

The dependency seam defaults to the MVP-12-style runtime primitives: `getSiteVersion`, `getArtifactById`, `createSiteVersionFromMigration`, `buildDeterministicArtifactBundle`, `createArtifact`, and `bindArtifactToVersion`. It can also receive `ImprovementExecutionService` for MVP-21 output persistence and status transitions.

## Input Contract

Input requires tenant/client/site identity, migration id, execution attempt ref/status, successful MVP-20 validation, implementation authorization refs, proposal plan/approval refs, selected recommendation refs and payloads, MVP-23 dry-run result and dry-run watermarks, proposal and authorization limitations, clone/source evidence refs, clone site version/artifact refs, optional WU/VCU/CGP refs through the evidence contract, implementation scope summary, non-goals, actor, correlation id, idempotency key, and creation semantic input watermark.

The adapter fails closed when validation is missing/blocked/stale/wrong-scope/drifted, dry-run result is missing or mismatched, unsupported required recommendations are present, execution attempt is not ready/started or terminal replay, clone version/artifact refs are missing, idempotency key is missing, or creation semantic input drifts.

## Output Contract

The result returns non-published runtime output refs, applied planned changes, not-applied recommendations with reasons, limitations/warnings, deterministic watermarks, idempotency result, explicit runtime mutation flags, explicit non-approval flags, and explicit no-publish/no-active-pointer/no-provider flags.

Stable refs returned include:

- `gnr8:single_site_migration:<migrationId>`
- `gnr8:improvement_execution_attempt:<attemptId>`
- `gnr8:site_version:<improvedCandidateSiteVersionId>`
- `gnr8:runtime_artifact:<improvedRuntimeArtifactId>`
- `gnr8:site_version:<cloneSiteVersionId>`
- `gnr8:runtime_artifact:<cloneRuntimeArtifactId>`
- `gnr8:proposal_plan:<proposalPlanId>`
- `gnr8:implementation_authorization:<authorizationDecisionRef>`
- `gnr8:planned_change_set:<hash>`

## Planned Change Behavior

Creation applies only MVP-23 dry-run planned changes that were marked applied. Supported classes are `text_replacement_plan`, `metadata_update_plan`, `heading_structure_plan`, `alt_text_plan`, `internal_link_plan`, `structured_data_plan`, `performance_asset_plan`, and `manual_note_plan`.

The adapter copies clone page models into a new candidate version and applies deterministic operator-authored planned values to explicit page/section/field targets. It does not apply dry-run not-applied recommendations. Unsupported required recommendations block creation. Planned changes that cannot be applied deterministically are returned as not applied with carried-forward limitation context instead of being silently dropped.

## Watermarks And Idempotency

Watermarks use stable sorted JSON:

- creation semantic input watermark;
- dry-run match watermark;
- applied change set watermark;
- runtime output bundle watermark;
- semantic output watermark.

Idempotency uses the idempotency key and execution attempt to derive the target candidate site version identity. Same key and same semantic input reuses the existing candidate version/artifact. Same key with semantic drift raises `SingleSiteIdempotencyConflictError`. Replay does not duplicate runtime rows and terminal replay skips MVP-21 state mutation.

## MVP-21 Integration

`ImprovementExecutionService.recordImprovedCandidateCreationResult` records real output refs/items through existing MVP-21 persistence. The adapter marks ready attempts started only after validation and dry-run match, records improved candidate site version/runtime artifact refs, records applied and not-applied recommendations, records limitations/warnings, and marks completed or completed_with_limitations only after runtime refs exist.

The MVP-21 attempt row stores `improved_candidate_site_version_ref`, `improved_runtime_artifact_ref`, `semantic_output_watermark`, and `output_refs_json`. Completion does not set content, client, launch, or publish approval flags.

No SQL migration was required.

## Runtime Mutation Boundary

Allowed runtime mutation:

- create a new DRAFT/non-published improved candidate site version;
- create or reuse one runtime artifact for that candidate version;
- bind that artifact to the candidate version.

Forbidden and not performed:

- active pointer mutation;
- clone version mutation;
- production/current active version mutation;
- publish, rollback, public runtime publish paths;
- content override mutation;
- domain/DNS, billing, Vercel, Openprovider, Stripe, provider, AI, Generated Proposal Bundle behavior.

The adapter passes a non-URL governance source string by default to avoid host/domain binding side effects during candidate creation.

## Approval Boundary

Improved candidate creation is not implementation approval, content approval, client approval, launch approval, or publish approval. It only produces an improved candidate ready for later improved version review.

## Validation Results

Unit and focused integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improvement-execution-service.test.ts gnr8/single-site/improved-candidate-creation-adapter.test.ts gnr8/single-site/improved-candidate-creation-adapter.integration.test.ts`
- Result: passed, 17 tests.

Required regressions:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improved-candidate-dry-run-adapter.test.ts gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts gnr8/single-site/improvement-execution-aaf-validator.test.ts gnr8/single-site/improvement-execution-service.integration.test.ts`
- Result: passed, 18 tests.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- Result: passed, 1 disposable PostgreSQL test.

Type/static validation:

- Full `pnpm exec tsc --noEmit -p apps/platform/tsconfig.json` was attempted and failed on existing unrelated app/test type errors. MVP-24 local fake-service typing surfaced during this run and was fixed.
- Focused no-emit using a temporary `apps/platform/tmp-mvp24-tsconfig.json` passed for changed MVP-24 single-site files; the temporary file was removed.

SQL/disposable DB validation:

- MVP-24 disposable PostgreSQL integration proved ready -> started -> completed attempt flow, required validation/dry-run failures, candidate site version row creation, runtime artifact row creation, artifact binding, clone version non-mutation, active pointer non-mutation, MVP-21 output refs, idempotent replay without duplicate output, drift conflict, and zero Generated Proposal Bundle/billing/domain/active pointer rows.

## Guardrails And External Providers

Guardrail searches were run for forbidden active pointer mutation, publish, rollback, public runtime route, provider, DNS, Vercel, Openprovider, Stripe, billing, domain, AI, Generated Proposal Bundle, route, worker, UI, client portal, Command Center, and Ops Inbox changes. No forbidden implementation or test path was added.

No production Supabase, staging Supabase, AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing, domain, publish, rollback, public runtime, or external provider was called. Docker was used only for disposable local PostgreSQL tests and containers were stopped in test cleanup.

## Runtime/Public Impact

There is no UI, API route, server action, public runtime route, Command Center action, Ops Inbox action, client portal route, worker, publish path, or provider integration exposed by MVP-24.

## Issues Found

- The first implementation keyed candidate version identity partly on semantic input; this would have allowed same-idempotency drift to target a new version. It was fixed so target identity is based on idempotency/attempt and semantic drift conflicts against existing provenance.
- Terminal replay originally attempted to record MVP-21 output again. It was fixed to reuse runtime output and skip execution-state mutation.
- Disposable runtime-store validation could not use the app superadmin pool because local PostgreSQL does not support the configured SSL option. The integration uses injected runtime primitive equivalents backed by disposable runtime tables while the production adapter defaults remain the real runtime-store primitives.

## Residual Risks

Deterministic change application is intentionally conservative and limited to explicit page/section/field or asset targets. Richer structured editing and improved version review/acceptance remain future milestones. Performance asset plans do not invent assets.

## Acceptance

MVP-24 is safe to accept as the server-only real improved candidate creation adapter core. Improved version review/acceptance may begin next. Recommended next milestone: implement governed improved version review/acceptance without publish activation.

Git status at closeout: source changes only, no commit, no push.
