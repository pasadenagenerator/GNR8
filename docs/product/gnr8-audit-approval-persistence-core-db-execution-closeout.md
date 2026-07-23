# GNR8 Audit Approval Persistence Core DB Execution Closeout (AAF-3-DB-EXEC)

## Purpose

AAF-3-DB-EXEC reconciled the MVP AAF retention-class vocabulary and executed `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql` against a safe disposable local PostgreSQL target.

No production Supabase, GNR8-STAGING Supabase, remote Supabase project, Vercel, Openprovider, Stripe, DNS provider, AI provider, or external provider was called. No runtime gates, writers, evaluators, evidence builders, or action integrations were implemented.

## Files Reviewed

- `docs/product/gnr8-audit-approval-persistence-core-verification-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Retention Vocabulary Decision

The final MVP retention classes are:

- `short_operational`: transient diagnostics and non-privileged traces.
- `mvp_operational`: ordinary approval/evidence/audit records needed for MVP operations.
- `security`: identity, auth, authorization, security-sensitive denials, and security incident diagnostics.
- `compliance_long`: publish, rollback, domain, cost exception, incident, and admin exception evidence/audit.
- `legal_hold`: records explicitly retained by superadmin/legal policy.

Decision rationale: `short_operational` and `security` describe different retention needs. `short_operational` is intentionally low-retention and low-privilege. `security` is for sensitive auth/security history that should not be collapsed into ordinary operational retention.

## Files Updated

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-verification-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-db-execution-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

The temporary SQL verification harness was created under `/private/tmp/gnr8-aaf-db-exec-verify.sql`, copied into the disposable container, executed, and removed after verification.

## Tooling Discovered

- Docker CLI: `/usr/local/bin/docker`
- Docker daemon: running, client/server `29.6.2`
- Local Docker image: `postgres:15` (`5f07e69ced9e`)
- Supabase CLI: `2.90.0`, not used
- Local `psql`, `postgres`, and `pg_ctl`: not on PATH outside Docker
- Repo-local Supabase config: no `config.toml` found during discovery
- Node, pnpm, tsx, and TypeScript validation tooling: available

## Disposable DB Target

Used target:

- Runtime: Docker PostgreSQL container
- Container name: `gnr8-aaf-db-exec-20260723`
- Container id: `77bd898324f15e6cc32ad3c94bd44f0f686c0095d0ee6693ab78ae244e0ff514`
- Image: `postgres:15`
- Database: `gnr8_aaf_disposable`
- User: `gnr8_aaf_local`
- Password: synthetic local-only credential
- Host binding: `127.0.0.1:56885 -> 5432/tcp`
- Data mounts: none

The container was stopped after verification. A final `docker ps` returned no running containers.

## Migration Execution Result

Applied only:

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`

Result: migration applied cleanly with `COMMIT`. The expected first-run trigger-drop notices were emitted because append-only triggers did not yet exist.

## PostgreSQL Catalog Verification

Catalog verification passed:

- AAF tables: 20
- Explicit AAF indexes: 26
- Append-only triggers: 18
- AAF foreign keys: 60
- AAF check constraints: 68
- AAF policies: 0
- Non-AAF public tables created by migration: 0
- `public.gnr8_aaf_prevent_update_delete()` exists

All expected `public.gnr8_aaf_*` tables exist. All expected explicit `idx_gnr8_aaf_*` indexes exist. All expected append-only triggers exist. Foreign keys and check constraints are present in PostgreSQL catalogs.

## RLS Verification

RLS verification passed:

- RLS enabled on all 20 AAF tables.
- No `pg_policy` rows exist for AAF tables.
- Broad `PUBLIC` table privileges are not granted: `select=0`, `insert=0`, `update=0`, `delete=0` across the 20 AAF tables.

This confirms a closed-by-default persistence surface. Future writer/read access policy remains explicitly deferred.

## Positive Insert Tests

Representative synthetic inserts passed for:

- approval policy
- approval scope definition
- approval request
- evidence package
- evidence package source ref
- policy evaluation
- approval decision
- audit event
- action gate attempt

A focused retention probe also inserted an audit event with `retention_class = 'short_operational'`, proving the reconciled class is accepted by a real PostgreSQL check constraint.

## Negative Constraint Tests

All required negative tests failed as intended:

- invalid approval status: check violation
- invalid approval scope: check violation
- invalid policy result: check violation
- invalid audit event family: check violation
- invalid audit severity: check violation
- invalid replay class: check violation
- invalid evidence package type: check violation
- invalid gate result: check violation
- `not_required_by_policy` approval decision without policy evaluation ref: check violation
- `fail_closed` gate attempt without fail-closed reason: check violation
- evidence package with too-short hash: check violation
- update on append-only approval request: trigger exception
- delete on append-only approval request: trigger exception

Negative-test summary: 13 passed, 0 failed.

## TypeScript And Static Validation

Passed:

- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- `git diff --check`
- destructive SQL guardrail grep: no matches
- positive SQL guardrail grep: confirmed AAF tables, indexes, RLS, append-only triggers, bounded payloads, object refs, fail-closed/not-required checks, and `short_operational`

