-- Align bootstrap runtime_site_id with runtime site identifier type (text).

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gnr8_site_bootstrap_jobs'
      and column_name = 'runtime_site_id'
      and udt_name = 'uuid'
  ) then
    alter table public.gnr8_site_bootstrap_jobs
      drop constraint if exists gnr8_site_bootstrap_jobs_runtime_site_id_fkey;

    alter table public.gnr8_site_bootstrap_jobs
      alter column runtime_site_id type text using runtime_site_id::text;
  end if;
end
$$;

alter table public.gnr8_site_bootstrap_jobs
  drop constraint if exists gnr8_site_bootstrap_jobs_runtime_site_id_fkey;

alter table public.gnr8_site_bootstrap_jobs
  add constraint gnr8_site_bootstrap_jobs_runtime_site_id_fkey
  foreign key (runtime_site_id)
  references public.gnr8_runtime_sites(id)
  on delete set null;
