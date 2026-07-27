# GNR8 PTT-1 Publish Target Source Truth Persistence Core Closeout

PTT-1 adds the additive database persistence foundation for canonical publish target policy/config source truth. It creates `public.gnr8_publish_targets` so future AAF publish activation evidence can cite durable target records and source watermarks.

This phase does not implement a production source reader, publish route shadow integration, live publish enforcement, active pointer mutation, runtime behavior, provider calls, Command Center behavior, or Ops Inbox behavior.

## Files Reviewed

Required architecture and product docs:

- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Current publish/runtime/source areas:

- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/types.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.integration.test.ts`

Migrations and SQL patterns:

- `apps/platform/supabase/migrations/20260424150000_runtime_raw_template_artifacts.sql`
- `apps/platform/supabase/migrations/20260423110000_site_bootstrap_runtime_site_id_text_alignment.sql`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- existing DDOM-2 static and disposable DB tests under `apps/platform/gnr8/ddom/`

Repository searches inspected publish route body/stage handling, publish activation orchestration, publish enforcement/safety checks, runtime artifact `publish_stage` usage, preview/shadow/canary/production terminology, runtime artifact and active pointer table definitions, AAF publish evidence source-key expectations, DDOM-2 migration/test patterns, and site-scoped publish-target attachment evidence.

## Files Created Or Updated

- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.integration.test.ts`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Migration

Migration file:

- `20260727130000_publish_target_source_truth_persistence_core.sql`

Tables created:

- `public.gnr8_publish_targets`

Not created:

- `public.gnr8_site_publish_target_policies`

## Seed Records

Created one MVP seed row:

- `id`: `production`
- `environment`: `production`
- `target_kind`: `public_runtime`
- `publish_stage`: `production`
- `status`: `active`
- `policy_version`: `ptt-1`
- `allowed_artifact_stages`: `["production"]`
- `source_watermark`: `ptt-1:gnr8_publish_targets:production`

`shadow` and `canary` are constrained as known runtime publish-stage vocabulary, but they are not seeded. Current code accepts and evaluates those stages, yet this phase found no evidence that they should be canonical active MVP publish target records. The seed therefore avoids overclaiming shadow/canary readiness.

## Constraints Summary

`gnr8_publish_targets` includes:

- primary key on `id`
- environment check: `production`, `preview`, `staging`, `development`
- target kind check: `public_runtime`, `preview_runtime`, `internal_runtime`
- publish stage check aligned to current runtime vocabulary: `production`, `canary`, `shadow`
- status check: `active`, `disabled`, `retired`
- actor type check aligned with AAF: `human`, `system`, `provider`, `external_reference`, `ai_advisory`
- privacy label check aligned with AAF/DDOM
- retention class check aligned with AAF
- JSONB shape check requiring `allowed_artifact_stages` array and `limitations_json` object
- allowed artifact stage value subset check for `production`, `canary`, and `shadow`
- optional `source_watermark` non-empty check when present

## Indexes Summary

Created indexes:

- `idx_gnr8_publish_targets_status_environment_stage` on `(status, environment, publish_stage)`
- `idx_gnr8_publish_targets_target_kind` on `(target_kind)`
- `idx_gnr8_publish_targets_updated_at` on `(updated_at)`
- `idx_gnr8_publish_targets_policy_version` on `(policy_version)`

No GIN index was added because PTT-1 has no immediate JSONB query consumer for `allowed_artifact_stages`.

## RLS Posture

RLS is enabled on `public.gnr8_publish_targets`.

No policies are created. No broad public grants are added. The table is closed by default for this persistence-core phase, leaving future server-side/admin access policy design to a later reviewed milestone.

## Source Watermark Strategy

PTT-1 uses an explicitly stored nullable `source_watermark` field. The bootstrap `production` row sets a deterministic watermark: `ptt-1:gnr8_publish_targets:production`.

No generated column or silent update trigger was added. The table is mutable canonical config, not append-only evidence. Future audited admin updates must explicitly set `updated_at` and either update `source_watermark` or leave it null for the future source reader to compute a documented deterministic watermark from `updated_at`, `policy_version`, and canonical policy fields.

Future source readers should treat the current target watermark as:

- preferred: `source_watermark` when present
- fallback: deterministic value from `policy_version`, `updated_at`, `status`, `environment`, `target_kind`, `publish_stage`, required-gate booleans, `allowed_artifact_stages`, and `limitations_json`

## Mutability And Audit Boundary

Publish target records are canonical policy/config, not evidence records.

- Publish target changes require a future audited admin workflow.
- Historical AAF evidence must cite source watermarks captured at evidence build time.
- Target policy changes must not rewrite old evidence.
- Disabled or retired targets must block future evidence/source-reader validation.
- Future source readers must fail closed on missing, disabled, retired, mismatched environment, mismatched stage, or disallowed artifact stage targets.

No append-only triggers were added because this phase follows the default mutable canonical config recommendation.

## Optional Site-Scoped Attachment Decision

`public.gnr8_site_publish_target_policies` was deferred.

