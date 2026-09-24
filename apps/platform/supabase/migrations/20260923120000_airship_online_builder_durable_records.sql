-- GNR8 Airship online builder durable control-plane records
-- Stores typed control-plane metadata only. This migration does not launch
-- workers, start Airship sidecars, expose public editor URLs, publish, mutate
-- active pointers, demo hosts, DNS, providers, billing, source capture, rollback,
-- dry-run, shadow-publish, or preview-host bindings.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_airship_online_builder_records (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null,
  record_key text not null,
  session_id text null,
  worker_id text null,
  token_hash text null,
  state text null,
  status text null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (record_kind, record_key),
  constraint gnr8_airship_online_builder_records_kind_ck
    check (record_kind in (
      'session',
      'worker',
      'worker_auth_token',
      'worker_lease',
      'worker_heartbeat',
      'editor_gateway_token',
      'workspace_snapshot',
      'captured_diff',
      'mapping_readback',
      'draft_apply_readback',
      'generated_preview_readback',
      'audit_event'
    )),
  constraint gnr8_airship_online_builder_records_json_shape_ck
    check (jsonb_typeof(payload_json) = 'object'),
  constraint gnr8_airship_online_builder_records_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_online_builder_records_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_online_builder_records_safe_storage_ck
    check (
      token_hash is null or token_hash ~ '^[a-f0-9]{64}$'
    ),
  constraint gnr8_airship_online_builder_records_no_plaintext_tokens_ck
    check (
      payload_json::text !~* '(aobw_|aobe_|authorization|plaintextToken|plainTextToken|bearer\\s+[A-Za-z0-9_.-]+|signingSecret|database_url|openai_api_key)'
    )
);

create index if not exists idx_gnr8_airship_online_builder_records_kind_session
  on public.gnr8_airship_online_builder_records (record_kind, session_id, updated_at desc);

create index if not exists idx_gnr8_airship_online_builder_records_kind_worker
  on public.gnr8_airship_online_builder_records (record_kind, worker_id, updated_at desc);

create index if not exists idx_gnr8_airship_online_builder_records_kind_token_hash
  on public.gnr8_airship_online_builder_records (record_kind, token_hash);

create index if not exists idx_gnr8_airship_online_builder_records_kind_state
  on public.gnr8_airship_online_builder_records (record_kind, state, updated_at desc);

create index if not exists idx_gnr8_airship_online_builder_records_kind_status
  on public.gnr8_airship_online_builder_records (record_kind, status, updated_at desc);

create index if not exists idx_gnr8_airship_online_builder_records_session_expiry
  on public.gnr8_airship_online_builder_records (record_kind, ((payload_json->>'expiresAt')), updated_at desc)
  where record_kind = 'session';

create or replace function public.gnr8_airship_online_builder_audit_events_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  if old.record_kind = 'audit_event' then
    raise exception 'Airship online builder audit events are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gnr8_airship_online_builder_audit_events_append_only
  on public.gnr8_airship_online_builder_records;
create trigger trg_gnr8_airship_online_builder_audit_events_append_only
  before update or delete on public.gnr8_airship_online_builder_records
  for each row execute function public.gnr8_airship_online_builder_audit_events_prevent_update_delete();

alter table public.gnr8_airship_online_builder_records enable row level security;
alter table public.gnr8_airship_online_builder_records force row level security;

revoke all on table public.gnr8_airship_online_builder_records from anon, authenticated;

commit;
