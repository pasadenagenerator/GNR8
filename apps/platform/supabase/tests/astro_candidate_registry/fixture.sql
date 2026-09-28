-- Test-only fixture for the MVP 12 Astro candidate registry database tests.
-- Run only against a disposable database after all migrations through
-- 20260928120000 have been applied. This file performs writes.
--
-- The builder uses jsonb::text only to make self-consistent database-layer byte
-- fixtures. It is not a production serializer or a cross-language canonicality
-- test. The offline TypeScript contract test covers stableStringify differences.

create schema if not exists gnr8_mvp12_test;

create table if not exists gnr8_mvp12_test.concurrent_outcomes (
  scenario text not null,
  session_name text not null,
  status text not null,
  primary key (scenario, session_name)
);

insert into public.agencies (id, name, slug, is_home_agency)
values (
  '55555555-5555-4555-8555-555555555555'::uuid,
  'MVP 12 test agency',
  'mvp-12-test-agency',
  false
)
on conflict (id) do nothing;

insert into public.organizations (id, name, agency_id, organization_type)
values (
  '44444444-4444-4444-8444-444444444444'::uuid,
  'MVP 12 test organization',
  '55555555-5555-4555-8555-555555555555'::uuid,
  'client'::public.organization_type_enum
)
on conflict (id) do nothing;

insert into public.sites (
  id, org_id, agency_id, status, is_template, billing_scope, billing_locked
)
values (
  '33333333-3333-4333-8333-333333333333'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  '55555555-5555-4555-8555-555555555555'::uuid,
  'draft'::public.site_status_enum,
  false,
  'client'::public.billing_scope_enum,
  false
)
on conflict (id) do nothing;

insert into public.gnr8_runtime_sites (id, source_url, source_host)
values (
  'runtime-site-mvp12-test',
  'https://mvp12.invalid/',
  'mvp12.invalid'
)
on conflict (id) do nothing;

insert into public.gnr8_runtime_site_versions (
  id, site_id, version_no, state, source, actor,
  renderer_compatibility_version, ownership_site_id
)
values (
  '22222222-2222-4222-8222-222222222222'::uuid,
  'runtime-site-mvp12-test',
  12,
  'DRAFT',
  'mvp12_database_fixture',
  'mvp12_database_fixture',
  'gnr8-renderer-v1',
  '33333333-3333-4333-8333-333333333333'::uuid
)
on conflict (id) do nothing;

