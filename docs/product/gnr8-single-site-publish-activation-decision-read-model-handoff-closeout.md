# GNR8 Single-Site Publish Activation Decision Read Model Handoff Closeout

Phase: MVP-43
Date: 2026-08-05
Scope: Server-only, read-only publish activation decision read model and gate handoff core for a single-site MVP publish activation chain.

MVP-43 reconstructs the MVP-41 request, MVP-42 decision, and MVP-40 launch readiness evidence chain for future gate evaluation. It does not create AAF records, create gate attempts, evaluate gates, call PASR, create DDOM snapshots, call providers, publish, rollback, mutate runtime/active pointers, mutate billing/domain/DNS state, add UI/API routes, expose Command Center/Ops Inbox/client portal behavior, commit, or push.

## Files Reviewed

- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-service.ts`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `apps/platform/supabase/migrations/20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Implementation Locations

Read repository:

- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`

Read model:

- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`

Gate handoff builder:

- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`

## Transaction Strategy

The repository is server-only and exposes `withReadOnlyTransaction(...)` plus `readSnapshot(...)`. Repository-backed reads use:

- `begin isolation level repeatable read read only`
- one captured `transaction_timestamp()`
- `commit` on success
- best-effort `rollback` on failure
- no insert/update/delete helpers

The snapshot reads AAF approval request, approval decisions, evidence links, evidence package, evidence source refs, freshness checks, policy rows, audit events, audit refs, launch readiness record/refs when present, and stored publish target truth when the table exists.

## Read Model

Status vocabulary:

- `not_requested`
- `request_pending`
- `decision_granted`
- `decision_granted_with_limitations`
- `decision_rejected`
- `decision_invalid`
- `decision_missing`
- `evidence_missing`
- `evidence_stale`
- `handoff_ready`
- `handoff_blocked`
- `read_failure`

Projected fields:

- tenant/client/site/migration identity
- publish activation request id/ref/scope/action/subject/status/policy metadata
- publish activation decision id/ref/status/policy metadata/limitations
- launch readiness evidence id/ref/type/status/freshness/source watermark/readiness status
- improved candidate site version ref
- runtime artifact ref
- publish target ref
- readiness limitations
- decision limitations
- evidence freshness status
- request policy metadata
- source refs and audit refs
- blockers, missing, stale, warning, and conflicting-decision diagnostics
- validation summary
- advisory next action
- deterministic semantic watermark

Explicit flags:

- `derivedOnly: true`
- `mutatesSourceTruth: false`
- `createsAafRecords: false`
- `createsGateAttempt: false`
- `evaluatesGate: false`
- `publishes: false`
- `publishActivationApproved: boolean`
- `readyForGateEvaluation: boolean`
- `readyForPublishExecution: false`

## Handoff Package

The handoff includes identity, decision id/ref/status/watermark, request id/ref/status/watermark, launch readiness evidence package id/ref/watermark/readiness status, candidate/artifact/publish target refs, limitations, source refs, audit refs, watermarks, freshness summary, blocker summary, semantic handoff watermark, and a preview-only gate input shape.

The preview shape mirrors stable publish activation dry-run input fields where available, but it is marked preview-only and includes no gate result. MVP-43 does not import or call the gate adapter.

## Watermark Strategy

The read model watermark is deterministic over request refs/status/watermark, decision refs/status/watermark, evidence refs/watermark, payload source watermarks, candidate/artifact/publish target refs, limitations, freshness state, diagnostics, and flags.

The handoff watermark is deterministic over the read model watermark, request, decision, evidence, candidate/artifact/publish target refs, limitations, freshness, blockers, and preview shape.

Excluded as volatile:

- transaction timestamp
- actor display names
- display labels
- logs
- correlation/request plumbing not semantically meaningful to the handoff
- non-semantic ordering

## Fail-Closed Behavior

The read model and handoff block when request, decision, evidence, candidate ref, artifact ref, publish target ref, freshness, policy row, request evidence link, or decision evidence link is missing.

They also block on rejected, revoked, expired, superseded, cancelled, invalid, stale, conflicting, wrong-scope, wrong-action, wrong-evidence-type, blocked-readiness, stale-readiness, incomplete-readiness, or watermark-mismatch states.

The read model is not approval truth, the handoff is not a gate pass, and the handoff is not publish permission.

## Advisory Next Actions

Projected next actions:

- `request_publish_activation`
- `await_publish_activation_decision`
- `review_rejected_decision`
- `refresh_launch_readiness_evidence`
- `resolve_publish_activation_blockers`
- `prepare_gate_evaluation`
- `no_action`

These are advisory only and do not trigger work.

## Boundaries

AAF mutation boundary:

- No AAF records are created, updated, or deleted by MVP-43.
- The repository exposes no writer method and uses read-only transactions.

AAF gate boundary:

- No action gate attempt is created.
- No gate adapter, policy gate facade, or gate evaluation API is imported or called.
- The handoff is preview-only and not a gate pass.

PASR boundary:

- PASR rows may remain as existing external tables, but MVP-43 does not call PASR observers, readers, shadow result models, or create PASR observations.

DDOM/domain boundary:

- MVP-43 does not create DDOM snapshots, call manual DDOM triggers/callers, call live DNS, or mutate domain/DNS/provider state.

Billing/Stripe boundary:

- MVP-43 does not call Stripe or mutate billing, subscription, hosting, entitlement, cost-center, or customer state.

Publish/rollback/runtime boundary:

- MVP-43 does not call publish orchestrators, publish guards, publish enforcement, publish safety checks, active pointer switches, rollback switches, runtime artifact/site-version mutations, public runtime, or content override mutation.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts`
- `pnpm exec tsc --noEmit -p /private/tmp/gnr8-mvp43-tsconfig.json`

