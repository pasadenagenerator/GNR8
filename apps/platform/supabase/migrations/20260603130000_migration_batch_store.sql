create table if not exists public.gnr8_migration_batches (
  id text primary key,
  organization_id uuid null references public.organizations(id) on delete set null,
  agency_id uuid null references public.agencies(id) on delete set null,
  client_id uuid null references public.organizations(id) on delete set null,
  name text not null,
  description text null,
  status text not null default 'draft',
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  failed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '{}'::jsonb,
  constraint gnr8_migration_batches_status_check
    check (
      status in (
        'draft',
        'ready',
        'running',
        'paused',
        'completed',
        'failed',
        'partially_failed',
        'cancelled'
      )
    )
);

create table if not exists public.gnr8_migration_batch_jobs (
  batch_id text not null references public.gnr8_migration_batches(id) on delete cascade,
  job_id text not null references public.gnr8_migration_jobs(id) on delete cascade,
  site_id text null,
  site_version_id uuid null,
  source_url text null,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (batch_id, job_id),
  constraint gnr8_migration_batch_jobs_position_check
    check (position >= 0)
);

create index if not exists idx_gnr8_migration_batches_organization_id
  on public.gnr8_migration_batches (organization_id);

create index if not exists idx_gnr8_migration_batches_agency_id
  on public.gnr8_migration_batches (agency_id);

create index if not exists idx_gnr8_migration_batches_client_id
  on public.gnr8_migration_batches (client_id);

create index if not exists idx_gnr8_migration_batches_status
  on public.gnr8_migration_batches (status);

create index if not exists idx_gnr8_migration_batches_updated_at
  on public.gnr8_migration_batches (updated_at desc);

create index if not exists idx_gnr8_migration_batch_jobs_job_id
  on public.gnr8_migration_batch_jobs (job_id);

create index if not exists idx_gnr8_migration_batch_jobs_batch_position
  on public.gnr8_migration_batch_jobs (batch_id, position asc, added_at asc);
