create table if not exists public.gnr8_runtime_provider_governance_snapshots (
  snapshot_id text primary key,
  handoff_id text not null,
  correlation_key text not null,
  readiness_status text not null,
  execution_blocked boolean not null,
  review_summary_status text,
  review_count integer,
  snapshot_payload jsonb not null,
  diagnostics jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gnr8_runtime_provider_governance_snapshots_handoff_id
  on public.gnr8_runtime_provider_governance_snapshots (handoff_id);

create index if not exists idx_gnr8_runtime_provider_governance_snapshots_correlation_key
  on public.gnr8_runtime_provider_governance_snapshots (correlation_key);

create index if not exists idx_gnr8_runtime_provider_governance_snapshots_created_at_desc
  on public.gnr8_runtime_provider_governance_snapshots (created_at desc);
