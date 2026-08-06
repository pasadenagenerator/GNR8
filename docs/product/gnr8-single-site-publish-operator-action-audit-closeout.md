# GNR8 MVP-57 Single-Site Publish Operator Action Audit Closeout

Scope: durable internal operator-action audit for MVP-54 dry-run and MVP-56 shadow-publish admin actions.

MVP-57 adds a narrow non-AAF audit table family plus a server-only audit service. Dry-run and shadow-publish admin routes now persist requested/preflight/started/completed/failed audit state with actor, intent, source refs, watermarks, idempotency, correlation, status, safe result summaries, redacted diagnostics, limitations, and error summaries.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`
- `docs/product/gnr8-single-site-shadow-publish-internal-admin-route-closeout.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260806120000_single_site_publish_operator_action_audit.sql`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.integration.test.ts`
- `docs/product/gnr8-single-site-publish-operator-action-audit-closeout.md`

Updated:

- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Persistence

Migration: `20260806120000_single_site_publish_operator_action_audit.sql`

Tables created:

- `public.gnr8_single_site_publish_operator_actions`
- `public.gnr8_single_site_publish_operator_action_refs`
- `public.gnr8_single_site_publish_operator_action_events`

The main action row is bounded mutable for status/result/completion fields. Refs and events are append-only by `before update or delete` triggers using `public.gnr8_single_site_publish_operator_action_prevent_update_delete()`.

RLS is enabled on all three tables. The migration adds no policies and no grants to `PUBLIC`, `anon`, or `authenticated`.

## Vocabulary

Statuses: `requested`, `preflight_failed`, `dry_run_completed`, `shadow_publish_started`, `shadow_publish_completed`, `shadow_publish_failed`, `cancelled`, `superseded`.

Ref roles: `candidate_site_version`, `runtime_artifact`, `publish_target`, `launch_readiness_evidence`, `publish_activation_request`, `publish_activation_decision`, `gate_attempt`, `handoff_watermark`, `gate_input_watermark`, `wrapper_result`, `publish_result`, `guard_diagnostic`, `limitation`, `blocker`, `operator_confirmation`.

Events: `action_requested`, `preflight_failed`, `dry_run_started`, `dry_run_completed`, `shadow_publish_started`, `shadow_publish_completed`, `shadow_publish_failed`, `diagnostics_recorded`, `redaction_applied`.

## Audit Service

Location: `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`

The service is server-only and creates/reuses actions by idempotency key. Replays with the same semantic payload reuse the existing action; replays with drift throw `SingleSiteIdempotencyConflictError`. It records durable refs, append-only events, preflight failure, dry-run started/completed, shadow-publish started/completed/failed, and redaction markers.

Redaction persists only safe status fields, reason/blocker/warning/limitation codes, safe refs, watermarks, result categories, and explicit boundary flags. Raw SQL errors, stack traces, provider secrets, Stripe/payment data, raw resolver internals, raw AAF internals, and raw publish orchestrator internals are removed before persistence.

The service writes only the MVP-57 audit tables.

## Route Integration

Dry-run route:

- unauthorized before actor creates no audit row;
- validation failure after actor creates/reuses an audit action and marks `preflight_failed`;
- valid requests create/reuse audit, record `dry_run_started`, run the existing MVP-54 caller, then mark `dry_run_completed`;
- audit failures fail the dry-run route safely with no publish/runtime mutation.

Shadow-publish route:

- feature-flag-off and unauthorized before actor create no audit row;
- validation failure after actor creates/reuses audit and marks `preflight_failed`;
- valid requests create/reuse audit and mark `shadow_publish_started` before the MVP-56 caller can reach the MVP-52 wrapper;
- audit create/start failure blocks before wrapper execution;
- wrapper success marks `shadow_publish_completed`;
- wrapper/preflight/orchestrator failure marks `shadow_publish_failed`;
- after shadow-publish starts, completion audit failure is logged and the wrapper result is preserved.

## Boundary Results

Generic publish route: unchanged.

Client portal: unchanged; no client action or exposure added.

Ops Inbox: unchanged; no action or button added.

AAF/gate: no AAF approval requests, decisions, evidence packages, audit events, policy evaluations, or gate attempts are created by MVP-57; no MVP-44 gate evaluator invocation added.

PASR/DDOM: no PASR reader/observer/read-model calls, no DDOM snapshot creation, no manual trigger/caller, and no live DNS calls.

Domain/DNS/provider/billing/Stripe/AI: no Vercel, Openprovider, registrar, DNS provider, SSL provider, Stripe, billing, entitlement, subscription, or AI provider calls added.

Publish/rollback/runtime: no generic publish route changes, no rollback implementation, no direct active pointer/runtime mutation outside existing MVP-52 wrapper/existing orchestrator behavior.

## Validation Results

- Audit service unit tests: `9/9` passed.
- Audit service disposable PostgreSQL integration test: `1/1` passed.
- MVP-54 dry-run route tests: `10/10` passed.
- MVP-56 shadow-publish route tests: `14/14` passed.
- MVP-52 wrapper tests: `10/10` passed.
- Focused TypeScript no-emit over changed files: passed with a standalone temporary config. An earlier inherited app config run surfaced pre-existing unrelated platform test debt plus local fake-service mismatches; local mismatches were fixed.

## Issues Found And Fixed

- Route default audit service construction initially touched `DATABASE_URL` during tests/import. The repository now lazily resolves the DB pool only when writing.
- Route fakes initially returned `void` from transition methods; they now match the real audit service contract.
- Shadow-start audit records a redaction marker event for persisted safe diagnostics; unit expectations were adjusted to the intended event model.

## Residual Risks

- No UI/read model exists yet for viewing audit records.
- RLS is intentionally closed by default; application access relies on server-side service-role/superadmin DB access until a reviewed policy/read-model phase exists.
- Shadow-publish completion audit failure after wrapper start is logged but cannot retroactively guarantee durable completion status for that already-started attempt.

## Safe-To-Accept Decision

MVP-57 is safe to accept if final guardrail checks remain clean. It adds durable non-AAF audit persistence and route integration for internal dry-run and shadow-publish operator actions while preserving the generic publish, client portal, Ops Inbox, AAF/gate, PASR/DDOM, provider/domain/DNS/billing/Stripe, runtime, rollback, commit, and push boundaries.

## Recommended Next Milestone

MVP-58 should add a read-only internal audit review/read-model surface for platform operators, still without Command Center publish buttons, blocking enforcement, Ops Inbox actions, client portal exposure, provider/domain/billing execution, or rollback automation.

No commit or push was performed.
