# GNR8 MVP-48 Single-Site Publish Activation Metadata Handoff Closeout

Scope: Server-only metadata handoff plumbing for future publish activation enforcement.

MVP-48 adds an optional, additive single-site publish activation metadata handoff contract and read-only normalizer so complete persisted MVP-43/MVP-44 metadata can reach the existing MVP-47/MVP-46 shadow guard path. It remains non-blocking and shadow-only. It does not implement blocking enforcement, gate reevaluation, AAF record creation, PASR invocation, DDOM creation, provider/domain/DNS execution, billing/Stripe mutation, runtime publish behavior changes, UI/API exposure, Command Center actions, Ops Inbox actions, client portal work, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Changed

Created:

- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`

Updated:

- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Caller Inventory

- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`: generic runtime publish API route. It has `siteVersionId`, actor, and optional stage only. It does not currently hold complete MVP-43/MVP-44 metadata, so no caller plumbing was added.
- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`: legacy/batch/migration reconciliation factory path. It calls publish after imported runtime reconciliation and host transfer planning. It is not single-site MVP publish activation metadata truth, so it remains unchanged.
- `apps/platform/app/api/gnr8/admin/_tests/reconcile-imported-runtime-route.test.ts`: test-only dependency double for imported reconciliation.
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`: test-only direct shadow helper coverage.

No direct single-site MVP caller currently has the complete persisted handoff bundle at the publish call site. MVP-48 therefore implements the optional contract and orchestrator consumption but defers caller metadata population.

## Metadata Handoff Contract

New source type:

- `single_site_publish_activation`

New version:

- `mvp-48-publish-activation-metadata-handoff:v1`

The optional handoff includes tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish target ref, publish stage, publish environment, publish activation request ref, publish activation decision ref, MVP-44 gate attempt/result ref, MVP-43 handoff watermark, MVP-44 gate input watermark, optional limitations, optional correlation id, optional idempotency key, optional request id, actor role/type hints, and optional guard policy/repository test hooks.

`publishApprovedSiteVersion(...)` now accepts `publishActivationMetadataHandoff?: PublishActivationMetadataHandoff | null`. The previous internal `publishActivationEnforcementShadowMetadata` remains accepted for compatibility, and both are optional/additive.

## Helper Behavior

`normalizePublishActivationMetadataHandoff(...)`:

- trims and normalizes refs;
- derives safe ids from refs;
- validates required handoff fields for completeness;
- validates handoff identity against the current publish intent when supplied;
- returns complete/incomplete diagnostics with missing and mismatch codes;
- computes a deterministic metadata watermark;
- derives deterministic correlation/idempotency keys when those optional fields are omitted;
- defaults missing actor role to `agency_admin` with a warning code;
- never reads DB, writes DB, calls AAF/PASR/DDOM/runtime/provider services, or evaluates gates.

## Runtime Behavior

Complete metadata:

- is normalized and passed into the existing MVP-46 guard input through the MVP-47 shadow observation;
- preserves `shadowOnly: true`, `enforcementApplied: false`, and `publishActionBlocked: false`;
- does not alter publish success/failure behavior.

Incomplete or absent metadata:

- returns/logs shadow unavailable diagnostics;
- does not call the MVP-46 guard;
- emits safe `publish_activation_metadata_handoff_*` missing/mismatch codes;
- publish continues.

Flag off:

- ignores metadata and returns `null`;
- does not call the helper-derived guard path or the MVP-46 guard;
- preserves current publish behavior.

## Boundary Confirmations

Shadow-only: no guard result blocks publish, and guard errors still fail open.

Active pointer behavior: `switchActivePointer(...)` call count and call shape remain unchanged. The metadata handoff is observed before the existing active pointer calls only.

Response contract: `publishApprovedSiteVersion(...)` return payloads are unchanged; no metadata diagnostics are added to caller responses.

AAF/gate boundary: no MVP-44 gate evaluator is imported or called by the orchestrator/helper. No approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts are created by MVP-48.

PASR boundary: no new PASR observer/source-reader/read-model call is added. Existing PASR-2 shadow wiring remains separate and unchanged.

DDOM boundary: no DDOM snapshot, manual trigger, manual caller, source reader, or live DNS call is added.

Domain/DNS/provider boundary: no Vercel, Openprovider, registrar, DNS, SSL provider, AI provider, production Supabase, or staging Supabase call is added.

Billing/Stripe boundary: no billing, Stripe, subscription, entitlement, customer, price, or hosting activation mutation is added.

Publish/rollback/runtime boundary: no rollback behavior, active pointer mutation behavior, runtime artifact mutation behavior, site version mutation behavior, content override behavior, archive behavior, or public runtime behavior is changed outside existing publish behavior.

## Validation Results

Focused MVP-48 helper/runtime:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- Result: 13/13 passing.

MVP-47 shadow and MVP-46 unit regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- Result: 23/23 passing.

MVP-46 disposable integration regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- Result: 1/1 passing.

Focused TypeScript no-emit:

- `pnpm exec tsc --noEmit --pretty false -p tmp-mvp48-tsconfig.json`
- Result: passed. Temporary config was removed.

Full platform no-emit:

- `pnpm exec tsc --noEmit --pretty false -p apps/platform/tsconfig.json`
- Result: blocked by pre-existing unrelated test typing failures outside MVP-48 changed files.

## Guardrails

Passed:

- `git diff --check`
- trailing whitespace check over changed files
- no blocking enforcement branch added
- no gate evaluator invocation from publish orchestrator/helper
- no AAF record creation from metadata plumbing
- no PASR invocation added by metadata plumbing
- no DDOM snapshot creation
- no provider/DNS/Vercel/Openprovider/Stripe/AI calls added
- active pointer call shape unchanged except surrounding shadow observation metadata
- Docker cleanup check after integration

## Issues Found And Fixed

- The existing MVP-47 metadata shape filled candidate/artifact refs from runtime inputs. MVP-48 now requires explicit handoff refs for complete metadata so incomplete caller handoffs remain unavailable instead of silently becoming partial guard inputs.
- Optional correlation/idempotency keys are now derived from a deterministic metadata watermark, matching the MVP-48 contract while still satisfying MVP-46 guard input requirements.
- Initial focused no-emit command used ad hoc path flags that did not honor `@/*`; validation was rerun with a focused temporary tsconfig extending the platform config.

## Residual Risks

- No current direct production caller supplies complete MVP-43/MVP-44 metadata, so enabling shadow still reports unavailable for ordinary publish calls until a future single-site caller carries the persisted bundle.
- Shadow diagnostics remain logs/test-observable only and are not persisted as a new read model.
- Actor role defaults to `agency_admin` when omitted; future caller plumbing should pass the exact actor role from the single-site workflow.

## Acceptance

MVP-48 is safe to accept as non-blocking metadata handoff plumbing.

Recommended next milestone: add a single-site publish activation caller handoff source that already has the persisted MVP-43 handoff and MVP-44 gate result, and pass that complete bundle into `publishApprovedSiteVersion(...)` without reevaluating gates or changing publish behavior.

No commit or push was performed.
