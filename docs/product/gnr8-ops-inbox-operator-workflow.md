# GNR8 Ops Inbox Operator Workflow

OPS-1 product workflow for the future first-class internal Ops Inbox shell.

This is documentation only. It does not implement UI, routes, APIs, read models, server actions, persistence, action buttons, DDOM snapshots, AAF approvals, AAF evidence packages, gate attempts, publish enforcement, publish behavior, rollback behavior, provider calls, client portal behavior, or runtime behavior.

## Product Position

Ops Inbox is the internal derived queue inside Command Center. It helps operators decide where to look next. It is not a task system, not approval truth, not audit truth, not publish readiness truth, not client visibility, and not a place where source state is changed.

Command Center is the workbench. Ops Inbox is the queue. Source-owned surfaces are where resolution happens.

## MVP Workflow

The first implementation should support a narrow internal workflow over PASR-8 publish shadow items only.

1. Operator opens `/gnr8/command-center/ops-inbox`.
2. Operator confirms the page labels the queue as derived-only, internal-only, non-enforcing, non-blocking, and no-action-button.
3. Operator filters by `publish_shadow`, severity, stale/open/blocked state, owner role, item type, and role-safe client/site labels.
4. Operator reviews high severity publish shadow items first.
5. Operator opens a role-safe drilldown or source-owned surface when available.
6. Operator resolves the underlying issue through the source-owned workflow, not by closing the Inbox item.
7. On the next derivation, the item disappears only if source state no longer triggers it or an audited source-owned decision supersedes it.

No item existence blocks publish in OPS-2. Publish enforcement remains deferred.

## Daily Triage

Operators should use the future Inbox as a daily scan:

- start with high severity and stale items;
- check whether any publish shadow family items indicate missing source truth, missing publish target, missing publish activation approval, stale DDOM snapshot, or gate dry-run failure;
- compare Inbox status with Command Center hosting/site context;
- treat unavailable/partial derivation as an operational visibility risk, not as proof the site is ready;
- route follow-up to source-owned DDOM, AAF, PTT, hosting, or engineering surfaces.

The empty state means "no derived work items for this scope," not "all sites are approved," not "publish is safe," and not "there are no source problems."

## Filtering Workflow

MVP filters:

- family: initially only `publish_shadow`;
- severity: high, medium, low, future critical;
- lifecycle/freshness: open, blocked, stale, unavailable;
- owner role suggestion: technical operator, account manager, platform superadmin, or role-safe family owner;
- item type;
- client/site label when role-safe.

Future filters may add batch, domain, incident, cost, external workflow, and content dimensions only after those families have safe derived helpers.

## Reviewing Publish Shadow Items

Publish shadow items are diagnostics from PASR. They are shadow-only and do not enforce publish gates.

Operators should read:

- title and summary;
- severity;
- stale/freshness summary;
- limitation and warning summaries;
- role-safe refs or ref summaries;
- recommended next action label;
- owner role suggestion.

Operators must not treat the item as approval, publish readiness, or publish blocking. The recommended next action label is display-only in OPS-2.

## Missing DDOM Snapshot

If `publish_shadow_missing_ddom_snapshot` appears:

- treat it as a high-severity future enforcement readiness gap;
- do not create a DDOM snapshot from Ops Inbox;
- do not assume publish was blocked;
- route to the source-owned DDOM manual/stored-state workflow when separately available;
- remember DDOM readiness is not publish activation approval.

MVP: display item and role-safe source summary only.

Future: link to a DDOM source-owned surface after authorization and trigger boundaries are implemented.

## Stale DDOM Snapshot

If `publish_shadow_stale_ddom_snapshot` appears:

- treat it as a stale source signal;
- do not hide it because stale data is inconvenient;
- do not refresh from Ops Inbox in the first implementation;
- route to source-owned DDOM refresh/manual snapshot workflows when separately authorized;
- do not treat a fresh DDOM snapshot as publish approval.

MVP: display stale state and stale reason when role-safe.

Future: source-owned refresh workflow may be linked after action boundary review.

## Missing Publish Activation Approval

If `publish_shadow_missing_publish_activation_approval` appears:

- distinguish publish activation approval from launch signoff, client review, domain readiness, DDOM readiness, Command Center state, external ticket text, and AI output;
- route follow-up to AAF approval workflow when separately available;
- do not create an AAF approval from Ops Inbox;
- do not block current publish from item existence.

MVP: show display-only AAF routing recommendation.

Future: source-owned approval request action may be presented only after approval and audit action contracts are implemented.

## Missing Publish Target

If `publish_shadow_missing_publish_target` appears:

- treat it as missing PTT/source truth for the intended publish target;
- route follow-up to source-owned publish target verification;
- do not create or mutate publish target rows from Ops Inbox;
- do not treat old evidence refs as current source truth.

MVP: show item and role-safe source ref summary.

Future: link to PTT/source truth detail once authorized.

## Gate Or Evidence Failures

For `publish_shadow_gate_not_ready`, `publish_shadow_evaluation_failed`, `publish_shadow_source_truth_stale`, and `publish_shadow_source_truth_missing`:

- escalate gate/evidence/source failures to technical operators or platform superadmin depending severity;
- inspect role-safe refs and limitations;
- open source-owned AAF/PASR/DDOM/PTT surfaces when available;
- do not retry, rerun, refresh, or approve from Ops Inbox in OPS-2;
- do not infer publish enforcement from the shadow gate result.

## Viewing Item Details

The first shell may show an inline detail pane or read-only item detail area. It should not expose raw internals beyond the role-safe projection.

Allowed detail content:

- stable derived key;
- family and item type;
- severity and lifecycle;
- source system label;
- subject labels;
- role-safe refs and summaries;
- limitations, warnings, freshness;
- boundary labels;
- display-only recommended next action.

Not allowed in OPS-2:

- mutation payloads;
- action buttons;
- raw idempotency/correlation ids unless already permitted by redaction;
- raw provider diagnostics;
- source truth writes;
- item completion controls.

## Moving To Source Surfaces

Operators resolve work outside Ops Inbox:

- DDOM gaps through DDOM stored-state/manual snapshot workflows;
- AAF approval gaps through AAF approval workflows;
- publish target gaps through PTT/source truth workflows;
- domain and hosting issues through hosting/domain readiness surfaces;
- future migration failures through BMF batch/job/failure surfaces;
- future content work through content/review workflows;
- future incidents through incident/recovery workflows.

Ops Inbox only reflects the next derivation after those source workflows change state.

## Command Center Difference

Command Center gives the portfolio, site, hosting, batch, agency, and future operational workbench context.

Ops Inbox gives the cross-source queue of current derived work items. It should link back to Command Center and source-owned drilldowns, but it should not replace Command Center overview, sites, hosting detail, migration batches, or evidence/audit surfaces.

## Client Portal Difference

Client portal is client-safe review/collaboration space. Ops Inbox is internal-only.

OPS-2 must not expose publish shadow diagnostics to clients. Future client-facing follow-up requires separate redaction, copy, approval, and product design.

## Future Workflows

Future item families may add:

- DDOM readiness items;
- AAF approval and evidence items;
- BMF migration factory failures;
- domain/DNS readiness and owner action items;
- content review items;
- publish/rollback/incident recovery items;
- cost anomaly items;
- external workflow handoff items;
- AI advisory review items.

Each family needs its own source-owned helper and redaction contract before surfacing.

Future external task handoff may create external references, but external systems remain authoritative for their own records and do not become GNR8 approval truth.

Future audited action buttons may be added only after source-owned mutation, approval, audit, freshness, and prohibited-reason contracts are implemented.

Future AI advisory review may suggest human plans, but AI output must remain advisory evidence and must not mutate runtime, domains, approvals, billing, providers, or publish state.

## Operator Safety Rules

- Ops Inbox is derived-only.
- Work item existence does not block publish.
- DDOM readiness is not publish activation approval.
- Domain readiness is a prerequisite, not approval.
- Publish activation approval is separate from launch signoff and client review.
- Publish enforcement remains deferred.
- No action buttons in the first implementation.
- Client visibility is deferred.
- Item resolution happens through source-owned workflows or audited source-owned decisions.

