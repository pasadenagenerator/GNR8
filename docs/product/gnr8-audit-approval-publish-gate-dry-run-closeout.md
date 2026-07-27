# GNR8 AAF-6 Publish Activation Gate Dry-Run Closeout

AAF-6 adds the first runtime-adjacent Audit and Approval Foundation integration for publish activation as a dry-run/shadow gate only.

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Canonical Docs Reviewed

- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`
- `docs/product/gnr8-mvp-boundary.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Runtime Areas Inspected

- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- `apps/platform/gnr8/runtime/hosting-operations/hosting-operations-read-model.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/app/(public)/[[...slug]]/public-route-handlers.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`
- `apps/platform/gnr8/runtime/runtime-store.active-serving-resolution.integration.test.ts`
- `apps/platform/gnr8/runtime/runtime-happy-path.integration.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.test.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.integration.test.ts`

## Final Adapter Location

The adapter lives at `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`.

It is server-only and exposes:

- `AafPublishActivationGateAdapter`
- `evaluatePublishActivationGateDryRun(...)`
- `buildPublishActivationSubjectWatermark(...)`

## Dry-Run And Non-Execution Guarantee

The adapter does not import publish activation, active pointer mutation, rollback, content publish, domain, provider, billing, AI, worker, public runtime, or Command Center action paths.

The adapter only calls `AafActionGateValidatorFacade.validateGate(...)` and returns a structured dry-run result with `dryRunOnly: true`. A successful dry-run result is not publish permission and does not execute publish activation.

## Publish Source Mapping Summary

The dry-run input contract requires canonical caller-supplied refs for:

- tenant/client/site scope when available;
- site id;
- site version id;
- runtime artifact id;
- current active pointer state;
- intended publish target;
- content override published state when relevant;
- domain readiness snapshot;
- launch signoff approval reference when required by policy;
- publish activation approval reference;
- evidence package reference;
- policy id/version;
- actor id and actor role;
- correlation id;
- idempotency key;
- current and evidence source watermarks for every required canonical source ref.

The adapter uses `site_version` as the subject type and the target site version id as the subject id.

## Evidence Requirements Summary

The adapter requires `publish_activation_evidence` and source refs through the AAF facade. The evidence must prove:

- target site version exists by canonical source ref;
- runtime artifact exists by canonical source ref;
- intended publish target is known;
- current active pointer or pre-publish pointer state is known;
- domain readiness is `ready`, `not_applicable`, `manually_excepted`, or explicitly `blocked`;
- launch signoff is present when required by policy;
- publish activation approval is present when required by policy;
- source watermarks are current enough for evaluation.

Missing, wrong-type, expired, stale, failed freshness, superseded, or source-ref-missing evidence remains blocked in dry-run result terms.

## Watermark Requirements Summary

Production-facing adapter inputs must provide current and evidence watermarks for required canonical refs. The adapter does not create fake production watermarks.

Synthetic watermarks appear only in tests and are visibly named with `synthetic_test_...`.

Missing watermarks produce blocked dry-run results. Current/evidence mismatches produce blocked dry-run results and stale evidence reasons.

## Audit/Event Family Decision

AAF contracts already support the `publish` audit family and `publish_activation` approval scope. AAF-6 uses the existing `publish` family for normal publish activation dry-run gate audit events.

The AAF facade was updated compatibly to accept an optional `auditEventFamily` and preserve the prior default of `system failure/audit failure` when no override is supplied.

No new audit family was added.

## Tests Performed

Focused unit tests cover success, missing approval, approval scope overreach, missing/wrong/stale/expired/failed/superseded evidence, missing evidence source refs, missing and mismatched watermarks, audit unavailable behavior, policy write fail-closed behavior, gate write failure fail-closed behavior, and `dryRunOnly: true`.

Disposable DB integration coverage starts local Docker Postgres, applies only the AAF persistence migration, creates synthetic AAF policy/evidence/approval records, evaluates the publish activation dry-run adapter, verifies inert gate attempts and publish-family audit events, and confirms runtime/domain/content tables are not present or required.

## Runtime Non-Integration Confirmation

No runtime action path was intentionally changed:

- publish activation execution unchanged;
- active pointer mutation unchanged;
- rollback unchanged;
- domain/DNS/Vercel/Openprovider unchanged;
- provider execution unchanged;
- Migration Factory unchanged;
- Command Center unchanged;
- Ops Inbox unchanged;
- content publish/rollback unchanged;
- billing/Stripe unchanged;
- AI execution unchanged;
- public runtime serving unchanged;
- worker runtime unchanged.

## External Provider Non-Call Confirmation

AAF-6 added no provider calls. The new adapter has no imports from Vercel, Openprovider, DNS provider, Stripe, AI/provider execution, Supabase route clients, worker, runtime mutation, or public runtime serving code.

The integration test uses only local Docker Postgres and the local AAF migration.

## Remaining Risks

- The adapter depends on future callers to pass accurate canonical source refs and watermarks.
- The current source mapping is contract-level; it does not read runtime tables itself.
- The dry-run result is ready for architectural review, not for blocking enforcement.
- Future enforcement must define who creates publish activation evidence packages from live canonical records and how source watermarks are generated.

## Recommended Next Milestone

AAF-7 should remain non-blocking unless architectural review accepts the AAF-6 contract. The next safe milestone is a read-only evidence package builder for publish activation source refs and watermarks, still not wired into live publish execution.
