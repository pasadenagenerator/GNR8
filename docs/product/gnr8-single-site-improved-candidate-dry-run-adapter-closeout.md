# GNR8 Single-Site Improved Candidate Dry-Run Adapter Closeout

Phase: MVP-23
Scope: Server-only improved candidate dry-run adapter core for single-site migration.

MVP-23 implements deterministic planning only. It does not create improved runtime versions, runtime artifacts, artifact bindings, active pointer changes, content edits, Generated Proposal Bundles, provider calls, routes, UI, workers, publish, rollback, billing, domain/DNS, commits, or pushes.

## Files Reviewed

- `docs/architecture/gnr8-single-site-improved-candidate-adapter-design.md`
- `docs/architecture/gnr8-single-site-improved-candidate-dry-run-contract.md`
- `docs/architecture/gnr8-single-site-improved-candidate-runtime-primitive-map.md`
- `docs/architecture/gnr8-single-site-improved-candidate-evidence-watermark-contract.md`
- `docs/product/gnr8-single-site-improved-candidate-operator-workflow.md`
- `docs/product/gnr8-single-site-improved-candidate-adapter-readiness-closeout.md`
- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-dry-run-adapter-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Adapter Module

The adapter lives at `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.ts` and is guarded with `import "server-only"`.

Primary API:

- `dryRunImprovedCandidate(input)`
- `computeImprovedCandidateDryRunSemanticInputWatermark(input)`

The API consumes approved proposal refs, selected recommendation refs and payloads, implementation authorization refs and limitations, accepted clone/source evidence refs, successful MVP-20 validation, implementation scope, non-goals, actor, correlation id, idempotency key, and semantic input watermark.

## Output Contract

The result returns:

- deterministic planned change set;
- applied recommendation refs;
- not-applied recommendation refs with reason codes;
- limitations carried forward;
- warnings;
- evidence refs;
- deterministic placeholder refs for planned site version, planned runtime artifact, and planned change set;
- selected recommendation, limitation, planned change set, no-write, and semantic output watermarks;
- idempotency result;
- explicit `dryRunOnly: true`;
- explicit runtime/write/public/provider/approval flags all false.

## Recommendation Mapping

Supported recommendation categories:

- `content_clarity`
- `seo`
- `aeo`
- `trust_credibility`
- `technical_cleanup`
- `accessibility`
- `performance`

Supported change classes:

- `text_replacement_plan`
- `metadata_update_plan`
- `heading_structure_plan`
- `alt_text_plan`
- `internal_link_plan`
- `structured_data_plan`
- `performance_asset_plan`
- `manual_note_plan`

A recommendation maps to a planned change only when it has an operator-authored deterministic payload, target identity, current source hash, planned value/hash, and source evidence refs. Unsupported or incomplete recommendations are returned in `recommendationsNotApplied`.

Not-applied reason codes:

- `requires_operator_input`
- `requires_ai_execution`
- `requires_asset_selection`
- `requires_design_review`
- `unsupported_in_mvp`
- `missing_source_evidence`
- `outside_scope`

## Placeholder And Watermark Strategy

Placeholder refs are stable hashes over semantic input, selected recommendation watermark, implementation scope watermark, limitation watermark, planned changes, and not-applied recommendations:

- `gnr8:planned_site_version:<hash>`
- `gnr8:planned_runtime_artifact:<hash>`
- `gnr8:planned_change_set:<hash>`

Watermarks use stable sorted JSON and exclude volatile timestamps. Identical semantic input produces identical output. Same idempotency key with different semantic input throws `SingleSiteIdempotencyConflictError`.

## MVP-20 Dependency

Dry-run fails closed unless MVP-20 validation is successful, non-executing, non-mutating, fresh, exact-scope, exact-drift-free, and backed by a granted or granted-with-limitations implementation authorization. Blocked, stale, wrong-scope, mismatched subject/evidence, prohibited substitution, revoked/rejected/expired/superseded, and missing carry-forward limitation cases are blocked before planning.

