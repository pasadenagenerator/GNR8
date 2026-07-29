# GNR8 Single-Site State Schema Design

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: SQL-level persistence design for future single-site migration state core

This document is documentation and architecture only. It does not create SQL migrations or change runtime behavior.

## Recommendation

Create a new `gnr8_single_site_*` persistence family instead of reusing `gnr8_migration_jobs` or `gnr8_migration_batches`.

Reason: existing migration job/batch tables encode MVP-1/BMF stages such as `SNAPSHOT`, `LAYOUT_GRAPH`, `CANONICAL`, `QUALITY_GATE`, and `SHADOW_BIND_READY`. The corrected MVP needs a single-site product workflow from candidate creation through closeout. Reusing batch/job vocabulary would preserve the source-of-truth ambiguity MVP-4 is meant to remove.

Recommended tables:

- `public.gnr8_single_site_migrations`
- `public.gnr8_single_site_migration_state_events`
- `public.gnr8_single_site_migration_refs`
- `public.gnr8_single_site_migration_stage_summaries`
- `public.gnr8_single_site_migration_blockers`
- `public.gnr8_single_site_migration_closeouts`

Source evidence review tables are designed separately in `docs/architecture/gnr8-source-evidence-review-schema-design.md`.

## Shared Vocabulary

### Current State

The schema must cover all MVP-2 states:

`site_candidate_created`, `source_capture_started`, `source_capture_completed`, `source_capture_failed`, `source_evidence_review_required`, `clone_generation_started`, `clone_generation_completed`, `clone_review_required`, `clone_revision_required`, `improvement_proposal_started`, `improvement_proposal_ready`, `improvement_proposal_approved`, `improvement_proposal_rejected`, `improvement_implementation_started`, `improvement_implementation_completed`, `improved_preview_ready`, `content_review_required`, `content_approved`, `domain_readiness_required`, `domain_readiness_ready`, `subscription_required`, `subscription_created`, `hosting_entitlement_ready`, `launch_approval_required`, `publish_ready`, `published`, `rollback_available`, `migration_closed_out`, `migration_failed`, `migration_cancelled`.

### Stage

Use normalized stages for querying:

`intake`, `source_capture`, `source_evidence_review`, `clone`, `proposal`, `improvement_content`, `domain_commercial_readiness`, `launch_publish_recovery`, `terminal`.

### Actor Types

Align with AAF/DDOM:

`human`, `system`, `provider`, `external_reference`, `ai_advisory`.

### Privacy And Retention

Align with AAF/DDOM/PTT:

Privacy labels: `public_operational`, `internal_operational`, `client_confidential`, `credential_sensitive`, `billing_sensitive`, `provider_sensitive`, `legal_sensitive`.

Retention classes: `short_operational`, `mvp_operational`, `security`, `compliance_long`, `legal_hold`.

Default recommendation: `client_confidential` and `compliance_long` for migration state and evidence-related refs; `billing_sensitive` for rows that include Stripe/payment refs; `public_operational` only for public URL/status summaries that do not disclose sensitive evidence.

## `gnr8_single_site_migrations`

Purpose: one canonical current-state row per single-site migration.

Canonical status: canonical for current single-site migration operational state.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Durable migration id. |
| `tenant_id text not null` | AAF-style tenant scope. |
| `agency_id uuid null` | FK to `agencies(id)` when available. |
| `client_id uuid not null` | FK to `organizations(id)` when available; must identify selected client. |
| `ownership_site_id uuid null` | FK to `sites(id)` when available. |
| `runtime_site_id text null` | FK to `gnr8_runtime_sites(id)` conditionally when available. |
| `source_url text not null` | Original public website URL at intake. |
| `canonical_source_url text null` | Normalized source URL after capture/canonicalization. |
| `intended_launch_domain text null` | Domain intent, not DNS truth. |
| `current_state text not null` | Exact MVP state. |
| `current_stage text not null` | Normalized stage. |
| `state_version integer not null default 1` | Optimistic concurrency/versioning for current-state row. |
| `operator_owner_actor_id text null` | Current owner. |
| `current_blocker_count integer not null default 0` | Derived from open blockers by writer transaction. |
| `latest_source_evidence_review_id uuid null` | FK to source evidence review table after MVP-5 adds it. |
| `latest_aaf_evidence_package_id uuid null` | AAF evidence package ref. |
| `latest_aaf_audit_event_id uuid null` | Latest transition audit event ref. |
| `latest_state_event_id uuid null` | Latest state event ref. |
| `validation_site_number integer null` | Optional 1-20 validation sequence number. |
| `created_by_actor_type text not null` | Actor type. |
| `created_by_actor_id text not null` | Actor id. |
| `created_at timestamptz not null default now()` | Creation time. |
| `updated_at timestamptz not null default now()` | Last current-row update time. |
| `terminal_at timestamptz null` | Set for closed, failed terminal no-go, or cancelled. |
| `correlation_id text not null` | Trace across state/evidence writes. |
| `causation_id text null` | Parent operation/event id. |
| `idempotency_key text not null` | Creation idempotency. |
| `request_id text null` | Route/request id where applicable. |
| `privacy_label text not null default 'client_confidential'` | Storage privacy label. |
| `retention_class text not null default 'compliance_long'` | Retention label. |
| `metadata_json jsonb not null default '{}'::jsonb` | Bounded metadata only. |

