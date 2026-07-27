-- GNR8 DDOM Readiness Snapshot Persistence Core
-- Additive canonical storage for append-only domain/DNS readiness snapshots
-- and source refs. This migration does not implement readers, writers,
-- publish integration, provider calls, DNS checks, or runtime behavior.

begin;

create extension if not exists pgcrypto;

create or replace function public.gnr8_ddom_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'DDOM readiness snapshots are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

create table if not exists public.gnr8_ddom_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text not null,
  ownership_site_id uuid null,
  site_version_id uuid null,
  domain_binding_id uuid null,
  host_binding_id uuid null,
  domain text null,
  internal_host text null,
  intended_launch_domain text null,
  readiness_state text not null,
  readiness_blockers jsonb not null default '[]'::jsonb,
  readiness_warnings jsonb not null default '[]'::jsonb,
  freshness_state text not null,
  fresh_until timestamptz null,
  stale_reason text null,
  captured_at timestamptz not null default now(),
  source_watermark text not null,
  source_watermark_json jsonb not null default '{}'::jsonb,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null unique,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  created_at timestamptz not null default now(),
  constraint gnr8_ddom_readiness_snapshots_readiness_state_ck
    check (readiness_state in (
      'ready',
      'ready_with_warnings',
      'blocked',
      'not_applicable',
      'manually_excepted',
      'stale'
    )),
  constraint gnr8_ddom_readiness_snapshots_freshness_state_ck
    check (freshness_state in ('fresh', 'stale', 'failed', 'partial_timeline')),
  constraint gnr8_ddom_readiness_snapshots_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_ddom_readiness_snapshots_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_ddom_readiness_snapshots_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_ddom_readiness_snapshots_json_shape_ck
    check (
      jsonb_typeof(readiness_blockers) = 'array'
      and jsonb_typeof(readiness_warnings) = 'array'
      and jsonb_typeof(source_watermark_json) = 'object'
      and jsonb_typeof(snapshot_json) = 'object'
    )
);

create table if not exists public.gnr8_ddom_readiness_snapshot_refs (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.gnr8_ddom_readiness_snapshots(id),
  ref_role text not null,
  ref_type text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_record_id text not null,
  source_version text null,
  source_watermark text null,
  captured_at timestamptz null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint gnr8_ddom_readiness_snapshot_refs_semantic_uq
    unique (snapshot_id, ref_role, ref_type, source_record_id),
  constraint gnr8_ddom_readiness_snapshot_refs_role_ck
    check (ref_role in (
      'domain_binding',
      'host_binding',
      'vercel_snapshot',
      'dns_instruction_snapshot',
      'manual_completion_evidence',
      'domain_exception',
      'audit_event',
      'external_reference',
      'aaf_evidence_package',
      'aaf_approval',
      'freshness_watermark'
    )),
  constraint gnr8_ddom_readiness_snapshot_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object')
);

do $$
begin
  if to_regclass('public.gnr8_runtime_sites') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.gnr8_ddom_readiness_snapshots'::regclass
        and conname = 'gnr8_ddom_readiness_snapshots_site_id_fkey'
    )
  then
    alter table public.gnr8_ddom_readiness_snapshots
      add constraint gnr8_ddom_readiness_snapshots_site_id_fkey
      foreign key (site_id)
      references public.gnr8_runtime_sites(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if to_regclass('public.sites') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.gnr8_ddom_readiness_snapshots'::regclass
        and conname = 'gnr8_ddom_readiness_snapshots_ownership_site_id_fkey'
    )
  then
    alter table public.gnr8_ddom_readiness_snapshots
      add constraint gnr8_ddom_readiness_snapshots_ownership_site_id_fkey
      foreign key (ownership_site_id)
      references public.sites(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if to_regclass('public.gnr8_runtime_site_versions') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.gnr8_ddom_readiness_snapshots'::regclass
        and conname = 'gnr8_ddom_readiness_snapshots_site_version_id_fkey'
    )
  then
    alter table public.gnr8_ddom_readiness_snapshots
      add constraint gnr8_ddom_readiness_snapshots_site_version_id_fkey
      foreign key (site_version_id)
      references public.gnr8_runtime_site_versions(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if to_regclass('public.gnr8_runtime_domain_host_bindings') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.gnr8_ddom_readiness_snapshots'::regclass
        and conname = 'gnr8_ddom_readiness_snapshots_domain_binding_id_fkey'
    )
  then
    alter table public.gnr8_ddom_readiness_snapshots
      add constraint gnr8_ddom_readiness_snapshots_domain_binding_id_fkey
      foreign key (domain_binding_id)
      references public.gnr8_runtime_domain_host_bindings(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if to_regclass('public.gnr8_runtime_host_bindings') is not null
    and not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.gnr8_ddom_readiness_snapshots'::regclass
        and conname = 'gnr8_ddom_readiness_snapshots_host_binding_id_fkey'
    )
  then
    alter table public.gnr8_ddom_readiness_snapshots
      add constraint gnr8_ddom_readiness_snapshots_host_binding_id_fkey
      foreign key (host_binding_id)
      references public.gnr8_runtime_host_bindings(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_gnr8_ddom_readiness_snapshots_site_captured
  on public.gnr8_ddom_readiness_snapshots (site_id, captured_at desc);

create index if not exists idx_gnr8_ddom_readiness_snapshots_site_version_captured
  on public.gnr8_ddom_readiness_snapshots (site_version_id, captured_at desc)
  where site_version_id is not null;

create index if not exists idx_gnr8_ddom_readiness_snapshots_domain_binding_captured
  on public.gnr8_ddom_readiness_snapshots (domain_binding_id, captured_at desc)
  where domain_binding_id is not null;

create index if not exists idx_gnr8_ddom_readiness_snapshots_readiness_freshness
  on public.gnr8_ddom_readiness_snapshots (readiness_state, freshness_state, captured_at desc);

create index if not exists idx_gnr8_ddom_readiness_snapshots_fresh_until
  on public.gnr8_ddom_readiness_snapshots (fresh_until)
  where fresh_until is not null;

create unique index if not exists idx_gnr8_ddom_readiness_snapshots_semantic_watermark
  on public.gnr8_ddom_readiness_snapshots (
    site_id,
    coalesce(site_version_id::text, ''),
    coalesce(domain_binding_id::text, ''),
    source_watermark
  );

create index if not exists idx_gnr8_ddom_readiness_snapshot_refs_lookup
  on public.gnr8_ddom_readiness_snapshot_refs (source_system, source_table, source_record_id, source_watermark);

create index if not exists idx_gnr8_ddom_readiness_snapshot_refs_snapshot_role
  on public.gnr8_ddom_readiness_snapshot_refs (snapshot_id, ref_role);

alter table public.gnr8_ddom_readiness_snapshots enable row level security;
alter table public.gnr8_ddom_readiness_snapshot_refs enable row level security;

drop trigger if exists trg_gnr8_ddom_readiness_snapshots_append_only on public.gnr8_ddom_readiness_snapshots;
create trigger trg_gnr8_ddom_readiness_snapshots_append_only
  before update or delete on public.gnr8_ddom_readiness_snapshots
  for each row execute function public.gnr8_ddom_prevent_update_delete();

drop trigger if exists trg_gnr8_ddom_readiness_snapshot_refs_append_only on public.gnr8_ddom_readiness_snapshot_refs;
create trigger trg_gnr8_ddom_readiness_snapshot_refs_append_only
  before update or delete on public.gnr8_ddom_readiness_snapshot_refs
  for each row execute function public.gnr8_ddom_prevent_update_delete();

commit;
