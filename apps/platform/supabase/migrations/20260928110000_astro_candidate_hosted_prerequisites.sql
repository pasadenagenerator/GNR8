-- GNR8 Astro candidate hosted prerequisites.
--
-- This migration is intentionally data-empty. It establishes the canonical
-- ownership relations required by the candidate registry without inventing or
-- backfilling agencies, organizations, sites, memberships, or runtime links.

begin;

do $$
begin
  if to_regclass('public.gnr8_runtime_sites') is null
    or to_regclass('public.gnr8_runtime_site_versions') is null then
    raise exception 'astro_candidate_prerequisite_runtime_tables_missing';
  end if;

  if to_regclass('public.organizations') is not null
    or to_regclass('public.agencies') is not null
    or to_regclass('public.sites') is not null
    or to_regtype('public.organization_type_enum') is not null
    or to_regtype('public.site_status_enum') is not null
    or to_regtype('public.billing_scope_enum') is not null then
    raise exception 'astro_candidate_prerequisite_object_collision';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'astro_candidate_prerequisite_extensions_digest_missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gnr8_runtime_site_versions'
      and column_name = 'ownership_site_id'
  ) then
    raise exception 'astro_candidate_prerequisite_ownership_link_collision';
  end if;
end;
$$;

create type public.organization_type_enum as enum ('agency', 'client', 'internal');
create type public.site_status_enum as enum ('draft', 'migrating', 'shadow', 'live', 'archived');
create type public.billing_scope_enum as enum ('agency', 'client');

create table public.agencies (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  is_home_agency boolean not null default false
);

create unique index agencies_slug_uq
  on public.agencies (pg_catalog.lower(slug));

create unique index agencies_single_home_uq
  on public.agencies (is_home_agency)
  where is_home_agency = true;

create table public.organizations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null,
  agency_id uuid not null
    references public.agencies(id) on delete restrict,
  organization_type public.organization_type_enum not null,
  slug text,
  contact_person_name text,
  contact_email text,
  contact_phone text,
  brand_logo_url text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create unique index organizations_client_agency_slug_uq
  on public.organizations (agency_id, pg_catalog.lower(slug))
  where organization_type = 'client'::public.organization_type_enum;

create table public.sites (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  org_id uuid not null
    references public.organizations(id) on delete restrict,
  agency_id uuid not null
    references public.agencies(id) on delete restrict,
  status public.site_status_enum not null default 'draft',
  domain text,
  is_template boolean not null default false,
  billing_scope public.billing_scope_enum not null default 'agency',
  billing_locked boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint sites_live_requires_domain_chk
    check (status <> 'live'::public.site_status_enum or domain is not null),
  constraint sites_template_without_domain_chk
    check (is_template = false or domain is null)
);

create index sites_org_id_idx on public.sites (org_id);
create index sites_agency_id_idx on public.sites (agency_id);
create index sites_domain_idx on public.sites (domain);

create function public.gnr8_validate_site_ownership_rules()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_org_type public.organization_type_enum;
  v_org_agency_id uuid;
begin
  select o.organization_type, o.agency_id
    into v_org_type, v_org_agency_id
    from public.organizations as o
   where o.id = new.org_id;

  if not found then
    raise exception 'Site org_id % does not map to an organization.', new.org_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_org_agency_id <> new.agency_id then
    raise exception 'Site agency_id must match organizations.agency_id.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'live'::public.site_status_enum
    and v_org_type <> 'client'::public.organization_type_enum then
    raise exception 'Live sites must be owned by client organizations.'
      using errcode = 'check_violation';
  end if;

  if new.is_template
    and v_org_type <> 'agency'::public.organization_type_enum then
    raise exception 'Templates must be owned by agency organizations.'
      using errcode = 'check_violation';
  end if;

  if new.status = 'shadow'::public.site_status_enum
    and v_org_type <> 'agency'::public.organization_type_enum then
    raise exception 'Shadow sites must be owned by agency organizations.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_gnr8_validate_site_ownership_rules
before insert or update of org_id, agency_id, status, domain, is_template
on public.sites
for each row
execute function public.gnr8_validate_site_ownership_rules();

create function public.gnr8_revalidate_sites_after_org_ownership_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.agency_id is distinct from new.agency_id
    or old.organization_type is distinct from new.organization_type then
    if exists (
      select 1
      from public.sites as s
      where s.org_id = new.id
        and (
          s.agency_id <> new.agency_id
          or (s.status = 'live'::public.site_status_enum
              and new.organization_type <> 'client'::public.organization_type_enum)
          or (s.is_template
              and new.organization_type <> 'agency'::public.organization_type_enum)
          or (s.status = 'shadow'::public.site_status_enum
              and new.organization_type <> 'agency'::public.organization_type_enum)
        )
    ) then
      raise exception 'Organization ownership change violates existing site ownership.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_gnr8_revalidate_sites_after_org_ownership_change
after update of agency_id, organization_type
on public.organizations
for each row
execute function public.gnr8_revalidate_sites_after_org_ownership_change();

alter table public.gnr8_runtime_site_versions
  add column ownership_site_id uuid;

alter table public.gnr8_runtime_site_versions
  add constraint gnr8_runtime_site_versions_ownership_site_id_fkey
  foreign key (ownership_site_id)
  references public.sites(id)
  on delete set null;

create index gnr8_runtime_site_versions_ownership_site_idx
  on public.gnr8_runtime_site_versions (ownership_site_id);

alter table public.agencies enable row level security;
alter table public.organizations enable row level security;
alter table public.sites enable row level security;

revoke all on table public.agencies from public, anon, authenticated, service_role;
revoke all on table public.organizations from public, anon, authenticated, service_role;
revoke all on table public.sites from public, anon, authenticated, service_role;

grant select on table public.agencies to service_role;
grant select on table public.organizations to service_role;
grant select on table public.sites to service_role;

revoke all on function public.gnr8_validate_site_ownership_rules()
  from public, anon, authenticated, service_role;
revoke all on function public.gnr8_revalidate_sites_after_org_ownership_change()
  from public, anon, authenticated, service_role;

commit;
