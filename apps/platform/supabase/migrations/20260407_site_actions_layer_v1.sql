-- Site Actions Layer V1
-- Adds persistent execution/action tables for site workspace control surface
-- and includes minimal RLS policies for read/write access.

create table if not exists public.gnr8_site_actions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  type text not null check (type in ('rerun_transformation', 'generate_redesign', 'publish_site')),
  status text not null default 'idle' check (status in ('idle', 'running', 'completed', 'failed')),
  strategy text,
  result_summary text,
  diagnostics jsonb not null default '[]'::jsonb,
  variant_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists gnr8_site_actions_site_created_idx
  on public.gnr8_site_actions (site_id, created_at desc);

create index if not exists gnr8_site_actions_status_idx
  on public.gnr8_site_actions (status);

create table if not exists public.gnr8_site_variants (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  label text not null,
  strategy text not null,
  site_version_id uuid references public.gnr8_runtime_site_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gnr8_site_variants_site_created_idx
  on public.gnr8_site_variants (site_id, created_at desc);

create table if not exists public.gnr8_site_publish_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
  published_by text not null,
  result_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now()
);

create index if not exists gnr8_site_publish_events_site_published_idx
  on public.gnr8_site_publish_events (site_id, published_at desc);

alter table public.gnr8_site_actions
  drop constraint if exists gnr8_site_actions_variant_id_fkey;

alter table public.gnr8_site_actions
  add constraint gnr8_site_actions_variant_id_fkey
  foreign key (variant_id)
  references public.gnr8_site_variants(id)
  on delete set null;

alter table public.gnr8_site_actions enable row level security;
alter table public.gnr8_site_variants enable row level security;
alter table public.gnr8_site_publish_events enable row level security;

-- SELECT POLICIES

drop policy if exists gnr8_site_actions_select_scoped on public.gnr8_site_actions;
create policy gnr8_site_actions_select_scoped
on public.gnr8_site_actions
for select
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_actions.site_id
  )
);

drop policy if exists gnr8_site_variants_select_scoped on public.gnr8_site_variants;
create policy gnr8_site_variants_select_scoped
on public.gnr8_site_variants
for select
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_variants.site_id
  )
);

drop policy if exists gnr8_site_publish_events_select_scoped on public.gnr8_site_publish_events;
create policy gnr8_site_publish_events_select_scoped
on public.gnr8_site_publish_events
for select
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_publish_events.site_id
  )
);

-- INSERT POLICIES

drop policy if exists gnr8_site_actions_insert_scoped on public.gnr8_site_actions;
create policy gnr8_site_actions_insert_scoped
on public.gnr8_site_actions
for insert
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_actions.site_id
  )
);

drop policy if exists gnr8_site_variants_insert_scoped on public.gnr8_site_variants;
create policy gnr8_site_variants_insert_scoped
on public.gnr8_site_variants
for insert
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_variants.site_id
  )
);

drop policy if exists gnr8_site_publish_events_insert_scoped on public.gnr8_site_publish_events;
create policy gnr8_site_publish_events_insert_scoped
on public.gnr8_site_publish_events
for insert
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_publish_events.site_id
  )
);

-- UPDATE POLICIES

drop policy if exists gnr8_site_actions_update_scoped on public.gnr8_site_actions;
create policy gnr8_site_actions_update_scoped
on public.gnr8_site_actions
for update
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_actions.site_id
  )
)
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_actions.site_id
  )
);

drop policy if exists gnr8_site_variants_update_scoped on public.gnr8_site_variants;
create policy gnr8_site_variants_update_scoped
on public.gnr8_site_variants
for update
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_variants.site_id
  )
)
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_variants.site_id
  )
);

drop policy if exists gnr8_site_publish_events_update_scoped on public.gnr8_site_publish_events;
create policy gnr8_site_publish_events_update_scoped
on public.gnr8_site_publish_events
for update
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_publish_events.site_id
  )
)
with check (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_publish_events.site_id
  )
);

-- DELETE POLICIES (optional but useful for safe future cleanup)

drop policy if exists gnr8_site_actions_delete_scoped on public.gnr8_site_actions;
create policy gnr8_site_actions_delete_scoped
on public.gnr8_site_actions
for delete
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_actions.site_id
  )
);

drop policy if exists gnr8_site_variants_delete_scoped on public.gnr8_site_variants;
create policy gnr8_site_variants_delete_scoped
on public.gnr8_site_variants
for delete
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_variants.site_id
  )
);

drop policy if exists gnr8_site_publish_events_delete_scoped on public.gnr8_site_publish_events;
create policy gnr8_site_publish_events_delete_scoped
on public.gnr8_site_publish_events
for delete
using (
  exists (
    select 1
    from public.sites s
    where s.id = gnr8_site_publish_events.site_id
  )
);
