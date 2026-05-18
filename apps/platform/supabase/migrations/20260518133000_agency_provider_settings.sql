create table if not exists public.gnr8_agency_provider_settings (
  id text primary key,
  agency_id text not null,
  provider_id text not null check (
    provider_id in ('manual', 'mock_provider', 'openprovider', 'realtime_register', 'netim', 'inwx')
  ),
  environment text not null check (environment in ('contract', 'sandbox', 'live')),
  credential_reference text null,
  enabled boolean not null default true,
  capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, provider_id)
);

create index if not exists gnr8_agency_provider_settings_agency_id_idx
  on public.gnr8_agency_provider_settings (agency_id);

create index if not exists gnr8_agency_provider_settings_provider_id_idx
  on public.gnr8_agency_provider_settings (provider_id);

create index if not exists gnr8_agency_provider_settings_enabled_idx
  on public.gnr8_agency_provider_settings (enabled);
