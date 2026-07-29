# GNR8 Ops Inbox First-Class Shell Architecture

OPS-1 architecture for the first internal Ops Inbox shell.

This is documentation and architecture only. It does not implement UI, routes, APIs, server actions, read models, database tables, SQL migrations, persistence, enforcement, action buttons, publish behavior, rollback behavior, Command Center implementation, client portal behavior, public runtime behavior, workers, providers, DNS/domain behavior, billing, Stripe, AI, storage, auth implementation, DDOM snapshots, AAF approvals, AAF evidence packages, or AAF gate attempts.

## Purpose

The first-class Ops Inbox shell should become the internal operator queue for current exceptions, blockers, stale projections, and source-owned follow-up needs across GNR8 operations. It exists so operators can triage work without treating scattered Command Center panels, hosting diagnostics, PASR shadow results, admin pages, or UI badges as canonical task truth.

The shell is needed before broader exception workflows because PASR-8 proved only one narrow derived family, `publish_shadow`, and because the repository currently has Ops Inbox documentation plus a publish shadow helper, not a stable implemented Ops Inbox UI/read-model shell.

## Current Baseline

Existing docs define these principles:

- Ops Inbox is a derived queue from canonical state.
- Work item existence is not source truth.
- A work item resolves only when canonical source state changes or a separately audited source-owned decision records why the work is no longer required.
- Severity, owner role, stale state, grouping, drilldowns, and completion rules are derived from source refs and policies.
- Command Center is the primary operator workbench and Ops Inbox is a primary queue inside that workbench.
- Command Center and Ops Inbox must not create approval, audit, publish, rollback, domain, incident, cost, migration, or external workflow truth.
- Publish and rollback are separate approval-gated side effects, not batch execution or read-model actions.
- Domain readiness is a prerequisite for custom-domain publish, not publish activation approval.
- DDOM readiness is not publish activation approval.
- Publish shadow items are shadow-only, derived-only, non-enforcing, and non-blocking.
- Client visibility remains deferred unless a later product/security milestone explicitly approves it.

PASR-8 provides the first safe derived helper family:

- `getPublishShadowOpsInboxViewModel`
- `buildPublishShadowOpsInboxViewModelFromProjection`
- `mapPublishShadowProjectionToOpsInboxWorkItems`

It consumes PASR-4 read results only after PASR-6 redaction for `surface: "ops_inbox"`. It emits no action payload, no buttons, no persistence, no DDOM creation, no AAF creation, no provider calls, and no publish blocking.

## Recommended Route And Location

Recommended first route:

`/gnr8/command-center/ops-inbox`

Recommended implementation location for OPS-2:

