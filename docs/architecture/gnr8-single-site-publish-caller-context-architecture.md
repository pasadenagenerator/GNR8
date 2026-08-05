# GNR8 Single-Site Publish Caller Context Architecture

Phase: MVP-51
Scope: Documentation and architecture only.

MVP-51 defines the future caller/context path for eligible single-site MVP publish activation. It does not implement caller wiring, routes, services, SQL, UI, publish behavior changes, blocking enforcement, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

This architecture supplies strict single-site publish activation context to the existing `publishApprovedSiteVersion(...)` flow by designing a server-only wrapper/orchestrator that can gather, validate, and pass complete MVP-48 metadata into the MVP-50 shadow resolver path. The first implementation milestone after this document must remain shadow-only.

## Problem Statement

MVP-48 added optional metadata handoff plumbing. MVP-49 added a read-only resolver that can reconstruct complete metadata from persisted source truth. MVP-50 integrated resolver fallback in the existing publish shadow path, but only when strict identity is already present. Ordinary direct publish callers still pass only generic runtime publish inputs, so the resolver cannot safely determine tenant/client/migration identity or the exact AAF chain.

The gap is not in the resolver. The gap is caller context. A safe future caller must know the eligible single-site migration, candidate, artifact, target, launch readiness evidence, publish activation request, decision, gate, handoff watermark, actor, correlation id, and idempotency key before calling `publishApprovedSiteVersion(...)`.

## Reviewed Source Context

The architecture is based on these reviewed areas:

- MVP-50 resolver shadow integration closeout and `publishApprovedSiteVersion(...)` shadow integration.
- MVP-49 metadata resolver closeout and resolver input contract.
- MVP-48 metadata handoff closeout and normalizer contract.
- MVP-47 shadow integration closeout and pre-pointer shadow observation point.
- MVP-46 read-only enforcement guard closeout and guard input/pass/block rules.
- MVP-45 enforcement architecture docs and future pre-pointer insertion point.
- MVP-44 gate evaluator closeout and persisted gate attempt/result behavior.
- MVP-43 decision read model and gate handoff closeout.
- MVP-42 publish activation human decision closeout.
- MVP-41 publish activation request bridge closeout.
- MVP-40 launch readiness evidence builder closeout.
- MVP-37, MVP-38, and MVP-39 launch readiness persistence/source reader/writer closeouts.
- Current `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.
- Current direct callers in `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` and `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts`.
- Runtime publish API route domain activation behavior after publish.
- Imported runtime reconciliation path.
- Runtime site version, artifact, active pointer, lifecycle, and runtime-store paths.
- Single-site state spine and read-model paths.
- Command Center and Ops Inbox docs as future derived operator surfaces only.

## Selected Architecture

Recommended future path: create a new server-only single-site publish wrapper/orchestrator in the next implementation milestone.

The wrapper should:

- accept an explicit single-site migration or workflow command identity, not only a `siteVersionId`;
- read the single-site state spine/read model for tenant, client, site, migration, and candidate refs;
- verify the runtime candidate site version and artifact against runtime-store records;
- verify the publish target through PTT source truth;
- call MVP-49 `readAndResolveSingleSitePublishActivationMetadataHandoff(...)` with strict identity;
- require complete resolver output before treating the single-site context as usable;
- pass the complete MVP-48 `publishActivationMetadataHandoff` and resolver shadow identity into `publishApprovedSiteVersion(...)`;
- run in shadow-only mode first by supplying metadata to the existing MVP-50 shadow path without blocking publish or changing response contracts;
- leave generic runtime publish callers unchanged.

This path keeps eligibility, context reconstruction, and single-site source-truth validation outside the generic runtime route. It avoids teaching generic publish infrastructure to guess migration identity.

## Current Publish Caller Inventory

| Caller | Classification | Current identity | Tenant/client/site/migration | Candidate/artifact refs | Target/stage/environment | AAF request/decision/gate/handoff refs | Can safely supply MVP-48 metadata now? | Must remain unchanged in MVP-51? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` | Generic runtime publish caller | `siteVersionId`, agency scope resolved from site version, actor, optional stage | Has site indirectly after publish result; agency/client may be ownership-derived for access; no migration id | Candidate is route `siteVersionId`; artifact is created/read inside orchestrator, not supplied by route | Optional body stage; environment and PTT target are not strict source truth | None | No | Yes |
| `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts` default dependency wrappers | Reconciliation/internal maintenance dependency path | Imported site version, ownership site, target host, actor, reconciliation plan | Has ownership/runtime site context; not the single-site MVP migration spine and not AAF publish activation context | Imported site version and raw/runtime artifacts from reconciliation plan | Hard-codes production stage; target host transfer context, not PTT publish activation target | None | No | Yes |
| `apps/platform/gnr8/runtime/imported-runtime-reconciliation.ts` apply call | Reconciliation/internal maintenance caller | `plan.importedSiteVersionId`, `actor`, stage `production` | Has reconciliation ownership/runtime context; no strict single-site migration id | Imported site version; artifact produced by publish orchestrator | Production stage only; no strict publish environment/target ref | None | No | Yes |
| `apps/platform/app/api/gnr8/admin/_tests/reconcile-imported-runtime-route.test.ts` | Test-only caller/double | Test fixture input | Test-specific | Test-specific | Test-specific | Test-specific or absent | Only as a test double | Yes |
| `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts` and `publish-activation-resolver-shadow-observation.test.ts` | Test-only direct helper coverage | Synthetic publish intent and synthetic metadata/resolver inputs | Synthetic | Synthetic | Synthetic | Synthetic | Yes, for tests only | Yes |
| `apps/platform/gnr8/runtime/index.ts` export | Relevant indirect surface | Re-exports orchestrator | None by itself | None by itself | None by itself | None by itself | No | Yes |

