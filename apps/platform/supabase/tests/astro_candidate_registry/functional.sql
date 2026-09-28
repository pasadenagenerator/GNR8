-- Executable database contract tests for the MVP 12 Astro candidate registry.
-- Prepared by MVP 12 and executed by MVP 13 only in a disposable database.
-- Requires the focused prerequisite fixture plus the candidate migration.

\set ON_ERROR_STOP on
begin;
\ir fixture.sql

create trigger gnr8_mvp12_force_late_registration_failure
before insert on public.gnr8_astro_candidate_access_states
for each row
when (new.candidate_id = 'astro_candidate_66666666666646668666666666666666')
execute function gnr8_mvp12_test.reject_selected_access_insert();

do $$
declare
  v_candidate_id constant text := 'astro_candidate_11111111111141118111111111111111';
  v_second_id constant text := 'astro_candidate_66666666666646668666666666666666';
  v_exact_id constant text := 'astro_candidate_77777777777747778777777777777777';
  v_over_id constant text := 'astro_candidate_88888888888848888888888888888888';
  v_args jsonb;
  v_result jsonb;
  v_original_record text;
  v_action_text text;
  v_failed boolean;
  v_runtime_site_before jsonb;
  v_runtime_version_before jsonb;
  v_ownership_site_before jsonb;
  v_organization_before jsonb;
  v_agency_before jsonb;
