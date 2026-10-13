-- Additive v3 storage contract for NEW multi-page Astro candidates.
-- Route HTML remains immutable and content-addressed in a pre-provisioned
-- private Storage bucket; PostgreSQL retains the authoritative manifest,
-- ownership, hashes, sizes, registration, access, and governance state.
-- This migration does not create a bucket, alter Storage policies, or migrate
-- historical v2 records.

begin;

alter table public.gnr8_astro_candidate_records
  add column payload_storage_kind text not null default 'inline_postgres',
  add column resolved_payload_size_bytes bigint,
  add column object_payload_size_bytes bigint;

alter table public.gnr8_astro_candidate_records
  drop constraint gnr8_astro_candidate_records_versions_ck,
  add constraint gnr8_astro_candidate_records_versions_ck check (
    adapter_id = 'astro-static-site'
    and conversion_version = 'gnr8-astro-internal-preview-conversion:v1'
    and export_manifest_version = 'gnr8-astro-static-export:v1'
    and renderer_compatibility_version = 'gnr8-renderer-v1'
    and (
      (schema_version = 'gnr8-astro-persisted-preview-candidate:v2'
        and record_kind = 'astro_internal_preview_candidate_record'
        and payload_storage_kind = 'inline_postgres')
      or
      (schema_version = 'gnr8-astro-persisted-preview-candidate:v3'
        and record_kind = 'astro_internal_preview_candidate_object_record'
        and payload_storage_kind = 'supabase_storage')
    )
  ),
  add constraint gnr8_astro_candidate_records_object_sizes_ck check (
    (schema_version = 'gnr8-astro-persisted-preview-candidate:v2'
      and resolved_payload_size_bytes is null
      and object_payload_size_bytes is null)
    or
    (schema_version = 'gnr8-astro-persisted-preview-candidate:v3'
      and resolved_payload_size_bytes > 0
      and object_payload_size_bytes > 0)
  );

-- The v2 trigger predates object-backed candidates and only accepts the
-- single-page htmlByPath shape. Keep its validation intact for v2 rows while
-- extending the same immutable-row boundary to the v3 route-object manifest.
create or replace function public.gnr8_validate_astro_candidate_record_row()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_record jsonb;
  v_candidate jsonb;
  v_manifest jsonb;