No current production caller is an eligible single-site MVP publish caller. The future wrapper is the first safe eligible caller.

## Eligible Single-Site Caller Criteria

A caller is eligible only when it can prove all of the following before calling `publishApprovedSiteVersion(...)`:

- exactly one single-site migration spine record;
- tenant id, client id, site id, and migration id from source-owned state;
- candidate site version ref and runtime artifact ref matching runtime-store records;
- publish target ref and publish stage/environment matching active PTT source truth;
- launch readiness evidence ref from MVP-40;
- publish activation request and decision refs from MVP-41/MVP-42;
- MVP-44 persisted gate attempt/result ref;
- MVP-43 handoff watermark and MVP-44 gate input watermark;
- actor, actor role/type, correlation id, and idempotency key from the source command;
- freshness policy for resolver/guard reads;
- no need to infer missing identity from labels, UI state, generic runtime rows, PASR, DDOM, or provider status.

## Context Source-Of-Truth Map

| Context field | Future source of truth | Notes |
| --- | --- | --- |
| Tenant id | Single-site state spine/read model; ownership/RBAC only as reviewed scope check | Do not guess from runtime rows without reviewed ownership source. |
| Client id | Single-site state spine/read model; ownership site summary as a scoped cross-check | Required for resolver identity. |
| Site id | Single-site state spine/read model plus runtime site version `siteId` match | Runtime active pointer remains serving truth, not migration truth. |
| Migration id | `gnr8_single_site_migrations` through the state spine/read model | Never derive from labels, hostnames, or site version names. |
| Candidate site version ref | Single-site state candidate refs and runtime `gnr8_runtime_site_versions` | Must match route/command candidate and orchestrator candidate. |
| Runtime artifact ref | Runtime artifact binding/read model or existing artifact row | If artifact is created by publish, wrapper must validate expected candidate/artifact policy before and after resolver input design in a later implementation. |
| Publish target ref | PTT `gnr8_publish_targets` row and source watermark | Current proven MVP target is `production`. |
| Publish stage/environment | PTT row plus trusted server command context | Do not derive from UI labels. |
| Launch readiness evidence ref | MVP-40 AAF evidence package and launch readiness record refs | Readiness evidence is prerequisite evidence, not approval. |
| Publish activation request ref | MVP-41 AAF approval request | Scope must be `publish_activation` and action `publish.activation`. |
| Publish activation decision ref | MVP-42 AAF approval decision | Must be granted or granted with limitations under policy. |
| Gate attempt/result ref | MVP-44 AAF action gate attempt/result | Must already exist; wrapper must not call the evaluator. |
| MVP-43 handoff watermark | MVP-43 handoff package or MVP-49 resolver reconstruction | Must match persisted chain. |
| MVP-44 gate input watermark | MVP-44 persisted gate causation marker or resolver output | Dedicated source column does not exist yet; resolver currently recovers from causation id. |
| Limitations | MVP-40/MVP-42/MVP-43/MVP-49 carried limitations | Require explicit policy acceptance. |
| Actor | Trusted server action/operator command context | Include actor id, actor type, and actor role. |
| Correlation id | Source command/workflow request context | Must be explicit and stable for diagnostics. |
| Idempotency key | Source command/workflow request context | Must be explicit and stable for replay protection. |
| Source of context | Wrapper context package metadata | Must identify the server-only wrapper and read snapshot/watermark. |
| Freshness expectations | Wrapper policy plus MVP-49/MVP-46 max gate age and PTT reread policy | Missing/stale truth fails preflight in the future wrapper. |

## Forbidden Derivations

Future caller wiring must explicitly forbid:

- deriving migration id from site labels, domains, hostnames, route text, page titles, or operator notes;
- deriving publish activation approval from launch readiness status;
- deriving gate result from PASR shadow diagnostics;
- deriving publish target from UI labels, button text, route names, or request body strings alone;
- deriving billing/domain readiness from Command Center or Ops Inbox status;
- guessing tenant/client from generic runtime rows without a reviewed ownership source;
- treating DDOM readiness, PASR readiness, PTT target presence, billing status, AI output, or provider output as publish approval;
- creating missing AAF, DDOM, PTT, runtime, billing, or provider records during publish context resolution.

