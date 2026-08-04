# GNR8 Single-Site Publish Activation Request Bridge Closeout

Phase: MVP-41
Date: 2026-08-04
Scope: Server-only, non-executing bridge that prepares or reuses one AAF publish activation approval request from an accepted MVP-40 launch readiness evidence package.

MVP-41 consumes `single_site_launch_readiness_evidence` as request evidence for a future human/policy publish activation approval. It does not create approval decisions, gate attempts, PASR observations, DDOM snapshots, publish activation evidence packages, publish enforcement, publish execution, rollback, provider calls, billing/Stripe/domain mutation, runtime mutation, UI/API routes, Command Center, Ops Inbox, client portal exposure, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`
- `docs/product/gnr8-single-site-launch-approval-aaf-bridge-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Bridge

Location:

- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`

Public APIs:

- `preparePublishActivationRequestFromLaunchReadiness(input)`
- `validateLaunchReadinessEvidenceForPublishActivationRequest(input)`
- `computePublishActivationRequestSemanticWatermark(input)`
- `buildPublishActivationRequestIdempotencyKeys(input)`
- `stablePublishActivationRequestJson(value)`
- `hashPublishActivationRequestValue(value)`

Canonical AAF vocabulary:

- scope: `publish_activation`
- action: `publish.activation`
- subject type: `site_version`
- request status: `requested`
- source evidence type consumed: `single_site_launch_readiness_evidence`

## Evidence Strategy

The bridge links the MVP-40 `single_site_launch_readiness_evidence` package directly through `gnr8_aaf_approval_evidence_links` with role `publish_activation_request_launch_readiness_evidence`.

No wrapper `publish_activation_evidence` package was needed. The existing AAF request writer accepts an evidence link to an existing evidence package, and direct linking avoids duplicating the launch readiness payload or treating it as publish approval.

## Request Behavior

Preparation validates the launch readiness evidence read-only, then creates or reuses one AAF approval request with exact `publish_activation` scope and `publish.activation` policy action. The writer also persists the request-side `approval_required` policy evaluation and request audit event required by the existing AAF writer transaction pattern; this is non-enforcing request metadata and not a gate evaluation.

The output returns request id/ref, launch readiness evidence id/ref, scope/action/status, source refs, limitations carried forward, semantic watermark, idempotency result, and explicit boundary flags:

- `createsApprovalRequest: true`
- `createsApprovalDecision: false`
- `createsGateAttempt: false`
- `evaluatesGate: false`
- `publishes: false`
- `publishActivationApproved: false`
- `publishActionBlocked: false`
- `runtimeMutation: false`
- `providerCalls: false`
- `evidenceOnlyUntilDecision: true`

## Validation Behavior

Validation fails closed unless the evidence package exists, has type `single_site_launch_readiness_evidence`, has subject type `single_site_launch_readiness_package`, matches tenant/client/site/migration/readiness id, matches the expected improved candidate site version, runtime artifact, and publish target refs, has readiness status `ready` or `ready_with_limitations`, has required dimension summaries, has represented freshness, has no open P0 blocker, and matches the expected launch readiness evidence watermark when supplied.

`ready_with_limitations` is accepted only as evidence for a request. Limitations and unresolved non-P0 blockers are carried forward into request metadata and output. They do not become approval, gate pass, publish authorization, or publish block.

## Prohibited Substitutions

Unit coverage proves these fail as request evidence:

- launch approval evidence
- content approval evidence
- client approval evidence
- implementation authorization evidence
- improved version review acceptance
- DDOM readiness snapshot alone
- billing/hosting readiness ref alone
- PASR shadow result alone
- preview/public render ref
- Command Center/Ops Inbox status
- AI/provider output
- Generated Proposal Bundle
- chat transcript/operator notes alone

## Boundaries

AAF decision boundary:

- No approval decision API is imported or called.
- Unit and integration tests verify zero approval decision rows are created.

AAF gate boundary:

- No action gate attempt API is imported or called.
- No publish activation gate adapter or policy gate facade invocation is used by the bridge.
- Integration verifies zero action gate attempt rows are created.

PASR boundary:

- PASR diagnostic refs may exist inside MVP-40 evidence as non-enforcing source refs only.
- The bridge does not call PASR observer/source-reader code or create PASR observations.

DDOM boundary:

- DDOM readiness snapshots are not created or read as a substitute.
- The bridge does not call DDOM writers, triggers, manual callers, or live DNS.

Domain/DNS/provider boundary:

- Domain, DNS, Vercel, Openprovider, registrar, SSL, provider, and AI systems are not called.
- Publish target truth is consumed only as a stored evidence ref.

Billing/Stripe boundary:

- Billing, hosting, Stripe, customer, subscription, and entitlement state are not mutated or used as substitute evidence.

Publish/rollback/runtime boundary:

- No publish activation enforcement, publish execution, rollback execution, runtime artifact mutation, site version mutation, active pointer switch, content override mutation, or publish target mutation is performed.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-request-bridge.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-request-bridge.integration.test.ts`
- `pnpm exec tsc --noEmit -p /private/tmp/gnr8-mvp41-tsconfig.json`

The disposable PostgreSQL integration test applied AAF core, MVP-40 launch readiness evidence type, single-site spine, and MVP-37 launch readiness core migrations. It verified evidence validation, request creation, direct evidence linking, idempotent replay, semantic drift conflict, wrong evidence type failure, blocked readiness failure, zero decision rows, zero gate attempt rows, no PASR/DDOM/runtime/publish/rollback/billing/domain mutations, and Docker cleanup through test `finally`.

Final hygiene and guardrails passed:

- `git diff --check`
- trailing whitespace check over changed files
- guardrail search for no approval decision creation
- guardrail search for no action gate attempt creation
- guardrail search for no PASR observer invocation
- guardrail search for no DDOM snapshot creation
- guardrail search for no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- guardrail search for no publish/rollback/runtime active pointer mutation
- Docker cleanup check

## Issues Found And Fixed

- The integration test initially attempted to mutate an AAF evidence package to simulate blocked readiness. AAF append-only protection rejected the update correctly. The fixture was fixed to insert a separate blocked evidence package instead.
- The first wrong-type fixture used a content hash shorter than the AAF minimum. The fixture was corrected.
- The focused no-emit config needed an explicit pnpm `@types/node` type root because the workspace symlink layout did not expose `node_modules/@types/node`.

## Residual Risks

- The bridge intentionally creates only the request-side `approval_required` policy evaluation required by the AAF writer transaction pattern. Future publish activation decision/gate milestones must keep this distinct from gate evaluation.
- The bridge validates the supplied MVP-40 package and expected refs; it does not reread live source systems by design.

## Acceptance

MVP-41 is safe to accept.

Recommended next milestone: implement the publish activation human decision workflow against the exact `publish_activation` request, still without gate evaluation, publish enforcement, runtime mutation, provider calls, rollback, billing/domain mutation, or UI/API exposure unless explicitly scoped.

No commit or push was performed.