begin
  begin
    v_record := new.canonical_record_text::jsonb;
  exception
    when others then
      raise exception 'astro_candidate_canonical_json_invalid'
        using errcode = '22023';
  end;

  if not public.gnr8_astro_candidate_has_exact_keys(
    v_record,
    array['schemaVersion', 'recordKind', 'identity', 'registration', 'candidate', 'storageSha256']
  ) then
    raise exception 'astro_candidate_record_shape_invalid' using errcode = '22023';
  end if;
  if not public.gnr8_astro_candidate_has_exact_keys(
    v_record->'identity',
    array['candidateId', 'runtimeSiteId', 'siteVersionId', 'ownershipSiteId', 'organizationId', 'agencyId']
  ) then
    raise exception 'astro_candidate_identity_shape_invalid' using errcode = '22023';
  end if;
  if not public.gnr8_astro_candidate_has_exact_keys(
    v_record->'registration',
    array['storedAt', 'registeredByActorId', 'producerKind', 'producerVersion', 'producerRef', 'idempotencyKey', 'correlationId']
  ) then
    raise exception 'astro_candidate_registration_shape_invalid' using errcode = '22023';
  end if;

  v_candidate := v_record->'candidate';
  v_manifest := v_candidate->'manifest';
  if not public.gnr8_astro_candidate_has_exact_keys(
    v_manifest,
    array['sourceKind', 'conversionVersion', 'adapterId', 'ownership', 'provenance', 'assetHandling', 'lifecycle']
  ) or not public.gnr8_astro_candidate_has_exact_keys(
    v_manifest->'ownership', array['siteId', 'siteVersionId']
  ) or not public.gnr8_astro_candidate_has_exact_keys(
    v_manifest->'provenance',
    array['sourceSnapshotSha256', 'exportManifestVersion', 'exportSha256', 'convertedArtifactSha256']
  ) or not public.gnr8_astro_candidate_has_exact_keys(
    v_manifest->'assetHandling',
    array['mode', 'inlinedStylesheetPaths', 'externalAssetStorageRequired']
  ) or not public.gnr8_astro_candidate_has_exact_keys(
    v_manifest->'lifecycle', array['storage', 'lifetime', 'durableRegistration']
  ) then
    raise exception 'astro_candidate_payload_shape_invalid' using errcode = '22023';
  end if;

  if new.schema_version = 'gnr8-astro-persisted-preview-candidate:v2' then
    if not public.gnr8_astro_candidate_has_exact_keys(
      v_candidate,
      array['kind', 'id', 'siteId', 'siteVersionId', 'rendererCompatibilityVersion', 'htmlByPath', 'compiledTokenStyles', 'assetFingerprintMap', 'manifest', 'contentSha256', 'createdAt']
    ) or not public.gnr8_astro_candidate_has_exact_keys(v_candidate->'htmlByPath', array['/'])
      or new.payload_storage_kind <> 'inline_postgres'
      or v_manifest#>>'{lifecycle,storage}' <> 'supabase_postgres' then
      raise exception 'astro_candidate_payload_shape_invalid' using errcode = '22023';
    end if;
  elsif new.schema_version = 'gnr8-astro-persisted-preview-candidate:v3' then
    if not public.gnr8_astro_candidate_has_exact_keys(
      v_candidate,
      array['kind', 'id', 'siteId', 'siteVersionId', 'rendererCompatibilityVersion', 'routePayloads', 'compiledTokenStyles', 'assetFingerprintMap', 'manifest', 'contentSha256', 'createdAt']
    ) or pg_catalog.jsonb_typeof(v_candidate->'routePayloads') <> 'object'
      or not (v_candidate->'routePayloads' ? '/')
      or (select pg_catalog.count(*) from pg_catalog.jsonb_each(v_candidate->'routePayloads')) < 2
      or new.payload_storage_kind <> 'supabase_storage'
      or v_manifest#>>'{lifecycle,storage}' <> 'supabase_storage'
      or exists (
        select 1
        from pg_catalog.jsonb_each(v_candidate->'routePayloads') as route
        where not public.gnr8_astro_candidate_has_exact_keys(
          route.value,
          array['routePath', 'bucket', 'key', 'sha256', 'sizeBytes', 'mediaType']
        )
          or route.key <> route.value->>'routePath'
          or coalesce(route.value->>'bucket', '') = ''
          or coalesce(route.value->>'key', '') = ''
          or route.value->>'sha256' !~ '^[0-9a-f]{64}$'
          or (route.value->>'sizeBytes')::bigint < 1
          or route.value->>'mediaType' <> 'text/html; charset=utf-8'
      ) then
      raise exception 'astro_candidate_payload_shape_invalid' using errcode = '22023';
    end if;
  else
    raise exception 'astro_candidate_payload_shape_invalid' using errcode = '22023';
  end if;

  if v_record->>'storageSha256' <> new.storage_sha256 then
    raise exception 'astro_candidate_storage_hash_invalid' using errcode = '22023';
  end if;
  if v_candidate->>'contentSha256' <> new.content_sha256
    or v_manifest#>>'{provenance,convertedArtifactSha256}' <> new.content_sha256 then
    raise exception 'astro_candidate_content_hash_invalid' using errcode = '22023';
  end if;

  if v_record->>'schemaVersion' <> new.schema_version
    or v_record->>'recordKind' <> new.record_kind
    or v_record#>>'{identity,candidateId}' <> new.candidate_id
    or v_record#>>'{identity,runtimeSiteId}' <> new.runtime_site_id
    or v_record#>>'{identity,siteVersionId}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_record#>>'{identity,ownershipSiteId}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_record#>>'{identity,organizationId}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_record#>>'{identity,agencyId}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or (v_record#>>'{identity,siteVersionId}')::uuid <> new.site_version_id
    or (v_record#>>'{identity,ownershipSiteId}')::uuid <> new.ownership_site_id
    or (v_record#>>'{identity,organizationId}')::uuid <> new.organization_id
    or (v_record#>>'{identity,agencyId}')::uuid <> new.agency_id
    or v_candidate->>'id' <> new.candidate_id
    or v_candidate->>'siteId' <> new.runtime_site_id
    or (v_candidate->>'siteVersionId')::uuid <> new.site_version_id
    or v_manifest#>>'{ownership,siteId}' <> new.runtime_site_id
    or (v_manifest#>>'{ownership,siteVersionId}')::uuid <> new.site_version_id
    or v_manifest->>'sourceKind' <> 'astro_static_export_internal_preview_candidate'
    or v_candidate->>'kind' <> 'astro_static_export_internal_preview_candidate'
    or v_manifest->>'adapterId' <> new.adapter_id
    or v_manifest->>'conversionVersion' <> new.conversion_version
    or v_manifest#>>'{provenance,exportManifestVersion}' <> new.export_manifest_version
    or v_candidate->>'rendererCompatibilityVersion' <> new.renderer_compatibility_version
    or v_manifest#>>'{assetHandling,mode}' <> 'inline_stylesheets'
    or v_manifest#>'{assetHandling,externalAssetStorageRequired}' <> 'false'::jsonb
    or v_manifest#>>'{lifecycle,lifetime}' <> 'retained_until_explicit_authorized_deletion'
    or v_manifest#>'{lifecycle,durableRegistration}' <> 'true'::jsonb
    or v_candidate->>'createdAt' <> new.candidate_created_at_text
    or v_record#>>'{registration,storedAt}' <> new.stored_at_text
    or v_record#>>'{registration,registeredByActorId}' <> new.registered_by_actor_id
    or v_record#>>'{registration,producerKind}' <> new.producer_kind
    or v_record#>>'{registration,producerVersion}' <> new.producer_version
    or v_record#>>'{registration,producerRef}' <> new.producer_ref
    or v_record#>>'{registration,idempotencyKey}' <> new.registration_idempotency_key
    or v_record#>>'{registration,correlationId}' <> new.correlation_id then
    raise exception 'astro_candidate_duplicated_fields_inconsistent' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.gnr8_register_astro_candidate_v3(
  p_record_canonical_text text,
  p_unsigned_record_canonical_text text,
  p_registration_intent_canonical_text text,
  p_registration_intent_sha256 text,
  p_payload_size_bytes integer,
  p_resolved_payload_size_bytes bigint,
  p_object_payload_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_record jsonb;
  v_unsigned jsonb;
  v_intent jsonb;
  v_expected_intent jsonb;
  v_candidate jsonb;
  v_manifest jsonb;
  v_candidate_id text;
  v_runtime_site_id text;
  v_site_version_id uuid;
  v_ownership_site_id uuid;
  v_organization_id uuid;
  v_agency_id uuid;
  v_idempotency_key text;
  v_route_count integer;
  v_manifest_object_bytes bigint;
  v_candidate_by_id public.gnr8_astro_candidate_records%rowtype;
  v_candidate_by_key public.gnr8_astro_candidate_records%rowtype;
  v_access public.gnr8_astro_candidate_access_states%rowtype;
  v_event public.gnr8_astro_candidate_access_events%rowtype;
  v_authoritative record;
  v_lock_key bigint;
begin
  begin
    v_record := p_record_canonical_text::jsonb;
    v_unsigned := p_unsigned_record_canonical_text::jsonb;
    v_intent := p_registration_intent_canonical_text::jsonb;
    v_candidate := v_record->'candidate';
    v_manifest := v_candidate->'manifest';
    v_candidate_id := v_record#>>'{identity,candidateId}';
    v_runtime_site_id := v_record#>>'{identity,runtimeSiteId}';
    v_site_version_id := (v_record#>>'{identity,siteVersionId}')::uuid;
    v_ownership_site_id := (v_record#>>'{identity,ownershipSiteId}')::uuid;
    v_organization_id := (v_record#>>'{identity,organizationId}')::uuid;
    v_agency_id := (v_record#>>'{identity,agencyId}')::uuid;
    v_idempotency_key := v_record#>>'{registration,idempotencyKey}';
    select pg_catalog.count(*), pg_catalog.sum((route.value->>'sizeBytes')::bigint)
      into v_route_count, v_manifest_object_bytes
      from pg_catalog.jsonb_each(v_candidate->'routePayloads') as route;
  exception when others then
    raise exception 'astro_candidate_v3_registration_input_invalid' using errcode = '22023';
  end;

  if p_payload_size_bytes is null
    or p_payload_size_bytes <> pg_catalog.octet_length(p_record_canonical_text)
    or p_payload_size_bytes not between 1 and 2097152
    or p_resolved_payload_size_bytes is null or p_resolved_payload_size_bytes < 1
    or p_object_payload_size_bytes is null or p_object_payload_size_bytes < 1
    or v_manifest_object_bytes <> p_object_payload_size_bytes then
    raise exception 'astro_candidate_v3_size_mismatch' using errcode = '22023';
  end if;

  v_expected_intent := pg_catalog.jsonb_build_object(
    'schemaVersion', v_record->'schemaVersion',
    'recordKind', v_record->'recordKind',
    'identity', v_record->'identity',
    'registration', (v_record->'registration') - 'storedAt',
    'candidate', v_candidate
  );
  if v_record->>'schemaVersion' <> 'gnr8-astro-persisted-preview-candidate:v3'
    or v_record->>'recordKind' <> 'astro_internal_preview_candidate_object_record'
    or v_manifest#>>'{lifecycle,storage}' <> 'supabase_storage'
    or v_manifest#>>'{lifecycle,lifetime}' <> 'retained_until_explicit_authorized_deletion'
    or v_manifest#>>'{lifecycle,durableRegistration}' <> 'true'
    or v_route_count < 2
    or not (v_candidate->'routePayloads' ? '/')
    or v_unsigned <> v_record - 'storageSha256'
    or v_record->>'storageSha256' <> public.gnr8_astro_candidate_sha256(p_unsigned_record_canonical_text)
    or v_intent <> v_expected_intent
    or p_registration_intent_sha256 !~ '^[0-9a-f]{64}$'
    or public.gnr8_astro_candidate_sha256(p_registration_intent_canonical_text) <> p_registration_intent_sha256
    or v_candidate->>'contentSha256' !~ '^[0-9a-f]{64}$'
    or v_manifest#>>'{provenance,convertedArtifactSha256}' <> v_candidate->>'contentSha256' then
    raise exception 'astro_candidate_v3_canonical_payload_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_each(v_candidate->'routePayloads') as route
    where route.key <> route.value->>'routePath'
      or route.value->>'bucket' is null
      or route.value->>'key' is null
      or route.value->>'sha256' !~ '^[0-9a-f]{64}$'
      or (route.value->>'sizeBytes')::bigint < 1
      or route.value->>'mediaType' <> 'text/html; charset=utf-8'
  ) then
    raise exception 'astro_candidate_v3_object_manifest_invalid' using errcode = '22023';
  end if;

  for v_lock_key in
    select lock_key from (
      values
        (pg_catalog.hashtextextended('gnr8-astro-candidate-id:' || v_candidate_id, 0)),
        (pg_catalog.hashtextextended('gnr8-astro-registration-key:' || v_idempotency_key, 0))
    ) as locks(lock_key) order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  select sv.site_id as runtime_site_id, sv.ownership_site_id,
    s.org_id as organization_id, s.agency_id, o.agency_id as organization_agency_id
    into v_authoritative
    from public.gnr8_runtime_site_versions sv
    join public.gnr8_runtime_sites rs on rs.id = sv.site_id
    join public.sites s on s.id = sv.ownership_site_id
    join public.organizations o on o.id = s.org_id
    join public.agencies a on a.id = s.agency_id
    where sv.id = v_site_version_id;
  if not found
    or v_authoritative.runtime_site_id <> v_runtime_site_id
    or v_authoritative.ownership_site_id <> v_ownership_site_id
    or v_authoritative.organization_id <> v_organization_id
    or v_authoritative.agency_id <> v_agency_id
    or v_authoritative.organization_agency_id <> v_agency_id then
    return pg_catalog.jsonb_build_object('status', 'ownership_mismatch');
  end if;

  select * into v_candidate_by_id from public.gnr8_astro_candidate_records
    where candidate_id = v_candidate_id for update;
  select * into v_candidate_by_key from public.gnr8_astro_candidate_records
    where registration_idempotency_key = v_idempotency_key for update;
  if v_candidate_by_id.candidate_id is not null or v_candidate_by_key.candidate_id is not null then
    if v_candidate_by_id.candidate_id = v_candidate_by_key.candidate_id
      and v_candidate_by_id.registration_idempotency_key = v_idempotency_key
      and v_candidate_by_id.registration_intent_sha256 = p_registration_intent_sha256 then
      select * into strict v_access from public.gnr8_astro_candidate_access_states where candidate_id = v_candidate_id;
      select * into strict v_event from public.gnr8_astro_candidate_access_events where candidate_id = v_candidate_id and action = 'registered';
      return pg_catalog.jsonb_build_object(
        'status', 'idempotent', 'record', v_candidate_by_id.canonical_record_text::jsonb,
        'access', public.gnr8_astro_candidate_access_json(v_access.candidate_id, v_access.state, v_access.reason_code, v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version),
        'registrationEvent', public.gnr8_astro_candidate_event_json(v_event.candidate_id, v_event.event_index, v_event.action, v_event.actor_id, v_event.reason_code, v_event.idempotency_key, v_event.correlation_id, v_event.occurred_at_text)
      );
    end if;
    return pg_catalog.jsonb_build_object('status', 'conflicting_write');
  end if;

  insert into public.gnr8_astro_candidate_records (
    candidate_id, runtime_site_id, site_version_id, ownership_site_id, organization_id, agency_id,
    schema_version, record_kind, adapter_id, conversion_version, export_manifest_version,
    renderer_compatibility_version, candidate_created_at_text, candidate_created_at,
    stored_at_text, stored_at, registered_by_actor_id, producer_kind, producer_version,
    producer_ref, registration_idempotency_key, correlation_id, content_sha256, storage_sha256,
    registration_intent_sha256, canonical_record_text, payload_storage_kind,
    resolved_payload_size_bytes, object_payload_size_bytes
  ) values (
    v_candidate_id, v_runtime_site_id, v_site_version_id, v_ownership_site_id, v_organization_id, v_agency_id,
    v_record->>'schemaVersion', v_record->>'recordKind', v_manifest->>'adapterId',
    v_manifest->>'conversionVersion', v_manifest#>>'{provenance,exportManifestVersion}',
    v_candidate->>'rendererCompatibilityVersion', v_candidate->>'createdAt',
    (v_candidate->>'createdAt')::timestamptz, v_record#>>'{registration,storedAt}',
    (v_record#>>'{registration,storedAt}')::timestamptz, v_record#>>'{registration,registeredByActorId}',
    v_record#>>'{registration,producerKind}', v_record#>>'{registration,producerVersion}',
    v_record#>>'{registration,producerRef}', v_idempotency_key, v_record#>>'{registration,correlationId}',
    v_candidate->>'contentSha256', v_record->>'storageSha256', p_registration_intent_sha256,
    p_record_canonical_text, 'supabase_storage', p_resolved_payload_size_bytes, p_object_payload_size_bytes
  ) returning * into v_candidate_by_id;

  insert into public.gnr8_astro_candidate_access_states (
    candidate_id, state, reason_code, changed_by_actor_id, changed_at_text, changed_at, version
  ) values (
    v_candidate_id, 'enabled', 'candidate_registered', v_candidate_by_id.registered_by_actor_id,
    v_candidate_by_id.stored_at_text, v_candidate_by_id.stored_at, 1
  ) returning * into v_access;
  insert into public.gnr8_astro_candidate_access_events (
    candidate_id, event_index, action, actor_id, reason_code, idempotency_key,
    correlation_id, occurred_at_text, occurred_at
  ) values (
    v_candidate_id, 1, 'registered', v_candidate_by_id.registered_by_actor_id,
    'candidate_registered', v_candidate_by_id.registration_idempotency_key,
    v_candidate_by_id.correlation_id, v_candidate_by_id.stored_at_text, v_candidate_by_id.stored_at
  ) returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'status', 'created', 'record', v_candidate_by_id.canonical_record_text::jsonb,
    'access', public.gnr8_astro_candidate_access_json(v_access.candidate_id, v_access.state, v_access.reason_code, v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version),
    'registrationEvent', public.gnr8_astro_candidate_event_json(v_event.candidate_id, v_event.event_index, v_event.action, v_event.actor_id, v_event.reason_code, v_event.idempotency_key, v_event.correlation_id, v_event.occurred_at_text)
  );
end;
$$;

revoke all on function public.gnr8_register_astro_candidate_v3(text, text, text, text, integer, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.gnr8_register_astro_candidate_v3(text, text, text, text, integer, bigint, bigint)
  to service_role;

commit;
