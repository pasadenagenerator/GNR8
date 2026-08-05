# GNR8 MVP-49 Single-Site Publish Activation Metadata Resolver Closeout

Scope: Server-only, read-only metadata resolver core for reconstructing MVP-48 `publishActivationMetadataHandoff` from persisted single-site publish activation records.

MVP-49 adds `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`. It reads persisted MVP-40/MVP-41/MVP-42/MVP-43/MVP-44/PTT rows, reconstructs the MVP-48 handoff shape, validates it fail-closed, and returns complete metadata only when the persisted chain is internally consistent. It is not wired into publish execution, does not block publish, does not evaluate gates, does not create AAF rows, does not call PASR/DDOM/providers, and does not mutate runtime, active pointers, rollback, billing, domain, DNS, UI/API, Command Center, Ops Inbox, or client portal behavior.

## Files Reviewed

- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `apps/platform/supabase/migrations/20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## API Summary

- `resolveSingleSitePublishActivationMetadataHandoff(input)`: pure resolver over an already-read repository snapshot. Returns a complete normalized MVP-48 handoff only when all validations pass; otherwise returns `publishActivationMetadataHandoff: null` and incomplete diagnostics.
- `readAndResolveSingleSitePublishActivationMetadataHandoff(input)`: opens a read-only repository transaction, reads the persisted chain, and delegates to the resolver. Read failures return fail-closed incomplete diagnostics instead of ready metadata.
- `buildPublishActivationMetadataResolverWatermark(input)`: deterministic SHA-256 resolver watermark helper over stable JSON.
- `PublishActivationMetadataResolverReadRepository`: default server-only read repository using `begin isolation level repeatable read read only`.

## Input Contract

Required input: tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish stage, publish environment, actor, correlation id, and idempotency key.

Optional expected inputs: publish target ref, publish activation request ref, publish activation decision ref, gate attempt/result ref, handoff watermark, gate input watermark, max gate age, limitations/warnings acceptance policy, evaluated-at timestamp, request id, and test repository/snapshot hooks.

Expected refs may be raw ids or colon-delimited refs; the resolver normalizes the source record id before DB lookup or comparison.

## Read-Only Repository Strategy

The default repository opens exactly one repeatable-read read-only transaction, captures one `transaction_timestamp()`, reads the request/decision/evidence/freshness/source-ref/policy/audit/gate/PTT target rows, commits on success, and rolls back on read failure. It never inserts, updates, deletes, calls writer repositories, calls the MVP-44 evaluator, reads PASR/DDOM live systems, or mutates runtime/provider state.

## Metadata Reconstruction

The resolver reuses the MVP-43 decision read model and gate handoff builders to reconstruct the handoff watermark, candidate ref, runtime artifact ref, publish target ref, request ref, decision ref, launch readiness limitations, and source watermarks. It then reads the persisted MVP-44 gate attempt row and reconstructs the MVP-48 `gateAttemptResultRef`, including gate attempt id/ref, gate result, policy result, request/decision/evidence/policy/audit refs, scope/action/subject, tenant/client/site/migration, candidate/artifact/target refs, publish stage/environment, limitations, and correlation/idempotency metadata.

The MVP-44 gate input watermark is recovered from the persisted gate attempt `causation_id` when it contains the deterministic `single-site-publish-activation-gate-input:<sha256>` marker written by the MVP-44 path.

## Validation And Fail-Closed Behavior

The resolver returns incomplete diagnostics, never ready metadata, for missing request, missing decision, missing launch readiness evidence, missing gate result, wrong scope/action/subject, tenant/client/site/migration mismatch, candidate mismatch, artifact mismatch, target mismatch, stage/environment mismatch, rejected/revoked/expired/superseded decisions, blocked/error/non-allowed gate results, missing/mismatched handoff watermark, missing/mismatched gate input watermark, stale gate age, disabled/retired publish targets, conflicting newer gate attempts, limitations without explicit acceptance, and read failures.

## Contract Relationships

MVP-48 helper: the resolver runs `normalizePublishActivationMetadataHandoff(...)` and only exposes `publishActivationMetadataHandoff` when the helper accepts the object as complete and resolver-specific validations are clean.

MVP-46 guard: unit and integration tests feed resolved metadata into `evaluatePublishActivationEnforcementGuard(...)` in read-only mode and verify pass/block behavior. The resolver does not wire the guard into publish execution.

Limitations carry-forward: `granted_with_limitations` decisions carry readiness and decision limitations from MVP-43/MVP-40. The resolver preserves them in the MVP-48 handoff; complete metadata requires `allowWarningsWithLimitations: true`.

## Boundary Confirmations

No-wiring boundary: no publish route, publish orchestrator, server action, UI, Command Center, Ops Inbox, client portal, worker, or runtime publish caller was modified.

AAF/gate boundary: the resolver reads AAF request/decision/evidence/freshness/policy/audit/gate rows but does not create AAF records and does not call the MVP-44 gate evaluator or AAF gate facade.

PASR boundary: no PASR observer, source reader, read model, observation, or shadow result call is added.

DDOM boundary: no DDOM snapshot, manual trigger/caller, source reader, or live DNS call is added.

Domain/DNS/provider boundary: no Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, production Supabase, or staging Supabase provider call is added.

Billing/Stripe boundary: no billing, Stripe, subscription, entitlement, customer, price, or hosting activation mutation is added.

Publish/rollback/runtime boundary: no publish execution, rollback execution, active pointer mutation, runtime artifact mutation, site version mutation, content override mutation, public runtime behavior, or publish response contract is changed.

## Validation Results

Resolver unit and disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts`
- Result: 11/11 passing.

