# GNR8 Single-Site Publish Activation Human Decision Workflow Closeout

Phase: MVP-42
Date: 2026-08-04
Scope: Server-only, non-executing human decision workflow core for an existing MVP-41 AAF publish activation approval request backed by MVP-40 launch readiness evidence.

MVP-42 records or reuses one exact-scope AAF approval decision for `publish_activation` / `publish.activation`. It does not create action gate attempts, evaluate gates, call PASR, create DDOM snapshots, publish, rollback, mutate runtime, switch active pointers, call providers, mutate billing/domain/DNS state, add UI/API routes, Command Center actions, Ops Inbox actions, client portal exposure, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/publish-safety-check.ts`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Service

Location:

- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`

Public APIs:

- `recordPublishActivationDecision(input)`
- `validatePublishActivationDecision(input)`
- `computePublishActivationDecisionSemanticWatermark(input)`
- `buildPublishActivationDecisionIdempotencyKeys(input)`
- `stablePublishActivationDecisionJson(value)`
- `hashPublishActivationDecisionValue(value)`

Canonical AAF vocabulary:

- scope: `publish_activation`
- action: `publish.activation`
- subject type: `site_version`
- source evidence type: `single_site_launch_readiness_evidence`
- request evidence link role: `publish_activation_request_launch_readiness_evidence`
- decision evidence link role: `publish_activation_decision_launch_readiness_evidence`

## Request Validation

Before writing a decision, the service reads AAF rows and fails closed unless:

- the approval request exists;
- request scope is exactly `publish_activation`;
- request action is represented by an `approval_required` policy evaluation for `publish.activation`;
- request subject type is exactly `site_version`;
- request status is `requested`;
- request tenant/client/site and candidate site version match the decision input;
- request policy evaluation links to the expected launch readiness evidence package;
- request evidence link points to the MVP-40 evidence package;
- expected request watermark matches when supplied.

The request-side policy evaluation is never treated as approval and never used as a gate result.

## Launch Readiness Evidence Validation

The service fails closed unless the evidence package exists, has package type `single_site_launch_readiness_evidence`, subject type `single_site_launch_readiness_package`, expected launch readiness record id, matching tenant/client/site/migration identity, matching candidate site version/runtime artifact/publish target refs, ready or ready_with_limitations status, fresh or partial-timeline freshness, a matching freshness check, no open P0 blockers, and a matching expected evidence watermark when supplied.

## Decision Behavior

Supported decision statuses:

- `granted`
- `granted_with_limitations`
- `rejected`

The service writes through `AafWriterRepository.createApprovalDecisionTransaction(...)`, creating one approval decision, one decision audit event, one decision evidence link, and audit refs to the request and launch readiness evidence. `rejected` records are persisted as human decisions but do not validate as publish approval.

`granted_with_limitations` carries launch readiness accepted limitations plus decision limitations into output and the decision audit payload. `granted` can carry explicit decision limitations only when supplied.

Existing AAF vocabulary also supports revoked, expired, superseded, and cancelled decisions. MVP-42 does not overbuild revocation or supersession operations; validation treats those states and separate revocation/supersession rows as fail-closed.

## Idempotency And Drift

The service derives deterministic idempotency keys for the decision, evidence link, audit event, and deterministic audit event id. Same semantic input plus same idempotency key reuses the same decision. Same idempotency key with semantic drift fails through the AAF writer idempotency conflict path. A different active decision for the same request is rejected unless it is the same idempotent replay.

## Validation Behavior

`validatePublishActivationDecision(...)` is read-only and fail-closed. It validates that the decision exists, links to the expected request and evidence package, is backed by the same request/evidence validation, has status `granted` or `granted_with_limitations`, is not expired, revoked, superseded, cancelled, rejected, requested, stale, or invalid, and carries limitations forward. It creates no gate attempts and performs no publish action.

## Prohibited Substitutions

Unit coverage proves these fail closed:

- launch readiness evidence without request;
- request-side policy row treated as approval;
- launch approval decision used as publish activation decision;
- content approval decision used as publish activation decision;
- client approval decision used as publish activation decision;
- launch readiness ready status without AAF decision;
- PASR shadow ready status used as approval;
- DDOM readiness snapshot used as approval;
- PTT publish target used as approval;
- billing/hosting readiness used as approval;
- Command Center/Ops Inbox status used as approval;
- AI/provider output used as approval;
- operator notes/chat transcript alone used as approval.

## Boundaries

Output flags:

- `createsApprovalDecision: true`
- `createsGateAttempt: false`
- `evaluatesGate: false`
- `publishes: false`
- `publishActionBlocked: false`
- `runtimeMutation: false`
- `providerCalls: false`
- `approvalOnly: true`

AAF gate boundary:

- No policy gate facade, gate adapter, or action gate attempt writer is imported or called.
- Integration verifies zero action gate attempt rows.

PASR boundary:

- No PASR observer, source reader, read model, or shadow result is imported or called.

DDOM/PTT boundary:

- DDOM readiness and publish target refs may appear only inside existing launch readiness evidence.
- The service does not create DDOM snapshots, trigger manual DDOM callers, call live DNS, or mutate publish targets.

Domain/DNS/provider boundary:

- No Vercel, Openprovider, registrar, DNS provider, SSL provider, AI provider, or external provider call is made.

Billing/Stripe boundary:

- No billing, Stripe, entitlement, subscription, hosting, or cost-center state is mutated or treated as approval.

Publish/rollback/runtime boundary:

- No publish orchestrator, publish guard, publish enforcement, publish safety, active pointer switch, rollback switch, runtime artifact mutation, site version mutation, content override mutation, public runtime, or publish target mutation is imported or called.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-decision-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-decision-service.integration.test.ts`
- `pnpm exec tsc --noEmit -p /private/tmp/gnr8-mvp42-tsconfig.json`
- `git diff --check`
- trailing whitespace check over changed files
- guardrail search for no AAF action gate attempt creation
- guardrail search for no PASR observer/source-reader/shadow invocation
- guardrail search for no DDOM snapshot creation/manual trigger/caller
- guardrail search for no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- guardrail search for no publish/rollback/runtime active pointer mutation
- Docker cleanup check for `gnr8-mvp42-publish-activation-decision` containers

The disposable PostgreSQL integration test applies AAF core, granted-with-limitations vocabulary, and single-site launch readiness evidence type migrations. It verifies MVP-41-style request creation through the request bridge, valid decision creation, decision/request/evidence links, semantic replay reuse, drift conflict, rejected decision not validating as approval, wrong request/evidence failure, conflicting active decision failure, zero gate attempt rows, and no PASR, DDOM, runtime, publish, rollback, billing, or domain table mutations.

## Issues Found And Fixed

- The service initially used a generic refusal message while carrying blocker codes only on the error object. The message now includes blocker codes so fail-closed causes are visible in normal test output.
- The integration test initially used `await` inside a non-async assertion callback. Fixtures are now created before `assert.rejects`.

## Residual Risks

- MVP-42 validates the AAF request/evidence timeline but intentionally does not evaluate an activation gate or enforce publish activation. A future milestone must keep decision validation separate from gate evaluation and publish execution.
- Limitations are stored in the decision audit payload because the existing AAF decision table has no limitations JSON column. This follows current writer/audit patterns, but future AAF read models may want a normalized decision-limitation projection.

## Acceptance

MVP-42 is safe to accept when the focused tests, disposable DB integration, no-emit check, diff hygiene, and guardrail searches pass.

Recommended next milestone: implement a read-only publish activation decision source/read model or gate-preparation handoff that consumes this exact decision without executing gate evaluation, publish activation enforcement, publish, rollback, runtime mutation, provider calls, billing/domain mutation, or UI/API exposure unless explicitly scoped.

No commit or push was performed.
