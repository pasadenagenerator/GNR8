-- Template Intake Foundation V1
-- ZIP upload intake -> first-class template records -> deterministic status/health surface.

create table if not exists public.gnr8_templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.organizations(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  agency_id uuid references public.agencies(id) on delete set null,
  created_by_user_id uuid,
  name text not null,
  slug text not null,
  source_type text not null check (source_type in ('zip_html')),
  status text not null check (status in ('uploaded', 'processing', 'ready', 'failed')),
  import_health text not null check (import_health in ('clean', 'degraded', 'failed')),
  preview_image_path text,
  preview_available boolean not null default false,
  preview_is_fallback boolean not null default true,
  preview_source text not null default 'fallback' check (preview_source in ('rendered_capture', 'fallback')),
  tags text[] not null default '{}'::text[],
  source_filename text not null,
  import_snapshot_id text,
  template_manifest_summary jsonb,
  diagnostics_summary jsonb,
  import_manifest_summary jsonb,
  version integer not null default 1,
  visibility text not null default 'private' check (visibility in ('private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gnr8_templates_client_created_idx
  on public.gnr8_templates (client_id, created_at desc, id desc);

create unique index if not exists gnr8_templates_client_slug_uq
  on public.gnr8_templates (client_id, lower(slug));

create index if not exists gnr8_templates_status_idx
  on public.gnr8_templates (status, import_health);