The disposable PostgreSQL integration test applies AAF core, granted-with-limitations vocabulary, and MVP-40 launch readiness evidence type migrations. It verifies handoff-ready reconstruction from MVP-41 request + MVP-42 decision + MVP-40 evidence, rejected decision blocking, wrong evidence type blocking, missing decision pending/blocking behavior, unchanged row counts after read/handoff, zero gate attempts, no PASR rows, no DDOM rows, and no runtime/publish/rollback/billing/domain rows.

Final hygiene and guardrails:

- `git diff --check`
- trailing whitespace check over changed files
- guardrail search for no AAF record creation
- guardrail search for no action gate attempt creation
- guardrail search for no PASR observer invocation
- guardrail search for no DDOM snapshot creation
- guardrail search for no provider/DNS/Vercel/Openprovider/Stripe/AI calls
- guardrail search for no publish/rollback/runtime active pointer mutation
- Docker cleanup check for `gnr8-mvp43-publish-activation-read` containers

## Issues Found And Fixed

- Missing candidate/artifact/publish-target refs initially produced diagnostics but needed to force blocked handoff status. The status projection now treats any required missing code as `handoff_blocked`.
- The handoff builder initially used a type/value dependency on the existing AAF dry-run adapter. It now duplicates the preview shape locally to avoid any gate adapter dependency in MVP-43.
- Focused no-emit initially needed an explicit test cast for fixture metadata and an expanded temporary include list for imported local dependencies.

## Residual Risks

- The handoff preview cannot be a complete future gate input because MVP-43 intentionally does not read active pointer or current domain readiness source truth outside the existing launch readiness evidence chain.
- The read model reconstructs the decision chain but intentionally does not evaluate gates or enforce publish activation; the next milestone must keep those responsibilities separate.

## Acceptance

MVP-43 is safe to accept after focused tests, disposable DB integration, no-emit validation, diff hygiene, and guardrail searches pass.

Recommended next milestone: implement a separate publish activation gate evaluation milestone that consumes this handoff, creates any gate attempt only in that explicitly scoped milestone, and still keeps publish execution, rollback, provider execution, billing/domain mutation, and UI/API exposure out of scope unless separately authorized.

No commit or push was performed.
