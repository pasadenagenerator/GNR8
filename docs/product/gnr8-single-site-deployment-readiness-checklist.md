# GNR8 Single-Site Deployment Readiness Checklist

Phase: MVP-CUTLINE-4
Scope: checklist for the first one-site MVP rehearsal.

## Release Scope

- [ ] Confirm the worktree is clean before preparing the release commit.
- [ ] Confirm the release includes MVP-CUTLINE-2 orchestration service files.
- [ ] Confirm the release includes MVP-CUTLINE-3 operator action facade and admin routes.
- [ ] Confirm the release includes MVP-54 dry-run route and MVP-56 shadow-publish route.
- [ ] Confirm the release includes MVP-57 operator action audit migration/service integration.
- [ ] Confirm the release includes Command Center read-only publish operator panel through MVP-64 committed scope.
- [ ] Confirm MVP-CUTLINE-4 docs and canonical index are included.
- [ ] Confirm no unrelated runtime, route, provider, billing, domain, DNS, SQL, UI, worker, or generated files are included.

## Local Static Checks

Run these locally before online deploy. If broader checks are too noisy due to unrelated existing issues, record the exact focused checks and known unrelated failures.

- [ ] `git diff --check`
- [ ] trailing whitespace check over changed docs
- [ ] changed-file scope check: docs/index only for MVP-CUTLINE-4
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- [ ] `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`

## Migration Application

Apply migrations in repository order. Required before the one-site rehearsal and before online deploy:

- [ ] `20260722120000_aaf_persistence_core.sql`
- [ ] `20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- [ ] `20260727130000_publish_target_source_truth_persistence_core.sql`
- [ ] `20260729120000_single_site_state_evidence_spine.sql`
- [ ] `20260730120000_single_site_clone_review_core.sql`
- [ ] `20260730143000_single_site_improvement_proposal_planning_core.sql`
- [ ] `20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- [ ] `20260731100000_aaf_granted_with_limitations_status.sql`
- [ ] `20260731120000_single_site_improvement_execution_core.sql`
- [ ] `20260731143000_single_site_improved_version_review_core.sql`
- [ ] `20260803120000_aaf_single_site_content_approval_scope.sql`
- [ ] `20260803143000_single_site_content_approval_core.sql`
- [ ] `20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- [ ] `20260803190000_single_site_client_approval_core.sql`
- [ ] `20260803210000_single_site_launch_approval_core.sql`
- [ ] `20260804120000_single_site_launch_readiness_core.sql`
- [ ] `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
- [ ] `20260806120000_single_site_publish_operator_action_audit.sql`

Do not apply migrations to production or staging during MVP-CUTLINE-4. This checklist is for the next release step.

## Environment Flags

Baseline non-flag environment required for the internal surfaces:

- [ ] `DATABASE_URL` available to server-side repositories that read/write the single-site, AAF, publish target, and operator audit tables.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` available for auth helpers.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` available only where the deployment already requires server-side Supabase service role access.
- [ ] `SUPERADMIN_EMAILS` includes the rehearsal operator account.

Safe pre-shadow posture:

- [ ] `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` unset/disabled.
- [ ] `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=enabled` only when observing publish activation guard diagnostics during publish execution.
- [ ] `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE` unset/disabled unless testing the older PASR evidence/gate dry-run observer.

Shadow-publish posture, explicit approval required:

- [ ] `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION=enabled`
- [ ] `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=enabled`
- [ ] operator request confirmation includes `publishMayExecute: true`, `runtimeMutationMayOccur: true`, `blockingEnforcementApplied: false`, and `noAutomaticRollback: true`.

## Admin Auth And Route Access

