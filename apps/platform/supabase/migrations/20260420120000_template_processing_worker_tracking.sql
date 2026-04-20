-- Durable template processing worker tracking fields.

alter table public.gnr8_templates
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz,
  add column if not exists processing_error text,
  add column if not exists processing_attempts integer not null default 0;

create index if not exists gnr8_templates_processing_watchdog_idx
  on public.gnr8_templates (status, processing_started_at, processing_completed_at);

