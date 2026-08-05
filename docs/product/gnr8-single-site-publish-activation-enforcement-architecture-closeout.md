# GNR8 Single-Site Publish Activation Enforcement Architecture Closeout

Phase: MVP-45
Date: 2026-08-05
Scope: Documentation-only architecture and safety plan for future consumption of MVP-44 gate results inside single-site publish activation.

MVP-45 created architecture docs for a future enforcement guard. It did not implement enforcement, route wiring, publish execution, runtime mutation, rollback, provider calls, billing/domain execution, UI/API changes, Command Center actions, Ops Inbox actions, client portal exposure, commits, or pushes.

## Files Reviewed

- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `docs/architecture/gnr8-single-site-launch-readiness-evidence-architecture.md`
- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-runtime-contract.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-fail-closed-policy.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Selected Future Integration Point

Future enforcement should be inserted inside `publishApprovedSiteVersion(...)` after candidate/artifact validation and pointer-readiness evaluation, and before `switchActivePointer(...)`.

This location has the candidate site version, runtime artifact, publish stage, active pointer, and validation result needed to bind the MVP-44 result to the exact pending active pointer mutation. It is safer than runtime-store primitives because generic pointer/artifact helpers do not know the single-site MVP-43/MVP-44 approval chain and are shared with rollback, migration, tests, and maintenance paths.

Current code can prepare or refresh artifacts before this point. MVP-45 therefore defines enforcement as protection for active pointer mutation/public activation, not as retroactive protection for every candidate-preparation write in the current orchestrator.

## Enforcement Objective

Before active pointer switch, future enforcement must verify that the candidate has a valid, persisted, matching MVP-44 publish activation gate result. If the gate result fails or cannot be proven current, publish must not proceed to pointer mutation.

Enforcement is not approval creation, evidence creation, readiness collection, domain/billing/provider execution, PASR/DDOM execution, rollback execution, UI surfacing, or client exposure.

## Feature Flag Strategy

Required future pattern:

- default off;
- shadow/log-only;
- enforce for internal single-site migrations only;
- enforce for all eligible single-site publishes;
- emergency bypass policy.

Recommended names:

- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT`
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_BYPASS`

## Enforcement Input Contract

Future enforcement requires tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish target ref, publish stage/environment, publish activation decision ref, MVP-44 gate attempt/result ref, MVP-43 handoff watermark, MVP-44 gate input watermark, actor, correlation id, idempotency key, and optional request id.

## Gate Result Consumption Rules

Allowed continuation requires `allowed` or an explicitly documented canonical success equivalent, exact identity match, fresh gate attempt, matching handoff and gate input watermarks, no conflicting newer gate result, no revoked/superseded/expired approval on optional reread, and no disabled/retired publish target on optional reread.

`warning` or limited success is allowed only when policy explicitly permits it and limitations are carried forward. `not_required_by_policy` fails closed by default for MVP unless a later policy explicitly defines it.

## Fail-Closed Policy

The future guard blocks on missing, blocked, stale, wrong-candidate, wrong-artifact, wrong-target, wrong-stage, wrong-tenant/client/site/migration, approval revoked/superseded/expired, missing/mismatched handoff watermark, missing/mismatched gate input watermark, policy mismatch, repository failure, idempotency drift, unsupported evaluator version, and conflicting newer gate results.

## Source Reread Policy

Recommended MVP policy:

- consume the persisted gate result;
- verify identity/watermark/freshness;
- optionally reread latest AAF request/decision/revocation/supersession/gate rows in a read-only transaction;
- optionally reread current publish target status;
- do not recreate readiness evidence;
- do not create DDOM snapshots;
- do not invoke PASR for enforcement;
- do not call providers, DNS, Vercel, Openprovider, registrars, SSL, Stripe, billing, hosting, AI, production Supabase, or staging Supabase.

## Response Behavior

Pass preserves the existing success response as much as possible. Block returns a structured operator-safe response before pointer mutation, with stable blocker codes and safe remediation hints. Raw sensitive AAF/source/provider/billing refs remain internal diagnostics and are not exposed to broad callers or client-facing surfaces.

