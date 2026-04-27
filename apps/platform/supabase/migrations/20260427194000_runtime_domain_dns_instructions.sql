alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists domain_type text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists dns_record_type text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists dns_record_host text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists dns_record_value text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists dns_record_purpose text;

alter table if exists public.gnr8_runtime_domain_host_bindings
  add column if not exists dns_instructions_json jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and conname = 'gnr8_runtime_domain_host_bindings_domain_type_ck'
  ) then
    alter table public.gnr8_runtime_domain_host_bindings
      add constraint gnr8_runtime_domain_host_bindings_domain_type_ck
      check (domain_type in ('apex_domain', 'subdomain', 'wildcard_domain', 'unknown'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and conname = 'gnr8_runtime_domain_host_bindings_dns_record_type_ck'
  ) then
    alter table public.gnr8_runtime_domain_host_bindings
      add constraint gnr8_runtime_domain_host_bindings_dns_record_type_ck
      check (dns_record_type in ('a', 'cname', 'txt'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
      and conname = 'gnr8_runtime_domain_host_bindings_dns_record_purpose_ck'
  ) then
    alter table public.gnr8_runtime_domain_host_bindings
      add constraint gnr8_runtime_domain_host_bindings_dns_record_purpose_ck
      check (dns_record_purpose in ('verification', 'routing'));
  end if;
end $$;
