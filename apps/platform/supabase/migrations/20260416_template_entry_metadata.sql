-- Persist template entry metadata as first-class fields on template records.

alter table public.gnr8_templates
  add column if not exists entry_html_path text,
  add column if not exists entry_html_file_name text,
  add column if not exists template_type text;

alter table public.gnr8_templates
  alter column template_type set default 'unknown';

update public.gnr8_templates
set template_type = 'unknown'
where template_type is null;

alter table public.gnr8_templates
  alter column template_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gnr8_templates_template_type_check'
      and conrelid = 'public.gnr8_templates'::regclass
  ) then
    alter table public.gnr8_templates
      add constraint gnr8_templates_template_type_check
      check (template_type in ('single_page', 'multi_page', 'unknown'));
  end if;
end
$$;
