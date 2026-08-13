# GNR8 Single-Site MVP Precommit Validation Plan

Phase: MVP-CUTLINE-5
Scope: focused local validation plan before any staging or commit.

## Validation Boundary

This plan defines commands to run before a human stages or commits the one-site MVP rehearsal bundle. Running these commands must not call production/staging Supabase, apply migrations to shared environments, deploy, push, or run provider/domain/DNS/billing/Stripe/Vercel/Openprovider actions.

Use local unit tests and disposable database checks only. If a command requires online/shared secrets, skip it and record the reason.

## Must-Pass Before Staging

| Area | Command | Expected result | Blocks commit |
| --- | --- | --- | --- |
| Git diff hygiene | `git diff --check` | No whitespace or conflict marker errors | Yes |
| Changed-file scope | `git status --short --untracked-files=all` | Only approved docs/index files are uncommitted for CUTLINE-5 | Yes |
| Docs readability | `test -r docs/product/gnr8-single-site-mvp-commit-bundle-plan.md && test -r docs/product/gnr8-single-site-mvp-precommit-validation-plan.md && test -r docs/product/gnr8-single-site-mvp-online-verification-checklist.md && test -r docs/product/gnr8-single-site-mvp-cutline-5-closeout.md` | All files readable | Yes |
| Canonical index | `rg -n "MVP-CUTLINE-5|gnr8-single-site-mvp-commit-bundle-plan|gnr8-single-site-mvp-precommit-validation-plan|gnr8-single-site-mvp-online-verification-checklist|gnr8-single-site-mvp-cutline-5-closeout" docs/ai/GNR8_CANONICAL_DOC_INDEX.md` | All CUTLINE-5 docs referenced | Yes |
| CUTLINE-2 orchestration | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts` | Pass | Yes |
| CUTLINE-3 facade | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts` | Pass | Yes |
| CUTLINE-3 routes | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts` | Pass | Yes |
| MVP-54 dry-run route | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts` | Pass | Yes |
| MVP-56 shadow-publish route | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts` | Pass, including flag-disabled default | Yes |
| MVP-57 audit | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts` | Pass | Yes |
| Command Center panel | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx` | Pass | Yes |
| Command Center projection | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts` | Pass, including redaction assertions | Yes |
| Publish wrapper | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts` | Pass | Yes |
| Publish metadata resolver | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts` | Pass | Yes |
| Publish enforcement guard | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts` | Pass | Yes |

## Should-Run Before Push/Deploy

| Area | Command | Expected result | Notes |
| --- | --- | --- | --- |
| Integration variants | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts` | Pass together | Catches shared test setup drift. |
| Publish activation integration | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts` | Pass or skip only for documented local dependency guard | Requires careful env isolation. |
| Launch readiness/source chain | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-readiness-source-reader.test.ts apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts apps/platform/gnr8/single-site/launch-readiness-service.test.ts` | Pass | Covers source-readiness dependencies before publish. |
| Approval chain | `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-service.test.ts apps/platform/gnr8/single-site/client-approval-service.test.ts apps/platform/gnr8/single-site/launch-approval-service.test.ts` | Pass | Helps catch seeded-vs-real approval mismatch. |
| Focused TypeScript no-emit | `pnpm exec tsc --noEmit --pretty false --incremental false` from the narrow package/context selected by release owner | Pass or record unrelated app-wide drift | If full app-wide drift exists, run the narrow route/service files through the smallest local no-emit target available. |
| Disposable DB migrations | Apply the ordered `20260722120000` through `20260806120000` migration files to a local disposable Postgres/Supabase DB | Pass; catalog checks pass | Do not use production/staging. Destroy disposable DB after validation. |

## Migration Disposable DB Checks

When a disposable database is available, run the migration chain in exact filename order and then run catalog checks:

```sql
select to_regclass('public.gnr8_aaf_approval_requests') as aaf_requests;
select to_regclass('public.gnr8_aaf_action_gate_attempts') as aaf_gates;
select to_regclass('public.gnr8_ddom_readiness_snapshots') as ddom_snapshots;
select to_regclass('public.gnr8_publish_targets') as publish_targets;
select to_regclass('public.gnr8_single_site_migrations') as single_site_spine;
select to_regclass('public.gnr8_single_site_clone_reviews') as clone_reviews;
select to_regclass('public.gnr8_single_site_improvement_proposal_plans') as proposal_plans;
select to_regclass('public.gnr8_single_site_improvement_execution_attempts') as execution_attempts;
select to_regclass('public.gnr8_single_site_improved_version_reviews') as improved_reviews;
select to_regclass('public.gnr8_single_site_content_approvals') as content_approvals;
select to_regclass('public.gnr8_single_site_client_approvals') as client_approvals;
select to_regclass('public.gnr8_single_site_launch_approvals') as launch_approvals;
select to_regclass('public.gnr8_single_site_launch_readiness_records') as launch_readiness;
select to_regclass('public.gnr8_single_site_publish_operator_actions') as operator_actions;
```

Also verify RLS is enabled on representative new tables:

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'gnr8_aaf_approval_requests',
  'gnr8_single_site_migrations',
  'gnr8_single_site_launch_readiness_records',
  'gnr8_single_site_publish_operator_actions'
)
order by relname;
```

## Guardrail Searches

Run these before staging:

| Guardrail | Command | Expected result |
| --- | --- | --- |
| No implementation files in current docs phase | `git diff --name-only && git ls-files --others --exclude-standard` | Only allowed docs/index files for CUTLINE-5 |
| No actor override acceptance in MVP action route | `rg -n "actorId|actorRole|superadminUserId|principal|userId" apps/platform/app/api/gnr8/admin/single-site-mvp apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts` | Overrides are rejected or server-derived |
| Shadow flag gate is still present | `rg -n "GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION" apps/platform/app/api/gnr8/admin/single-site-publish apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts` | Flag checked before execution |
| Dry-run mutation posture | `rg -n "publishes: false|runtimeMutation: false|dryRun" apps/platform/app/api/gnr8/admin/single-site-publish/dry-run apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts` | Dry-run remains non-publishing/non-mutating |
| Redaction posture | `rg -n "DATABASE_URL|OPENAI_API_KEY|secret|token|stripe|billing|stack" apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts` | Unsafe values are filtered by tests/code |
| No provider/domain/billing calls in operator facade | `rg -n "stripe|billing|domain|dns|vercel|openprovider|provider" apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts apps/platform/app/api/gnr8/admin/single-site-mvp` | No new provider/domain/billing execution path |

## Known App-Wide Failures Not Blocking This Bundle

These are not blockers if the focused suite above passes and the failures are unchanged/unrelated:

- Full platform typecheck drift outside `gnr8/single-site`, admin routes, and Command Center panel.
- DB-backed integration tests that skip or fail solely because `DATABASE_URL` is unavailable in local dev.
- Runtime/provider/billing/domain tests unrelated to the one-site MVP rehearsal path.
- Provider handoff readiness tests that require production-like provider credentials.

Any new failure in the focused single-site, publish activation, operator route, audit, panel, or migration disposable DB checks is blocking.

## Validation Record Template

Before staging, record:

- git status output;
- exact commands run;
- pass/fail/skip result for each command;
- skip reason and owner for any should-run command not executed;
- focused TypeScript result and any known app-wide drift;
- migration disposable DB result or explicit reason it was not feasible;
- confirmation that no files were staged before approval.
