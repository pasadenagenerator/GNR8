# GNR8 Single-Site Launch Readiness Evidence Builder Closeout

Phase: MVP-40
Date: 2026-08-04
Scope: Server-only, non-executing AAF evidence builder core for persisted single-site launch readiness records.

MVP-40 creates/reuses an AAF evidence package that represents an existing launch readiness record and its dimensions, refs, blockers, limitations, freshness, closeout, and publish activation handoff refs. It does not create publish activation approval requests, approval decisions, action gate attempts, PASR observations, DDOM snapshots, publish activation enforcement, publish execution, rollback, provider calls, billing/Stripe/domain mutation, runtime mutation, UI/API routes, workers, Command Center, Ops Inbox, client portal exposure, commit, or push.

## Files Reviewed

- `docs/architecture/gnr8-single-site-launch-readiness-evidence-architecture.md`
- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Evidence Builder

Location:

- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`

Public APIs:

- `buildLaunchReadinessEvidencePackage(input)`
- `computeLaunchReadinessEvidenceSemanticWatermark(input)`
- `stableLaunchReadinessEvidenceJson(value)`
- `hashLaunchReadinessEvidenceValue(value)`

Evidence type:

- `single_site_launch_readiness_evidence`

Subject:

- subject type: `single_site_launch_readiness_package`
- subject id: launch readiness record id
- action context: `prepare_publish_activation_review`

AAF vocabulary migration:

- Required and added narrowly because the existing AAF constraints and runtime contracts did not include `single_site_launch_readiness_evidence`.
- Migration only expands `gnr8_aaf_approval_scope_definitions.required_evidence_type` and `gnr8_aaf_evidence_packages.package_type` CHECK constraints.

## Input Contract

Required input includes tenant id, client id, site id, migration id, launch readiness record id, actor, correlation id, and idempotency key.

Optional input includes causation id, request id, policy version, privacy/retention labels, expected readiness status, expected semantic source watermark, closeout-required policy, accepted-limitation freshness policy, and publish activation handoff refs.

## Evidence Payload

The canonical JSON payload item summarizes:

- package header, identity, readiness status, dimension statuses, required and optional dimensions
- freshness summaries for the readiness record, dimensions, closeout, and handoff refs
- missing/stale/blocked dimensions
- accepted limitations and unresolved non-P0 blockers
- source refs grouped by role
- source watermarks
- readiness closeout and publish activation handoff refs
- explicit non-approval/non-publish boundary flags

Source refs included:

- launch readiness record and closeout refs
- launch approval decision refs
- content approval decision refs
- client approval decision refs when required
- improved candidate site version and runtime artifact refs
- publish target refs
- DDOM readiness snapshot refs
- domain/DNS/operator evidence refs when present/required
- Vercel/custom-domain/SSL stored-state refs when present/required
- billing/subscription/hosting entitlement refs
- Stripe refs where applicable
- rollback readiness refs
- preview smoke QA refs
- limitation, blocker, and audit event refs
- PASR diagnostic refs as non-enforcing diagnostics only
- publish activation handoff refs as refs only

## Freshness Behavior

The builder fails closed before AAF writes when the readiness record is stale/missing/unknown, when required dimensions are stale/missing/unknown, or when required refs are missing. Required freshness can pass as `partial_timeline` only when the dimension is `ready_with_limitations` and the limitation is encoded on the dimension or as an accepted limitation blocker. Optional PASR diagnostic limitations do not make aggregate freshness partial or enforcing.

The AAF writer pattern persists one aggregate freshness check row for the evidence package. Per-source freshness rows/checks are carried in the canonical payload and source-ref metadata.

## Idempotency And Drift

The semantic watermark is stable over identity, readiness record id/source watermark, dimension statuses/freshness/watermarks, source refs, blockers, limitations, closeout refs, and handoff refs.

It excludes DB insertion timestamps, actor display names, correlation id, log messages, and non-semantic ordering. Same idempotency key plus same semantic evidence input reuses the existing AAF evidence package. Same idempotency key plus semantic drift throws `AafIdempotencyConflictError` through the AAF writer.

## Fail-Closed Behavior

The builder refuses to build when:

- readiness record is missing
- readiness status is not `ready` or `ready_with_limitations`
- readiness aggregate freshness is not fresh
- required dimension is missing
- required dimension is not `ready` or `ready_with_limitations`
- required dimension freshness is stale/missing/unknown without accepted limitation policy
- open P0 blocker exists
- required refs are missing
- expected readiness status mismatches
- expected semantic source watermark mismatches
- closeout is required but missing
- AAF writer fails
- idempotency drift is detected

## Boundaries

Builder output includes:

- `evidenceOnly: true`
- `createsApprovalRequest: false`
- `createsApprovalDecision: false`
- `createsGateAttempt: false`
- `publishes: false`
- `publishActivationApproved: false`
- `runtimeMutation: false`
- `providerCalls: false`
- `derivedFromLaunchReadiness: true`

AAF request boundary:

- No `createApprovalRequestTransaction` import or invocation.
- No approval request rows created in integration validation.

AAF decision boundary:

- No `createApprovalDecisionTransaction` import or invocation.
- No approval decision rows created in integration validation.

AAF gate boundary:

- No `createGateAttemptTransaction` import or invocation.
- No action gate attempt rows created in integration validation.

DDOM boundary:

- Reads persisted launch readiness refs only.
- Does not call DDOM snapshot writers, callers, triggers, PASR observers, or live DNS.
- No DDOM snapshot rows created in integration validation.

Domain/DNS/provider boundary:

- Domain/DNS/operator/Vercel/SSL data appears only as stored refs and payload summaries.
- No Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, production Supabase, or staging Supabase calls.

Billing/Stripe boundary:

- Billing, hosting entitlement, and Stripe data appears only as stored refs and payload summaries.
- No billing, entitlement, Stripe, payment, customer, subscription, or invoice mutations.

Publish/rollback/runtime boundary:

- Publish target and rollback readiness appear only as stored refs.
- No publish activation enforcement, publish execution, rollback execution, active pointer mutation, runtime artifact mutation, site-version mutation, content override mutation, or publish target mutation.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --types node apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts packages/gnr8-runtime-contracts/src/aaf-contracts.ts packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`

