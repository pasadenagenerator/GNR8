export const RUNTIME_HOST_BINDING_BACKFILL_SQL = `
  with ranked as (
    select
      s.id::text as site_id,
      lower(trim(s.source_host))::text as host,
      row_number() over (
        partition by lower(trim(s.source_host))
        order by s.created_at desc, s.id desc
      ) as host_rank
    from public.gnr8_runtime_sites s
    where s.source_host is not null
      and length(trim(s.source_host)) > 0
  )
  insert into public.gnr8_runtime_host_bindings (site_id, host, status, binding_kind)
  select
    ranked.site_id,
    ranked.host,
    case
      when ranked.host_rank = 1 and not exists (
        select 1
        from public.gnr8_runtime_host_bindings existing
        where lower(existing.host) = ranked.host
          and existing.status = 'ACTIVE'
      ) then 'ACTIVE'
      else 'INACTIVE'
    end as status,
    'legacy_source_host_backfill'::text as binding_kind
  from ranked
  on conflict (site_id, host) do nothing
`;
