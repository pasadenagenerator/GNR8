alter table public.gnr8_templates
  add column if not exists source_zip_storage_bucket text,
  add column if not exists source_zip_storage_key text;

create index if not exists gnr8_templates_source_zip_key_idx
  on public.gnr8_templates (source_zip_storage_key)
  where source_zip_storage_key is not null;
