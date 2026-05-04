alter table public.gnr8_content_overrides
  add column if not exists updated_by text;

alter table public.gnr8_content_overrides
  add column if not exists updated_at timestamptz not null default now();

alter table public.gnr8_content_overrides
  add column if not exists site_version_id uuid references public.gnr8_runtime_site_versions(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gnr8_content_overrides'
      and column_name = 'site_version_id'
      and is_nullable = 'YES'
  ) then
    execute 'alter table public.gnr8_content_overrides alter column site_version_id set not null';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gnr8_content_overrides_site_version_slot_status_key'
  ) then
    alter table public.gnr8_content_overrides
      add constraint gnr8_content_overrides_site_version_slot_status_key unique (site_version_id, slot_key, status);
  end if;
end $$;
