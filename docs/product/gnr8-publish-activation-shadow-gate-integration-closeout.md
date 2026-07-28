# GNR8 PASR-2 Publish Activation Shadow Gate Integration Closeout

PASR-2 implements the first non-enforcing publish activation shadow gate integration. The live publish path can now observe PASR/AAF publish activation readiness when explicitly enabled, while preserving the existing publish activation outcome.

## Files Reviewed

AAF/PASR:
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`

DDOM/PTT:
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`

Publish/runtime:
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- content publish/rollback routes
- runtime active pointer and runtime artifact activation logic

Docs:
- AAF-1 through AAF-8 closeouts and architecture docs
- DDOM-1 through DDOM-6 closeouts and architecture docs
- PTT-1 closeout
- PASR-1 closeout
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- publish/rollback/domain governance docs
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.integration.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Selected Publish Boundary

Selected boundary:
- `publishApprovedSiteVersion(...)` in `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- immediately after artifact persistence and candidate validation have succeeded
- immediately before the existing `switchActivePointer(...)` calls
- also before the existing already-active safe no-op return

Why this is the narrowest safe point:
- the runtime artifact id is known and persisted;
- the site version artifact binding is present;
- the intended publish stage is resolved;
- the current active pointer can be read by PASR;
- the active pointer has not yet been mutated;
- the hook can observe both first-publish and already-published reactivation paths without changing branch outcomes.

Inputs available there:
- site id
- site version id
- runtime artifact id
- intended publish stage
- actor
- optional tenant/client shadow scope
- runtime ownership scope derivable when the flag is enabled

Canonical refs available through PASR:
- site version
- runtime artifact
- active pointer
- publish target
- existing DDOM readiness snapshot
- content override aggregate
- launch signoff approval when required
- publish activation approval when present

Watermarks available through PASR/evidence builder:
- site version update/hash watermark
- runtime artifact bundle watermark
- active pointer update/hash watermark
- publish target source watermark
- DDOM readiness source watermark
- content override aggregate watermark
- approval timeline aggregate watermark when present

Missing data is represented as shadow output, not publish denial:
- missing source truth entries
- DDOM snapshot `missing`
- publish target `missing`
- approval `missing`
- readiness `not_ready` or `unavailable`
- limitation recommending manual DDOM snapshot trigger where appropriate

## Shadow Adapter

Adapter:
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`

The adapter is server-only and uses:
- `AafPublishActivationSourceReader` for read-only PASR source truth
- `buildPublishActivationEvidencePackage(...)` for AAF non-executing evidence
- `AafPublishActivationGateAdapter.evaluatePublishActivationGateDryRun(...)` for dry-run gate evaluation

The adapter never imports runtime mutation, active pointer mutation, rollback, content publish/rollback, DNS/Vercel/Openprovider/provider, Stripe, AI, DDOM caller, or DDOM trigger code.

## Feature Flag

Execution control:
- env flag: `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE`
- accepted enabled values: `1`, `true`, `enabled`, `on`, `shadow`
- absent or any other value: disabled

Disabled behavior:
- `runPublishActivationShadowGateObservation(...)` returns `null`
- no observer call occurs
- no extra PASR/AAF source read, evidence build, gate attempt, or log result is produced
- publish behavior remains the same as before

## Publish Integration

The orchestrator calls `runPublishActivationShadowGateObservation(...)` only when enabled. The call is awaited before pointer switch, but all observer errors are caught and logged as failed-open shadow observations.

The publish result contract is not changed. Shadow output is logged/test-observable only in PASR-2. This avoids a public API shape change while proving the integration can observe real publish activation inputs.

## DDOM Snapshot Behavior

Existing snapshot:
- PASR reads the latest matching row from `public.gnr8_ddom_readiness_snapshots`
- the observer includes DDOM snapshot status, source ref, source watermark, blockers, warnings, and readiness implication
- no new snapshot is created

