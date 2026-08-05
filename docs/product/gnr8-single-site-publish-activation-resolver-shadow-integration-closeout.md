# GNR8 MVP-50 Single-Site Publish Activation Resolver Shadow Integration Closeout

Scope: Shadow-only integration of the MVP-49 publish activation metadata resolver into the existing MVP-47/MVP-48 publish activation shadow guard path.

MVP-50 connects the read-only resolver to `publishApprovedSiteVersion(...)` only through `runPublishActivationEnforcementShadowObservation(...)`. When explicit MVP-48 metadata is absent or incomplete, the shadow helper may invoke the MVP-49 resolver if strict identity is already available. Complete resolved metadata then flows into the existing MVP-46 read-only guard. Resolver missing/incomplete/error and guard pass/block/error remain diagnostics only; publish continues and active pointer behavior and publish response contracts are unchanged.

## Files Reviewed

- MVP-50 mission text.
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Changed

Created:

- `apps/platform/gnr8/runtime/publish-activation-resolver-shadow-observation.test.ts`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`

Updated:

- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Selected Integration Point

The resolver is integrated inside `runPublishActivationEnforcementShadowObservation(...)`, the existing MVP-47/MVP-48 shadow observation helper called by `publishApprovedSiteVersion(...)` after candidate/artifact and pointer-readiness evaluation and before active pointer mutation.

MVP-50 does not add a separate publish decision path. It only selects the metadata source for the existing MVP-46 guard shadow evaluation.

## Feature Flag Behavior

MVP-50 reuses `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`.

Enabled values remain:

- `1`
- `true`
- `enabled`
- `on`
- `shadow`

Default/off behavior:

- no resolver call;
- no MVP-46 guard call;
- no shadow diagnostic from the MVP-50 helper;
- no publish behavior change;
- no publish response contract change.

No blocking feature flag was added. No resolver-specific environment flag was added.

## Resolver Fallback Behavior

Metadata selection order:

1. Complete explicit MVP-48 metadata is preferred and bypasses the resolver.
2. Absent or incomplete metadata may fall back to the MVP-49 read-only resolver only if strict resolver identity is present.
3. Complete resolver output is normalized with the MVP-48 helper and passed to the existing MVP-46 guard shadow path.
4. Resolver incomplete output, resolver errors, and missing identity return shadow-unavailable diagnostics and do not call the guard.

## Resolver Input Construction

The helper constructs resolver input from current publish intent plus explicit resolver identity or raw/incomplete metadata:

- tenant id;
- client id;
- site id;
- migration id;
- candidate site version ref/id;
- runtime artifact ref/id;
- publish stage;
- publish environment;
- actor id/type/role;
- correlation id;
- idempotency key;
- optional expected request/decision/gate/target/watermark refs;
- optional resolver read repository and read policy.

If tenant, client, migration, publish environment, actor role, correlation id, or idempotency key is missing, the resolver is not called. MVP-50 does not invent missing tenant/client/migration identity and does not query broad unrelated tables to guess it.

## Metadata Source Diagnostics

Internal compact diagnostics now include:

- `metadataSource`: `explicit`, `resolved`, `missing`, `incomplete`, or `resolver_error`;
- `resolverStatus`: `not_needed`, `not_available`, `complete`, `incomplete`, or `error`;
- `resolverReason`;
- `missingMetadataCodes`;
- resolver blocker/missing/mismatch/stale codes when unavailable;
- `shadowOnly: true`;
- `enforcementApplied: false`;
- `publishActionBlocked: false`.

Logs keep to safe ids and compact codes. They do not expose broad raw evidence/source/audit payloads.

## Missing, Incomplete, And Error Behavior

Missing identity:

- resolver is not called;
- guard is not called;
- publish continues;
- diagnostics include `publish_activation_metadata_resolver_shadow_*_missing`.

Incomplete explicit metadata:

- resolver fallback is attempted only when strict identity exists in raw metadata or optional resolver input;
- complete resolved metadata reaches the guard;
- incomplete resolver output does not call the guard and publish continues.

Resolver error:

- caught fail-open;
- guard is not called;
- publish continues;
- diagnostics use `metadataSource: "resolver_error"` and `resolverStatus: "error"`.

## Guard Behavior

Guard pass:

- logged as diagnostics;
- publish continues.

Guard block:

- logged as diagnostics with `guardWouldBlockIfWired` from the guard result;
- publish continues;
- `publishActionBlocked` remains `false`.

Guard error:

- caught fail-open;
- publish continues;
- `enforcementApplied` remains `false`.

## Boundary Confirmations

Non-blocking confirmation: MVP-50 never blocks publish from resolver or guard results.

Active pointer behavior: existing `switchActivePointer(...)` call shape/count is unchanged. Resolver/guard shadow observation happens before the same pointer switch calls.

Response contract: `publishApprovedSiteVersion(...)` return payloads are unchanged. Resolver/guard diagnostics remain internal logs/test-observable values only.

AAF/gate boundary: the orchestrator imports only the MVP-49 read-only resolver and MVP-46 read-only guard. It does not call the MVP-44 gate evaluator and does not create AAF approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts.

PASR boundary: no PASR observer/source-reader/read-model/read-model surfacing call is added by MVP-50. Existing PASR shadow observation remains separate.

DDOM boundary: no DDOM snapshot, manual trigger/caller, source reader, or live DNS call is added.

Domain/DNS/provider boundary: no Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, production Supabase, or staging Supabase provider call is added.

Billing/Stripe boundary: no billing, Stripe, subscription, entitlement, customer, price, or hosting activation mutation is added.

Publish/rollback/runtime boundary: no rollback behavior, active pointer behavior, runtime artifact mutation behavior, site version mutation behavior, content override behavior, archive behavior, public runtime behavior, or publish response behavior is changed outside existing publish behavior.

## Validation Results

Focused runtime resolver shadow and existing shadow regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/runtime/publish-activation-resolver-shadow-observation.test.ts apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- Result: 17/17 passing.

MVP-49 resolver, MVP-48 helper, MVP-47 shadow, and MVP-46 guard unit/runtime regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts apps/platform/gnr8/runtime/publish-activation-resolver-shadow-observation.test.ts apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- Result: 47/47 passing.

MVP-49 resolver and MVP-46 guard disposable PostgreSQL integration:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- Result: 2/2 passing.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false -p tmp-mvp50-tsconfig.json`
- Result: passed. Temporary config was removed.

