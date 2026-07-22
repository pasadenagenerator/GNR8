# GNR8 Command Center And Ops Inbox Design

CCO-1 canonical architecture for the GNR8 MVP operator workbench and derived exception queue.

This is documentation and architecture only. It does not authorize runtime behavior, APIs, route handlers, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, thumbnails, Generated Proposal Bundles, Workspace runtime, Evolution runtime, AI execution, or deployment configuration changes.

## Purpose

Command Center is the primary operator workbench for the MVP migration and operations wave of approximately 200 static or mostly static public websites. It gives operators one coherent daily surface for portfolio health, migration waves, batches, site state, readiness, approvals, domain/DNS visibility, publish/rollback visibility, cost signals, incidents, evidence, and audit references.

Ops Inbox is a derived exception and action queue from canonical state. It tells operators what needs attention, who should own it, why it exists, what actions are allowed, what actions are blocked, and what canonical transition or audited decision will resolve it.

CCO-1 prevents fragmented admin pages, ambiguous approvals, stale read models, misleading UI state, and accidental source-of-truth drift.

## MVP Scope

CCO-1 covers:

- information architecture for Command Center and Ops Inbox;
- read-model and work-item derivation boundaries;
- operator role model and role-gated actions;
- approval, audit, freshness, error, and empty-state expectations;
- drilldown relationships to existing admin, workspace, evolution, hosting, content, migration, and evidence surfaces;
- visibility for cost, domains, DNS instructions, Vercel checks, publish, rollback, incidents, asset/storage evidence, external workflow references, and future AI advisory work.

CCO-1 does not implement these surfaces. It defines what later implementation must preserve.

## Non-Goals

CCO-1 does not:

- implement Command Center UI changes;
- implement Ops Inbox;
- create read model tables, task tables, queues, jobs, schemas, or migrations;
- change existing bulk action behavior;
- add approval persistence;
- add audit taxonomy persistence;
- add domain/DNS automation;
- add publish or rollback behavior;
- add billing or Stripe behavior;
- add storage migration;
- add autonomous migration, autonomous regeneration, autonomous AI execution, or autonomous provider execution.

## Relationship To MVP-1

CCO-1 adopts these MVP-1 rules:

- Command Center is the primary operator representation for MVP operations.
- Ops Inbox is derived from canonical state and is not a source of truth.
- Runtime production truth is active pointer, site version, runtime artifact, and published override state.
- Review projections, thumbnails, Website Understanding, Source Content and Visual Continuity, Knowledge Workspace, Evolution, Generated Proposal Bundles, previews, AI outputs, provider payloads, billing dashboards, Command Center read models, Ops Inbox items, and external workflow snapshots are non-authoritative.
- Human approvals gate batch start, retry/replay, degraded/unsupported exceptions, client/content approval, domain actions, publish activation, rollback, and cost exceptions.
- MVP supports static or mostly static public websites only, with manual review for forms, widgets, platform builders, multilingual sites, blogs/news, booking links, and complex SEO.

## Relationship To BMF-1

CCO-1 adopts these BMF-1 semantics:

- Bulk Migration Factory is operator-assisted, not autonomous.
- Dry-run is evidence, not approval.
- Batch start is approval-gated.
- Current execution evidence is operator-triggered and sequential by default.
- Retry repeats an approved action; replay resets deterministic outputs from immutable input refs.
- Rendered capture, source reachability, live discovery, and domain/provider checks have environmental variance and must be labeled.
- Publish activation and rollback are separate approval-gated side effects, not deterministic batch execution.
- Ops Inbox items cannot be closed without underlying canonical state transition or an audited decision.

## Required Assertions

- Command Center is the primary operator workbench for MVP.
- Ops Inbox is a derived queue from canonical state.
- Neither Command Center nor Ops Inbox is source of truth.
- Specialized admin/review/workspace/evolution pages are drilldowns unless explicitly adopted as primary operator surfaces by later architecture decision.
- No operator action may be enabled from a read model unless source-of-truth state, role permission, approval requirements, and audit requirements are clear.

## Current Repository Evidence

Representative evidence reviewed:

| Area | Evidence | CCO-1 implication |
| --- | --- | --- |
| Command Center overview | `apps/platform/app/gnr8/command-center/page.tsx` | Existing overview shows portfolio metrics and links to Sites, Hosting, Agencies, and Migration Batches. |
| Sites surface | `apps/platform/app/gnr8/command-center/sites/page.tsx`, `_components/command-center-ops-table.tsx` | Existing table exposes filters, cost signals, assignment, and bulk import/approve/publish controls. CCO-1 requires stricter action gates before later implementation expands this surface. |
| Command Center read model | `apps/platform/gnr8/command-center/command-center-read-model.ts`, `_lib/command-center-view-model.ts` | Existing read model derives site summaries from sites, organizations, runtime versions, AI/runtime/migration cost events, and automation status. It is partial and must remain projection-only. |
| Migration batch pages | `apps/platform/app/gnr8/command-center/migration-batches/**` | Existing list/detail show durable batches, progress, diagnostics, failures, timeline, and run/resume controls. |
| Migration batch APIs | `apps/platform/app/api/gnr8/admin/migration-batches/**` | Routes create/list/read batches, add/remove jobs, run batches, and expose observability/timeline. Current route evidence is narrower than BMF-1 approval/dry-run design. |
| Migration job APIs | `apps/platform/app/api/gnr8/admin/migration-jobs/**` | Routes create/read/resume durable jobs and use superadmin plus agency action access. |
| Migration factory | `apps/platform/gnr8/migration-factory/**` | Durable job/batch stores, stage state, executor, observability, and replay primitives exist. |
| Hosting operations | `apps/platform/app/gnr8/command-center/hosting/**`, `apps/platform/gnr8/runtime/hosting-operations/**` | Existing hosting read models expose active pointer, artifacts, domains, DNS instructions, readiness, diagnostics, assets, and rollback candidates as drilldown evidence. |
| Runtime readiness | `apps/platform/gnr8/runtime/readiness/**`, `preview-smoke/**` | Site/domain readiness and preview smoke checks are derived check snapshots that need freshness labels. |
| Publish safety | `publish-activation-orchestrator.ts`, `publish-activation-guard.ts`, `publish-safety-check.ts` | Publish has pointer switching and safety checks, but CCO-1 requires separate approval/readiness/audit visibility before action enablement. |
| Rollback primitive | `rollback-switch.ts` | Rollback can switch to a target artifact; CCO-1 treats rollback as incident/recovery action requiring approval and audit evidence. |
| Cost visibility | `apps/platform/gnr8/billing/**` | AI, runtime, migration cost events and unified cost views provide internal cost signals, not full billing truth. |
| Audit foundation | `packages/core/src/modules/audit-log/**` | Generic org activity service exists; CCO-1 needs unified taxonomy references before write-path implementation. |
| RBAC | `apps/platform/src/auth/rbac.ts`, agency action access | Existing action matrix has run migration, approve migration, publish, assign client, and bulk actions. CCO-1 extends product rules with approval and audit gates. |
| Client/content APIs | `apps/platform/app/api/gnr8/clients/**/content/**` | Draft/published content overrides, publish, rollback, history, and scope guards exist as drilldown/action evidence. |
| Workspace/Evolution | `apps/platform/app/gnr8/admin/workspace/**`, `apps/platform/app/gnr8/admin/evolution/**` | Knowledge Workspace and Evolution are read-only review/drilldown surfaces, not runtime truth. |
| Admin overlap | `apps/platform/app/gnr8/admin/**` | Candidate discovery/review, dry-run, WU/VCU, business foundation, providers, agencies, workspace, and evolution pages overlap with operator tasks and should be drilldowns unless later adopted. |
| ADRs | `docs/ai/decisions/ADR-001-deterministic-pipeline.md`, `ADR-003-runtime-artifact-model.md` | CCO-1 follows deterministic-first stages and immutable artifacts/snapshots/diagnostics evidence. |

## Command Center Role

Command Center is the MVP home for daily operations:

- portfolio overview for roughly 200 sites;
- migration wave and batch monitoring;
- site operational state and next required action;
- Ops Inbox summary and drilldown;
- readiness, approval, domain, publish, rollback, incident, cost, asset, and audit visibility;
- links to specialized evidence and review surfaces.

Command Center may present actions, but it cannot authorize action by display state alone. Each action must derive from canonical state, role permission, approval requirement, audit requirement, and freshness policy.

## Ops Inbox Role

Ops Inbox is a derived queue:

- one row per canonical blocker/action requirement after dedupe and grouping;
- stable key for identity, not independent task truth;
- owner role, severity, freshness, allowed actions, blocked actions, evidence refs, and completion condition;
- list placement in Command Center and item detail drilldown;
- optional dismissal only when an audited decision records why work is no longer required.