## Future Wrapper Flow

1. Receive an internal, server-only single-site publish command with migration id, candidate site version id, intended target id, actor, correlation id, and idempotency key.
2. Read the single-site state spine/read model and verify the command maps to exactly one active non-terminal migration.
3. Read runtime site version/artifact state and verify candidate identity, artifact binding expectations, renderer compatibility, and active pointer pre-state.
4. Read PTT target source truth and verify stage/environment/allowed artifact stage.
5. Read or call MVP-49 resolver with strict identity, expected request/decision/gate/target/watermark refs, and freshness policy.
6. Fail structured wrapper preflight when metadata is missing, stale, mismatched, or incomplete. This failure must not affect generic runtime publish callers.
7. When complete, call `publishApprovedSiteVersion(...)` with the same public arguments plus complete MVP-48 handoff and resolver shadow input.
8. In the first implementation milestone, keep the existing publish behavior, response contract, and active pointer behavior unchanged. Diagnostics remain shadow-only.
9. Only a later explicitly scoped enforcement milestone may convert guard block diagnostics into blocking behavior.

## State And Transition Expectations

Future wrapper state integration should be designed but not implemented here:

- `publish_requested`: recorded when an operator/server command requests eligible single-site publish.
- `publish_shadow_evaluated`: recorded after resolver/guard shadow diagnostics are available.
- `publish_blocked`: future enforcement-only state when strict checks would prevent publish.
- `publish_started`: recorded immediately before existing publish execution begins.
- `publish_completed`: recorded after existing publish returns and post-publish verification succeeds.
- `publish_failed`: recorded when wrapper preflight or existing publish execution fails.
- `rollback_readiness_retained`: rollback target refs and readiness evidence stay linked after publish.
- `publish_closeout_recorded`: final verification and operator closeout refs are stored after publish verification.

These transitions belong to future single-site state writer/service milestones. MVP-51 does not add transitions.

## Feature Flags And Rollout

Expected future flags:

| Flag | Default | Future meaning |
| --- | --- | --- |
| `GNR8_SINGLE_SITE_PUBLISH_WRAPPER_ENABLED` | `off` | Enables the server-only wrapper entry point for internal test calls. |
| `GNR8_SINGLE_SITE_PUBLISH_WRAPPER_SHADOW_ONLY` | `on` | Forces wrapper to pass metadata only to the shadow path and never block publish. |
| `GNR8_SINGLE_SITE_PUBLISH_CONTEXT_PREFLIGHT_REQUIRED` | `off` | Later internal-only preflight failure behavior for eligible wrapper calls. |
| `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` | `off` | Existing MVP-47/MVP-50 shadow guard/resolver observation flag. |
| `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT` | `off` | Later blocking enforcement, not part of wrapper shadow adoption. |
| `GNR8_SINGLE_SITE_PUBLISH_EMERGENCY_BYPASS` | `off` | Future audited bypass only after explicit design. |

Rollout order:

1. Shadow-only wrapper mode for internal fixture and one controlled migration.
2. Internal-only structured preflight failure for wrapper calls when metadata is incomplete.
3. Internal-only blocking enforcement after operator acceptance and audit design.
4. All eligible single-site publishes through the wrapper.
5. Emergency bypass only with explicit audited design.

Generic runtime publish callers remain unchanged until a separate reviewed integration decides otherwise.

## Safety Checks Before Future Wiring

The future wrapper must check:

- candidate site version identity, lifecycle state, site id, and source migration refs;
- runtime artifact identity, binding, renderer compatibility, artifact stage, and expected hash/watermark when available;
- active pointer pre-state before publish, including safe-noop handling;
- publish target status, environment, stage, allowed artifact stages, and source watermark;
- MVP-49 metadata completeness and expected ref matches;
- MVP-46 guard result in shadow mode and later enforcement mode;
- launch readiness evidence and publish activation request/decision refs;
- gate attempt/result freshness, handoff watermark, and gate input watermark;
- actor role/type/id, correlation id, idempotency key, request id, and source context package;
- absence of direct DDOM, PASR, provider, billing, domain, DNS, Stripe, AI, AAF writer, and gate evaluator calls.

## Boundary Confirmation

MVP-51 is documentation-only. It does not change TypeScript, JavaScript, SQL, API routes, UI routes, server actions, workers, runtime-store, publish orchestrator, publish guard/enforcement/safety code, rollback code, billing/Stripe code, domain/DNS/provider code, Command Center implementation, Ops Inbox implementation, or client portal implementation.

No future implementation may treat this document as authorization to modify active pointer behavior, publish response contracts, provider calls, billing/domain execution, AAF record creation, PASR calls, DDOM snapshots, Command Center actions, Ops Inbox actions, or client portal exposure.