## MVP-21 Integration

`ImprovementExecutionService.recordImprovedCandidateDryRunResult` records dry-run-only execution items and placeholder output refs through the existing MVP-21 schema. It records validation, applied selected recommendation items, not-applied warning items, limitation items, placeholder output refs/items, and an operator review manual note.

The helper does not mark the attempt completed, does not set improved candidate runtime refs on the attempt, and does not create runtime outputs. No SQL migration was required.

## Mutation And Approval Boundary

Runtime mutation boundary:

- no runtime site version creation;
- no runtime artifact creation;
- no artifact binding;
- no active pointer mutation;
- no content override mutation;
- no publish or rollback;
- no provider, DNS, Vercel, Openprovider, Stripe, billing, domain, or AI calls;
- no Generated Proposal Bundle creation.

Approval boundary:

- dry-run is not implementation completion;
- dry-run is not content approval;
- dry-run is not client approval;
- dry-run is not launch approval;
- dry-run is not publish activation approval.

## Validation Results

Unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.test.ts apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- Result: passed, 16 tests.

Integration tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts`
- Result: passed, 1 disposable PostgreSQL test.

Type/static validation:

- Platform-wide `tsc --noEmit` was attempted and failed on pre-existing unrelated platform/test errors; it also initially caught local MVP-23 narrowing errors, which were fixed.
- Focused no-emit with `/private/tmp/gnr8-mvp23-single-site-tsconfig.json` passed for changed MVP-23 single-site files.

Formatting and guardrails:

- `git diff --check` passed.
- Trailing whitespace check passed.
- Guardrail searches found no forbidden runtime-store mutation imports/calls, active pointer mutation, provider calls, routes, UI, workers, public runtime, client portal, Command Center, Ops Inbox, publish, rollback, billing, domain/DNS, Vercel, Openprovider, Stripe, AI execution, or Generated Proposal Bundle persistence in changed implementation files.

SQL/disposable DB validation:

- No SQL migration was added.
- Disposable PostgreSQL integration proved ready attempt creation, successful MVP-20 validation enabling dry-run, dry-run placeholder item/ref persistence, unsupported recommendation warning persistence, attempt not completed, no improved candidate refs written, no runtime site version/artifact/active pointer rows created, and no Generated Proposal Bundle/billing/domain rows created.

Docker cleanup:

- Disposable PostgreSQL containers were stopped in test cleanup.

## Issues Found

- The first adapter test guardrail was too broad and matched required false proof fields; it was narrowed to forbidden imports/calls.
- The first integration fixture omitted a required proposal finding; the fixture was corrected.
- The first integration fixture used an unsupported recommendation id that was not persisted; the fixture now persists it as a selected proposal recommendation.
- Platform-wide no-emit currently has unrelated pre-existing failures outside the MVP-23 boundary.

## Residual Risks

- Recommendation payload schemas are intentionally minimal MVP fixtures; future execute mode will need stricter persisted payload validation before mutation.
- Dry-run does not read runtime baselines directly; it trusts governed clone/version/artifact refs and MVP-20 validation inputs.
- MVP-21 item persistence can record dry-run placeholders, but no dedicated dry-run event action exists yet.

## Acceptance

MVP-23 is safe to accept as a dry-run adapter core. It proves deterministic planning and persistence of dry-run evidence without runtime mutation.

Real improved candidate adapter implementation may begin next only behind a new milestone that reuses this contract, performs immediate revalidation, and still keeps content/client/launch/publish approvals separate.

Recommended next milestone: MVP-24 real improved candidate creation behind the governed adapter boundary, limited to creating a non-published draft improved candidate runtime version/artifact after dry-run-equivalent validation.

## Git Status Summary

Expected MVP-23 changes:

- new adapter, unit test, integration test, and closeout doc;
- narrow MVP-21 service helper and test update;
- canonical index update.

No commit or push was performed.
