# GNR8 MVP-52 Single-Site Publish Wrapper Orchestrator Shadow Closeout

Scope: Server-only, default-off, shadow-only single-site publish wrapper/orchestrator core.

MVP-52 adds a narrow wrapper at `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`. It validates strict single-site publish identity, resolves complete publish activation metadata through the MVP-49 read-only resolver, normalizes the result through the MVP-48 handoff helper, and in execute mode calls the existing `publishApprovedSiteVersion(...)` with the complete `publishActivationMetadataHandoff`. The wrapper is direct-server-code/test callable only; no route, UI, Command Center, Ops Inbox, client portal, worker, or API wiring was added.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`

## Files Created Or Updated

- Created `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- Created `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- Created `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- Created `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- Updated `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migrations were added. `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, the generic runtime publish API route, and imported runtime reconciliation were not modified.

## API Summary

The wrapper exports:

- `publishSingleSiteApprovedCandidateShadow(input, dependencies?)`
- `prepareSingleSitePublishContext(input, dependencies?)`
- `buildSingleSitePublishContextWatermark(input)`

The main output statuses are `dry_run_ready`, `published_via_existing_orchestrator`, `preflight_blocked`, `resolver_unavailable`, and `orchestrator_failed`.

## Input Contract

Required input: tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish stage, publish environment, actor, correlation id, and idempotency key.

Optional expected refs: publish target, launch readiness evidence, publish activation request, publish activation decision, gate attempt/result, handoff watermark, gate input watermark, limitations/warnings policy, max gate age, evaluated-at timestamp, request id, repository test hook, dry-run flag, and dependency-injected fake publish orchestrator for tests.

Execution is default-off. Callers must pass `mode: "shadow_publish"` or `enabled: true`; otherwise the wrapper fails closed before resolver or publish calls.

## Strict Context Preparation

The wrapper validates required identity and candidate/artifact refs before calling the resolver. It validates publish stage to `shadow`, `canary`, or `production`, requires actor id/role, and does not infer tenant/client/migration/request/decision/gate refs from labels or generic runtime state.

The wrapper calls the MVP-49 resolver read-only. Normal success requires resolver completeness and a complete MVP-48 handoff normalization result. Explicit expected ref mismatches are checked again after resolver output, including publish target, launch readiness evidence package id, request, decision, gate attempt, handoff watermark, and gate input watermark.

## Metadata Handoff Behavior

Complete resolver output is normalized through `normalizePublishActivationMetadataHandoff(...)`. The publish orchestrator input includes `publishActivationMetadataHandoff` and sets `publishActivationEnforcementShadowEnabled: true` so existing MVP-47/MVP-50 diagnostics can observe the complete metadata. The wrapper sets `publishActivationShadowGateEnabled: false`, so it does not invoke PASR shadow observation.

## Dry-Run Behavior

Dry-run prepares and resolves strict context but does not call `publishApprovedSiteVersion(...)`. It returns the exact publish orchestrator input that would be used, with `dryRun: true`, `publishes: false`, and `runtimeMutation: false`.

## Shadow Publish Behavior

Execute mode calls only the existing publish orchestrator. It does not inspect guard output, block on guard output, or change the existing publish response contract. Active pointer, artifact, site-version state, archive, and publish safety behavior remain exactly those of `publishApprovedSiteVersion(...)`.

If context is incomplete or resolver is unavailable, the wrapper returns a wrapper-only preflight result and does not call the publish orchestrator.

## Boundaries

Generic caller non-change: the generic runtime publish route and imported runtime reconciliation were reviewed and left untouched.

Active pointer boundary: the wrapper has no direct active pointer/runtime-store mutation calls. Any pointer mutation can only occur inside the existing publish orchestrator when execute mode calls it.

Response contract boundary: generic publish route response shapes are unchanged. Wrapper output is a new server-only wrapper contract.

AAF/gate boundary: the wrapper does not evaluate gates and does not create AAF approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts.

PASR boundary: the wrapper does not call PASR observer/source reader/read model and explicitly disables the existing PASR shadow gate switch for its publish orchestrator call.

DDOM boundary: the wrapper does not create DDOM snapshots, call DDOM manual trigger/caller paths, or call live DNS.

Domain/DNS/provider boundary: the wrapper does not call Vercel, Openprovider, registrars, DNS providers, SSL providers, AI providers, production Supabase, or staging Supabase.

Billing/Stripe boundary: the wrapper does not mutate billing, Stripe, subscriptions, entitlements, customers, prices, or hosting source truth.

Publish/rollback/runtime boundary: the wrapper does not implement rollback changes, content override changes, runtime artifact mutation, site-version mutation, publish target mutation, or active pointer mutation outside the existing publish orchestrator.

## Validation

Wrapper unit tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- Result: pass, 10 tests.

Wrapper disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- Result: pass, 1 test.
- Coverage: persisted chain resolves context, dry-run does not publish, execute calls fake orchestrator with complete metadata, incomplete persisted chain blocks before fake orchestrator, wrapper calls are row-count read-only, no AAF/PASR/DDOM/runtime/publish/rollback/billing/domain rows are created by the wrapper, and generic route/reconciliation source remain free of wrapper imports.

MVP-48/MVP-49/MVP-50 regressions:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts apps/platform/gnr8/runtime/publish-activation-resolver-shadow-observation.test.ts`
- Result: pass, 24 tests.

