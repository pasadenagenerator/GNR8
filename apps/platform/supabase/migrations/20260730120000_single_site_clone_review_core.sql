-- GNR8 Single-Site Clone Review And Fidelity Acceptance Core
-- Additive canonical storage for operator clone review decisions and fidelity
-- findings. This migration does not implement proposal generation,
-- improvement generation, UI, API, billing, domain/DNS, publish, rollback,
-- workers, providers, AI, or runtime serving behavior.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_single_site_clone_reviews (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  client_id uuid not null,
  site_id uuid null,
  clone_site_version_ref text not null,
  runtime_artifact_ref text not null,
  source_evidence_review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  clone_generation_ref text null,
  clone_generation_event_id uuid null references public.gnr8_single_site_migration_state_events(id) on delete restrict,
  review_status text not null default 'draft',
  review_decision text null,
  proposal_planning_allowed boolean not null default false,
  retry_required boolean not null default false,
  accepted_with_limitations boolean not null default false,
  fidelity_summary_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  diagnostics_json jsonb not null default '{}'::jsonb,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_role text null,
  reviewer_actor_display_label text null,
  review_started_at timestamptz null,
  reviewed_at timestamptz null,
  supersedes_review_id uuid null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  superseded_by_review_id uuid null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (migration_id, clone_site_version_ref, runtime_artifact_ref, source_evidence_review_id),
  constraint gnr8_single_site_clone_reviews_status_ck
    check (review_status in (
      'draft',
      'ready_for_review',
      'in_review',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'superseded'
    )),
  constraint gnr8_single_site_clone_reviews_decision_ck
    check (review_decision is null or review_decision in ('accept', 'accept_with_limitations', 'retry_clone', 'reject_clone', 'supersede')),
  constraint gnr8_single_site_clone_reviews_decision_required_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected', 'superseded')
      or review_decision is not null
    ),
  constraint gnr8_single_site_clone_reviews_reviewed_at_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected', 'superseded')
      or reviewed_at is not null
    ),
  constraint gnr8_single_site_clone_reviews_reviewer_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected', 'superseded')
      or (reviewer_actor_type is not null and reviewer_actor_id is not null and reviewer_actor_role is not null)
    ),
  constraint gnr8_single_site_clone_reviews_proposal_allowed_ck
    check (proposal_planning_allowed = false or review_status in ('accepted', 'accepted_with_limitations')),
  constraint gnr8_single_site_clone_reviews_retry_ck
    check (review_status <> 'retry_required' or (retry_required = true and proposal_planning_allowed = false)),
  constraint gnr8_single_site_clone_reviews_limited_ck
    check (
      accepted_with_limitations = false
      or (review_status = 'accepted_with_limitations' and jsonb_array_length(limitations_json) > 0)
    ),
  constraint gnr8_single_site_clone_reviews_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_clone_reviews_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_clone_reviews_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_clone_reviews_json_shape_ck
    check (
      jsonb_typeof(fidelity_summary_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(diagnostics_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_clone_reviews_nonempty_text_ck
    check (
      length(btrim(clone_site_version_ref)) > 0
      and length(btrim(runtime_artifact_ref)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
      and (clone_generation_ref is null or length(btrim(clone_generation_ref)) > 0)
    )
);

create table if not exists public.gnr8_single_site_clone_review_refs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  ref_role text not null,
  ref_type text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_record_id text not null,
  source_version text null,
  source_watermark text null,
  content_hash text null,
  media_type text null,
  captured_at timestamptz null,
  fresh_until timestamptz null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  idempotency_key text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_clone_review_refs_role_ck
    check (ref_role in (
      'runtime_site_version_clone',
      'runtime_artifact_clone',
      'source_evidence_review',
      'clone_generation_event',
      'clone_generation_ref',
      'source_evidence_ref',
      'screenshot',
      'dom',
      'asset',
      'fidelity_finding',
      'limitation',
      'external_reference'
    )),
  constraint gnr8_single_site_clone_review_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_clone_review_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_clone_review_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_clone_review_refs_content_hash_ck
    check (content_hash is null or length(content_hash) between 16 and 128),
  constraint gnr8_single_site_clone_review_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_clone_review_refs_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0)
);

create table if not exists public.gnr8_single_site_clone_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  item_key text not null,
  fidelity_category text not null,
  severity text not null,
  status text not null default 'open',
  blocks_acceptance boolean not null default false,
  accepted_limitation boolean not null default false,
  finding_summary text not null,
  ref_ids_json jsonb not null default '[]'::jsonb,
  limitation_json jsonb not null default '{}'::jsonb,
  details_json jsonb not null default '{}'::jsonb,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_display_label text null,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, item_key),
  unique (idempotency_key),
  constraint gnr8_single_site_clone_review_items_category_ck
    check (fidelity_category in (
      'layout',
      'content',
      'image',
      'asset',
      'font',
      'color',
      'spacing',
      'responsive',
      'interaction',
      'seo_metadata',
      'accessibility',
      'performance',
      'unknown_or_manual'
    )),
  constraint gnr8_single_site_clone_review_items_severity_ck
    check (severity in ('p0_blocker', 'p1_major', 'p2_minor', 'p3_note')),
  constraint gnr8_single_site_clone_review_items_status_ck
    check (status in ('open', 'resolved', 'accepted_limitation', 'superseded')),
  constraint gnr8_single_site_clone_review_items_blocking_ck
    check (
      blocks_acceptance = false
      or (status = 'open' and severity in ('p0_blocker', 'p1_major') and accepted_limitation = false)
    ),
  constraint gnr8_single_site_clone_review_items_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_clone_review_items_json_shape_ck
    check (
      jsonb_typeof(ref_ids_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_clone_review_items_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_clone_review_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_clone_review_items_nonempty_text_ck
    check (
      length(btrim(item_key)) > 0
      and length(btrim(finding_summary)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create table if not exists public.gnr8_single_site_clone_review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  event_index integer not null,
  event_action text not null,
  from_status text null,
  to_status text null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  details_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  source_watermark text null,
  payload_hash text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (review_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_clone_review_events_action_ck
    check (event_action in (
      'created',
      'ref_added',
      'finding_added',
      'ready_for_review',
      'review_started',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'superseded',
      'comment_added'
    )),
  constraint gnr8_single_site_clone_review_events_status_ck
    check (
      (from_status is null or from_status in (
        'draft',
        'ready_for_review',
        'in_review',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded'
      ))
      and (to_status is null or to_status in (
        'draft',
        'ready_for_review',
        'in_review',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded'
      ))
    ),
  constraint gnr8_single_site_clone_review_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_clone_review_events_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_clone_review_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_clone_review_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_clone_review_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_clone_review_events_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0),
  constraint gnr8_single_site_clone_review_events_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

create index if not exists idx_gnr8_single_site_clone_reviews_migration_status
  on public.gnr8_single_site_clone_reviews (migration_id, review_status, updated_at desc);

create index if not exists idx_gnr8_single_site_clone_reviews_decision
  on public.gnr8_single_site_clone_reviews (review_decision, reviewed_at desc)
  where review_decision is not null;

create index if not exists idx_gnr8_single_site_clone_reviews_proposal_allowed
  on public.gnr8_single_site_clone_reviews (proposal_planning_allowed, reviewed_at desc);

create index if not exists idx_gnr8_single_site_clone_review_refs_review_role
  on public.gnr8_single_site_clone_review_refs (review_id, ref_role);

create index if not exists idx_gnr8_single_site_clone_review_refs_source_lookup
  on public.gnr8_single_site_clone_review_refs (source_system, source_table, source_record_id, source_watermark);

create unique index if not exists idx_gnr8_single_site_clone_review_refs_semantic_uq
  on public.gnr8_single_site_clone_review_refs (
    review_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_watermark, '')
  );

create index if not exists idx_gnr8_single_site_clone_review_items_review_category_status
  on public.gnr8_single_site_clone_review_items (review_id, fidelity_category, status);

create index if not exists idx_gnr8_single_site_clone_review_items_open_severity
  on public.gnr8_single_site_clone_review_items (review_id, severity)
  where status = 'open';

create index if not exists idx_gnr8_single_site_clone_review_events_review_occurred
  on public.gnr8_single_site_clone_review_events (review_id, occurred_at asc);

create index if not exists idx_gnr8_single_site_clone_review_events_migration
  on public.gnr8_single_site_clone_review_events (migration_id, occurred_at desc);

alter table public.gnr8_single_site_clone_reviews enable row level security;
alter table public.gnr8_single_site_clone_review_refs enable row level security;
alter table public.gnr8_single_site_clone_review_items enable row level security;
alter table public.gnr8_single_site_clone_review_events enable row level security;

drop trigger if exists trg_gnr8_single_site_clone_review_refs_append_only on public.gnr8_single_site_clone_review_refs;
create trigger trg_gnr8_single_site_clone_review_refs_append_only
  before update or delete on public.gnr8_single_site_clone_review_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_clone_review_events_append_only on public.gnr8_single_site_clone_review_events;
create trigger trg_gnr8_single_site_clone_review_events_append_only
  before update or delete on public.gnr8_single_site_clone_review_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
