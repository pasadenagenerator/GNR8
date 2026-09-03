-- GNR8 Airship OpenAI BYOK provider credentials
-- Stores only server-encrypted OpenAI API keys for internal Airship editor AI commands.
-- This migration does not mutate runtime site versions, active pointers, publish targets,
-- DNS/domains, billing records, source captures, or live public content.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_airship_ai_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  credential_scope_key text not null default 'openai:airship_editor:internal_superadmin',
  provider text not null default 'openai',
  scope text not null default 'airship_editor',
  owner_scope text not null default 'internal_superadmin',
  owner_id text null,
  encrypted_secret text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  secret_fingerprint_sha256 text not null,
  masked_secret text not null,
  model text not null default 'gpt-5',
  status text not null default 'active',
  last_tested_at timestamptz null,
  last_test_status text null,
  created_by_actor_id text not null,
  updated_by_actor_id text not null,
  revoked_by_actor_id text null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_secret',
  retention_class text not null default 'mvp_operational',
  unique (credential_scope_key),
  constraint gnr8_airship_ai_provider_credentials_scope_ck
    check (
      credential_scope_key = 'openai:airship_editor:internal_superadmin'
      and provider = 'openai'
      and scope = 'airship_editor'
      and owner_scope = 'internal_superadmin'
    ),
  constraint gnr8_airship_ai_provider_credentials_status_ck
    check (status in ('active', 'revoked')),
  constraint gnr8_airship_ai_provider_credentials_test_status_ck
    check (last_test_status is null or last_test_status in ('passed', 'failed')),
  constraint gnr8_airship_ai_provider_credentials_privacy_ck
    check (privacy_label = 'internal_secret'),
  constraint gnr8_airship_ai_provider_credentials_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_ai_provider_credentials_nonempty_text_ck
    check (
      length(btrim(encrypted_secret)) > 0
      and length(btrim(encryption_iv)) > 0
      and length(btrim(encryption_tag)) > 0
      and length(btrim(secret_fingerprint_sha256)) = 64
      and length(btrim(masked_secret)) > 0
      and length(btrim(model)) > 0
      and length(btrim(created_by_actor_id)) > 0
      and length(btrim(updated_by_actor_id)) > 0
      and (revoked_by_actor_id is null or length(btrim(revoked_by_actor_id)) > 0)
    ),
  constraint gnr8_airship_ai_provider_credentials_mask_ck
    check (masked_secret ~ '^sk-\.\.\.[A-Za-z0-9_-]{4}$'),
  constraint gnr8_airship_ai_provider_credentials_safe_metadata_ck
    check (
      credential_scope_key !~* '(secret|password|token|cookie|billing|stripe|payment|database_url|openai_api_key)'
      and model !~* '(secret|password|token|cookie|billing|stripe|payment|database_url|openai_api_key)'
      and masked_secret !~* '(openai_api_key|database_url|password|secret|token)'
    )
);

create index if not exists idx_gnr8_airship_ai_provider_credentials_provider_scope
  on public.gnr8_airship_ai_provider_credentials (provider, scope, owner_scope, status);

create table if not exists public.gnr8_airship_ai_provider_credential_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid null references public.gnr8_airship_ai_provider_credentials(id) on delete restrict,
  credential_scope_key text not null default 'openai:airship_editor:internal_superadmin',
  event_action text not null,
  actor_id text not null,
  summary_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (idempotency_key),
  constraint gnr8_airship_ai_provider_credential_events_scope_ck
    check (credential_scope_key = 'openai:airship_editor:internal_superadmin'),
  constraint gnr8_airship_ai_provider_credential_events_action_ck
    check (event_action in ('credential_created', 'credential_updated', 'connection_tested', 'credential_revoked')),
  constraint gnr8_airship_ai_provider_credential_events_json_shape_ck
    check (jsonb_typeof(summary_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_airship_ai_provider_credential_events_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_ai_provider_credential_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_ai_provider_credential_events_nonempty_text_ck
    check (
      length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_airship_ai_provider_credential_events_safe_storage_ck
    check (
      summary_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key|sk-)'
      and metadata_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key|sk-)'
    )
);

create index if not exists idx_gnr8_airship_ai_provider_credential_events_scope
  on public.gnr8_airship_ai_provider_credential_events (credential_scope_key, occurred_at desc);

create or replace function public.gnr8_airship_ai_provider_credential_events_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Airship AI provider credential events are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

drop trigger if exists trg_gnr8_airship_ai_provider_credential_events_append_only
  on public.gnr8_airship_ai_provider_credential_events;
create trigger trg_gnr8_airship_ai_provider_credential_events_append_only
  before update or delete on public.gnr8_airship_ai_provider_credential_events
  for each row execute function public.gnr8_airship_ai_provider_credential_events_prevent_update_delete();

alter table public.gnr8_airship_ai_provider_credentials enable row level security;
alter table public.gnr8_airship_ai_provider_credentials force row level security;
alter table public.gnr8_airship_ai_provider_credential_events enable row level security;
alter table public.gnr8_airship_ai_provider_credential_events force row level security;

revoke all on table public.gnr8_airship_ai_provider_credentials from anon, authenticated;
revoke all on table public.gnr8_airship_ai_provider_credential_events from anon, authenticated;

commit;