Passed final hygiene and guardrail checks:

- `git diff --check`
- trailing whitespace check over changed files
- implementation guardrail search found no approval request creation
- implementation guardrail search found no approval decision creation
- implementation guardrail search found no action gate attempt creation
- implementation guardrail search found no DDOM snapshot creation, writer, caller, trigger, or manual snapshot call
- implementation guardrail search found no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- implementation guardrail search found no publish, rollback, runtime, active pointer, or active site-version mutation
- Docker cleanup check found no remaining `gnr8-mvp40-launch-readiness-evidence-*` disposable containers

## Issues Found And Fixed

- AAF contracts and SQL constraints did not include the distinct launch readiness evidence type. Added the narrow vocabulary constant, tests, and migration.
- The integration fixture initially produced a generic domain readiness ref instead of a `ddom_readiness_snapshot` role. Fixed the fixture so required ref validation matches persisted source-owner refs.
- Optional PASR diagnostic limitations initially made aggregate AAF freshness `partial_timeline`. Fixed aggregate freshness so optional non-enforcing PASR diagnostics do not affect package freshness.

## Residual Risks

- Per-source freshness is represented inside the canonical payload and source-ref metadata because the current AAF writer transaction pattern persists one aggregate freshness check row.
- Billing/hosting, rollback readiness, preview smoke QA, and provider stored-state remain dependent on previously persisted launch readiness refs; MVP-40 does not create or refresh those source truths.
- Publish activation request handoff remains future work and must stay separate from this evidence builder.

## Safe-To-Accept Decision

MVP-40 is safe to accept. The focused tests, TypeScript no-emit check, diff/whitespace checks, guardrail searches, and Docker cleanup check passed. The builder is server-only, evidence-only, fail-closed, idempotent, and non-executing.

Recommended next milestone:

- Publish activation request bridge that consumes `single_site_launch_readiness_evidence` as evidence only, without adding publish enforcement or execution.
