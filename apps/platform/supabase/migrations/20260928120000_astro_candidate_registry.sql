-- GNR8 Platform MVP 12: private Astro production candidate registry.
--
-- This migration is additive. It stores TypeScript stableStringify output as
-- authoritative UTF-8 text. jsonb is used for structural validation and RPC
-- output only; jsonb::text is not treated as a canonical serializer.
--
-- Application is intentionally outside the scope of the authoring task. Before
-- application, verify every prerequisite listed in the MVP 12 readiness note.

begin;

create table public.gnr8_astro_candidate_records (
  candidate_id text primary key,
  runtime_site_id text not null
    references public.gnr8_runtime_sites(id) on delete restrict,
  site_version_id uuid not null
    references public.gnr8_runtime_site_versions(id) on delete restrict,
  ownership_site_id uuid not null
    references public.sites(id) on delete restrict,
  organization_id uuid not null
    references public.organizations(id) on delete restrict,
  agency_id uuid not null
    references public.agencies(id) on delete restrict,
  schema_version text not null,
  record_kind text not null,
  adapter_id text not null,
  conversion_version text not null,
  export_manifest_version text not null,
  renderer_compatibility_version text not null,
  candidate_created_at_text text not null,
  candidate_created_at timestamptz not null,
  stored_at_text text not null,
  stored_at timestamptz not null,
  registered_by_actor_id text not null,
  producer_kind text not null,
  producer_version text not null,
  producer_ref text not null,
  registration_idempotency_key text not null,
  correlation_id text not null,
  content_sha256 text not null,
  storage_sha256 text not null,
  registration_intent_sha256 text not null,
  canonical_record_text text not null,
  payload_size_bytes integer generated always as
    (pg_catalog.octet_length(canonical_record_text)) stored,
  constraint gnr8_astro_candidate_records_registration_idempotency_uq
    unique (registration_idempotency_key),
  constraint gnr8_astro_candidate_records_candidate_id_ck
    check (candidate_id ~ '^astro_candidate_[0-9a-f]{12}[1-8][0-9a-f]{3}[89ab][0-9a-f]{15}$'),
  constraint gnr8_astro_candidate_records_versions_ck
    check (
      schema_version = 'gnr8-astro-persisted-preview-candidate:v2'
      and record_kind = 'astro_internal_preview_candidate_record'
      and adapter_id = 'astro-static-site'
      and conversion_version = 'gnr8-astro-internal-preview-conversion:v1'
      and export_manifest_version = 'gnr8-astro-static-export:v1'
      and renderer_compatibility_version = 'gnr8-renderer-v1'
    ),
  constraint gnr8_astro_candidate_records_hashes_ck
    check (
      content_sha256 ~ '^[0-9a-f]{64}$'
      and storage_sha256 ~ '^[0-9a-f]{64}$'
      and registration_intent_sha256 ~ '^[0-9a-f]{64}$'
    ),
  constraint gnr8_astro_candidate_records_payload_size_ck
    check (payload_size_bytes between 1 and 2097152),
  constraint gnr8_astro_candidate_records_timestamps_ck
    check (
      candidate_created_at_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      and stored_at_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      and candidate_created_at = candidate_created_at_text::timestamptz
      and stored_at = stored_at_text::timestamptz
    ),
  constraint gnr8_astro_candidate_records_bounded_text_ck
    check (
      runtime_site_id = pg_catalog.btrim(runtime_site_id)
      and pg_catalog.length(runtime_site_id) between 1 and 512
      and registered_by_actor_id = pg_catalog.btrim(registered_by_actor_id)
      and pg_catalog.length(registered_by_actor_id) between 1 and 512
      and producer_kind = pg_catalog.btrim(producer_kind)
      and pg_catalog.length(producer_kind) between 1 and 512
      and producer_version = pg_catalog.btrim(producer_version)
      and pg_catalog.length(producer_version) between 1 and 512
      and producer_ref = pg_catalog.btrim(producer_ref)
      and pg_catalog.length(producer_ref) between 1 and 512
      and registration_idempotency_key = pg_catalog.btrim(registration_idempotency_key)
      and pg_catalog.length(registration_idempotency_key) between 1 and 512
      and correlation_id = pg_catalog.btrim(correlation_id)
      and pg_catalog.length(correlation_id) between 1 and 512
    )
);

create table public.gnr8_astro_candidate_access_states (
  candidate_id text primary key
    references public.gnr8_astro_candidate_records(candidate_id) on delete restrict,
  state text not null,
  reason_code text not null,
  changed_by_actor_id text not null,
  changed_at_text text not null,
  changed_at timestamptz not null,
  version bigint not null,
  constraint gnr8_astro_candidate_access_states_state_ck
    check (state in ('enabled', 'disabled')),
  constraint gnr8_astro_candidate_access_states_version_ck
    check (version >= 1),
  constraint gnr8_astro_candidate_access_states_timestamp_ck
    check (
      changed_at_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      and changed_at = changed_at_text::timestamptz
    ),
  constraint gnr8_astro_candidate_access_states_bounded_text_ck
    check (
      reason_code = pg_catalog.btrim(reason_code)
      and pg_catalog.length(reason_code) between 1 and 512
      and changed_by_actor_id = pg_catalog.btrim(changed_by_actor_id)
      and pg_catalog.length(changed_by_actor_id) between 1 and 512
    )
);