Constraints:

- `current_state` check covering all MVP states.
- `current_stage` check covering normalized stages.
- state/stage mapping check, ideally via immutable SQL function or explicit check where maintainable.
- actor, privacy, retention checks aligned with AAF.
- `jsonb_typeof(metadata_json) = 'object'`.
- `source_url` and `idempotency_key` non-empty checks.
- `current_blocker_count >= 0`.
- terminal states require `terminal_at is not null`; non-terminal states require `terminal_at is null`.
- unique `idempotency_key`.
- optional semantic uniqueness for active non-terminal migrations: one open migration per `(client_id, lower(canonical_source_url or source_url))`, with careful partial unique index.

Indexes:

- `(client_id, updated_at desc)`
- `(ownership_site_id, updated_at desc)` where not null
- `(runtime_site_id, updated_at desc)` where not null
- `(current_state, updated_at desc)`
- `(current_stage, updated_at desc)`
- `(operator_owner_actor_id, updated_at desc)` where not null
- `(validation_site_number)` where not null
- `(correlation_id)`
- partial terminal index `(terminal_at desc)` where terminal

RLS posture:

- Enable RLS.
- MVP-5 should create no broad policies by default, matching AAF/DDOM/PTT persistence-core posture.
- Future server-only repositories use service/superadmin access.
- Future read policies may allow agency/client scoped reads only after redaction review.

Mutation model:

- Mutable current-state row.
- Only server-side writer/repository may update it.
- Every current-state update must be accompanied by an append-only state event in the same transaction.

Migration safety notes:

- Additive table only.
- Conditional FKs for runtime tables are acceptable where environments may not have runtime tables from pure migration replay.
- No backfill from existing batch/job tables in MVP-5.

## `gnr8_single_site_migration_state_events`

Purpose: append-only state transition and audit ledger for the migration spine.

Canonical status: canonical transition history for single-site migration operational state.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Event id. |
| `migration_id uuid not null` | FK to migrations. |
| `event_index integer not null` | Monotonic per migration. |
| `from_state text null` | Null only for creation. |
| `to_state text not null` | New state. |
| `from_stage text null` | Prior normalized stage. |
| `to_stage text not null` | New normalized stage. |
| `transition_key text not null` | Stable semantic key such as `source.capture.completed`. |
| `transition_reason text null` | Human-readable reason. |
| `required_refs_json jsonb not null default '{}'::jsonb` | Snapshot of required refs checked. |
| `missing_requirements_json jsonb not null default '[]'::jsonb` | Empty when transition allowed. |
| `actor_type text not null` | Actor type. |
| `actor_id text not null` | Actor id. |
| `actor_role text not null` | Role used for authorization. |
| `aaf_audit_event_id uuid null` | AAF audit ref. |
| `aaf_evidence_package_id uuid null` | AAF evidence package ref. |
| `aaf_approval_request_id uuid null` | Approval request ref when relevant. |
| `aaf_approval_decision_id uuid null` | Approval decision ref when required. |
| `source_watermark text null` | Source watermark for transition basis. |
| `before_ref_json jsonb not null default '{}'::jsonb` | Before refs. |
| `after_ref_json jsonb not null default '{}'::jsonb` | After refs. |
| `correlation_id text not null` | Correlation id. |
| `causation_id text null` | Causation id. |
| `idempotency_key text not null` | Unique operation key. |
| `request_id text null` | Request id. |
| `privacy_label text not null default 'client_confidential'` | Privacy label. |
| `retention_class text not null default 'compliance_long'` | Retention class. |
| `created_at timestamptz not null default now()` | Event time. |

Constraints:

- unique `(migration_id, event_index)`.
- unique `idempotency_key`.
- state and stage checks.
- `from_state is null` only when `transition_key = 'migration.created'`.
- JSON shape checks for refs/requirements.
- append-only trigger preventing update/delete.

Indexes:

- `(migration_id, event_index asc)`
- `(migration_id, created_at asc)`
- `(to_state, created_at desc)`
- `(transition_key, created_at desc)`
- `(correlation_id)`
- `(aaf_audit_event_id)` where not null
- `(aaf_approval_decision_id)` where not null

RLS posture:

- Enable RLS, no public policies in persistence core.

Mutation model:

- Append-only.
- Corrections are compensating events, never updates.

Migration safety notes:

- Create append-only trigger function shared with related append-only spine tables or module-specific function `gnr8_single_site_prevent_update_delete()`.

## `gnr8_single_site_migration_refs`

Purpose: polymorphic durable refs from the migration to source-owned records.

Canonical status: canonical link table for migration refs; referenced systems remain canonical for their own records.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Ref id. |
| `migration_id uuid not null` | FK to migrations. |
| `state_event_id uuid null` | Optional FK to state event that introduced the ref. |
| `ref_role text not null` | Semantic role. |
| `ref_type text not null` | Logical ref type. |
| `source_system text not null default 'gnr8'` | Source system. |
| `source_table text null` | Source table when local. |
| `source_record_id text not null` | Source id as text. |
| `source_version text null` | Version/policy version/updated timestamp. |
| `source_watermark text null` | Captured source watermark. |
| `captured_at timestamptz null` | Capture time of source ref. |
| `fresh_until timestamptz null` | Optional freshness. |
| `metadata_json jsonb not null default '{}'::jsonb` | Bounded metadata. |
| `privacy_label text not null default 'client_confidential'` | Privacy. |
| `retention_class text not null default 'compliance_long'` | Retention. |
| `created_at timestamptz not null default now()` | Created time. |

Recommended `ref_role` check values:

`ownership_site`, `runtime_site`, `runtime_site_version_clone`, `runtime_site_version_improved`, `runtime_artifact_clone`, `runtime_artifact_improved`, `raw_template_artifact`, `content_slot`, `content_override`, `capture_run`, `render_job`, `source_evidence_package`, `source_evidence_review`, `clone_review`, `clone_revision`, `proposal_artifact`, `proposal_approval`, `content_approval`, `domain_binding`, `ddom_readiness_snapshot`, `publish_target`, `pasr_shadow_result`, `subscription`, `hosting_entitlement`, `billing_account`, `cost_center`, `stripe_customer`, `stripe_subscription`, `publish_event`, `active_pointer`, `rollback_target`, `aaf_evidence_package`, `aaf_approval_request`, `aaf_approval_decision`, `aaf_policy_evaluation`, `aaf_audit_event`, `external_reference`.

Constraints:

- unique `(migration_id, ref_role, source_system, coalesce(source_table, ''), source_record_id, coalesce(source_watermark, ''))`.
- JSON object check.
- privacy/retention checks.

Indexes:

- `(migration_id, ref_role)`
- `(source_system, source_table, source_record_id, source_watermark)`
- `(state_event_id)` where not null
- `(fresh_until)` where not null

RLS posture:

- Enable RLS, no broad policies in MVP-5.

Mutation model:

- Append-only preferred.
- Superseded refs should be represented by new refs plus state events/stage summaries; do not update old refs.

Migration safety notes:

- Do not add FKs for polymorphic source refs except `migration_id` and optional `state_event_id`.

## `gnr8_single_site_migration_stage_summaries`

Purpose: compact stage-level summaries used by read models and closeout.

Canonical status: mutable projection owned by the spine writer; not a replacement for events/refs.

Key fields:

| Field | Design |
| --- | --- |
| `migration_id uuid not null` | FK to migrations. |
| `stage text not null` | Normalized stage. |
| `status text not null` | `not_started`, `in_progress`, `ready_for_review`, `accepted`, `accepted_with_limitations`, `blocked`, `failed`, `cancelled`, `completed`, `superseded`. |
| `started_at timestamptz null` | Stage start. |
| `completed_at timestamptz null` | Stage completion. |
| `latest_state_event_id uuid null` | Latest event. |
| `latest_evidence_ref_id uuid null` | Latest evidence ref. |
| `latest_approval_ref_id uuid null` | Latest approval ref. |
| `summary_json jsonb not null default '{}'::jsonb` | Bounded summary for read models. |
| `blocker_count integer not null default 0` | Open blockers in this stage. |
| `updated_at timestamptz not null default now()` | Last update. |

