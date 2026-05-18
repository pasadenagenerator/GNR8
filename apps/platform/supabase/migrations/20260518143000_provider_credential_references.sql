create table if not exists public.gnr8_provider_credential_references (
  id text primary key,
  agency_id text not null,
  provider_id text not null check (
    provider_id in ('manual', 'mock_provider', 'openprovider', 'realtime_register', 'netim', 'inwx')
  ),
  reference_key text not null,
  environment text not null check (environment in ('contract', 'sandbox', 'live')),
  credential_names jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, provider_id, reference_key)
);

create index if not exists gnr8_provider_credential_references_agency_id_idx
  on public.gnr8_provider_credential_references (agency_id);

create index if not exists gnr8_provider_credential_references_provider_id_idx
  on public.gnr8_provider_credential_references (provider_id);

create index if not exists gnr8_provider_credential_references_enabled_idx
  on public.gnr8_provider_credential_references (enabled);
