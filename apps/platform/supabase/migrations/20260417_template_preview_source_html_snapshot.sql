-- Allow explicit HTML snapshot preview source for template intake fallback behavior.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.gnr8_templates'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%preview_source%'
  loop
    execute format('alter table public.gnr8_templates drop constraint if exists %I', constraint_name);
  end loop;
end
$$;

alter table public.gnr8_templates
  alter column preview_source set default 'html_snapshot';

alter table public.gnr8_templates
  add constraint gnr8_templates_preview_source_check
  check (preview_source in ('rendered_capture', 'html_snapshot', 'fallback'));

update public.gnr8_templates
set preview_source = 'html_snapshot'
where preview_source = 'fallback'
  and preview_available = false;
