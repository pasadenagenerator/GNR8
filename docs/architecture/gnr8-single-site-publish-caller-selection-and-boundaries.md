# GNR8 Single-Site Publish Caller Selection And Boundaries

Phase: MVP-51
Scope: Documentation and architecture only.

This document selects the safest future caller path for strict single-site publish activation context. It does not implement caller wiring, routes, services, SQL, UI, publish behavior changes, blocking enforcement, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

## Options Evaluated

| Option | Description | Benefits | Risks | Decision |
| --- | --- | --- | --- | --- |
| New server-only single-site publish wrapper/orchestrator | Add a narrow internal caller that starts from single-site migration context, validates source truth, resolves MVP-48 metadata, and calls `publishApprovedSiteVersion(...)`. | Keeps generic runtime route unchanged; provides strict tenant/client/site/migration identity; localizes preflight; supports shadow-first rollout. | Requires a new wrapper milestone and tests before operator use. | Recommended. |
| Extend existing internal operator/server-only publish path | Reuse a current route or service if it already has migration context. | Smaller new surface if a suitable path exists. | Current direct publish route is generic; imported reconciliation is maintenance-oriented and lacks single-site AAF chain. | Not selected now. |
| Add resolver call before generic publish route | Teach generic runtime publish API route to resolve metadata from `siteVersionId`. | Makes existing route appear convenient. | Would encourage tenant/client/migration guessing; could affect broad callers; route currently also performs domain activation after publish. | Rejected for MVP-51 future path. |
| Defer generic route integration entirely | Leave generic route unchanged while wrapper handles eligible single-site publishes. | Safest boundary; avoids broad runtime behavior changes. | Requires operators to use the future wrapper for eligible single-site flow. | Selected with wrapper recommendation. |

## Selected Future Caller

Create a new server-only single-site publish wrapper/orchestrator in the next implementation milestone.

The wrapper should be the only eligible single-site MVP publish caller until a later reviewed milestone proves another caller has equivalent strict context. It should call `publishApprovedSiteVersion(...)` with complete MVP-48 metadata and resolver shadow input, but the first milestone must remain shadow-only and must not change active pointer behavior or response contracts.

## Why Generic Runtime Publish Should Stay Unchanged

The current generic runtime publish API route has:

- route `siteVersionId`;
- agency action scope resolved from site version;
- body actor and optional `stage`;
- result site id after publish;
- domain verification reconciliation and domain binding activation after publish.

It does not have:

- strict single-site migration id;
- exact tenant/client/site/migration spine record;
- launch readiness evidence ref;
- publish activation request/decision refs;
- persisted MVP-44 gate attempt/result ref;
- MVP-43 handoff watermark;
- MVP-44 gate input watermark;
- trusted publish target ref from PTT;
- explicit correlation/idempotency policy for the single-site publish activation chain.

Adding resolver fallback directly to the route would either fail unavailable for most calls or require unsafe inference. It would also risk coupling a broad runtime route and its post-publish domain behavior to single-site activation policy too early.

## Why Imported Runtime Reconciliation Should Stay Unchanged

The imported runtime reconciliation path is a maintenance/reconciliation path. It plans ownership links, lifecycle transitions, imported runtime publish, host binding transfer, and public serving verification for imported runtime artifacts.

It has useful runtime and ownership context, but it is not source truth for the single-site MVP publish activation chain. It does not carry MVP-40 launch readiness evidence, MVP-41 request, MVP-42 decision, MVP-43 handoff, MVP-44 gate attempt, or PTT target identity as publish activation approval context.

It must remain a reconciliation/internal maintenance caller unless a later architecture milestone explicitly redesigns it.

## Caller Classification Rules

Eligible single-site MVP publish caller:

- starts from one single-site migration;
- can prove tenant/client/site/migration from source-owned state;
- can validate candidate/artifact/target identity;
- can consume existing AAF request/decision/gate rows;
- can pass complete MVP-48 metadata;
- is server-only and internal during rollout.

Generic runtime publish caller:

- starts from runtime version identity;
- publishes/activates runtime through existing behavior;
- lacks single-site migration and AAF chain context;
- must remain metadata-optional and unchanged until separately reviewed.

Legacy/migration factory/batch caller:

- starts from batch/import/reconciliation context;
- may publish runtime artifacts as part of maintenance or migration factory behavior;
- must not be treated as single-site publish activation approval truth without explicit mapping.

Reconciliation/internal maintenance caller:

- repairs or reconciles runtime/import/host binding state;
- may have ownership and target host context;
- is not allowed to infer AAF approval/gate state.

Test-only caller:

- uses fixtures/doubles to verify shadow helper, resolver, guard, or reconciliation behavior;
- may construct synthetic complete metadata for tests only.

Unsafe/unknown caller:

- cannot prove identity/source refs/watermarks;
- must not pass fabricated or inferred metadata.

## Future Wrapper Boundary

Allowed future wrapper responsibilities:

- read single-site state spine/read model;
- read runtime candidate/artifact/pointer state;
- read PTT publish target state;
- call MVP-49 read-only resolver;
- normalize/validate MVP-48 metadata;
- call MVP-46 guard in shadow mode or consume MVP-50 shadow diagnostics;
- call `publishApprovedSiteVersion(...)` only after wrapper preflight passes;
- record future single-site state transitions only in a later explicitly scoped state-writer milestone;
- return wrapper-local structured preflight failures for wrapper calls only.

Forbidden wrapper responsibilities:

- modify `publishApprovedSiteVersion(...)` behavior in the documentation phase;
- call MVP-44 gate evaluator;
- create approval requests, approval decisions, evidence packages, policy evaluations, audit events, or gate attempts;
- create AAF records;
- call PASR;
- create DDOM snapshots or call live DNS;
- call Vercel, Openprovider, registrars, DNS providers, SSL providers, Stripe, AI providers, production Supabase, or staging Supabase;
- mutate billing, Stripe, entitlement, domain, DNS, provider, publish target, runtime artifact, site version, active pointer, content override, rollback, or public runtime outside the existing publish call;
- add UI/API/routes/actions/workers during MVP-51;
- add Command Center or Ops Inbox buttons;
- expose anything to the client portal.

## Shadow-First Behavior

The first implementation milestone should:

- be default-off;
- be internal-only;
- validate context strictly;
- pass complete metadata to existing shadow plumbing;
- leave `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` as the existing shadow observation switch;
- preserve generic publish behavior with the flag off and on;
- never block active pointer mutation from resolver/guard output;
- never change the publish response contract;
- log safe diagnostics only.

Structured preflight failures for wrapper calls are acceptable only because wrapper calls are new and explicitly eligible. They must not affect current generic callers.

## Later Enforcement Boundary

Blocking enforcement requires a later milestone. That milestone must separately design:

- enforcement flag defaults;
- operator acceptance;
- audited bypass;
- response behavior for blocked publishes;
- state transition writes;
- Command Center/Ops Inbox surfacing;
- test fixtures for active pointer non-mutation;
- incident and rollback relationship.

MVP-51 does not authorize blocking enforcement.

## Command Center And Ops Inbox Boundary

Command Center and Ops Inbox may later surface wrapper diagnostics as derived, role-redacted operator views. They must not become source truth and must not approve, block, repair, or publish by display state alone.

Any future action button must route to a source-owned server workflow with explicit authorization, evidence, audit, idempotency, and freshness checks. MVP-51 adds no action buttons and no UI.

## Client Portal Boundary

No MVP-51 design is client-facing. Client portal visibility for publish activation context, shadow diagnostics, enforcement blockers, or bypasses is out of scope until a separate client-facing authorization/redaction milestone.