Ops Inbox must not store independent truth about migration state, approval state, incidents, domain readiness, cost, publish readiness, or external workflow state.

## Source-Of-Truth Boundaries

| Domain | Canonical source | Command Center/Ops Inbox treatment |
| --- | --- | --- |
| Ownership and RBAC | Agency, client, site, membership/RBAC records | Scope filters, ownership labels, role visibility, action permissions. |
| Intake and classification | Intake records, validation results, accepted site-class decisions, audit | Completeness, duplicate, supported-class, and launch-eligibility projections. |
| Migration batches/jobs/stages | Migration batch/job/stage stores and append-only events | Batch progress, site stage, failure groups, retry/replay eligibility, timeline refs. |
| Runtime serving | Active pointer, site version, immutable runtime/raw artifacts, published overrides | Operational state, active version, preview/readiness, publish/rollback evidence. |
| Content corrections | Content slots, draft/published overrides, content history | Content change status, diffs, approvals, content drilldowns. |
| Approval state | Canonical append-only approval/event model once decided | Approval-needed status and evidence package requirements only. |
| Audit | Unified audit/event taxonomy or federated event refs | Timeline refs and audit dependency checks. |
| Incident/recovery | Incident/recovery event model once decided plus runtime/publish/rollback evidence | Incident state, rollback need, recovery evidence items. |
| Domains/DNS | GNR8 domain bindings and snapshots; external DNS/registrar remains external truth | DNS instructions, Vercel check status, stale labels, action owner. |
| Cost | AI/runtime/migration cost events and threshold decisions; Stripe remains external truth | Estimates, internal spend, anomalies, exception approvals. |
| External workflows | External systems remain authoritative; GNR8 stores refs/snapshots only after model decision | Reference links, stale labels, follow-up items. |
| AI advisory | Immutable evidence/advisory bundles if used | Read-only plan review, never automatic mutation. |

## Information Architecture

Command Center has five top-level operating bands:

1. Portfolio Overview: 200-site wave health, owners, risk, cost, incidents, readiness.
2. Migration Operations: waves, batch list, batch detail, site lists, dry-run and failure groups.
3. Ops Inbox: derived exceptions/actions grouped by severity, owner role, batch, client, site, and stale state.
4. Site Operations: site detail, import evidence, preview/review/content/domain/publish/rollback readiness.
5. Evidence And Audit: evidence package, audit timeline, external references, incident/recovery, cost detail.

Specialized pages remain reachable as drilldowns from these bands.

## Primary Navigation Model

| Navigation item | Purpose | Primary user | Notes |
| --- | --- | --- | --- |
| Overview | Daily starting point and portfolio/wave health | Superadmin, agency admin, migration lead | Shows no unapproved side-effect actions. |
| Ops Inbox | Work queue for blockers and required decisions | All operators by role | Derived-only and grouped by canonical source. |
| Migration Waves | Portfolio wave grouping and progress | Migration operator, account manager | May be logical/read-model grouping if no canonical wave store exists. |
| Batches | Batch list/detail and execution monitoring | Migration operator | Run/resume only when start/continue approval and audit contract are satisfied. |
| Sites | Site list and site detail | All operators by scope | Canonical operational state, next action, drilldowns. |
| Hosting | Domain/runtime/asset/readiness drilldowns | Technical operator | Readiness and diagnostics evidence, not source of truth. |
| Cost | Internal operating cost and anomalies | Superadmin, agency owner/admin | Cost visibility, not Stripe/customer billing. |
| Audit | Timeline and evidence package references | Superadmin, technical/operator leads | Read-only event reconstruction. |

## Page And Surface Hierarchy

