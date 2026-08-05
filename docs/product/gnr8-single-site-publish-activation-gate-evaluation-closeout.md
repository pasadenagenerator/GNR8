# GNR8 MVP-44 Single-Site Publish Activation Gate Evaluation Closeout

Scope: Server-only, non-publishing publish activation gate evaluation core for single-site MVP publish activation.

MVP-44 consumes the MVP-43 deterministic handoff package, validates it fail-closed, builds a deterministic publish activation gate input, and delegates to the canonical AAF action gate validator facade. It may create/reuse only AAF policy evaluation, audit event, and action gate attempt records required by that facade. It does not enforce the result, block a publish route, call PASR, call publish orchestration, publish, rollback, switch active pointers, mutate runtime, call providers, create approval requests, create approval decisions, create DDOM snapshots, mutate billing/domain/DNS, add UI/API routes, expose Command Center/Ops Inbox/client portal behavior, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.integration.test.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- Runtime/PASR/DDOM/PTT/publish boundary docs and grep surfaces listed in validation.

## Files Created Or Updated

Created:
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`

Updated:
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Evaluator Location

The evaluator lives at `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`.

Main exports:
- `evaluatePublishActivationGateFromHandoff(...)`
- `buildPublishActivationGateInputFromHandoff(...)`
- `buildPublishActivationSemanticGateInputWatermark(...)`
- `SingleSitePublishActivationGateEvaluator`

## Canonical Gate Path Selected

MVP-44 calls `AafActionGateValidatorFacade.validateGate(...)` through a small single-site evaluator wrapper.

The existing `AafPublishActivationGateAdapter` was reviewed, but not used as the MVP-44 handoff evaluator because it is the PASR/shadow dry-run adapter and requires a separate `publish_activation_evidence` package with a `site_version` subject. MVP-43 hands off an already-validated MVP-40 `single_site_launch_readiness_evidence` package whose subject is the launch readiness package. Passing that package through the PASR dry-run adapter would intentionally produce `evidence_type_mismatch` / subject mismatch rather than evaluate the MVP-43 chain. MVP-44 therefore uses the canonical AAF gate facade directly, with MVP-43 validation carrying the launch-readiness evidence guarantees and the AAF facade carrying policy/approval/gate attempt persistence.

The focused AAF facade correction allows `granted_with_limitations` for `publish_activation` when limitations are present, matching MVP-44's explicit limited-grant requirement. Without carried limitations, the status still blocks.

## Handoff Validation Behavior

The evaluator fails closed before AAF gate evaluation unless all required conditions hold:
- handoff exists and version is `mvp-43-publish-activation-gate-handoff:v1`;
- handoff status is `handoff_ready`;
- handoff flags remain non-executing and not a gate pass or publish permission;
- tenant/client/site/migration identity matches the evaluator input;
- decision status is `granted` or `granted_with_limitations`;
- publish activation request id/ref/status are present and request status is `requested`;
- publish activation decision id/ref are present;
- launch readiness evidence package id/ref/source watermark are present;
- candidate site version ref and watermark are present;
- runtime artifact ref and watermark are present;
- publish target ref and watermark are present;
- expected handoff watermark, decision ref, evidence package ref, and publish target ref match when supplied;
- blocker, missing, stale, and conflicting-decision summaries are empty;
- MVP-43 gate input preview is present and scoped to `publish_activation`.

Fail-closed validation returns `gateEvaluated: false`, `gateResult: "fail_closed"`, and no AAF gate facade call.

## Gate Input Shape

The deterministic gate input includes:
- scope `publish_activation`;
- action `publish.activation`;
- subject type `site_version`;
- subject id from the candidate site version ref;
- tenant/client/site/migration ids;
- publish activation request id/ref;
- publish activation decision id/ref;
- launch readiness evidence package id/ref;
- candidate site version ref;
- runtime artifact ref;
- publish target ref;
- limitations from readiness and decision, plus combined limitations;
- freshness summary;
- source refs and audit refs from MVP-43;
- source watermarks for read model, request, decision, launch readiness evidence, candidate site version, runtime artifact, and publish target;
- semantic handoff watermark;
- semantic gate input watermark.

The AAF facade input uses `requiredEvidenceType: null` and `sourceRefsRequired: false` because MVP-43 has already validated the launch-readiness evidence package type, freshness, source refs, decision linkage, and blockers. The AAF facade still persists the launch-readiness evidence package id on the gate attempt and validates the approval request/decision linkage.

## Gate Evaluation And Persistence Behavior

Valid handoffs call the canonical AAF action gate validator facade. The facade creates/reuses:
- one AAF policy evaluation using the evaluator idempotency key plus `:policy`;
- one AAF pre-action audit event using the evaluator idempotency key plus `:audit`;
- one AAF action gate attempt using the evaluator idempotency key.

The evaluator returns:
- `gateEvaluated: true`;
- canonical `AafGateResult` such as `allowed`, `blocked`, `approval_required`, `evidence_missing`, `evidence_stale`, `approval_stale`, `approval_superseded`, `approval_revoked`, `audit_unavailable`, `not_required_by_policy`, `policy_error`, or `fail_closed`;
- wrapper status `allowed`, `warning`, `blocked`, or `error`;
- warnings for non-enforcement/no-publish behavior, plus `limitations_carried_forward` when applicable.

No approval request or approval decision is created by MVP-44.

## Idempotency And Drift Behavior

The evaluator reuses AAF writer idempotency for policy, audit, and gate records. The semantic gate input watermark is embedded in the AAF `causation_id`, preserving upstream causation as a prefix when supplied. Same idempotency key with the same semantic gate input reuses the same AAF rows. Same idempotency key with semantic drift conflicts through the existing AAF writer semantic idempotency checks and is surfaced as `PublishActivationGateEvaluatorIdempotencyConflictError`.

## Non-Enforcement Boundary

Every successful result includes:
- `gateEvaluated: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`
- `publishes: false`
- `runtimeMutation: false`
- `providerCalls: false`
- `createsApprovalRequest: false`
- `createsApprovalDecision: false`
- `createsDdomSnapshots: false`
- `pasrInvoked: false`

Fail-closed validation results include the same non-execution flags with `gateEvaluated: false`.

## Boundary Confirmations

AAF request boundary:
- MVP-44 reads request ids/refs from the handoff and passes them to the AAF gate facade.
- It does not create approval requests.

AAF decision boundary:
- MVP-44 reads decision ids/refs/status/limitations from the handoff and passes the decision id to the AAF gate facade.
- It does not create approval decisions.

PASR boundary:
- No PASR observer, PASR source reader, PASR read model, or PASR shadow result code is imported or called.

DDOM boundary:
- No DDOM snapshots are created.
- No DDOM manual trigger/caller/writer is imported or called.

Domain/DNS/provider boundary:
- No live DNS, Vercel, Openprovider, registrar, SSL, provider, Stripe, or AI provider code is imported or called.

Billing/Stripe boundary:
- No billing, subscription, entitlement, cost-center, customer billing, or Stripe state is mutated.

Publish/rollback/runtime boundary:
- No publish route, publish orchestrator, publish guard, publish enforcement, publish safety, active pointer switch, rollback switch, runtime artifact mutation, site version mutation, content override mutation, public runtime path, or publish target mutation is imported or called.

## Validation Results

Passed focused tests:
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- Final result: 54/54 passing.

Focused TypeScript no-emit:
- `pnpm exec tsc --noEmit --pretty false --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node --baseUrl apps/platform apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- Result: passed.