create table public.gnr8_astro_candidate_access_events (
  candidate_id text not null
    references public.gnr8_astro_candidate_records(candidate_id) on delete restrict,
  event_index bigint not null,
  action text not null,
  actor_id text not null,
  reason_code text not null,
  idempotency_key text not null,
  correlation_id text not null,
  occurred_at_text text not null,
  occurred_at timestamptz not null,
  source_access_version bigint,
  action_intent_sha256 text,
  superadmin_policy text,
  superadmin_actor_user_id text,
  integrity_validated_at_text text,
  integrity_validated_at timestamptz,
  integrity_content_sha256 text,
  integrity_storage_sha256 text,
  primary key (candidate_id, event_index),
  constraint gnr8_astro_candidate_access_events_action_ck
    check (action in ('registered', 'enabled', 'disabled')),
  constraint gnr8_astro_candidate_access_events_index_ck
    check (event_index >= 1),
  constraint gnr8_astro_candidate_access_events_timestamp_ck
    check (
      occurred_at_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      and occurred_at = occurred_at_text::timestamptz
      and (
        integrity_validated_at_text is null
        or (
          integrity_validated_at_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
          and integrity_validated_at = integrity_validated_at_text::timestamptz
        )
      )
    ),
  constraint gnr8_astro_candidate_access_events_bounded_text_ck
    check (
      actor_id = pg_catalog.btrim(actor_id)
      and pg_catalog.length(actor_id) between 1 and 512
      and reason_code = pg_catalog.btrim(reason_code)
      and pg_catalog.length(reason_code) between 1 and 512
      and idempotency_key = pg_catalog.btrim(idempotency_key)
      and pg_catalog.length(idempotency_key) between 1 and 512
      and correlation_id = pg_catalog.btrim(correlation_id)
      and pg_catalog.length(correlation_id) between 1 and 512
    ),
  constraint gnr8_astro_candidate_access_events_evidence_ck
    check (
      (
        action = 'registered'
        and event_index = 1
        and source_access_version is null
        and action_intent_sha256 is null
        and superadmin_policy is null
        and superadmin_actor_user_id is null
        and integrity_validated_at_text is null
        and integrity_validated_at is null
        and integrity_content_sha256 is null
        and integrity_storage_sha256 is null
      )
      or (
        action = 'disabled'
        and source_access_version is not null
        and source_access_version >= 1
        and action_intent_sha256 ~ '^[0-9a-f]{64}$'
        and superadmin_policy is null
        and superadmin_actor_user_id is null
        and integrity_validated_at_text is null
        and integrity_validated_at is null
        and integrity_content_sha256 is null
        and integrity_storage_sha256 is null
      )
      or (
        action = 'enabled'
        and source_access_version is not null
        and source_access_version >= 1
        and action_intent_sha256 ~ '^[0-9a-f]{64}$'
        and superadmin_policy = 'existing_superadmin'
        and superadmin_actor_user_id = actor_id
        and integrity_validated_at_text is not null
        and integrity_validated_at is not null
        and integrity_content_sha256 ~ '^[0-9a-f]{64}$'
        and integrity_storage_sha256 ~ '^[0-9a-f]{64}$'
      )
    )
);

create unique index gnr8_astro_candidate_access_events_action_idempotency_uq
  on public.gnr8_astro_candidate_access_events (idempotency_key)
  where action <> 'registered';

create index gnr8_astro_candidate_records_scope_list_idx
  on public.gnr8_astro_candidate_records (
    runtime_site_id,
    site_version_id,
    ownership_site_id,
    organization_id,
    agency_id,
    stored_at desc,
    candidate_id asc
  );

create index gnr8_astro_candidate_records_site_version_list_idx
  on public.gnr8_astro_candidate_records (site_version_id, stored_at desc, candidate_id asc);

create index gnr8_astro_candidate_access_events_candidate_time_idx
  on public.gnr8_astro_candidate_access_events (candidate_id, occurred_at desc, event_index desc);

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
    and (
      select pg_catalog.array_agg(k order by k)
      from pg_catalog.jsonb_object_keys(p_value) as keys(k)
    ) = (
      select pg_catalog.array_agg(k order by k)
      from pg_catalog.unnest(p_keys) as expected(k)
    ),
    false
  );
$$;

