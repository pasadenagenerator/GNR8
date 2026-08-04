# GNR8 Single-Site Launch Readiness Persistence Closeout

Phase: MVP-37
Date: 2026-08-04
Scope: SQL persistence core, focused static tests, disposable PostgreSQL integration tests, and documentation only.

MVP-37 implements the additive SQL persistence foundation for single-site launch readiness after validated launch approval and before publish activation review. It creates canonical storage for launch readiness records, dimensions, durable source refs, blockers, lifecycle events, and closeout package summaries.

No launch readiness source reader, writer/service layer, evidence builder, API, UI, domain execution, DNS lookup, provider call, billing or Stripe execution, publish activation, publish, rollback, runtime mutation, active pointer mutation, content override mutation, DDOM snapshot creation, AAF approval/evidence creation, worker, Command Center, Ops Inbox, client portal exposure, commit, or push was performed.

## Files Reviewed

- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-operator-workflow.md`
- `docs/architecture/gnr8-single-site-launch-readiness-source-of-truth.md`
- `docs/architecture/gnr8-single-site-launch-readiness-evidence-architecture.md`
- `docs/architecture/gnr8-single-site-launch-readiness-transition-contract.md`
- `docs/architecture/gnr8-single-site-launch-readiness-source-reader-design.md`
- `docs/product/gnr8-single-site-launch-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-launch-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-client-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-db-execution-closeout.md`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql`
- `apps/platform/supabase/migrations/20260803210000_single_site_launch_approval_core.sql`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name:

- `20260804120000_single_site_launch_readiness_core.sql`

Tables created:

- `gnr8_single_site_launch_readiness_records`
- `gnr8_single_site_launch_readiness_dimensions`
- `gnr8_single_site_launch_readiness_refs`
- `gnr8_single_site_launch_readiness_blockers`
- `gnr8_single_site_launch_readiness_events`
- `gnr8_single_site_launch_readiness_closeouts`

## Vocabulary Implemented

Readiness statuses:

- `draft`
- `collecting_evidence`
- `ready`
- `ready_with_limitations`
- `blocked`
- `stale`
- `superseded`
- `cancelled`

Freshness statuses:

- `fresh`
- `stale`
- `missing`
- `unknown`
- `not_applicable`

Dimensions:

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

Dimension statuses:

- `ready`
- `ready_with_limitations`
- `blocked`
- `stale`
- `missing`
- `not_applicable`
- `unknown`

Ref roles:

- `launch_approval_decision`
- `content_approval_decision`
- `client_approval_decision`
- `improved_candidate_site_version`
- `improved_runtime_artifact`
- `publish_target`
- `ddom_readiness_snapshot`
- `domain_operator_evidence`
- `dns_instruction`
- `vercel_domain_state`
- `ssl_state`
- `billing_subscription`
- `hosting_entitlement`
- `stripe_customer`
- `stripe_subscription`
- `rollback_readiness`
- `preview_smoke_qa`
- `limitation`
- `blocker`
- `audit_event`
- `pasr_shadow_result`

Blocker severities:

- `p0_blocker`
- `p1_major`
- `p2_minor`
- `p3_note`

Blocker categories:

- `launch_approval`
- `content_approval`
- `client_approval`
- `domain_dns`
- `billing_subscription`
- `hosting_entitlement`
- `stripe_payment`
- `publish_target`
- `rollback`
- `smoke_qa`
- `runtime_candidate`
- `freshness`
- `evidence`
- `limitation`
- `manual_operator`
- `unknown_or_manual`

Blocker statuses:

- `open`
- `resolved`
- `accepted_limitation`
- `superseded`
- `cancelled`

Event actions:

- `readiness_created`
- `evidence_collection_started`
- `dimension_recorded`
- `dimension_ref_recorded`
- `blocker_opened`
- `blocker_resolved`
- `limitation_accepted`
- `readiness_marked_ready`
- `readiness_marked_ready_with_limitations`
- `readiness_blocked`
- `readiness_marked_stale`
- `readiness_superseded`
- `readiness_cancelled`
- `closeout_recorded`

## Mutability And Append-Only Model

Bounded mutable:

- `gnr8_single_site_launch_readiness_records` can carry current readiness status, aggregate freshness, summaries, metadata, and updated timestamp.
- `gnr8_single_site_launch_readiness_dimensions` can carry current dimension status, freshness timestamps, limitations, diagnostics, and updated timestamp.
- `gnr8_single_site_launch_readiness_blockers` can carry blocker resolution status, resolution refs, resolved timestamp, metadata, and updated timestamp.

