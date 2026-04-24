create table if not exists public.gnr8_runtime_raw_template_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null default 'raw_template_site',
  site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
  site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
  entry_html_path text not null,
  asset_base_path text not null,
  file_map jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (site_version_id)
);

create table if not exists public.gnr8_runtime_raw_template_artifact_files (
  artifact_id uuid not null references public.gnr8_runtime_raw_template_artifacts(id) on delete cascade,
  file_path text not null,
  media_type text not null,
  file_size_bytes integer not null,
  sha256 text not null,
  content_bytes bytea not null,
  created_at timestamptz not null default now(),
  primary key (artifact_id, file_path)
);

create index if not exists gnr8_runtime_raw_template_artifacts_site_version_idx
  on public.gnr8_runtime_raw_template_artifacts (site_version_id);