create or replace function public.gnr8_astro_candidate_sha256(p_value text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select pg_catalog.encode(
    public.digest(pg_catalog.convert_to(p_value, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

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
    v_candidate,
    array['kind', 'id', 'siteId', 'siteVersionId', 'rendererCompatibilityVersion', 'htmlByPath', 'compiledTokenStyles', 'assetFingerprintMap', 'manifest', 'contentSha256', 'createdAt']
  ) or not public.gnr8_astro_candidate_has_exact_keys(
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
  ) or not public.gnr8_astro_candidate_has_exact_keys(
    v_candidate->'htmlByPath', array['/']
  ) then
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
    or v_manifest#>>'{lifecycle,storage}' <> 'supabase_postgres'
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

create or replace function public.gnr8_reject_astro_candidate_record_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'astro_candidate_records_are_immutable' using errcode = '55000';
end;
$$;

create or replace function public.gnr8_reject_astro_candidate_access_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'astro_candidate_access_events_are_append_only' using errcode = '55000';
end;
$$;

create trigger gnr8_validate_astro_candidate_record_before_insert
before insert on public.gnr8_astro_candidate_records
for each row execute function public.gnr8_validate_astro_candidate_record_row();

create trigger gnr8_reject_astro_candidate_record_update_delete
before update or delete on public.gnr8_astro_candidate_records
for each row execute function public.gnr8_reject_astro_candidate_record_mutation();

create trigger gnr8_reject_astro_candidate_access_event_update_delete
before update or delete on public.gnr8_astro_candidate_access_events
for each row execute function public.gnr8_reject_astro_candidate_access_event_mutation();

create or replace function public.gnr8_astro_candidate_access_json(
  p_candidate_id text,
  p_state text,
  p_reason_code text,
  p_changed_by_actor_id text,
  p_changed_at_text text,
  p_version bigint
)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'candidateId', p_candidate_id,
    'state', p_state,
    'reasonCode', p_reason_code,
    'changedByActorId', p_changed_by_actor_id,
    'changedAt', p_changed_at_text,
    'version', p_version
  );
$$;

create or replace function public.gnr8_astro_candidate_event_json(
  p_candidate_id text,
  p_event_index bigint,
  p_action text,
  p_actor_id text,
  p_reason_code text,
  p_idempotency_key text,
  p_correlation_id text,
  p_occurred_at_text text
)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'candidateId', p_candidate_id,
    'eventIndex', p_event_index,
    'action', p_action,
    'actorId', p_actor_id,
    'reasonCode', p_reason_code,
    'idempotencyKey', p_idempotency_key,
    'correlationId', p_correlation_id,
    'occurredAt', p_occurred_at_text
  );
$$;

create or replace function public.gnr8_register_astro_candidate(
  p_record_canonical_text text,
  p_unsigned_record_canonical_text text,
  p_registration_intent_canonical_text text,
  p_content_envelope_canonical_text text,
  p_registration_intent_sha256 text,
  p_payload_size_bytes integer
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
  v_content_envelope jsonb;
  v_proposed_candidate jsonb;
  v_proposed_manifest jsonb;
  v_expected_intent jsonb;
  v_expected_content_envelope jsonb;
  v_candidate_id text;
  v_runtime_site_id text;
  v_site_version_id uuid;
  v_ownership_site_id uuid;
  v_organization_id uuid;
  v_agency_id uuid;
  v_idempotency_key text;
  v_candidate_by_id public.gnr8_astro_candidate_records%rowtype;
  v_candidate_by_key public.gnr8_astro_candidate_records%rowtype;
  v_has_candidate boolean;
  v_has_key boolean;
  v_access public.gnr8_astro_candidate_access_states%rowtype;
  v_event public.gnr8_astro_candidate_access_events%rowtype;
  v_authoritative record;
  v_lock_key bigint;
begin
  begin
    v_record := p_record_canonical_text::jsonb;
    v_unsigned := p_unsigned_record_canonical_text::jsonb;
    v_intent := p_registration_intent_canonical_text::jsonb;
    v_content_envelope := p_content_envelope_canonical_text::jsonb;
    v_candidate_id := v_record#>>'{identity,candidateId}';
    v_runtime_site_id := v_record#>>'{identity,runtimeSiteId}';
    v_site_version_id := (v_record#>>'{identity,siteVersionId}')::uuid;
    v_ownership_site_id := (v_record#>>'{identity,ownershipSiteId}')::uuid;
    v_organization_id := (v_record#>>'{identity,organizationId}')::uuid;
    v_agency_id := (v_record#>>'{identity,agencyId}')::uuid;
    v_idempotency_key := v_record#>>'{registration,idempotencyKey}';
  exception
    when others then
      raise exception 'astro_candidate_registration_input_invalid' using errcode = '22023';
  end;

  if p_payload_size_bytes is null
    or p_payload_size_bytes <> pg_catalog.octet_length(p_record_canonical_text)
    or p_payload_size_bytes < 1
    or p_payload_size_bytes > 2097152 then
    raise exception 'astro_candidate_record_too_large_or_size_mismatch' using errcode = '22023';
  end if;
  if p_registration_intent_sha256 !~ '^[0-9a-f]{64}$'
    or public.gnr8_astro_candidate_sha256(p_registration_intent_canonical_text) <> p_registration_intent_sha256 then
    raise exception 'astro_candidate_registration_intent_hash_invalid' using errcode = '22023';
  end if;
  if v_candidate_id !~ '^astro_candidate_[0-9a-f]{12}[1-8][0-9a-f]{3}[89ab][0-9a-f]{15}$'
    or v_runtime_site_id is null
    or v_idempotency_key is null
    or v_idempotency_key <> pg_catalog.btrim(v_idempotency_key)
    or pg_catalog.length(v_idempotency_key) not between 1 and 512 then
    raise exception 'astro_candidate_registration_input_invalid' using errcode = '22023';
  end if;

  v_proposed_candidate := v_record->'candidate';
  v_proposed_manifest := v_proposed_candidate->'manifest';
  v_expected_intent := pg_catalog.jsonb_build_object(
    'schemaVersion', v_record->'schemaVersion',
    'recordKind', v_record->'recordKind',
    'identity', v_record->'identity',
    'registration', (v_record->'registration') - 'storedAt',
    'candidate', v_record->'candidate'
  );
  v_expected_content_envelope := pg_catalog.jsonb_build_object(
    'conversionVersion', v_proposed_manifest->'conversionVersion',
    'adapterId', v_proposed_manifest->'adapterId',
    'ownership', v_proposed_manifest->'ownership',
    'rendererCompatibilityVersion', v_proposed_candidate->'rendererCompatibilityVersion',
    'htmlByPath', v_proposed_candidate->'htmlByPath',
    'compiledTokenStyles', v_proposed_candidate->'compiledTokenStyles',
    'assetFingerprintMap', v_proposed_candidate->'assetFingerprintMap',
    'sourceSnapshotSha256', v_proposed_manifest#>'{provenance,sourceSnapshotSha256}',
    'exportSha256', v_proposed_manifest#>'{provenance,exportSha256}'
  );
  if v_unsigned <> v_record - 'storageSha256'
    or v_record->>'storageSha256' <> public.gnr8_astro_candidate_sha256(p_unsigned_record_canonical_text)
    or v_intent <> v_expected_intent
    or v_content_envelope <> v_expected_content_envelope
    or v_proposed_candidate->>'contentSha256' <> public.gnr8_astro_candidate_sha256(p_content_envelope_canonical_text)
    or v_proposed_manifest#>>'{provenance,convertedArtifactSha256}' <> v_proposed_candidate->>'contentSha256' then
    raise exception 'astro_candidate_registration_canonical_payload_invalid' using errcode = '22023';
  end if;

  for v_lock_key in
    select lock_key
    from (
      values
        (pg_catalog.hashtextextended('gnr8-astro-candidate-id:' || v_candidate_id, 0)),
        (pg_catalog.hashtextextended('gnr8-astro-registration-key:' || v_idempotency_key, 0))
    ) as locks(lock_key)
    order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  select
    sv.site_id as runtime_site_id,
    sv.ownership_site_id,
    s.org_id as organization_id,
    s.agency_id,
    o.agency_id as organization_agency_id
  into v_authoritative
  from public.gnr8_runtime_site_versions as sv
  join public.gnr8_runtime_sites as rs on rs.id = sv.site_id
  join public.sites as s on s.id = sv.ownership_site_id
  join public.organizations as o on o.id = s.org_id
  join public.agencies as a on a.id = s.agency_id
  where sv.id = v_site_version_id;

  if not found
    or v_authoritative.runtime_site_id <> v_runtime_site_id
    or v_authoritative.ownership_site_id <> v_ownership_site_id
    or v_authoritative.organization_id <> v_organization_id
    or v_authoritative.agency_id <> v_agency_id
    or v_authoritative.organization_agency_id <> v_agency_id then
    return pg_catalog.jsonb_build_object('status', 'ownership_mismatch');
  end if;

  select * into v_candidate_by_id
  from public.gnr8_astro_candidate_records
  where candidate_id = v_candidate_id
  for update;
  v_has_candidate := found;

  select * into v_candidate_by_key
  from public.gnr8_astro_candidate_records
  where registration_idempotency_key = v_idempotency_key
  for update;
  v_has_key := found;

  if v_has_candidate or v_has_key then
    if v_has_candidate
      and v_has_key
      and v_candidate_by_id.candidate_id = v_candidate_by_key.candidate_id
      and v_candidate_by_id.registration_idempotency_key = v_idempotency_key
      and v_candidate_by_id.registration_intent_sha256 = p_registration_intent_sha256 then
      select * into strict v_access
      from public.gnr8_astro_candidate_access_states
      where candidate_id = v_candidate_id;
      select * into strict v_event
      from public.gnr8_astro_candidate_access_events
      where candidate_id = v_candidate_id and action = 'registered';
      return pg_catalog.jsonb_build_object(
        'status', 'idempotent',
        'record', v_candidate_by_id.canonical_record_text::jsonb,
        'access', public.gnr8_astro_candidate_access_json(
          v_access.candidate_id, v_access.state, v_access.reason_code,
          v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version
        ),
        'registrationEvent', public.gnr8_astro_candidate_event_json(
          v_event.candidate_id, v_event.event_index, v_event.action, v_event.actor_id,
          v_event.reason_code, v_event.idempotency_key, v_event.correlation_id,
          v_event.occurred_at_text
        )
      );
    end if;
    return pg_catalog.jsonb_build_object('status', 'conflicting_write');
  end if;

  insert into public.gnr8_astro_candidate_records (
    candidate_id, runtime_site_id, site_version_id, ownership_site_id,
    organization_id, agency_id, schema_version, record_kind, adapter_id,
    conversion_version, export_manifest_version, renderer_compatibility_version,
    candidate_created_at_text, candidate_created_at, stored_at_text, stored_at,
    registered_by_actor_id, producer_kind, producer_version, producer_ref,
    registration_idempotency_key, correlation_id, content_sha256, storage_sha256,
    registration_intent_sha256, canonical_record_text
  ) values (
    v_candidate_id,
    v_runtime_site_id,
    v_site_version_id,
    v_ownership_site_id,
    v_organization_id,
    v_agency_id,
    v_record->>'schemaVersion',
    v_record->>'recordKind',
    v_record#>>'{candidate,manifest,adapterId}',
    v_record#>>'{candidate,manifest,conversionVersion}',
    v_record#>>'{candidate,manifest,provenance,exportManifestVersion}',
    v_record#>>'{candidate,rendererCompatibilityVersion}',
    v_record#>>'{candidate,createdAt}',
    (v_record#>>'{candidate,createdAt}')::timestamptz,
    v_record#>>'{registration,storedAt}',
    (v_record#>>'{registration,storedAt}')::timestamptz,
    v_record#>>'{registration,registeredByActorId}',
    v_record#>>'{registration,producerKind}',
    v_record#>>'{registration,producerVersion}',
    v_record#>>'{registration,producerRef}',
    v_idempotency_key,
    v_record#>>'{registration,correlationId}',
    v_record#>>'{candidate,contentSha256}',
    v_record->>'storageSha256',
    p_registration_intent_sha256,
    p_record_canonical_text
  ) returning * into v_candidate_by_id;

  insert into public.gnr8_astro_candidate_access_states (
    candidate_id, state, reason_code, changed_by_actor_id,
    changed_at_text, changed_at, version
  ) values (
    v_candidate_id,
    'enabled',
    'candidate_registered',
    v_candidate_by_id.registered_by_actor_id,
    v_candidate_by_id.stored_at_text,
    v_candidate_by_id.stored_at,
    1
  ) returning * into v_access;

  insert into public.gnr8_astro_candidate_access_events (
    candidate_id, event_index, action, actor_id, reason_code,
    idempotency_key, correlation_id, occurred_at_text, occurred_at
  ) values (
    v_candidate_id,
    1,
    'registered',
    v_candidate_by_id.registered_by_actor_id,
    'candidate_registered',
    v_candidate_by_id.registration_idempotency_key,
    v_candidate_by_id.correlation_id,
    v_candidate_by_id.stored_at_text,
    v_candidate_by_id.stored_at
  ) returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'status', 'created',
    'record', v_candidate_by_id.canonical_record_text::jsonb,
    'access', public.gnr8_astro_candidate_access_json(
      v_access.candidate_id, v_access.state, v_access.reason_code,
      v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version
    ),
    'registrationEvent', public.gnr8_astro_candidate_event_json(
      v_event.candidate_id, v_event.event_index, v_event.action, v_event.actor_id,
      v_event.reason_code, v_event.idempotency_key, v_event.correlation_id,
      v_event.occurred_at_text
    )
  );
end;
$$;

create or replace function public.gnr8_read_astro_candidate_for_scope(
  p_candidate_id text,
  p_runtime_site_id text,
  p_site_version_id uuid,
  p_ownership_site_id uuid,
  p_organization_id uuid,
  p_agency_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_candidate public.gnr8_astro_candidate_records%rowtype;
  v_access public.gnr8_astro_candidate_access_states%rowtype;
begin
  select * into v_candidate
  from public.gnr8_astro_candidate_records
  where candidate_id = p_candidate_id;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'missing');
  end if;
  if v_candidate.runtime_site_id <> p_runtime_site_id
    or v_candidate.site_version_id <> p_site_version_id
    or v_candidate.ownership_site_id <> p_ownership_site_id
    or v_candidate.organization_id <> p_organization_id
    or v_candidate.agency_id <> p_agency_id then
    return pg_catalog.jsonb_build_object('status', 'ownership_mismatch');
  end if;

  select * into strict v_access
  from public.gnr8_astro_candidate_access_states
  where candidate_id = p_candidate_id;
  if v_access.state = 'disabled' then
    return pg_catalog.jsonb_build_object('status', 'disabled');
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'found',
    'record', v_candidate.canonical_record_text::jsonb,
    'access', public.gnr8_astro_candidate_access_json(
      v_access.candidate_id, v_access.state, v_access.reason_code,
      v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version
    ),
    'registrationEventPresent', exists (
      select 1 from public.gnr8_astro_candidate_access_events
      where candidate_id = p_candidate_id and action = 'registered'
    )
  );
end;
$$;

create or replace function public.gnr8_list_astro_candidate_metadata(
  p_runtime_site_id text,
  p_site_version_id uuid,
  p_ownership_site_id uuid,
  p_organization_id uuid,
  p_agency_id uuid,
  p_cursor_stored_at timestamptz default null,
  p_cursor_candidate_id text default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_result jsonb;
begin
  if p_limit < 1 or p_limit > 100
    or ((p_cursor_stored_at is null) <> (p_cursor_candidate_id is null)) then
    raise exception 'astro_candidate_list_input_invalid' using errcode = '22023';
  end if;

  with page as (
    select
      r.*,
      a.state,
      a.reason_code,
      a.changed_by_actor_id,
      a.changed_at_text,
      a.version,
      pg_catalog.row_number() over (order by r.stored_at desc, r.candidate_id asc) as row_number
    from public.gnr8_astro_candidate_records as r
    join public.gnr8_astro_candidate_access_states as a using (candidate_id)
    where r.runtime_site_id = p_runtime_site_id
      and r.site_version_id = p_site_version_id
      and r.ownership_site_id = p_ownership_site_id
      and r.organization_id = p_organization_id
      and r.agency_id = p_agency_id
      and (
        p_cursor_stored_at is null
        or r.stored_at < p_cursor_stored_at
        or (r.stored_at = p_cursor_stored_at and r.candidate_id > p_cursor_candidate_id)
      )
    order by r.stored_at desc, r.candidate_id asc
    limit p_limit + 1
  ), items as (
    select pg_catalog.jsonb_build_object(
      'candidateId', candidate_id,
      'runtimeSiteId', runtime_site_id,
      'siteVersionId', site_version_id::text,
      'ownershipSiteId', ownership_site_id::text,
      'organizationId', organization_id::text,
      'agencyId', agency_id::text,
      'schemaVersion', schema_version,
      'recordKind', record_kind,
      'adapterId', adapter_id,
      'conversionVersion', conversion_version,
      'exportManifestVersion', export_manifest_version,
      'rendererCompatibilityVersion', renderer_compatibility_version,
      'candidateCreatedAt', candidate_created_at_text,
      'storedAt', stored_at_text,
      'producerKind', producer_kind,
      'producerVersion', producer_version,
      'producerRef', producer_ref,
      'contentSha256', content_sha256,
      'storageSha256', storage_sha256,
      'payloadSizeBytes', payload_size_bytes,
      'access', public.gnr8_astro_candidate_access_json(
        candidate_id, state, reason_code, changed_by_actor_id, changed_at_text, version
      )
    ) as item, row_number
    from page
    where row_number <= p_limit
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(pg_catalog.jsonb_agg(item order by row_number), '[]'::jsonb),
    'hasMore', (select pg_catalog.count(*) > p_limit from page)
  ) into v_result
  from items;

  return v_result;
end;
$$;

create or replace function public.gnr8_set_astro_candidate_access(
  p_action_canonical_text text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_action jsonb;
  v_action_name text;
  v_candidate_id text;
  v_expected_version bigint;
  v_actor_id text;
  v_reason_code text;
  v_idempotency_key text;
  v_correlation_id text;
  v_occurred_at_text text;
  v_occurred_at timestamptz;
  v_action_sha256 text;
  v_access public.gnr8_astro_candidate_access_states%rowtype;
  v_event public.gnr8_astro_candidate_access_events%rowtype;
  v_previous public.gnr8_astro_candidate_access_events%rowtype;
  v_candidate public.gnr8_astro_candidate_records%rowtype;
  v_lock_key bigint;
  v_validated_at_text text;
  v_validated_at timestamptz;
  v_integrity_content_sha256 text;
  v_integrity_storage_sha256 text;
  v_superadmin_policy text;
  v_superadmin_actor_user_id text;
begin
  if pg_catalog.octet_length(p_action_canonical_text) not between 1 and 16384 then
    raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
  end if;
  begin
    v_action := p_action_canonical_text::jsonb;
    v_action_name := v_action->>'action';
    v_candidate_id := v_action->>'candidateId';
    v_expected_version := (v_action->>'expectedVersion')::bigint;
    v_actor_id := v_action->>'actorId';
    v_reason_code := v_action->>'reasonCode';
    v_idempotency_key := v_action->>'idempotencyKey';
    v_correlation_id := v_action->>'correlationId';
    v_occurred_at_text := v_action->>'occurredAt';
    v_occurred_at := v_occurred_at_text::timestamptz;
  exception
    when others then
      raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
  end;

  if v_action_name = 'disable' then
    if not public.gnr8_astro_candidate_has_exact_keys(
      v_action,
      array['action', 'candidateId', 'expectedVersion', 'actorId', 'reasonCode', 'idempotencyKey', 'correlationId', 'occurredAt']
    ) then
      raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
    end if;
  elsif v_action_name = 're_enable' then
    if not public.gnr8_astro_candidate_has_exact_keys(
      v_action,
      array['action', 'candidateId', 'expectedVersion', 'actorId', 'reasonCode', 'idempotencyKey', 'correlationId', 'occurredAt', 'superadminAuthorization', 'renewedIntegrityValidation']
    ) or not public.gnr8_astro_candidate_has_exact_keys(
      v_action->'superadminAuthorization', array['policy', 'actorUserId']
    ) or not public.gnr8_astro_candidate_has_exact_keys(
      v_action->'renewedIntegrityValidation', array['validatedAt', 'contentSha256', 'storageSha256']
    ) then
      raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
    end if;
    v_validated_at_text := v_action#>>'{renewedIntegrityValidation,validatedAt}';
    v_validated_at := v_validated_at_text::timestamptz;
    v_integrity_content_sha256 := v_action#>>'{renewedIntegrityValidation,contentSha256}';
    v_integrity_storage_sha256 := v_action#>>'{renewedIntegrityValidation,storageSha256}';
    v_superadmin_policy := v_action#>>'{superadminAuthorization,policy}';
    v_superadmin_actor_user_id := v_action#>>'{superadminAuthorization,actorUserId}';
  else
    raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
  end if;

  if v_candidate_id !~ '^astro_candidate_[0-9a-f]{12}[1-8][0-9a-f]{3}[89ab][0-9a-f]{15}$'
    or v_expected_version is null or v_expected_version < 1
    or v_actor_id is null or v_actor_id <> pg_catalog.btrim(v_actor_id) or pg_catalog.length(v_actor_id) not between 1 and 512
    or v_reason_code is null or v_reason_code <> pg_catalog.btrim(v_reason_code) or pg_catalog.length(v_reason_code) not between 1 and 512
    or v_idempotency_key is null or v_idempotency_key <> pg_catalog.btrim(v_idempotency_key) or pg_catalog.length(v_idempotency_key) not between 1 and 512
    or v_correlation_id is null or v_correlation_id <> pg_catalog.btrim(v_correlation_id) or pg_catalog.length(v_correlation_id) not between 1 and 512
    or v_occurred_at_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' then
    raise exception 'astro_candidate_access_action_invalid' using errcode = '22023';
  end if;
  if v_action_name = 're_enable' and (
    v_superadmin_policy <> 'existing_superadmin'
    or v_superadmin_actor_user_id <> v_actor_id
    or v_validated_at_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    or v_integrity_content_sha256 !~ '^[0-9a-f]{64}$'
    or v_integrity_storage_sha256 !~ '^[0-9a-f]{64}$'
  ) then
    return pg_catalog.jsonb_build_object('status', 'integrity_validation_failed');
  end if;

  v_action_sha256 := public.gnr8_astro_candidate_sha256(p_action_canonical_text);
  for v_lock_key in
    select lock_key
    from (
      values
        (pg_catalog.hashtextextended('gnr8-astro-candidate-id:' || v_candidate_id, 0)),
        (pg_catalog.hashtextextended('gnr8-astro-access-key:' || v_idempotency_key, 0))
    ) as locks(lock_key)
    order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  select * into v_previous
  from public.gnr8_astro_candidate_access_events
  where idempotency_key = v_idempotency_key and action <> 'registered';
  if found then
    if v_previous.candidate_id <> v_candidate_id
      or v_previous.action_intent_sha256 <> v_action_sha256 then
      return pg_catalog.jsonb_build_object('status', 'conflicting_write');
    end if;
    select * into v_access
    from public.gnr8_astro_candidate_access_states
    where candidate_id = v_candidate_id;
    if not found then
      return pg_catalog.jsonb_build_object('status', 'missing');
    end if;
    return pg_catalog.jsonb_build_object(
      'status', 'idempotent',
      'access', public.gnr8_astro_candidate_access_json(
        v_access.candidate_id, v_access.state, v_access.reason_code,
        v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version
      ),
      'event', public.gnr8_astro_candidate_event_json(
        v_previous.candidate_id, v_previous.event_index, v_previous.action,
        v_previous.actor_id, v_previous.reason_code, v_previous.idempotency_key,
        v_previous.correlation_id, v_previous.occurred_at_text
      )
    );
  end if;

  select * into v_access
  from public.gnr8_astro_candidate_access_states
  where candidate_id = v_candidate_id
  for update;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'missing');
  end if;
  if v_access.version <> v_expected_version then
    return pg_catalog.jsonb_build_object('status', 'version_conflict');
  end if;

  select * into strict v_candidate
  from public.gnr8_astro_candidate_records
  where candidate_id = v_candidate_id;

  if v_action_name = 're_enable' and (
    v_access.state <> 'disabled'
    or v_integrity_content_sha256 <> v_candidate.content_sha256
    or v_integrity_storage_sha256 <> v_candidate.storage_sha256
    or v_validated_at < v_access.changed_at
    or v_validated_at > v_occurred_at
  ) then
    return pg_catalog.jsonb_build_object('status', 'integrity_validation_failed');
  end if;

  update public.gnr8_astro_candidate_access_states
  set state = case when v_action_name = 'disable' then 'disabled' else 'enabled' end,
      reason_code = v_reason_code,
      changed_by_actor_id = v_actor_id,
      changed_at_text = v_occurred_at_text,
      changed_at = v_occurred_at,
      version = version + 1
  where candidate_id = v_candidate_id and version = v_expected_version
  returning * into strict v_access;

  insert into public.gnr8_astro_candidate_access_events (
    candidate_id, event_index, action, actor_id, reason_code, idempotency_key,
    correlation_id, occurred_at_text, occurred_at, source_access_version,
    action_intent_sha256, superadmin_policy, superadmin_actor_user_id,
    integrity_validated_at_text, integrity_validated_at,
    integrity_content_sha256, integrity_storage_sha256
  ) values (
    v_candidate_id,
    v_access.version,
    case when v_action_name = 'disable' then 'disabled' else 'enabled' end,
    v_actor_id,
    v_reason_code,
    v_idempotency_key,
    v_correlation_id,
    v_occurred_at_text,
    v_occurred_at,
    v_expected_version,
    v_action_sha256,
    v_superadmin_policy,
    v_superadmin_actor_user_id,
    v_validated_at_text,
    v_validated_at,
    v_integrity_content_sha256,
    v_integrity_storage_sha256
  ) returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'status', 'updated',
    'access', public.gnr8_astro_candidate_access_json(
      v_access.candidate_id, v_access.state, v_access.reason_code,
      v_access.changed_by_actor_id, v_access.changed_at_text, v_access.version
    ),
    'event', public.gnr8_astro_candidate_event_json(
      v_event.candidate_id, v_event.event_index, v_event.action, v_event.actor_id,
      v_event.reason_code, v_event.idempotency_key, v_event.correlation_id,
      v_event.occurred_at_text
    )
  );
end;
$$;

alter table public.gnr8_astro_candidate_records enable row level security;
alter table public.gnr8_astro_candidate_records force row level security;
alter table public.gnr8_astro_candidate_access_states enable row level security;
alter table public.gnr8_astro_candidate_access_states force row level security;
alter table public.gnr8_astro_candidate_access_events enable row level security;
alter table public.gnr8_astro_candidate_access_events force row level security;

revoke all on table public.gnr8_astro_candidate_records from public, anon, authenticated, service_role;
revoke all on table public.gnr8_astro_candidate_access_states from public, anon, authenticated, service_role;
revoke all on table public.gnr8_astro_candidate_access_events from public, anon, authenticated, service_role;

revoke all on function public.gnr8_astro_candidate_has_exact_keys(jsonb, text[]) from public, anon, authenticated, service_role;
revoke all on function public.gnr8_astro_candidate_sha256(text) from public, anon, authenticated, service_role;
revoke all on function public.gnr8_validate_astro_candidate_record_row() from public, anon, authenticated, service_role;
revoke all on function public.gnr8_reject_astro_candidate_record_mutation() from public, anon, authenticated, service_role;
revoke all on function public.gnr8_reject_astro_candidate_access_event_mutation() from public, anon, authenticated, service_role;
revoke all on function public.gnr8_astro_candidate_access_json(text, text, text, text, text, bigint) from public, anon, authenticated, service_role;
revoke all on function public.gnr8_astro_candidate_event_json(text, bigint, text, text, text, text, text, text) from public, anon, authenticated, service_role;

revoke all on function public.gnr8_register_astro_candidate(text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.gnr8_read_astro_candidate_for_scope(text, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.gnr8_list_astro_candidate_metadata(text, uuid, uuid, uuid, uuid, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.gnr8_set_astro_candidate_access(text) from public, anon, authenticated;

grant execute on function public.gnr8_register_astro_candidate(text, text, text, text, text, integer) to service_role;
grant execute on function public.gnr8_read_astro_candidate_for_scope(text, text, uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.gnr8_list_astro_candidate_metadata(text, uuid, uuid, uuid, uuid, timestamptz, text, integer) to service_role;
grant execute on function public.gnr8_set_astro_candidate_access(text) to service_role;

commit;