create or replace function gnr8_mvp12_test.registration_args(
  p_candidate_id text,
  p_idempotency_key text,
  p_html text default '<!doctype html><html><body><p>MVP 12</p></body></html>',
  p_stored_at text default '2026-09-28T10:00:00.000Z',
  p_organization_id uuid default '44444444-4444-4444-8444-444444444444'::uuid,
  p_target_record_bytes integer default null,
  p_multibyte_filler boolean default false
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_html text := p_html;
  v_content_envelope jsonb;
  v_content_text text;
  v_content_sha text;
  v_candidate jsonb;
  v_identity jsonb;
  v_registration jsonb;
  v_unsigned jsonb;
  v_unsigned_text text;
  v_storage_sha text;
  v_record jsonb;
  v_record_text text;
  v_intent jsonb;
  v_intent_text text;
  v_intent_sha text;
  v_pass integer;
  v_missing_bytes integer;
  v_filler text;
begin
  for v_pass in 1..2 loop
    v_content_envelope := pg_catalog.jsonb_build_object(
      'conversionVersion', 'gnr8-astro-internal-preview-conversion:v1',
      'adapterId', 'astro-static-site',
      'ownership', pg_catalog.jsonb_build_object(
        'siteId', 'runtime-site-mvp12-test',
        'siteVersionId', '22222222-2222-4222-8222-222222222222'
      ),
      'rendererCompatibilityVersion', 'gnr8-renderer-v1',
      'htmlByPath', pg_catalog.jsonb_build_object('/', v_html),
      'compiledTokenStyles', '',
      'assetFingerprintMap', '{}'::jsonb,
      'sourceSnapshotSha256', pg_catalog.repeat('a', 64),
      'exportSha256', pg_catalog.repeat('b', 64)
    );
    v_content_text := v_content_envelope::text;
    v_content_sha := public.gnr8_astro_candidate_sha256(v_content_text);
    v_candidate := pg_catalog.jsonb_build_object(
      'kind', 'astro_static_export_internal_preview_candidate',
      'id', p_candidate_id,
      'siteId', 'runtime-site-mvp12-test',
      'siteVersionId', '22222222-2222-4222-8222-222222222222',
      'rendererCompatibilityVersion', 'gnr8-renderer-v1',
      'htmlByPath', pg_catalog.jsonb_build_object('/', v_html),
      'compiledTokenStyles', '',
      'assetFingerprintMap', '{}'::jsonb,
      'manifest', pg_catalog.jsonb_build_object(
        'sourceKind', 'astro_static_export_internal_preview_candidate',
        'conversionVersion', 'gnr8-astro-internal-preview-conversion:v1',
        'adapterId', 'astro-static-site',
        'ownership', pg_catalog.jsonb_build_object(
          'siteId', 'runtime-site-mvp12-test',
          'siteVersionId', '22222222-2222-4222-8222-222222222222'
        ),
        'provenance', pg_catalog.jsonb_build_object(
          'sourceSnapshotSha256', pg_catalog.repeat('a', 64),
          'exportManifestVersion', 'gnr8-astro-static-export:v1',
          'exportSha256', pg_catalog.repeat('b', 64),
          'convertedArtifactSha256', v_content_sha
        ),
        'assetHandling', pg_catalog.jsonb_build_object(
          'mode', 'inline_stylesheets',
          'inlinedStylesheetPaths', '[]'::jsonb,
          'externalAssetStorageRequired', false
        ),
        'lifecycle', pg_catalog.jsonb_build_object(
          'storage', 'supabase_postgres',
          'lifetime', 'retained_until_explicit_authorized_deletion',
          'durableRegistration', true
        )
      ),
      'contentSha256', v_content_sha,
      'createdAt', '2026-09-28T09:00:00.000Z'
    );
    v_identity := pg_catalog.jsonb_build_object(
      'candidateId', p_candidate_id,
      'runtimeSiteId', 'runtime-site-mvp12-test',
      'siteVersionId', '22222222-2222-4222-8222-222222222222',
      'ownershipSiteId', '33333333-3333-4333-8333-333333333333',
      'organizationId', p_organization_id::text,
      'agencyId', '55555555-5555-4555-8555-555555555555'
    );
    v_registration := pg_catalog.jsonb_build_object(
      'storedAt', p_stored_at,
      'registeredByActorId', 'actor:mvp12-database-test',
      'producerKind', 'internal_astro_build_export_bridge',
      'producerVersion', 'gnr8-internal-astro-build-export-bridge:v1',
      'producerRef', 'synthetic:mvp12-database-test',
      'idempotencyKey', p_idempotency_key,
      'correlationId', 'correlation:mvp12-database-test'
    );
    v_unsigned := pg_catalog.jsonb_build_object(
      'schemaVersion', 'gnr8-astro-persisted-preview-candidate:v2',
      'recordKind', 'astro_internal_preview_candidate_record',
      'identity', v_identity,
      'registration', v_registration,
      'candidate', v_candidate
    );
    v_unsigned_text := v_unsigned::text;
    v_storage_sha := public.gnr8_astro_candidate_sha256(v_unsigned_text);
    v_record := v_unsigned || pg_catalog.jsonb_build_object('storageSha256', v_storage_sha);
    v_record_text := v_record::text;

    if p_target_record_bytes is not null and v_pass = 1 then
      v_missing_bytes := p_target_record_bytes - pg_catalog.octet_length(v_record_text);
      if v_missing_bytes < 0 then
        raise exception 'mvp12_target_record_size_too_small';
      end if;
      if p_multibyte_filler then
        v_filler := pg_catalog.repeat('ž', v_missing_bytes / 2)
          || case when v_missing_bytes % 2 = 1 then 'x' else '' end;
      else
        v_filler := pg_catalog.repeat('x', v_missing_bytes);
      end if;
      v_html := v_html || v_filler;
    end if;
  end loop;

  if p_target_record_bytes is not null
    and pg_catalog.octet_length(v_record_text) <> p_target_record_bytes then
    raise exception 'mvp12_target_record_size_not_reached';
  end if;

  v_intent := pg_catalog.jsonb_build_object(
    'schemaVersion', v_record->'schemaVersion',
    'recordKind', v_record->'recordKind',
    'identity', v_record->'identity',
    'registration', (v_record->'registration') - 'storedAt',
    'candidate', v_record->'candidate'
  );
  v_intent_text := v_intent::text;
  v_intent_sha := public.gnr8_astro_candidate_sha256(v_intent_text);
  return pg_catalog.jsonb_build_object(
    'recordText', v_record_text,
    'unsignedRecordText', v_unsigned_text,
    'registrationIntentText', v_intent_text,
    'contentEnvelopeText', v_content_text,
    'registrationIntentSha256', v_intent_sha,
    'payloadSizeBytes', pg_catalog.octet_length(v_record_text)
  );
end;
$$;

create or replace function gnr8_mvp12_test.register(p_args jsonb)
returns jsonb
language sql
set search_path = pg_catalog
as $$
  select public.gnr8_register_astro_candidate(
    p_args->>'recordText',
    p_args->>'unsignedRecordText',
    p_args->>'registrationIntentText',
    p_args->>'contentEnvelopeText',
    p_args->>'registrationIntentSha256',
    (p_args->>'payloadSizeBytes')::integer
  );
$$;

create or replace function gnr8_mvp12_test.reject_selected_access_insert()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'mvp12_forced_late_registration_failure' using errcode = 'P0001';
end;
$$;
