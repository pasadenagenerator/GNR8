alter table public.gnr8_templates
  add column if not exists reason_code text;

update public.gnr8_templates
set reason_code = 'TEMPLATE_UNKNOWN_FAILURE'
where status = 'failed'
  and coalesce(reason_code, '') = '';
