-- ============================================================
-- GNR8 Ownership Foundation Schema Model (Post-Migration)
-- Canonical additive model for ownership hierarchy extension.
-- ============================================================

-- Enums
create type public.organization_type_enum as enum ('agency', 'client', 'internal');
create type public.site_status_enum as enum ('draft', 'migrating', 'shadow', 'live', 'archived');
create type public.billing_scope_enum as enum ('agency', 'client');
create type public.migration_owner_type_enum as enum ('agency', 'client');
create type public.membership_role_enum as enum ('owner', 'admin', 'member');

-- Agencies
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_home_agency boolean not null default false
);

create unique index agencies_slug_uq on public.agencies (lower(slug));
create unique index agencies_single_home_uq on public.agencies (is_home_agency) where is_home_agency = true;

-- Organizations extension
alter table public.organizations
  add column agency_id uuid not null references public.agencies(id) on delete restrict,
  add column organization_type public.organization_type_enum not null default 'agency';

alter table public.organizations
  alter column agency_id set default '00000000-0000-4000-8000-000000000001'::uuid;

-- Memberships (agency RBAC core)
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  -- Legacy compatibility with existing repository reads/writes.
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.membership_role_enum not null default 'member',
  created_at timestamptz not null default now()
);

create unique index memberships_organization_user_unique
  on public.memberships (organization_id, user_id);
create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_organization_id_idx on public.memberships (organization_id);

-- First-class sites
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  status public.site_status_enum not null default 'draft',
  domain text,
  is_template boolean not null default false,
  billing_scope public.billing_scope_enum not null default 'agency',
  billing_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_live_requires_domain_chk
    check (status <> 'live'::public.site_status_enum or domain is not null),
  constraint sites_template_without_domain_chk
    check (is_template = false or domain is null)
);

create index sites_org_id_idx on public.sites (org_id);
create index sites_agency_id_idx on public.sites (agency_id);
create index sites_domain_idx on public.sites (domain);

-- Runtime linkage extension
-- NOTE: runtime table already contains `site_id text` for runtime-internal site identity,
-- so ownership linkage uses `ownership_site_id` to avoid breaking runtime behavior.
alter table public.gnr8_runtime_site_versions
  add column ownership_site_id uuid references public.sites(id) on delete set null;

create index gnr8_runtime_site_versions_ownership_site_idx
  on public.gnr8_runtime_site_versions (ownership_site_id);

-- Migration ownership prep (if migration_jobs exists)
alter table public.migration_jobs
  add column agency_id uuid references public.agencies(id) on delete restrict,
  add column site_id uuid references public.sites(id) on delete set null,
  add column migration_owner_type public.migration_owner_type_enum not null default 'agency';

create index migration_jobs_agency_id_idx on public.migration_jobs (agency_id);

-- Minimal RLS foundation (agency-scoped reads)
alter table public.memberships enable row level security;
alter table public.organizations enable row level security;
alter table public.sites enable row level security;
