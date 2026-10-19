-- Additive native-contact protocol. Legacy inserts leave these columns NULL.
-- No existing submissions, customer artifacts or active pointers are modified.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.gnr8_runtime_form_submissions
  add column idempotency_key text,
  add column delivery_status text,
  add constraint gnr8_contact_delivery_state_ck check (
    (idempotency_key is null and delivery_status is null) or
    (idempotency_key is not null and idempotency_key ~ '^[a-f0-9]{64}$'
      and delivery_status is not null and delivery_status in
        ('pending','notification_accepted','notification_failed','notification_unknown'))
  );
create unique index gnr8_contact_submission_key_uq
  on public.gnr8_runtime_form_submissions (site_id, site_version_id, form_id, idempotency_key)
  where idempotency_key is not null;
create index gnr8_contact_submission_rate_idx
  on public.gnr8_runtime_form_submissions (site_id, created_at desc)
  where idempotency_key is not null;

-- The legacy table grants browser roles direct access and had RLS disabled.
-- Preserve that access for legacy rows, but make all new protocol rows private.
-- The restrictive policy also prevents any pre-existing permissive policy from
-- exposing native PII or changing its idempotency/status columns. Owner RPCs and
-- the existing service_role (BYPASSRLS) remain the only native access path.
alter table public.gnr8_runtime_form_submissions enable row level security;
create policy gnr8_contact_legacy_rows on public.gnr8_runtime_form_submissions
  as permissive for all to anon, authenticated
  using (idempotency_key is null) with check (idempotency_key is null);
create policy gnr8_contact_native_rows_private on public.gnr8_runtime_form_submissions
  as restrictive for all to public
  using (idempotency_key is null) with check (idempotency_key is null);

-- Same explicit-host precedence as public serving, with no latest-site fallback.
-- A preview binding takes precedence and always blocks this write protocol.
create function public.gnr8_resolve_published_contact(p_host text, p_path text)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  with host_binding as (
    select b.* from public.gnr8_runtime_host_bindings b
    where lower(b.host) = lower(p_host) and b.status = 'ACTIVE'
  ), binding as (
    select b.site_id, 'host_match'::text as kind, b.id as host_id,
      b.binding_kind, b.status as host_status, null::uuid as domain_id,
      null::text as domain, null::text as domain_status, null::uuid as domain_version
    from host_binding b
    where lower(trim(b.binding_kind)) not in ('shadow','canary','preview','candidate_preview','preview_host')
    union all
    select d.site_id, 'domain_match', null::uuid, null::text, null::text,
      d.id, d.domain, d.status, d.site_version_id
    from public.gnr8_runtime_domain_host_bindings d
    where lower(d.domain) = lower(p_host) and d.status = 'active'
      and not exists (select 1 from host_binding)
  )
  select jsonb_build_object(
    'outcome','artifact_hit','host',lower(p_host),'path',p_path,'normalizedPath',p_path,'resolvedPath',p_path,
    'siteId',p.site_id,'ownershipSiteId',v.ownership_site_id,'siteResolution',b.kind,
    'hostBindingId',b.host_id,'hostBindingKind',b.binding_kind,'hostBindingStatus',b.host_status,
    'domain',b.domain,'domainBindingId',b.domain_id,'domainBindingStatus',b.domain_status,
    'legacyDomainSiteVersionId',b.domain_version,'diagnostics','[]'::jsonb,
    'activeSiteVersionId',v.id,'artifactId',a.id,'html',a.html_by_path->>p_path,
    'artifact',jsonb_build_object('id',a.id,'siteId',a.site_id,'siteVersionId',a.site_version_id,
      'bundleSha256',a.bundle_sha256,'publishStage',a.publish_stage,'shadowRestricted',a.shadow_restricted,
      'manifest',a.manifest)
  )
  from binding b
  join public.gnr8_runtime_active_pointers p on p.site_id = b.site_id
  join public.gnr8_runtime_site_versions v on v.id = p.active_site_version_id and v.site_id = p.site_id
  join public.sites s on s.id = v.ownership_site_id
  join public.gnr8_runtime_artifacts a on a.id = p.active_artifact_id and a.site_id = p.site_id and a.site_version_id = v.id
  where a.publish_stage = 'production' and a.shadow_restricted = false
    and jsonb_typeof(a.html_by_path->p_path) = 'string'
    and not exists (select 1 from public.gnr8_runtime_preview_host_bindings pb
      where lower(pb.host) = lower(p_host) and pb.status = 'ACTIVE')
  limit 1;
$$;