## Audit And Observability

Future behavior should log/audit successful consumption, blocked consumption, shadow diagnostics, and bypass events. It should link correlation/idempotency metadata to the publish request, MVP-43 handoff, MVP-44 gate attempt, approval decision, candidate, artifact, and target.

No approval decision creation and no new gate attempt creation are allowed unless a separate reevaluation milestone explicitly designs that write path.

## Rollback Relationship

Enforcement failure happens before publish, so rollback should not be invoked for enforcement blocks. If publish fails after enforcement passes, existing publish failure/rollback strategy applies. Rollback readiness evidence is prerequisite evidence, not automatic rollback execution, and gate pass does not guarantee rollback success.

## Domain And DDOM Boundary

DDOM readiness must be produced by DDOM workflows before launch readiness/gate evaluation. Future enforcement must not create DDOM snapshots, call DDOM triggers/callers, call live DNS, call Vercel/Openprovider/registrars/SSL providers, or treat PASR shadow as DDOM truth.

## Billing And Stripe Boundary

Billing/hosting/Stripe readiness must be source-owned evidence before launch readiness/gate evaluation. Future enforcement must not create subscriptions, activate hosting, call Stripe, mutate entitlements, or close the known site-scoped billing/hosting source-truth gap inside publish activation.

## PASR Boundary

PASR remains non-enforcing diagnostic/shadow evidence. Future enforcement consumes MVP-44 persisted gate results, not PASR shadow readiness.

## Publish And Runtime Boundary

Future enforcement protects active pointer mutation in `publishApprovedSiteVersion(...)`. It must not be placed in generic runtime-store primitives, public runtime rendering, content publish/rollback, or rollback switch.

## Future MVP-46 Test Plan

MVP-46 should test the read-only guard core for:

- disabled behavior preserving current allow shape;
- shadow diagnostics without blocking;
- allowed gate result validation;
- missing/stale/wrong candidate blocking;
- wrong artifact/target/stage/identity blocking;
- approval revoked/superseded/expired blocking when reread is enabled;
- publish target disabled/retired blocking when reread is enabled;
- repository failure fail-closed;
- idempotency replay and drift behavior;
- no DDOM, PASR, provider, billing, Stripe, AAF request, AAF decision, publish, rollback, runtime pointer, route, worker, Command Center, Ops Inbox, public runtime, or client portal side effects.

## Recommended Next Milestones

1. MVP-46: read-only enforcement guard core that consumes MVP-44 gate result, no route wiring.
2. MVP-47: publish orchestrator shadow integration, no blocking.
3. MVP-48: publish orchestrator blocking enforcement behind feature flag.
4. MVP-49: publish rehearsal with disposable/runtime fixture.
5. Later: operator UI surfacing and 20-site validation.

## Risks Found

- Current publish orchestrator may create/bind/refresh artifacts before the future pre-pointer enforcement point for approved versions.
- The publish route currently performs domain reconciliation/activation after publish success; future blocked responses must stop before that route-level domain behavior runs.
- Billing/hosting source truth remains a known readiness gap and must not be filled by enforcement.
- Rollback readiness evidence remains separate from rollback mechanics.
- PASR shadow and MVP-44 gate results can be confused unless docs and future naming keep them separate.
- Generic runtime-store mutation helpers are too broad for AAF enforcement.

## Implementation May Begin Decision

MVP-46 implementation may begin after MVP-45 is accepted, limited to a read-only guard core with no route wiring and no blocking publish behavior. MVP-47/MVP-48 must remain separate milestones for shadow and blocking orchestrator integration.

## Validation

MVP-45 validation is documentation/static only:

- all expected docs exist and are readable;
- canonical index references all MVP-45 docs;
- required sections and boundary statements are present;
- `git diff --check`;
- trailing whitespace check over new/updated Markdown files;
- changed-file scope check confirms only allowed Markdown/index files changed;
- no TypeScript, JavaScript, SQL, route, worker, provider, runtime, billing, domain, publish, rollback, Command Center, Ops Inbox, public runtime, or client portal files changed.

No runtime behavior changed. No provider calls were made. No commit or push was performed.
