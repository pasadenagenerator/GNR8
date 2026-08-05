# GNR8 MVP-46 Single-Site Publish Activation Enforcement Guard Closeout

Scope: Server-only, read-only publish activation enforcement guard core for future single-site MVP publish activation.

MVP-46 implements an isolated guard that consumes a future publish intent, a persisted MVP-44 gate result, and MVP-43/MVP-44 semantic watermarks to decide whether publish activation would pass, block, error, or use an explicitly enabled bypass. It is not wired into publish routes or orchestrators and does not publish, rollback, switch active pointers, create AAF records, evaluate gates, call PASR, create DDOM snapshots, call providers, mutate runtime, mutate publish targets, mutate billing/domain state, add UI/API routes, expose Command Center/Ops Inbox/client portal behavior, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-runtime-contract.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-fail-closed-policy.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-operator-workflow.md`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- billing/hosting readiness gap references in the MVP-45 and launch readiness closeouts.

## Files Created Or Updated

Created:
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`

Updated:
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Guard Location

The guard lives at `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`.

It is not imported by `publishApprovedSiteVersion(...)`, publish routes, runtime-store primitives, rollback switch, PASR, DDOM, Command Center, Ops Inbox, or client portal code.

## API Summary

Main exports:
- `evaluatePublishActivationEnforcementGuard(input)` for pure in-memory evaluation.
- `readAndEvaluatePublishActivationEnforcementGuard(input)` for read-only repository-backed rereads.
- `buildPublishActivationEnforcementGuardInputWatermark(input)` for deterministic semantic guard input watermarking.
- `PublishActivationEnforcementGuardReadRepository` for repeatable-read, read-only Postgres rereads.

## Input Contract

Required input includes tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish target ref, publish stage, publish environment, publish activation decision ref, MVP-44 gate attempt/result ref, MVP-43 handoff watermark, MVP-44 gate input watermark, actor, correlation id, and idempotency key.

Optional input includes max gate age, warning/limitations policy, expected gate result, reread toggles, conflict-detection toggle, emergency bypass request, and an explicit repository dependency.

## Repository And Read Strategy

`PublishActivationEnforcementGuardReadRepository` opens `begin isolation level repeatable read read only`, captures one transaction timestamp, reads the AAF action gate attempt, reads the linked AAF request and decision, checks revocation/supersession existence, optionally reads the current PTT publish target row, detects newer same-subject gate attempts, and commits.

It has no insert, update, delete, writer, gate evaluator, PASR, DDOM, provider, runtime, publish, rollback, billing, or domain methods.

## Pass Rules

The guard passes only when the persisted gate exists, the canonical gate result is `allowed`, scope/action/subject match `publish_activation` / `publish.activation` / `site_version`, tenant/client/site/migration match, candidate/artifact/target/stage/environment match, decision refs match, reread decision is still `granted` or `granted_with_limitations`, handoff watermark matches, gate input watermark matches, gate age is fresh, PTT target is active when reread is enabled, and no newer conflicting gate is detected.

## Fail-Closed Rules

The guard blocks or errors on missing required input, missing gate, blocked/error/fail-closed/approval-required/stale/evidence/policy/audit gate results, stale gate age, identity mismatch, wrong candidate, wrong artifact, wrong target, wrong stage/environment, decision missing/rejected/revoked/expired/superseded/cancelled/not-required, handoff watermark mismatch, gate input watermark mismatch, disabled/retired publish target, read failure, unsupported warning/limitations result, and conflicting newer gate result.

## Warning And Limitations Policy

MVP-44 `warning` output or carried limitations block by default with `publish_activation_limitations_not_accepted`.

They pass only when `policy.allowWarningsWithLimitations` is explicitly true and the canonical gate result remains `allowed`. The result then preserves limitations and emits `limitations_explicitly_accepted_by_policy`.

## Bypass Decision

Bypass is implemented only as an explicit isolated input-policy branch. It is disabled by default.

Bypass requires `policy.emergencyBypass.enabled`, a requested bypass, actor id, actor role, reason, correlation id, and idempotency key. It returns `mode: "bypass"`, `allowed: true`, `bypassUsed: true`, residual-risk warnings, and all non-publishing flags. MVP-46 bypass does not write audit rows and does not publish.

## Output Contract

