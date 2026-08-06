# GNR8 MVP-56 Single-Site Shadow-Publish Internal Admin Route Closeout

Scope: separately flagged internal admin API route for single-site shadow-publish execution through the MVP-52 wrapper only.

MVP-56 implements `/api/gnr8/admin/single-site-publish/shadow-publish` as a server-only, internal admin namespace, platform-superadmin-only POST route. It is default off behind `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` and invokes the MVP-52 wrapper with `mode: "shadow_publish"` and `dryRun: false` only after feature flag, superadmin auth, strict request validation, explicit confirmation, idempotency, correlation, and expected refs/watermarks pass.

## Files Reviewed

- `docs/architecture/gnr8-single-site-shadow-publish-operator-action-architecture.md`
- `docs/architecture/gnr8-single-site-shadow-publish-execution-contract.md`
- `docs/architecture/gnr8-single-site-shadow-publish-access-audit-redaction.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-action-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/route.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- `docs/product/gnr8-single-site-shadow-publish-internal-admin-route-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Route Location

`POST /api/gnr8/admin/single-site-publish/shadow-publish`

The route exports `runtime = "nodejs"` and `dynamic = "force-dynamic"`.

## Feature Flag Behavior

The route requires `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`. Enabled values are `1`, `true`, `enabled`, `on`, and `shadow_publish`. If the flag is off, the route returns a safe denied preflight response before auth, wrapper, resolver, or publish can run.

## Authorization Behavior

Authorization uses existing `requireSuperadminUserId()` and derives actor server-side as:

```json
{ "actorType": "human", "actorRole": "platform_superadmin" }
```

Anonymous, public, client, client reviewer, agency, support/debug without superadmin representation, Ops Inbox, and body actor override attempts fail closed before wrapper invocation.

## Input Validation

The request must include `mode: "shadow_publish"`, tenant/client/site/migration ids, candidate site version ref, runtime artifact ref, publish target ref, publish stage/environment, launch readiness evidence ref, publish activation request/decision refs, gate attempt/result ref, handoff watermark, gate input watermark, idempotency key, correlation id, and an explicit confirmation object bound to migration, candidate, artifact, target, execute semantics, non-dry-run semantics, possible runtime mutation, no blocking enforcement, and no automatic rollback.

Unknown fields, body actor fields, `dryRun`, execute override fields, missing refs, wrong mode, dry-run mode, missing confirmation, invalid optional policy fields, and invalid evaluated timestamps fail before wrapper invocation.

## Wrapper Invocation

On a valid request the route calls the MVP-56 caller, which calls the MVP-52 wrapper exactly once with:

- `enabled: true`
- `mode: "shadow_publish"`
- `dryRun: false`
- strict expected refs and watermarks
- server-derived platform superadmin actor
- validated correlation/idempotency values
- optional warnings/limitations policy only when supplied as valid typed fields

The route never imports or calls `publishApprovedSiteVersion(...)` directly.

## Execution Boundary

Publish may execute only because the MVP-52 wrapper execute path calls the existing `publishApprovedSiteVersion(...)`. MVP-56 does not implement provider/domain/billing execution, gate reevaluation, blocking enforcement, PASR, DDOM, rollback, active pointer mutation, runtime mutation, or AAF writes outside existing orchestrator behavior invoked by the wrapper.

## Response Projection And Redaction

The response includes route status, wrapper status, resolver status, publish orchestrator status/category, optional safe pointer before/after projection, optional shadow guard diagnostics, blocker/warning/limitation codes, safe refs, correlation/idempotency, and explicit flags:

- `shadowPublish: true`
- `blockingEnforcementApplied: false`
- `publishMayHaveExecuted: boolean`
- `createsAafRecords: false`
- `createsGateAttempt: false`
- `evaluatesGate: false`

It does not expose raw resolver result, metadata handoff, publish orchestrator input/result, raw evidence, raw AAF rows, source refs, provider secrets, billing data, raw SQL errors, stack traces, or client diagnostics.

## Logging Behavior

The route emits compact structured logs with actor, correlation/idempotency, route status, wrapper status, resolver status, publish status, shadow guard mode/reason when projected, safe pointer before/after when projected, and `blockingEnforcementApplied: false`. No durable audit tables or AAF audit records were added; durable operator-action audit remains future work.

