-- GNR8 Single-Site Launch Readiness Core
-- Additive canonical storage for launch readiness records, dimensions,
-- durable refs, blockers, lifecycle events, and final closeout packages.

begin;

create extension if not exists pgcrypto;

create or replace function public.gnr8_single_site_launch_readiness_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Single-site launch readiness records are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

create table if not exists public.gnr8_single_site_launch_readiness_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id uuid not null,
  site_id uuid not null,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  launch_approval_ref text not null,
  launch_approval_source_watermark text null,
  improved_candidate_site_version_ref text not null,
  improved_runtime_artifact_ref text not null,
  status text not null default 'draft',
  freshness_status text not null default 'unknown',
  semantic_source_watermark text not null,
  readiness_summary_json jsonb not null default '{}'::jsonb,
  limitation_summary_json jsonb not null default '[]'::jsonb,
  blocker_summary_json jsonb not null default '[]'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
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
  constraint gnr8_single_site_launch_readiness_records_status_ck
    check (status in (
      'draft',
      'collecting_evidence',
      'ready',
      'ready_with_limitations',
      'blocked',
      'stale',
      'superseded',
      'cancelled'
    )),
  constraint gnr8_single_site_launch_readiness_records_freshness_status_ck
    check (freshness_status in ('fresh', 'stale', 'missing', 'unknown', 'not_applicable')),
  constraint gnr8_single_site_launch_readiness_records_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_readiness_records_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_launch_readiness_records_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_readiness_records_json_shape_ck
    check (
      jsonb_typeof(readiness_summary_json) = 'object'
      and jsonb_typeof(limitation_summary_json) = 'array'
      and jsonb_typeof(blocker_summary_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_readiness_records_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(launch_approval_ref)) > 0
      and length(btrim(improved_candidate_site_version_ref)) > 0
      and length(btrim(improved_runtime_artifact_ref)) > 0
      and length(btrim(semantic_source_watermark)) > 0
      and (launch_approval_source_watermark is null or length(btrim(launch_approval_source_watermark)) > 0)
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create unique index if not exists idx_gnr8_single_site_launch_readiness_records_semantic
  on public.gnr8_single_site_launch_readiness_records (
    migration_id,
    launch_approval_ref,
    improved_candidate_site_version_ref,
    improved_runtime_artifact_ref,
    semantic_source_watermark
  );

create index if not exists idx_gnr8_single_site_launch_readiness_records_migration_status
  on public.gnr8_single_site_launch_readiness_records (migration_id, status, updated_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_records_client_site_status
  on public.gnr8_single_site_launch_readiness_records (client_id, site_id, status, updated_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_records_freshness
  on public.gnr8_single_site_launch_readiness_records (freshness_status, semantic_source_watermark, updated_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_records_created
  on public.gnr8_single_site_launch_readiness_records (created_at desc);

create table if not exists public.gnr8_single_site_launch_readiness_dimensions (
  id uuid primary key default gen_random_uuid(),
  readiness_id uuid not null references public.gnr8_single_site_launch_readiness_records(id) on delete restrict,
  dimension text not null,
  dimension_status text not null default 'unknown',
  source_refs_json jsonb not null default '[]'::jsonb,
  source_watermark text null,
  freshness_status text not null default 'unknown',
  source_captured_at timestamptz null,
  freshness_checked_at timestamptz null,
  fresh_until timestamptz null,
  stale_at timestamptz null,
  missing_at timestamptz null,
  blocker_refs_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  diagnostics_json jsonb not null default '{}'::jsonb,
  required_for_launch_readiness boolean not null default true,
  required_for_publish_activation boolean not null default true,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (readiness_id, dimension),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_readiness_dimensions_dimension_ck
    check (dimension in (
      'launch_approval',
      'content_approval',
      'client_approval',
      'improved_candidate',
      'publish_target',
      'domain_readiness',
      'dns_operator_evidence',
      'vercel_custom_domain_ssl',
      'billing_subscription',
      'hosting_entitlement',
      'stripe_payment',
      'rollback_readiness',
      'preview_smoke_qa',
      'limitations',
      'audit_timeline',
      'pasr_shadow_diagnostics'
    )),
  constraint gnr8_single_site_launch_readiness_dimensions_status_ck
    check (dimension_status in (
      'ready',
      'ready_with_limitations',
      'blocked',
      'stale',
      'missing',
      'not_applicable',
      'unknown'
    )),
  constraint gnr8_single_site_launch_readiness_dimensions_freshness_status_ck
    check (freshness_status in ('fresh', 'stale', 'missing', 'unknown', 'not_applicable')),
  constraint gnr8_single_site_launch_readiness_dimensions_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_readiness_dimensions_json_shape_ck
    check (
      jsonb_typeof(source_refs_json) = 'array'
      and jsonb_typeof(blocker_refs_json) = 'array'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(diagnostics_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_readiness_dimensions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_launch_readiness_dimensions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_readiness_dimensions_nonempty_text_ck
    check (
      (source_watermark is null or length(btrim(source_watermark)) > 0)
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_launch_readiness_dimensions_readiness
  on public.gnr8_single_site_launch_readiness_dimensions (readiness_id, dimension, dimension_status);

create index if not exists idx_gnr8_single_site_launch_readiness_dimensions_status
  on public.gnr8_single_site_launch_readiness_dimensions (dimension, dimension_status, updated_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_dimensions_required
  on public.gnr8_single_site_launch_readiness_dimensions (readiness_id, required_for_launch_readiness, required_for_publish_activation);

create index if not exists idx_gnr8_single_site_launch_readiness_dimensions_freshness
  on public.gnr8_single_site_launch_readiness_dimensions (freshness_status, source_watermark, freshness_checked_at desc);

create table if not exists public.gnr8_single_site_launch_readiness_refs (
  id uuid primary key default gen_random_uuid(),
  readiness_id uuid not null references public.gnr8_single_site_launch_readiness_records(id) on delete restrict,
  dimension_id uuid null references public.gnr8_single_site_launch_readiness_dimensions(id) on delete restrict,
  ref_role text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_type text not null,
  source_record_id text not null,
  source_ref text not null,
  source_version text null,
  source_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_readiness_refs_role_ck
    check (ref_role in (
      'launch_approval_decision',
      'content_approval_decision',
      'client_approval_decision',
      'improved_candidate_site_version',
      'improved_runtime_artifact',
      'publish_target',
      'ddom_readiness_snapshot',
      'domain_operator_evidence',
      'dns_instruction',
      'vercel_domain_state',
      'ssl_state',
      'billing_subscription',
      'hosting_entitlement',
      'stripe_customer',
      'stripe_subscription',
      'rollback_readiness',
      'preview_smoke_qa',
      'limitation',
      'blocker',
      'audit_event',
      'pasr_shadow_result'
    )),
  constraint gnr8_single_site_launch_readiness_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_launch_readiness_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_type)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(source_ref)) > 0
      and (source_watermark is null or length(btrim(source_watermark)) > 0)
      and length(btrim(idempotency_key)) > 0
    )
);

create unique index if not exists idx_gnr8_single_site_launch_readiness_refs_semantic
  on public.gnr8_single_site_launch_readiness_refs (
    readiness_id,
    coalesce(dimension_id, '00000000-0000-0000-0000-000000000000'::uuid),
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_type,
    source_record_id,
    source_ref,
    coalesce(source_version, ''),
    coalesce(source_watermark, '')
  );

create index if not exists idx_gnr8_single_site_launch_readiness_refs_readiness_role
  on public.gnr8_single_site_launch_readiness_refs (readiness_id, ref_role, created_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_refs_dimension_role
  on public.gnr8_single_site_launch_readiness_refs (dimension_id, ref_role, created_at desc)
  where dimension_id is not null;

create index if not exists idx_gnr8_single_site_launch_readiness_refs_source_lookup
  on public.gnr8_single_site_launch_readiness_refs (source_system, source_table, source_type, source_record_id);

create index if not exists idx_gnr8_single_site_launch_readiness_refs_source_watermark
  on public.gnr8_single_site_launch_readiness_refs (source_watermark, created_at desc)
  where source_watermark is not null;

create table if not exists public.gnr8_single_site_launch_readiness_blockers (
  id uuid primary key default gen_random_uuid(),
  readiness_id uuid not null references public.gnr8_single_site_launch_readiness_records(id) on delete restrict,
  dimension_id uuid null references public.gnr8_single_site_launch_readiness_dimensions(id) on delete restrict,
  severity text not null,
  category text not null,
  status text not null default 'open',
  description text not null,
  source_refs_json jsonb not null default '[]'::jsonb,
  resolution_refs_json jsonb not null default '[]'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_readiness_blockers_severity_ck
    check (severity in ('p0_blocker', 'p1_major', 'p2_minor', 'p3_note')),
  constraint gnr8_single_site_launch_readiness_blockers_category_ck
    check (category in (
      'launch_approval',
      'content_approval',
      'client_approval',
      'domain_dns',
      'billing_subscription',
      'hosting_entitlement',
      'stripe_payment',
      'publish_target',
      'rollback',
      'smoke_qa',
      'runtime_candidate',
      'freshness',
      'evidence',
      'limitation',
      'manual_operator',
      'unknown_or_manual'
    )),
  constraint gnr8_single_site_launch_readiness_blockers_status_ck
    check (status in ('open', 'resolved', 'accepted_limitation', 'superseded', 'cancelled')),
  constraint gnr8_single_site_launch_readiness_blockers_resolution_ck
    check ((status in ('resolved', 'accepted_limitation') and resolved_at is not null) or (status not in ('resolved', 'accepted_limitation'))),
  constraint gnr8_single_site_launch_readiness_blockers_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_readiness_blockers_json_shape_ck
    check (
      jsonb_typeof(source_refs_json) = 'array'
      and jsonb_typeof(resolution_refs_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_readiness_blockers_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_launch_readiness_blockers_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_readiness_blockers_nonempty_text_ck
    check (
      length(btrim(description)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_launch_readiness_blockers_readiness
  on public.gnr8_single_site_launch_readiness_blockers (readiness_id, status, severity, created_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_blockers_dimension
  on public.gnr8_single_site_launch_readiness_blockers (dimension_id, status, severity, created_at desc)
  where dimension_id is not null;

create index if not exists idx_gnr8_single_site_launch_readiness_blockers_category
  on public.gnr8_single_site_launch_readiness_blockers (category, status, severity, updated_at desc);

create table if not exists public.gnr8_single_site_launch_readiness_events (
  id uuid primary key default gen_random_uuid(),
  readiness_id uuid not null references public.gnr8_single_site_launch_readiness_records(id) on delete restrict,
  dimension_id uuid null references public.gnr8_single_site_launch_readiness_dimensions(id) on delete restrict,
  blocker_id uuid null references public.gnr8_single_site_launch_readiness_blockers(id) on delete restrict,
  event_index integer not null,
  event_action text not null,
  from_status text null,
  to_status text null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  details_json jsonb not null default '{}'::jsonb,
  source_watermark text null,
  semantic_watermark text null,
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
  unique (readiness_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_readiness_events_action_ck
    check (event_action in (
      'readiness_created',
      'evidence_collection_started',
      'dimension_recorded',
      'dimension_ref_recorded',
      'blocker_opened',
      'blocker_resolved',
      'limitation_accepted',
      'readiness_marked_ready',
      'readiness_marked_ready_with_limitations',
      'readiness_blocked',
      'readiness_marked_stale',
      'readiness_superseded',
      'readiness_cancelled',
      'closeout_recorded'
    )),
  constraint gnr8_single_site_launch_readiness_events_status_ck
    check (
      (from_status is null or from_status in ('draft', 'collecting_evidence', 'ready', 'ready_with_limitations', 'blocked', 'stale', 'superseded', 'cancelled'))
      and (to_status is null or to_status in ('draft', 'collecting_evidence', 'ready', 'ready_with_limitations', 'blocked', 'stale', 'superseded', 'cancelled'))
    ),
  constraint gnr8_single_site_launch_readiness_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_readiness_events_json_shape_ck
    check (jsonb_typeof(details_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_launch_readiness_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_launch_readiness_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_readiness_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(event_action)) > 0
      and (source_watermark is null or length(btrim(source_watermark)) > 0)
      and (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_launch_readiness_events_readiness
  on public.gnr8_single_site_launch_readiness_events (readiness_id, occurred_at desc, event_index);

create index if not exists idx_gnr8_single_site_launch_readiness_events_action
  on public.gnr8_single_site_launch_readiness_events (event_action, created_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_events_source_watermark
  on public.gnr8_single_site_launch_readiness_events (source_watermark, created_at desc)
  where source_watermark is not null;

create table if not exists public.gnr8_single_site_launch_readiness_closeouts (
  id uuid primary key default gen_random_uuid(),
  readiness_id uuid not null references public.gnr8_single_site_launch_readiness_records(id) on delete restrict,
  final_status text not null,
  final_evidence_summary_json jsonb not null default '{}'::jsonb,
  final_limitations_json jsonb not null default '[]'::jsonb,
  final_blockers_json jsonb not null default '[]'::jsonb,
  publish_activation_handoff_refs_json jsonb not null default '[]'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_readiness_closeouts_final_status_ck
    check (final_status in ('ready', 'ready_with_limitations', 'blocked', 'stale', 'superseded', 'cancelled')),
  constraint gnr8_single_site_launch_readiness_closeouts_json_shape_ck
    check (
      jsonb_typeof(final_evidence_summary_json) = 'object'
      and jsonb_typeof(final_limitations_json) = 'array'
      and jsonb_typeof(final_blockers_json) = 'array'
      and jsonb_typeof(publish_activation_handoff_refs_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_readiness_closeouts_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_readiness_closeouts_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_launch_readiness_closeouts_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_readiness_closeouts_nonempty_text_ck
    check (
      length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_launch_readiness_closeouts_readiness
  on public.gnr8_single_site_launch_readiness_closeouts (readiness_id, created_at desc);

create index if not exists idx_gnr8_single_site_launch_readiness_closeouts_final_status
  on public.gnr8_single_site_launch_readiness_closeouts (final_status, created_at desc);

alter table public.gnr8_single_site_launch_readiness_records enable row level security;
alter table public.gnr8_single_site_launch_readiness_dimensions enable row level security;
alter table public.gnr8_single_site_launch_readiness_refs enable row level security;
alter table public.gnr8_single_site_launch_readiness_blockers enable row level security;
alter table public.gnr8_single_site_launch_readiness_events enable row level security;
alter table public.gnr8_single_site_launch_readiness_closeouts enable row level security;

drop trigger if exists trg_gnr8_single_site_launch_readiness_refs_append_only
  on public.gnr8_single_site_launch_readiness_refs;
create trigger trg_gnr8_single_site_launch_readiness_refs_append_only
  before update or delete on public.gnr8_single_site_launch_readiness_refs
  for each row execute function public.gnr8_single_site_launch_readiness_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_launch_readiness_events_append_only
  on public.gnr8_single_site_launch_readiness_events;
create trigger trg_gnr8_single_site_launch_readiness_events_append_only
  before update or delete on public.gnr8_single_site_launch_readiness_events
  for each row execute function public.gnr8_single_site_launch_readiness_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_launch_readiness_closeouts_append_only
  on public.gnr8_single_site_launch_readiness_closeouts;
create trigger trg_gnr8_single_site_launch_readiness_closeouts_append_only
  before update or delete on public.gnr8_single_site_launch_readiness_closeouts
  for each row execute function public.gnr8_single_site_launch_readiness_prevent_update_delete();

commit;
