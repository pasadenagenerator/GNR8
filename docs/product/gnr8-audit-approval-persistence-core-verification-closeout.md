# GNR8 Audit Approval Persistence Core Verification Closeout (AAF-3-VERIFY)

## Verification Objective

AAF-3-VERIFY independently reviewed the AAF persistence-core SQL migration and TypeScript contracts before any AAF writer service work begins. The phase specifically checked whether the migration could be executed against a safe local/disposable PostgreSQL target, and whether static coverage supports the intended tables, constraints, indexes, RLS state, append-only triggers, and contract vocabulary.

No production, staging, remote Supabase, Vercel, Openprovider, Stripe, DNS provider, AI provider, or external service was called.

## Files Reviewed

AAF-3 files:
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/index.ts`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

AAF-2 design files:
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/product/gnr8-audit-approval-implementation-operator-workflow.md`
- `docs/product/gnr8-audit-approval-implementation-closeout.md`

## Tooling Discovered

Available:
- Supabase CLI: `2.90.0`
- Docker CLI: present at `/usr/local/bin/docker`
- Node, pnpm, tsx, and TypeScript local validation tooling

Unavailable or not usable for safe local execution:
- `psql`: not on PATH
- `postgres`: not on PATH
- `pg_ctl`: not on PATH
- Docker daemon: not running or no socket at `unix:///Users/gregorzigon/.docker/run/docker.sock`
- Supabase local stack: not running; `supabase status` failed because Docker is unavailable
- Repo-local `supabase/config.toml`: not found
- Local DB environment variables checked for execution target: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGDATABASE`, `SUPABASE_DB_URL`, and `NEXT_PUBLIC_SUPABASE_URL` were missing

No migration-specific repository script was found that could execute the SQL against a disposable local database without a local PostgreSQL/Supabase/Docker target.

## Migration Execution

Migration execution was not performed.

Reason: no safe local or disposable PostgreSQL/Supabase database target was available in the development environment. The installed Supabase CLI depends on Docker for the local stack, and Docker was not running. No local `psql` workflow or local database connection variables were present.

Exact database target used: none.

AAF-3 therefore remains statically validated only in this environment. This verification does not claim that the SQL has been applied successfully to PostgreSQL.

## Static Schema Verification

Static review found the migration to be additive:
- no `drop table`
- no `drop column`
- no non-AAF `alter table public.*`
- no broad `create policy`
- no `disable row level security`
- all table creation uses `create table if not exists public.gnr8_aaf_*`
- all indexes use `create index if not exists idx_gnr8_aaf_*`

Static counts:
- AAF tables: 20
- AAF indexes: 26
- RLS enable statements: 20
- append-only trigger creations: 18
- broad SQL policies: 0
- destructive drops: 0
- non-AAF table alters: 0

The migration creates the intended canonical AAF table surface for approval requests, decisions, policies, evidence links, scope definitions, supersession, revocations, policy evaluations, subject refs, audit events, audit refs, partial timeline markers, evidence package headers/items/source refs/freshness/redactions/supersession/audit links, and inert action gate attempts.

## Append-Only Trigger Verification

Static verification confirmed `public.gnr8_aaf_prevent_update_delete()` exists and raises on update/delete. The migration attaches append-only triggers to historical AAF records including approval requests, decisions, evidence links, subject refs, supersession links, revocations, policy evaluations, audit events, audit refs, partial timeline markers, evidence package records, and action gate attempts.

Policies and scope definitions remain versioned configuration and are not trigger-immutable, matching the AAF-3 closeout intent.

Runtime trigger behavior could not be executed because no safe local DB target was available.

## RLS Verification

Static verification confirmed `alter table ... enable row level security` for all 20 new `gnr8_aaf_*` tables.

No public/client read or write policies are created. This is conservative and consistent with service-role-only future writer work.

Runtime RLS flags could not be inspected in `pg_class` because no safe local DB target was available.

## Constraint And Index Verification

Static review confirmed SQL checks for:
- approval statuses, including explicit `not_required_by_policy`
- approval scopes
- policy evaluation results
- audit event families
- audit severities
- replay classes
- evidence package types
- gate results
- actor types
- privacy labels
- redaction labels
- retention classes
- JSON object/array shape constraints
- bounded audit `payload_json` size with `octet_length(payload_json::text) <= 65536`
- evidence package/item/source hash length constraints
- no self-supersession/redaction links
- `not_required_by_policy` decisions requiring `policy_evaluation_id`
- `fail_closed` gate attempts requiring `fail_closed_reason`

Static review confirmed indexes for:
- approval scope/status, subject, site, and correlation lookup
- policy evaluation subject and correlation lookup
- audit family/name, subject, correlation, approval refs, evidence/policy refs, and external refs
- evidence package subject, correlation, package items, source refs, freshness checks, and audit links
- gate attempt subject, correlation, and result lookup

Runtime constraint failure tests could not be performed because no safe local DB target was available.

## Evidence Storage Verification

Static review confirmed the migration stores evidence metadata, hashes, object refs, source refs, watermarks, labels, and bounded JSON. It includes `storage_bucket`, `storage_key`, `content_hash`, `item_hash`, and source-reference hash fields.

The migration does not include an `evidence_payload` column and does not store heavy evidence payloads directly in Postgres.

## TypeScript Validation

Contract tests passed:
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- Result: 16 tests passed, 0 failed

TypeScript typecheck passed:
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- Result: passed with no diagnostics

The TypeScript contract is aligned with the SQL migration for approval statuses, scopes, policy results, audit families, severities, replay classes, evidence package types, privacy labels, redaction labels, retention classes, and gate results.

## Runtime Non-Integration Verification

The worktree was clean at the start of this verification. No runtime routes, services, workers, UI, provider clients, billing modules, Command Center, Ops Inbox, public runtime serving, publish, rollback, domain/DNS, Openprovider, Migration Factory, content publish/rollback, Stripe, or AI behavior was changed.

This verification created documentation only and updated the canonical doc index. It did not implement AAF writer services, policy evaluators, audit writers, evidence builders, or runtime gates.

## Issues Found

No SQL blocker was found statically.

Execution blocker:
- No safe local/disposable database target was available, so the migration was not applied and runtime schema/trigger/RLS/constraint behavior remains unverified.

Design nuance:
- At verification time, `docs/architecture/gnr8-audit-approval-implementation-design.md` mentioned a `short_operational` retention class, while the AAF-3 SQL and TypeScript contracts used `mvp_operational`, `security`, `compliance_long`, and `legal_hold`. This was reconciled in AAF-3-DB-EXEC by making the canonical MVP retention classes `short_operational`, `mvp_operational`, `security`, `compliance_long`, and `legal_hold`.

## Residual Risks

- PostgreSQL syntax, dependency, trigger, RLS, check constraint, FK, and index behavior has not been proven by executing the migration.
- Representative insert/update/delete/invalid-value tests were not run.
- RLS state was not inspected from PostgreSQL catalogs.
- The `short_operational` vs `security` retention vocabulary difference was resolved by AAF-3-DB-EXEC; this AAF-3-VERIFY document remains a point-in-time record of the original finding.

## Acceptance Assessment

AAF-3 is safe to accept only as a statically validated persistence-core artifact in this environment.

AAF-3 is not yet verified as an executed PostgreSQL migration. The SQL should be applied to a safe local/disposable database before any writer service implementation depends on it.

## AAF-4 Readiness

AAF-4 should not begin yet.

The next milestone should first enable a safe local migration execution path, apply `20260722120000_aaf_persistence_core.sql`, inspect the resulting schema, and run representative insert/update/delete/constraint tests against synthetic data.

## Recommended Next Milestone

Run an AAF-3-DB-EXEC verification milestone:
- provide a local PostgreSQL client/server, start an existing local Supabase stack, or run a disposable local Docker PostgreSQL container if already available and approved;
- apply only the AAF-3 migration to that disposable target;
- inspect tables, constraints, FKs, indexes, triggers, function, and RLS catalog state;
- run synthetic insert and negative constraint tests;
- explicitly confirm append-only update/delete failures;
- carry the reconciled retention class vocabulary into AAF writer services.

## Validation Commands Run

- `git status --short --untracked-files=all`
- `sed -n ...` for AAF-3 and AAF-2 required files
- `command -v psql`
- `command -v postgres`
- `command -v pg_ctl`
- `command -v supabase`
- `command -v docker`
- `supabase --version`
- `docker ps --format '{{.ID}} {{.Image}} {{.Names}} {{.Ports}}'`
- `docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}'`
- `supabase status`
- `node -e "..."` environment/tooling and SQL static count checks
- `rg -n --pcre2 "drop table|drop column|alter table public\\.(?!gnr8_aaf_)|create policy|using \\(true\\)|with check \\(true\\)|disable row level security|evidence_payload" apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `rg -n "create table if not exists public\\.gnr8_aaf_|create index if not exists idx_gnr8_aaf_|enable row level security|before update or delete|gnr8_aaf_prevent_update_delete|octet_length\\(payload_json::text\\) <= 65536|storage_bucket text null|storage_key text null|content_hash text not null|item_hash text not null|gate_result <> 'fail_closed' or fail_closed_reason is not null|status <> 'not_required_by_policy' or policy_evaluation_id is not null" apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- `git diff --check`
