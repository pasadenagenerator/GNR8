-- Create Website from Template V1:
-- Persist website name and source template linkage on canonical sites table.

alter table public.sites
  add column if not exists name text;

update public.sites
set name = coalesce(nullif(btrim(domain), ''), concat('Site ', left(id::text, 8)))
where name is null or btrim(name) = '';

alter table public.sites
  alter column name set not null;

alter table public.sites
  add column if not exists template_id uuid;

do $$
begin
  if to_regclass('public.gnr8_templates') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'sites_template_id_fkey'
        and conrelid = 'public.sites'::regclass
    ) then
      alter table public.sites
        add constraint sites_template_id_fkey
        foreign key (template_id) references public.gnr8_templates(id) on delete set null;
    end if;
  end if;
end
$$;

create index if not exists sites_template_id_idx on public.sites (template_id);
