create table if not exists public.gnr8_runtime_provider_operation_approvals (
  id text primary key,
  artifact_id text not null unique,
  site_id text not null,
  site_version_id text null,
  provider_id text not null,
  environment text not null,
  capability text not null,
  operation_kind text not null,
  approval_status text not null,
  risk_level text not null,
  required_approvals jsonb not null,
  reviewer_checklist jsonb not null,
  warnings jsonb not null,
  blockers jsonb not null,
  correlation_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gnr8_runtime_provider_operation_approvals_site_id
  on public.gnr8_runtime_provider_operation_approvals (site_id);

create index if not exists idx_gnr8_runtime_provider_operation_approvals_provider_id
  on public.gnr8_runtime_provider_operation_approvals (provider_id);

create index if not exists idx_gnr8_runtime_provider_operation_approvals_approval_status
  on public.gnr8_runtime_provider_operation_approvals (approval_status);

create index if not exists idx_gnr8_runtime_provider_operation_approvals_correlation_key
  on public.gnr8_runtime_provider_operation_approvals (correlation_key);
