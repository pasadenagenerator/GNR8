# GNR8 MVP-55 Single-Site Shadow-Publish Operator Action Closeout

Scope: Documentation-only architecture and safety contract for a future internal operator-only single-site shadow-publish action.

MVP-55 created architecture and workflow documentation only. It did not implement shadow-publish, modify the MVP-54 route, add routes, add server actions, add UI buttons, wire MVP-52 execute mode to a route, implement blocking enforcement, modify generic publish, modify the publish orchestrator, modify runtime behavior, publish, rollback, call providers, mutate billing/domain state, expose clients, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/route.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `docs/architecture/gnr8-single-site-publish-operator-caller-surface-architecture.md`
- `docs/architecture/gnr8-single-site-publish-operator-caller-contract.md`
- `docs/architecture/gnr8-single-site-publish-operator-access-control.md`
- `docs/product/gnr8-single-site-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-runtime-contract.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-fail-closed-policy.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-shadow-publish-operator-action-architecture.md`
- `docs/architecture/gnr8-single-site-shadow-publish-execution-contract.md`
- `docs/architecture/gnr8-single-site-shadow-publish-access-audit-redaction.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-action-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Shadow-Publish Definition

Shadow-publish means invoking the MVP-52 wrapper execute path with complete MVP-48 metadata handoff so the wrapper calls existing `publishApprovedSiteVersion(...)`. Publish may actually happen through the existing orchestrator. Active pointer mutation may occur because the existing orchestrator is called. MVP-47/MVP-50 guard diagnostics remain non-blocking, and blocking enforcement is not applied.

## Dry-Run Vs Shadow-Publish

MVP-54 dry-run validates context only and cannot mutate runtime. Future shadow-publish can call the existing publish orchestrator and may mutate active pointer/runtime state through that existing path. Dry-run can be safe with minimal audit; shadow-publish requires a separate flag, explicit confirmation, idempotency, correlation, stronger logging/audit, response redaction, and rehearsal tests.

## Feature Flag

Future flag: `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`.

Default: off.

Enabled values: `1`, `true`, `enabled`, `on`, `shadow_publish`.

The request must also include `mode: "shadow_publish"`, explicit confirmation, idempotency key, and correlation id.

## Authorization

MVP shadow-publish is platform superadmin only, internal admin namespace only, and denied to agency roles, client roles, support/debug unless explicitly superadmin, Ops Inbox actors, client portal actors, public callers, and generic runtime publish permission holders. Tenant/client/site/migration/candidate/artifact/target/evidence/request/decision/gate/watermark scope must match persisted resolver output before wrapper execution.

## Execution Contract

Future request input requires the same strict context as MVP-54 plus explicit shadow-publish mode, confirmation, expected refs/watermarks, actor derived server-side, correlation/idempotency, and optional warnings policy.

Future response includes wrapper status, publish orchestrator status, active pointer result if returned by existing orchestrator, shadow guard diagnostics, resolver status, safe refs only, limitations/warnings, and explicit flags: `shadowPublish: true`, `blockingEnforcementApplied: false`, `publishMayHaveExecuted: true`, `createsAafRecords: false`, `createsGateAttempt: false`, and `evaluatesGate: false`.

## Audit And Logging

MVP-56 must log or audit operator actor, authorization, mode, confirmation, idempotency/correlation, input refs/watermarks, resolver status, wrapper status, publish result, shadow guard pass/block/error/unavailable, active pointer before/after when available, and explicit `blockingEnforcementApplied: false`. Conservative first implementation may use structured logs only if no scoped operator-action audit write path exists.

## Failure Behavior

The future action fails before wrapper execution when flag off, unauthorized, mode/confirmation missing, idempotency/correlation missing, context incomplete, scope mismatched, resolver incomplete, or limitation policy missing. Existing publish orchestrator errors surface as shadow-publish failure. The action must not auto-rollback, retry by creating readiness/AAF/gate records, evaluate gates, call PASR, create DDOM snapshots, or call providers/billing/domain systems.

## Redaction

Responses/logs must avoid raw sensitive AAF/source/audit refs outside superadmin internal context, provider secrets, Stripe/payment data, client-facing raw diagnostics, raw SQL errors, raw stack traces, and credential material. Use safe ids, blocker/warning codes, redaction summaries, correlation/idempotency linkage, and high-level publish result categories.

## MVP-56 Test Plan

Required tests:

- flag off denies before wrapper;
- unauthorized denied;
- missing confirmation denied;
- dry-run route remains dry-run only;
- shadow-publish route calls wrapper execute only when all checks pass;
- incomplete resolver blocks before wrapper;
- wrapper publish failure returns safe failure;
- generic publish route unchanged;
- client portal unchanged;
- Ops Inbox unchanged;
- no AAF records created by action;
- no gate evaluator invoked;
- no PASR/DDOM/provider/billing/domain/DNS/Stripe/Vercel/Openprovider/registrar/SSL/AI/Supabase calls;
- active pointer mutation only through existing orchestrator fake/fixture;
- response redaction.

## Recommended MVP-56 Scope

Implement an internal admin API route first, no UI button, no server action unless later justified, no generic route changes, no blocking enforcement, and no provider/domain/billing execution. Use a fake publish orchestrator in tests. Add minimal Command Center display later after rehearsal.

## Boundary Confirmations

Command Center boundary: no Command Center implementation changed; later display is optional and must reread source truth server-side.

Ops Inbox boundary: Ops Inbox remains derived-only and no-action.

Client portal boundary: no client portal exposure or client action is allowed.

Generic publish route boundary: generic runtime publish remains separate and unchanged.

Publish/runtime boundary: no direct runtime mutation is designed; mutation may occur only through existing `publishApprovedSiteVersion(...)` when the wrapper execute path is intentionally invoked in MVP-56.

Domain/DNS/provider boundary: no provider, live DNS, DDOM, PASR, Vercel, Openprovider, registrar, SSL, AI, production Supabase, or staging Supabase call is designed.

Billing/Stripe boundary: no billing or Stripe read/write authority is added.

## Risks Found

- Shadow-publish can move the active pointer through existing publish behavior, so it must not share the MVP-54 dry-run route.
- Existing generic publish route performs domain reconciliation/activation after publish, so it must not be extended for this single-site action.
- Guard diagnostics can say block/error but remain non-blocking, which must be visible in response/audit wording.
- Durable audit persistence is not yet selected; structured logs may be the safest first implementation.
- Command Center and Ops Inbox projections can be mistaken for source truth unless the route rereads persisted refs.

## Implementation May Begin

Implementation may begin for MVP-56 as an internal admin API route only after MVP-55 is accepted. Implementation may not begin for UI buttons, Ops Inbox actions, client portal exposure, generic publish route changes, blocking enforcement, provider/domain/billing execution, rollback automation, or AAF/gate write paths from this closeout.

## Recommended Next Milestone

MVP-56: implement the separately flagged internal admin API shadow-publish action with strict superadmin auth, explicit confirmation, resolver completeness, redacted response, structured logs, fake-orchestrator tests, and no UI button.

## Validation

MVP-55 validation is documentation/static only:

- all new docs exist and are readable;
- canonical index references all MVP-55 docs;
- required sections and boundary statements are present;
- `git diff --check`;
- trailing whitespace check over new/updated Markdown files;
- changed-file scope check confirms only allowed Markdown/index files changed;
- no TypeScript, JavaScript, SQL, route, worker, provider, runtime, billing, domain, publish, rollback, Command Center, Ops Inbox, client portal, or public runtime files changed.

No runtime behavior changed. No provider calls were made. No commit or push was performed.
