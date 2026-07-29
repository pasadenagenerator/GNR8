# GNR8 Source Evidence Review Schema Design

Date: 2026-07-29
Phase: MVP-4 documentation architecture
Scope: SQL-level persistence design for source evidence package review

This document is documentation and architecture only. It does not implement SQL migrations, capture behavior, clone behavior, routes, workers, storage changes, or provider calls.

## Purpose

Source evidence review is the canonical gate between source capture and clone generation for the corrected single-site MVP.

Capture completion means the system produced evidence refs. It does not mean the evidence is sufficient for a faithful clone. A migration may proceed to clone generation only after a source evidence review is accepted, or accepted with explicitly scoped limitations and required AAF exception refs.

## Recommended Tables

Recommended persistence family:

- `public.gnr8_source_evidence_reviews`
- `public.gnr8_source_evidence_review_refs`
- `public.gnr8_source_evidence_review_items`
- `public.gnr8_source_evidence_review_events`

These tables should be linked to `gnr8_single_site_migrations` but remain focused on evidence review. The state spine should store the latest accepted review ref and transition state based on review outcome.

## Status Vocabulary

Review statuses:

- `not_started`
- `ready_for_review`
- `review_in_progress`
- `accepted`
- `accepted_with_limitations`
- `retry_required`
- `rejected`
- `superseded`

Completeness statuses:

- `unknown`
- `complete`
- `complete_with_warnings`
- `degraded`
- `missing_required_evidence`
- `unusable`

Review decisions:

- `accept`
- `accept_with_limitations`
- `retry_capture`
- `reject_source`
- `supersede`

## Evidence Categories

The schema must cover evidence categories required by MVP-2:

- source URL and canonical URL;
- capture run/job refs;
- captured pages and route map;
- captured screenshots and viewport metadata;
- rendered DOM/source/raw HTML refs;
- captured text refs;
- captured images/assets refs;
- captured fonts refs;
- captured style/layout/visual identity/CGP refs;
- metadata and SEO refs;
- diagnostics and error refs;
- source evidence package refs;
- AAF evidence package refs where applicable;
- external refs accepted as evidence where applicable.

## `gnr8_source_evidence_reviews`

Purpose: current canonical review decision for a source evidence package.

Canonical status: canonical for source evidence review truth. Capture artifacts remain source artifact truth; AAF remains approval/audit/evidence package truth.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Review id. |
| `migration_id uuid not null` | FK to `gnr8_single_site_migrations(id)`. |
| `tenant_id text not null` | Tenant scope. |
| `client_id uuid not null` | Selected client. |
| `ownership_site_id uuid null` | Ownership site. |
| `runtime_site_id text null` | Runtime site if available. |
| `source_url text not null` | Intake source URL. |
| `canonical_source_url text null` | Canonicalized URL if known. |
| `capture_run_id text null` | Capture/import run id when available. |
| `render_job_id text null` | `gnr8_site_render_jobs`/worker ref where applicable. |
| `source_evidence_package_key text not null` | Stable package key from capture/import. |
| `source_watermark text not null` | Evidence source watermark. |
| `capture_started_at timestamptz null` | Capture start. |
| `capture_completed_at timestamptz null` | Capture completion. |
| `evidence_captured_at timestamptz not null` | Evidence package timestamp. |
| `fresh_until timestamptz null` | Optional freshness. |
| `completeness_status text not null` | Completeness status. |
| `review_status text not null default 'not_started'` | Review status. |
| `review_decision text null` | Decision once reviewed. |
| `accepted_degraded_capture boolean not null default false` | True only for accepted-with-limitations degraded capture. |
| `retry_required boolean not null default false` | True when capture must be retried before clone generation. |
| `clone_generation_allowed boolean not null default false` | Derived by repository from decision and required refs. |
| `review_limitations_json jsonb not null default '[]'::jsonb` | Accepted limitations. |
| `missing_evidence_json jsonb not null default '[]'::jsonb` | Missing required evidence. |
| `diagnostics_json jsonb not null default '{}'::jsonb` | Bounded diagnostics summary. |
| `reviewer_actor_type text null` | Reviewer actor type. |
| `reviewer_actor_id text null` | Reviewer id. |
| `reviewer_role text null` | Reviewer role. |
| `review_started_at timestamptz null` | Review start. |
| `reviewed_at timestamptz null` | Review decision time. |
| `supersedes_review_id uuid null` | Prior review superseded by newer capture/review. |
| `superseded_by_review_id uuid null` | Newer review id. |
| `aaf_evidence_package_id uuid null` | AAF evidence package ref. |
| `aaf_approval_request_id uuid null` | Degraded/exception approval request if applicable. |
| `aaf_approval_decision_id uuid null` | Degraded/exception approval decision if applicable. |
| `aaf_audit_event_id uuid null` | Review decision audit ref. |
| `privacy_label text not null default 'client_confidential'` | Privacy label. |
| `retention_class text not null default 'compliance_long'` | Retention class. |
| `correlation_id text not null` | Correlation id. |
| `causation_id text null` | Causation id. |
| `idempotency_key text not null` | Unique idempotency key. |
| `request_id text null` | Request id. |
| `created_at timestamptz not null default now()` | Created. |
| `updated_at timestamptz not null default now()` | Updated. |

