-- Durable post-bootstrap rendered capture worker tracking.

create table if not exists public.gnr8_site_render_jobs (
  runtime_site_version_id uuid primary key references public.gnr8_runtime_site_versions(id) on delete cascade,
  runtime_site_id text references public.gnr8_runtime_sites(id) on delete set null,
  site_id uuid not null references public.sites(id) on delete cascade,
  client_id uuid not null references public.organizations(id) on delete cascade,
  agency_id uuid not null references public.organizations(id) on delete cascade,
  template_id uuid references public.gnr8_templates(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  requested_count integer not null default 0 check (requested_count >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  rendered_dom_path text,
  computed_styles_path text,
  acquisition_evidence_path text,
  screenshot_count integer not null default 0 check (screenshot_count >= 0),
  computed_style_sample_count integer not null default 0 check (computed_style_sample_count >= 0),
  dom_node_count integer not null default 0 check (dom_node_count >= 0),
  last_error_code text,
  last_error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists gnr8_site_render_jobs_status_idx
  on public.gnr8_site_render_jobs (status, updated_at);

create index if not exists gnr8_site_render_jobs_site_idx
  on public.gnr8_site_render_jobs (site_id, updated_at desc);