Primary key: `(migration_id, stage)`.

Constraints:

- stage and status checks.
- JSON object check.
- `blocker_count >= 0`.

Indexes:

- `(stage, status, updated_at desc)`
- `(migration_id, updated_at desc)`

RLS posture:

- Enable RLS, no broad policies in persistence core.

Mutation model:

- Mutable projection, only updated by state writer/repository in same transaction as events.

Migration safety notes:

- Keep summary JSON bounded; do not store heavy screenshots, DOM, or full proposal content.

## `gnr8_single_site_migration_blockers`

Purpose: canonical current blockers/exceptions that drive Ops Inbox projections.

Canonical status: canonical for migration blockers within the state spine; source systems remain canonical for referenced facts.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Blocker id. |
| `migration_id uuid not null` | FK to migrations. |
| `state_event_id uuid null` | Event that opened/updated/superseded blocker. |
| `blocker_key text not null` | Stable idempotent key, for example `source_evidence:missing_fonts`. |
| `blocker_type text not null` | Category. |
| `severity text not null` | `p0`, `p1`, `p2`, `p3`, `info`. |
| `status text not null default 'open'` | `open`, `resolved`, `superseded`, `accepted_risk`, `cancelled`. |
| `owner_role text null` | Suggested owner role. |
| `opened_at timestamptz not null default now()` | Opened time. |
| `resolved_at timestamptz null` | Resolution time. |
| `resolution_state_event_id uuid null` | Event that resolved it. |
| `resolution_aaf_audit_event_id uuid null` | Audit ref. |
| `resolution_aaf_approval_decision_id uuid null` | Approval/exception ref. |
| `source_ref_json jsonb not null default '{}'::jsonb` | Source refs and watermarks. |
| `details_json jsonb not null default '{}'::jsonb` | Bounded details. |
| `ops_inbox_projection_key text null` | Stable derived item key. |
| `privacy_label text not null default 'client_confidential'` | Privacy. |
| `retention_class text not null default 'compliance_long'` | Retention. |
| `correlation_id text not null` | Correlation. |
| `idempotency_key text not null` | Unique write key. |
| `created_at timestamptz not null default now()` | Created. |
| `updated_at timestamptz not null default now()` | Updated. |

Recommended blocker types:

`intake_missing_client`, `source_capture_failed`, `source_evidence_missing`, `source_evidence_degraded`, `clone_fidelity_gap`, `clone_revision_required`, `proposal_approval_needed`, `content_approval_needed`, `domain_readiness_missing`, `domain_readiness_stale`, `subscription_missing`, `hosting_entitlement_missing`, `launch_approval_missing`, `publish_activation_approval_missing`, `rollback_evidence_missing`, `audit_evidence_gap`, `closeout_required`.

Constraints:

- unique `(migration_id, blocker_key)` for current blocker identity.
- unique `idempotency_key`.
- status/severity/type checks.
- `resolved_at is not null` when status is resolved/superseded/accepted_risk/cancelled.
- JSON object checks.

Indexes:

- `(migration_id, status, severity)`
- `(status, severity, updated_at desc)`
- `(owner_role, status, updated_at desc)` where owner exists
- `(ops_inbox_projection_key)` where not null

RLS posture:

- Enable RLS, no broad policies in persistence core.

Mutation model:

- Mutable current blocker row is acceptable because Ops Inbox needs current status.
- Every blocker status change must write a state event or audit-linked blocker event; MVP-5 may choose append-only `gnr8_single_site_migration_blocker_events` if implementation wants stricter replay. If not, blocker transitions must be represented in `gnr8_single_site_migration_state_events.required_refs_json`/`after_ref_json`.

Migration safety notes:

- Do not let Ops Inbox write this table directly. Only state writer/repository can open/resolve/supersede blockers.

## `gnr8_single_site_migration_closeouts`

Purpose: final per-site validation and operational closeout.

