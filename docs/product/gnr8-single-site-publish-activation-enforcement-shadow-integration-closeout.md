# GNR8 MVP-47 Single-Site Publish Activation Enforcement Shadow Integration Closeout

Scope: Shadow-only integration of the MVP-46 read-only publish activation enforcement guard inside the existing publish activation flow.

MVP-47 wires a diagnostics-only guard observation into `publishApprovedSiteVersion(...)`. It does not block publish, does not alter active pointer mutation, does not change publish success/failure behavior, does not change the publish response contract, does not create AAF records, does not evaluate gates, does not call PASR for enforcement, does not create DDOM snapshots, does not call providers, and does not mutate billing/domain/runtime behavior outside the existing publish path.

## Files Reviewed

- MVP-47 mission text.
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-runtime-contract.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-fail-closed-policy.md`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- runtime-store active pointer, artifact, site version, audit, transition, and archive paths.
- PASR-2 shadow integration pattern in `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`.
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Changed

- Updated `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- Added `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- Added `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- Updated `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Selected Integration Point

MVP-47 integrates inside `publishApprovedSiteVersion(...)` after candidate/artifact validation and after pointer-readiness evaluation, immediately before the existing `switchActivePointer(...)` calls.

The already-published safe no-op branch is also observed before returning the existing `PUBLISH_ALREADY_ACTIVE_SAFE_NOOP` response. This mirrors PASR-2 and keeps idempotent publish activation observable without changing the branch outcome.

This point was selected because the runtime artifact is persisted, the candidate/artifact lineage has passed, the publish stage is resolved, the active pointer has been read, and no active pointer mutation has occurred yet.

## Feature Flag Behavior

New flag:

- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`

Enabled values:

- `1`
- `true`
- `enabled`
- `on`
- `shadow`

Absent, empty, or any other value is disabled.

Default/off behavior:

- no MVP-46 guard call;
- no guard repository read;
- no enforcement shadow diagnostic log;
- no publish response change;
- no publish behavior change.

## Guard Input Construction

The shadow helper accepts internal `PublishActivationEnforcementShadowMetadata` and constructs the MVP-46 guard input only when the flag is enabled and required metadata is present.

Required metadata includes tenant id, client id, migration id, candidate site version ref, runtime artifact ref, publish target ref, publish environment, publish activation decision ref, persisted MVP-44 gate attempt/result ref, MVP-43 handoff watermark, MVP-44 gate input watermark, actor role, correlation id, and idempotency key.

The orchestrator supplies the known publish intent fields from the current publish path: site id, site version id, runtime artifact id, actor, and resolved publish stage. It does not reread MVP-43/MVP-44 state, does not evaluate gates, and does not derive approval from launch readiness.

## Missing Metadata Behavior

If required metadata is missing, MVP-47 returns/logs an internal shadow-unavailable diagnostic and does not call the MVP-46 guard. Publish continues exactly as it would have without MVP-47.

Missing metadata emits compact blocker codes such as `publish_activation_enforcement_shadow_gate_attempt_result_ref_missing` and preserves:

- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`

## Guard Pass, Block, And Error Behavior

Guard pass is logged as `guardMode: "pass"` and `guardAllowed: true`; publish continues.

Guard block is logged as `guardMode: "block"` and `guardAllowed: false`; publish still continues. The shadow diagnostic records `guardWouldBlockIfWired: true`, but the MVP-47 envelope always reports `publishActionBlocked: false`.

Guard error or thrown read/evaluation failure is caught, logged as `guardMode: "error"`, marked unavailable, and publish continues. MVP-47 does not retry by creating evidence, gate attempts, DDOM snapshots, PASR reads, or provider calls.

MVP-47 never sets `enforcementApplied: true`.

## Logging And Diagnostics

Diagnostics use compact `console.info` records under `[gnr8.single-site.mvp47]`.

Logged fields include shadow enabled/available state, guard mode, guard reason, blocker codes, matched ref count, safe ids, correlation id, idempotency key, `shadowOnly: true`, `enforcementApplied: false`, and `publishActionBlocked: false`.

The log uses safe ids only: site id, site version id, runtime artifact id, publish target id, gate attempt id, and publish activation decision id. It does not broadly expose raw source evidence payloads.

## Boundary Confirmations

Non-blocking confirmation: MVP-47 never throws guard pass/block results into the publish flow and catches guard errors fail-open.

Active pointer behavior: the existing `switchActivePointer(...)` call shape is unchanged. MVP-47 only adds a shadow observation before those calls.

Response contract: `publishApprovedSiteVersion(...)` return payloads are unchanged.

AAF/gate boundary: MVP-47 calls only the MVP-46 guard read/evaluate API when metadata is complete. It does not call MVP-44 gate evaluator and does not create AAF approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts.

PASR boundary: MVP-47 does not add PASR observer/source-reader/read-model invocation. Existing PASR-2 shadow wiring remains separate and unchanged.

DDOM boundary: MVP-47 does not create DDOM snapshots, call DDOM manual triggers/callers, or call live DNS.

Domain/DNS/provider boundary: MVP-47 adds no Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, production Supabase, or staging Supabase calls.

Billing/Stripe boundary: MVP-47 adds no billing, Stripe, subscription, entitlement, customer, price, or hosting activation mutation.

Publish/rollback/runtime boundary: MVP-47 does not change publish execution, rollback behavior, runtime artifact writes, site-version state transitions, content overrides, active pointer mutation, or archive behavior outside the existing publish flow.

## Validation Results

Focused runtime tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- Result: 7/7 passing.

Focused runtime shadow regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- Result: 10/10 passing.

MVP-46 guard unit and disposable integration regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- Result: 13/13 passing.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit -p tmp-mvp47-tsconfig.json`
- Result: passed with a temporary focused config that was removed after validation.

Final hygiene and guardrails:

- `git diff --check`
- trailing whitespace check over changed files
- guardrail search proving no blocking enforcement branch
- guardrail search proving no gate evaluator invocation from publish orchestrator
- guardrail search proving no AAF record creation from MVP-47 shadow integration
- guardrail search proving no new PASR invocation from MVP-47 shadow integration
- guardrail search proving no DDOM snapshot creation
- guardrail search proving no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- guardrail search proving active pointer call shape remains unchanged except surrounding shadow observation
- Docker cleanup check after disposable integration test

## Issues Found And Fixed

- The first `tsx` run hit sandbox IPC restrictions. The focused tests were rerun with approved escalation for local test-runner IPC.
- Running tests from `apps/platform` resolved aliases but broke one existing MVP-46 source-audit path assumption. The guard regression was rerun from the repo root with `--tsconfig apps/platform/tsconfig.json`, and passed.
- Focused no-emit initially missed app path mappings, then inherited `composite` from the solution config. A temporary standalone focused tsconfig was used and removed.
- The new test initially captured async guard input in a way TypeScript narrowed to `never`; the fixture now stores received guard inputs in an array.

## Residual Risks

- No current publish caller supplies complete MVP-43/MVP-44 enforcement metadata by default, so with the new flag enabled most existing calls will report shadow unavailable instead of invoking the guard.
- Shadow diagnostics are internal logs/test-observable only and are not persisted as a new first-class read model.
- MVP-47 does not implement blocking enforcement, bypass persistence, gate reevaluation, PASR wiring, DDOM production, or billing/domain source-truth closure.

## Acceptance

MVP-47 is safe to accept as a shadow-only integration.

Recommended next milestone: MVP-48 publish activation blocking enforcement behind an explicit enforcement feature flag, using the same pre-pointer integration point and only after callers can supply complete persisted MVP-43/MVP-44 metadata.

No commit or push was performed.
