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

### MVP-CUTLINE-20 Production Migration Status

Status as of 2026-08-17: the production Supabase migration gate for the single-site MVP is complete.

- Migration count reconciliation: passed; the current checklist resolved the required set as 18 migrations.
- Target: production Supabase project `ujfbpzugdsdmroqvhfvn`, database host `aws-1-eu-west-1.pooler.supabase.com`, database `postgres`.
- Execution: all 18 required migrations were applied by `supabase db push --linked --yes`; no migration failed or was skipped.
- Post-migration readback: passed; 76 expected tables were present, RLS was enabled on all expected tables, 49 expected append-only triggers were present, and AAF vocabulary/contract constraints contained the required single-site approval and launch-readiness evidence vocabulary.
- Backup posture used for the gate: recorded evidence `backup_restore_confirmed`, latest visible backup `17 Aug 2026 03:08:21 (+0000)`; Supabase Storage objects remain outside database backups.
- Online verification gate: unblocked for the migration/catalog prerequisite only. Deploy, env flag, superadmin auth, selected site data, dry-run, shadow-publish, provider, DNS/domain, billing, Vercel/Openprovider, and runtime publish verification were not performed in CUTLINE-20.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-20-production-migration-execution-closeout.md`.

### MVP-CUTLINE-21 Online Verification Preflight

Status as of 2026-08-17: the first read-only online verification preflight completed with a governed dry-run no-go: `dry_run_blocked_missing_site_data`.

- Platform app health: `GET https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel and rendered the GNR8 shell.
- Worker health: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `{"ok":true,"service":"gnr8-worker","status":"ready"}`.
- Deploy ref posture: production was supplied as `main / ba0d070`, but exact commit was not independently observable from public HTTP headers or local Vercel metadata in this workspace.
- Safe flag posture from the available production env artifact: `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` missing and `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` missing.
- Superadmin auth and panel: `/gnr8/command-center/single-site-publish` loaded in the in-app browser as `Superadmin Workspace`; the panel rendered `read only`, `state lookup required`, and all mutation boundary flags false.
- Admin endpoint safety: unauthenticated `GET /api/gnr8/admin/single-site-mvp/status` and unauthenticated `POST /api/gnr8/admin/single-site-mvp/action` both returned HTTP 401 `SUPERADMIN_REQUIRED`, redactions, and all mutation flags false.
- Production read-only DB source truth: 18/18 required migration versions remained present; `gnr8_publish_targets` contained `production / production / active / ptt-1`; candidate source-truth rows were missing (`gnr8_single_site_migrations=0`, launch readiness records `0`, operator audit rows `0`).
- Dry-run: not run because the exact approval sentence was absent and no selected site/migration source truth exists.
- Shadow-publish/runtime publish: not run.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-21-online-verification-preflight.md`.

### MVP-CUTLINE-22 Rehearsal Candidate Source-Truth Plan

Status as of 2026-08-17: source-truth planning completed with no production mutation. The recommended first candidate path is a real selected production site created later through the canonical client-scoped import and capture-spine workflow, not a legacy import, inferred existing runtime site, seeded internal test, or exception fixture by default.

Online verification remains blocked until a candidate has at minimum tenant/client/site/migration identity, source evidence, accepted source evidence review, clone/review refs, proposal and implementation authorization refs, improved candidate and review refs, content/client/launch approval refs, launch readiness evidence, publish activation request/decision/gate refs, handoff and gate input watermarks, and the exact dry-run request refs.

Plan: `docs/product/gnr8-single-site-mvp-cutline-22-rehearsal-candidate-source-truth-plan.md`.

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
- [ ] CUTLINE-22 candidate source-truth requirements are satisfied for the selected site;
- [ ] superadmin auth is verified;
- [ ] dry-run preflight has passed or failed with an expected source-truth blocker.

CUTLINE-21 result: migration/catalog, app health, worker health, and superadmin panel prerequisites were confirmed, but selected site data does not exist in production. Governed dry-run remains blocked until a source-truth rehearsal candidate is created or identified.

CUTLINE-22 result: the next source-owned path is defined, but no candidate was created. Governed dry-run and online verification remain blocked until the future candidate creation milestone records the required source-truth chain.

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
