-- GNR8 AAF Persistence Core
-- Additive canonical storage for scoped approvals, append-only audit events,
-- immutable evidence package metadata, policy evaluations, subject refs, and
-- inert gate attempts. This migration does not integrate runtime action gates.

begin;

create extension if not exists pgcrypto;

create or replace function public.gnr8_aaf_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AAF records are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

create table if not exists public.gnr8_aaf_approval_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version text not null,
  status text not null default 'draft',
  definition_json jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null default now(),
  effective_until timestamptz null,
  supersedes_policy_id uuid null references public.gnr8_aaf_approval_policies(id),
  created_by text not null,
  created_at timestamptz not null default now(),
  notes text null,
  unique (policy_key, version),
  constraint gnr8_aaf_approval_policies_status_ck
    check (status in ('draft', 'active', 'superseded', 'retired')),
  constraint gnr8_aaf_approval_policies_definition_object_ck
    check (jsonb_typeof(definition_json) = 'object')
);

create table if not exists public.gnr8_aaf_approval_scope_definitions (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  policy_key text not null,
  policy_version text not null,
  subject_type text not null,
  allowed_action text not null,
  prohibited_actions jsonb not null default '[]'::jsonb,
  required_evidence_type text not null,
  requester_roles jsonb not null default '[]'::jsonb,
  approver_roles jsonb not null default '[]'::jsonb,
  freshness_rule jsonb not null default '{}'::jsonb,
  separation_of_duty_rule jsonb null,
  retention_class text not null default 'compliance_long',
  privacy_label text not null default 'internal_operational',
  created_at timestamptz not null default now(),
  notes text null,
  unique (scope, policy_version),
  constraint gnr8_aaf_approval_scope_definitions_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance'
    )),
  constraint gnr8_aaf_approval_scope_definitions_evidence_type_ck
    check (required_evidence_type in (
      'batch_start_evidence',
      'dry_run_waiver_evidence',
      'retry_replay_evidence',
      'unsupported_exception_evidence',
      'content_publish_evidence',
      'launch_signoff_evidence',
      'domain_action_evidence',
      'domain_exception_evidence',
      'publish_activation_evidence',
      'rollback_evidence',
      'cost_exception_evidence',
      'external_workflow_reference_evidence',
      'ai_advisory_review_evidence',
      'incident_recovery_evidence'
    )),
  constraint gnr8_aaf_approval_scope_definitions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_aaf_approval_scope_definitions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_approval_scope_definitions_json_arrays_ck
    check (
      jsonb_typeof(prohibited_actions) = 'array'
      and jsonb_typeof(requester_roles) = 'array'
      and jsonb_typeof(approver_roles) = 'array'
      and jsonb_typeof(freshness_rule) = 'object'
    )
);