begin
  select pg_catalog.to_jsonb(r) into strict v_runtime_site_before
  from public.gnr8_runtime_sites as r where id = 'runtime-site-mvp12-test';
  select pg_catalog.to_jsonb(r) into strict v_runtime_version_before
  from public.gnr8_runtime_site_versions as r where id = '22222222-2222-4222-8222-222222222222'::uuid;
  select pg_catalog.to_jsonb(r) into strict v_ownership_site_before
  from public.sites as r where id = '33333333-3333-4333-8333-333333333333'::uuid;
  select pg_catalog.to_jsonb(r) into strict v_organization_before
  from public.organizations as r where id = '44444444-4444-4444-8444-444444444444'::uuid;
  select pg_catalog.to_jsonb(r) into strict v_agency_before
  from public.agencies as r where id = '55555555-5555-4555-8555-555555555555'::uuid;

  -- Success and atomic creation of immutable record, access state, and event.
  v_args := gnr8_mvp12_test.registration_args(v_candidate_id, 'idem:mvp12:one');
  v_result := gnr8_mvp12_test.register(v_args);
  if v_result->>'status' <> 'created' then raise exception 'success_status_failed'; end if;
  if (select pg_catalog.count(*) from public.gnr8_astro_candidate_records where candidate_id = v_candidate_id) <> 1
    or (select pg_catalog.count(*) from public.gnr8_astro_candidate_access_states where candidate_id = v_candidate_id) <> 1
    or (select pg_catalog.count(*) from public.gnr8_astro_candidate_access_events where candidate_id = v_candidate_id) <> 1 then
    raise exception 'atomic_registration_rows_failed';
  end if;
  select canonical_record_text into strict v_original_record
  from public.gnr8_astro_candidate_records where candidate_id = v_candidate_id;
  if exists (
    select 1
    from public.gnr8_astro_candidate_records
    where candidate_id = v_candidate_id
      and (
        content_sha256 <> public.gnr8_astro_candidate_sha256(v_args->>'contentEnvelopeText')
        or storage_sha256 <> public.gnr8_astro_candidate_sha256(v_args->>'unsignedRecordText')
        or registration_intent_sha256 <> v_args->>'registrationIntentSha256'
        or payload_size_bytes <> (v_args->>'payloadSizeBytes')::integer
        or payload_size_bytes <> pg_catalog.octet_length(canonical_record_text)
        or runtime_site_id <> 'runtime-site-mvp12-test'
        or site_version_id <> '22222222-2222-4222-8222-222222222222'::uuid
        or ownership_site_id <> '33333333-3333-4333-8333-333333333333'::uuid
        or organization_id <> '44444444-4444-4444-8444-444444444444'::uuid
        or agency_id <> '55555555-5555-4555-8555-555555555555'::uuid
      )
  ) then raise exception 'hash_size_or_ownership_persistence_failed'; end if;

  -- Idempotent retry preserves the winner's record and storedAt.
  v_args := gnr8_mvp12_test.registration_args(
    v_candidate_id, 'idem:mvp12:one',
    '<!doctype html><html><body><p>MVP 12</p></body></html>',
    '2030-01-01T00:00:00.000Z'
  );
  v_result := gnr8_mvp12_test.register(v_args);
  if v_result->>'status' <> 'idempotent'
    or v_result#>>'{record,registration,storedAt}' <> '2026-09-28T10:00:00.000Z' then
    raise exception 'idempotent_retry_failed';
  end if;

  -- Candidate-ID and registration-key reuse with changed intent conflict.
  v_result := gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
    v_candidate_id, 'idem:mvp12:one', '<html><body>changed</body></html>'
  ));
  if v_result->>'status' <> 'conflicting_write' then raise exception 'candidate_conflict_failed'; end if;
  v_result := gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
    v_second_id, 'idem:mvp12:one'
  ));
  if v_result->>'status' <> 'conflicting_write' then raise exception 'idempotency_conflict_failed'; end if;

  -- Authoritative ownership rejects inconsistent duplicated ownership.
  v_result := gnr8_mvp12_test.register(gnr8_mvp12_test.registration_args(
    v_second_id, 'idem:mvp12:ownership',
    '<!doctype html><html><body>ownership</body></html>',
    '2026-09-28T10:00:00.000Z',
    '99999999-9999-4999-8999-999999999999'::uuid
  ));
  if v_result->>'status' <> 'ownership_mismatch' then raise exception 'ownership_mismatch_failed'; end if;

  -- A forced failure after the immutable-row insert rolls the whole RPC back.
  v_args := gnr8_mvp12_test.registration_args(v_second_id, 'idem:mvp12:atomic-failure');
  v_failed := false;
  begin
    perform gnr8_mvp12_test.register(v_args);
  exception when sqlstate 'P0001' then
    v_failed := true;
  end;
  if not v_failed
    or exists (select 1 from public.gnr8_astro_candidate_records where candidate_id = v_second_id)
    or exists (select 1 from public.gnr8_astro_candidate_access_states where candidate_id = v_second_id)
    or exists (select 1 from public.gnr8_astro_candidate_access_events where candidate_id = v_second_id) then
    raise exception 'atomic_failure_rollback_failed';
  end if;

  -- UTF-8 multibyte content at the inclusive exact limit succeeds.
  v_args := gnr8_mvp12_test.registration_args(
    v_exact_id, 'idem:mvp12:exact-limit',
    '<!doctype html><html><body></body></html>',
    '2026-09-28T10:00:00.000Z',
    '44444444-4444-4444-8444-444444444444'::uuid,
    2097152,
    true
  );
  if (v_args->>'payloadSizeBytes')::integer <> 2097152
    or gnr8_mvp12_test.register(v_args)->>'status' <> 'created' then
    raise exception 'inclusive_multibyte_size_limit_failed';
  end if;

  -- One UTF-8 byte over the limit is rejected before any row is visible.
  v_args := gnr8_mvp12_test.registration_args(
    v_over_id, 'idem:mvp12:over-limit',
    '<!doctype html><html><body></body></html>',
    '2026-09-28T10:00:00.000Z',
    '44444444-4444-4444-8444-444444444444'::uuid,
    2097153,
    true
  );
  v_failed := false;
  begin
    perform gnr8_mvp12_test.register(v_args);
  exception when sqlstate '22023' then
    v_failed := true;
  end;
  if not v_failed or exists (
    select 1 from public.gnr8_astro_candidate_records where candidate_id = v_over_id
  ) then raise exception 'over_limit_rejection_failed'; end if;

  -- Scoped reads, missing reads, and payload-free metadata.
  v_result := public.gnr8_read_astro_candidate_for_scope(
    v_candidate_id,
    'runtime-site-mvp12-test',
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid
  );
  if v_result->>'status' <> 'found' then raise exception 'scoped_read_failed'; end if;
  v_result := public.gnr8_list_astro_candidate_metadata(
    'runtime-site-mvp12-test',
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid,
    null, null, 100
  );
  if v_result#>'{items,0}' ? 'candidate'
    or v_result#>'{items,0}' ? 'htmlByPath'
    or v_result#>'{items,0}' ? 'canonical_record_text' then
    raise exception 'metadata_payload_redaction_failed';
  end if;

  -- Optimistic access update, retry, denial, and current-version-bound re-enable.
  v_result := public.gnr8_set_astro_candidate_access(
    '{"action":"disable","actorId":"actor:operations","candidateId":"astro_candidate_11111111111141118111111111111111","correlationId":"correlation:disable","expectedVersion":1,"idempotencyKey":"access:disable","occurredAt":"2026-09-28T12:00:00.000Z","reasonCode":"operator_disabled"}'
  );
  if v_result->>'status' <> 'updated' or v_result#>>'{access,state}' <> 'disabled' then
    raise exception 'disable_failed';
  end if;
  v_result := public.gnr8_read_astro_candidate_for_scope(
    v_candidate_id,
    'runtime-site-mvp12-test',
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid
  );
  if v_result->>'status' <> 'disabled' then raise exception 'disabled_read_denial_failed'; end if;
  if public.gnr8_set_astro_candidate_access(
    '{"action":"disable","actorId":"actor:operations","candidateId":"astro_candidate_11111111111141118111111111111111","correlationId":"correlation:disable","expectedVersion":1,"idempotencyKey":"access:disable","occurredAt":"2026-09-28T12:00:00.000Z","reasonCode":"operator_disabled"}'
  )->>'status' <> 'idempotent' then raise exception 'access_retry_failed'; end if;
  if public.gnr8_set_astro_candidate_access(
    '{"action":"disable","actorId":"actor:other","candidateId":"astro_candidate_11111111111141118111111111111111","correlationId":"correlation:stale","expectedVersion":1,"idempotencyKey":"access:stale","occurredAt":"2026-09-28T12:01:00.000Z","reasonCode":"stale"}'
  )->>'status' <> 'version_conflict' then raise exception 'access_version_conflict_failed'; end if;

  select pg_catalog.jsonb_build_object(
    'action', 're_enable',
    'candidateId', v_candidate_id,
    'expectedVersion', 2,
    'actorId', 'actor:superadmin',
    'reasonCode', 'integrity_revalidated',
    'idempotencyKey', 'access:reenable:bad',
    'correlationId', 'correlation:reenable:bad',
    'occurredAt', '2026-09-28T13:00:00.000Z',
    'superadminAuthorization', pg_catalog.jsonb_build_object(
      'policy', 'existing_superadmin', 'actorUserId', 'actor:superadmin'
    ),
    'renewedIntegrityValidation', pg_catalog.jsonb_build_object(
      'validatedAt', '2026-09-28T12:59:00.000Z',
      'contentSha256', pg_catalog.repeat('0', 64),
      'storageSha256', pg_catalog.repeat('0', 64)
    )
  )::text into v_action_text;
  if public.gnr8_set_astro_candidate_access(v_action_text)->>'status' <> 'integrity_validation_failed' then
    raise exception 'reenable_hash_denial_failed';
  end if;

  select pg_catalog.jsonb_build_object(
    'action', 're_enable',
    'candidateId', v_candidate_id,
    'expectedVersion', 2,
    'actorId', 'actor:superadmin',
    'reasonCode', 'integrity_revalidated',
    'idempotencyKey', 'access:reenable',
    'correlationId', 'correlation:reenable',
    'occurredAt', '2026-09-28T13:00:00.000Z',
    'superadminAuthorization', pg_catalog.jsonb_build_object(
      'policy', 'existing_superadmin', 'actorUserId', 'actor:superadmin'
    ),
    'renewedIntegrityValidation', pg_catalog.jsonb_build_object(
      'validatedAt', '2026-09-28T12:59:00.000Z',
      'contentSha256', content_sha256,
      'storageSha256', storage_sha256
    )
  )::text into v_action_text
  from public.gnr8_astro_candidate_records where candidate_id = v_candidate_id;
  v_result := public.gnr8_set_astro_candidate_access(v_action_text);
  if v_result->>'status' <> 'updated'
    or v_result#>>'{access,state}' <> 'enabled'
    or v_result#>>'{access,version}' <> '3' then raise exception 'reenable_failed'; end if;
  if (select source_access_version from public.gnr8_astro_candidate_access_events
      where candidate_id = v_candidate_id and action = 'enabled') <> 2 then
    raise exception 'reenable_version_binding_failed';
  end if;
  if (select canonical_record_text from public.gnr8_astro_candidate_records
      where candidate_id = v_candidate_id) <> v_original_record then
    raise exception 'immutable_payload_changed_by_access_failed';
  end if;
  if (select pg_catalog.to_jsonb(r) from public.gnr8_runtime_sites as r
      where id = 'runtime-site-mvp12-test') <> v_runtime_site_before
    or (select pg_catalog.to_jsonb(r) from public.gnr8_runtime_site_versions as r
        where id = '22222222-2222-4222-8222-222222222222'::uuid) <> v_runtime_version_before
    or (select pg_catalog.to_jsonb(r) from public.sites as r
        where id = '33333333-3333-4333-8333-333333333333'::uuid) <> v_ownership_site_before
    or (select pg_catalog.to_jsonb(r) from public.organizations as r
        where id = '44444444-4444-4444-8444-444444444444'::uuid) <> v_organization_before
    or (select pg_catalog.to_jsonb(r) from public.agencies as r
        where id = '55555555-5555-4555-8555-555555555555'::uuid) <> v_agency_before then
    raise exception 'registration_mutated_runtime_or_ownership_failed';
  end if;

  -- Owner-level mutation still meets immutable/append-only triggers.
  v_failed := false;
  begin
    update public.gnr8_astro_candidate_records
    set producer_ref = 'tampered' where candidate_id = v_candidate_id;
  exception when sqlstate '55000' then v_failed := true;
  end;
  if not v_failed then raise exception 'immutable_record_trigger_failed'; end if;
  v_failed := false;
  begin
    update public.gnr8_astro_candidate_access_events
    set reason_code = 'tampered' where candidate_id = v_candidate_id and event_index = 1;
  exception when sqlstate '55000' then v_failed := true;
  end;
  if not v_failed then raise exception 'append_only_event_trigger_failed'; end if;

  -- Browser/PUBLIC/service roles have no direct table write privileges.
  if pg_catalog.has_table_privilege('anon', 'public.gnr8_astro_candidate_records', 'INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.gnr8_astro_candidate_records', 'INSERT')
    or pg_catalog.has_table_privilege('service_role', 'public.gnr8_astro_candidate_records', 'INSERT')
    or not pg_catalog.has_function_privilege(
      'service_role',
      'public.gnr8_register_astro_candidate(text,text,text,text,text,integer)',
      'EXECUTE'
    ) then raise exception 'privilege_boundary_failed'; end if;
