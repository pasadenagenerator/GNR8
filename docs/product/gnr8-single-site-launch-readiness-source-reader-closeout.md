# GNR8 Single-Site Launch Readiness Source Reader Closeout

MVP-38 implements the server-only, read-only source reader core for single-site launch readiness. It gathers current source truth from existing approval, runtime, PTT, DDOM, migration-ref, and diagnostic sources, then returns a deterministic derived source package for a future writer/evidence-builder milestone.

No launch readiness records, dimensions, refs, blockers, events, or closeouts are written. No DDOM snapshots, AAF evidence packages, approval requests, approval decisions, gate attempts, runtime mutations, publish activations, rollbacks, billing mutations, provider calls, routes, UI, workers, Command Center, Ops Inbox, or client portal work were implemented.

## Files Reviewed

- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `docs/product/gnr8-single-site-mvp-critical-blockers.md`
- `docs/product/gnr8-single-site-launch-readiness-operator-workflow.md`

## Files Created Or Updated

- Created `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- Created `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`
- Created `apps/platform/gnr8/single-site/launch-readiness-source-reader.test.ts`
- Created `apps/platform/gnr8/single-site/launch-readiness-source-reader.integration.test.ts`
- Created `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- Updated `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Source Reader

The source reader lives at:

- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`

Public API:

- `readSingleSiteLaunchReadinessSources(input)`
- `SingleSiteLaunchReadinessSourceReader`

Required input includes tenant id, client id, site id, migration id, improved candidate site-version ref/id, improved runtime artifact ref/id, launch approval decision ref, actor trace metadata, correlation id, idempotency key, and optional policy flags.

The returned package includes identity, transaction timestamp, overall source status, freshness status, all MVP-37 dimension names, source refs, source watermarks, semantic watermarks, blockers, limitations, warnings, diagnostics, missing/stale/unsupported source truth lists, recommended next action, and fixed non-mutating flags:

- `derivedOnly: true`
- `mutatesSourceTruth: false`
- `nonEnforcing: true`
- `publishActionBlocked: false`
- `publishActivationApproved: false`

## Repository

The read repository lives at:

- `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`

It exposes a dependency-injected pool boundary and read-only methods for:

- launch approval rows
- content approval rows
- client approval rows
- improved version review rows
- runtime site version rows
- runtime artifact rows
- PTT publish target rows
- latest DDOM readiness snapshot rows
- DDOM snapshot refs
- single-site migration refs

## Transaction Strategy

Repository-backed reads use:

- `begin isolation level repeatable read read only`
- one captured `transaction_timestamp()`
- `commit` on success
- best-effort transaction `rollback` on read failure
- typed repository error wrapping for fail-closed reader output

The source reader catches repository/read failures and returns a blocked fail-closed package. It never treats read exceptions as approvals, ready state, fresh state, or repair triggers.

## Dimensions Read

MVP-38 returns these dimensions:

- `launch_approval`
- `content_approval`
- `client_approval`
- `improved_candidate`
- `publish_target`
- `domain_readiness`
- `dns_operator_evidence`
- `vercel_custom_domain_ssl`
- `billing_subscription`
- `hosting_entitlement`
- `stripe_payment`
- `rollback_readiness`
- `preview_smoke_qa`
- `limitations`
- `audit_timeline`
- `pasr_shadow_diagnostics`

## Source Refs And Watermarks

Source refs use deterministic `gnr8:<source_table>:<source_record_id>` shape when the source is read directly. Stored DDOM and migration refs preserve their stored source system/table/record identity.

Watermark precedence:

1. explicit source watermark, semantic watermark, payload hash, bundle hash, or updated timestamp from the source row;
2. stable sorted JSON SHA-256 fallback over minimal canonical fields;
3. dimension-level semantic hash from sorted source refs, statuses, blockers, limitations, warnings, and diagnostics.

Read timestamps, actor details, correlation ids, idempotency keys, request ids, and presentation labels are excluded from semantic watermarks.

## Missing, Stale, And Failed Behavior

Missing required approvals, runtime candidate state, publish targets, DDOM snapshots, DNS operator evidence, Vercel/custom-domain/SSL stored state, billing/hosting truth, rollback readiness evidence, or smoke QA evidence are explicit `missing` or `blocked` dimensions.

Stale DDOM snapshots map to `domain_readiness` status `stale`, stale freshness, blocker `domain_readiness_stale`, and stale source truth diagnostics. `ready_with_warnings` DDOM maps to `ready_with_limitations`.

Read failures return a blocked fail-closed package with `launch_readiness_source_reader_failed_closed`; they do not hide missing truth or infer readiness.