| Surface | Hierarchy | Source dependency | Action posture |
| --- | --- | --- | --- |
| Portfolio overview | Primary | Portfolio read model from canonical sources | Navigate, filter, acknowledge stale projections. |
| Ops Inbox list | Primary | Derived work item projection | Open items, route actions to source-owned workflows. |
| Ops Inbox item detail | Primary/detail | Work item derivation plus evidence refs | Allow only source-owned actions with explicit gates. |
| Migration wave overview | Primary | Batch/site/client/cost/readiness projections | Plan/monitor; no direct publish/rollback. |
| Batch list | Primary | Migration batch store and events | Request approval, open detail. |
| Batch detail | Primary/detail | Batch/job/stage/events/readiness | Run/resume only with approved evidence; retry/replay requests only with class/ref clarity. |
| Site list | Primary | Site operational projection | Bulk actions disabled unless gates are satisfied per item. |
| Site detail drawer/page | Primary/detail | Site, job, runtime, review, domain, approval, incident, cost refs | One-site decision context. |
| Hosting detail | Drilldown | Runtime store/readiness/domain/asset diagnostics | Recheck only if role, domain action approval, audit, freshness policy are clear. |
| Content review | Drilldown | Content slots/overrides/history and preview refs | Content actions only through content source APIs and approvals. |
| Workspace/WU/VCU | Drilldown | Read-only projections over evidence | Review only. |
| Evolution/Generated Proposal Bundle | Drilldown | Immutable proposal/review artifacts | Advisory/review only, no MVP promotion. |
| Provider/admin pages | Drilldown | Provider snapshots/control-plane evidence | Read-only or future ADR-gated. |
| Audit timeline | Drilldown | Audit/event stores | Read-only event reconstruction. |

## Drilldown Map

| Command Center signal | Drilldown destination | Purpose |
| --- | --- | --- |
| Intake blocked | Intake row/site detail | Correct missing owner/source/class/domain data. |
| Duplicate detected | Site/domain conflict detail | Resolve ownership or domain conflict with evidence. |
| Batch failed/paused | Batch detail and failure group | Review events, failed jobs, pause reason, recovery plan. |
| Import failed | Migration job detail and stage timeline | Inspect failed stage, diagnostics, retry/replay class. |
| Capture degraded | Capture diagnostics, WU/VCU, preview | Review raw/rendered evidence and visible risk. |
| Route review needed | Route coverage/multipage evidence | Inspect route map, missing links, SEO concerns. |
| Preview failed | Preview smoke/readiness drilldown | Inspect failed routes/assets/runtime errors. |
| Review/content needed | Preview, content review, Workspace | Inspect fidelity/content blockers and draft overrides. |
| Approval needed | Evidence package view | Show exact approval type, approver role, evidence, expiry. |
| Domain action needed | Hosting/domain readiness view | Show domain binding, DNS instructions, Vercel status, freshness. |
| Publish readiness failed | Publish readiness view | Show missing gates and prohibited publish reasons. |
| Publish failed | Incident/recovery and publish event detail | Show before/after pointer, failure, rollback options. |
| Rollback needed | Incident/recovery and rollback target view | Select known-good target and approval path. |
| Cost anomaly | Cost/anomaly view | Show estimate, actual events, thresholds, exception state. |
| Asset/storage issue | Hosting asset diagnostics | Show object refs, hashes, missing files, persistence evidence. |
| External workflow update | External reference view | Show external link/snapshot and stale label. |
| AI plan review | AI advisory evidence view | Review plan bundle and decide human next step. |

## Operator Role Model

| Role | Visible scope | Allowed action families | Must not do in MVP |
| --- | --- | --- | --- |
| Superadmin | All agencies/clients/sites | Cross-client conflict decisions, critical exceptions, publish/rollback emergency governance, cost exceptions | Hidden provider/DNS/billing/AI mutation or unrecorded approvals. |
| Agency owner/admin | Agency portfolio | Batch approval within agency policy, client coordination, cost review, launch accountability | Bypass technical readiness, approval, audit, or source-of-truth constraints. |
| Migration operator | Assigned batches/sites | Intake correction, classification, dry-run review, batch execution monitoring, retry/replay requests | Publish, rollback, DNS/provider mutation, autonomous execution. |
| Technical operator | Runtime/domain/publish/rollback readiness | Capture/runtime/domain triage, readiness checks, incident recovery recommendation | Registrar mutation or provider execution without future ADR. |
| Content operator | Review/content blockers | Content correction workflow and preview/content readiness | Public publish or launch approval by UI badge. |
| Account manager | Client/external follow-up | Approval routing, external workflow references, client/domain owner follow-up | Runtime/domain/publish mutation. |
| Client reviewer | Client-visible previews/content | Review, change request, acceptance when policy allows | Direct runtime mutation. |
| System/worker | Explicit approved jobs/checks | Deterministic/variance-labeled stage execution | Approval, publish, rollback, DNS, billing, provider, or autonomous AI mutation. |

## State Aggregation Model

Command Center aggregates state in this order:

1. Resolve scope: agency, client, site, role.
2. Resolve canonical site operational state from MVP-1 state sources.
3. Resolve batch/job/stage state from BMF stores and events.
4. Resolve review/content/approval/domain/publish/rollback/cost/incident blockers.
5. Label provider, domain, external, cost, and preview signals with freshness.
6. Derive next required action and prohibited actions with reasons.
7. Derive Ops Inbox items from blockers and required actions.
8. Link evidence and audit refs for every displayed decision/action.

