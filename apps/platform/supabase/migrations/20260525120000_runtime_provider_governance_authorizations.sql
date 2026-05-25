create table if not exists public.gnr8_runtime_provider_governance_authorizations (
  authorization_id text primary key,
  handoff_id text not null,
  correlation_key text not null,
  authorization_status text not null,
  authorization_reason text not null,
  intent_only boolean not null,
  execution_blocked boolean not null,
  diagnostics jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gnr8_runtime_provider_governance_authorizations_handoff_id
  on public.gnr8_runtime_provider_governance_authorizations (handoff_id);

create index if not exists idx_gnr8_runtime_provider_governance_authorizations_created_at_desc
  on public.gnr8_runtime_provider_governance_authorizations (created_at desc);