Constraints:

- unique `idempotency_key`.
- unique semantic package key `(migration_id, source_evidence_package_key, source_watermark)`.
- status checks for review/completeness/decision/actor/privacy/retention.
- `review_decision is not null` when `review_status` is terminal except `superseded`.
- `reviewed_at is not null` when status is `accepted`, `accepted_with_limitations`, `retry_required`, or `rejected`.
- `reviewer_actor_type`, `reviewer_actor_id`, and `reviewer_role` required for terminal human review decisions.
- `clone_generation_allowed = true` only when status is `accepted` or `accepted_with_limitations`.
- `accepted_degraded_capture = true` only when status is `accepted_with_limitations`.
- if `accepted_degraded_capture = true`, require `aaf_approval_decision_id is not null` unless a future policy evaluation says approval is not required.
- if status is `retry_required`, require `retry_required = true` and `clone_generation_allowed = false`.
- JSONB shape checks: limitations/missing arrays, diagnostics object.

Indexes:

- `(migration_id, created_at desc)`
- `(migration_id, review_status, updated_at desc)`
- `(source_evidence_package_key, source_watermark)`
- `(capture_run_id)` where not null
- `(render_job_id)` where not null
- `(clone_generation_allowed, reviewed_at desc)`
- `(aaf_evidence_package_id)` where not null
- `(aaf_approval_decision_id)` where not null
- `(correlation_id)`

RLS posture:

- Enable RLS.
- No broad policies in MVP-5 persistence core.
- Server-only writer repository should own mutations.
- Future client/operator views should read redacted projections.

Mutation model:

- Mutable while review is in `not_started`, `ready_for_review`, or `review_in_progress`.
- Terminal decisions should not be edited. Corrections require a new review row with supersession refs.

Migration safety notes:

- Do not store heavy screenshots, DOM, full text dumps, fonts, or assets in this table. Store refs, hashes, watermarks, and summaries.

## `gnr8_source_evidence_review_refs`

Purpose: durable polymorphic refs to captured evidence.

Canonical status: canonical review ref ledger; target systems remain canonical for artifacts.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Ref id. |
| `review_id uuid not null` | FK to review. |
| `migration_id uuid not null` | FK to migration for lookup. |
| `ref_role text not null` | Evidence role. |
| `ref_type text not null` | Logical type. |
| `source_system text not null default 'gnr8'` | Source system. |
| `source_table text null` | Local source table when applicable. |
| `source_record_id text not null` | Source id/path/key. |
| `source_version text null` | Version or timestamp. |
| `source_watermark text null` | Source watermark. |
| `content_hash text null` | Hash when available. |
| `media_type text null` | Media type for file refs. |
| `captured_at timestamptz null` | Capture time. |
| `fresh_until timestamptz null` | Freshness. |
| `metadata_json jsonb not null default '{}'::jsonb` | Bounded metadata. |
| `privacy_label text not null default 'client_confidential'` | Privacy. |
| `retention_class text not null default 'compliance_long'` | Retention. |
| `created_at timestamptz not null default now()` | Created. |

