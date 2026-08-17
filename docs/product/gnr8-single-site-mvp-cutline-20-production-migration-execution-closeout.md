# GNR8 Single-Site MVP CUTLINE-20 Production Migration Execution Closeout

Date: 2026-08-17
Scope: production Supabase migration execution and read-only post-migration catalog verification for the GNR8 single-site MVP.

## Decision

CUTLINE-20 completed the migration/catalog prerequisite for online verification.

- Migration count reconciliation: passed.
- Required migration count: 18.
- Executed migration count: 18.
- Failed migration count: 0.
- Skipped migration count: 0.
- Online verification gate after migration: unblocked for the migration/catalog prerequisite only.

The explicit prompt listed 13 filenames, but the current readiness checklist and committed migration bundle plan resolved the full approved set as 18 chronological migrations. The five reconciled prerequisite migrations were:

- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`
- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`

## Preflight

- Git status before execution: clean; no pending app/runtime/service/SQL source changes.
- Production code state: `main` at `ba0d070c`, matching the requested production commit.
- Approval state: CUTLINE-19 handoff recorded `migration_execution_approved_pending_run` with the approval sentence "I approve applying the 18 production Supabase migrations for GNR8 single-site MVP."
- Backup posture: accepted from recorded evidence only, `backup_restore_confirmed`; latest visible backup `17 Aug 2026 03:08:21 (+0000)`. Restore was not clicked or invoked. Supabase Storage objects remain outside database backups.
- Target confirmation: local Supabase link and production URL both resolved to project ref `ujfbpzugdsdmroqvhfvn`; linked project name `GNR8`.
- Target database readback after execution: host `aws-1-eu-west-1.pooler.supabase.com`, database `postgres`, user `postgres`, PostgreSQL `17.6`.

## Migration Execution

Execution command: `supabase db push --linked --yes` from `apps/platform`.

Status per migration:

| Order | Migration | Status |
| --- | --- | --- |
| 1 | `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql` | applied |
| 2 | `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql` | applied |
| 3 | `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql` | applied |
| 4 | `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql` | applied |
| 5 | `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql` | applied |
| 6 | `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql` | applied |
| 7 | `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql` | applied |
| 8 | `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql` | applied |
| 9 | `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql` | applied |
| 10 | `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql` | applied |
| 11 | `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql` | applied |
| 12 | `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql` | applied |
| 13 | `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql` | applied |
| 14 | `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql` | applied |
| 15 | `apps/platform/supabase/migrations/20260803210000_single_site_launch_approval_core.sql` | applied |
| 16 | `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql` | applied |
| 17 | `apps/platform/supabase/migrations/20260804143000_aaf_single_site_launch_readiness_evidence_type.sql` | applied |
| 18 | `apps/platform/supabase/migrations/20260806120000_single_site_publish_operator_action_audit.sql` | applied |

Post-execution `supabase migration list --linked` showed matching local and remote versions for all 18 required migrations.

## Readback Results

Read-only catalog verification passed.

- Expected tables from the 18 SQL files: 76.
- Present expected tables: 76.
- Missing expected tables: 0.
- Tables with RLS disabled among expected tables: 0.
- Expected append-only triggers from the 18 SQL files: 49.
- Present expected append-only triggers: 49.
- Missing append-only triggers: 0.
- AAF check constraints inspected: 44.
- Missing AAF vocabulary tokens: 0.
- Seeded publish target row: `id=production`, `environment=production`, `target_kind=public_runtime`, `publish_stage=production`, `status=active`, `policy_version=ptt-1`.

Grouped catalog readback:

| Group | Expected | Present |
| --- | ---: | ---: |
| AAF tables | 20 | 20 |
| DDOM readiness tables | 2 | 2 |
| Publish target tables | 1 | 1 |
| Single-site content/client/launch approval tables | 15 | 15 |
| Launch readiness tables | 6 | 6 |
| Publish operator audit tables | 3 | 3 |

AAF vocabulary/contract readback confirmed:

- `single_site_improvement_implementation_authorization`
- `single_site_content_approval`
- `single_site_client_approval`
- `single_site_launch_approval`
- `single_site_improvement_implementation_authorization_evidence`
- `single_site_content_approval_evidence`
- `single_site_client_approval_evidence`
- `single_site_launch_approval_evidence`
- `single_site_launch_readiness_evidence`
- `granted_with_limitations`

## Boundary Confirmation

Performed:

- Production Supabase migration execution.
- Production Supabase read-only migration-history and catalog verification.
- Docs/index closeout updates.

Not performed:

- Deploy or redeploy.
- Vercel/provider/DNS/domain/billing/Stripe/Openprovider calls.
- Vercel env mutation.
- Dry-run, shadow-publish, online verification, runtime publish, active-pointer mutation, rollback, or provider execution.
- App/runtime/service/SQL file changes.
- Commit or push.

## Validation

Local validation after doc updates:

- `git diff --check`: passed.
- trailing whitespace scan on changed docs: passed.
- changed-file scope verification: passed; changed files are docs/index only.

Recommended next milestone: MVP-CUTLINE-21 online verification preflight and execution, beginning with deploy health on `ba0d070`, env flag posture, superadmin auth, selected source-truth site data or explicit MVP exceptions, then read-only status/preflight and governed dry-run. Shadow-publish remains out of scope until dry-run passes and a separate explicit approval records active-pointer mutation risk.
