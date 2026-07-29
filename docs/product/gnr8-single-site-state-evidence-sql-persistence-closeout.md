# GNR8 Single-Site State Evidence SQL Persistence Closeout

Date: 2026-07-29
Phase: MVP-5 SQL persistence core
Scope: Additive SQL persistence, static SQL tests, disposable local PostgreSQL integration tests, and documentation only.

MVP-5 did not implement writer repositories, services, API routes, server actions, UI, capture/import behavior, clone generation behavior, proposal behavior, content editing behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center implementation, Ops Inbox implementation, public runtime behavior, workers, providers, AI execution, storage behavior, auth behavior, or client portal behavior.

## 1. Files Reviewed

MVP-4 design docs:

- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

Representative SQL/test patterns:

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-persistence.integration.test.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.integration.test.ts`

## 2. Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

The worktree also contained MVP-4 documentation changes before MVP-5 implementation began; those were treated as design inputs and were not reverted.

## 3. Migration File Name

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`

No timestamp collision was found for `20260729120000`.

## 4. Tables Created

Single-site migration operational state:

- `public.gnr8_single_site_migrations`
- `public.gnr8_single_site_migration_state_events`
- `public.gnr8_single_site_migration_refs`
- `public.gnr8_single_site_migration_stage_summaries`
- `public.gnr8_single_site_migration_blockers`
- `public.gnr8_single_site_migration_closeouts`

Source evidence review:

- `public.gnr8_single_site_source_evidence_reviews`
- `public.gnr8_single_site_source_evidence_review_refs`
- `public.gnr8_single_site_source_evidence_review_items`
- `public.gnr8_single_site_source_evidence_review_events`

The MVP-4 source evidence design used shorter `gnr8_source_evidence_*` table names, but MVP-5 required the single-site-prefixed family. The implemented names use `gnr8_single_site_source_evidence_*` so the full persistence spine remains scoped to the corrected one-site-at-a-time workflow.

## 5. State Vocabulary Implemented

The migration supports all required MVP-2 states:

`site_candidate_created`, `source_capture_started`, `source_capture_completed`, `source_capture_failed`, `source_evidence_review_required`, `clone_generation_started`, `clone_generation_completed`, `clone_review_required`, `clone_revision_required`, `improvement_proposal_started`, `improvement_proposal_ready`, `improvement_proposal_approved`, `improvement_proposal_rejected`, `improvement_implementation_started`, `improvement_implementation_completed`, `improved_preview_ready`, `content_review_required`, `content_approved`, `domain_readiness_required`, `domain_readiness_ready`, `subscription_required`, `subscription_created`, `hosting_entitlement_ready`, `launch_approval_required`, `publish_ready`, `published`, `rollback_available`, `migration_closed_out`, `migration_failed`, `migration_cancelled`.

Normalized stage checks were also added for `intake`, `source_capture`, `source_evidence_review`, `clone`, `proposal`, `improvement_content`, `domain_commercial_readiness`, `launch_publish_recovery`, and `terminal`, including a state-to-stage mapping check on the mutable migration header.

## 6. Source Evidence Review Vocabulary Implemented

Review statuses:

`not_started`, `ready_for_review`, `review_in_progress`, `accepted`, `accepted_with_limitations`, `retry_required`, `rejected`, `superseded`.

Evidence item categories:

`source_url`, `page`, `screenshot`, `dom`, `text`, `image`, `asset`, `font`, `visual_identity`, `metadata`, `structured_data`, `external_ref`, `limitation`, `missing_evidence`.

Review event actions:

`created`, `item_added`, `ready_for_review`, `review_started`, `accepted`, `accepted_with_limitations`, `retry_required`, `rejected`, `superseded`, `comment_added`.

## 7. Mutation Model Summary

- `gnr8_single_site_migrations` is mutable as the current-state summary row.
- `gnr8_single_site_migration_stage_summaries` is mutable and explicitly marked as `projection_kind = 'state_writer_cache'`.
- `gnr8_single_site_migration_blockers` is mutable for current blocker status with explicit resolution fields.
- `gnr8_single_site_source_evidence_reviews` is mutable as the current review header/status row.
- `gnr8_single_site_source_evidence_review_items` is mutable for in-progress checklist status.
- Event/ref/closeout tables preserve history and are append-only at the database level.

## 8. Append-Only Trigger Summary

The migration creates `public.gnr8_single_site_prevent_update_delete()` and attaches update/delete prevention triggers to:

- `gnr8_single_site_migration_state_events`
- `gnr8_single_site_migration_refs`
- `gnr8_single_site_migration_closeouts`
- `gnr8_single_site_source_evidence_review_refs`
- `gnr8_single_site_source_evidence_review_events`

## 9. RLS And Grants Posture

RLS is enabled on all ten new tables.

No broad `public` policies were added. No broad grants were added. Access control remains closed by default for a later server-only writer/read-access milestone.

## 10. Index And Constraint Summary

Implemented lookup indexes cover:

