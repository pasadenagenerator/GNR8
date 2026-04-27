alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists verification_type text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists verification_value text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists verification_host text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists last_checked_at timestamptz;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists vercel_domain_id text;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status in (''pending'', ''active'')%'
  loop
    execute format('alter table public.gnr8_runtime_domain_host_bindings drop constraint %I', r.conname);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and conname = 'gnr8_runtime_domain_host_bindings_status_ck'
  ) then
    alter table public.gnr8_runtime_domain_host_bindings
      add constraint gnr8_runtime_domain_host_bindings_status_ck
      check (status in ('pending', 'verifying', 'active', 'failed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and conname = 'gnr8_runtime_domain_host_bindings_verification_type_ck'
  ) then
    alter table public.gnr8_runtime_domain_host_bindings
      add constraint gnr8_runtime_domain_host_bindings_verification_type_ck
      check (verification_type in ('cname', 'txt'));
  end if;
end $$;