Reason: current repository evidence shows proposed future site-scoped attachments in docs, but no immediate runtime, source-reader, or admin consumer that requires tenant/client/site-specific target overrides in PTT-1. Adding it now would widen the schema and RLS surface ahead of a concrete consumer.

## AAF Evidence Source-Ref Mapping

Future AAF publish activation evidence should map `gnr8_publish_targets` rows as:

- `sourceSystem`: `gnr8`
- `sourceTable`: `gnr8_publish_targets`
- `sourceRecordId`: target id
- `sourceRef`: `gnr8:gnr8_publish_targets:<target-id>`
- `sourceVersion`: `policy_version` or `updated_at`
- `currentWatermark`: explicit `source_watermark` if present, otherwise the documented fallback watermark
- `evidenceWatermark`: same value captured at evidence build time

The future source reader must reject UI labels, route names, button text, request body values, artifact stage alone, and transient request state as canonical publish target truth.

## Validation Performed

Passed:

- static migration checks
- destructive SQL guardrails
- unrelated table alteration guardrails
- seed row SQL checks
- RLS/no-policy/no-grant checks
- required index checks
- disposable local Docker Postgres migration execution
- PostgreSQL catalog verification
- seed row verification
- positive insert test
- negative environment, target kind, publish stage, status, JSON, privacy, retention, actor, source watermark, and duplicate id tests
- `git diff --check`
- trailing whitespace check on PTT-1 changed files
- changed-file review confirming no runtime/provider/AI/billing/publish files changed

Disposable DB target:

- local Docker `postgres:15`
- `--pull=never`
- migration applied alone: `20260727130000_publish_target_source_truth_persistence_core.sql`

Prerequisite migrations applied:

- none

Reason:

- The migration creates one standalone policy/config table and has no FK dependency on runtime, AAF, or DDOM tables.

## Runtime Non-Change Confirmation

No runtime behavior changed. No publish activation route, publish orchestration, active pointer mutation, runtime-store behavior, rollback behavior, domain/DNS/Vercel/Openprovider behavior, provider execution behavior, Command Center, Ops Inbox, BMF, billing, Stripe, AI, worker, public runtime, content publish, or content rollback file was changed.

## External Provider Non-Call Confirmation

No production Supabase, staging Supabase, remote Supabase, Vercel, Openprovider, DNS provider, registrar API, Stripe, AI provider, or external provider was called.

The only database execution was a disposable local Docker Postgres container.

## Issues Found

- Current publish target truth remains ambiguous until the future production source reader uses this table.
- Current route/orchestrator code accepts `stage` as request input, but this phase intentionally does not alter runtime behavior.
- `shadow` and `canary` exist as runtime/enforcement vocabulary but are not proven as active MVP canonical target records.

## Residual Risks

- No production publish source reader exists yet, so AAF evidence still cannot consume this table.
- No audited admin workflow exists yet for target policy changes.
- `source_watermark` is explicitly maintained; future writers/readers must preserve deterministic update discipline.
- No site-scoped target override table exists yet; this is intentional until a concrete consumer is designed.

## Safety Conclusion

PTT-1 is safe to accept as a persistence-core phase. It adds canonical publish target storage, constrained vocabulary, explicit MVP seed data, closed-by-default RLS, static tests, disposable local DB verification, and closeout documentation while leaving runtime behavior and external providers untouched.

## Recommended Next Milestone

Wait for architectural review. The next reviewed milestone should be the read-only production publish activation source reader that consumes AAF, DDOM, runtime, content, approval, and publish target source truth without importing mutation surfaces. Do not implement live publish route shadow integration or blocking enforcement until that reader is reviewed.

## Commands Run

- `pwd`
- `git status --short`
- `rg --files docs apps/platform/supabase gnr8 apps/platform app 2>/dev/null`
- `sed -n ...` on the required docs listed above
- `sed -n ...` on the publish route, runtime publish orchestrator, guard, enforcement, safety check, runtime types, runtime store, and relevant migrations listed above
- `rg -n "publish_stage|publishStage|stage|shadow|canary|production|publishApprovedSiteVersion|publishActivation|active pointer|active_pointer" apps/platform/gnr8/runtime apps/platform/app/api/gnr8 packages/gnr8-runtime-contracts/src apps/platform/supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'`
- `rg -n "publishTarget|intendedPublishTarget|source key|sourceKey|publish_activation|source_table|sourceRef|watermark|privacy_label|retention_class|created_by_actor_type" apps/platform/gnr8/aaf packages/gnr8-runtime-contracts/src apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql -g '*.ts' -g '*.sql'`
- `rg -n "site_publish_target|publish_target|target policy|publish target|target_id|site_id.*target" apps/platform docs/architecture docs/product -g '*.ts' -g '*.tsx' -g '*.sql' -g '*.md'`
- `pnpm exec tsx --test apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `pnpm exec tsx --test apps/platform/gnr8/ptt/publish-target-source-truth-persistence.integration.test.ts`
- `git diff --check`
- `git diff --name-only`
- `git status --short`
- `git ls-files --others --exclude-standard`
- `rg -n "[ \\t]+$" apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts apps/platform/gnr8/ptt/publish-target-source-truth-persistence.integration.test.ts docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
