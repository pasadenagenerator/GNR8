# GNR8 Audit Approval Writer Core Closeout (AAF-4)

## Purpose

AAF-4 implements the low-level server-side writer/repository layer for the GNR8 Audit, Approval, and Evidence foundation. It adds typed persistence writers and transaction composition helpers for canonical AAF approval, audit, evidence, policy evaluation, and inert gate-attempt rows without integrating them into runtime actions.

No production Supabase, GNR8-STAGING Supabase, remote Supabase project, Vercel, Openprovider, Stripe, DNS provider, AI provider, or external provider was called.

## Files Reviewed

- `docs/product/gnr8-audit-approval-persistence-core-db-execution-closeout.md`
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
- `apps/platform/src/superadmin/db.ts`
- `apps/platform/src/supabase/service-role-server.ts`
- `packages/data/src/repositories/postgres-billing-repository.ts`
- `packages/data/src/repositories/postgres-billing-transaction.ts`
- `packages/data/src/repositories/postgres-audit-log-repository.ts`
- representative platform server-only repository/service tests

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Writer Module Location Decision

The writer module lives at `apps/platform/gnr8/aaf/aaf-writer-repository.ts`.

Rationale:

- `packages/gnr8-runtime-contracts` remains pure vocabulary/types only.
- DB-writing code belongs inside the platform/server-side boundary where trusted Postgres and service-role-style credentials already belong.
- The module imports `server-only` and uses the existing `getSuperadminPool()` pattern by default, while tests can inject a disposable local `pg` pool.
- No new package was created because the platform app already has the required `pg` dependency and transaction pattern.

## Writer Functions Implemented

Audit:

- `createAuditEvent`
- `createAuditEventRef`
- `createAuditPartialTimelineMarker`

Evidence:

- `createEvidencePackage`
- `createEvidencePackageItem`
- `createEvidencePackageSourceRef`
- `createEvidencePackageFreshnessCheck`
- `createEvidencePackageAuditLink`
- `createEvidencePackageSupersessionLink`

Approval:

- `createApprovalPolicy`
- `createApprovalScopeDefinition`
- `createApprovalRequest`
- `createApprovalSubjectRef`
- `createApprovalEvidenceLink`
- `createApprovalPolicyEvaluation`
- `createApprovalDecision`
- `createApprovalRevocation`
- `createApprovalSupersessionLink`

Gate attempts:

- `createActionGateAttempt`

The writer validates required text fields, JSON object/array shape, canonical enum values from `@gnr8/runtime-contracts`, `not_required_by_policy` decision policy-evaluation refs, `fail_closed` gate-attempt reasons, and non-negative/positive numeric inputs where applicable. PostgreSQL constraints remain the canonical enforcement layer.

## Transaction Semantics

`AafWriterRepository.withTransaction()` uses a real `pg` client transaction:

- `begin`
- execute writer flow
- `commit`
- `rollback` on error
- release client

Transaction composition helpers implemented:

- `writeApprovalRequestTransaction`
  - approval request
  - subject refs
  - approval evidence link
  - policy evaluation
  - `approval.requested` audit event
- `writeApprovalDecisionTransaction`
  - approval decision
  - decision audit event using a pre-generated UUID so the append-only decision can carry `audit_event_id`
  - approval evidence link
  - audit refs
- `writeEvidencePackageTransaction`
  - package header
  - source refs
  - items
  - freshness check
  - audit link
- `writeGateAttemptTransaction`
  - supplied policy evaluation
  - supplied pre-action audit event
  - inert gate attempt

Rollback behavior was verified by deliberately throwing after an insert inside `withTransaction()` and confirming no row remained.

## Idempotency Behavior

Writer methods use `insert ... on conflict do nothing returning *` followed by deterministic lookup of the existing row.

Verified idempotent retry coverage:

- approval request with same scoped idempotency tuple returns the original row
- policy evaluation with same idempotency key returns the original row
- audit event with same idempotency key returns the original row
- evidence package with same idempotency key returns the original row
- inert gate attempt with same idempotency key returns the original row

Human approval decisions are not replayed or executed. The writer only preserves the already-inserted canonical row for duplicate idempotency keys.

## Append-Only Behavior

No AAF writer update/delete helper was added. Unit tests statically assert the writer source does not contain AAF `update` or `delete` statements.

Disposable DB integration tests verify append-only trigger failures for:

- update on `gnr8_aaf_approval_requests`
- delete on `gnr8_aaf_audit_events`
- update on `gnr8_aaf_evidence_packages`
- delete on `gnr8_aaf_action_gate_attempts`

Revocation and supersession are insert-only through `createApprovalRevocation`, `createApprovalSupersessionLink`, and `createEvidencePackageSupersessionLink`.

## Service-Role And RLS Boundary

AAF-3 enabled RLS with no broad policies. AAF-4 preserves that boundary:

- no RLS policies were added
- no browser/client module exports were added
- the writer imports `server-only`
- default DB access uses the existing trusted platform Postgres pool pattern
- tests inject a local disposable owner/trusted pool
- a synthetic unprivileged local role was unable to insert AAF audit rows in the disposable DB

Future scoped read/write RLS design remains deferred.

## Local Disposable DB Target

Integration test target:

- runtime: Docker PostgreSQL container
- image: `postgres:15`
- pull behavior: `--pull=never`
- binding: random local `127.0.0.1` port
- database/user/password: generated synthetic local-only values per test run
- migration applied: `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- cleanup: container stopped in test `finally`

Migration application result: passed. The integration test confirmed 20 AAF tables and 0 AAF RLS policies after migration application.

## Validation Results

Passed:

- `git status --short --untracked-files=all`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- focused AAF TypeScript check for the writer, unit test, and integration test files

Full platform typecheck was attempted with `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false` and failed on existing non-AAF test fixture/type drift. The first diagnostics were under `apps/platform/app/api/gnr8/admin/_tests/candidate-review-action-route.test.ts`, `first-limited-dry-run-*`, content route tests, runtime tests, provider tests, and template-intake tests. No AAF writer diagnostic was identified by the focused AAF TypeScript check.

## Runtime Non-Integration Confirmation

AAF-4 created/updated only AAF writer modules/tests and AAF documentation/indexing. No runtime action path was integrated.

No changes were made under publish activation, rollback, domain/Vercel/DNS, Openprovider/provider execution, Migration Factory start/resume/retry/replay, Command Center bulk actions, Ops Inbox, content publish/rollback, billing/Stripe/customer billing, AI advisory/execution, or public runtime serving.

The disposable integration test also confirmed the migrated local database contained no non-AAF public tables.

## Negative DB Constraint Coverage

Disposable DB integration tests verified DB-level failures for:

- invalid audit severity
- `not_required_by_policy` approval decision without policy evaluation ref
- `fail_closed` gate attempt without fail-closed reason
- evidence package with too-short content hash
- append-only update/delete attempts
- unprivileged local role insert attempt

## Explicit Deferrals

- runtime gate integration
- publish activation integration
- rollback integration
- domain/Vercel/DNS integration
- provider execution integration
- Migration Factory integration
- Command Center/Ops Inbox projection integration
- content publish/rollback integration
- billing/Stripe integration
- AI advisory/execution integration
- full policy evaluation logic
- complete action gate validator
- object storage integration
- historical approval backfill
- scoped RLS read/write policy design
- generated Supabase database types

## Known Gaps And Architecture Warnings

- The writer returns existing rows for duplicate idempotency keys but does not yet perform full semantic payload-drift comparison on idempotency conflicts.
- `approval_subject_refs` does not have an idempotency key in the AAF-3 schema, so the low-level subject-ref writer is insert-only and not deduplicated.
- Approval decision audit ordering requires a pre-generated audit UUID because the decision row is append-only and cannot be updated after the audit event is inserted.
- Existing runtime actions remain ungated until a future integration milestone wraps them.
- Full platform typecheck is not clean due to existing non-AAF failures, so AAF acceptance should rely on the focused AAF TypeScript check plus the passing unit/integration tests for this phase.

## Acceptance Assessment

AAF-4 is safe to accept as the low-level writer-core milestone.

The writer layer exists, is server-only, uses real PostgreSQL transactions, writes canonical AAF records, preserves idempotency, respects append-only semantics, is verified against a disposable local PostgreSQL database with the AAF-3 migration applied, and does not integrate into runtime actions or call remote/external providers.

Runtime gate integration may begin after AAF-4, but it should start with a narrow foundation follow-up for idempotency payload-drift conflict handling and generated DB type/read model conventions if those are required before exposing writer calls from action routes.

## Recommended Next Milestone

AAF-5 should implement a low-risk policy evaluator and non-executing gate validator facade around the writer layer, still without mutating publish/rollback/domain/provider/billing/AI paths. The first runtime integration should remain deferred until that facade has focused tests for stale evidence, exact scope matching, approval freshness, and fail-closed audit behavior.

## Commands Run

- `git status --short --untracked-files=all`
- `rg --files ...`
- `rg "server-only|create.*Supabase|service-role|service role|transaction|BEGIN|ROLLBACK|COMMIT|idempotency" ...`
- `sed -n ...` for required AAF docs, migration, contracts, and repository patterns
- `mkdir -p apps/platform/gnr8/aaf`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts packages/gnr8-runtime-contracts/src/index.test.ts`
- `pnpm exec tsc -p packages/gnr8-runtime-contracts/tsconfig.json --noEmit`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target ES2022 --lib esnext,dom --types node --esModuleInterop --allowSyntheticDefaultImports apps/platform/gnr8/aaf/aaf-writer-repository.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- Docker commands executed by the integration test: local `postgres:15` image inspect, disposable container run with `--pull=never`, readiness wait, migration copy, migration `psql`, port inspection, and container stop
