alter table public.gnr8_templates
  add column if not exists durable_snapshot_root_dir_abs text;

