# GNR8 Single-Site Content Approval AAF Contracts DB Verification Closeout

Phase: MVP-27-DB-VERIFY
Date: 2026-08-03
Scope: disposable PostgreSQL verification for MVP-27 AAF SQL vocabulary only

## Result

MVP-27 DB verification succeeded after one real SQL issue was found and fixed.

MVP-27 is now safe to accept. MVP-28 content approval persistence/service core may begin next, bounded to server-only persistence/service work and without UI/API/runtime/publish/domain/billing/provider behavior.

Recommended next milestone: MVP-28 single-site content approval persistence/service core.

## Files Reviewed

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Tooling Found

- Docker CLI installed.
- Docker daemon running and accessible with approval.
- Local Docker image available: `postgres:15`, digest `sha256:5f07e69ced9ee30ec814cd12c555694276bb1d520e971205f39a833362748a3c`.
- Host PostgreSQL binaries unavailable: `psql`, `postgres`, `initdb`, and `pg_ctl` were not found.

## Disposable DB Target

Final verification target:

- Docker image: `postgres:15`
- container: `gnr8-mvp27-db-verify-20260803`
- container id: `5eda8d8b3aa4fb422e269d64c3a9592a32c6a163882209c47db5443a77ee34c4`
- local endpoint: `127.0.0.1:63408`
- database: `gnr8_mvp27_verify`
- user: `gnr8_mvp27_verify`
- mounts: none
- lifecycle: disposable, stopped and removed after validation

No production or staging Supabase instance was contacted.

## Migrations Applied

Applied in the disposable database:

1. `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
2. `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
3. `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
4. `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`

Execution result: all migrations completed with `ON_ERROR_STOP=1`.

MVP-27 table diff result: 20 public tables before MVP-27, 20 public tables after MVP-27, no added or removed tables. MVP-27 changed only AAF constraints.

## Constraints Verified

Catalog verification confirmed these MVP-27 vocabulary constraints:

- `gnr8_aaf_approval_scope_definitions_scope_ck`
- `gnr8_aaf_approval_requests_scope_ck`
- `gnr8_aaf_approval_policy_evaluations_scope_ck`
- `gnr8_aaf_action_gate_attempts_scope_ck`
- `gnr8_aaf_approval_scope_definitions_evidence_type_ck`
- `gnr8_aaf_evidence_packages_type_ck`
- `gnr8_aaf_scope_defs_content_approval_contract_ck`
- `gnr8_aaf_requests_content_approval_subject_ck`
- `gnr8_aaf_policy_evals_content_approval_contract_ck`
- `gnr8_aaf_gate_attempts_content_approval_contract_ck`
- `gnr8_aaf_evidence_content_approval_subject_ck`

Confirmed accepted vocabulary:

- scope: `single_site_content_approval`
- evidence package type: `single_site_content_approval_evidence`
- subject type: `single_site_improved_version_review`
- action: `approve_single_site_content`

## Positive Insert Results

The disposable database accepted minimal valid rows for:

- AAF approval policy fixture
- AAF approval scope definition using `single_site_content_approval`
- AAF approval request using `single_site_content_approval`
- AAF evidence package using `single_site_content_approval_evidence`
- AAF policy evaluation using `single_site_content_approval` and `approve_single_site_content`
- AAF action gate attempt using `single_site_content_approval` and `approve_single_site_content`

Final row count check returned one row each for scope definitions, approval requests, policy evaluations, action gate attempts, and evidence packages.

## Negative Insert Results

The disposable database rejected:

- invalid approval scope: `single_site_content_approval_typo`
- invalid evidence package type: `single_site_content_approval_evidence_typo`
- `single_site_content_approval` request with random subject type
- `single_site_content_approval_evidence` package with random subject type
- `single_site_content_approval` scope definition paired with `content_publish_evidence`
- `single_site_content_approval` gate attempt with action `publish_activation`
- reuse of `approve_single_site_content` under unrelated scope `content_publish`
- broad unrelated evidence value `billing_subscription_readiness`

## RLS, Grants, And Policies

RLS remained enabled on all 20 `gnr8_aaf_%` tables.

`pg_policies` returned 0 policies for affected AAF tables.

`information_schema.role_table_grants` returned 0 `PUBLIC`, `anon`, or `authenticated` grants on affected AAF tables.

MVP-27 added no broad public grants and no broad policies.

## Append-Only Boundary

Append-only behavior remained intact:

- update against `gnr8_aaf_approval_requests` was rejected by the append-only trigger
- delete against `gnr8_aaf_evidence_packages` was rejected by the append-only trigger

MVP-27 did not weaken AAF core append-only triggers.

## Focused Test Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
  - 45 tests passed
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
  - 1 test passed

The first `tsx` run without escalation failed with sandbox IPC `listen EPERM` on a local temp pipe. The same command passed outside the sandbox.

## Type And Static Validation

Passed:

- focused TypeScript no-emit:
  - `pnpm exec tsc --noEmit --pretty false --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --types node packages/gnr8-runtime-contracts/src/aaf-contracts.ts packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `git diff --check`
