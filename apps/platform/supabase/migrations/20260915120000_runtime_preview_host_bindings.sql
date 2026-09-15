create table if not exists public.gnr8_runtime_preview_host_bindings (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
  host text not null,
  candidate_site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
  candidate_artifact_id uuid not null references public.gnr8_runtime_artifacts(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  binding_kind text not null default 'candidate_preview',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, host)
);

create unique index if not exists gnr8_runtime_preview_host_bindings_active_host_uq
  on public.gnr8_runtime_preview_host_bindings (lower(host))
  where status = 'ACTIVE';
