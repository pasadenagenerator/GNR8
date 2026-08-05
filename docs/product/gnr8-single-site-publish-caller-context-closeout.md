# GNR8 MVP-51 Single-Site Publish Caller Context Architecture Closeout

Scope: Documentation-only architecture for strict single-site publish caller context.

MVP-51 created the documentation path for a future server-only single-site publish wrapper that supplies strict tenant/client/site/migration/candidate/artifact/target/request/decision/gate/handoff metadata to `publishApprovedSiteVersion(...)`. It did not implement caller wiring, routes, services, SQL, UI, publish behavior changes, blocking enforcement, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, client portal exposure, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`
- `docs/architecture/runtime/GNR8 Site Versioning & Publish Lifecycle Spec (founder level).md`
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-enforcer.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-publish-caller-context-architecture.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-contract.md`
- `docs/architecture/gnr8-single-site-publish-caller-selection-and-boundaries.md`
- `docs/product/gnr8-single-site-publish-caller-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Publish Caller Inventory

| Caller | Classification | Summary |
| --- | --- | --- |
| `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` | Generic runtime publish caller | Has site version, agency scope, actor, optional stage, and post-publish domain activation. It lacks strict single-site migration and AAF chain context. |
| `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts` dependency wrappers | Reconciliation/internal maintenance dependency path | Wraps the publish orchestrator with optional DB client for reconciliation. It is not single-site publish activation truth. |
| `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts` apply call | Reconciliation/internal maintenance caller | Publishes an imported runtime site version during reconciliation and host transfer planning. It lacks MVP-40 through MVP-44 publish activation refs. |
| `apps/platform/app/api/gnr8/admin/_tests/reconcile-imported-runtime-route.test.ts` | Test-only caller/double | Supplies test behavior for reconciliation route coverage. |
| Runtime shadow helper tests | Test-only caller/helper coverage | Construct synthetic metadata/resolver inputs to test MVP-47 through MVP-50 behavior. |
| `apps/platform/gnr8/runtime/index.ts` export | Relevant indirect surface | Re-exports the orchestrator but is not a caller by itself. |

No current production caller qualifies as an eligible single-site MVP publish caller with complete strict context.

## Caller Classification Summary

- Eligible single-site MVP publish caller: none currently implemented.
- Generic runtime publish caller: runtime version publish API route.
- Legacy/migration factory/batch caller: none directly calling the function in the reviewed code; imported reconciliation is adjacent but classified as internal maintenance.
- Reconciliation/internal maintenance caller: imported runtime reconciliation.
- Test-only caller: reconciliation route test doubles and runtime shadow helper tests.
- Unsafe/unknown: any future caller that only has `siteVersionId`, UI labels, hostnames, or generic runtime rows without reviewed migration ownership context.

## Selected Future Caller Path

Recommended next implementation path: create a new server-only single-site publish wrapper/orchestrator.

The wrapper should read and validate strict context, call MVP-49 resolver, pass complete MVP-48 metadata to `publishApprovedSiteVersion(...)`, and remain shadow-only first. Generic runtime callers should remain unchanged until a later reviewed milestone.

## Context Contract

The future context must include tenant id, client id, site id, migration id, candidate site version ref, runtime artifact ref, publish target ref, publish stage/environment, launch readiness evidence ref, publish activation request ref, publish activation decision ref, MVP-44 gate attempt/result ref, MVP-43 handoff watermark, MVP-44 gate input watermark, limitations, actor, correlation id, idempotency key, source of context, and freshness expectations.

## Context Source-Of-Truth Mapping

- Single-site state spine/read model: tenant/client/site/migration identity and workflow stage.
- Runtime-store: candidate site version, runtime artifact, active pointer pre-state, existing publish behavior.
- Launch readiness records/evidence: MVP-37/MVP-39 readiness and MVP-40 AAF evidence refs.
- AAF request/decision/gate rows: MVP-41 request, MVP-42 decision, MVP-44 gate attempt/result.
- MVP-43 handoff: handoff watermark and decision/evidence/candidate/artifact/target chain.
- MVP-49 resolver: read-only reconstruction and completeness validation.
- PTT publish target: target id/ref, source watermark, stage, environment, allowed artifact stages, active/disabled/retired status.
- Operator/server command metadata: actor, role, correlation id, idempotency key, request id.

## Forbidden Derivations

MVP-51 explicitly forbids deriving migration id from site labels, deriving approval from readiness, deriving gate result from PASR, deriving target from UI labels, deriving billing/domain readiness from Command Center/Ops Inbox status, and guessing tenant/client from generic runtime rows without reviewed ownership source.

## Future State Behavior

Future state integration should model publish requested, publish shadow evaluated, future publish blocked, publish started, publish completed, publish failed, rollback readiness retained, and publish verification closeout. MVP-51 does not implement these transitions.

## Feature Flag Strategy

Future rollout should use wrapper default-off, shadow-only wrapper mode first, internal-only preflight later, internal-only blocking enforcement later, all eligible single-site publishes later, and emergency bypass only with an explicit audited design. Existing `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` remains the shadow guard/resolver flag.

## Safety Checks

Future wrapper must check candidate/artifact identity, active pointer pre-state, publish target active/allowed stage, MVP-49 metadata completeness, MVP-46 guard result, launch readiness and publish activation refs, idempotency/correlation, and absence of direct DDOM/PASR/provider/billing/domain/gate-evaluator calls.

## Test Plan For Next Implementation

Required tests for the next implementation milestone:

- wrapper resolves complete metadata;
- wrapper passes metadata to publish orchestrator shadow path;
- missing metadata fails as structured preflight but does not affect generic publish;
- generic callers unchanged;
- shadow flag off unchanged;
- shadow flag on logs diagnostics;
- no active pointer behavior change beyond existing publish;
- no publish response contract change;
- no gate reevaluation;
- no AAF record creation;
- no provider/domain/billing/DDOM/PASR calls.

## Risks Found

- Ordinary direct publish callers still lack strict tenant/client/migration identity.
- Generic route stage input is not PTT target truth.
- Imported runtime reconciliation has ownership/runtime context but not single-site AAF publish activation context.
- MVP-44 gate input watermark is recovered from gate attempt causation id rather than a dedicated column.
- Billing/hosting/domain readiness gaps remain source-owned prerequisites and must not be repaired during publish.
- Command Center and Ops Inbox are derived future surfaces only and cannot supply approval, target, billing, domain, or gate truth.

## Implementation May Begin Decision

Implementation may begin for a new server-only single-site publish wrapper only. It must be a separate milestone, default-off, internal-only, shadow-only first, and limited to context validation plus metadata handoff to the existing publish orchestrator shadow path.

Implementation may not begin for generic route integration, blocking enforcement, provider/domain/billing execution, AAF record creation, gate reevaluation, DDOM/PASR calls, Command Center actions, Ops Inbox actions, client portal exposure, or publish behavior changes from MVP-51 alone.

## Recommended Next Milestone

MVP-52: implement a default-off server-only single-site publish wrapper shadow integration. It should validate strict context, call MVP-49 read-only resolver, pass complete MVP-48 metadata to `publishApprovedSiteVersion(...)`, prove generic callers unchanged, and preserve publish behavior and response contracts.

No commit or push was performed.
