create table if not exists public.gnr8_runtime_provider_execution_handoffs (
  id text primary key,
  handoff_id text not null unique,
  artifact_id text not null,
  site_id text not null,
  site_version_id text null,
  provider_id text not null,
  environment text not null,
  capability text not null,
  operation_kind text not null,
  approval_status text not null,
  risk_level text not null,
  handoff_status text not null,
  planned_job_ids jsonb not null,
  warnings jsonb not null,
  blockers jsonb not null,
  correlation_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gnr8_runtime_provider_execution_handoffs_site_id
  on public.gnr8_runtime_provider_execution_handoffs (site_id);

create index if not exists idx_gnr8_runtime_provider_execution_handoffs_provider_id
  on public.gnr8_runtime_provider_execution_handoffs (provider_id);

create index if not exists idx_gnr8_runtime_provider_execution_handoffs_handoff_status
  on public.gnr8_runtime_provider_execution_handoffs (handoff_status);

create index if not exists idx_gnr8_runtime_provider_execution_handoffs_correlation_key
  on public.gnr8_runtime_provider_execution_handoffs (correlation_key);