Hygiene:

- `git diff --check`: passed.
- trailing whitespace check over changed files: passed.
- Docker cleanup check after integration tests: passed; no running containers were reported.

Guardrails:

- no blocking enforcement branch added in the MVP-50 diff;
- no gate evaluator invocation from the publish orchestrator;
- no AAF record creation from resolver shadow integration;
- no PASR invocation added by resolver shadow integration;
- no DDOM snapshot creation;
- no provider/DNS/Vercel/Openprovider/Stripe/AI calls added;
- active pointer switch call count remains three, and the switch call shape was not changed;
- publish response payloads remain unchanged, with resolver diagnostics internal to the shadow observation result/logs.

## Issues Found And Fixed

- The implementation now keeps resolver fallback inside the existing MVP-48 helper path rather than adding a parallel publish decision path.
- The resolver identity builder was tightened so MVP-48 derived correlation/idempotency defaults do not count as enough identity for resolver fallback. Resolver fallback requires raw metadata values or explicit resolver input.
- Source guard tests were kept focused on publish boundaries and side effects, not on blocking the new internal optional resolver input names.

## Residual Risks

- Ordinary direct publish callers still do not provide tenant/client/migration/correlation/idempotency resolver identity, so resolver fallback remains unavailable for those calls until a future single-site caller supplies that strict context.
- Shadow diagnostics remain internal logs/test-observable only and are not persisted as a new read model.
- MVP-50 does not refresh stale/missing gate data or create any upstream records; operators must use source-owned workflows to produce valid MVP-40 through MVP-44 records.

## Acceptance

MVP-50 is safe to accept if the final focused/regression tests, no-emit validation, diff hygiene, and guardrail searches pass.

Recommended next milestone: wire strict single-site caller context into the publish activation entry point for eligible MVP migrations, still shadow-only, or design the next explicit blocking-enforcement milestone behind a separate enforcement flag after operator acceptance.

No commit or push was performed.
