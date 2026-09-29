-- Observed staging-shape prerequisites for disposable candidate validation.
--
-- This is intentionally not a replay of repository migration history. It
-- models only the hosted state observed before the prepared package: request
-- roles, pgcrypto in `extensions`, and application-created runtime tables.
-- Ownership relations and linkage are created by the exact prerequisite
-- migration under test.

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
    nologin nosuperuser nocreatedb nocreaterole noreplication bypassrls;
exception when duplicate_object then null;
end;
$$;

create schema extensions;
create extension pgcrypto with schema extensions;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

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
  unique (site_id, version_no)
);
