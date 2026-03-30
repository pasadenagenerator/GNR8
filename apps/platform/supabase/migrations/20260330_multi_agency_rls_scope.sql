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
create policy organizations_select_member_scope
on public.organizations
for select
using (
  exists (
    select 1
      from public.memberships m
     where m.user_id = auth.uid()
       and coalesce(m.organization_id, m.org_id) = organizations.id
  )
  or exists (
    select 1
      from public.memberships m
      join public.organizations member_org
        on member_org.id = coalesce(m.organization_id, m.org_id)
     where m.user_id = auth.uid()
       and member_org.organization_type::text = 'agency'
       and member_org.agency_id = organizations.agency_id
  )
);

drop policy if exists sites_select_member_agency_scope on public.sites;
create policy sites_select_member_agency_scope
on public.sites
for select
using (
  exists (
    select 1
      from public.memberships m
      join public.organizations member_org
        on member_org.id = coalesce(m.organization_id, m.org_id)
     where m.user_id = auth.uid()
       and member_org.organization_type::text = 'agency'
       and member_org.agency_id = sites.agency_id
  )
);

commit;