Recommended `ref_role` values:

`capture_run`, `render_job`, `source_url`, `canonical_source_url`, `captured_page`, `route_map`, `screenshot`, `rendered_dom`, `raw_html`, `source_snapshot`, `text_extract`, `image_asset`, `asset_manifest`, `font_ref`, `stylesheet_ref`, `layout_geometry`, `navigation_tree`, `section_boundary`, `visual_identity`, `cgp_signal`, `metadata`, `seo_metadata`, `diagnostic`, `limitation`, `source_evidence_package`, `aaf_evidence_package`, `aaf_audit_event`, `external_reference`.

Constraints:

- unique `(review_id, ref_role, source_system, coalesce(source_table, ''), source_record_id, coalesce(source_watermark, ''))`.
- content hash length check when present.
- JSON object check.
- privacy/retention checks.

Indexes:

- `(review_id, ref_role)`
- `(migration_id, ref_role)`
- `(source_system, source_table, source_record_id, source_watermark)`
- `(content_hash)` where not null

RLS posture:

- Enable RLS, no broad policies.

Mutation model:

- Append-only. Ref corrections use new review/supersession.

Migration safety notes:

- Polymorphic refs should not have broad FKs beyond review and migration.

## `gnr8_source_evidence_review_items`

Purpose: checklist-level completeness and reviewer findings by evidence category.

Canonical status: canonical for operator evidence review findings.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Item id. |
| `review_id uuid not null` | FK to review. |
| `migration_id uuid not null` | FK to migration. |
| `evidence_category text not null` | Category being reviewed. |
| `status text not null` | `present`, `present_with_warnings`, `missing`, `degraded`, `not_applicable`, `unverified`. |
| `required_for_clone boolean not null default true` | Whether missing blocks clone. |
| `blocks_clone_generation boolean not null default false` | Derived by repository. |
| `accepted_limitation boolean not null default false` | True if operator accepted limitation. |
| `finding_summary text null` | Short finding. |
| `ref_ids jsonb not null default '[]'::jsonb` | Review ref ids or source keys. |
| `limitation_json jsonb not null default '{}'::jsonb` | Limitation detail. |
| `reviewer_actor_id text null` | Reviewer for item if separate. |
| `created_at timestamptz not null default now()` | Created. |
| `updated_at timestamptz not null default now()` | Updated. |

Evidence categories:

`source_url`, `captured_pages`, `screenshots`, `rendered_dom`, `raw_html`, `text`, `images_assets`, `fonts`, `styles_layout`, `visual_identity_cgp`, `metadata_seo`, `navigation_routes`, `responsive_viewports`, `diagnostics`, `replay_package`.

Constraints:

- unique `(review_id, evidence_category)`.
- category/status checks.
- `blocks_clone_generation = true` only if `required_for_clone = true` and status is `missing`, `degraded`, or `unverified` without accepted limitation.
- JSON array/object checks.

Indexes:

- `(review_id, status)`
- `(migration_id, evidence_category)`
- `(blocks_clone_generation)` where true

RLS posture:

- Enable RLS, no broad policies.

Mutation model:

- Mutable until review terminal decision.
- After terminal decision, corrections require superseding review.

## `gnr8_source_evidence_review_events`

Purpose: append-only history for review lifecycle and item/ref changes.

Canonical status: canonical review event history.

Key fields:

| Field | Design |
| --- | --- |
| `id uuid primary key default gen_random_uuid()` | Event id. |
| `review_id uuid not null` | FK to review. |
| `migration_id uuid not null` | FK to migration. |
| `event_index integer not null` | Monotonic per review. |
| `event_type text not null` | Lifecycle event. |
| `from_status text null` | Previous review status. |
| `to_status text null` | New review status. |
| `actor_type text not null` | Actor type. |
| `actor_id text not null` | Actor id. |
| `actor_role text not null` | Actor role. |
| `details_json jsonb not null default '{}'::jsonb` | Bounded details. |
| `aaf_audit_event_id uuid null` | Audit event ref. |
| `aaf_approval_decision_id uuid null` | Decision ref for exceptions. |
| `correlation_id text not null` | Correlation. |
| `causation_id text null` | Causation. |
| `idempotency_key text not null` | Unique. |
| `privacy_label text not null default 'client_confidential'` | Privacy. |
| `retention_class text not null default 'compliance_long'` | Retention. |
| `created_at timestamptz not null default now()` | Created. |

