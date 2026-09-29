-- Catalog assertions and concise environment evidence for MVP 13.
\set ON_ERROR_STOP on

do $$
declare
  v_owner name := current_user;
begin
  if pg_catalog.current_setting('server_encoding') <> 'UTF8' then
    raise exception 'server_encoding_is_not_utf8';
  end if;
  if (select n.nspname from pg_catalog.pg_extension e
      join pg_catalog.pg_namespace n on n.oid = e.extnamespace
      where e.extname = 'pgcrypto') <> 'extensions' then
    raise exception 'pgcrypto_schema_failed';
  end if;
  if exists (
    select 1 from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated', 'service_role')
      and (
        rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolcanlogin
        or (rolname in ('anon', 'authenticated') and rolbypassrls)
        or (rolname = 'service_role' and not rolbypassrls)
      )
  ) or (select pg_catalog.count(*) from pg_catalog.pg_roles
        where rolname in ('anon', 'authenticated', 'service_role')) <> 3 then
    raise exception 'request_role_attributes_failed';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_roles r on r.oid = c.relowner
    where n.nspname = 'public'
      and c.relname in (
        'gnr8_astro_candidate_records',
        'gnr8_astro_candidate_access_states',
        'gnr8_astro_candidate_access_events'
      )
      and r.rolname <> v_owner
  ) then raise exception 'candidate_table_owner_failed'; end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_roles r on r.oid = p.proowner
    where n.nspname = 'public'
      and p.proname like 'gnr8%astro_candidate%'
      and r.rolname <> v_owner
  ) then raise exception 'candidate_function_owner_failed'; end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'gnr8_astro_candidate_records',
        'gnr8_astro_candidate_access_states',
        'gnr8_astro_candidate_access_events'
      )
      and (not c.relrowsecurity or not c.relforcerowsecurity)
  ) then raise exception 'rls_flags_failed'; end if;
  if (select pg_catalog.count(*)
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_class r on r.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname in (
          'gnr8_astro_candidate_records',
          'gnr8_astro_candidate_access_states',
          'gnr8_astro_candidate_access_events'
        )
        and c.contype = 'f'
        and c.confdeltype = 'r') <> 7 then
    raise exception 'foreign_key_targets_or_delete_actions_failed';
  end if;
  if (select pg_catalog.count(*)
      from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'gnr8_register_astro_candidate',
          'gnr8_read_astro_candidate_for_scope',
          'gnr8_list_astro_candidate_metadata',
          'gnr8_set_astro_candidate_access'
        )
        and p.prosecdef
        and p.proconfig = array['search_path=pg_catalog']) <> 4 then
    raise exception 'security_definer_or_search_path_failed';
  end if;
  if (select pg_catalog.count(*)
      from information_schema.routine_privileges
      where routine_schema = 'public'
        and grantee = 'service_role'
        and privilege_type = 'EXECUTE'
        and routine_name in (
          'gnr8_register_astro_candidate',
          'gnr8_read_astro_candidate_for_scope',
          'gnr8_list_astro_candidate_metadata',
          'gnr8_set_astro_candidate_access'
        )) <> 4 then
    raise exception 'service_role_rpc_exposure_failed';
  end if;
  if exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
      and routine_name like 'gnr8%astro_candidate%'
      and routine_name not in (
        'gnr8_register_astro_candidate',
        'gnr8_read_astro_candidate_for_scope',
        'gnr8_list_astro_candidate_metadata',
        'gnr8_set_astro_candidate_access'
      )
  ) then raise exception 'internal_helper_exposure_failed'; end if;
  if (select pg_catalog.count(*)
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_class c on c.oid = t.tgrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and t.tgname in (
          'gnr8_validate_astro_candidate_record_before_insert',
          'gnr8_reject_astro_candidate_record_update_delete',
          'gnr8_reject_astro_candidate_access_event_update_delete'
        )
        and not t.tgisinternal
        and t.tgenabled = 'O') <> 3 then
    raise exception 'trigger_enablement_failed';
  end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name like 'gnr8_astro_candidate_%'
      and grantee in ('anon', 'authenticated', 'service_role')
  ) then raise exception 'request_role_table_grant_failed'; end if;
  if not exists (
    select 1 from pg_catalog.pg_default_acl d
    where pg_catalog.array_to_string(d.defaclacl, ',') ~ '(anon|authenticated|service_role)'
  ) then raise exception 'hosted_default_privilege_fixture_missing'; end if;
end;
$$;

select pg_catalog.jsonb_build_object(
  'postgresVersion', pg_catalog.current_setting('server_version'),
  'serverEncoding', pg_catalog.current_setting('server_encoding'),
  'databaseOwner', (
    select r.rolname from pg_catalog.pg_database d
    join pg_catalog.pg_roles r on r.oid = d.datdba
    where d.datname = pg_catalog.current_database()
  ),
  'pgcryptoSchema', (
    select n.nspname from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto'
  ),
  'requestRoles', (
    select pg_catalog.jsonb_object_agg(rolname, pg_catalog.jsonb_build_object(
      'login', rolcanlogin,
      'superuser', rolsuper,
      'inherit', rolinherit,
      'bypassRls', rolbypassrls
    )) from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated', 'service_role')
  ),
  'candidateTablesRlsForced', 3,
  'restrictingForeignKeys', 7,
  'securityDefinerRpcs', 4,
  'enabledProtectionTriggers', 3,
  'relevantDefaultAclRows', (
    select pg_catalog.count(*) from pg_catalog.pg_default_acl d
    where pg_catalog.array_to_string(d.defaclacl, ',') ~ '(anon|authenticated|service_role)'
  )
) as catalog_evidence;
