# GNR8 Ops Inbox Derived Work Item Contract

OPS-1 canonical contract for first-class internal Ops Inbox derived work items.

This is documentation and architecture only. It does not implement TypeScript types, APIs, routes, UI, server actions, SQL migrations, persistence, read models, action handlers, DDOM snapshots, AAF approvals, evidence packages, gate attempts, provider calls, publish behavior, rollback behavior, or enforcement.

## Contract Purpose

The contract gives the future Ops Inbox shell one consistent envelope for derived work items without making Ops Inbox source truth.

Every item is a projection from source-owned state or a redacted source-owned helper. Work item existence does not block publish, does not authorize action, and does not prove source truth. Resolution happens only through canonical source transition or a separately audited source-owned decision.

## Required Boundary Flags

Every item must carry:

| Field | Required value for MVP | Meaning |
| --- | --- | --- |
| `derivedOnly` | `true` | Item is derived from source-owned state. |
| `noMutation` | `true` | Item cannot mutate source state through the shell. |
| `hasActionPayload` | `false` for OPS-2 | No mutation payload exists in first implementation. |
| `actionButtons` | empty for OPS-2 | No action buttons in first implementation. |
| `nonEnforcing` | `true` for publish-shadow and any shadow family | Item does not enforce policy or block publish. |
| `publishActionBlocked` | `false` for publish-shadow | Item existence does not block publish. |
| `clientVisible` | `false` for OPS-2 | Client visibility is deferred. |

DDOM readiness is not publish activation approval. Domain readiness is a prerequisite, not approval. Publish enforcement remains deferred.

## Canonical Envelope

| Field | Type guidance | Requirement |
| --- | --- | --- |
| `derivedKey` | string | Stable role-safe key. Consume helper-provided keys when available. |
| `itemFamily` | enum | One of the approved family ids. |
| `itemType` | string | Family-owned derived type. |
| `title` | string | Short role-safe title. |
| `summary` | string | Role-safe explanation of why item exists. |
| `severity` | `low`, `medium`, `high`, `critical` | Derived by source/family policy. |
| `status` | `derived_open`, `derived_blocked`, `derived_waiting`, `derived_stale`, `resolved_by_state`, `dismissed_by_decision`, `superseded` | Display state; OPS-2 should render only current derived states. |
| `sourceSystem` | string | Source helper or canonical source family, for example `pasr_8_publish_shadow_helper`. |
| `sourceSubjectType` | string | Subject kind, for example `site_version`, `site`, `batch`, `domain`, `approval`, `incident`, `external_ref`. |
| `sourceSubjectRefs` | role-safe refs | Full refs only when target authorization permits; otherwise summaries/counts. |
| `redactionLevel` | `full`, `summarized`, `redacted`, `hidden`, `forbidden`, `mixed` | Overall item visibility. |
| `roleVisibility` | role matrix or labels | Roles allowed to see full, summarized, or no item detail. |
| `tenantScope` | string or redacted/null | Tenant scope when role-safe. |
| `agencyScope` | string or redacted/null | Agency scope when role-safe. |
| `clientScope` | string or redacted/null | Client scope when role-safe. |
| `siteScope` | string or redacted/null | Site scope when role-safe. |
| `siteVersionLabel` | string/null | Role-safe version label. |
| `runtimeArtifactLabel` | string/null | Role-safe artifact label when applicable. |
| `publishTargetLabel` | string/null | Role-safe target label when applicable. |
| `domainLabel` | string/null | Role-safe domain label when applicable. |
| `batchLabel` | string/null | Role-safe batch label when applicable. |
| `ownerRoleSuggestion` | role id | Primary suggested owner role. |
| `secondaryOwnerRoles` | role id array | Optional additional owner roles. |
| `recommendedNextActionLabel` | string | Display-only label in OPS-2. |
| `allowedActionPayloadBoundary` | object/null | Must be null or explicit no-payload boundary in OPS-2. |
| `freshnessState` | `fresh`, `stale`, `partial`, `unavailable`, `unknown`, `not_applicable` | Derived freshness state. |
| `staleReason` | string/null | Role-safe stale reason. |
| `observedAt` | ISO timestamp/null | When derivation observed the item. |
| `lastChangedAt` | ISO timestamp/null | Source last-change timestamp when role-safe. |
| `createdAt` | ISO timestamp/null | First available source/helper timestamp when role-safe. |
| `limitationSummary` | string | Role-safe limitations. |
| `warningSummary` | string | Role-safe warnings. |
| `evidenceRefs` | role-safe refs | Evidence/source/audit refs only when role-safe. |
| `sourceRefs` | role-safe refs | Source refs only when role-safe. |
| `auditRefs` | role-safe refs | Audit refs only when role-safe. |
| `drilldownTarget` | route descriptor/null | Link only when target authorization is separately safe. |
| `groupingHints` | strings | Family, severity, owner, client/site, freshness, source family. |
| `sortKey` | string/tuple | Deterministic tie-breaker ending with stable key. |
| `policyVersion` | string | Family derivation policy version. |

## Stable Key Rules

Preferred format:

`ops:<family>:<item-type>:<scope-kind>:<scope-id-or-redacted-scope>:<source-anchor>:<policy-version>`

Rules:

- Use helper-provided keys when a source helper already emits deterministic role-safe keys.
- Never include raw ids that the actor is not allowed to see.
- Redacted fallback keys may be less granular, but must not leak source identifiers.
- Display labels may change without changing keys.
- A source ref or policy change that changes identity should produce a new key.
- If source truth is superseded, the old item resolves or becomes superseded by derivation, not by local Inbox mutation.

## Severity Contract

Severity means operator attention, not enforcement:

| Severity | Meaning |
| --- | --- |
| `low` | Informational or non-launch-blocking follow-up. |
| `medium` | Blocks routine operator work or signals stale/partial source truth. |
| `high` | Blocks a site milestone, launch readiness, source confidence, or future enforcement readiness. |
| `critical` | Affects active public runtime, publish wave safety, cross-client ownership, incident recovery, audit confidence, or cost threshold control. |

The shell may not infer publish safety from severity.

## Status Contract

Current display statuses:

- `derived_open`: trigger currently evaluates true;
- `derived_blocked`: trigger true but source-owned next action is blocked by dependency;
- `derived_waiting`: trigger true and waiting on external/client/manual action;
- `derived_stale`: trigger true from stale or superseded source evidence.

Historical statuses may be represented by future source-owned decisions:

- `resolved_by_state`;
- `dismissed_by_decision`;
- `superseded`.

OPS-2 should not persist historical item state.

## Action Payload Boundary

OPS-2 items must have no action payload and no action buttons.

Future action payloads require a separate milestone and must be source-owned, role-gated, approval-aware, audit-aware, freshness-aware, and prohibited-reason-aware. Ops Inbox may present source-owned actions later, but it must not own the mutation.

## Drilldown Boundary

`drilldownTarget` may point to an existing source-owned detail surface only when:

- the actor is authorized for that target;
- target copy preserves source-of-truth boundaries;
- sensitive refs are redacted or omitted;
- the link does not imply approval, resolution, publish readiness, or action eligibility.

When in doubt, use a role-safe ref summary without a link.

## MVP Item Families

| Family | Description | OPS-2 readiness |
| --- | --- | --- |
| `publish_shadow` | PASR-8 derived publish activation shadow exceptions. | Implementation-ready. |
| `ddom_readiness` | DDOM snapshot missing/stale/blocked readiness items. | Placeholder until a safe family helper exists. |
| `aaf_approval` | Approval requests, missing/expired/superseded approvals, evidence or gate blockers. | Placeholder unless a derived helper is reviewed. |
| `migration_factory` | BMF batch/job/stage/failure/retry/replay work. | Placeholder until source-owned derived helper and role policy exist. |
| `domain_dns` | Domain binding, DNS instruction, Vercel/domain check, owner action, exception state. | Placeholder until source-owned derived helper and freshness policy exist. |
| `content_review` | Review/content/change request/override blockers. | Placeholder until client-safe and internal-safe contracts are separated. |
| `publish_rollback` | Publish readiness failures, publish failures, rollback needs, recovery targets. | Placeholder; action and incident boundaries remain deferred. |
| `cost_anomaly` | Internal cost threshold/anomaly/exception work. | Placeholder; not Stripe/customer billing truth. |
| `incident_recovery` | Incident, recovery, audit, rollback follow-up items. | Placeholder until incident source model is stable. |
| `external_workflow` | External task/ticket/sheet/email/reference follow-up. | Placeholder; external systems remain authoritative. |

Only `publish_shadow` should be consumed by OPS-2.

## Publish Shadow Mapping

PASR-8 maps these statuses to derived item types:

| PASR-4 status | OPS item type | Default severity | Status |
| --- | --- | --- | --- |
| `shadow_missing_ddom_snapshot` | `publish_shadow_missing_ddom_snapshot` | high | `derived_open` |
| `shadow_stale_ddom_snapshot` | `publish_shadow_stale_ddom_snapshot` | medium | `derived_stale` |
| `shadow_missing_publish_target` | `publish_shadow_missing_publish_target` | high | `derived_open` |
| `shadow_missing_publish_activation_approval` | `publish_shadow_missing_publish_activation_approval` | high | `derived_open` |
| `shadow_gate_not_ready` | `publish_shadow_gate_not_ready` | high | `derived_blocked` |
| `shadow_evaluation_failed` | `publish_shadow_evaluation_failed` | high | `derived_open` |
| `shadow_stale_source_truth` | `publish_shadow_source_truth_stale` | medium | `derived_stale` |
| `shadow_missing_source_truth` | `publish_shadow_source_truth_missing` | high | `derived_open` |

Ready, disabled, not available, forbidden, unavailable, and not applicable states create no exception items.

## Role And Redaction Contract

The contract must preserve the PASR-6 posture:

- fail closed for unauthorized actor/scope/surface;
- expose raw refs only with full visibility;
- summarize or redact sensitive refs for narrower roles;
- client reviewers and client portal remain forbidden for MVP publish shadow diagnostics;
- internal superadmin visibility is acceptable for the first Command Center route, with future role expansion deferred.

## Source-Of-Truth Contract

Ops Inbox item existence is not canonical truth and does not block publish.

Canonical truth remains in source-owned systems: runtime active pointer, site version, runtime artifact, published overrides, migration jobs/batches/events, AAF approval/evidence/gate/audit records, DDOM snapshots, publish target source truth, domain binding/readiness snapshots, incidents, cost events, and external systems for their own records.

