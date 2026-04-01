-- ============================================================
-- Multi-Agency RLS Scope Hardening (Additive)
-- Date: 2026-03-30
-- Scope: tighten multi-agency read isolation for organizations/sites
-- ============================================================

begin;

alter table public.memberships enable row level security;
alter table public.organizations enable row level security;
alter table public.sites enable row level security;

drop policy if exists memberships_select_own_rows on public.memberships;
create policy memberships_select_own_rows
on public.memberships
for select
using (auth.uid() = user_id);

drop policy if exists organizations_select_member_scope on public.organizations;
drop policy if exists sites_select_member_agency_scope on public.sites;
do $$
declare
  has_org_id boolean := false;
  has_organization_id boolean := false;
  membership_org_expr text;
begin
  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'memberships'
       and column_name = 'org_id'
  ) into has_org_id;

  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'memberships'
       and column_name = 'organization_id'
  ) into has_organization_id;

  if has_organization_id and has_org_id then
    membership_org_expr := 'coalesce(m.organization_id, m.org_id)';
  elsif has_organization_id then
    membership_org_expr := 'm.organization_id';
  elsif has_org_id then
    membership_org_expr := 'm.org_id';
  else
    raise exception 'memberships schema mismatch: expected organization_id and/or org_id';
  end if;

  execute format(
    'create policy organizations_select_member_scope
     on public.organizations
     for select
     using (
       exists (
         select 1
           from public.memberships m
          where m.user_id = auth.uid()
            and %1$s = organizations.id
       )
       or exists (
         select 1
           from public.memberships m
           join public.organizations member_org
             on member_org.id = %1$s
          where m.user_id = auth.uid()
            and member_org.organization_type::text = ''agency''
            and member_org.agency_id = organizations.agency_id
       )
     )',
    membership_org_expr
  );

  execute format(
    'create policy sites_select_member_agency_scope
     on public.sites
     for select
     using (
       exists (
         select 1
           from public.memberships m
           join public.organizations member_org
             on member_org.id = %1$s
          where m.user_id = auth.uid()
            and member_org.organization_type::text = ''agency''
            and member_org.agency_id = sites.agency_id
       )
     )',
    membership_org_expr
  );
end;
$$;

commit;