Read-model status cannot collapse distinct states when actions differ. For example, `preview_ready`, `approval_pending`, `approved_for_launch`, `domain_ready`, and `publish_ready` must not be represented as one generic "ready" action state.

## Action Boundary Model

Every displayed action must include:

- canonical source-of-truth state used to decide eligibility;
- actor role and agency/client/site scope;
- approval requirement and approval ref or missing-approval reason;
- audit event that will be written;
- evidence package refs shown to the actor;
- freshness requirement for every external/provider/domain/cost signal used;
- prohibited reason when disabled;
- replay class for retry/replay actions;
- side-effect class for publish/rollback/domain actions.

Actions launched from read models must route through source-owned domain workflows. Command Center and Ops Inbox may present the action, but they cannot own the mutation.

## Approval Boundary Model

Approval is required for:

- batch start or high/critical batch resume;
- dry-run waiver;
- retry/replay after failure;
- unsupported, import-only, degraded, route, form, widget, booking, SEO, or heavy-JavaScript exceptions;
- client/content/launch signoff;
- domain action or domain exception;
- publish activation;
- rollback;
- cost exception;
- critical cancellation or closeout after incident.

Approval cannot be inferred from dry-run, preview availability, a green readiness check, thumbnail existence, AI/provider output, Generated Proposal Bundle existence, Command Center badge, Ops Inbox item, or external workflow snapshot.

## Audit Boundary Model

Audit is required for:

- intake creation/correction/validation;
- classification and exceptions;
- dry-run start/completion/failure/waiver;
- batch create/start/pause/resume/cancel/complete/archive;
- job/stage start/success/failure/retry/replay;
- degraded capture, route review, preview failure, content change request;
- approval request/grant/reject/revoke/supersede;
- domain instruction generation, domain check, client DNS action evidence, domain exception;
- publish request/readiness/pass/fail/activation;
- rollback request/target/completion/verification;
- incident open/update/resolve;
- cost anomaly/exception;
- external workflow ref link/snapshot/use;
- AI advisory bundle review when used.

Audit refs displayed in Command Center may be federated in MVP, but the UI must label missing or partial timelines.

## Freshness And Staleness Model

| Signal class | Freshness requirement | Staleness indicator |
| --- | --- | --- |
| Canonical DB state | Current transaction/read timestamp | Show read generated-at and fallback mode if partial. |
| Migration events | Latest event timestamp per batch/job | Stale when running/paused with no new event beyond policy. |
| Dry-run | Valid only for unchanged intake/batch plan/rules version | Stale when inputs, classification, policy, or source refs changed. |
| Preview/readiness | Valid only for referenced version/artifact/content refs | Stale when refs change or TTL expires. |
| Domain/DNS/Vercel | Valid only for latest check/instruction timestamp under domain policy | Stale when last check exceeds TTL or instructions predate provider change. |
| Cost | Valid for defined period and event completeness | Stale/partial when event tables unavailable or latest signal missing. |
| External workflow | Snapshot only | Stale unless synced or manually confirmed within policy. |
| AI advisory | Immutable advisory bundle | Superseded when newer evidence or canonical state changes. |

Stale signals may inform triage, but they must not enable publish, rollback, domain, approval, or retry/replay actions without an explicit policy.

## Error And Empty-State Model

| State | Required behavior |
| --- | --- |
| Empty portfolio | Explain no sites are in scope and link to intake/planning drilldown. |
| Empty batch list | Explain no durable batches exist; no fake batch state. |
| Empty Ops Inbox | State no derived work items currently exist from readable canonical state. |
| Missing read dependency | Show degraded/fallback read mode, missing dependency, and blocked actions. |
| Missing evidence ref | Disable gated action and create/reveal `recovery_evidence_needed` or specific item. |
| Permission denied | Show not visible or disabled with role reason; never imply approval missing only. |
| Stale provider/domain/cost signal | Label stale and disable dependent side-effect actions. |
| Conflicting state | Prefer blocked/needs attention; show source refs and require triage. |

## Cost Visibility Model

Cost visibility is internal operating visibility:

- batch/site estimates from dry-run or cost projections;
- observed AI, runtime, and migration cost events;
- data-quality flags for partial/no signal;
- threshold and anomaly status;
- retry/replay cost accumulation;
- cost exception approval refs.