- migration by client/site/current state;
- migration by source URL and canonical source URL;
- migration creation idempotency;
- state events by migration/occurred time and event index;
- refs by migration role and source lookup;
- blockers by migration/status/severity and owner/status;
- closeouts by migration/created time and outcome;
- source evidence reviews by migration/status and package/watermark;
- evidence items by review/category/status and clone blocking;
- review refs by review role and source lookup;
- review events by review/occurred time, migration, and action.

Implemented constraints cover:

- state/status/stage/review/action/category vocabularies;
- actor type, privacy label, and retention class vocabularies;
- idempotency uniqueness;
- semantic ref uniqueness using `coalesce(...)` expression indexes for nullable source table/watermark fields;
- JSONB object/array shapes;
- non-empty required text and source watermarks;
- payload/content/source hash length;
- terminal state timestamp requirements;
- review decision/reviewer/timestamp requirements for terminal review decisions;
- degraded evidence acceptance requiring limitations and an AAF approval decision ref;
- blocker resolution timestamps.

## 11. FK Decisions

The migration uses internal FKs among the new single-site tables.

It intentionally does not FK to existing specialized source-truth tables such as runtime, AAF, DDOM, PTT, billing, Stripe, or capture tables. Those systems remain canonical for their own records and are represented in this spine through durable refs, source record ids, watermarks, metadata, and nullable AAF/DDOM/PTT/billing/ref columns. This keeps the migration additive and allows disposable PostgreSQL validation by applying only this migration.

## 12. Static Test Results

Passed:

- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`

Result: 9 tests passed.

## 13. Disposable DB Integration Results

Passed:

- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`

Result: 1 test passed.

The test used a disposable local Docker `postgres:15` container with `--pull=never`, applied only the MVP-5 migration, validated metadata/RLS/no-policy posture, exercised positive inserts for all ten tables, validated mutable rows, validated failing constraints, validated duplicate idempotency failure, and validated append-only update/delete failures. The test stopped the container in cleanup.

Combined focused validation also passed:

- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`

Result: 10 tests passed.

## 14. Issues Found

- MVP-4 source evidence docs recommended shorter `gnr8_source_evidence_*` names, while MVP-5 required `gnr8_single_site_source_evidence_*`. MVP-5 implemented the required single-site-prefixed names.
- Nullable polymorphic ref uniqueness needs expression indexes with `coalesce(...)`, not plain unique constraints, to prevent duplicate null-table/null-watermark rows. The migration implements expression unique indexes for migration refs and review refs.

No unavoidable FK compatibility issue was found.

## 15. Residual Risks

- State transition ordering and forbidden shortcuts are not enforced in MVP-5 SQL; they belong to the MVP-6 writer/transition service.
- Idempotency semantic drift detection is not implemented in SQL; MVP-6 repositories must compare payloads when reusing an idempotency key.
- JSONB bounded-size limits are shape-checked but not size-capped in every column. Writer services should keep refs and summaries small and avoid heavy artifacts.
- Source-truth FK integrity to AAF/DDOM/PTT/runtime/billing remains intentionally deferred.

## 16. Whether MVP-5 Is Safe To Accept

Yes. MVP-5 is safe to accept as a SQL persistence core.

## 17. Whether Writer/Repository Implementation May Begin

Yes. Writer/repository implementation may begin after MVP-5 acceptance, with the boundary that MVP-6 should remain server-only and should enforce state transitions, idempotency drift checks, required refs, AAF audit/approval requirements, and forbidden shortcuts before any runtime integration.

## 18. Recommended Next Milestone

MVP-6: server-only writer/repository and transition service for single-site migration state and source evidence review.

## 19. Git Status Summary

At final guardrail time, `git status --short` showed:

- `apps/platform/gnr8/single-site/`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

The same status also showed pre-existing MVP-4 documentation files still untracked:

- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

No commit or push was performed.

## 20. Commands Run

- `sed -n ...` over MVP-4 architecture/product docs.
- `sed -n ...` over AAF, DDOM, and PTT migration/test patterns.
- `rg --files apps/platform/supabase/migrations apps/platform/gnr8`
- `rg -n ...` over migration/test patterns for RLS, append-only, Docker, privacy, retention, and idempotency.
- `test -e apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `find apps/platform/gnr8 -maxdepth 2 -type d`
- `git status --short`
- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `git diff --check`
- `git diff --name-only`
- `rg --pcre2 -n ...` destructive SQL and non-single-site alter/drop guardrails over the new migration/static test
- `rg -n "[ \t]$" ...` trailing whitespace guardrail over changed/new MVP-5 files and the canonical index
- `find ...` changed/new MVP-5 file boundary confirmation
- `docker ps --filter name=gnr8-single-site --format '{{.Names}}'`

No production Supabase, staging Supabase, Vercel, DNS provider, Openprovider, Stripe, AI provider, or other external provider was called.

## 21. Runtime Behavior Confirmation

No runtime behavior changed. MVP-5 added SQL persistence, tests, and documentation only.
