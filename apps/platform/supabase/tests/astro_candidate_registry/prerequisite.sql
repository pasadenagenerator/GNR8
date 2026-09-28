-- Minimal test-only prerequisites for disposable MVP 13 database validation.
--
-- This is intentionally not a replay of repository migration history. The
-- checked-in history does not create public.organizations, and runtime tables
-- are application-created. Every inferred column/type used by the candidate
-- migration or its fixtures is declared explicitly below.
--
-- Inferred public.organizations columns:
--   id uuid primary key, name text not null, agency_id uuid not null,
--   organization_type public.organization_type_enum not null.
-- Checked-in ownership/runtime columns are reduced to the exact types and
-- relationships required by 20260928120000_astro_candidate_registry.sql.

\set ON_ERROR_STOP on

do $$
begin
  create role anon
    nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  create role authenticated
    nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
exception when duplicate_object then null;
end;
$$;
do $$
begin
  create role service_role
    nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
exception when duplicate_object then null;
end;
$$;

create extension pgcrypto with schema public;

create type public.organization_type_enum as enum ('agency', 'client', 'internal');
create type public.site_status_enum as enum ('draft', 'migrating', 'shadow', 'live', 'archived');
create type public.billing_scope_enum as enum ('agency', 'client');

create table public.agencies (
  id uuid primary key,
  name text not null,
  slug text not null,
  is_home_agency boolean not null default false
);

create table public.organizations (
  id uuid primary key,
  name text not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  organization_type public.organization_type_enum not null
);

create table public.sites (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete restrict,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  status public.site_status_enum not null default 'draft',
  domain text,
  is_template boolean not null default false,
  billing_scope public.billing_scope_enum not null default 'agency',
  billing_locked boolean not null default false
);

create table public.gnr8_runtime_sites (
  id text primary key,
  source_url text not null,
  source_host text
);

create table public.gnr8_runtime_site_versions (
  id uuid primary key,
  site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
  version_no integer not null,
  state text not null,
  source text not null,
  actor text not null,
  renderer_compatibility_version text not null,
  ownership_site_id uuid references public.sites(id) on delete set null,
  unique (site_id, version_no)
);
