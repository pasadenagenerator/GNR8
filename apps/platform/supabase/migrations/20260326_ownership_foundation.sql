-- ============================================================
-- GNR8 Ownership Foundation (Additive, Backward-Compatible)
-- Date: 2026-03-26
-- Scope: Ownership model extension only (no billing logic/runtime behavior changes)
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Constants / bootstrap assumptions
-- ------------------------------------------------------------
-- Stable UUID for the default home agency so legacy org inserts
-- can keep working via organizations.agency_id default.
--
-- NOTE: If this UUID already exists in your environment, migration is idempotent.

-- ------------------------------------------------------------
-- STEP 1: Agencies
-- ------------------------------------------------------------
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_home_agency boolean not null default false
);

create unique index if not exists agencies_slug_uq
  on public.agencies (lower(slug));

-- At most one home agency via partial unique index.
create unique index if not exists agencies_single_home_uq
  on public.agencies (is_home_agency)
  where is_home_agency = true;

create or replace function public.gnr8_enforce_exactly_one_home_agency()
returns trigger
language plpgsql
as $$
declare
  v_home_count bigint;
begin
  select count(*)
    into v_home_count
    from public.agencies
   where is_home_agency = true;

  if v_home_count <> 1 then
    raise exception 'Exactly one home agency must exist (found %).', v_home_count
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_gnr8_exactly_one_home_agency on public.agencies;
create constraint trigger trg_gnr8_exactly_one_home_agency
after insert or update or delete on public.agencies
deferrable initially deferred
for each row
execute function public.gnr8_enforce_exactly_one_home_agency();

-- Seed canonical home agency (idempotent)
update public.agencies
   set is_home_agency = false,
       updated_at = now()
 where id <> '00000000-0000-4000-8000-000000000001'::uuid
   and is_home_agency = true;

insert into public.agencies (id, name, slug, is_home_agency)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'GNR8 Home Agency',
  'home',
  true
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    is_home_agency = true,
    updated_at = now();

-- ------------------------------------------------------------
-- STEP 2: organizations -> agency/client relation
-- ------------------------------------------------------------
do $$
begin
  create type public.organization_type_enum as enum ('agency', 'client', 'internal');
exception
  when duplicate_object then null;
end;
$$;

alter table if exists public.organizations
  add column if not exists agency_id uuid;

alter table if exists public.organizations
  add column if not exists organization_type public.organization_type_enum;

update public.organizations
   set agency_id = '00000000-0000-4000-8000-000000000001'::uuid
 where agency_id is null;

update public.organizations
   set organization_type = 'agency'::public.organization_type_enum
 where organization_type is null;

alter table if exists public.organizations
  alter column agency_id set default '00000000-0000-4000-8000-000000000001'::uuid;

alter table if exists public.organizations
  alter column organization_type set default 'agency'::public.organization_type_enum;

alter table if exists public.organizations
  alter column agency_id set not null;

alter table if exists public.organizations
  alter column organization_type set not null;

do $$
begin
  alter table public.organizations
    add constraint organizations_agency_id_fkey
    foreign key (agency_id)
    references public.agencies(id)
    on delete restrict;
exception
  when duplicate_object then null;
end;
$$;

-- ------------------------------------------------------------
-- STEP 3 + STEP 5: first-class sites + billing ownership prep
-- ------------------------------------------------------------
do $$
begin
  create type public.site_status_enum as enum ('draft', 'migrating', 'shadow', 'live', 'archived');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.billing_scope_enum as enum ('agency', 'client');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  status public.site_status_enum not null default 'draft',
  domain text,
  is_template boolean not null default false,
  billing_scope public.billing_scope_enum not null default 'agency',
  billing_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- STEP 8 constraints
-- live site must have domain
-- template must not have domain
alter table public.sites
  drop constraint if exists sites_live_requires_domain_chk;
alter table public.sites
  add constraint sites_live_requires_domain_chk
  check (status <> 'live'::public.site_status_enum or domain is not null);

alter table public.sites
  drop constraint if exists sites_template_without_domain_chk;
alter table public.sites
  add constraint sites_template_without_domain_chk
  check (is_template = false or domain is null);

-- Cross-table ownership rules (org type aware)
create or replace function public.gnr8_validate_site_ownership_rules()
returns trigger
language plpgsql
as $$
declare
  v_org_type public.organization_type_enum;
begin
  select o.organization_type
    into v_org_type
    from public.organizations o
   where o.id = new.org_id;

  if v_org_type is null then
    raise exception 'Site org_id % does not map to an organization.', new.org_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Live domain sites must belong to client org.
  if new.status = 'live'::public.site_status_enum and v_org_type <> 'client'::public.organization_type_enum then
    raise exception 'Live sites must be owned by client organizations.'
      using errcode = 'check_violation';
  end if;

  -- Templates must belong to agency org.
  if new.is_template = true and v_org_type <> 'agency'::public.organization_type_enum then
    raise exception 'Template sites must be owned by agency organizations.'
      using errcode = 'check_violation';
  end if;

  -- Client site must not be template.
  if v_org_type = 'client'::public.organization_type_enum and new.is_template = true then
    raise exception 'Client-owned sites cannot be templates.'
      using errcode = 'check_violation';
  end if;

  -- Shadow migration sites belong to agency.
  if new.status = 'shadow'::public.site_status_enum and v_org_type <> 'agency'::public.organization_type_enum then
    raise exception 'Shadow sites must be owned by agency organizations.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gnr8_validate_site_ownership_rules on public.sites;
