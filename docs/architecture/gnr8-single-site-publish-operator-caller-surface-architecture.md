# GNR8 Single-Site Publish Operator Caller Surface Architecture

Phase: MVP-53
Scope: Documentation and architecture only.

MVP-53 selects the first eligible operator-facing caller surface that may invoke the MVP-52 single-site publish wrapper in a later milestone. It does not implement UI, API routes, server actions, wrapper wiring, blocking enforcement, publish behavior changes, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, or client portal exposure.

## Recommendation

Use an internal Command Center operator action backed by a new internal admin-namespace route in a later implementation milestone.

The first implementation should be:

- internal/operator-only;
- hidden and default-off behind an explicit feature flag;
- reachable only from Command Center/admin scope, not client scope;
- dry-run only in MVP-54;
- shadow-publish capable only in MVP-55 after an additional explicit flag;
- explicit about migration id, candidate refs, evidence refs, decision refs, gate refs, watermarks, actor, correlation id, idempotency key, mode, and operator confirmation;
- separate from the generic runtime publish route;
- separate from Ops Inbox;
- never exposed to the client portal.

## Reviewed Current Shape

MVP-52 created `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts` as a server-only, default-off wrapper. It is direct-server-code/test callable only and is not wired to routes, UI, Command Center, Ops Inbox, client portal, workers, or generic publish callers.

Current Command Center route layout is protected by `requireSuperadminUserIdForPage()` under `apps/platform/app/gnr8/command-center/layout.tsx`. The Command Center shell already hosts internal operational views and derived publish shadow surfacing. It is a natural operator workspace, but its display state is not source truth.

Current Ops Inbox is read-only and derived-only. It displays PASR/publish-shadow work items with no action payload. It should not become the first publish caller.

Current generic runtime publish route, `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`, starts from `siteVersionId`, agency action context, optional stage, and then runs existing publish plus domain reconciliation/activation. It lacks strict single-site migration and AAF chain context and must remain unchanged.

Current client content publish route, `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`, is scoped to client/agency content overrides and must not become a single-site activation caller.

## Options Evaluated

| Option | Safety | Available context | Auth/RBAC fit | Auditability | Testability | Generic publish confusion | Client exposure risk | 20-site validation fit | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Internal Command Center operator action | Strong if hidden/default-off and backed by strict server preflight. | Can display single-site migration, candidate, readiness, AAF, gate, and wrapper diagnostics as refs, while reading source truth server-side. | Fits current superadmin Command Center posture; later can add narrower operator roles. | Strong when the action requires correlation/idempotency and records safe audit diagnostics later. | Good with route/action unit tests plus source guard tests. | Low if route is separate from generic publish. | Low if no client routes or client projections are used. | Strong because operators can run one controlled site at a time. | Recommended surface. |
| Internal server action attached to Command Center | Strong if server-only and flag-gated. | Same as Command Center action. | Good for form-style UI, but current Command Center uses route/view-model patterns more than server actions. | Good if action logs structured envelopes. | Moderate; server actions are more awkward to test than internal route handlers. | Low if not shared with generic route. | Low if kept internal. | Strong after route contract is proven. | Defer behind route-backed design. |
| Internal API route under Command Center/admin namespace | Strong with `requireSuperadminUserId`, explicit scope checks, and no visible button without flag. | Strong because handler can assemble wrapper input from explicit refs and source-owned reads. | Fits existing admin route testing patterns. | Strong with request body contract, correlation id, idempotency key, and future audit event. | Strongest first implementation target. | Low because route name and contract are single-site specific. | Low if not referenced from client code. | Strong for controlled dry-run and shadow-publish rehearsals. | Selected implementation form for MVP-54. |
| CLI/rehearsal harness only | Very safe from UI exposure. | Good for fixtures but weak for actual operator workflow context. | Bypasses product auth/RBAC unless separately built. | Good in logs, weak in product audit posture. | Strong. | None. | None. | Useful for engineering rehearsal, less suitable for operator validation. | Keep as test support only. |
| Generic runtime publish route extension | Unsafe for MVP-53. | Lacks migration id, readiness evidence, AAF request/decision/gate refs, handoff watermark, and gate input watermark. | Existing agency publish roles are broader than single-site activation needs. | Weak because single-site source chain would be inferred or absent. | Moderate but high regression surface. | High. | Moderate because generic publish is broader. | Poor because it may mix ordinary runtime publish with single-site publish. | Rejected. |
| Ops Inbox action | Unsafe now. | Derived work items are not source truth and have no action payload. | Internal, but current shell is read-only and derived-only. | Weak unless source-owned action exists elsewhere. | Poor until persistent action model exists. | Moderate because exception item could be mistaken for approval. | Low today, but future client-safe work could confuse boundaries. | Poor as first action; useful only after Command Center route is stable. | Rejected for first caller. |
| Client portal action | Unsafe and out of scope. | Client context lacks internal AAF/gate/source refs and must not see shadow diagnostics. | Client roles are denied. | Inappropriate for internal publish activation. | Would require new redaction/auth design. | High. | High. | Not suitable. | Rejected. |

## Selected Caller Surface

The first eligible operator caller surface should be:

`Command Center internal single-site publish operator action -> internal admin-namespace route -> MVP-52 wrapper`

The route name is intentionally not specified as an implementation commitment, but it should live under the internal admin/Command Center namespace, not under generic runtime or client namespaces. A future route such as `/api/gnr8/admin/single-site-publish/...` would be directionally appropriate.

MVP-54 should implement dry-run only. It should call the MVP-52 wrapper in dry-run mode only, return wrapper preflight diagnostics, and prove that no publish orchestrator execution occurs.

MVP-55 may add shadow-publish mode only behind an additional explicit flag, with explicit operator confirmation and no blocking enforcement.

## Boundary Statements

Command Center boundary: Command Center may host the future operator action, but Command Center display state is derived and is not source truth. The caller must reread source-owned state server-side.

Ops Inbox boundary: Ops Inbox remains derived-only and no-action for this milestone. It must not invoke the wrapper in MVP-54 or MVP-55.

Client portal boundary: No client portal, client dashboard, client API, or public runtime exposure is eligible.

Generic publish route boundary: The generic runtime publish route must remain unchanged and must not import or call the MVP-52 wrapper.

Publish/runtime boundary: The caller must not mutate runtime, active pointer, artifact, site-version, rollback, public runtime, or content override state except through the existing publish orchestrator when MVP-55 explicitly shadow-publishes through the wrapper.

Domain/DNS/provider boundary: The caller must not call DDOM snapshot creation, live DNS, Vercel, Openprovider, registrars, DNS providers, SSL providers, AI providers, production Supabase, or staging Supabase.

Billing/Stripe boundary: The caller must not create or mutate subscriptions, entitlements, invoices, customers, prices, margins, cost events, billing source truth, or Stripe state.

AAF/gate boundary: The caller must not create AAF records and must not reevaluate gates. It consumes expected refs only.

## Future Milestones

1. MVP-54: implement the internal admin route/Command Center caller surface as dry-run only, hidden/default-off, with no publish.
2. MVP-55: add shadow-publish operator action behind an additional explicit flag and confirmation.
3. MVP-56: design or implement blocking enforcement flag architecture separately.
4. MVP-57: run end-to-end publish rehearsal for controlled single-site migrations.
5. Later: add minimal Command Center visibility/action affordance if not already included, still excluding Ops Inbox and client portal actions.