MVP-49 disposable PostgreSQL resolver regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts`
- Result: pass, 1 test.

Focused TypeScript no-emit:

- `pnpm exec tsc -p /private/tmp/gnr8-mvp52-tsconfig.json --pretty false`
- Result: pass after replacing the temporary config with a standalone focused config over the MVP-52 files and their import graph.

Docker cleanup:

- `docker ps --filter name=gnr8-mvp52-publish-wrapper --format '{{.Names}}'`
- Result: no running disposable MVP-52 containers.

## Guardrails

Guardrail source checks are covered in unit tests and final shell searches:

- generic publish route unchanged by MVP-52;
- imported runtime reconciliation unchanged by MVP-52;
- no blocking enforcement branch in the wrapper;
- no gate evaluator invocation;
- no AAF record creation;
- no PASR invocation;
- no DDOM snapshot creation;
- no provider/DNS/Vercel/Openprovider/Stripe/AI calls;
- no direct active pointer/runtime mutation in the wrapper;
- no SQL migration added.

## Issues Found And Fixed

- The wrapper source guardrail test initially overmatched required output flag names such as `createsDdomSnapshots: false`; the regex was narrowed to actual DDOM call/import names.
- Focused typecheck initially inherited platform-wide test files from the app tsconfig and surfaced unrelated existing type debt. A standalone temporary typecheck config was used for MVP-52 files and their import graph.
- Test-only limitations fixtures were adjusted to match the current MVP-48 limitations type.

## Residual Risks

- The wrapper is not wired to any production caller, by design. Adoption still requires a later milestone to choose a caller surface and operational workflow.
- Execute mode still performs the existing publish behavior when called directly by server code; this is intentional and restricted by explicit mode plus strict complete metadata.
- Blocking enforcement remains unimplemented. Guard results remain shadow diagnostics only.

## Safe-To-Accept Decision

MVP-52 is safe to accept as a server-only, default-off, shadow-only wrapper/orchestrator core. It creates no routes, no UI exposure, no SQL migrations, no AAF records, no gate reevaluation, no PASR/DDOM/provider/billing/domain calls, and no direct runtime mutation outside the existing publish orchestrator.

Recommended next milestone: design or implement the next explicit single-site publish activation caller surface for eligible MVP migrations, still preserving default-off controls and without changing generic publish callers; blocking enforcement should remain a separate milestone behind its own reviewed flag and acceptance criteria.