create trigger trg_gnr8_validate_site_ownership_rules
before insert or update of org_id, status, domain, is_template
on public.sites
for each row
execute function public.gnr8_validate_site_ownership_rules();

create or replace function public.gnr8_revalidate_sites_after_org_type_change()
returns trigger
language plpgsql
as $$
begin
  if old.organization_type is distinct from new.organization_type then
    perform 1
      from public.sites s
     where s.org_id = new.id
       and (
         (s.status = 'live'::public.site_status_enum and new.organization_type <> 'client'::public.organization_type_enum)
         or (s.is_template = true and new.organization_type <> 'agency'::public.organization_type_enum)
         or (s.is_template = true and new.organization_type = 'client'::public.organization_type_enum)
         or (s.status = 'shadow'::public.site_status_enum and new.organization_type <> 'agency'::public.organization_type_enum)
       )
     limit 1;

    if found then
      raise exception 'Organization type change violates existing site ownership rules for org %.', new.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gnr8_revalidate_sites_after_org_type_change on public.organizations;
create trigger trg_gnr8_revalidate_sites_after_org_type_change
after update of organization_type on public.organizations
for each row
execute function public.gnr8_revalidate_sites_after_org_type_change();

-- ------------------------------------------------------------
-- STEP 4: link runtime site versions -> first-class site
-- ------------------------------------------------------------
-- IMPORTANT: public.gnr8_runtime_site_versions already has a legacy `site_id text`
-- used by runtime internals. To stay backward compatible, we add ownership_site_id.
alter table if exists public.gnr8_runtime_site_versions
  add column if not exists ownership_site_id uuid;

do $$
begin
  if to_regclass('public.gnr8_runtime_site_versions') is not null then
    alter table public.gnr8_runtime_site_versions
      add constraint gnr8_runtime_site_versions_ownership_site_id_fkey
      foreign key (ownership_site_id)
      references public.sites(id)
      on delete set null;
  end if;
exception
  when duplicate_object then null;
end;
$$;

create index if not exists gnr8_runtime_site_versions_ownership_site_idx
  on public.gnr8_runtime_site_versions (ownership_site_id);

-- ------------------------------------------------------------
-- STEP 6: migration ownership prep
-- ------------------------------------------------------------
do $$
begin
  create type public.migration_owner_type_enum as enum ('agency', 'client');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  if to_regclass('public.migration_jobs') is not null then
    alter table public.migration_jobs
      add column if not exists agency_id uuid;

    alter table public.migration_jobs
      add column if not exists site_id uuid;

    alter table public.migration_jobs
      add column if not exists migration_owner_type public.migration_owner_type_enum;

    update public.migration_jobs
       set agency_id = '00000000-0000-4000-8000-000000000001'::uuid
     where agency_id is null;

    update public.migration_jobs
       set migration_owner_type = 'agency'::public.migration_owner_type_enum
     where migration_owner_type is null;

    alter table public.migration_jobs
      alter column migration_owner_type set default 'agency'::public.migration_owner_type_enum;

    alter table public.migration_jobs
      alter column migration_owner_type set not null;

    begin
      alter table public.migration_jobs
        add constraint migration_jobs_agency_id_fkey
        foreign key (agency_id)
        references public.agencies(id)
        on delete restrict;
    exception
      when duplicate_object then null;
    end;

    begin
      alter table public.migration_jobs
        add constraint migration_jobs_site_id_fkey
        foreign key (site_id)
        references public.sites(id)
        on delete set null;
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- STEP 7: default home agency migration (already included above)
-- Attach all orgs to home agency + mark org type as agency by default.
-- ------------------------------------------------------------
update public.organizations
   set agency_id = '00000000-0000-4000-8000-000000000001'::uuid
 where agency_id is null;

update public.organizations
   set organization_type = 'agency'::public.organization_type_enum
 where organization_type is null;

-- ------------------------------------------------------------
-- STEP 9: indexing strategy
-- ------------------------------------------------------------
create index if not exists sites_org_id_idx on public.sites (org_id);
create index if not exists sites_agency_id_idx on public.sites (agency_id);
create index if not exists sites_domain_idx on public.sites (domain);

do $$
begin
  if to_regclass('public.migration_jobs') is not null then
    create index if not exists migration_jobs_agency_id_idx
      on public.migration_jobs (agency_id);
  end if;
end;
$$;

commit;