Missing snapshot:
- PASR reports `missing_ddom_snapshot`
- evidence marks `domainReadiness` as missing source truth
- shadow result sets DDOM status to `missing`
- shadow result recommends `run_manual_ddom_readiness_snapshot_trigger`
- publish is not blocked
- no DDOM caller or trigger is imported or called

Stale snapshot:
- PASR maps stale DDOM to blocked domain readiness with stale freshness
- shadow result reports stale source truth and recommends manual snapshot refresh
- publish is not blocked

## Approval Boundary

PASR-2 preserves AAF approval semantics:
- launch signoff is not publish activation approval
- client review is not publish activation approval
- domain readiness is not publish activation approval
- domain exception is not publish activation approval
- AI advisory acceptance is not publish activation approval
- Command Center/Ops Inbox state is not publish activation approval

If publish activation approval is missing, the AAF dry-run gate may return `approval_required`, but the publish path treats that as observation only.

## Non-Blocking Guarantee

The shadow result always includes:
- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`

The orchestrator catches observer failures and returns `null` from the shadow hook. It does not throw shadow errors into publish activation and does not alter pointer switch, safety check, transition, archive, rollback, domain activation, or response behavior.

## Provider Non-Call Confirmation

PASR-2 added no calls/imports to:
- Vercel APIs
- Openprovider
- DNS live lookup/resolver/provider helpers
- registrars
- Stripe
- AI providers
- DDOM manual caller/trigger
- Command Center UI
- Ops Inbox UI
- workers
- public runtime serving

## Validation Results

Unit tests passed:
- AAF writer unit tests
- AAF policy/gate facade unit tests
- AAF publish activation dry-run adapter unit tests
- AAF publish activation evidence builder unit tests
- PASR source reader unit tests
- DDOM-5 caller unit tests
- DDOM-6 trigger unit tests
- PASR-2 shadow observer unit tests
- PASR-2 runtime shadow hook unit tests

Integration tests passed:
- AAF writer disposable DB integration
- AAF policy/gate facade disposable DB integration
- AAF publish activation dry-run adapter disposable DB integration
- AAF publish activation evidence builder disposable DB integration
- PASR source reader disposable DB integration
- DDOM-5 caller disposable DB integration
- DDOM-6 trigger disposable DB integration
- PTT disposable DB integration
- PASR-2 shadow observer disposable DB integration

Focused TypeScript validation passed:
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- PASR-2 observer tests
- PASR-2 integration test
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- PASR-2 runtime hook test

Static validation passed:
- `git diff --check`
- trailing whitespace check on changed/new files
- forbidden provider/DDOM trigger/import guardrails
- no SQL migrations created or changed
- no worker, Command Center, Ops Inbox, public runtime, rollback route, or rollback switch files changed
- Docker containers stopped after disposable DB tests

## Issues Found

- The live publish boundary does not expose tenant/client scope directly. PASR-2 resolves it only when the feature flag is enabled, using existing runtime ownership/site summary reads. If unavailable, the shadow observation logs `missing_publish_activation_shadow_scope` and publish continues.
- Publish activation approval is normally absent from the current publish request path. PASR-2 therefore commonly reports `approval_required` in shadow mode. This is expected and non-blocking.
- Full platform typecheck was not expanded because focused validation passed and prior phases documented unrelated full-app type drift.

## Residual Risks

- Shadow output is currently internal/logged, not returned in the publish API response.
- AAF dry-run/evidence records can be created when the flag is enabled; these are shadow/inert records but still need operator interpretation.
- Enforcement readiness depends on future work to define response exposure, operator workflow, approval collection, and enforcement rollout.

## Safety Conclusion

PASR-2 is safe to accept as a shadow-only observer. It reads real source truth through PASR, reads existing DDOM snapshots only, builds AAF evidence, evaluates the AAF dry-run gate, surfaces missing/stale/approval limitations, and does not change publish activation outcome.

Publish enforcement may not begin yet. The next safe milestone is PASR-3: operator-visible shadow result surfacing and evidence review workflow design, still without blocking publish.
