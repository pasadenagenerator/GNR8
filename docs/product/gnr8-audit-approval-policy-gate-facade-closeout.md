# GNR8 Audit Approval Policy Gate Facade Closeout (AAF-5)

## Purpose

AAF-5 implements the deterministic, non-executing policy evaluator and action gate validator facade for the GNR8 Audit, Approval, and Evidence foundation. It proves policy evaluation recording, exact scope matching, evidence freshness checks, approval validity checks, idempotency payload-drift detection, inert gate-attempt recording, and fail-closed behavior before any runtime action path can use AAF.

No production Supabase, GNR8-STAGING Supabase, remote Supabase project, Vercel, Openprovider, Stripe, DNS provider, AI provider, or external provider was called.

## Files Reviewed

- `docs/product/gnr8-audit-approval-writer-core-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-db-execution-closeout.md`
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Location Decision

AAF evaluator and gate facade code lives under `apps/platform/gnr8/aaf/**`.

Rationale:

- `packages/gnr8-runtime-contracts` remains pure vocabulary and contract constants.
- Policy/gate code reads and writes canonical AAF Postgres rows and therefore belongs in the server-side platform boundary.
- The modules import `server-only`.
- No new package was created because the existing AAF writer/repository and disposable DB test pattern already live in platform.

## Idempotency Payload-Drift Decision

AAF writer idempotent paths now compare semantic payload fields when `insert ... on conflict do nothing` returns an existing row. Matching retries return the existing row. Drifted retries throw `AafIdempotencyConflictError`.

Covered core paths:

- approval requests
- approval policy evaluations
- audit events
- evidence packages
- action gate attempts
- approval decisions

Adjacent idempotent links/checks/revocation/supersession helpers also received deterministic comparison where their schema has idempotency keys. Volatile/generated fields such as `id`, `created_at`, default write timestamps, and DB-generated row ordering are not compared. Human approval decisions are not replayed or mutated; a duplicate decision idempotency key is accepted only when the semantic decision payload matches.

## Policy Evaluator Behavior

`AafPolicyEvaluatorFacade` accepts explicit action, scope, subject, tenant/client/site/batch/job/site-version/domain/cost scope, actor, policy id/version, evidence/approval refs, current watermark hints, policy rules, and correlation/idempotency data.

It records `gnr8_aaf_approval_policy_evaluations` and returns:

- `approval_required`
- `approval_not_required_by_policy`
- `approval_blocked`
- `approval_stale`
- `approval_superseded`
- `emergency_exception_required`
- `emergency_exception_granted`
- `policy_error`

It does not execute actions and does not load or mutate runtime subjects.

## Gate Validator Behavior

`AafActionGateValidatorFacade` wraps the evaluator and records inert `gnr8_aaf_action_gate_attempts`. It checks exact approval scope, exact subject, tenant/client/site/batch/job/site-version/domain/cost scope compatibility, actor role compatibility, evidence existence/type/freshness/supersession/source refs, approval existence/status/expiration/revocation/supersession, explicit `not_required_by_policy`, audit availability, and fail-closed persistence behavior.

Gate results are deterministic:

- `allowed`
- `blocked`
- `approval_required`
- `evidence_missing`
- `evidence_stale`
- `approval_stale`
- `approval_superseded`
- `approval_revoked`
- `audit_unavailable`
- `not_required_by_policy`
- `policy_error`
- `fail_closed`

## Freshness Rules

Generic MVP rules implemented:

- missing required evidence returns `evidence_missing`
- wrong evidence type returns `blocked`
- invalid evidence returns `blocked`
- expired evidence returns `evidence_stale`
- stale or partial freshness checks return `evidence_stale`
- failed freshness checks return `blocked`
- superseded evidence returns `evidence_stale`
- missing required source refs returns `evidence_missing`
- supplied current subject watermark mismatch returns `evidence_stale`

No domain-specific, publish-specific, runtime-specific, or provider-specific freshness logic was added.

## Approval Validity Rules

Implemented MVP checks:

- `granted` allows only exact scope, subject, evidence, policy version, requester/executor role, and approver role match
- `rejected` and `cancelled` block
- `revoked` or revocation link returns `approval_revoked`
- `expired` or expired timestamp returns `approval_stale`
- `superseded` or supersession link returns `approval_superseded`
- missing approval returns `approval_required`
- `not_required_by_policy` requires an explicit decision with a matching policy evaluation, scope, subject, action, and tenant/client/site-style scope
- prohibited overreach prevents launch signoff, client review, domain action/exception, and AI advisory acceptance from satisfying publish activation or execution scopes

## Fail-Closed Behavior

- policy evaluation persistence failure records a fail-closed gate attempt when possible
- gate attempt persistence failure throws `AafGateFailClosedError`
- required audit write failure records `audit_unavailable`
- canonical subject/evidence/approval ref conflicts map to blocked, stale, required, or fail-closed results according to risk
- no privileged action is represented as executable when a required AAF write fails

## Disposable DB Target

Integration tests use a synthetic local Docker PostgreSQL target:

- image: `postgres:15`
- pull behavior: `--pull=never`
- host binding: random `127.0.0.1` port
- migration applied: `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- data: disposable container only
- cleanup: container stopped in test `finally`

## Validation Results

Passed:

- AAF contract tests
- contracts package TypeScript typecheck
- AAF writer unit tests
- AAF writer disposable DB integration tests
- AAF policy/gate unit tests
- AAF policy/gate disposable DB integration tests
- focused AAF TypeScript check

The first sandboxed `tsx` unit command failed because the sandbox denied the local IPC pipe under `/var/folders/.../T/tsx-501/*.pipe`; the same focused tests passed when run with the approved local test command outside the sandbox.

## Runtime Non-Integration Confirmation

AAF-5 changed only AAF modules/tests and AAF documentation/indexing. No runtime action path was integrated.

No changes were made under publish activation, rollback, domain/Vercel/DNS, Openprovider/provider execution, Migration Factory start/resume/retry/replay, Command Center bulk actions, Ops Inbox, content publish/rollback, billing/Stripe/customer billing, AI advisory/execution, or public runtime serving.

## Explicit Deferrals

- runtime publish activation integration
- rollback integration
- domain/Vercel/DNS integration
- provider execution integration
- Migration Factory integration
- Command Center and Ops Inbox integration
- content publish/rollback integration
- billing/Stripe integration
- AI advisory/execution integration
- object storage implementation
- historical approval backfill
- scoped RLS read/write policy design
- domain-specific freshness plugins

## Residual Risks

- The evaluator supports deterministic generic policy rules and AAF scope definitions; it is not yet a full domain policy engine.
- Gate facade reads only AAF records in this phase. Future runtime integration must supply canonical current subject state and watermarks from each domain source immediately before mutation.
- `not_required_by_policy` decisions are explicit and policy-backed, but future callers must create those decisions through a safe request/decision workflow rather than inferring them from policy text alone.

## Acceptance Assessment

AAF-5 is safe to accept.

First runtime integration may begin after AAF-5, starting with a narrow integration milestone that wraps one privileged action with the non-executing facade pattern and supplies canonical runtime source watermarks. Recommended next milestone: AAF-6 publish activation gate integration design and dry-run enforcement, still without widening to rollback, DNS/provider, billing, Ops Inbox, Command Center, or AI paths.
