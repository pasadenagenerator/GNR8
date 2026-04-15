-- ============================================================
-- GNR8 Billing Account + Cost Center Foundation (Additive)
-- Date: 2026-03-27
-- Scope: Billing tables + idempotent ownership-aware backfill
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- billing_accounts
-- ------------------------------------------------------------
create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  stripe_customer_id text,
  billing_mode text not null default 'agency_pays',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_accounts_agency_id_uq unique (agency_id),
  constraint billing_accounts_billing_mode_chk check (
    billing_mode in ('agency_pays', 'hybrid', 'client_direct')
  ),
  constraint billing_accounts_status_chk check (
    status in ('active', 'suspended', 'delinquent')
  )
);

create index if not exists billing_accounts_agency_id_idx
  on public.billing_accounts (agency_id);

-- ------------------------------------------------------------
-- cost_centers
-- ------------------------------------------------------------
create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  entity_id uuid not null,
  parent_id uuid references public.cost_centers(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cost_centers_type_chk check (
    type in ('agency', 'client', 'site', 'operation')
  )
);

create index if not exists cost_centers_type_entity_id_idx
  on public.cost_centers (type, entity_id);

create index if not exists cost_centers_parent_id_idx
  on public.cost_centers (parent_id);

-- ------------------------------------------------------------
-- Backfill: billing_accounts + cost_centers
-- ------------------------------------------------------------
insert into public.billing_accounts (agency_id, billing_mode, status)
select
  a.id,
  'agency_pays',
  'active'
from public.agencies a
where not exists (
  select 1
  from public.billing_accounts ba
  where ba.agency_id = a.id
);

insert into public.cost_centers (type, entity_id, parent_id)
select
  'agency',
  a.id,
  null
from public.agencies a
where not exists (
  select 1
  from public.cost_centers cc
  where cc.type = 'agency'
    and cc.entity_id = a.id
);

do $$
declare
  has_organizations boolean;
  has_sites boolean;
begin
  select to_regclass('public.organizations') is not null into has_organizations;
  select to_regclass('public.sites') is not null into has_sites;

  if has_organizations then
    -- One client cost center per client organization, parented to agency.
    insert into public.cost_centers (type, entity_id, parent_id)
    select
      'client',
      c.client_id,
      c.agency_cost_center_id
    from (
      select
        o.id as client_id,
        (
          select cc.id
          from public.cost_centers cc
          where cc.type = 'agency'
            and cc.entity_id = o.agency_id
          order by cc.created_at asc, cc.id asc
          limit 1
        ) as agency_cost_center_id
      from public.organizations o
      where o.organization_type::text = 'client'
    ) c
    where c.agency_cost_center_id is not null
      and not exists (
        select 1
        from public.cost_centers cc
        where cc.type = 'client'
          and cc.entity_id = c.client_id
      );
  end if;

  if has_sites then
    -- One site cost center per site.
    -- Parenting: agency -> client -> site (fallback agency -> site when site org is not client).
    insert into public.cost_centers (type, entity_id, parent_id)
    select
      'site',
      s.site_id,
      s.parent_cost_center_id
    from (
      select
        site.id as site_id,
        case
          when org.organization_type::text = 'client' then coalesce(
            (
              select cc.id
              from public.cost_centers cc
              where cc.type = 'client'
                and cc.entity_id = site.org_id
              order by cc.created_at asc, cc.id asc
              limit 1
            ),
            (
              select cc.id
              from public.cost_centers cc
              where cc.type = 'agency'
                and cc.entity_id = site.agency_id
              order by cc.created_at asc, cc.id asc
              limit 1
            )
          )
          else (
            select cc.id
            from public.cost_centers cc
            where cc.type = 'agency'
              and cc.entity_id = site.agency_id
            order by cc.created_at asc, cc.id asc
            limit 1
          )
        end as parent_cost_center_id
      from public.sites site
      left join public.organizations org on org.id = site.org_id
    ) s
    where s.parent_cost_center_id is not null
      and not exists (
        select 1
        from public.cost_centers cc
        where cc.type = 'site'
          and cc.entity_id = s.site_id
      );
  end if;
end;
$$;

commit;