create table if not exists public.gnr8_aaf_approval_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  scope text not null,
  subject_type text not null,
  subject_id text not null,
  requester_actor_type text not null,
  requester_actor_id text not null,
  requester_role text not null,
  status text not null default 'requested',
  policy_id uuid null references public.gnr8_aaf_approval_policies(id),
  policy_version text not null,
  requested_expires_at timestamptz null,
  reason text null,
  ops_inbox_item_id text null,
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  created_at timestamptz not null default now(),
  unique (tenant_id, scope, subject_type, subject_id, policy_version, idempotency_key),
  constraint gnr8_aaf_approval_requests_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance'
    )),
  constraint gnr8_aaf_approval_requests_status_ck
    check (status in (
      'requested',
      'granted',
      'rejected',
      'revoked',
      'expired',
      'superseded',
      'cancelled',
      'not_required_by_policy'
    )),
  constraint gnr8_aaf_approval_requests_actor_type_ck
    check (requester_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_approval_requests_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_approval_requests_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_aaf_evidence_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  package_type text not null,
  subject_type text not null,
  subject_id text not null,
  package_version integer not null default 1,
  status text not null default 'created',
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  created_at timestamptz not null default now(),
  source_watermark text not null,
  freshness_label text not null,
  expires_at timestamptz null,
  content_hash text not null,
  supersedes_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  redacted_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  limitations_json jsonb not null default '{}'::jsonb,
  privacy_label text not null default 'internal_operational',
  redaction_label text not null default 'none',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  unique (idempotency_key),
  unique (package_type, subject_type, subject_id, source_watermark, content_hash),
  constraint gnr8_aaf_evidence_packages_type_ck
    check (package_type in (
      'batch_start_evidence',
      'dry_run_waiver_evidence',
      'retry_replay_evidence',
      'unsupported_exception_evidence',
      'content_publish_evidence',
      'launch_signoff_evidence',
      'domain_action_evidence',
      'domain_exception_evidence',
      'publish_activation_evidence',
      'rollback_evidence',
      'cost_exception_evidence',
      'external_workflow_reference_evidence',
      'ai_advisory_review_evidence',
      'incident_recovery_evidence'
    )),
  constraint gnr8_aaf_evidence_packages_status_ck
    check (status in ('created', 'verified', 'redacted', 'superseded', 'invalid')),
  constraint gnr8_aaf_evidence_packages_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_evidence_packages_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_evidence_packages_redaction_ck
    check (redaction_label in (
      'none',
      'redaction_required',
      'redacted',
      'credential_redacted',
      'billing_redacted',
      'provider_redacted',
      'legal_redacted'
    )),
  constraint gnr8_aaf_evidence_packages_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_aaf_evidence_packages_content_hash_ck
    check (length(content_hash) >= 16),
  constraint gnr8_aaf_evidence_packages_limitations_object_ck
    check (jsonb_typeof(limitations_json) = 'object')
);

create table if not exists public.gnr8_aaf_approval_policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  policy_id uuid null references public.gnr8_aaf_approval_policies(id),
  policy_version text not null,
  result text not null,
  scope text not null,
  action_key text not null,
  subject_type text not null,
  subject_id text not null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  approval_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null,
  evidence_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  blocker_codes jsonb not null default '[]'::jsonb,
  stale_reason text null,
  emergency_reason text null,
  not_required_reason text null,
  audit_event_id uuid null,
  evaluated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_approval_policy_evaluations_result_ck
    check (result in (
      'approval_required',
      'approval_not_required_by_policy',
      'approval_blocked',
      'approval_stale',
      'approval_superseded',
      'emergency_exception_required',
      'emergency_exception_granted',
      'policy_error'
    )),
  constraint gnr8_aaf_approval_policy_evaluations_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance'
    )),
  constraint gnr8_aaf_approval_policy_evaluations_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_approval_policy_evaluations_blockers_array_ck
    check (jsonb_typeof(blocker_codes) = 'array'),
  constraint gnr8_aaf_approval_policy_evaluations_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_approval_policy_evaluations_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_aaf_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
  status text not null,
  decision_actor_type text not null,
  decision_actor_id text not null,
  decision_actor_role text not null,
  decided_at timestamptz not null default now(),
  policy_version text not null,
  evidence_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  audit_event_id uuid null,
  reason text null,
  expires_at timestamptz null,
  freshness_label text null,
  separation_of_duty_result text null,
  emergency_policy_ref text null,
  privacy_label text not null default 'internal_operational',
  redaction_label text not null default 'none',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_approval_decisions_status_ck
    check (status in (
      'granted',
      'rejected',
      'revoked',
      'expired',
      'superseded',
      'cancelled',
      'not_required_by_policy'
    )),
  constraint gnr8_aaf_approval_decisions_actor_type_ck
    check (decision_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_approval_decisions_not_required_policy_ref_ck
    check (status <> 'not_required_by_policy' or policy_evaluation_id is not null),
  constraint gnr8_aaf_approval_decisions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_approval_decisions_redaction_ck
    check (redaction_label in (
      'none',
      'redaction_required',
      'redacted',
      'credential_redacted',
      'billing_redacted',
      'provider_redacted',
      'legal_redacted'
    )),
  constraint gnr8_aaf_approval_decisions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_aaf_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  event_name text not null,
  event_family text not null,
  severity text not null,
  replay_class text not null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  subject_type text not null,
  subject_id text not null,
  subject_version text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  source_system text not null default 'gnr8',
  source_route text null,
  source_ref_json jsonb not null default '{}'::jsonb,
  approval_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  evidence_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  original_audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  before_ref_json jsonb not null default '{}'::jsonb,
  after_ref_json jsonb not null default '{}'::jsonb,
  payload_json jsonb not null default '{}'::jsonb,
  redaction_label text not null default 'none',
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_audit_events_family_ck
    check (event_family in (
      'identity/auth',
      'intake',
      'dry-run',
      'batch lifecycle',
      'site item lifecycle',
      'retry/replay',
      'preview/readiness',
      'review/content',
      'approval',
      'domain/DNS',
      'publish',
      'rollback',
      'provider/external execution',
      'cost',
      'asset/storage evidence',
      'external workflow reference',
      'AI advisory',
      'admin/superadmin exception',
      'system failure/audit failure'
    )),
  constraint gnr8_aaf_audit_events_severity_ck
    check (severity in ('debug', 'info', 'notice', 'warning', 'error', 'critical', 'security')),
  constraint gnr8_aaf_audit_events_replay_class_ck
    check (replay_class in (
      'not_replayable',
      'deterministic_replay',
      'manual_retry_only',
      'forbidden_replay',
      'compensating_only'
    )),
  constraint gnr8_aaf_audit_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_audit_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_audit_events_redaction_ck
    check (redaction_label in (
      'none',
      'redaction_required',
      'redacted',
      'credential_redacted',
      'billing_redacted',
      'provider_redacted',
      'legal_redacted'
    )),
  constraint gnr8_aaf_audit_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_aaf_audit_events_payload_object_ck
    check (
      jsonb_typeof(source_ref_json) = 'object'
      and jsonb_typeof(before_ref_json) = 'object'
      and jsonb_typeof(after_ref_json) = 'object'
      and jsonb_typeof(payload_json) = 'object'
      and octet_length(payload_json::text) <= 65536
    ),
  constraint gnr8_aaf_audit_events_schema_version_ck
    check (schema_version >= 1)
);

