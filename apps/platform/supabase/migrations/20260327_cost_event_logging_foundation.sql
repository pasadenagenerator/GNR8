-- ============================================================
-- GNR8 Cost Event Logging Foundation (Additive)
-- Date: 2026-03-27
-- Scope: AI/runtime/migration cost event tables only
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- ai_usage_events
-- ------------------------------------------------------------
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid references public.billing_accounts(id) on delete set null,
  agency_id uuid not null,
  client_id uuid,
  site_id uuid,
  site_version_id uuid,
  artifact_id uuid,
  operation_type text not null,
  feature_context text not null,
  model_provider text,
  model_name text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_site_id_idx
  on public.ai_usage_events (site_id);

create index if not exists ai_usage_events_agency_id_created_at_idx
  on public.ai_usage_events (agency_id, created_at);

-- ------------------------------------------------------------
-- runtime_usage_events
-- ------------------------------------------------------------
create table if not exists public.runtime_usage_events (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid references public.billing_accounts(id) on delete set null,
  agency_id uuid not null,
  client_id uuid,
  site_id uuid not null,
  artifact_id uuid,
  request_count integer not null default 0,
  bandwidth_bytes bigint not null default 0,
  compute_ms bigint not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists runtime_usage_events_site_id_idx
  on public.runtime_usage_events (site_id);

create index if not exists runtime_usage_events_agency_id_period_start_idx
  on public.runtime_usage_events (agency_id, period_start);

-- ------------------------------------------------------------
-- migration_cost_events
-- ------------------------------------------------------------
create table if not exists public.migration_cost_events (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid references public.billing_accounts(id) on delete set null,
  agency_id uuid not null,
  site_id uuid,
  migration_job_id text,
  cost_type text not null,
  compute_units numeric(12,4) not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists migration_cost_events_agency_id_created_at_idx
  on public.migration_cost_events (agency_id, created_at);

commit;
