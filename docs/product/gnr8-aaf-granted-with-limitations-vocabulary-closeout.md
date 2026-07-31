# GNR8 AAF Granted-With-Limitations Vocabulary Closeout

Phase: MVP-20A
Scope: AAF-only approval decision status vocabulary closeout for implementation authorization

MVP-20A closes the known persistence vocabulary gap for `granted_with_limitations`. It does not implement improvement execution, execution persistence, runtime mutation, site-version mutation, artifact mutation, active pointer changes, publish, rollback, AI/provider calls, billing, hosting, domain/DNS, UI, API routes, server actions, workers, Command Center, Ops Inbox, client portal, Generated Proposal Bundles, commits, or pushes.

## Files Reviewed

- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-implementation-authorization-bridge-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`

## Files Created Or Updated

Created:

- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `docs/product/gnr8-aaf-granted-with-limitations-vocabulary-closeout.md`

Updated:

- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Exact Gap Found

The SQL gap was `public.gnr8_aaf_approval_decisions` constraint `gnr8_aaf_approval_decisions_status_ck`. It allowed `granted`, `rejected`, `revoked`, `expired`, `superseded`, `cancelled`, and `not_required_by_policy`, but rejected `granted_with_limitations`.

The TypeScript gap was `AAF_APPROVAL_STATUSES` in `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`; it also omitted `granted_with_limitations`. Because `AafApprovalDecisionStatus` is derived from that vocabulary in the AAF writer, the writer could not represent the status honestly at the TypeScript boundary.

No request status, gate result, policy evaluation result, evidence package status, or freshness vocabulary needed this value.

## Migration

Migration created: `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`

Changed table/constraint:

- `public.gnr8_aaf_approval_decisions`
- `gnr8_aaf_approval_decisions_status_ck`

The migration drops and recreates only that CHECK constraint, preserving all existing statuses and adding only `granted_with_limitations`. It creates no requests, decisions, evidence packages, policies, grants, runtime state, proposal state, or workflows.

## Contract Changes

`AAF_APPROVAL_STATUSES` now includes `granted_with_limitations`.

`AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.allowedDecisionStatuses` now includes `granted_with_limitations` alongside the existing terminal decision statuses.

No gate result, policy result, evidence type, freshness result, scope, prohibited action, publish, content, client, launch, domain, billing, or runtime execution vocabulary was broadened.

## Test Coverage Added

- AAF contract tests now expect `granted_with_limitations` in canonical approval statuses and include the new migration when comparing SQL vocabulary.
- AAF contract tests now assert the single-site implementation authorization scope allows limited grants while still prohibiting content/publish overreach.
- AAF writer unit tests now prove `createApprovalDecision` accepts `granted_with_limitations`.
- AAF writer disposable PostgreSQL integration now applies the migration, persists a limited decision, and confirms invalid statuses still fail `gnr8_aaf_approval_decisions_status_ck`.
- MVP-18 bridge disposable PostgreSQL integration now validates a persisted exact-scope limited decision and carries limitations forward.
- MVP-20 execution-time validator disposable PostgreSQL integration now validates a persisted exact-scope limited decision, returns `allowed_with_limitations`, carries limitations forward, and still blocks wrong-scope limited grants.

## Compatibility

MVP-18 bridge compatibility is confirmed. The bridge already validated `granted_with_limitations`; MVP-20A makes that path persistable in SQL and proves limitations remain carried forward from AAF evidence.

MVP-20 validator compatibility is confirmed. The validator already supported `granted_with_limitations`; MVP-20A proves the disposable PostgreSQL path now supports it and that wrong scopes still fail closed.

## Approval Boundary Confirmation

`granted_with_limitations` is an AAF approval decision status only. It does not imply proposal approval, content approval, client approval, launch approval, publish activation approval, domain readiness, billing approval, hosting activation, runtime execution, rollback approval, AI/provider approval, Command Center resolution, or Ops Inbox resolution.

## Runtime And External Boundary Confirmation

No runtime artifact, runtime site version, active pointer, public runtime route, preview route, API route, UI, worker, server action, Command Center, Ops Inbox, client portal, publish, domain/DNS, billing, provider, AI, rollback, or Generated Proposal Bundle behavior was added or changed.

No production Supabase, staging Supabase, AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing, hosting, domain, publish, rollback, runtime provider, or external provider was called. Docker was used only for disposable local PostgreSQL validation.

## Validation Performed

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- focused TypeScript no-emit validation for changed contracts, AAF writer, bridge, and validator files.
- `git diff --check`.
- trailing whitespace check on changed/new files.
- guardrail search proving no forbidden runtime artifact/site version, active pointer, public runtime, provider, DNS, Vercel, Openprovider, Stripe, billing, domain, publish, rollback, AI, Generated Proposal Bundle, route, worker, UI, client portal, Command Center, or Ops Inbox behavior was added.
- production-file guardrail search over the changed contract and migration; matches are existing AAF vocabulary/prohibited-action strings only.
- Docker cleanup check for disposable PostgreSQL containers.

## Issues Found

- `granted_with_limitations` was modeled in MVP-18/MVP-20 validation logic but not in canonical AAF TypeScript or SQL decision status vocabulary.

## Residual Risks

- Existing databases need the MVP-20A migration applied before persisted limited decisions can be stored.
- `granted_with_limitations` still depends on evidence limitations being present and carried forward; future executors must keep enforcing that before mutation.
- This phase does not add deeper actor-policy authorization beyond the existing AAF decision/status model.

## Acceptance

MVP-20A is safe to accept as an AAF-only vocabulary closeout.

MVP-21 execution persistence/executor boundary design may begin next, but runtime mutation should still wait for that separate design to bind execution attempts to MVP-20 validation and append-only execution source refs.

Recommended next milestone: MVP-21 single-site improvement execution persistence and executor boundary design, still without runtime mutation.

## Git Status Summary

Modified:

- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`

Untracked:

- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `docs/product/gnr8-aaf-granted-with-limitations-vocabulary-closeout.md`

No commit or push was performed.