- [ ] `/gnr8/command-center/single-site-publish` requires platform superadmin page auth.
- [ ] `GET /api/gnr8/admin/single-site-mvp/status` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-mvp/action` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-publish/dry-run` requires superadmin auth.
- [ ] `POST /api/gnr8/admin/single-site-publish/shadow-publish` requires feature flag and superadmin auth.
- [ ] Non-superadmin requests fail with 401/403.
- [ ] Request bodies cannot override `actor`, `actorId`, `actorRole`, `userId`, `principal`, or `superadminUserId`.

## Online Verification Trigger

Online verification is triggered only after:

- [ ] release commit exists;
- [ ] branch is pushed to the target deploy path;
- [ ] deployment succeeds;
- [ ] all required Supabase migrations are applied to the target environment;
- [ ] env flags are set according to the approved rehearsal mode;
- [ ] selected site data exists or explicit MVP exceptions are recorded;
- [ ] superadmin auth is verified;
- [ ] dry-run preflight has passed or failed with an expected source-truth blocker.

## Post-Main Landing Gate

MVP-CUTLINE-11 reviewed the post-merge state after the release branch landed on
`main`. Before any online verification, confirm these main-line gates:

- [ ] GitHub `main` is `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- [ ] The deployment target is running `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- [ ] Deployment status is healthy in the deployment platform or GitHub deployment UI.
- [ ] Local `main` has been fast-forwarded only if local work needs the updated branch state.
- [ ] All 18 required migrations in this checklist are applied to the intended target environment.
- [ ] Env/flag posture matches the approved rehearsal mode.
- [ ] One real site and all required refs are selected, or first-rehearsal exceptions are recorded.

If any of these are unknown, online verification remains blocked.

## Manual Deployment Status Gate

MVP-CUTLINE-12 recorded `blocked_waiting_for_manual_deploy_status` because
human deployment status for `origin/main`
`ba0d070cb77da5fb8fc3618469c567c5aeb4b356` was not provided.

Current gate decisions:

- Migration gate: `migration_no_go_deploy_unknown`.
- Env/auth gate: `env_no_go_unknown`.
- One-site rehearsal readiness: `blocked_waiting_for_deploy_status`.

Before migration/env gate execution, a human must confirm deploy status, deploy
target, deploy health, and whether any unexpected deploy/provider activity
occurred.

## Deployment Confirmation Intake Gate

