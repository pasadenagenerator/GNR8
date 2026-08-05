# GNR8 Single-Site Publish Activation Enforcement Architecture

Phase: MVP-45
Scope: Documentation and architecture only.

This document defines how a future milestone may safely consume the MVP-44 publish activation gate evaluation result inside single-site publish activation. It does not implement enforcement, route wiring, publish execution, runtime mutation, rollback, provider calls, billing/domain execution, UI/API changes, Command Center actions, Ops Inbox actions, or client portal exposure.

## Enforcement Objective

Single-site publish activation enforcement means:

- before an active runtime pointer switch, the system must verify that the exact candidate has a valid persisted publish activation gate result;
- if the gate fails, publish activation must not proceed to active pointer mutation;
- enforcement applies only to the candidate site version, runtime artifact, publish target, tenant/client/site/migration, and stage represented in the MVP-43 handoff and MVP-44 gate result;
- enforcement is not approval creation;
- enforcement is not evidence creation;
- enforcement is not readiness collection;
- enforcement is not domain, billing, Stripe, DNS, provider, PASR, DDOM, or rollback execution.

The enforcement decision is a pre-publish consumption check over an existing MVP-44 result. It is not a request-time rebuild of readiness truth.

## Selected Future Integration Point

The safest future insertion point is inside `publishApprovedSiteVersion(...)` in `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, after current candidate/artifact validation and pointer-readiness evaluation, and before any call to `switchActivePointer(...)`.

Current approved-version path:

1. Load the site version.
2. Evaluate existing publish enforcement for the requested stage.
3. Build and validate the deterministic artifact bundle.
4. Create/bind/refresh the runtime artifact candidate.
5. Read the stored artifact and active pointer.
6. Validate candidate identity through `evaluatePublishActivationCandidate(...)`.
7. Evaluate pointer readiness through `evaluatePointerSwitchReadiness(...)`.
8. Run the existing non-blocking PASR shadow observation.
9. Call `switchActivePointer(...)`.
10. Run post-switch safety, lifecycle transition, and archive behavior.

Future MVP-48 blocking enforcement should run between steps 7 and 9. MVP-47 shadow integration may run in the same location but must not block.

Current already-published reconciliation path:

- When the target version is already `PUBLISHED`, the orchestrator may validate and refresh an existing artifact before checking whether the active pointer already matches.
- If pointer readiness returns `PUBLISH_ALREADY_ACTIVE_SAFE_NOOP`, there is no active pointer mutation to protect. Future enforcement may still log a safe-noop consumption diagnostic, but should not block a no-op unless a later policy explicitly defines safe-noop reconciliation as an enforceable action.
- If the pointer does not already match, future blocking enforcement must run before `switchActivePointer(...)`.

This point is intentionally before public runtime authority changes. The public runtime resolves from active pointer/domain/artifact state, so pointer mutation is the publish activation boundary that must be gated.

## Data Available At The Integration Point

At the selected point the orchestrator has:

- `siteVersion.id`, `siteVersion.siteId`, lifecycle state, renderer compatibility, and ownership-resolvable scope;
- candidate runtime artifact id and the loaded artifact row;
- artifact bundle hash, manifest identity, publish stage, and governance metadata;
- requested or resolved publish stage;
- active pointer before mutation;
- actor and route/operator correlation context if supplied by future wiring;
- existing candidate validation result proving version/artifact/site/stage lineage;
- existing pointer-readiness result proving whether a mutation is required.

Future enforcement must add, through a dedicated guard input, the MVP-43/MVP-44 identity refs that are not currently present in the generic publish orchestrator input:

- tenant id;
- client id;
- migration id;
- publish target id/ref;
- publish activation decision ref;
- MVP-44 gate attempt/result ref;
- handoff and gate input watermarks.

## Identity Matching

The future guard must match all identity dimensions before allowing publish continuation:

- tenant id, client id, site id, and migration id;
- candidate site version id/ref equals the version about to be activated;
- runtime artifact id/ref equals the artifact about to be activated;
- publish target id/ref equals the target/stage being activated;
- publish stage/environment equals the gate input stage/environment;
- publish activation request and decision refs equal the MVP-43/MVP-44 chain;
- handoff watermark equals the MVP-43 handoff watermark consumed by MVP-44;
- gate input watermark equals the MVP-44 deterministic gate input watermark.

Any mismatch is a blocker, not a warning.

## Why Before Active Pointer Mutation

The active pointer is MVP runtime serving truth. Once `switchActivePointer(...)` succeeds, public runtime resolution can serve the new version/artifact. Enforcement after that point would only detect an unauthorized publish after exposure and would require incident/rollback handling instead of prevention.

Pre-pointer enforcement also avoids partial public activation. If enforcement blocks, the future route/orchestrator must return a structured blocked response before pointer mutation and before any domain activation tied to the publish result.

## Why Not Inside Generic Runtime Primitives

The guard must not be embedded inside `switchActivePointer(...)`, `runtime-store.ts`, public runtime resolution, rollback primitives, content publish/rollback routes, or generic artifact/version helpers.

Reasons:

- those primitives are shared by publish, rollback, migration seeding, tests, public runtime reads, content workflows, and repair paths;
- they do not carry the single-site MVP-43 handoff identity or MVP-44 gate result refs;
- they cannot distinguish publish activation approval from rollback approval, content approval, domain readiness, or emergency recovery;
- putting AAF consumption in runtime primitives would risk blocking unrelated runtime maintenance or creating circular imports from runtime into approval/readiness layers.

The future guard should be a narrow single-site publish activation guard called by the publish orchestrator, not a generic runtime-store invariant.

## Request-Time Readiness Creation Is Forbidden

Future enforcement must not create or refresh readiness during a publish request. Specifically it must not:

- create launch readiness records, dimensions, refs, blockers, events, or closeouts;
- build new launch readiness evidence packages;
- create AAF approval requests or approval decisions;
- create new gate attempts unless a separate reevaluation milestone explicitly permits it;
- create DDOM snapshots;
- invoke PASR source readers/observers for enforcement;
- call live DNS, Vercel, Openprovider, registrars, SSL providers, Stripe, billing, hosting, AI providers, production Supabase, or staging Supabase.

The publish request consumes already-persisted source truth. Missing or stale truth blocks.

## Feature Flag Strategy

Future implementation must be default-off and staged:

| Stage | Behavior | Suggested flags |
| --- | --- | --- |
| Disabled | Preserve current behavior; do not read or block on MVP-44 results. | `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT=off` |
| Shadow/log-only | Read/validate candidate gate result and log diagnostics, but never block. | `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW=on` |
| Internal migrations only | Block only for explicitly marked internal single-site migrations. | `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT=internal` |
| Eligible single-site publishes | Block all eligible single-site publish activations. | `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_ENFORCEMENT=on` |
| Emergency bypass | Permit privileged, audited bypass for incident response only. | `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_BYPASS=on` |

Bypass must require explicit actor authorization, reason, correlation id, idempotency key, internal audit event, and operator-safe response. It must not create approval decisions or pretend the gate passed.

## Source Reread Policy

Recommended MVP policy:

- consume the persisted MVP-44 gate result;
- verify identity, handoff watermark, gate input watermark, freshness, and conflict status;
- optionally read latest AAF request/decision/revocation/supersession/freshness/gate rows in a read-only transaction;
- optionally read the current publish target row to ensure it has not been disabled or retired;
- do not recreate readiness evidence;
- do not create DDOM snapshots;
- do not call providers;
- defer live billing/domain/PASR reads to separately designed milestones.

## Response Behavior

When enforcement passes, the future publish route/orchestrator must preserve the existing success response shape as much as possible.

When enforcement blocks, it must:

- return `ok: false`;
- return a stable operator-safe blocker code such as `PUBLISH_ACTIVATION_GATE_BLOCKED`;
- include safe blocker codes, stale/missing/wrong-identity categories, and remediation hints;
- omit raw sensitive AAF source refs from broad callers;
- log diagnostic refs internally with correlation and idempotency metadata;
- avoid domain activation, public runtime exposure, and post-publish lifecycle transitions.

## Audit And Observability

Future audit/log behavior should include:

- successful enforcement consumption event;
- blocked enforcement event;
- shadow-only diagnostic event;
- bypass event when policy allows bypass;
- correlation/idempotency linkage to publish request, MVP-43 handoff, MVP-44 gate attempt, decision, and candidate refs.

It must not create approval requests, approval decisions, or gate attempts unless a separate reevaluation milestone explicitly allows that write path.

## Rollback Relationship

Enforcement failure happens before publish activation, so rollback should not be needed for enforcement blocks. If publish fails after enforcement passes, existing publish failure and rollback strategy applies. Rollback readiness evidence is prerequisite evidence, not automatic rollback execution, and a gate pass does not guarantee rollback success.

## Domain, DDOM, Billing, Stripe, And PASR Boundaries

Domain/DDOM:

- DDOM readiness remains prerequisite evidence captured before gate evaluation.
- Future enforcement must not create snapshots, call DDOM triggers, or call live DNS/providers.

Billing/Stripe:

- Billing and Stripe truth remains external or source-owned readiness evidence.
- Future enforcement must not create subscriptions, activate hosting, call Stripe, mutate entitlements, or fill current site-scoped billing gaps.

PASR:

- PASR remains shadow/diagnostic unless a later milestone changes the design.
- Future enforcement must not treat PASR shadow readiness as a gate pass.

Publish/runtime:

- Future enforcement protects active pointer mutation.
- It does not authorize artifact generation, rollback execution, content publishing, domain activation, or generic runtime-store writes.

## Future Test Plan

MVP-46 through MVP-48 should cover:

- enforcement disabled preserves current behavior;
- shadow mode logs/returns diagnostics without blocking;
- enforcement pass allows existing active pointer switch;
- enforcement block prevents active pointer switch;
- stale, missing, or wrong-candidate gate result blocks;
- wrong artifact, publish target, stage, tenant/client/site/migration blocks;
- approval revoked, superseded, or expired after gate evaluation blocks when rechecked;
- publish target disabled or retired after gate evaluation blocks when rechecked;
- no DDOM, PASR, provider, billing, Stripe, DNS, Vercel, Openprovider, or AI calls;
- no AAF request/decision creation;
- idempotency/replay behavior;
- no generic runtime path regression;
- no rollback invocation on pre-publish block.

## Recommended Milestones

1. MVP-46: read-only enforcement guard core that consumes MVP-44 gate result, with no route wiring.
2. MVP-47: publish orchestrator shadow integration, with no blocking.
3. MVP-48: publish orchestrator blocking enforcement behind feature flag.
4. MVP-49: publish rehearsal with disposable/runtime fixture.
5. Later: operator UI surfacing and 20-site validation.

MVP-46 may begin after MVP-45 is accepted, but only as a read-only guard core. Route wiring and blocking behavior must wait for the later staged milestones.
