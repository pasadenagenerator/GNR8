-- Immutable GitHub destination for a site, independent of later publication setup.
begin;

create table public.gnr8_site_github_repository_bindings (
  site_id uuid primary key references public.sites(id) on delete restrict,
  agency_id uuid not null,
  client_id uuid not null,
  github_owner text not null check (github_owner ~ '^[A-Za-z0-9-]{1,39}$'),
  github_owner_id bigint not null check (github_owner_id > 0),
  repository text not null check (repository ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  binding_state text not null check (binding_state in ('reserved', 'creating', 'bound')),
  repository_id bigint unique check (repository_id > 0),
  constraint gnr8_site_github_repository_binding_state_chk check (
    (binding_state in ('reserved', 'creating') and repository_id is null) or
    (binding_state = 'bound' and repository_id is not null)
  ),
  created_at timestamptz not null default now(),
  unique (github_owner_id, repository)
);

create function public.gnr8_check_site_github_repository_binding()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.sites
    where id = new.site_id and agency_id = new.agency_id and org_id = new.client_id
  ) then
    raise exception 'site_github_repository_scope_mismatch';
  end if;
  if TG_OP = 'UPDATE' then
    if not ((old.binding_state = 'reserved' and new.binding_state in ('creating', 'bound')) or
            (old.binding_state = 'creating' and new.binding_state = 'bound')) or
       old.site_id <> new.site_id or old.agency_id <> new.agency_id or
       old.client_id <> new.client_id or old.github_owner <> new.github_owner or
       old.github_owner_id <> new.github_owner_id or old.repository <> new.repository or
       old.created_at <> new.created_at then
      raise exception 'site_github_repository_binding_immutable';
    end if;
  end if;
  return new;
end $$;

create trigger gnr8_site_github_repository_binding_scope
before insert or update on public.gnr8_site_github_repository_bindings
for each row execute function public.gnr8_check_site_github_repository_binding();

alter table public.gnr8_site_github_repository_bindings enable row level security;
alter table public.gnr8_site_github_repository_bindings force row level security;
revoke all on public.gnr8_site_github_repository_bindings from anon, authenticated;
grant select, insert, update on public.gnr8_site_github_repository_bindings to service_role;

commit;