create function public.gnr8_claim_contact_submission(
  p_host text, p_site_id text, p_site_version_id uuid, p_artifact_id uuid,
  p_artifact_sha256 text, p_path text, p_recipient text, p_key text,
  p_payload_hash text, p_fields jsonb, p_acceptance jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_resolved jsonb;
  v_settings jsonb;
  v_existing public.gnr8_runtime_form_submissions%rowtype;
  v_id uuid;
  v_now timestamptz;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_fields is null or jsonb_typeof(p_fields) <> 'object' or octet_length(p_fields::text) > 48000
    or p_site_id is null or p_path is null or p_recipient is null then
    return jsonb_build_object('status','conflict');
  end if;
  -- Serialize all native claims for the site, including distinct request IDs.
  perform pg_advisory_xact_lock(hashtextextended('gnr8-contact:' || p_site_id, 0));
  -- Freeze the active pointer through reservation. Resolution then rechecks the
  -- current host, ownership, artifact hash and server-owned destination.
  perform 1 from public.gnr8_runtime_active_pointers where site_id = p_site_id for share;
  v_resolved := public.gnr8_resolve_published_contact(p_host,p_path);
  v_settings := v_resolved #> '{artifact,manifest,generatedOutputSourceWorkspace,acceptedFunctionalReductions}';
  if v_resolved is null or v_resolved->>'siteId' is distinct from p_site_id
    or v_resolved->>'activeSiteVersionId' is distinct from p_site_version_id::text
    or v_resolved->>'artifactId' is distinct from p_artifact_id::text
    or v_resolved #>> '{artifact,bundleSha256}' is distinct from p_artifact_sha256
    or v_settings->>'kind' is distinct from 'retained-presentation-v1'
    or v_settings->>'scope' is distinct from 'generation-action'
    or coalesce(v_settings->>'acceptedByActor','') = ''
    or v_settings #>> '{contact,recipient}' is distinct from p_recipient
    or v_settings #>> '{contact,recipientConfirmed}' is distinct from 'true' then
    return jsonb_build_object('status','conflict');
  end if;
  if p_acceptance is not null and (
    jsonb_typeof(p_acceptance) <> 'object'
    or p_acceptance->>'affirmative' is distinct from 'true'
    or p_acceptance->>'artifactId' is distinct from p_artifact_id::text
    or p_acceptance->>'artifactSha256' is distinct from p_artifact_sha256
    or p_acceptance->>'version' is distinct from 'cf7-required-permission-v1'
    or p_fields->>'acceptance' is distinct from 'accepted'
  ) then return jsonb_build_object('status','conflict'); end if;

  select * into v_existing from public.gnr8_runtime_form_submissions
    where site_id = p_site_id and site_version_id = p_site_version_id
      and form_id = 'native-contact:' || p_path and idempotency_key = p_key;
  if found then
    if v_existing.payload->>'payloadHash' is distinct from p_payload_hash then
      return jsonb_build_object('status','conflict');
    end if;
    return jsonb_build_object('status','duplicate','outcome',v_existing.delivery_status);
  end if;
  v_now := clock_timestamp();
  if (select count(*) from public.gnr8_runtime_form_submissions
      where site_id = p_site_id and idempotency_key is not null
        and created_at > v_now - interval '15 minutes') >= 20 then
    return jsonb_build_object('status','rate_limited');
  end if;
  insert into public.gnr8_runtime_form_submissions
    (site_id,site_version_id,page_path,form_id,payload,actor,created_at,idempotency_key,delivery_status)
  values (p_site_id,p_site_version_id,p_path,'native-contact:' || p_path,
    jsonb_build_object('protocol','native-contact-v1','fields',p_fields,'payloadHash',p_payload_hash,
      'recipient',p_recipient,'artifactId',p_artifact_id,'artifactSha256',p_artifact_sha256,
      'acceptanceEvidence',case when p_acceptance is null then null else
        (p_acceptance - 'acceptedAt') || jsonb_build_object('acceptedAt',v_now) end),
    'native-contact',v_now,p_key,'pending') returning id into v_id;
  return jsonb_build_object('status','claimed','submissionId',v_id);
end;
$$;

create function public.gnr8_finish_contact_submission(p_submission_id uuid, p_outcome text, p_provider_message_id text)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare v_changed integer;
begin
  if p_outcome is null or p_outcome not in ('notification_accepted','notification_failed','notification_unknown')
    or (p_outcome = 'notification_accepted' and (p_provider_message_id is null or p_provider_message_id !~ '^[0-9a-fA-F-]{36}$'))
    then return false; end if;
  update public.gnr8_runtime_form_submissions
    set delivery_status = p_outcome,
      payload = payload || jsonb_build_object('delivery',jsonb_build_object(
        'provider','resend','messageId',p_provider_message_id,'finishedAt',clock_timestamp()))
    where id = p_submission_id and idempotency_key is not null and delivery_status = 'pending';
  get diagnostics v_changed = row_count;
  return v_changed = 1;
end;
$$;

create function public.gnr8_contact_delivery_readiness()
returns text language sql stable security definer set search_path = pg_catalog as $$
  select case when
    exists (select 1 from pg_attribute where attrelid = 'public.gnr8_runtime_form_submissions'::regclass
      and attname = 'delivery_status' and not attisdropped)
    and to_regprocedure('public.gnr8_claim_contact_submission(text,text,uuid,uuid,text,text,text,text,text,jsonb,jsonb)') is not null
    and to_regprocedure('public.gnr8_finish_contact_submission(uuid,text,text)') is not null
    and to_regclass('public.gnr8_contact_submission_key_uq') is not null
    then 'gnr8-native-contact-delivery:v1' else null end;
$$;

revoke all on function public.gnr8_resolve_published_contact(text,text) from public, anon, authenticated;
revoke all on function public.gnr8_claim_contact_submission(text,text,uuid,uuid,text,text,text,text,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.gnr8_finish_contact_submission(uuid,text,text) from public, anon, authenticated;
revoke all on function public.gnr8_contact_delivery_readiness() from public, anon, authenticated;
grant execute on function public.gnr8_resolve_published_contact(text,text) to service_role;
grant execute on function public.gnr8_claim_contact_submission(text,text,uuid,uuid,text,text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.gnr8_finish_contact_submission(uuid,text,text) to service_role;
grant execute on function public.gnr8_contact_delivery_readiness() to service_role;

notify pgrst, 'reload schema';
commit;