## Failure Behavior

Flag off, unauthorized, invalid mode, body actor override, missing confirmation, missing strict refs, invalid request policy, and unknown fields fail before wrapper invocation. Wrapper preflight/resolver incomplete responses return safe failures without publish execution. Orchestrator failure returns a safe failure with `publishMayHaveExecuted: true`, no automatic rollback, no retry, no new records, and no raw error leakage.

## Boundary Confirmations

MVP-54 dry-run non-regression: the existing dry-run route still invokes the wrapper with `dryRun: true` only.

Generic publish route boundary: `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` was reviewed and left unchanged.

Client portal boundary: client content publish/rollback routes were reviewed and left unchanged; no client portal action or diagnostics were exposed.

Ops Inbox boundary: Ops Inbox page/shell were reviewed and left unchanged; no Ops Inbox action was added.

AAF/gate boundary: the route creates no AAF records, creates no gate attempts, and invokes no gate evaluator.

PASR boundary: the route invokes no PASR observer, reader, or read model.

DDOM boundary: the route creates no DDOM snapshots, invokes no manual trigger/caller, and calls no live DNS.

Domain/DNS/provider boundary: the route calls no Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, production Supabase, or staging Supabase APIs.

Billing/Stripe boundary: the route adds no billing, entitlement, subscription, invoice, customer, price, margin, cost, or Stripe behavior.

Publish/rollback/runtime boundary: direct active pointer/runtime mutation remains outside MVP-56; mutation may occur only through the existing publish orchestrator called by the MVP-52 wrapper. No rollback automation was added.

## Validation Results

Focused route tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- Result: 11 passed, 0 failed.

MVP-54 dry-run route regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- Result: 8 passed, 0 failed.

MVP-52 wrapper regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- Result: 10 passed, 0 failed.

MVP-49 resolver regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- Result: 10 passed, 0 failed.

Focused TypeScript no-emit:

- `pnpm exec tsc -p /private/tmp/gnr8-mvp56-tsconfig.json --pretty false`
- Result: passed.

Repo-wide TypeScript note:

- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`
- Result: failed on pre-existing unrelated platform test/type debt and also surfaced MVP-56 projection issues, which were fixed. A focused MVP-56 no-emit pass was then completed.

## Guardrail Results

Guardrail source tests and manual searches confirmed:

- dry-run route remains dry-run only;
- generic publish route unchanged by MVP-56;
- client portal/content routes unchanged by MVP-56;
- Ops Inbox unchanged by MVP-56;
- no gate evaluator invocation;
- no AAF record creation;
- no PASR invocation;
- no DDOM snapshot creation;
- no provider/DNS/Vercel/Openprovider/Stripe/AI calls;
- no direct active pointer/runtime mutation outside the MVP-52 wrapper and existing orchestrator path;
- no SQL migration added;
- Docker was not used.

## Issues Found And Fixed

- Tightened warning/guard diagnostic redaction so token-like or prose error strings are not returned as safe codes.
- Fixed TypeScript projection narrowing for optional fake-orchestrator fields used in tests.
- Reran MVP-49 from repository root after the app-package workdir produced a doubled source path in that existing test's source guard.

## Residual Risks

- Durable operator-action audit persistence is not implemented; MVP-56 uses structured logs only.
- The existing publish orchestrator remains authoritative for partial publish failure semantics after wrapper execute starts.
- The generic runtime publish route still performs domain reconciliation in its own path, but MVP-56 does not call or modify that route.

## Safe-To-Accept Decision

MVP-56 is safe to accept. The internal admin shadow-publish route exists, is default off, platform-superadmin-only, strictly validates request intent/context before wrapper invocation, calls the MVP-52 wrapper execute path only on valid requests, redacts responses, preserves MVP-54 dry-run behavior, leaves generic publish/client/Ops surfaces unchanged, and passes focused tests and guardrails.

## Recommended Next Milestone

MVP-57: add a durable internal operator-action audit log for shadow-publish attempts using an existing non-AAF audit surface or a separately reviewed minimal audit table, still without UI buttons, Ops Inbox actions, client portal exposure, blocking enforcement, provider/domain/billing execution, or rollback automation.

No commit or push was performed.