MVP-CUTLINE-13 recorded human-provided deployment and environment intake for
`origin/main` `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.

Current intake decisions:

- Deployment target/health gate: `manually_confirmed_production_healthy`.
- Commit-match gate: `needs_manual_commit_reconciliation` because Vercel was reported as showing deployed commit `88c0a3b`.
- Env presence gate: `baseline_presence_confirmed_shadow_flags_off`.
- Superadmin gate: `manual_operator_access_confirmed`.
- Supabase target gate: `production_target_confirmed_backup_restore_unknown`.
- Migration gate: `not_approved_backup_restore_unknown_commit_reconciliation_required`.
- First rehearsal site gate: `site_selected_refs_missing`.

Do not apply migrations until the Vercel commit value is reconciled or explicitly
accepted by the release owner, production backup/restore posture is known, and a
separate migration execution phase is approved.

## Vercel Commit Reconciliation Gate

MVP-CUTLINE-14 reconciled the manually reported Vercel commit `88c0a3b` as
`88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`, a known same-repository commit on
`origin/codex/single-site-mvp-cutline-release`.

Current reconciliation decisions:

- Commit lookup: `found_on_release_branch`.
- Relationship to `origin/main` `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`: not equal, not ancestor, not descendant.
- Main/ref state: `origin/main` remained `ba0d070cb77da5fb8fc3618469c567c5aeb4b356` after fetch.
- Migration gate: `migration_gate_blocked_wrong_deploy_ref`.
- Backup/restore gate: `blocked_backup_restore_posture_unknown`.
- Online verification gate: `blocked_deploy_ref_and_migration_posture`.

Do not apply migrations or run online verification until the release owner
accepts production intentionally deploying the release branch at
`88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`, or production is corrected to the
intended `origin/main` commit and the deployed SHA is recorded. Production
Supabase backup/restore posture and a separate migration execution approval are
still required in either case.

## Production Deploy Ref Decision Gate

MVP-CUTLINE-15 inspected local Git refs and the human-provided current known
state before any Supabase migration or online verification work.

Current production ref decisions:

- Reported deployed SHA classification: `on_release_branch_only`.
- Production deployment decision: `wait / unknown`.
- Exact production ref outcome: `production_ref_still_blocked`.
- Migration gate: `migration_gate_blocked_wrong_deploy_ref`.
- Backup/restore posture: `backup_restore_unknown`.
- Backup/restore gate: `blocked_backup_restore_posture_unknown`.
- Online verification gate: `blocked_deploy_ref_and_migration_posture`.

Do not apply migrations, run dry-run, run shadow-publish, or run online
verification until a human release owner explicitly accepts the release-branch
production deployment or confirms production has been corrected to the intended
`origin/main` ref. Production backup/restore posture and a separate migration
execution approval are still required even after the deployment ref is resolved.

## Supabase Pro Upgrade Backup Gate

MVP-CUTLINE-16B recorded the human decision: "Supabase will be upgraded to Pro,
which enables backups."

Current backup and migration decisions:

- Backup/restore posture: `backup_restore_pending_pro_upgrade`.
- Migration gate: `migration_gate_blocked_waiting_for_pro_backup_confirmation`.
- Migration approval: `not_approved`.
- Online verification gate: `blocked_waiting_for_pro_backup_confirmation`.

Production Supabase Free Plan currently reports project backups unavailable.
The safe path is to upgrade the production Supabase project to Pro before any
migration phase. Backup/restore is not confirmed until the Pro upgrade is
complete and backups are visible in Supabase Dashboard > production project >
Database > Backups.

Exact human follow-up needed before migrations:

- Upgrade the production Supabase project to Pro.
- Open Supabase Dashboard > production project > Database > Backups.
- Confirm at least one visible backup or visible backup/PITR capability.
- Report the backup status back before migrations.

No migrations are approved now. Online verification remains blocked. The
production deployment ref decision may still need separate reconciliation.

## Supabase Pro Backup Confirmation Gate

MVP-CUTLINE-16C recorded human-provided Supabase screenshot evidence from the
production project Database > Backups page after the Pro upgrade.

Current backup, migration, and verification decisions:

- Backup/restore posture: `backup_restore_confirmed`.
- Visible backup evidence: scheduled backups are visible, and multiple physical backups have visible Restore buttons.
- Latest visible backup: `17 Aug 2026 03:08:21 (+0000)`.
- Storage caveat: Supabase Storage objects are not included in database backups.
- Migration gate: `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`.
- Migration approval: `not_approved`.
- Online verification gate: `blocked_deploy_ref_and_migration_approval`.

Database backups are confirmed for SQL migration backup posture. Supabase
Storage objects remain outside database backups and must stay documented for any
future restore planning. Because no separate human input has resolved the prior
production deployment ref mismatch, migrations remain unapproved until the
production deploy ref gate is explicitly resolved and a later migration
execution task grants approval.

## Production Deploy Ref Resolution And Migration Plan

MVP-CUTLINE-17 inspected local Git refs and prepared the exact migration
execution plan without applying migrations.

Current deploy-ref and migration decisions:

- Backup/restore posture: `backup_restore_confirmed`.
- Latest visible backup: `17 Aug 2026 03:08:21 (+0000)`.
- Storage caveat: Supabase Storage objects are not included in database backups.
- Production deployment ref decision: `production_ref_still_blocked`.
- Migration gate: `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`.
- Migration approval: `not_approved`.
- Online verification gate: `blocked_deploy_ref_and_migration_approval`.

Local ref inspection confirmed current HEAD and
`origin/codex/single-site-mvp-cutline-release` at
`88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`, while `origin/main` remains
`ba0d070cb77da5fb8fc3618469c567c5aeb4b356`. Because this phase did not receive
a new Vercel deployment SHA, did not receive explicit confirmation that
production was redeployed to main, and did not receive explicit acceptance that
production may intentionally remain on the release branch, the production deploy
ref remains unresolved.

The 18 required migrations are planned in chronological repository order only.
Do not apply migrations until the production deploy ref gate is explicitly
resolved and a separate migration execution approval is recorded.

## Production Deploy Ref Confirmed Gate

MVP-CUTLINE-18B recorded human confirmation that both Vercel production
projects now deploy from `main` at
`ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.

