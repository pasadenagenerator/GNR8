# GNR8 Single-Site MVP CUTLINE-17 Deploy Ref Resolution And Migration Plan

Date: 2026-08-17
Phase: MVP-CUTLINE-17
Scope: documentation-only production deployment ref resolution record and exact migration execution plan preparation after production Supabase backup/restore confirmation.

## Boundary

This phase inspected local Git state, cached remote-tracking refs, prior cutline documentation, and migration filenames only.

No deploy was performed. No redeploy was triggered. No Vercel API/provider call was made. No Supabase migration was applied. No production or staging Supabase call was made. No online GNR8 verification was run. No dry-run was run. No shadow-publish was run. No env vars or flags were read from or mutated in a provider. No runtime, app, service, SQL, active pointer, domain, DNS, billing, publish target, provider state, or Supabase state was changed. No commit, push, merge, rebase, hard reset, or branch deletion was performed.

## Inputs

Human-provided current known state:

- Supabase backup/restore posture: `backup_restore_confirmed`.
- Latest visible backup: `17 Aug 2026 03:08:21 (+0000)`.
- Storage caveat: Supabase Storage objects are not included in database backups.
- Migration approval: `not_approved`.
- Online verification: `blocked`.
- Prior conservative deploy-ref gate: `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`.
- `origin/main`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.
- Prior Vercel/production-reported commit: `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`, on release branch only.

No new Vercel deployment SHA was provided in this phase.

No explicit human confirmation was provided in this phase that production was redeployed to `origin/main` `ba0d070cb77da5fb8fc3618469c567c5aeb4b356` or a newer intended main commit.

No explicit human approval was provided in this phase to accept production intentionally remaining on release branch `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`.

No explicit migration execution approval was provided in this phase.

## Local Git State

Git state observed for this decision:

