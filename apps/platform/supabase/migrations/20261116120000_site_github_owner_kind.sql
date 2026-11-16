-- Existing site bindings were organization-owned. Preserve them while allowing
-- new private site repositories under a verified personal GitHub account.
begin;

alter table public.gnr8_site_github_repository_bindings
  add column if not exists github_owner_kind text not null default 'Organization';

alter table public.gnr8_site_github_repository_bindings
  add constraint gnr8_site_github_repository_owner_kind_chk
  check (github_owner_kind in ('User', 'Organization'));

create or replace function public.gnr8_check_site_github_repository_binding()
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
       old.github_owner_id <> new.github_owner_id or old.github_owner_kind <> new.github_owner_kind or
       old.repository <> new.repository or old.created_at <> new.created_at then
      raise exception 'site_github_repository_binding_immutable';
    end if;
  end if;
  return new;
end $$;

commit;