Current deploy-ref, backup, migration, and verification decisions:

- Production deployment ref decision: `production_ref_corrected_to_main`.
- `gnr8-platform` production ref: `main` / `ba0d070`.
- `gnr8-worker` production ref: `main` / `ba0d070`.
- `origin/main`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- Commit `ba0d070`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`, resolving to `origin/main`.
- Backup/restore posture: `backup_restore_confirmed`.
- Latest visible backup: `17 Aug 2026 03:08:21 (+0000)`.
- Storage caveat: Supabase Storage objects are not included in database backups.
- Migration gate: `migration_gate_ready_for_execution_approval`.
- Migration approval: `not_approved`.
- Online verification gate: `blocked_until_migrations_applied_and_verified`.

The prior production deploy-ref blocker is resolved for migration planning
purposes. Migrations remain unapplied and unapproved until a separate migration
execution approval explicitly names the target environment and operation.

## Migration Execution Approval Intake Gate

MVP-CUTLINE-19 recorded migration execution approval intake after production
deploy refs and production database backup posture were confirmed.

Current approval, migration, and verification decisions:

- Exact approval sentence present: yes.
- Approval sentence: `I approve applying the 18 production Supabase migrations for GNR8 single-site MVP.`
- Migration approval: `migration_execution_approved_pending_run`.
- Next migration gate: `migration_execution_ready`.
- Required migration count: 18.
- First migration: `20260722120000_aaf_persistence_core.sql`.
- Last migration: `20260806120000_single_site_publish_operator_action_audit.sql`.
- Backup/restore posture: `backup_restore_confirmed`.
- Latest visible backup: `17 Aug 2026 03:08:21 (+0000)`.
- Storage caveat: Supabase Storage objects are not included in database backups.
- Online verification status: `blocked_until_migrations_applied_and_verified`.

This approval intake does not apply migrations. The next migration gate is ready
for a separate execution phase that applies only the 18 confirmed migration
files in chronological order, records post-migration readback, and keeps online
verification blocked until migration application and verification are complete.

## Online Checklist

- [ ] Open the Command Center panel with selected refs.
- [ ] Confirm panel is read-only and shows no action buttons.
- [ ] Run status route and save redacted response.
- [ ] Run action preflight and save redacted response.
- [ ] Run dry-run through action route or direct MVP-54 route.
- [ ] Confirm audit creation/update for dry-run.
- [ ] Refresh panel and confirm latest audit projection.
- [ ] With explicit approval only, run shadow-publish.
- [ ] Confirm audit creation/update for shadow-publish.
- [ ] If `publishMayHaveExecuted=true`, verify active pointer before/after and public/preview behavior.
- [ ] Confirm no unexpected provider/domain/DNS/billing/Stripe/Vercel/Openprovider calls.
- [ ] Confirm no raw diagnostics or secrets are exposed.
- [ ] Record pass/fix/stop decision.

## Acceptance Boundary

A successful shadow-publish rehearsal is not final MVP acceptance by itself. Final acceptance requires:

- real source capture or documented first-rehearsal exception;
- source-owned approvals/readiness/gate truth;
- online verification;
- no unexpected side effects;
- closeout record;
- repeatability across the later validation set.
