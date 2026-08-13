# GNR8 Single-Site MVP Minimal Operator Action Surface Closeout

Date: 2026-08-13
Phase: MVP-CUTLINE-3
Scope: Server-only operator facade, internal admin status/action routes, focused tests, guardrails, closeout, and canonical index update.

## Result

MVP-CUTLINE-3 adds a narrow internal superadmin-only operator API for the one-site-at-a-time MVP path.

Facade location:

- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`

Route locations:

- `GET /api/gnr8/admin/single-site-mvp/status`
- `POST /api/gnr8/admin/single-site-mvp/action`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/status/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/action/route.ts`

Focused tests:

- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`

## Supported Operations

- Read orchestration status.
- Preflight a requested next operation against the MVP-CUTLINE-2 advisory next operation.
- Execute `run_operator_dry_run` only after explicit dry-run confirmation validates through the existing MVP-54 caller validator.
- Execute `run_shadow_publish` only after the existing shadow-publish feature flag is enabled and explicit shadow-publish confirmation validates through the existing MVP-56 caller validator.

The only explicitly allowed safe diagnostic override is `run_operator_dry_run` when the current advisory next operation is `run_shadow_publish`.

## Explicitly Not Supported

All other operation keys remain non-executable in MVP-CUTLINE-3.

Manual review/no-op style keys return `manual_step_required`. Other known but non-executable operation keys return `not_implemented_for_mvp_cutline`. Unknown operation keys return `invalid_requested_operation`.

This phase does not implement source capture execution, clone execution, improvement execution, approval workflows, gate evaluation, online verification execution, or MVP closeout execution.

## Authorization And Input Validation

The new routes call the existing `requireSuperadminUserId` helper before facade access. Actor metadata is derived server-side as a human `platform_superadmin`; request bodies and query strings cannot override actor, role, principal, user id, or superadmin id.

The status route accepts only identity/ref/correlation query fields. The action route accepts only the narrow action contract fields, requires `actionMode` to be `preflight` or `execute`, and rejects unknown/unsafe fields before invoking the facade.

Executable operations require explicit confirmation. The facade maps the narrow MVP-CUTLINE-3 contract into the existing MVP-54/MVP-56 caller request shapes, then runs the existing validators before delegation.

## Delegation And Redaction

Dry-run delegates to `runSingleSitePublishOperatorDryRun` only after `validateSingleSitePublishOperatorDryRunRequest` passes.

Shadow-publish delegates to `runSingleSiteShadowPublishOperatorAction` only after `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` is enabled and `validateSingleSiteShadowPublishOperatorRequest` passes.

Responses expose orchestration status, reason codes, blockers, warnings, limitations, safe refs, correlation/idempotency values, safe execution summaries, and explicit mutation flags. Responses omit server actor internals, request actor overrides, resolver results, metadata handoff payloads, raw orchestrator input/results, raw AAF payloads, SQL errors, stack traces, provider secrets, billing data, and payment data.

## Boundary Decisions

No SQL migration was added. No UI was added. No Command Center buttons were added.

The generic publish route, client portal, agency/client portal surfaces, and Ops Inbox were not changed.

The facade itself does not create AAF records, gate attempts, approval requests, approval decisions, PASR reads, DDOM snapshots, provider calls, DNS/domain calls, Vercel/Openprovider/Stripe/AI calls, billing calls, publish targets, runtime artifacts, active pointers, rollback records, site versions, or public runtime mutations.

Shadow-publish remains possible only through the existing MVP-56 caller path and its current strict contract.

## Validation

Focused new tests:

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-mvp-operator-action-facade.test.ts app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- Result: 17 passing.

Required existing tests:

- `cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts gnr8/single-site/single-site-mvp-orchestration-service.test.ts`
- Result: 34 passing.

Focused TypeScript no-emit:

- Temporary focused tsconfig extending `apps/platform/tsconfig.json` was used and removed after validation.
- `cd apps/platform && pnpm exec tsc --noEmit --pretty false --project tmp-mvp-cutline-3-tsconfig.json`
- Result: passed.

An initial root-level `tsx` invocation failed before tests executed because the sandbox blocked `tsx` IPC pipe creation and the root working directory did not resolve the platform `@/*` path alias. The tests were rerun from `apps/platform`, matching existing route-test conventions.

## Guardrails

Guardrails verified by focused route/source tests and follow-up searches:

- no generic publish route changes;
- no client portal or agency/client portal changes;
- no Ops Inbox changes;
- no Command Center UI buttons;
- no AAF writes, approval request/decision creation, or gate attempt creation;
- no gate evaluator invocation;
- no PASR or DDOM calls;
- no provider, DNS, Vercel, Openprovider, Stripe, billing, payment, or AI calls;
- no direct runtime, publish target, active pointer, rollback, artifact, site version, or public runtime mutation;
- no SQL migration.

## Residual Risks

The new MVP-CUTLINE-3 facade delegates directly to the existing MVP-54/MVP-56 caller functions after their validators pass. The original MVP-54/MVP-56 audited routes remain unchanged, but this facade does not add a new audit record of its own in this phase.

Online GNR8 verification is not needed now because this phase adds internal admin API code and tests only. Online verification belongs after commit, push, deployment, environment flag confirmation, and a real seeded one-site operator run.

## Acceptance

MVP-CUTLINE-3 is safe to accept as a minimal internal operator action surface.

Recommended next milestone: wire a real internal operator validation run after deployment using seeded disposable single-site data, without adding UI buttons or expanding executable operations.
