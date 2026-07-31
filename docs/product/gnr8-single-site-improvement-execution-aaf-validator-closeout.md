# GNR8 Single-Site Improvement Execution AAF Validator Closeout

Phase: MVP-20
Scope: Server-only execution-time AAF validator core for future single-site improvement execution

MVP-20 implemented an execution-time validator only. It does not implement improvement execution, execution persistence, runtime mutation, site-version mutation, artifact mutation, active pointer changes, publish, rollback, AI/provider calls, billing, hosting, domain/DNS, UI, API routes, server actions, workers, Command Center, Ops Inbox, client portal, Generated Proposal Bundles, commits, or pushes.

## Files Reviewed

- `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`
- `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`
- `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`
- `docs/architecture/gnr8-single-site-improvement-execution-transition-contract.md`
- `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`
- `docs/product/gnr8-single-site-improvement-execution-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `docs/product/gnr8-single-site-implementation-authorization-bridge-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Validator Module

Location: `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`

API:

- `ImprovementExecutionAafValidator.validateImprovementExecutionAuthorization(input)`
- `validateImprovementExecutionAuthorization(input)`

The validator imports `server-only`, accepts tenant/client/site/migration/proposal/clone/runtime artifact/source evidence/recommendation/scope/limitation/actor/correlation/idempotency inputs, and returns a non-executing result with `allowed`, `mode`, `reasonCode`, matched AAF refs, matched evidence refs, matched subject refs, limitations, freshness result, drift result, missing refs, stale refs, prohibited substitution flags, `mutatesSourceTruth: false`, and `nonExecuting: true`.

## Exact-Scope Behavior

The validator requires exact AAF request scope `single_site_improvement_implementation_authorization`, subject type `single_site_improvement_proposal_plan`, evidence package type `single_site_improvement_implementation_authorization_evidence`, and the MVP-17 bridge subject/evidence ref set.

It fails closed for proposal approval, clone review, content approval, client approval, launch approval, publish activation, domain/DDOM/DNS readiness, AI/provider advisory refs, Generated Proposal Bundle refs, Command Center/Ops Inbox refs, unknown scopes, and non-AAF-decision source refs.

## Decision Status Behavior

Allowed statuses:

- `granted`
- `granted_with_limitations` when represented by the backing AAF store

Blocked statuses and conditions:

- requested-only/missing decision
- rejected
- revoked
- expired
- superseded
- cancelled
- invalid
- stale
- missing decision/request/evidence
- multiple conflicting active grant decisions for the same request

Current persisted AAF SQL status vocabulary does not include `granted_with_limitations`; disposable PostgreSQL validation therefore proves persisted `granted` and documents limited grants as safe fallback behavior until a future tiny AAF vocabulary migration is approved.

## Subject Matching Behavior

The validator reuses the MVP-18 bridge exact-subject ref builder and requires current refs for tenant, client, site, migration, proposal plan/version/watermark, proposal approval request/decision/evidence, clone review/status/watermark, clone site version, runtime artifact/watermark, source evidence review/status/watermark, selected recommendations/watermarks, implementation target, and attempt placeholder.

Missing or mismatched required subject refs fail closed.

## Evidence And Freshness Behavior

The validator requires AAF evidence refs for proposal plan snapshot, proposal approval, clone review acceptance, source evidence acceptance, selected recommendations, risk/impact/effort summary, implementation scope summary, implementation non-goals, limitations, operator notes, and optional advisory/audit timeline refs when supplied.

It detects missing evidence refs, stale/mismatched evidence refs, evidence package watermark drift, freshness-check drift/failure, policy watermark mismatch through bridge validation, selected recommendation watermark mismatch, proposal watermark drift, and implementation scope watermark drift.

## Attach-Time Vs Execution-Time Distinction

MVP-18 attach-time bridge validation remains useful for proposal planning readiness, but MVP-20 does not treat attachment as mutation authority. Unit tests prove an authorization that validated at attach time is blocked at execution time after revocation, and that current proposal, selected recommendation, and implementation scope watermarks are rechecked immediately before future execution.