Append-only by trigger:

- `gnr8_single_site_launch_readiness_refs`
- `gnr8_single_site_launch_readiness_events`
- `gnr8_single_site_launch_readiness_closeouts`

The trigger function `gnr8_single_site_launch_readiness_prevent_update_delete()` raises on update/delete for the append-only tables.

## RLS And Grants

RLS is enabled on all six new tables. The migration adds no policies and no grants to `PUBLIC`, `anon`, or `authenticated`, keeping the tables closed by default until a reviewed service-role or scoped access phase exists.

## Constraints And Indexes

The migration adds primary keys, internal FKs, idempotency uniqueness, semantic uniqueness for readiness records and refs, JSONB object/array shape checks, non-empty durable ref and watermark checks, actor/privacy/retention checks, and lookup indexes by migration/status, client/site/status, dimensions/status/freshness, refs/source/watermark, blockers/status/severity/category, events/action/watermark, closeouts/status, and created/updated timestamps.

## Source-Of-Truth Boundary

Launch readiness persistence is a canonical readiness package container only. AAF, single-site approval workflows, runtime, DDOM, PTT, billing/hosting, Stripe, smoke QA, rollback, and PASR remain separate source owners. This migration stores durable refs and watermarks to those sources but does not read them, validate them, execute them, or mutate them.

## External FK Decision

The only external FK is `migration_id` to `gnr8_single_site_migrations`, matching the single-site persistence spine. Launch approval, runtime artifact, site version, DDOM, PTT, billing, hosting, Stripe, smoke QA, rollback, audit, and PASR references are durable text refs/watermarks in this phase. No FKs were added to runtime, DDOM, PTT, AAF, billing, Stripe, provider, or publish tables.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `pnpm exec tsc --noEmit --pretty false --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --types node apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `git diff --check`
- trailing whitespace check over the migration, two tests, closeout, and canonical index
- SQL-only guardrail searches for broad policies/grants, provider calls, runtime mutation, publish mutation, domain mutation, billing mutation, and source-owner table mutations
- Docker cleanup check for `gnr8-launch-readiness` disposable containers

The disposable PostgreSQL integration test applied `20260729120000_single_site_state_evidence_spine.sql` and `20260804120000_single_site_launch_readiness_core.sql` to a local throwaway `postgres:15` container, inserted valid readiness records, dimensions, refs, blockers, events, and closeouts, verified bounded mutable updates, verified invalid vocabularies and malformed JSON shapes fail, verified duplicate idempotency and duplicate semantic refs fail, verified append-only update/delete failures on refs/events/closeouts, verified RLS, verified zero policies, verified zero broad grants, and stopped the container.

Changed-file guardrail:

- MVP-37-created files are within the allowed migration, single-site test, and product-doc paths.
- The canonical index update is within the allowed index path.
- Existing untracked MVP-36 architecture/operator docs were present before MVP-37 work and were reviewed read-only.

## Provider And Runtime Non-Call Confirmation

No live DNS, Vercel, Openprovider, registrar, DNS provider, SSL provider, Stripe, AI provider, production Supabase, or staging Supabase was called. Only a disposable local PostgreSQL Docker container was used for migration validation.

No runtime artifacts, site versions, active pointers, runtime site rows, content overrides, publish targets, DDOM snapshots, AAF approvals/evidence/gates/audit rows, billing records, Stripe records, domain bindings, Command Center state, Ops Inbox state, client portal state, UI, API routes, server actions, or workers were created or mutated.

## Issues Found And Fixes Made

- The first static test expected the requested table listing order, but the SQL must create dimensions before refs so `dimension_id` can have an FK. The test now verifies exact table membership without imposing that order.

## Residual Risks

- The persistence layer does not decide readiness; future source-reader and writer phases must enforce semantic consistency between refs, source watermarks, statuses, blockers, and closeouts.
- Billing/hosting site-scoped source truth and rollback readiness evidence remain product gaps identified by MVP-36.
- RLS is intentionally closed; a later reviewed access policy/service-role phase is required before application code can read or write these tables.
- The migration depends on the single-site state evidence spine for `gnr8_single_site_migrations`.

## Acceptance

MVP-37 is safe to accept as a SQL persistence core. It satisfies the launch readiness persistence requirements without adding reader, writer/service, execution, provider, billing, domain, publish, rollback, UI, API, worker, Command Center, Ops Inbox, client portal, commit, or push work.

Recommended next milestone: MVP-38 launch readiness source reader read-only core, using stored source refs and watermarks only, with no provider calls and no runtime/source-owner mutation.