MVP-48 helper and MVP-46 guard regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- Result: 18/18 passing.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false -p tmp-mvp49-tsconfig.json`
- Result: passed. Temporary config was removed.

Disposable PostgreSQL coverage applies AAF core, granted-with-limitations, MVP-40 evidence type, and PTT migrations. It verifies valid reconstruction, MVP-48 helper completeness, MVP-46 guard consumption, missing decision, rejected decision, wrong candidate/artifact/target, disabled target, conflicting newer gate, unchanged row counts around resolver calls, no new AAF records by the resolver, no new gate attempts by the resolver, no PASR rows, no DDOM rows, and no runtime/publish/rollback/billing/domain mutations.

## Issues Found And Fixed

- The first integration fixture omitted MVP-40 readiness dimension/freshness payload details and was correctly rejected by the MVP-41 bridge. The fixture was expanded to match prior launch readiness evidence integration patterns.
- Expected request/decision/gate refs may be colon-delimited AAF refs rather than raw UUIDs. The resolver now normalizes expected refs to source ids before lookup/comparison.
- Synthetic string refs used in resolver inputs need non-empty source watermarks for MVP-43 input compatibility. The resolver now provides deterministic fallback ref watermarks for plain-string refs.

## Residual Risks

- MVP-44 does not store the semantic gate input watermark as a dedicated first-class column; MVP-49 recovers it from the persisted gate attempt `causation_id`. If older/manual rows lack that marker, the resolver fails closed with `publish_activation_gate_input_watermark_missing`.
- The resolver is not wired into publish execution, so production publish calls still do not receive reconstructed metadata until a future caller milestone adopts it.
- The resolver does not create or refresh stale/missing records. Operators must use the existing upstream workflows to regenerate evidence, decisions, or gate attempts.

## Acceptance

MVP-49 is safe to accept as a read-only metadata resolver core after focused unit tests, disposable PostgreSQL integration tests, MVP-48/MVP-46 regressions, focused no-emit validation, diff hygiene, guardrail searches, and Docker cleanup pass.

Recommended next milestone: add a shadow-only single-site caller integration that invokes `readAndResolveSingleSitePublishActivationMetadataHandoff(...)` before the existing MVP-48 handoff path, still without blocking publish or changing publish response contracts.

No commit or push was performed.