## Read-Only And Non-Executing Guarantee

The validator uses AAF read transactions plus the bridge read-only validation path. It does not call AAF create request, create decision, create evidence package, runtime-store, artifact builders, publish/domain/billing/provider adapters, AI routes, UI/API surfaces, Command Center, Ops Inbox, or Generated Proposal Bundle code.

Unit and disposable PostgreSQL tests assert validation creates no new AAF requests, decisions, evidence packages, evidence refs/items, gate attempts, runtime tables, Generated Proposal Bundle tables, runtime version tables, runtime artifact tables, or active pointer tables.

## Idempotency And Correlation Behavior

Execution-time validation fails closed unless `correlationId` is present and either `idempotencyKey` or `executionAttemptKey` is present. These values are echoed in the output; no idempotency key is used for writes because the validator is read-only.

## Validation Summary

Passed:

- MVP-20 unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- MVP-20 disposable PostgreSQL integration test: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- MVP-18 bridge unit and disposable PostgreSQL integration tests after helper export factoring.
- MVP-17 AAF contract tests.
- Focused TypeScript no-emit validation for changed bridge and validator files.
- `git diff --check`.
- trailing whitespace check on changed/new files.
- guardrail search proving the production validator creates no approval requests, decisions, evidence packages, gate attempts, runtime versions, runtime artifacts, active pointers, Generated Proposal Bundles, routes, UI, workers, provider calls, publish, rollback, billing, domain/DNS, Vercel, Openprovider, Stripe, Command Center, Ops Inbox, or client portal behavior.
- broader changed-file guardrail search; matches were expected boundary words in docs/tests, bridge preparation helpers, substitution flags, and negative assertions.
- Docker cleanup check for disposable PostgreSQL containers.

## SQL And Disposable DB Validation

The MVP-20 integration test starts a disposable local PostgreSQL 15 container, applies:

- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`

It then proves the MVP-18 bridge can prepare request/evidence, a persisted exact-scope granted decision validates, requested-only authorization is blocked, wrong-scope decision is blocked, rejected/revoked/expired/superseded decisions are blocked where representable, changed proposal/recommendation/scope watermarks fail, and validation creates no new AAF or runtime/public side effects.

No SQL migration was added for MVP-20.

## External Provider Non-Call Confirmation

No production Supabase, staging Supabase, AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing, hosting, domain, publish, rollback, runtime provider, or external provider was called. Docker was used only for disposable local PostgreSQL validation.

## Runtime And Public Behavior Impact

No runtime artifact, runtime site version, active pointer, public runtime route, preview route, API route, UI, worker, server action, Command Center, Ops Inbox, client portal, publish, domain/DNS, billing, provider, AI, rollback, or Generated Proposal Bundle behavior was added or changed.

## Issues Found

- The bridge had deterministic exact-scope ref/watermark helpers but did not export them. MVP-20 exposed them narrowly for read-only reuse.
- Current persisted AAF SQL status vocabulary does not include `granted_with_limitations`, so database-backed limited grants remain a future vocabulary migration decision.

## Residual Risks

- A future execution persistence/executor boundary must call this validator immediately before any mutation and must not cache allowed results across drift windows.
- Persisted `granted_with_limitations` still needs a future tiny AAF status vocabulary migration before first-class DB storage.
- Actor permission evaluation is limited to required actor/correlation/idempotency envelope in MVP-20; deeper role-policy authorization should be added before executor mutation.

## Acceptance

MVP-20 is safe to accept as a read-only, fail-closed execution-time AAF validator core.

Improvement execution persistence and executor boundary design may begin next, but runtime mutation should wait until that separate design explicitly binds candidate creation to this validator and defines append-only execution attempt/source-ref persistence.

Recommended next milestone: MVP-21 single-site improvement execution persistence and executor boundary design, still without runtime mutation until the persistence/ref contract is accepted.

## Git Status Summary

Modified:

- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Untracked:

- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`

Pre-existing untracked MVP-19 docs remain untracked.

No commit or push was performed.
