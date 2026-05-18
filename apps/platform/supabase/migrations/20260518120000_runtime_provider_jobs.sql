create table if not exists public.gnr8_runtime_provider_jobs (
  id text primary key,
  site_id text not null,
  site_version_id text null,
  provider_id text not null,
  environment text not null,
  operation_kind text not null,
  status text not null,
  intent_payload jsonb not null default '{}'::jsonb,
  dry_run_payload jsonb null,
  result_payload jsonb null,
  error_payload jsonb null,
  correlation_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gnr8_runtime_provider_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'blocked')),
  constraint gnr8_runtime_provider_jobs_environment_check
    check (environment in ('contract', 'sandbox', 'live')),
  constraint gnr8_runtime_provider_jobs_operation_kind_check
    check (
      operation_kind in (
        'check_domain_availability',
        'purchase_domain',
        'create_dns_zone',
        'upsert_dns_record',
        'verify_dns_record',
        'activate_domain_binding',
        'manual_instruction'
      )
    ),
  constraint gnr8_runtime_provider_jobs_correlation_key_unique
    unique (correlation_key)
);

create index if not exists idx_gnr8_runtime_provider_jobs_site_id
  on public.gnr8_runtime_provider_jobs (site_id);

create index if not exists idx_gnr8_runtime_provider_jobs_site_version_id
  on public.gnr8_runtime_provider_jobs (site_version_id);

create index if not exists idx_gnr8_runtime_provider_jobs_provider_id
  on public.gnr8_runtime_provider_jobs (provider_id);

create index if not exists idx_gnr8_runtime_provider_jobs_status
  on public.gnr8_runtime_provider_jobs (status);

create index if not exists idx_gnr8_runtime_provider_jobs_correlation_key
  on public.gnr8_runtime_provider_jobs (correlation_key);
