create table if not exists public.gnr8_runtime_domain_host_bindings (
  id uuid primary key default gen_random_uuid(),
  site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
  site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, domain)
);

create unique index if not exists gnr8_runtime_domain_host_bindings_active_domain_uq
  on public.gnr8_runtime_domain_host_bindings (lower(domain))
  where status = 'active';