- route shell: `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- read/view-model adapter: a new server-only module under `apps/platform/gnr8/ops-inbox/`
- layout integration: add one Command Center tab and command palette route only after the shell is implemented

This route should live under Command Center because:

- `apps/platform/app/gnr8/command-center/layout.tsx` already applies the internal superadmin page guard;
- `CommandCenterLayout.tsx` already owns Overview, Sites, Hosting, Migration Batches, and Agencies navigation;
- CCO-1 defines Ops Inbox as a primary Command Center band;
- PASR-7 already surfaces publish shadow diagnostics in Command Center hosting detail;
- future Ops Inbox drilldowns should lead to Command Center hosting, sites, batches, evidence, audit, and source-owned admin pages.

It should not live under the client portal, public runtime, generic admin experiment pages, provider cockpit, worker routes, or publish/runtime route families.

## Relationship To Command Center

Command Center remains the primary operator workbench. Ops Inbox should be a first-class Command Center tab that summarizes and filters derived work items.

Command Center may show Ops Inbox counts and link to the queue, but neither surface owns task truth. Command Center read models and Ops Inbox items are rebuildable projections. If Command Center and Ops Inbox disagree, the UI must label the disagreement as source/read-model partiality and route to source-owned drilldowns instead of letting operators resolve by UI state.

## Relationship To PASR-8

OPS-2 should consume only PASR-8 publish shadow derived items for the first implementation.

PASR-8 publish shadow item types:

- `publish_shadow_missing_ddom_snapshot`
- `publish_shadow_stale_ddom_snapshot`
- `publish_shadow_missing_publish_target`
- `publish_shadow_missing_publish_activation_approval`
- `publish_shadow_gate_not_ready`
- `publish_shadow_evaluation_failed`
- `publish_shadow_source_truth_stale`
- `publish_shadow_source_truth_missing`

Safe PASR-8 fields include the stable derived key, item type, lifecycle state, severity, title, summary, role-safe site label, role-safe site-version summary, recommended next action label, recommended owner role, role-safe refs and ref summaries, limitations summary, freshness summary, created/observed timestamps, and boundary flags.

The shell must preserve PASR-8 flags:

- `shadowOnly: true`
- `derivedOnly: true`
- `nonEnforcing: true`
- `nonBlocking: true`
- `hasActionPayload: false`
- `actionButtons: []`

Publish shadow item existence does not block publish. Publish enforcement remains deferred.

## Future Item Families

The shell should be designed around the derived work item contract, but only `publish_shadow` is implementation-ready for OPS-2.

Future-compatible families:

- `ddom_readiness`
- `aaf_approval`
- `migration_factory`
- `domain_dns`
- `content_review`
- `publish_rollback`
- `cost_anomaly`
- `incident_recovery`
- `external_workflow`

These families must remain placeholders until each has a source-owned read helper, role/redaction contract, stable key strategy, freshness policy, drilldown authorization boundary, and tests proving no source truth or action payload is created by the Ops Inbox adapter.

## MVP Shell Contents

The first MVP shell should include:

- internal-only page under `/gnr8/command-center/ops-inbox`;
- read-only list of derived items;
- PASR-8 `publish_shadow` items only;
- visible derived-only, non-enforcing, non-blocking labels;
- filters for family, severity, freshness/lifecycle, owner role, client/site label when available, and item type;
- grouping by severity, owner role, family, client/site, and stale state;
- sorting by severity, stale/blocked state, observed timestamp, affected scope label, and stable key;
- empty state for no derived items;
- unavailable state for helper/source read failure;
- stale state labels for stale DDOM/source truth signals;
- role-safe drilldown labels only when target authorization can be separately checked;
- display-only recommended next action labels;
- source-of-truth boundary copy on the page and item detail area.

## Must Not Include

The first shell must not include:

- action buttons;
- retry, refresh, run, trigger, approve, dismiss, assign, publish, rollback, DDOM, AAF, provider, DNS, or billing controls;
- persistent Ops Inbox tables;
- item close/dismiss state;
- source-owned mutation payloads;
- publish enforcement or publish blocking;
- client-facing views;
- public runtime metadata;
- new API routes or server actions;
- SQL migrations;
- DDOM snapshot creation;
- AAF approval, evidence package, gate attempt, or audit write creation;
- provider, DNS, Vercel, Openprovider, registrar, Stripe, AI, production Supabase, or staging Supabase calls.

## Derived-Only Source-Of-Truth Boundary

Ops Inbox derives current work from source-owned state and projections. The item key is identity for the current derived blocker; it is not task truth.

Resolution rules:

- source transition resolves an item when the trigger stops evaluating true;
- audited source-owned decision may resolve or dismiss allowed item types;
- stale items remain visible until source freshness is restored or source state supersedes them;
- UI-only hiding, local item state, or row disappearance by filter is not completion.

The shell must never persist item status as canonical truth.

## Role, Access, And Redaction

The first OPS-2 shell should use the current Command Center internal superadmin guard for the route and PASR-6 redaction for PASR-derived content.

Longer term, role expansion must happen through a dedicated role/scope mapping milestone. Required posture:

- fail closed on missing actor, role, or scope;
- derive visibility by family, item type, source subject, tenant/client/site scope, and target drilldown authorization;
- show client-safe summaries only after explicit client visibility review;
- hide or summarize raw source refs, evidence refs, audit refs, actor ids, correlation ids, idempotency keys, provider diagnostics, and sensitive internal details;
- preserve high-level severity and blocked/stale status without leaking forbidden details;
- never convert a hidden high-risk status into ready.

## Internal-Only And Client Boundary

OPS-2 must be internal-only. Client portal, client dashboard, public runtime, preview runtime, client-facing API, and external task-system surfacing remain deferred.

Client visibility requires a separate product/security architecture phase and must not inherit internal Ops Inbox content by default.

## Grouping, Filtering, And Stable Keys

Stable keys should follow the existing CCO-1 pattern:

`ops:<family-or-type>:<scope-kind>:<scope-id-or-redacted-scope>:<source-ref-or-role-safe-anchor>:<policy-version>`

For PASR-8, the existing helper key should be consumed as-is and not recomputed in the shell.

Default grouping:

- Critical/high first;
- My role, when role expansion exists;
- Publish shadow;
- Stale source signals;
- Client/site scope;
- Item type.

Default sorting:

1. Severity: critical, high, medium, low.
2. Lifecycle: derived_blocked, derived_stale, derived_open.
3. Freshness state: unavailable/stale before fresh.
4. Oldest observed timestamp.
5. Stable key.

Grouping must not hide individual source refs needed for audit-safe drilldown.

## Severity Principles

Severity is derived by the source helper or family adapter. The shell may sort and filter by severity, but it must not upgrade/downgrade severity without a family policy version.

Publish shadow defaults from PASR-8:

- missing DDOM snapshot: high;
- stale DDOM snapshot: medium;
- missing publish target: high;
- missing publish activation approval: high;
- gate not ready: high;
- evaluation failed: high;
- source truth stale: medium;
- source truth missing: high.

Severity does not authorize or block publish. It only guides operator attention.

## Empty, Error, And Stale States

Empty state:

- say there are no derived Ops Inbox items for the current internal scope;
- avoid implying all sites are launch-ready or publish-safe.

Unavailable/error state:

- show that derivation is unavailable or partial;
- preserve no-runtime-change and no-enforcement copy;
- do not show raw errors to unauthorized roles;
- do not emit placeholder tasks.

Stale state:

- keep stale items visible;
- show stale reason when role-safe;
- disable or omit side-effect actions in all cases for the MVP shell because no action buttons exist;
- route future follow-up to source-owned refresh workflows only after those workflows are separately authorized.

## Drilldown Boundary

OPS-2 may show role-safe text links only to existing source-owned surfaces when authorization is clear. It should not implement item detail routes unless the detail page remains read-only and consumes the same derived contract.

Initial PASR-8 drilldowns should prefer existing Command Center hosting detail or source-owned AAF/DDOM/PTT surfaces only where separately authorized. If target authorization is not known, show a ref summary instead of a link.

## Future Action Boundary

Action buttons are deferred. A future action milestone must define, for each action:

- canonical source-owned workflow;
- actor role/scope;
- approval requirement;
- audit write path;
- evidence refs shown;
- freshness requirement;
- mutation payload schema;
- prohibited reasons;
- failure behavior;
- tests proving Ops Inbox does not own the mutation.

Recommended next-action labels in OPS-2 are display text only.

## Future Persistence Boundary

Persistent Ops Inbox tables are deferred. A future persistence milestone may store snapshots, acknowledgements, assignments, or audited dismissals only after deciding which fields are projections and which audited decisions are source truth.

Until then, item identity and visibility come from derived helpers, not Ops Inbox storage.

## Future Client-Facing Boundary

Client-facing Ops Inbox concepts are deferred. A future client milestone must design a separate client-safe work/follow-up surface with strict redaction, client-owned vocabulary, and no internal AAF/DDOM/PTT/provider/source refs unless explicitly approved.

## OPS-2 Recommendation

Implement a minimal internal Ops Inbox shell that consumes PASR-8 derived publish shadow items only.

Do not implement broad multi-family aggregation, persistent Ops Inbox truth, action buttons, source-owned mutations, Command Center drilldown rewrites, client exposure, or publish enforcement in OPS-2.

OPS-2 should prove:

- route placement under Command Center;
- read-only derived list rendering;
- PASR-8 helper consumption through redacted projections;
- stable grouping/filtering/sorting over one family;
- empty/unavailable/stale states;
- explicit derived-only, non-blocking, non-enforcing, no-action-button, no-client-visibility, and no-publish-enforcement labels.