It is not full Stripe/customer billing. Stripe remains external truth for customer billing where applicable.

## Domain And DNS Visibility Model

Command Center may show:

- intended domain and owner notes;
- runtime domain host binding state;
- internal/working domain state;
- DNS instruction snapshots;
- Vercel domain check state;
- verification record requirements;
- last checked timestamp, stale label, diagnostics, and client DNS action owner.

Command Center must not claim registrar ownership, live DNS-zone mutation, Openprovider live mutation, autonomous DNS correction, or external DNS truth. Domain/DNS actions are approval-gated and audit-gated.

## Publish And Rollback Visibility Model

Publish readiness is a derived projection. Publish activation is a separate side effect.

Publish views must show:

- approved site version/artifact/published override refs;
- site class and launch eligibility;
- preview/readiness snapshot;
- domain readiness or exception;
- rollback target/recovery plan;
- incident and cost status;
- approval refs and audit dependencies;
- prohibited reasons.

Rollback views must show:

- incident or publish failure reason;
- known-good target version/artifact/content history;
- before/after active pointer or content refs;
- approval and audit requirements;
- post-action verification state.

Rollback is recovery, not deterministic replay.

## Asset And Storage Visibility Model

Asset/storage visibility must expose evidence health without changing storage:

- runtime/raw artifact id;
- file map, persisted asset count, external fallback count;
- byte size/hash/content type refs when available;
- missing/failed asset diagnostics;
- capture refs and artifact lineage;
- replayability of source inputs.

CCO-1 does not implement object storage, Supabase Storage changes, Vercel Blob, or asset migration.

## External Workflow Reference Visibility Model

External workflow references may appear as links/snapshots to tickets, sheets, CRM records, emails, files, or project tasks. External systems remain authoritative for their own records.

Command Center may show:

- reference type, external id/link, owner, last synced/confirmed timestamp;
- related site/batch/work item;
- whether a follow-up is required;
- stale/snapshot warning.

External references must not approve GNR8 actions unless a GNR8 approval record cites them as evidence.

## Future AI Advisory Visibility Model

Future AI advisory items may appear only as read-only evidence-linked plans:

- immutable input refs and output bundle refs;
- model/provider/config/cost refs when available;
- recommendation summary and confidence/limitations;
- human review status;
- allowed human next actions.

AI advisory output must not mutate runtime, approvals, billing, domains, provider state, external workflows, publish, rollback, Workspace, Evolution, thumbnails, or Generated Proposal Bundles in MVP.

## Implementation Prerequisites

Before implementation expands Command Center or builds Ops Inbox:

1. Canonical approval persistence model.
2. Unified audit event taxonomy and event-store strategy.
3. Read model generation/freshness policy.
4. Ops Inbox derivation engine contract.
5. Domain/DNS stale-status and manual completion evidence policy.
6. Cost threshold/anomaly policy.
7. Incident/recovery persistence model.
8. External workflow reference model.
9. Action gating contract shared by UI/API/domain services.
10. Retry/replay input bundle contract.

## Architecture Risks

- Existing coarse read-model statuses could enable actions without enough evidence.
- Existing bulk actions may blur batch execution, approval, publish, and source-of-truth ownership if expanded without gates.
- Fragmented admin pages can compete with Command Center unless treated as drilldowns.
- Stale domain/DNS/Vercel/cost signals can mislead launch decisions.
- Missing unified approval and audit models can make publish/rollback decisions ambiguous.
- Ops Inbox could become an independent task store if manual close/dismiss is not constrained.
- Cost visibility could be mistaken for full customer billing.
- Workspace/Evolution/Generated Proposal Bundles/AI outputs could be mistaken for production truth.

## Explicit Deferrals

- Command Center implementation.
- Ops Inbox implementation.
- Read model tables/materialization.
- Approval persistence implementation.
- Audit taxonomy implementation.
- Incident/recovery implementation.
- Bulk Migration Factory implementation.
- Queue workers, leases, heartbeats, schedulers, and autonomous batch execution.
- Domain/DNS operating model implementation.
- Live registrar/DNS mutation and Openprovider live mutation.
- Full Stripe/customer billing.
- Publish/rollback implementation changes.
- Asset storage migration, Vercel Blob, or Supabase Storage changes.
- Workspace, Evolution, thumbnail, Generated Proposal Bundle, AI, provider, billing, DNS, runtime, worker, queue, or deployment changes.
