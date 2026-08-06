# GNR8 Single-Site Shadow-Publish Operator Action Architecture

Phase: MVP-55
Scope: Documentation and architecture only.

MVP-55 defines a future internal operator-only shadow-publish action for single-site MVP publish. It does not implement the action, route, server action, UI, wrapper execute wiring, blocking enforcement, publish behavior changes, runtime mutation, rollback behavior, provider calls, billing/domain execution, Command Center implementation, Ops Inbox actions, client portal exposure, commit, or push.

## Shadow-Publish Definition

Shadow-publish means a future separately flagged internal operator action may invoke the MVP-52 wrapper in execute mode with complete MVP-48 metadata handoff. The wrapper then calls only the existing `publishApprovedSiteVersion(...)`.

This is materially different from shadow diagnostics. Shadow-publish may actually publish through the existing orchestrator. Because the existing orchestrator owns artifact creation/binding/refresh, active pointer switching, lifecycle transition, archive behavior, and publish audit writes, shadow-publish may mutate runtime and may switch the active pointer through that existing path.

The MVP-47/MVP-50 publish activation enforcement guard remains diagnostic only. Its pass, block, unavailable, and error results are observed and logged only; they are not used to block the publish action. Blocking enforcement is not applied in MVP-55.

## Relationship To MVP-54 Dry-Run

MVP-54 dry-run validates strict operator context and invokes the wrapper only with `dryRun: true`. It does not call `publishApprovedSiteVersion(...)`, publish, mutate runtime, switch active pointers, create AAF records, evaluate gates, call PASR, create DDOM snapshots, call providers, mutate billing/domain state, add UI, expose clients, commit, or push.

MVP-55 shadow-publish is the next architecture step and must be separate from the MVP-54 dry-run route. It can call the wrapper execute path only after explicit flag, mode, confirmation, authorization, idempotency, correlation, and source-scope checks pass.

| Dimension | MVP-54 dry-run | Future shadow-publish |
| --- | --- | --- |
| Wrapper call | `dryRun: true` only | execute mode, `dryRun: false` |
| Publish orchestrator | Not called | Existing `publishApprovedSiteVersion(...)` may be called |
| Runtime mutation | Forbidden | Possible only through existing publish orchestrator |
| Active pointer | Cannot switch | May switch through existing publish orchestrator |
| Guard result | Context/diagnostic only | Diagnostic only, still not blocking |
| Audit requirement | Minimal internal diagnostic response is acceptable | Strong operator logging/audit expectations required |
| Confirmation | Dry-run-only confirmation | Explicit shadow-publish confirmation |

## Selected Future Surface

The recommended MVP-56 implementation surface is an internal admin API route only, with no visual UI button. The action should live under the internal admin/Command Center namespace and remain separate from:

- the MVP-54 dry-run route;
- the generic runtime publish route;
- client content publish routes;
- Ops Inbox derived work items;
- client portal surfaces.

Command Center may later display a minimal status or rehearsal affordance after route-level behavior is proven. Command Center display state is never source truth; the server action/route must reread persisted source-owned refs.

## Feature Flag Strategy

Future flag:

- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION`

Default:

- off.

Enabled values:

- `1`
- `true`
- `enabled`
- `on`
- `shadow_publish`

The flag only permits the future action to proceed to preflight. It does not waive authorization, source matching, resolver completeness, mode, confirmation, idempotency, correlation, or redaction requirements.

## Required Request-Level Intent

The future request must require:

- `mode: "shadow_publish"`;
- explicit operator confirmation phrase or boolean bound to the exact tenant/client/site/migration/candidate/artifact/mode;
- idempotency key;
- correlation id;
- expected source refs and watermarks;
- optional warnings/limitations policy.

Missing or mismatched intent fails before wrapper invocation.

## Authorization Policy

MVP shadow-publish must be platform superadmin only. It must be internal admin namespace only. It must deny agency roles, client roles, support/debug roles unless explicitly superadmin, Ops Inbox actors, client portal actors, anonymous users, public callers, and any generic runtime publish permission.

Scope checks must prove that tenant, client, site, migration, candidate, artifact, publish target, launch readiness evidence, AAF request, AAF decision, gate attempt/result, handoff watermark, and gate input watermark match persisted resolver output before wrapper execution.

## Boundary Statements

Generic publish route boundary: do not modify, import into, or call the MVP-55 action from the generic runtime publish route.

Publish/runtime boundary: the action must not directly mutate runtime, active pointers, artifacts, site versions, content overrides, rollback state, or public runtime. Any mutation may occur only because the existing publish orchestrator was called by the MVP-52 wrapper execute path.

AAF/gate boundary: the action must not create AAF records, create gate attempts, or evaluate gates. It consumes persisted refs only.

PASR/DDOM boundary: the action must not call PASR, create DDOM snapshots, call DDOM manual triggers/callers, or call live DNS.

Domain/DNS/provider boundary: the action must not call Vercel, Openprovider, registrars, DNS providers, SSL providers, AI providers, production Supabase, or staging Supabase. It must not create provider jobs.

Billing/Stripe boundary: the action must not create or mutate subscriptions, entitlements, invoices, customers, prices, cost events, billing source truth, hosting source truth, or Stripe state.

Rollback boundary: the action must not invoke rollback automatically. Publish failures surface as shadow-publish failures.

Command Center boundary: Command Center may be the internal operator context later, but no UI button is part of MVP-55.

Ops Inbox boundary: Ops Inbox remains derived-only and no-action.

Client portal boundary: no client portal, client dashboard, client API, client reviewer, or public runtime exposure is authorized by this architecture.

## Recommended MVP-56 Scope

Implement an internal admin API route first, no server action and no visual UI button. Use a fake publish orchestrator in tests to prove execute-mode wiring, response redaction, and active pointer mutation reporting without calling production providers or mutating external systems. Add Command Center display only after rehearsal validates the route contract.

Implementation may begin for MVP-56 only after accepting the MVP-55 execution, access, redaction, logging, failure, and test contracts.