Event types:

`review_created`, `evidence_ready_for_review`, `review_started`, `item_recorded`, `missing_evidence_recorded`, `limitation_recorded`, `degraded_capture_exception_linked`, `review_accepted`, `review_accepted_with_limitations`, `review_retry_required`, `review_rejected`, `review_superseded`.

Constraints:

- unique `(review_id, event_index)`.
- unique `idempotency_key`.
- event/status/actor/privacy/retention checks.
- JSON object check.
- append-only trigger preventing update/delete.

Indexes:

- `(review_id, event_index asc)`
- `(migration_id, created_at desc)`
- `(event_type, created_at desc)`
- `(aaf_audit_event_id)` where not null

RLS posture:

- Enable RLS, no broad policies.

Mutation model:

- Append-only.

## Clone Generation Gate

Clone generation may start only when:

- `gnr8_single_site_migrations.current_state` is `source_evidence_review_required` or a capture-complete equivalent approved for review transition;
- latest non-superseded `gnr8_source_evidence_reviews.review_status` is `accepted` or `accepted_with_limitations`;
- `clone_generation_allowed = true`;
- no review item has `blocks_clone_generation = true`;
- required refs exist for source URL, captured pages/route map, screenshots, DOM/source, text, images/assets, fonts/style/layout, visual identity/CGP, metadata, and diagnostics, or each missing/degraded category has an accepted limitation;
- accepted degraded capture has an AAF approval/evidence/audit ref where policy requires it;
- the state transition to `clone_generation_started` writes an AAF audit event and records the review id/source watermark as source refs.

Forbidden shortcuts:

- Capture completion directly to clone generation without review.
- `accepted_with_limitations` without limitation details.
- Degraded capture acceptance without required AAF exception refs.
- Retrying capture while keeping old accepted review current without supersession.
- Using AI summaries, proposal text, or UI badges as source evidence review truth.

## Supersession

A new capture run for the same migration should create a new source evidence package and review. The previous review should move to `superseded`, with:

- `superseded_by_review_id` on the old review;
- `supersedes_review_id` on the new review;
- review event `review_superseded`;
- state event recording that clone/proposal downstream refs may need revalidation.

## AAF Integration

AAF remains canonical for evidence packages, approvals, and audit. Source evidence review should link to AAF but not replace it.

Expected AAF links:

- AAF evidence package for source evidence package summary;
- AAF audit event for review decision;
- AAF approval request/decision for degraded capture, route coverage exception, unsupported source exception, or external reference acceptance;
- AAF subject refs pointing back to `gnr8_source_evidence_reviews` and evidence refs.

Future AAF scope additions may be required for explicit `source_evidence_acceptance`. Until then, MVP-5 schema should store nullable AAF refs and MVP-6 services should define which current AAF scopes are temporarily acceptable.

## Command Center And Ops Inbox Projection

Command Center may derive:

- evidence completeness status;
- review status;
- accepted limitations;
- missing evidence;
- retry required;
- clone generation allowed;
- latest capture/review timestamps and freshness.

Ops Inbox may derive:

- `source_evidence_review_required`;
- `source_evidence_missing_required_refs`;
- `source_evidence_retry_required`;
- `source_evidence_degraded_exception_needed`;
- `source_capture_failed`;
- `audit_evidence_gap`.

Both surfaces are derived only. They cannot accept evidence, resolve missing evidence, or permit clone generation without source-owned review transitions.

## MVP-5 Migration Safety

MVP-5 should add these tables only. It should not:

- change capture/import behavior;
- change clone generation behavior;
- create review UI or API routes;
- call storage, Supabase remote, Vercel, DNS providers, Stripe, Openprovider, or AI providers;
- backfill existing capture runs;
- mutate Command Center or Ops Inbox.
