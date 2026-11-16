-- Permit explicit site deprovisioning to remove only the candidate records
-- belonging to that site. Ordinary candidate mutations remain forbidden.
begin;

-- Runtime deletion cascades through these two asset tables. Index the
-- referencing site IDs so PostgreSQL need not rescan the full asset tables.
create index if not exists gnr8_runtime_artifacts_site_id_delete_idx
  on public.gnr8_runtime_artifacts (site_id);
create index if not exists gnr8_runtime_raw_template_artifacts_site_id_delete_idx
  on public.gnr8_runtime_raw_template_artifacts (site_id);

create or replace function public.gnr8_reject_astro_candidate_record_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE'
    and old.ownership_site_id::text = current_setting('gnr8.deprovision_ownership_site_id', true) then
    return old;
  end if;
  raise exception 'astro_candidate_records_are_immutable' using errcode = '55000';
end;
$$;

create or replace function public.gnr8_reject_astro_candidate_access_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE'
    and exists (
      select 1
      from public.gnr8_astro_candidate_records as candidate
      where candidate.candidate_id = old.candidate_id
        and candidate.ownership_site_id::text = current_setting('gnr8.deprovision_ownership_site_id', true)
    ) then
    return old;
  end if;
  raise exception 'astro_candidate_access_events_are_append_only' using errcode = '55000';
end;
$$;

commit;
