-- Allow the existing immutable Astro candidate registry to retain a complete
-- static route map. All record, ownership, hash, lifecycle, and RPC checks from
-- the original registry remain unchanged; only the htmlByPath key-set check is
-- widened from exactly "/" to a bounded canonical route map containing "/".

begin;

create or replace function public.gnr8_astro_candidate_has_exact_keys(
  p_value jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    pg_catalog.jsonb_typeof(p_value) = 'object'
    and case
      when p_keys = array['/']::text[] then
        p_value ? '/'
        and (
          select pg_catalog.count(*)
          from pg_catalog.jsonb_object_keys(p_value)
        ) between 1 and 64
        and not exists (
          select 1
          from pg_catalog.jsonb_each(p_value) as route(path, body)
          where path !~ '^/(?:[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)*)?$'
             or pg_catalog.jsonb_typeof(body) <> 'string'
             or pg_catalog.length(body #>> '{}') < 1
        )
      else
        (
          select pg_catalog.array_agg(k order by k)
          from pg_catalog.jsonb_object_keys(p_value) as keys(k)
        ) = (
          select pg_catalog.array_agg(k order by k)
          from pg_catalog.unnest(p_keys) as expected(k)
        )
    end,
    false
  );
$$;

revoke all on function public.gnr8_astro_candidate_has_exact_keys(jsonb, text[])
  from public, anon, authenticated, service_role;

commit;