Disposable PostgreSQL integration:
- Applied AAF core migration.
- Applied AAF `granted_with_limitations` vocabulary migration.
- Applied MVP-40 `single_site_launch_readiness_evidence` type migration.
- Verified valid handoff writes expected AAF policy/audit/gate attempt records.
- Verified idempotent replay reuses.
- Verified semantic drift conflicts.
- Verified rejected decision fails closed before gate evaluation.
- Verified missing evidence fails closed before gate evaluation.
- Verified no PASR/DDOM/runtime/publish/rollback/billing/domain tables are created or mutated.
- Verified active pointer table remains absent/unchanged in the disposable schema.

Final hygiene and guardrails:
- `git diff --check`
- trailing whitespace check over changed files
- guardrail search proving no approval request creation in MVP-44 evaluator
- guardrail search proving no approval decision creation in MVP-44 evaluator
- guardrail search proving no PASR invocation in MVP-44 evaluator
- guardrail search proving no DDOM snapshot creation in MVP-44 evaluator
- guardrail search proving no provider/DNS/Vercel/Openprovider/Stripe/AI calls in MVP-44 evaluator
- guardrail search proving no publish/rollback/runtime active pointer mutation in MVP-44 evaluator
- Docker cleanup check for `gnr8-mvp44-publish-activation-gate` containers

## Issues Found And Fixed

- The existing AAF facade limited-grant mapping blocked `publish_activation` limited approvals even when limitations were carried. MVP-44 requires `granted_with_limitations` to evaluate with warnings/limitations, so `publish_activation` was added to the facade's limited-grant scopes and the focused facade test was updated.
- Initial evaluator watermark code used an undefined shorthand variable; unit tests caught it and the gate input watermark now uses `input.actor`.
- Initial drift conflict detection only inspected top-level error messages. Disposable DB validation showed the AAF facade wraps nested writer conflicts, so the evaluator now recursively detects idempotency conflict causes and surfaces a dedicated conflict error.
- Focused TypeScript no-emit caught an overly narrow `gateEvaluated: true` flag type for fail-closed validation results; the result flag type now permits `gateEvaluated: false` for pre-gate fail-closed outputs.

## Residual Risks

- MVP-44 evaluates the MVP-43 handoff chain only. It does not re-read live runtime, active pointer, DDOM, domain, PASR, provider, billing, or publish target state.
- The AAF gate facade persists a gate attempt result, but MVP-44 does not wire that result into publish enforcement or active pointer authorization.
- The PASR dry-run adapter remains a separate shadow path for PASR-built `publish_activation_evidence` packages.

## Acceptance

MVP-44 is safe to accept after focused tests, disposable DB integration, no-emit validation, diff hygiene, guardrail searches, and Docker cleanup pass.

Recommended next milestone: implement a separate, explicitly scoped publish activation enforcement or publish-route consumption milestone only after reviewing how persisted MVP-44 gate results should be read. That future milestone must keep PASR, DDOM, provider, domain/DNS, billing, rollback, runtime mutation, and UI/API behavior out of scope unless separately authorized.

No commit or push was performed.
