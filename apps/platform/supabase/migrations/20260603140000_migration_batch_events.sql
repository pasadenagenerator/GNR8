create table if not exists public.gnr8_migration_batch_events (
  id text primary key,
  batch_id text not null references public.gnr8_migration_batches(id) on delete cascade,
  event_type text not null,
  message text not null,
  job_id text null references public.gnr8_migration_jobs(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint gnr8_migration_batch_events_event_type_check
    check (
      event_type in (
        'BATCH_EXECUTION_STARTED',
        'BATCH_JOB_STARTED',
        'BATCH_JOB_COMPLETED',
        'BATCH_JOB_FAILED',
        'BATCH_EXECUTION_COMPLETED',
        'BATCH_EXECUTION_PARTIALLY_FAILED',
        'BATCH_EXECUTION_FAILED',
        'BATCH_EXECUTION_PAUSED_BY_LIMIT'
      )
    )
);

create index if not exists idx_gnr8_migration_batch_events_batch_created
  on public.gnr8_migration_batch_events (batch_id, created_at asc);

create index if not exists idx_gnr8_migration_batch_events_job_id
  on public.gnr8_migration_batch_events (job_id);