## Billing, Hosting, And Stripe Gap Handling

The reader can surface stored migration refs for `subscription`, `hosting_entitlement`, `stripe_customer`, and `stripe_subscription` if present. When site-scoped canonical billing or hosting source truth is absent, it returns explicit missing/unsupported diagnostics:

- `site_scoped_billing_subscription_truth_absent`
- `site_scoped_hosting_entitlement_truth_absent`
- `site_scoped_stripe_payment_truth_absent` when Stripe payment is policy-required

No Stripe or billing service calls are made.

## DDOM Boundary

The reader reads only the latest existing `gnr8_ddom_readiness_snapshots` row and related `gnr8_ddom_readiness_snapshot_refs`.

It does not call DDOM stored-state mappers, DDOM writers, manual snapshot callers, manual snapshot triggers, live DNS, Vercel, Openprovider, registrars, DNS providers, SSL providers, or any provider workflow.

## Publish And Runtime Boundary

The reader reads runtime site-version/artifact metadata and PTT publish target truth. It never mutates runtime artifacts, site versions, active pointers, content overrides, publish targets, runtime publish events, public runtime state, rollback state, or publish activation state.

PTT handling is fail-closed:

- missing target -> `missing_publish_target`
- disabled target -> `disabled_publish_target`
- retired target -> `retired_publish_target`
- environment mismatch -> `publish_target_environment_mismatch`
- stage mismatch -> `publish_target_stage_mismatch`
- disallowed artifact stage -> `artifact_stage_not_allowed_by_target`

## PASR Boundary

PASR shadow diagnostics are read only from stored migration refs when available. PASR is non-enforcing in MVP-38 and cannot directly block launch readiness. Missing PASR diagnostics surface as a limitation only.

PASR does not create DDOM snapshots, AAF evidence, approval requests, gate attempts, audit events, publish actions, or readiness records.

## Validation Results

Completed validation during implementation:

- Unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-source-reader.test.ts` passed.
- Disposable PostgreSQL integration tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-source-reader.integration.test.ts` passed.
- Focused TypeScript no-emit over the new files passed with a temporary repo-local tsconfig; the temp config was removed after validation.
- `git diff --check` passed.
- Trailing whitespace check over changed files passed.
- Guardrail search over implementation files found no writes to `gnr8_single_site_launch_readiness_*`.
- Guardrail search over implementation files found no DDOM snapshot creation or manual snapshot trigger/caller usage.
- Guardrail search over implementation files found no AAF evidence/request/decision/gate creation.
- Guardrail search over implementation files found no Vercel, Openprovider, DNS, Stripe, billing, AI, or provider calls.
- Guardrail search over implementation files found no publish activation, publish, rollback, runtime active pointer, site-version, or artifact mutation. A broad generic `update` search only matched Node `createHash().update(...)`, not SQL or source mutation.
- Docker cleanup check found no remaining `gnr8-mvp38-lrssr-*` disposable containers.

The integration test verifies read-only repeatable-read transaction state, launch/content/client approval reads, runtime candidate/artifact reads, PTT reads, DDOM snapshot reads, explicit billing/hosting/rollback/smoke gaps, no table count changes, no launch readiness rows, no DDOM snapshot creation, no AAF rows, no runtime active pointer changes, no publish events, and no rollback events.

## Issues Found And Fixes

- The first integration test count helper could hang locally after the first count query. It was changed to use one checked-out client with a timeout wrapper.
- PASR missing diagnostics correctly surfaced as a limitation rather than a blocker. The unit assertion was updated to assert non-enforcement and visible limitation behavior.

## Residual Risks

- Billing subscription and hosting entitlement remain architectural/source-truth gaps for site-scoped launch readiness.
- Rollback readiness and preview smoke QA have no canonical launch-readiness-specific persisted evidence model yet; MVP-38 reports missing refs rather than inventing evidence.
- Vercel/custom-domain/SSL readiness is represented only through stored DDOM refs when present; no canonical provider-shaped site-scoped table is added here.
- Audit timeline is limited to durable refs already present on migration refs; this milestone does not build a full audit/evidence package.

## Safe-To-Accept Decision

MVP-38 is safe to accept as a read-only source reader core. The focused tests, TypeScript no-emit check, diff/whitespace checks, mutation/provider guardrails, and Docker cleanup check passed. It is intentionally derived-only and does not approve publish activation or write MVP-37 persistence.

## Recommended Next Milestone

Implement the launch readiness writer/service that consumes this source package and writes MVP-37 launch readiness records, dimensions, refs, blockers, events, and closeouts. Keep evidence-builder and publish activation wiring as separate later milestones.