- Current branch: `codex/single-site-mvp-cutline-release`
- Current HEAD: `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`
- Local branch tracking state: `codex/single-site-mvp-cutline-release...origin/codex/single-site-mvp-cutline-release`
- `origin/main`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`
- `origin/codex/single-site-mvp-cutline-release`: `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`
- Commit `88c0a3b`: `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`
- Commit `ba0d070`: `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`

Containment result for `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`:

- On `origin/main`: no.
- On local `codex/single-site-mvp-cutline-release`: yes.
- On `origin/codex/single-site-mvp-cutline-release`: yes.
- Classification: `on_release_branch_only`.

Containment result for `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`:

- On local `main`: yes.
- On `origin/main`: yes.
- On `origin/HEAD -> origin/main`: yes.

## Production Deployment Ref Decision

Production deployment ref decision: `production_ref_still_blocked`.

Reason:

- The human did not provide a new Vercel deployment SHA in this phase.
- The human did not explicitly say production has been redeployed to main and did not provide or mention `ba0d070` or a newer `origin/main` SHA as the deployed production ref.
- The human did not explicitly say production may intentionally remain on release branch `88c0a3b`.
- The prior production-reported commit remains known locally as release-branch-only, while `origin/main` remains `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`.

## Migration Gate Decision

Migration gate decision: `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`.

Migration approval: `not_approved`.

Reason:

- Production database backup/restore posture is confirmed.
- Supabase Storage objects are not included in database backups and remain a restore-planning caveat.
- The production deployment ref remains unresolved.
- No separate explicit migration execution approval was provided.

The migration gate must move to `migration_gate_ready_for_execution_approval` only after the production deployment ref is explicitly corrected to main or explicitly accepted as the release branch, while backup posture remains confirmed. Migration execution still requires a separate explicit approval after that gate is ready.

## Exact Migration Execution Plan

This is a future execution plan only. Do not run it until a later phase records both a resolved production deployment ref and explicit migration execution approval.

### Preflight Checks

- Confirm production deployment ref decision is either `production_ref_corrected_to_main` or `production_ref_accepted_release_branch`.
- Confirm migration gate is `migration_gate_ready_for_execution_approval`.
- Confirm migration approval is explicitly changed from `not_approved` by the human for the named target environment.
- Confirm target environment is production and the database connection points to the intended production Supabase project.
- Confirm latest visible database backup remains acceptable for the execution window; current known latest visible backup is `17 Aug 2026 03:08:21 (+0000)`.
- Record rollback/restore owner and path before execution.
- Record that Supabase Storage objects are not included in database backups.
- Capture read-only current migration history before applying anything.
- Confirm none of the 18 required migration filenames are already partially applied with divergent content.
- Confirm no app deploy, env mutation, dry-run, shadow-publish, or online verification is bundled into the migration execution phase.

### Required Migration Order

Apply exactly these 18 migrations in chronological repository order:

1. `20260722120000_aaf_persistence_core.sql`
2. `20260727120000_ddom_readiness_snapshot_persistence_core.sql`
3. `20260727130000_publish_target_source_truth_persistence_core.sql`
4. `20260729120000_single_site_state_evidence_spine.sql`
5. `20260730120000_single_site_clone_review_core.sql`
6. `20260730143000_single_site_improvement_proposal_planning_core.sql`
7. `20260730170000_aaf_single_site_implementation_authorization_scope.sql`
8. `20260731100000_aaf_granted_with_limitations_status.sql`
9. `20260731120000_single_site_improvement_execution_core.sql`
10. `20260731143000_single_site_improved_version_review_core.sql`
11. `20260803120000_aaf_single_site_content_approval_scope.sql`
12. `20260803143000_single_site_content_approval_core.sql`
13. `20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
14. `20260803190000_single_site_client_approval_core.sql`
15. `20260803210000_single_site_launch_approval_core.sql`
16. `20260804120000_single_site_launch_readiness_core.sql`
17. `20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
18. `20260806120000_single_site_publish_operator_action_audit.sql`

### Stop Criteria

Stop before execution if:

- Production deployment ref remains `production_ref_still_blocked`.
- Migration approval remains `not_approved`.
- Backup/restore posture is no longer `backup_restore_confirmed`.
- The target project, target environment, or database connection cannot be proven.
- Migration history shows a partial or divergent application state.
- The execution operator cannot record rollback/restore ownership.
- Any command would apply to staging, local, or an unknown database instead of the intended production target.
- Any required migration file is missing from the checked-out source tree.

Stop during execution if:

- Any migration fails.
- Any migration applies out of order.
- Any unexpected destructive operation, policy drift, or privilege error appears.
- The execution tool reports a target environment mismatch.
- Any provider, deploy, env, dry-run, shadow-publish, or online verification action is triggered unexpectedly.

Stop after execution if:

- Read-only migration history does not show all 18 required migrations.
- Required catalog objects, policies, or indexes are missing.
- Application health checks fail in a way that suggests migration fallout.
- Audit or single-site readiness reads expose raw SQL, secrets, stack traces, or unsafe diagnostics.

### Post-Migration Verification Checklist

- Confirm read-only migration history includes all 18 filenames above.
- Confirm no additional unexpected migration was applied in the same phase.
- Confirm required AAF persistence, DDOM readiness snapshot, publish target source truth, single-site state/evidence, clone review, improvement proposal, implementation authorization, improvement execution, content approval, client approval, launch approval, launch readiness, and publish operator audit catalog objects exist.
- Confirm expected RLS/policy posture for newly introduced tables.
- Confirm post-migration application health is acceptable.
- Confirm baseline env and feature flags remain unchanged from the approved posture.
- Confirm no Vercel/provider deploy or redeploy occurred as part of migration execution.
- Confirm online verification remains blocked until this post-migration evidence is recorded and a separate online verification phase is approved.
- Record database restore caveat: database restore is possible from Supabase backups, but Supabase Storage objects are not included in database backups.

## Online Verification Gate

Online verification remains blocked.

Blocking reasons:

- Production deployment ref decision is `production_ref_still_blocked`.
- Migration gate is `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`.
- Migration approval remains `not_approved`.
- Required migrations have not been applied in this phase.
- No online verification approval was provided.

## Preserved No-Go State

No migrations are approved now.

Online verification remains blocked.

No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was performed.

## Validation

Commands/checks run for this phase:

- `git status --short --branch`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git rev-parse origin/codex/single-site-mvp-cutline-release`
- `git rev-parse 88c0a3b`
- `git rev-parse ba0d070`
- `git branch --contains 88c0a3b0dfa8a10ab3c94748b533e6664fc637cb --all`
- `git branch --contains ba0d070cb77da5fb8fc3618469c567c5aeb4b356 --all`
- `git show-ref --verify refs/remotes/origin/main`
- `git show-ref --verify refs/remotes/origin/codex/single-site-mvp-cutline-release`
- required migration filename existence check
- documentation readback before edits
- documentation readback after edits
- `git diff --check`
- trailing whitespace scan on changed docs
- changed-file scope check: docs/index only
- SQL/app/runtime/service changed-file check
- boundary confirmation that no deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, or online verification action was performed

Validation result:

- Documentation/index updates only.
- `git diff --check` passed.
- Trailing whitespace scan found no matches in changed docs.
- No SQL/app/runtime/service files changed.
- No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, or online verification action was performed.

## Recommended Next Milestone

Recommended next milestone: MVP-CUTLINE-18 production deploy ref human decision intake.

That milestone should remain documentation/intake-only unless the human separately provides the corrected production deployed SHA or explicitly accepts the release-branch deployment. Migration execution must remain blocked until a later separate phase records explicit migration execution approval.
