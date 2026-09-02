-- GNR8 Airship single-site editor drafts
-- Draft-only persistence for internal Airship copy review. This migration does
-- not mutate runtime site versions, active pointers, publish targets, providers,
-- domains, billing records, source captures, or live public content.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_airship_single_site_editor_drafts (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  tenant_id text null,
  client_id text null,
  site_id text null,
  agency_id text null,
  source_url text not null,
  target_site_version_refs_json jsonb not null default '{}'::jsonb,
  draft_edits_json jsonb not null default '[]'::jsonb,
  draft_status text not null default 'draft',
  version integer not null default 1,
  semantic_watermark text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by_actor_id text not null,
  updated_by_actor_id text not null,
  accepted_at timestamptz null,
  rejected_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (migration_id),
  constraint gnr8_airship_single_site_editor_drafts_status_ck
    check (draft_status in ('draft', 'mixed', 'accepted', 'rejected')),
  constraint gnr8_airship_single_site_editor_drafts_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_single_site_editor_drafts_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_single_site_editor_drafts_json_shape_ck
    check (
      jsonb_typeof(target_site_version_refs_json) = 'object'
      and jsonb_typeof(draft_edits_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_airship_single_site_editor_drafts_nonempty_text_ck
    check (
      length(btrim(source_url)) > 0
      and length(btrim(semantic_watermark)) > 0
      and length(btrim(created_by_actor_id)) > 0
      and length(btrim(updated_by_actor_id)) > 0
    ),
  constraint gnr8_airship_single_site_editor_drafts_version_ck
    check (version >= 1),
  constraint gnr8_airship_single_site_editor_drafts_safe_storage_ck
    check (
      target_site_version_refs_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and metadata_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
    )
);

create index if not exists idx_gnr8_airship_single_site_editor_drafts_scope
  on public.gnr8_airship_single_site_editor_drafts (migration_id, site_id, client_id);

create index if not exists idx_gnr8_airship_single_site_editor_drafts_status
  on public.gnr8_airship_single_site_editor_drafts (draft_status, updated_at desc);

create table if not exists public.gnr8_airship_single_site_editor_draft_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.gnr8_airship_single_site_editor_drafts(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  event_index integer not null,
  event_action text not null,
  draft_edit_id text null,
  draft_status text not null,
  actor_id text not null,
  actor_type text not null default 'human',
  actor_role text not null default 'platform_superadmin',
  summary_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (draft_id, event_index),
  unique (idempotency_key),
  constraint gnr8_airship_single_site_editor_draft_events_action_ck
    check (event_action in ('draft_created', 'draft_reused', 'edit_saved', 'edit_accepted', 'edit_rejected')),
  constraint gnr8_airship_single_site_editor_draft_events_status_ck
    check (draft_status in ('draft', 'mixed', 'accepted', 'rejected')),
  constraint gnr8_airship_single_site_editor_draft_events_actor_type_ck
    check (actor_type in ('human', 'system')),
  constraint gnr8_airship_single_site_editor_draft_events_actor_role_ck
    check (actor_role in ('platform_superadmin', 'internal_operator')),
  constraint gnr8_airship_single_site_editor_draft_events_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_single_site_editor_draft_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_single_site_editor_draft_events_json_shape_ck
    check (jsonb_typeof(summary_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_airship_single_site_editor_draft_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(event_action)) > 0
      and length(btrim(draft_status)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
      and (draft_edit_id is null or length(btrim(draft_edit_id)) > 0)
    ),
  constraint gnr8_airship_single_site_editor_draft_events_safe_storage_ck
    check (
      summary_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and metadata_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
    )
);

create index if not exists idx_gnr8_airship_single_site_editor_draft_events_draft
  on public.gnr8_airship_single_site_editor_draft_events (draft_id, occurred_at desc, event_index);

create index if not exists idx_gnr8_airship_single_site_editor_draft_events_migration
  on public.gnr8_airship_single_site_editor_draft_events (migration_id, occurred_at desc);

create or replace function public.gnr8_airship_single_site_editor_draft_events_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Airship single-site editor draft events are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

drop trigger if exists trg_gnr8_airship_single_site_editor_draft_events_append_only
  on public.gnr8_airship_single_site_editor_draft_events;
create trigger trg_gnr8_airship_single_site_editor_draft_events_append_only
  before update or delete on public.gnr8_airship_single_site_editor_draft_events
  for each row execute function public.gnr8_airship_single_site_editor_draft_events_prevent_update_delete();

alter table public.gnr8_airship_single_site_editor_drafts enable row level security;
alter table public.gnr8_airship_single_site_editor_drafts force row level security;
alter table public.gnr8_airship_single_site_editor_draft_events enable row level security;
alter table public.gnr8_airship_single_site_editor_draft_events force row level security;

revoke all on table public.gnr8_airship_single_site_editor_drafts from anon, authenticated;
revoke all on table public.gnr8_airship_single_site_editor_draft_events from anon, authenticated;

commit;
