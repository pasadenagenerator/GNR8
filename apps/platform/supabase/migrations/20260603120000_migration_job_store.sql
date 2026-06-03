create table if not exists public.gnr8_migration_jobs (
  id text primary key,
  tenant_id text null,
  agency_id uuid null,
  client_id uuid null,
  site_id text not null,
  site_version_id uuid null,
  source_url text not null,
  source_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING',
  current_stage text null,
  last_error jsonb null,
  failure_reason text null,
  last_execution_report jsonb null,
  last_activation_execution_result jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  constraint gnr8_migration_jobs_status_check
    check (status in ('PENDING', 'RUNNING', 'PAUSED', 'FAILED', 'COMPLETED')),
  constraint gnr8_migration_jobs_current_stage_check
    check (
      current_stage is null
      or current_stage in (
        'INTAKE',
        'SNAPSHOT',
        'LAYOUT_GRAPH',
        'CANONICAL',
        'QUALITY_GATE',
        'ARTIFACT_BUILD',
        'SHADOW_BIND_READY'
      )
    )
);

create table if not exists public.gnr8_migration_job_stages (
  job_id text not null references public.gnr8_migration_jobs(id) on delete cascade,
  stage text not null,
  status text not null default 'NOT_STARTED',
  started_at timestamptz null,
  ended_at timestamptz null,
  attempts integer not null default 0,
  diagnostics jsonb not null default '[]'::jsonb,
  output_refs jsonb not null default '{}'::jsonb,
  error jsonb null,
  updated_at timestamptz not null default now(),
  primary key (job_id, stage),
  constraint gnr8_migration_job_stages_stage_check
    check (
      stage in (
        'INTAKE',
        'SNAPSHOT',
        'LAYOUT_GRAPH',
        'CANONICAL',
        'QUALITY_GATE',
        'ARTIFACT_BUILD',
        'SHADOW_BIND_READY'
      )
    ),
  constraint gnr8_migration_job_stages_status_check
    check (status in ('NOT_STARTED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
  constraint gnr8_migration_job_stages_attempts_check
    check (attempts >= 0)
);

create table if not exists public.gnr8_migration_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.gnr8_migration_jobs(id) on delete cascade,
  event_index integer not null,
  event_type text not null,
  event_timestamp timestamptz not null,
  stage text null,
  message text not null,
  details jsonb null,
  created_at timestamptz not null default now(),
  unique (job_id, event_index),
  constraint gnr8_migration_job_events_type_check
    check (
      event_type in (
        'JOB_CREATED',
        'JOB_STARTED',
        'STAGE_STARTED',
        'STAGE_SUCCEEDED',
        'STAGE_FAILED',
        'JOB_COMPLETED',
        'JOB_FAILED',
        'JOB_RESUMED',
        'STAGE_REPLAY_REQUESTED',
        'ACTIVATION_EXECUTION_STARTED',
        'ACTIVATION_EXECUTION_SUCCEEDED',
        'ACTIVATION_EXECUTION_FAILED',
        'ACTIVATION_EXECUTION_NOOP'
      )
    ),
  constraint gnr8_migration_job_events_stage_check
    check (
      stage is null
      or stage in (
        'INTAKE',
        'SNAPSHOT',
        'LAYOUT_GRAPH',
        'CANONICAL',
        'QUALITY_GATE',
        'ARTIFACT_BUILD',
        'SHADOW_BIND_READY'
      )
    )
);

create table if not exists public.gnr8_migration_job_activation_history (
  job_id text not null references public.gnr8_migration_jobs(id) on delete cascade,
  execution_id text not null,
  history_index integer not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (job_id, execution_id),
  unique (job_id, history_index)
);

create index if not exists idx_gnr8_migration_jobs_site_id
  on public.gnr8_migration_jobs (site_id);

create index if not exists idx_gnr8_migration_jobs_site_version_id
  on public.gnr8_migration_jobs (site_version_id);

create index if not exists idx_gnr8_migration_jobs_status
  on public.gnr8_migration_jobs (status);

create index if not exists idx_gnr8_migration_jobs_updated_at
  on public.gnr8_migration_jobs (updated_at desc);

create index if not exists idx_gnr8_migration_job_events_job_id
  on public.gnr8_migration_job_events (job_id, event_index);