- trailing whitespace check on changed code files

## Guardrails

Guardrail checks confirmed no changes under app routes, API routes, worker files, runtime implementation files, UI surfaces, Command Center, Ops Inbox, client portal, provider execution, DNS/domain, billing, Stripe, Vercel, Openprovider, publish, rollback, or active pointer paths.

Changed non-document files are limited to:

- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`

No runtime artifacts were modified. No site versions were mutated. No active pointer was mutated. No content approval persistence/service/request workflow/evidence builder was implemented.

## External Provider Non-Call Confirmation

No AI providers, external providers, production Supabase, staging Supabase, Vercel, Openprovider, Stripe, DNS/domain, billing, hosting, publish, rollback, runtime artifact, site version, UI, API route, server action, Command Center, Ops Inbox, client portal, or public runtime services were called.

## Issues Found

Initial disposable PostgreSQL probing found that MVP-27 rejected invalid scope and evidence package type values, but did not reject a `single_site_content_approval` gate attempt with `action_key = 'publish_activation'`.

That was a real database-level contract gap because MVP-27 intended `approve_single_site_content` to be the content approval action vocabulary.

## Fixes Made

Updated `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql` to add narrow content-approval pairing constraints for:

- approval scope definitions: scope, subject, action, and evidence type must match the content approval contract
- approval requests: content approval scope requires `single_site_improved_version_review`
- policy evaluations: content approval scope requires `approve_single_site_content` and `single_site_improved_version_review`
- action gate attempts: content approval scope requires `approve_single_site_content` and `single_site_improved_version_review`
- evidence packages: content approval evidence type requires `single_site_improved_version_review`

Updated `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts` so static tests assert these SQL constraints exist.

No content approval persistence, service, request workflow, decision workflow, or evidence builder was added.

## Residual Risks

- MVP-27 only verifies AAF vocabulary and database contract boundaries. MVP-28 still needs to implement content approval persistence/service core.
- Future MVP-28 work must preserve the exact `single_site_content_approval` plus `single_site_improved_version_review` plus `approve_single_site_content` plus `single_site_content_approval_evidence` pairing.
- The new conditional constraints intentionally do not globally constrain all historic AAF subject/action vocabulary for unrelated scopes.

## Docker Cleanup

Cleanup passed:

- `docker stop gnr8-mvp27-db-verify-20260803` succeeded.
- `docker ps -a --filter name=gnr8-mvp27-db-verify-20260803` returned no containers.
- `docker ps -a --filter name=gnr8-aaf-writer` returned no containers.

## Git Status Summary

Final expected changed files:

- modified `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- modified `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- added `docs/product/gnr8-single-site-content-approval-aaf-contracts-db-verification-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## Commands Run

Key commands run:

- `docker info`
- `command -v psql postgres initdb pg_ctl`
- `docker image inspect postgres:15`
- `docker run -d --name gnr8-mvp27-db-verify-20260803 --rm -e POSTGRES_DB=gnr8_mvp27_verify -e POSTGRES_USER=gnr8_mvp27_verify -e POSTGRES_PASSWORD=gnr8_mvp27_verify_pw_20260803 -p 127.0.0.1::5432 postgres:15`
- `docker port gnr8-mvp27-db-verify-20260803 5432/tcp`
- `docker exec gnr8-mvp27-db-verify-20260803 pg_isready -U gnr8_mvp27_verify -d gnr8_mvp27_verify`
- `docker cp ... gnr8-mvp27-db-verify-20260803:/tmp/...`
- `docker exec gnr8-mvp27-db-verify-20260803 psql -v ON_ERROR_STOP=1 -U gnr8_mvp27_verify -d gnr8_mvp27_verify -f /tmp/20260722120000_aaf_persistence_core.sql -f /tmp/20260730170000_aaf_single_site_implementation_authorization_scope.sql -f /tmp/20260731100000_aaf_granted_with_limitations_status.sql`
- `docker exec gnr8-mvp27-db-verify-20260803 psql -v ON_ERROR_STOP=1 -U gnr8_mvp27_verify -d gnr8_mvp27_verify -f /tmp/gnr8_mvp27_apply_with_catalog_diff.sql`
- `docker exec gnr8-mvp27-db-verify-20260803 psql -v ON_ERROR_STOP=1 -U gnr8_mvp27_verify -d gnr8_mvp27_verify -f /tmp/gnr8_mvp27_db_verify.sql`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `pnpm exec tsc --noEmit --pretty false --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --types node packages/gnr8-runtime-contracts/src/aaf-contracts.ts packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `git diff --check`
- `rg -n "[[:blank:]]$" apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `git diff --name-only -- apps/platform/app apps/platform/gnr8 apps/worker apps/platform/components apps/platform/lib apps/platform/app/api`
- `docker stop gnr8-mvp27-db-verify-20260803`
- `docker ps -a --filter name=gnr8-mvp27-db-verify-20260803 --format '{{.Names}} {{.Status}}'`
- `docker ps -a --filter name=gnr8-aaf-writer --format '{{.Names}} {{.Status}}'`

Confirmation: no commit or push was performed.