The guard returns `allowed`, `mode`, reason, blocker codes, warnings, limitations, `bypassUsed`, matched refs, freshness summary, semantic guard input watermark, source refs, diagnostic refs, and flags.

The flags explicitly state `readOnly: true`, `enforcementEvaluated: true`, `enforcementApplied: false`, `publishes: false`, `runtimeMutation: false`, `providerCalls: false`, `createsAafRecords: false`, `createsGateAttempt: false`, `evaluatesGate: false`, and `pasrInvoked: false`.

`publishActionBlockedWouldBlockIfWired` means "would block if wired"; no route is blocked in MVP-46.

## Non-Wiring Boundary

No publish route, publish orchestrator, route handler, server action, worker, Command Center, Ops Inbox, public runtime, or client portal file was modified.

MVP-46 does not call `publishApprovedSiteVersion(...)`, `switchActivePointer(...)`, publish safety/enforcement guards, rollback switch, content publish/rollback, or runtime-store mutation helpers.

## AAF Boundary

The guard rereads existing AAF request/decision/gate rows only. It does not create AAF approval requests, approval decisions, evidence packages, policy evaluations, audit events, audit refs, approval subject refs, revocations, supersession links, or gate attempts. It does not evaluate gates.

## PASR Boundary

The guard does not import or call PASR observer, source reader, read repository, read model, shadow result, or shadow surfacing code.

## DDOM Boundary

The guard does not import or call DDOM snapshot writers, manual triggers, callers, source readers, live DNS, or snapshot persistence.

## Domain, DNS, And Provider Boundary

No domain binding, DNS, Vercel, Openprovider, registrar, SSL provider, hosting provider, AI provider, production Supabase, or staging Supabase call was added or made.

## Billing And Stripe Boundary

No billing, Stripe, subscription, entitlement, cost, customer, price, margin, or hosting activation state is read as authority or mutated.

## Publish, Rollback, And Runtime Boundary

The guard never publishes, never rolls back, never switches active pointers, never archives versions, never refreshes artifacts, never binds artifacts, never mutates site versions, never mutates runtime active pointers, and never treats a pass as publish authorization outside future explicit wiring.

## Validation Results

Focused unit tests:
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- Result: 12/12 passing.

Disposable PostgreSQL integration:
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- Result: 1/1 passing.
- Applied AAF core, `granted_with_limitations`, MVP-40 evidence type, and PTT migrations.
- Seeded MVP-41 request, MVP-42 decision, MVP-43 handoff, MVP-44 gate attempt/result, PTT target, and a runtime active pointer fixture.
- Verified valid persisted gate passes, missing gate blocks, blocked gate blocks, stale gate blocks, wrong candidate/artifact/target blocks, expired decision blocks, disabled publish target blocks, conflicting newer gate blocks, no rows are inserted/updated/deleted by the guard, no new AAF gate attempts are created by the guard, no PASR/DDOM/runtime/publish/rollback/billing/domain rows are created by the guard, and active pointer fixture remains unchanged.

Focused TypeScript/static validation and guardrail results are recorded in the final MVP-46 report.

## Issues Found And Fixed

- The first repository-backed integration run accidentally used the default superadmin pool when no explicit repository was passed. The integration test now passes `PublishActivationEnforcementGuardReadRepository(pool)` for every disposable DB reread.
- Postgres timestamp rows were normalized through JavaScript locale strings, which failed a later timestamptz parameter cast. `text(...)` now converts `Date` values to ISO strings.
- The integration fixture initially attempted to update an append-only AAF gate attempt row. The fixture now inserts alternate gate rows in final form.

## Residual Risks

- MVP-46 relies on the future caller to provide the persisted MVP-44 result object for semantic fields not present as first-class columns on `gnr8_aaf_action_gate_attempts`, including the MVP-43 handoff watermark and runtime artifact/publish target refs.
- The guard is not wired into publish activation. Passing the guard does not authorize or execute publish in this milestone.
- Bypass audit persistence is intentionally deferred; MVP-46 only returns explicit bypass diagnostics.
- Billing/hosting source truth gaps remain outside this guard.

## Acceptance

MVP-46 is safe to accept after focused tests, disposable DB integration, no-emit validation, diff hygiene, guardrail searches, and Docker cleanup pass.

Recommended next milestone: MVP-47 publish orchestrator shadow integration that calls this guard in diagnostics-only mode without blocking active pointer mutation.

No commit or push was performed.