end;
$$;

set local role anon;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.gnr8_astro_candidate_records limit 1;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'anon_direct_select_was_not_denied'; end if;

  v_denied := false;
  begin
    perform public.gnr8_read_astro_candidate_for_scope(
      'astro_candidate_11111111111141118111111111111111',
      'runtime-site-mvp12-test',
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '44444444-4444-4444-8444-444444444444'::uuid,
      '55555555-5555-4555-8555-555555555555'::uuid
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'anon_rpc_was_not_denied'; end if;
end;
$$;
reset role;

set local role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.gnr8_astro_candidate_access_states limit 1;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'authenticated_direct_select_was_not_denied'; end if;

  v_denied := false;
  begin
    perform public.gnr8_read_astro_candidate_for_scope(
      'astro_candidate_11111111111141118111111111111111',
      'runtime-site-mvp12-test',
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '44444444-4444-4444-8444-444444444444'::uuid,
      '55555555-5555-4555-8555-555555555555'::uuid
    );
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'authenticated_rpc_was_not_denied'; end if;
end;
$$;
reset role;

set local role service_role;
do $$
declare
  v_denied boolean := false;
  v_result jsonb;
begin
  begin
    perform 1 from public.gnr8_astro_candidate_records limit 1;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'service_role_direct_select_was_not_denied'; end if;

  v_denied := false;
  begin
    insert into public.gnr8_astro_candidate_records (candidate_id)
    values ('astro_candidate_99999999999949998999999999999999');
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'service_role_direct_insert_was_not_denied'; end if;

  v_result := public.gnr8_read_astro_candidate_for_scope(
    'astro_candidate_11111111111141118111111111111111',
    'runtime-site-mvp12-test',
    '22222222-2222-4222-8222-222222222222'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    '55555555-5555-4555-8555-555555555555'::uuid
  );
  if v_result->>'status' <> 'found' then raise exception 'service_role_rpc_failed'; end if;
end;
$$;
reset role;

rollback;
