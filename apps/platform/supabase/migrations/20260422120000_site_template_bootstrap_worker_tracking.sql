-- Durable site template bootstrap worker tracking.

create table if not exists public.gnr8_site_bootstrap_jobs (
  site_id uuid primary key references public.sites(id) on delete cascade,
  client_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid not null references public.gnr8_templates(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  runtime_site_id uuid references public.gnr8_runtime_sites(id) on delete set null,
  runtime_site_version_id uuid references public.gnr8_runtime_site_versions(id) on delete set null,
  artifact_id uuid references public.gnr8_runtime_artifacts(id) on delete set null,
  section_count integer not null default 0 check (section_count >= 0),
  last_error_code text,
  last_error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists gnr8_site_bootstrap_jobs_status_idx
  on public.gnr8_site_bootstrap_jobs (status, updated_at);

create index if not exists gnr8_site_bootstrap_jobs_template_idx
  on public.gnr8_site_bootstrap_jobs (template_id, updated_at desc);
