# GNR8 Single-Site MVP CUTLINE-5 Closeout

Phase: MVP-CUTLINE-5
Scope: commit/deploy/migration application bundle plan for the first one-site MVP rehearsal.

## Files Reviewed

Worktree and history review:

- `git status --short`
- `git diff --name-only`
- `git diff --stat`
- recent `git log --name-status` for single-site, publish operator, Command Center, migrations, docs, and canonical index paths.

Documentation reviewed:

- `docs/product/gnr8-single-site-one-site-rehearsal-plan.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/architecture/gnr8-single-site-mvp-migration-and-env-inventory.md`
- `docs/product/gnr8-single-site-mvp-cutline-4-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Implementation and schema inventory reviewed by path/status/history:

- `apps/platform/gnr8/single-site/**`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/**`
- `apps/platform/app/api/gnr8/admin/single-site-publish/**`
- `apps/platform/app/gnr8/command-center/single-site-publish/**`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql` through `20260806120000_single_site_publish_operator_action_audit.sql`

## Created / Updated

Created:

- `docs/product/gnr8-single-site-mvp-commit-bundle-plan.md`
- `docs/product/gnr8-single-site-mvp-precommit-validation-plan.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/product/gnr8-single-site-mvp-cutline-5-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Git Status Classification Summary

At the start of CUTLINE-5, the only uncommitted files were:

- one modified tracked docs/index file;
- four untracked CUTLINE-4 docs.

No uncommitted implementation or SQL migration files were present. CUTLINE-5 adds four docs and updates the canonical index only.

Classification:

- Include in MVP rehearsal docs commit: CUTLINE-4 docs, CUTLINE-5 docs, canonical index.
- Include but docs-only: all current uncommitted files.
- Include but requires special review: committed runtime paths for shadow-publish, generic operator action route, publish activation wrapper/guard, and migrations before deploy.
- Exclude/defer: none from the current worktree.
- Unknown/requires human decision: whether seeded first-rehearsal data is allowed and whether any shadow-publish result can count as validation evidence.

## Commit Bundle Recommendation

Proceed to a commit-prep task after human review of the bundle plan.

Recommended branch: create a release/rehearsal branch before staging, preferably `codex/gnr8-single-site-mvp-rehearsal-bundle`.

Recommended commit split:

1. Documentation/index commit containing CUTLINE-4 and CUTLINE-5 docs.
2. Runtime/migration release commit only if the implementation baseline differs from the already committed `main`/`origin/main` state.

Because `main` currently points at `origin/main` and recent single-site implementation files are already committed, the immediate local commit should be docs/index only.

## Migration Application Plan Summary

Required online migration chain, in order:

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

Apply migrations after deploy approval and before online route verification. If any migration fails, stop, restore from backup/PITR, validate in disposable DB, and require approval before retrying.

## Precommit Test Plan Summary

Must-pass:

- `git diff --check`
- changed-file scope check
- docs readability and canonical index reference check
- CUTLINE-2 orchestration test
- CUTLINE-3 facade and route tests
- MVP-54 dry-run route test
- MVP-56 shadow-publish route test
- MVP-57 audit test
- Command Center panel and projection tests
- publish wrapper/resolver/guard tests

Should-run:

- approval/readiness chain tests;
- publish activation integration tests where local dependencies allow;
- disposable DB migration application and catalog/RLS checks;
- focused TypeScript no-emit.

Known non-blockers:

- unrelated app-wide typecheck drift;
- DB-backed tests skipped solely because local `DATABASE_URL` is unavailable;
- unrelated provider/domain/billing runtime tests.

## Env / Feature Flag Plan Summary

Required baseline env:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only where already required
- `SUPERADMIN_EMAILS`

Rehearsal flag posture:

- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`: off/unset for deploy, status, preflight, and dry-run; enable only after explicit approval.
- `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW`: `enabled` only for approved publish/shadow observation.
- `GNR8_PUBLISH_ACTIVATION_SHADOW_GATE`: off/unset unless intentionally testing the older observer path.
- Provider/billing/domain/DNS/Stripe/Vercel/Openprovider flags and secrets: unchanged.
- Any blocking publish enforcement flag: remain off unless separately approved.

## Human Approval Gates

Explicit approval is required before:

- staging files;
- committing;
- pushing;
- applying migrations;
- enabling shadow-publish;
- running online shadow-publish;
- retrying after a migration or mutation failure;
- counting a selected site as MVP validation.

## Online Verification Checklist Summary

After commit, push, deploy, migrations, env verification, admin auth, and selected site data are ready:

1. Verify deployment commit and health.
2. Verify migration catalog/RLS checks.
3. Log in as superadmin.
4. Open the Command Center single-site publish panel.
5. Call the status route.
6. Call action preflight.
7. Run dry-run through action route or direct MVP-54 route.
8. Inspect audit and refresh panel.
9. Stop or request explicit shadow-publish approval.
10. If approved, enable shadow flag and run shadow-publish.
11. Verify active pointer/public or preview behavior.
12. Record pass/fix/stop and whether the site counts toward MVP validation.

Online GNR8 verification is not needed during CUTLINE-5. It is the next release/rehearsal step after the bundle is reviewed, committed, pushed, deployed, migrated, and configured.

## Risk Register Summary

Key risks and current blocking posture:

- Long phase-chain review size: mitigated by grouped bundle inventory; not blocking if focused review passes.
- Migrations not applied: blocking for online rehearsal.
- Full platform typecheck drift: not blocking if focused checks pass and drift is unrelated.
- Shadow-publish active pointer risk: not blocking dry-run; blocking shadow-publish until explicit approval.
- Seeded data vs real-flow truth: not blocking route rehearsal; blocks validation-counting run unless replayed through real flow.
- Supabase RLS/policy expectations: blocking if auth/RLS checks fail.
- Env flag mistakes: blocking until env readback is approved.
- Broad generic publish/operator action route: blocking if allowlist/auth/actor-override tests fail.
- Provider/domain/billing accidental side effects: blocking if observed.

## Recommendation

Recommended next milestone: **MVP-CUTLINE-6: human-reviewed commit prep and focused precommit validation**.

That milestone should create/switch to the release branch, run the must-pass focused suite, decide whether disposable DB migration validation is feasible, and ask for human approval before staging. It should still not deploy or apply migrations unless explicitly promoted from commit prep to release execution.

## Boundary Confirmation

CUTLINE-5 changed documentation and the canonical index only. No runtime behavior changed. No files were staged. No commit, push, deploy, Supabase migration application, production/staging Supabase call, provider action, DNS/domain action, billing/Stripe action, Vercel/Openprovider action, or implementation file modification was performed.
