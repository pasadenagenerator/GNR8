# GNR8 Single-Site Launch Readiness Writer Service Closeout

Phase: MVP-39
Date: 2026-08-04
Scope: Server-only launch readiness writer repository, service core, focused tests, disposable PostgreSQL integration tests, and documentation.

MVP-39 connects the MVP-38 read-only launch readiness source package to the MVP-37 canonical launch readiness persistence tables. It writes launch readiness records, dimensions, refs, blockers, lifecycle events, accepted limitations, and closeouts through a server-only repository/service layer.

No AAF evidence packages, AAF approval requests, AAF approval decisions, gate attempts, DDOM snapshots, billing or subscription activation, domain/DNS/provider execution, publish activation, publish, rollback, active pointer mutation, runtime mutation, UI/API routes, workers, Command Center actions, Ops Inbox actions, client portal exposure, commit, or push was performed.

## Files Reviewed

- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Writer Repository

Repository location:

- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`

The repository is server-only and exposes bounded helpers for:

- transactions
- create/reuse readiness records by idempotency key
- bounded readiness status updates
- create/reuse dimensions
- create/reuse refs
- create/reuse blockers
- create/reuse events
- create/reuse closeouts
- readiness lookup
- open P0 blocker count
- next event index

The repository writes only `public.gnr8_single_site_launch_readiness_*` tables. It exposes no generic mutation helper for unrelated tables.

## Service

Service location:

- `apps/platform/gnr8/single-site/launch-readiness-service.ts`

APIs implemented:

- `recordLaunchReadinessFromSources(input)`
- `markLaunchReadinessReady(input)`
- `markLaunchReadinessReadyWithLimitations(input)`
- `markLaunchReadinessBlocked(input)`
- `markLaunchReadinessStale(input)`
- `recordLaunchReadinessCloseout(input)`

## Source Package Mapping

`recordLaunchReadinessFromSources(...)` consumes the MVP-38 source package directly. It persists:

- one readiness record
- one dimension row for each of the 16 source package dimensions
- refs for visible source refs
- P0 blockers for required missing/stale/blocked/unknown dimensions
- accepted limitation rows for package limitations
- lifecycle events for creation, evidence collection, dimensions, refs, blockers, limitations, and final readiness status

The service does not reread source truth, call providers, call DDOM, or call AAF.

## Status Mapping

Overall package mapping:

- read failure or required blocked/missing/unknown -> `blocked`
- required stale with no stronger missing/blocked cause -> `stale`
- required ready with limitations or carried limitations -> `ready_with_limitations`
- required ready/not-applicable only -> `ready`

Dimension statuses are carried through exactly from MVP-38:

- `ready`
- `ready_with_limitations`
- `blocked`
- `stale`
- `missing`
- `not_applicable`
- `unknown`

## Required Dimension Enforcement

MVP-39 enforces these dimensions at minimum:

- launch approval
- content approval
- client approval when required by the source package
- improved candidate
- publish target
- domain readiness
- billing subscription
- hosting entitlement
- rollback readiness
- preview smoke QA

PASR diagnostics, audit timeline, limitations, and non-required Stripe payment remain non-enforcing. PASR is explicitly persisted as non-enforcing diagnostics.

## Idempotency And Drift

The service computes a deterministic semantic fingerprint over identity, package statuses, dimension statuses/freshness, source refs, source watermarks, semantic source watermarks, blockers, limitations, missing/stale/unsupported truth, and closeout handoff refs where applicable.

Volatile fields are excluded: DB ids, current timestamps, event index allocation, log messages, actor display labels, and presentation labels.

Same idempotency key plus same semantic payload reuses existing rows. Same idempotency key plus semantic drift throws `SingleSiteIdempotencyConflictError`.

## Events Written

The service writes only events that correspond to the operation:

- `readiness_created`
- `evidence_collection_started`
- `dimension_recorded`
- `dimension_ref_recorded`
- `blocker_opened`
- `limitation_accepted`
- `readiness_marked_ready`
- `readiness_marked_ready_with_limitations`
- `readiness_blocked`
- `readiness_marked_stale`
- `closeout_recorded`

The repository also supports the remaining MVP-37 lifecycle vocabulary for future bounded status operations.

## Closeout Behavior

`recordLaunchReadinessCloseout(...)` requires:

- readiness status `ready` or `ready_with_limitations`
- no open P0 blockers

It persists final evidence summary JSON, final limitation/blocker summaries, publish activation handoff refs as launch-readiness refs only, and a `closeout_recorded` event. It does not create publish activation approval, evidence, gate, PASR, AAF, runtime, publish, or provider records.

## Boundary Flags

Every operation returns:

- `derivedFromSourceReader: true`
- `mutatesSourceTruth: false`
- `mutatesReadinessPersistence: true`
- `createsAafRecords: false`
- `createsDdomSnapshots: false`
- `publishes: false`
- `publishActivationApproved: false`
- `publishActionBlocked: false`
- `runtimeMutation: false`
- `providerCalls: false`

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-service.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- focused TypeScript no-emit using a temporary MVP-39 tsconfig over changed files and direct dependencies

The MVP-38 source reader files were not touched, so MVP-38 source reader tests were not rerun.

## Issues Found And Fixed

- Client approval was initially treated as unconditionally required. The service now honors `client_approval` as non-enforcing when the source package marks it `not_applicable` and not required.
- Repository idempotent replay initially compared `timestamptz` values as strings versus PostgreSQL `Date` objects. Semantic normalization now canonicalizes `Date` to ISO strings and JSON scalar strings consistently.

## Guardrails

Guardrail searches were run for:

- writes limited to `gnr8_single_site_launch_readiness_*`
- no AAF record creation
- no DDOM snapshot creation
- no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- no publish/rollback/runtime active pointer mutation
- no trailing whitespace
- `git diff --check`
- Docker cleanup

The production implementation files import only launch-readiness source/package types, single-site contracts, and the server-only repository boundary. They do not import DDOM callers/triggers, AAF writers, provider SDKs, billing/Stripe services, runtime-store mutation helpers, publish activation code, rollback code, UI/API, Command Center, Ops Inbox, workers, or client portal code.

## Residual Risks

- Billing subscription and hosting entitlement remain represented as source package truth/refs; MVP-39 does not create new site-scoped billing or hosting source truth.
- Rollback readiness and preview smoke QA are persisted as readiness dimensions/refs from the source package; this milestone does not create dedicated evidence-generation workflows.
- Closeout handoff refs are durable refs only. Actual publish activation evidence/approval handoff remains a later milestone.

## Safe-To-Accept Decision

MVP-39 is safe to accept as a server-only writer/service core. It persists MVP-38 source packages into MVP-37 tables with required-dimension fail-closed behavior, idempotency reuse, semantic drift conflict detection, append-only refs/events/closeouts, and closeout gating. It does not execute or expose launch readiness beyond canonical persistence.

## Recommended Next Milestone

Recommended next milestone: launch readiness evidence builder that derives a publish-activation-ready evidence summary from persisted readiness records without creating publish activation approval or executing publish.

Do not begin publish activation bridge integration, billing/hosting execution, domain/DNS execution, publish, rollback, UI/API, Command Center, Ops Inbox, or client portal exposure until separate scoped milestones approve those boundaries.