create table if not exists public.gnr8_aaf_approval_evidence_links (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  link_role text not null,
  source_note text null,
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.gnr8_aaf_approval_subject_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  approval_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  evidence_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  gate_attempt_id uuid null,
  subject_type text not null,
  subject_id text not null,
  source_system text not null default 'gnr8',
  source_table text not null,
  source_record_id text not null,
  source_version text null,
  source_watermark text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  created_at timestamptz not null default now(),
  constraint gnr8_aaf_approval_subject_refs_owner_ck
    check (
      approval_request_id is not null
      or approval_decision_id is not null
      or policy_evaluation_id is not null
      or evidence_package_id is not null
      or gate_attempt_id is not null
    ),
  constraint gnr8_aaf_approval_subject_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object')
);

create table if not exists public.gnr8_aaf_approval_supersession_links (
  id uuid primary key default gen_random_uuid(),
  superseded_approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
  superseding_approval_request_id uuid not null references public.gnr8_aaf_approval_requests(id),
  superseded_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  superseding_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  reason text not null,
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  source_ref_id uuid null references public.gnr8_aaf_approval_subject_refs(id),
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_approval_supersession_links_not_self_ck
    check (superseded_approval_request_id <> superseding_approval_request_id),
  constraint gnr8_aaf_approval_supersession_links_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_approval_revocations (
  id uuid primary key default gen_random_uuid(),
  approval_decision_id uuid not null references public.gnr8_aaf_approval_decisions(id),
  revoked_by_actor_type text not null,
  revoked_by_actor_id text not null,
  revoked_by_role text not null,
  revoked_at timestamptz not null default now(),
  reason text not null,
  audit_event_id uuid not null references public.gnr8_aaf_audit_events(id),
  incident_ref text null,
  replacement_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_approval_revocations_actor_type_ck
    check (revoked_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_audit_event_refs (
  id uuid primary key default gen_random_uuid(),
  audit_event_id uuid not null references public.gnr8_aaf_audit_events(id),
  ref_role text not null,
  ref_type text not null,
  ref_id text not null,
  ref_version text null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (audit_event_id, ref_role, ref_type, ref_id),
  constraint gnr8_aaf_audit_event_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object')
);

create table if not exists public.gnr8_aaf_audit_partial_timeline_markers (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  subject_type text not null,
  subject_id text not null,
  correlation_id text not null,
  first_observed_audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  missing_event_name text not null,
  failure_reason text not null,
  status text not null default 'open',
  audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  created_at timestamptz not null default now(),
  reconciled_at timestamptz null,
  constraint gnr8_aaf_audit_partial_timeline_markers_status_ck
    check (status in ('open', 'reconciled', 'compensating_recorded')),
  constraint gnr8_aaf_audit_partial_timeline_markers_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_evidence_package_items (
  id uuid primary key default gen_random_uuid(),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  item_type text not null,
  item_ref text not null,
  item_hash text not null,
  media_type text not null,
  size_bytes bigint not null default 0,
  storage_bucket text null,
  storage_key text null,
  source_table text null,
  source_record_id text null,
  display_name text null,
  limitations_json jsonb not null default '{}'::jsonb,
  privacy_label text not null default 'internal_operational',
  redaction_label text not null default 'none',
  retention_class text not null default 'compliance_long',
  created_at timestamptz not null default now(),
  unique (evidence_package_id, item_ref, item_hash),
  constraint gnr8_aaf_evidence_package_items_size_ck
    check (size_bytes >= 0),
  constraint gnr8_aaf_evidence_package_items_hash_ck
    check (length(item_hash) >= 16),
  constraint gnr8_aaf_evidence_package_items_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_aaf_evidence_package_items_redaction_ck
    check (redaction_label in (
      'none',
      'redaction_required',
      'redacted',
      'credential_redacted',
      'billing_redacted',
      'provider_redacted',
      'legal_redacted'
    )),
  constraint gnr8_aaf_evidence_package_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_aaf_evidence_package_items_limitations_object_ck
    check (jsonb_typeof(limitations_json) = 'object')
);

create table if not exists public.gnr8_aaf_evidence_package_source_refs (
  id uuid primary key default gen_random_uuid(),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  source_system text not null default 'gnr8',
  source_table text not null,
  source_record_id text not null,
  source_version text null,
  source_watermark text not null,
  captured_at timestamptz not null default now(),
  hash text not null,
  query_ref text null,
  snapshot_ref text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (evidence_package_id, source_system, source_table, source_record_id, source_watermark),
  constraint gnr8_aaf_evidence_package_source_refs_hash_ck
    check (length(hash) >= 16),
  constraint gnr8_aaf_evidence_package_source_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object')
);

create table if not exists public.gnr8_aaf_evidence_package_freshness_checks (
  id uuid primary key default gen_random_uuid(),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  policy_version text not null,
  result text not null,
  checked_at timestamptz not null default now(),
  checked_by_actor_type text not null,
  checked_by_actor_id text not null,
  stale_reason text null,
  expires_at timestamptz null,
  current_source_watermark text null,
  audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_evidence_package_freshness_checks_result_ck
    check (result in ('fresh', 'stale', 'failed', 'partial_timeline')),
  constraint gnr8_aaf_evidence_package_freshness_checks_actor_type_ck
    check (checked_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_evidence_package_redactions (
  id uuid primary key default gen_random_uuid(),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  redacted_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  redaction_policy text not null,
  redacted_by_actor_type text not null,
  redacted_by_actor_id text not null,
  redacted_at timestamptz not null default now(),
  hash_before text not null,
  hash_after text not null,
  audit_event_id uuid not null references public.gnr8_aaf_audit_events(id),
  redaction_notes text null,
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_evidence_package_redactions_hash_ck
    check (length(hash_before) >= 16 and length(hash_after) >= 16),
  constraint gnr8_aaf_evidence_package_redactions_not_self_ck
    check (evidence_package_id <> redacted_package_id),
  constraint gnr8_aaf_evidence_package_redactions_actor_type_ck
    check (redacted_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_evidence_package_supersession (
  id uuid primary key default gen_random_uuid(),
  superseded_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  superseding_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  reason text not null,
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  source_ref_id uuid null references public.gnr8_aaf_evidence_package_source_refs(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_evidence_package_supersession_not_self_ck
    check (superseded_package_id <> superseding_package_id),
  constraint gnr8_aaf_evidence_package_supersession_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory'))
);

create table if not exists public.gnr8_aaf_evidence_package_audit_links (
  id uuid primary key default gen_random_uuid(),
  evidence_package_id uuid not null references public.gnr8_aaf_evidence_packages(id),
  evidence_package_item_id uuid null references public.gnr8_aaf_evidence_package_items(id),
  audit_event_id uuid not null references public.gnr8_aaf_audit_events(id),
  approval_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  link_role text not null,
  created_at timestamptz not null default now(),
  unique (evidence_package_id, audit_event_id, link_role)
);

create table if not exists public.gnr8_aaf_action_gate_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text null,
  site_id text null,
  batch_id text null,
  job_id text null,
  site_version_id text null,
  domain_id text null,
  cost_center_id text null,
  action_key text not null,
  scope text not null,
  subject_type text not null,
  subject_id text not null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  policy_evaluation_id uuid null references public.gnr8_aaf_approval_policy_evaluations(id),
  evidence_package_id uuid null references public.gnr8_aaf_evidence_packages(id),
  approval_request_id uuid null references public.gnr8_aaf_approval_requests(id),
  approval_decision_id uuid null references public.gnr8_aaf_approval_decisions(id),
  pre_action_audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  outcome_audit_event_id uuid null references public.gnr8_aaf_audit_events(id),
  gate_result text not null,
  fail_closed_reason text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_aaf_action_gate_attempts_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance'
    )),
  constraint gnr8_aaf_action_gate_attempts_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_aaf_action_gate_attempts_result_ck
    check (gate_result in (
      'allowed',
      'blocked',
      'approval_required',
      'evidence_missing',
      'evidence_stale',
      'approval_stale',
      'approval_superseded',
      'approval_revoked',
      'audit_unavailable',
      'not_required_by_policy',
      'policy_error',
      'fail_closed'
    )),
  constraint gnr8_aaf_action_gate_attempts_fail_closed_reason_ck
    check (gate_result <> 'fail_closed' or fail_closed_reason is not null)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_aaf_approval_subject_refs'::regclass
      and conname = 'gnr8_aaf_approval_subject_refs_gate_attempt_fkey'
  ) then
    alter table public.gnr8_aaf_approval_subject_refs
      add constraint gnr8_aaf_approval_subject_refs_gate_attempt_fkey
      foreign key (gate_attempt_id)
      references public.gnr8_aaf_action_gate_attempts(id);
  end if;
end $$;

create index if not exists idx_gnr8_aaf_approval_requests_scope_status
  on public.gnr8_aaf_approval_requests (scope, status, created_at desc);
create index if not exists idx_gnr8_aaf_approval_requests_correlation
  on public.gnr8_aaf_approval_requests (correlation_id);
create index if not exists idx_gnr8_aaf_approval_requests_subject
  on public.gnr8_aaf_approval_requests (tenant_id, scope, subject_type, subject_id);
create index if not exists idx_gnr8_aaf_approval_requests_site
  on public.gnr8_aaf_approval_requests (site_id, created_at desc);
create index if not exists idx_gnr8_aaf_approval_decisions_request_created
  on public.gnr8_aaf_approval_decisions (approval_request_id, created_at desc);
create index if not exists idx_gnr8_aaf_approval_decisions_status
  on public.gnr8_aaf_approval_decisions (status, decided_at desc);
create index if not exists idx_gnr8_aaf_approval_policy_evaluations_lookup
  on public.gnr8_aaf_approval_policy_evaluations (tenant_id, scope, subject_type, subject_id, evaluated_at desc);
create index if not exists idx_gnr8_aaf_approval_policy_evaluations_correlation
  on public.gnr8_aaf_approval_policy_evaluations (correlation_id);
create index if not exists idx_gnr8_aaf_approval_subject_refs_lookup
  on public.gnr8_aaf_approval_subject_refs (tenant_id, subject_type, subject_id, source_table, source_record_id);
create index if not exists idx_gnr8_aaf_approval_evidence_links_request
  on public.gnr8_aaf_approval_evidence_links (approval_request_id, link_role);

create index if not exists idx_gnr8_aaf_audit_events_family_name_created
  on public.gnr8_aaf_audit_events (event_family, event_name, created_at desc);
create index if not exists idx_gnr8_aaf_audit_events_subject_created
  on public.gnr8_aaf_audit_events (tenant_id, subject_type, subject_id, created_at desc);
create index if not exists idx_gnr8_aaf_audit_events_correlation_created
  on public.gnr8_aaf_audit_events (correlation_id, created_at asc);
create index if not exists idx_gnr8_aaf_audit_events_approval_refs
  on public.gnr8_aaf_audit_events (approval_request_id, approval_decision_id);
create index if not exists idx_gnr8_aaf_audit_events_evidence_policy_refs
  on public.gnr8_aaf_audit_events (evidence_package_id, policy_evaluation_id);
create index if not exists idx_gnr8_aaf_audit_event_refs_lookup
  on public.gnr8_aaf_audit_event_refs (ref_type, ref_id);
create index if not exists idx_gnr8_aaf_audit_partial_timeline_markers_correlation
  on public.gnr8_aaf_audit_partial_timeline_markers (correlation_id, created_at desc);

create index if not exists idx_gnr8_aaf_evidence_packages_subject
  on public.gnr8_aaf_evidence_packages (tenant_id, package_type, subject_type, subject_id, created_at desc);
create index if not exists idx_gnr8_aaf_evidence_packages_correlation
  on public.gnr8_aaf_evidence_packages (correlation_id);
create index if not exists idx_gnr8_aaf_evidence_package_items_package
  on public.gnr8_aaf_evidence_package_items (evidence_package_id, item_type);
create index if not exists idx_gnr8_aaf_evidence_package_source_refs_lookup
  on public.gnr8_aaf_evidence_package_source_refs (source_system, source_table, source_record_id, source_watermark);
create index if not exists idx_gnr8_aaf_evidence_package_freshness_checks_package
  on public.gnr8_aaf_evidence_package_freshness_checks (evidence_package_id, checked_at desc);
create index if not exists idx_gnr8_aaf_evidence_package_audit_links_event
  on public.gnr8_aaf_evidence_package_audit_links (audit_event_id);

create index if not exists idx_gnr8_aaf_action_gate_attempts_subject
  on public.gnr8_aaf_action_gate_attempts (tenant_id, scope, subject_type, subject_id, created_at desc);
create index if not exists idx_gnr8_aaf_action_gate_attempts_correlation
  on public.gnr8_aaf_action_gate_attempts (correlation_id, created_at desc);
create index if not exists idx_gnr8_aaf_action_gate_attempts_result
  on public.gnr8_aaf_action_gate_attempts (gate_result, created_at desc);

alter table public.gnr8_aaf_approval_requests enable row level security;
alter table public.gnr8_aaf_approval_decisions enable row level security;
alter table public.gnr8_aaf_approval_policies enable row level security;
alter table public.gnr8_aaf_approval_evidence_links enable row level security;
alter table public.gnr8_aaf_approval_scope_definitions enable row level security;
alter table public.gnr8_aaf_approval_supersession_links enable row level security;
alter table public.gnr8_aaf_approval_revocations enable row level security;
alter table public.gnr8_aaf_approval_policy_evaluations enable row level security;
alter table public.gnr8_aaf_approval_subject_refs enable row level security;
alter table public.gnr8_aaf_audit_events enable row level security;
alter table public.gnr8_aaf_audit_event_refs enable row level security;
alter table public.gnr8_aaf_audit_partial_timeline_markers enable row level security;
alter table public.gnr8_aaf_evidence_packages enable row level security;
alter table public.gnr8_aaf_evidence_package_items enable row level security;
alter table public.gnr8_aaf_evidence_package_source_refs enable row level security;
alter table public.gnr8_aaf_evidence_package_freshness_checks enable row level security;
alter table public.gnr8_aaf_evidence_package_redactions enable row level security;
alter table public.gnr8_aaf_evidence_package_supersession enable row level security;
alter table public.gnr8_aaf_evidence_package_audit_links enable row level security;
alter table public.gnr8_aaf_action_gate_attempts enable row level security;

drop trigger if exists trg_gnr8_aaf_approval_requests_append_only on public.gnr8_aaf_approval_requests;
create trigger trg_gnr8_aaf_approval_requests_append_only
  before update or delete on public.gnr8_aaf_approval_requests
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_decisions_append_only on public.gnr8_aaf_approval_decisions;
create trigger trg_gnr8_aaf_approval_decisions_append_only
  before update or delete on public.gnr8_aaf_approval_decisions
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_evidence_links_append_only on public.gnr8_aaf_approval_evidence_links;
create trigger trg_gnr8_aaf_approval_evidence_links_append_only
  before update or delete on public.gnr8_aaf_approval_evidence_links
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_subject_refs_append_only on public.gnr8_aaf_approval_subject_refs;
create trigger trg_gnr8_aaf_approval_subject_refs_append_only
  before update or delete on public.gnr8_aaf_approval_subject_refs
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_supersession_links_append_only on public.gnr8_aaf_approval_supersession_links;
create trigger trg_gnr8_aaf_approval_supersession_links_append_only
  before update or delete on public.gnr8_aaf_approval_supersession_links
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_revocations_append_only on public.gnr8_aaf_approval_revocations;
create trigger trg_gnr8_aaf_approval_revocations_append_only
  before update or delete on public.gnr8_aaf_approval_revocations
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_approval_policy_evaluations_append_only on public.gnr8_aaf_approval_policy_evaluations;
create trigger trg_gnr8_aaf_approval_policy_evaluations_append_only
  before update or delete on public.gnr8_aaf_approval_policy_evaluations
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_audit_events_append_only on public.gnr8_aaf_audit_events;
create trigger trg_gnr8_aaf_audit_events_append_only
  before update or delete on public.gnr8_aaf_audit_events
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_audit_event_refs_append_only on public.gnr8_aaf_audit_event_refs;
create trigger trg_gnr8_aaf_audit_event_refs_append_only
  before update or delete on public.gnr8_aaf_audit_event_refs
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_audit_partial_timeline_markers_append_only on public.gnr8_aaf_audit_partial_timeline_markers;
create trigger trg_gnr8_aaf_audit_partial_timeline_markers_append_only
  before update or delete on public.gnr8_aaf_audit_partial_timeline_markers
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_packages_append_only on public.gnr8_aaf_evidence_packages;
create trigger trg_gnr8_aaf_evidence_packages_append_only
  before update or delete on public.gnr8_aaf_evidence_packages
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_items_append_only on public.gnr8_aaf_evidence_package_items;
create trigger trg_gnr8_aaf_evidence_package_items_append_only
  before update or delete on public.gnr8_aaf_evidence_package_items
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_source_refs_append_only on public.gnr8_aaf_evidence_package_source_refs;
create trigger trg_gnr8_aaf_evidence_package_source_refs_append_only
  before update or delete on public.gnr8_aaf_evidence_package_source_refs
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_freshness_checks_append_only on public.gnr8_aaf_evidence_package_freshness_checks;
create trigger trg_gnr8_aaf_evidence_package_freshness_checks_append_only
  before update or delete on public.gnr8_aaf_evidence_package_freshness_checks
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_redactions_append_only on public.gnr8_aaf_evidence_package_redactions;
create trigger trg_gnr8_aaf_evidence_package_redactions_append_only
  before update or delete on public.gnr8_aaf_evidence_package_redactions
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_supersession_append_only on public.gnr8_aaf_evidence_package_supersession;
create trigger trg_gnr8_aaf_evidence_package_supersession_append_only
  before update or delete on public.gnr8_aaf_evidence_package_supersession
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_evidence_package_audit_links_append_only on public.gnr8_aaf_evidence_package_audit_links;
create trigger trg_gnr8_aaf_evidence_package_audit_links_append_only
  before update or delete on public.gnr8_aaf_evidence_package_audit_links
  for each row execute function public.gnr8_aaf_prevent_update_delete();

drop trigger if exists trg_gnr8_aaf_action_gate_attempts_append_only on public.gnr8_aaf_action_gate_attempts;
create trigger trg_gnr8_aaf_action_gate_attempts_append_only
  before update or delete on public.gnr8_aaf_action_gate_attempts
  for each row execute function public.gnr8_aaf_prevent_update_delete();

commit;