Canonical status: canonical closeout record for a single migration.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Closeout id. |
| `migration_id uuid not null unique` | One closeout per migration. |
| `status text not null default 'draft'` | `draft`, `completed`, `superseded`, `invalid`. |
| `final_url text null` | Final public URL or no-go URL status. |
| `outcome text not null` | `published_success`, `published_with_limitations`, `no_go`, `cancelled`, `failed`, `internal_rehearsal_only`. |
| `validation_site_number integer null` | 20-site validation index. |
| `metrics_json jsonb not null default '{}'::jsonb` | Capture/clone/proposal/domain/billing/publish/rollback metrics. |
| `issue_taxonomy_json jsonb not null default '[]'::jsonb` | MVP issue codes. |
| `evidence_summary_json jsonb not null default '{}'::jsonb` | Refs summary only. |
| `exceptions_json jsonb not null default '[]'::jsonb` | Accepted exceptions. |
| `lessons_json jsonb not null default '{}'::jsonb` | Operator lessons. |
| `aaf_evidence_package_id uuid null` | Closeout evidence package ref. |
| `aaf_approval_decision_id uuid null` | Closeout approval if required. |
| `aaf_audit_event_id uuid null` | Closeout audit. |
| `closed_by_actor_type text not null` | Actor type. |
| `closed_by_actor_id text not null` | Actor id. |
| `closed_at timestamptz not null default now()` | Closeout time. |
| `correlation_id text not null` | Correlation. |
| `idempotency_key text not null` | Unique. |
| `privacy_label text not null default 'client_confidential'` | Privacy. |
| `retention_class text not null default 'compliance_long'` | Retention. |
| `created_at timestamptz not null default now()` | Created. |

Constraints:

- unique `idempotency_key`.
- status/outcome/actor/privacy/retention checks.
- JSON shape checks.
- `validation_site_number` positive when present.

Indexes:

- `(outcome, closed_at desc)`
- `(validation_site_number)` where not null
- `(aaf_evidence_package_id)` where not null

RLS posture:

- Enable RLS, no broad policies in persistence core.

Mutation model:

- Prefer append-only closeout revisions through supersession. Initial `draft` can be mutable only before `completed`.
- Completed closeout should not be updated; corrections should create a new closeout row that supersedes the old row if a `supersedes_closeout_id` field is added.

Migration safety notes:

- MVP-5 can include `supersedes_closeout_id uuid null references ...` if closeout correction is needed immediately.

## Idempotency Strategy

Every write operation must include an `idempotency_key`. The repository must:

- return the existing row when the idempotency key and semantic payload match;
- throw an idempotency conflict when the key matches but the semantic payload differs;
- use deterministic keys for system transitions where possible, such as `single-site:<migration-id>:source-evidence:<review-id>:accepted`;
- never rely on UI-generated random ids alone for privileged transitions.

## Audit Strategy

Every state transition must either:

- reference an AAF audit event written in the same logical operation; or
- be part of MVP-5 persistence core where audit refs are nullable but required by the MVP-6 transition service before integration.

For implementation, MVP-6 should fail closed when required AAF audit refs are missing for transitions beyond creation and harmless draft updates.

## Append-Only Strategy

Append-only required:

- `gnr8_single_site_migration_state_events`;
- `gnr8_single_site_migration_refs` unless a later implementation creates explicit supersession fields;
- source evidence package/ref tables.

Mutable with event-backed changes:

- `gnr8_single_site_migrations` current row;
- `gnr8_single_site_migration_stage_summaries`;
- `gnr8_single_site_migration_blockers` current status rows;
- draft closeouts only before completion.

## RLS And Access

Persistence core should enable RLS and add no broad public policies. Future access should be server-only first:

- writer repository: service/superadmin pool only;
- read repository: service/superadmin pool with explicit redaction in read model;
- UI: no direct table writes;
- client-visible future projections: separate redacted views or API endpoints after access review.

## SQL Migration Milestones

MVP-5 should implement additive schema only:

1. Create shared check vocabulary as inline constraints or small SQL functions.
2. Create the six state-spine tables.
3. Create append-only trigger function and attach to event/ref tables.
4. Enable RLS with no broad policies.
5. Add indexes and constraints.
6. Add static/disposable DB tests only.

MVP-5 must not backfill from batch/job tables, call external providers, integrate runtime, or create routes.

## Implementation Service Boundaries For MVP-6

MVP-6 should add server-only repository/service code:

- `SingleSiteMigrationRepository`: create migration, read current row, write transition in transaction, manage refs/blockers/stage summaries.
- `SingleSiteTransitionService`: validate state machine, required refs, actor role, idempotency, AAF audit/approval refs, forbidden shortcuts.
- `SourceEvidenceReviewRepository`: write source evidence reviews and refs.
- `SingleSiteReadModelRepository`: read-only projection for Command Center/Ops Inbox later.

No client, route, worker, capture, clone, proposal, billing, domain, publish, or rollback integration should be added until the persistence and writer contracts are proven.