The SQL and TypeScript retention vocabularies are aligned.

## Runtime Non-Integration Verification

The changed file set is limited to the AAF migration, AAF contracts/tests, AAF architecture/product docs, and the canonical doc index. Anchored runtime-surface checks found no changes under publish activation, rollback, domain/Vercel/DNS, Openprovider/provider execution, Migration Factory start/resume/retry/replay, Command Center, Ops Inbox, content publish/rollback, billing/Stripe/customer billing, AI advisory/execution, or public runtime serving paths.

No runtime behavior changed.

## Issues Found

- The retention vocabulary drift found by AAF-3-VERIFY was real and is now resolved.
- No PostgreSQL execution, schema, trigger, RLS, index, FK, or constraint blocker was found.

## Residual Risks

- AAF writer services, policy evaluator services, audit writer services, evidence builders, and gate integrations remain unimplemented by design.
- RLS policies remain intentionally absent; future service-role and scoped read/write policy work must be explicit.
- Generated Supabase database types remain ungenerated because no repository workflow was present in AAF-3 and this phase did not add one.
- Positive/negative tests are representative synthetic cases, not full writer-service transaction tests.

## Acceptance Assessment

AAF-3 is now safe to fully accept as the persistence-core milestone. It is no longer only statically validated: the migration has been executed against a disposable local PostgreSQL target and PostgreSQL behavior has been verified.

AAF-4 may begin.

## Recommended Next Milestone

Start AAF-4 with low-level AAF service/repository writers and transaction tests around idempotency, write ordering, append-only failure handling, service-role access, and typed payload construction. Continue to avoid runtime gate integration until writer semantics are validated.

## Commands Run

- `git status --short --untracked-files=all`
- `sed -n ...` for required AAF docs, SQL, and TypeScript files
- `rg -n "short_operational|mvp_operational|security|compliance_long|legal_hold|retention" ...`
- `command -v docker`
- `docker version --format '{{.Client.Version}} {{.Server.Version}}'`
- `docker ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Ports}}'`
- `docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}'`
- `command -v psql`
- `command -v postgres`
- `command -v pg_ctl`
- `command -v supabase`
- `supabase --version`
- `supabase status`
- `find ... config.toml ...`
- `docker run --rm -d --name gnr8-aaf-db-exec-20260723 ... postgres:15`
- `docker port gnr8-aaf-db-exec-20260723 5432/tcp`
- `docker inspect --format ... gnr8-aaf-db-exec-20260723`
- `docker exec gnr8-aaf-db-exec-20260723 pg_isready -U gnr8_aaf_local -d gnr8_aaf_disposable`
- `docker cp apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql gnr8-aaf-db-exec-20260723:/tmp/20260722120000_aaf_persistence_core.sql`
- `docker exec gnr8-aaf-db-exec-20260723 psql -U gnr8_aaf_local -d gnr8_aaf_disposable -v ON_ERROR_STOP=1 -c 'select current_database(), current_user, inet_server_addr(), inet_server_port();'`
- `docker exec gnr8-aaf-db-exec-20260723 psql -U gnr8_aaf_local -d gnr8_aaf_disposable -v ON_ERROR_STOP=1 -f /tmp/20260722120000_aaf_persistence_core.sql`
- `docker cp /private/tmp/gnr8-aaf-db-exec-verify.sql gnr8-aaf-db-exec-20260723:/tmp/gnr8-aaf-db-exec-verify.sql`
- `docker exec gnr8-aaf-db-exec-20260723 psql -U gnr8_aaf_local -d gnr8_aaf_disposable -v ON_ERROR_STOP=1 -f /tmp/gnr8-aaf-db-exec-verify.sql`
- `docker exec gnr8-aaf-db-exec-20260723 psql -U gnr8_aaf_local -d gnr8_aaf_disposable -v ON_ERROR_STOP=1 -c "... short_operational ..."`
- `docker exec gnr8-aaf-db-exec-20260723 psql -U gnr8_aaf_local -d gnr8_aaf_disposable -v ON_ERROR_STOP=1 -c "... has_table_privilege ..."`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- `rg -n --pcre2 "drop table|drop column|alter table public\\.(?!gnr8_aaf_)|create policy|using \\(true\\)|with check \\(true\\)|disable row level security|evidence_payload" apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `rg -n "create table if not exists public\\.gnr8_aaf_|create index if not exists idx_gnr8_aaf_|enable row level security|before update or delete|gnr8_aaf_prevent_update_delete|octet_length\\(payload_json::text\\) <= 65536|storage_bucket text null|storage_key text null|content_hash text not null|item_hash text not null|gate_result <> 'fail_closed' or fail_closed_reason is not null|status <> 'not_required_by_policy' or policy_evaluation_id is not null|short_operational" apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- `git diff --check`
- `git diff --name-only`
- `git status --short --untracked-files=all | rg "...runtime surfaces..."`
- `git diff --name-only | rg "...runtime surfaces..."`
- `docker stop gnr8-aaf-db-exec-20260723`
- `docker ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Ports}}'`
