-- Control-plane configuration only; no runtime/publication pointer changes.
begin;
create table public.gnr8_standalone_connections (
 site_id uuid primary key references public.sites(id) on delete restrict,
 agency_id uuid not null,
 client_id uuid not null,
 revision integer not null check (revision > 0),
 settings jsonb not null check (jsonb_typeof(settings) = 'object'),
 encrypted_credentials jsonb not null check (jsonb_typeof(encrypted_credentials) = 'object'),
 updated_by uuid not null,
 updated_at timestamptz not null default now()
);
-- Unique indexes prevent one provider resource being bound across tenants.
create unique index gnr8_standalone_repository on public.gnr8_standalone_connections
 (lower(settings->>'githubOwner'), lower(settings->>'repository'));
create unique index gnr8_standalone_project on public.gnr8_standalone_connections
 ((settings->>'vercelTeamId'), (settings->>'project'));
create unique index gnr8_standalone_host on public.gnr8_standalone_connections ((settings->>'host'));
create function public.gnr8_check_standalone_scope() returns trigger language plpgsql set search_path = public as $$
begin
 if not exists (select 1 from public.sites where id = new.site_id and agency_id = new.agency_id and org_id = new.client_id) then
  raise exception 'standalone_ownership_mismatch';
 end if;
 if TG_OP = 'UPDATE' and (new.site_id <> old.site_id or new.agency_id <> old.agency_id or new.client_id <> old.client_id or new.revision <> old.revision + 1) then
  raise exception 'standalone_connection_stale';
 end if;
 return new;
end $$;
create trigger gnr8_standalone_scope before insert or update on public.gnr8_standalone_connections
 for each row execute function public.gnr8_check_standalone_scope();
alter table public.gnr8_standalone_connections enable row level security;
alter table public.gnr8_standalone_connections force row level security;
revoke all on public.gnr8_standalone_connections from anon, authenticated;
grant select, insert, update on public.gnr8_standalone_connections to service_role;
commit;
