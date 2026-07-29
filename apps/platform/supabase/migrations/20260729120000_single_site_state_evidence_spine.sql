-- GNR8 Single-Site State And Source Evidence Spine Persistence Core
-- Additive canonical storage for one-site-at-a-time migration operational state
-- and source evidence review refs/history. This migration does not implement
-- writers, services, APIs, UI, capture, clone, proposal, billing, domain/DNS,
-- publish, rollback, Command Center, Ops Inbox, workers, providers, or runtime behavior.

begin;

create extension if not exists pgcrypto;

create or replace function public.gnr8_single_site_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'GNR8 single-site records are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

create table if not exists public.gnr8_single_site_migrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id uuid not null,
  site_id uuid null,
  ownership_site_id uuid null,
  runtime_site_id text null,
  site_version_id uuid null,
  runtime_site_version_id uuid null,
  source_url text not null,
  canonical_source_url text null,
  intended_launch_domain text null,
  current_state text not null,
  current_stage text not null,
  state_version integer not null default 1,
  operator_owner_actor_id text null,
  current_blocker_count integer not null default 0,
  latest_source_evidence_review_id uuid null,
  latest_state_event_id uuid null,
  latest_aaf_evidence_package_id uuid null,
  latest_aaf_audit_event_id uuid null,
  source_capture_refs_json jsonb not null default '{}'::jsonb,
  runtime_refs_json jsonb not null default '{}'::jsonb,
  proposal_refs_json jsonb not null default '{}'::jsonb,
  aaf_approval_refs_json jsonb not null default '{}'::jsonb,
  aaf_evidence_refs_json jsonb not null default '{}'::jsonb,
  aaf_audit_refs_json jsonb not null default '{}'::jsonb,
  ddom_snapshot_refs_json jsonb not null default '{}'::jsonb,
  ptt_publish_target_refs_json jsonb not null default '{}'::jsonb,
  billing_subscription_refs_json jsonb not null default '{}'::jsonb,
  hosting_entitlement_refs_json jsonb not null default '{}'::jsonb,
  rollback_refs_json jsonb not null default '{}'::jsonb,
  closeout_refs_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  source_watermark text null,
  payload_hash text null,
  validation_site_number integer null,
  created_by_actor_type text not null,
  created_by_actor_id text not null,
  created_by_actor_display_label text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  terminal_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_migrations_state_ck
    check (current_state in (
      'site_candidate_created',
      'source_capture_started',
      'source_capture_completed',
      'source_capture_failed',
      'source_evidence_review_required',
      'clone_generation_started',
      'clone_generation_completed',
      'clone_review_required',
      'clone_revision_required',
      'improvement_proposal_started',
      'improvement_proposal_ready',
      'improvement_proposal_approved',
      'improvement_proposal_rejected',
      'improvement_implementation_started',
      'improvement_implementation_completed',
      'improved_preview_ready',
      'content_review_required',
      'content_approved',
      'domain_readiness_required',
      'domain_readiness_ready',
      'subscription_required',
      'subscription_created',
      'hosting_entitlement_ready',
      'launch_approval_required',
      'publish_ready',
      'published',
      'rollback_available',
      'migration_closed_out',
      'migration_failed',
      'migration_cancelled'
    )),
  constraint gnr8_single_site_migrations_stage_ck
    check (current_stage in (
      'intake',
      'source_capture',
      'source_evidence_review',
      'clone',
      'proposal',
      'improvement_content',
      'domain_commercial_readiness',
      'launch_publish_recovery',
      'terminal'
    )),
  constraint gnr8_single_site_migrations_state_stage_ck
    check (
      (current_stage = 'intake' and current_state in ('site_candidate_created'))
      or (current_stage = 'source_capture' and current_state in ('source_capture_started', 'source_capture_completed', 'source_capture_failed'))
      or (current_stage = 'source_evidence_review' and current_state in ('source_evidence_review_required'))
      or (current_stage = 'clone' and current_state in ('clone_generation_started', 'clone_generation_completed', 'clone_review_required', 'clone_revision_required'))
      or (current_stage = 'proposal' and current_state in ('improvement_proposal_started', 'improvement_proposal_ready', 'improvement_proposal_approved', 'improvement_proposal_rejected'))
      or (current_stage = 'improvement_content' and current_state in ('improvement_implementation_started', 'improvement_implementation_completed', 'improved_preview_ready', 'content_review_required', 'content_approved'))
      or (current_stage = 'domain_commercial_readiness' and current_state in ('domain_readiness_required', 'domain_readiness_ready', 'subscription_required', 'subscription_created', 'hosting_entitlement_ready'))
      or (current_stage = 'launch_publish_recovery' and current_state in ('launch_approval_required', 'publish_ready', 'published', 'rollback_available'))
      or (current_stage = 'terminal' and current_state in ('migration_closed_out', 'migration_failed', 'migration_cancelled'))
    ),
  constraint gnr8_single_site_migrations_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_migrations_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migrations_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_migrations_json_shape_ck
    check (
      jsonb_typeof(source_capture_refs_json) = 'object'
      and jsonb_typeof(runtime_refs_json) = 'object'
      and jsonb_typeof(proposal_refs_json) = 'object'
      and jsonb_typeof(aaf_approval_refs_json) = 'object'
      and jsonb_typeof(aaf_evidence_refs_json) = 'object'
      and jsonb_typeof(aaf_audit_refs_json) = 'object'
      and jsonb_typeof(ddom_snapshot_refs_json) = 'object'
      and jsonb_typeof(ptt_publish_target_refs_json) = 'object'
      and jsonb_typeof(billing_subscription_refs_json) = 'object'
      and jsonb_typeof(hosting_entitlement_refs_json) = 'object'
      and jsonb_typeof(rollback_refs_json) = 'object'
      and jsonb_typeof(closeout_refs_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_migrations_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(source_url)) > 0
      and length(btrim(created_by_actor_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_migrations_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0),
  constraint gnr8_single_site_migrations_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128),
  constraint gnr8_single_site_migrations_counter_ck
    check (state_version >= 1 and current_blocker_count >= 0 and (validation_site_number is null or validation_site_number > 0)),
  constraint gnr8_single_site_migrations_terminal_ck
    check (
      (current_state in ('migration_closed_out', 'migration_failed', 'migration_cancelled') and terminal_at is not null)
      or (current_state not in ('migration_closed_out', 'migration_failed', 'migration_cancelled') and terminal_at is null)
    )
);

create table if not exists public.gnr8_single_site_migration_state_events (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  event_index integer not null,
  from_state text null,
  to_state text not null,
  from_stage text null,
  to_stage text not null,
  transition_key text not null,
  transition_reason text null,
  required_refs_json jsonb not null default '{}'::jsonb,
  missing_requirements_json jsonb not null default '[]'::jsonb,
  before_ref_json jsonb not null default '{}'::jsonb,
  after_ref_json jsonb not null default '{}'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  aaf_audit_event_id uuid null,
  aaf_evidence_package_id uuid null,
  aaf_approval_request_id uuid null,
  aaf_approval_decision_id uuid null,
  source_watermark text null,
  payload_hash text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (migration_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_migration_state_events_state_ck
    check (
      (from_state is null or from_state in (
        'site_candidate_created', 'source_capture_started', 'source_capture_completed', 'source_capture_failed',
        'source_evidence_review_required', 'clone_generation_started', 'clone_generation_completed', 'clone_review_required',
        'clone_revision_required', 'improvement_proposal_started', 'improvement_proposal_ready', 'improvement_proposal_approved',
        'improvement_proposal_rejected', 'improvement_implementation_started', 'improvement_implementation_completed',
        'improved_preview_ready', 'content_review_required', 'content_approved', 'domain_readiness_required',
        'domain_readiness_ready', 'subscription_required', 'subscription_created', 'hosting_entitlement_ready',
        'launch_approval_required', 'publish_ready', 'published', 'rollback_available', 'migration_closed_out',
        'migration_failed', 'migration_cancelled'
      ))
      and to_state in (
        'site_candidate_created', 'source_capture_started', 'source_capture_completed', 'source_capture_failed',
        'source_evidence_review_required', 'clone_generation_started', 'clone_generation_completed', 'clone_review_required',
        'clone_revision_required', 'improvement_proposal_started', 'improvement_proposal_ready', 'improvement_proposal_approved',
        'improvement_proposal_rejected', 'improvement_implementation_started', 'improvement_implementation_completed',
        'improved_preview_ready', 'content_review_required', 'content_approved', 'domain_readiness_required',
        'domain_readiness_ready', 'subscription_required', 'subscription_created', 'hosting_entitlement_ready',
        'launch_approval_required', 'publish_ready', 'published', 'rollback_available', 'migration_closed_out',
        'migration_failed', 'migration_cancelled'
      )
    ),
  constraint gnr8_single_site_migration_state_events_stage_ck
    check (
      (from_stage is null or from_stage in (
        'intake', 'source_capture', 'source_evidence_review', 'clone', 'proposal',
        'improvement_content', 'domain_commercial_readiness', 'launch_publish_recovery', 'terminal'
      ))
      and to_stage in (
        'intake', 'source_capture', 'source_evidence_review', 'clone', 'proposal',
        'improvement_content', 'domain_commercial_readiness', 'launch_publish_recovery', 'terminal'
      )
    ),
  constraint gnr8_single_site_migration_state_events_creation_ck
    check ((from_state is null and transition_key = 'migration.created') or from_state is not null),
  constraint gnr8_single_site_migration_state_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_migration_state_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migration_state_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_migration_state_events_json_shape_ck
    check (
      jsonb_typeof(required_refs_json) = 'object'
      and jsonb_typeof(missing_requirements_json) = 'array'
      and jsonb_typeof(before_ref_json) = 'object'
      and jsonb_typeof(after_ref_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_migration_state_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(transition_key)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_migration_state_events_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0),
  constraint gnr8_single_site_migration_state_events_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

create table if not exists public.gnr8_single_site_migration_refs (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  state_event_id uuid null references public.gnr8_single_site_migration_state_events(id) on delete restrict,
  ref_role text not null,
  ref_type text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_record_id text not null,
  source_version text null,
  source_watermark text null,
  payload_hash text null,
  captured_at timestamptz null,
  fresh_until timestamptz null,
  superseded_by_ref_id uuid null references public.gnr8_single_site_migration_refs(id) on delete restrict,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  idempotency_key text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_migration_refs_role_ck
    check (ref_role in (
      'ownership_site',
      'runtime_site',
      'runtime_site_version_clone',
      'runtime_site_version_improved',
      'runtime_artifact_clone',
      'runtime_artifact_improved',
      'raw_template_artifact',
      'content_slot',
      'content_override',
      'capture_run',
      'render_job',
      'source_evidence_package',
      'source_evidence_review',
      'clone_review',
      'clone_revision',
      'proposal_artifact',
      'proposal_approval',
      'content_approval',
      'domain_binding',
      'ddom_readiness_snapshot',
      'publish_target',
      'pasr_shadow_result',
      'subscription',
      'hosting_entitlement',
      'billing_account',
      'cost_center',
      'stripe_customer',
      'stripe_subscription',
      'publish_event',
      'active_pointer',
      'rollback_target',
      'closeout',
      'aaf_evidence_package',
      'aaf_approval_request',
      'aaf_approval_decision',
      'aaf_policy_evaluation',
      'aaf_audit_event',
      'external_reference'
    )),
  constraint gnr8_single_site_migration_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migration_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_migration_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_migration_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_migration_refs_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0),
  constraint gnr8_single_site_migration_refs_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

create table if not exists public.gnr8_single_site_migration_stage_summaries (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  stage text not null,
  status text not null,
  projection_kind text not null default 'state_writer_cache',
  started_at timestamptz null,
  completed_at timestamptz null,
  latest_state_event_id uuid null references public.gnr8_single_site_migration_state_events(id) on delete restrict,
  latest_evidence_ref_id uuid null references public.gnr8_single_site_migration_refs(id) on delete restrict,
  latest_approval_ref_id uuid null references public.gnr8_single_site_migration_refs(id) on delete restrict,
  summary_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  blocker_count integer not null default 0,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (migration_id, stage),
  unique (idempotency_key),
  constraint gnr8_single_site_migration_stage_summaries_stage_ck
    check (stage in (
      'intake',
      'source_capture',
      'source_evidence_review',
      'clone',
      'proposal',
      'improvement_content',
      'domain_commercial_readiness',
      'launch_publish_recovery',
      'terminal'
    )),
  constraint gnr8_single_site_migration_stage_summaries_status_ck
    check (status in (
      'not_started',
      'in_progress',
      'ready_for_review',
      'accepted',
      'accepted_with_limitations',
      'blocked',
      'failed',
      'cancelled',
      'completed',
      'superseded'
    )),
  constraint gnr8_single_site_migration_stage_summaries_projection_kind_ck
    check (projection_kind = 'state_writer_cache'),
  constraint gnr8_single_site_migration_stage_summaries_json_shape_ck
    check (
      jsonb_typeof(summary_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
    ),
  constraint gnr8_single_site_migration_stage_summaries_counter_ck
    check (blocker_count >= 0),
  constraint gnr8_single_site_migration_stage_summaries_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migration_stage_summaries_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_single_site_migration_blockers (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  state_event_id uuid null references public.gnr8_single_site_migration_state_events(id) on delete restrict,
  blocker_key text not null,
  blocker_type text not null,
  severity text not null,
  status text not null default 'open',
  owner_role text null,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolution_state_event_id uuid null references public.gnr8_single_site_migration_state_events(id) on delete restrict,
  resolution_aaf_audit_event_id uuid null,
  resolution_aaf_approval_decision_id uuid null,
  source_ref_json jsonb not null default '{}'::jsonb,
  details_json jsonb not null default '{}'::jsonb,
  ops_inbox_projection_key text null,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (migration_id, blocker_key),
  unique (idempotency_key),
  constraint gnr8_single_site_migration_blockers_type_ck
    check (blocker_type in (
      'intake_missing_client',
      'source_capture_failed',
      'source_evidence_missing',
      'source_evidence_degraded',
      'clone_fidelity_gap',
      'clone_revision_required',
      'proposal_approval_needed',
      'content_approval_needed',
      'domain_readiness_missing',
      'domain_readiness_stale',
      'subscription_missing',
      'hosting_entitlement_missing',
      'launch_approval_missing',
      'publish_activation_approval_missing',
      'rollback_evidence_missing',
      'audit_evidence_gap',
      'closeout_required'
    )),
  constraint gnr8_single_site_migration_blockers_severity_ck
    check (severity in ('p0', 'p1', 'p2', 'p3', 'info')),
  constraint gnr8_single_site_migration_blockers_status_ck
    check (status in ('open', 'resolved', 'superseded', 'accepted_risk', 'cancelled')),
  constraint gnr8_single_site_migration_blockers_resolution_ck
    check (
      (status = 'open' and resolved_at is null)
      or (status in ('resolved', 'superseded', 'accepted_risk', 'cancelled') and resolved_at is not null)
    ),
  constraint gnr8_single_site_migration_blockers_json_shape_ck
    check (jsonb_typeof(source_ref_json) = 'object' and jsonb_typeof(details_json) = 'object'),
  constraint gnr8_single_site_migration_blockers_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migration_blockers_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_single_site_migration_closeouts (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  status text not null default 'completed',
  final_url text null,
  outcome text not null,
  validation_site_number integer null,
  metrics_json jsonb not null default '{}'::jsonb,
  issue_taxonomy_json jsonb not null default '[]'::jsonb,
  evidence_summary_json jsonb not null default '{}'::jsonb,
  exceptions_json jsonb not null default '[]'::jsonb,
  lessons_json jsonb not null default '{}'::jsonb,
  closeout_refs_json jsonb not null default '{}'::jsonb,
  supersedes_closeout_id uuid null references public.gnr8_single_site_migration_closeouts(id) on delete restrict,
  superseded_by_closeout_id uuid null references public.gnr8_single_site_migration_closeouts(id) on delete restrict,
  aaf_evidence_package_id uuid null,
  aaf_approval_decision_id uuid null,
  aaf_audit_event_id uuid null,
  closed_by_actor_type text not null,
  closed_by_actor_id text not null,
  closed_by_actor_display_label text null,
  closed_at timestamptz not null default now(),
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (migration_id),
  unique (idempotency_key),
  constraint gnr8_single_site_migration_closeouts_status_ck
    check (status in ('draft', 'completed', 'superseded', 'invalid')),
  constraint gnr8_single_site_migration_closeouts_outcome_ck
    check (outcome in (
      'published_success',
      'published_with_limitations',
      'no_go',
      'cancelled',
      'failed',
      'internal_rehearsal_only'
    )),
  constraint gnr8_single_site_migration_closeouts_actor_type_ck
    check (closed_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_migration_closeouts_json_shape_ck
    check (
      jsonb_typeof(metrics_json) = 'object'
      and jsonb_typeof(issue_taxonomy_json) = 'array'
      and jsonb_typeof(evidence_summary_json) = 'object'
      and jsonb_typeof(exceptions_json) = 'array'
      and jsonb_typeof(lessons_json) = 'object'
      and jsonb_typeof(closeout_refs_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_migration_closeouts_validation_site_number_ck
    check (validation_site_number is null or validation_site_number > 0),
  constraint gnr8_single_site_migration_closeouts_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_migration_closeouts_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_single_site_source_evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  tenant_id text not null,
  client_id uuid not null,
  site_id uuid null,
  ownership_site_id uuid null,
  runtime_site_id text null,
  site_version_id uuid null,
  source_url text not null,
  canonical_source_url text null,
  capture_run_id text null,
  render_job_id text null,
  source_evidence_package_key text not null,
  source_watermark text not null,
  source_hash text null,
  capture_started_at timestamptz null,
  capture_completed_at timestamptz null,
  evidence_captured_at timestamptz not null,
  fresh_until timestamptz null,
  completeness_status text not null,
  review_status text not null default 'not_started',
  review_decision text null,
  accepted_degraded_capture boolean not null default false,
  retry_required boolean not null default false,
  clone_generation_allowed boolean not null default false,
  review_limitations_json jsonb not null default '[]'::jsonb,
  missing_evidence_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  diagnostics_json jsonb not null default '{}'::jsonb,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_role text null,
  reviewer_actor_display_label text null,
  review_started_at timestamptz null,
  reviewed_at timestamptz null,
  supersedes_review_id uuid null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  superseded_by_review_id uuid null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  aaf_evidence_package_id uuid null,
  aaf_approval_request_id uuid null,
  aaf_approval_decision_id uuid null,
  aaf_audit_event_id uuid null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (migration_id, source_evidence_package_key, source_watermark),
  constraint gnr8_single_site_source_evidence_reviews_status_ck
    check (review_status in (
      'not_started',
      'ready_for_review',
      'review_in_progress',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'superseded'
    )),
  constraint gnr8_single_site_source_evidence_reviews_completeness_ck
    check (completeness_status in (
      'unknown',
      'complete',
      'complete_with_warnings',
      'degraded',
      'missing_required_evidence',
      'unusable'
    )),
  constraint gnr8_single_site_source_evidence_reviews_decision_ck
    check (review_decision is null or review_decision in ('accept', 'accept_with_limitations', 'retry_capture', 'reject_source', 'supersede')),
  constraint gnr8_single_site_source_evidence_reviews_decision_required_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected')
      or review_decision is not null
    ),
  constraint gnr8_single_site_source_evidence_reviews_reviewed_at_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected')
      or reviewed_at is not null
    ),
  constraint gnr8_single_site_source_evidence_reviews_reviewer_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected')
      or (reviewer_actor_type is not null and reviewer_actor_id is not null and reviewer_actor_role is not null)
    ),
  constraint gnr8_single_site_source_evidence_reviews_clone_allowed_ck
    check (clone_generation_allowed = false or review_status in ('accepted', 'accepted_with_limitations')),
  constraint gnr8_single_site_source_evidence_reviews_degraded_ck
    check (
      accepted_degraded_capture = false
      or (review_status = 'accepted_with_limitations' and jsonb_array_length(review_limitations_json) > 0 and aaf_approval_decision_id is not null)
    ),
  constraint gnr8_single_site_source_evidence_reviews_retry_ck
    check (review_status <> 'retry_required' or (retry_required = true and clone_generation_allowed = false)),
  constraint gnr8_single_site_source_evidence_reviews_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_source_evidence_reviews_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_source_evidence_reviews_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_source_evidence_reviews_json_shape_ck
    check (
      jsonb_typeof(review_limitations_json) = 'array'
      and jsonb_typeof(missing_evidence_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(diagnostics_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_source_evidence_reviews_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(source_url)) > 0
      and length(btrim(source_evidence_package_key)) > 0
      and length(btrim(source_watermark)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_source_evidence_reviews_source_hash_ck
    check (source_hash is null or length(source_hash) between 16 and 128)
);

create table if not exists public.gnr8_single_site_source_evidence_review_refs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  ref_role text not null,
  ref_type text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_record_id text not null,
  source_version text null,
  source_watermark text null,
  content_hash text null,
  media_type text null,
  captured_at timestamptz null,
  fresh_until timestamptz null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  idempotency_key text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_source_evidence_review_refs_role_ck
    check (ref_role in (
      'capture_run',
      'render_job',
      'source_url',
      'canonical_source_url',
      'page',
      'route_map',
      'screenshot',
      'dom',
      'rendered_dom',
      'raw_html',
      'source_snapshot',
      'text',
      'text_extract',
      'image',
      'image_asset',
      'asset',
      'asset_manifest',
      'font',
      'font_ref',
      'stylesheet_ref',
      'layout_geometry',
      'navigation_tree',
      'section_boundary',
      'visual_identity',
      'cgp_signal',
      'metadata',
      'seo_metadata',
      'structured_data',
      'diagnostic',
      'limitation',
      'missing_evidence',
      'source_evidence_package',
      'aaf_evidence_package',
      'aaf_audit_event',
      'external_ref',
      'external_reference'
    )),
  constraint gnr8_single_site_source_evidence_review_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_source_evidence_review_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_source_evidence_review_refs_metadata_object_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_source_evidence_review_refs_content_hash_ck
    check (content_hash is null or length(content_hash) between 16 and 128),
  constraint gnr8_single_site_source_evidence_review_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_source_evidence_review_refs_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0)
);

create table if not exists public.gnr8_single_site_source_evidence_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  evidence_category text not null,
  status text not null,
  required_for_clone boolean not null default true,
  blocks_clone_generation boolean not null default false,
  accepted_limitation boolean not null default false,
  finding_summary text null,
  ref_ids_json jsonb not null default '[]'::jsonb,
  limitation_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blocker_json jsonb not null default '{}'::jsonb,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_display_label text null,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, evidence_category),
  unique (idempotency_key),
  constraint gnr8_single_site_source_evidence_review_items_category_ck
    check (evidence_category in (
      'source_url',
      'page',
      'screenshot',
      'dom',
      'text',
      'image',
      'asset',
      'font',
      'visual_identity',
      'metadata',
      'structured_data',
      'external_ref',
      'limitation',
      'missing_evidence'
    )),
  constraint gnr8_single_site_source_evidence_review_items_status_ck
    check (status in ('present', 'present_with_warnings', 'missing', 'degraded', 'not_applicable', 'unverified')),
  constraint gnr8_single_site_source_evidence_review_items_blocking_ck
    check (
      blocks_clone_generation = false
      or (required_for_clone = true and status in ('missing', 'degraded', 'unverified') and accepted_limitation = false)
    ),
  constraint gnr8_single_site_source_evidence_review_items_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_source_evidence_review_items_json_shape_ck
    check (
      jsonb_typeof(ref_ids_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blocker_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_source_evidence_review_items_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_source_evidence_review_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold'))
);

create table if not exists public.gnr8_single_site_source_evidence_review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  event_index integer not null,
  event_action text not null,
  from_status text null,
  to_status text null,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  details_json jsonb not null default '{}'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  aaf_audit_event_id uuid null,
  aaf_approval_decision_id uuid null,
  source_watermark text null,
  payload_hash text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (review_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_source_evidence_review_events_action_ck
    check (event_action in (
      'created',
      'item_added',
      'ready_for_review',
      'review_started',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'superseded',
      'comment_added'
    )),
  constraint gnr8_single_site_source_evidence_review_events_status_ck
    check (
      (from_status is null or from_status in (
        'not_started',
        'ready_for_review',
        'review_in_progress',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded'
      ))
      and (to_status is null or to_status in (
        'not_started',
        'ready_for_review',
        'review_in_progress',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded'
      ))
    ),
  constraint gnr8_single_site_source_evidence_review_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_source_evidence_review_events_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_source_evidence_review_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_source_evidence_review_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_source_evidence_review_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_source_evidence_review_events_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0),
  constraint gnr8_single_site_source_evidence_review_events_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_single_site_migrations'::regclass
      and conname = 'gnr8_single_site_migrations_latest_source_evidence_review_fkey'
  )
  then
    alter table public.gnr8_single_site_migrations
      add constraint gnr8_single_site_migrations_latest_source_evidence_review_fkey
      foreign key (latest_source_evidence_review_id)
      references public.gnr8_single_site_source_evidence_reviews(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gnr8_single_site_migrations'::regclass
      and conname = 'gnr8_single_site_migrations_latest_state_event_fkey'
  )
  then
    alter table public.gnr8_single_site_migrations
      add constraint gnr8_single_site_migrations_latest_state_event_fkey
      foreign key (latest_state_event_id)
      references public.gnr8_single_site_migration_state_events(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_gnr8_single_site_migrations_client_site_state
  on public.gnr8_single_site_migrations (client_id, site_id, current_state, updated_at desc);

create index if not exists idx_gnr8_single_site_migrations_source_url
  on public.gnr8_single_site_migrations (lower(source_url), updated_at desc);

create index if not exists idx_gnr8_single_site_migrations_canonical_source_url
  on public.gnr8_single_site_migrations (lower(canonical_source_url), updated_at desc)
  where canonical_source_url is not null;

create index if not exists idx_gnr8_single_site_migrations_idempotency_key
  on public.gnr8_single_site_migrations (idempotency_key);

create index if not exists idx_gnr8_single_site_migrations_current_stage
  on public.gnr8_single_site_migrations (current_stage, updated_at desc);

create index if not exists idx_gnr8_single_site_migrations_runtime_site
  on public.gnr8_single_site_migrations (runtime_site_id, updated_at desc)
  where runtime_site_id is not null;

create unique index if not exists idx_gnr8_single_site_migrations_open_source_uq
  on public.gnr8_single_site_migrations (client_id, lower(coalesce(canonical_source_url, source_url)))
  where current_state not in ('migration_closed_out', 'migration_failed', 'migration_cancelled');

create index if not exists idx_gnr8_single_site_migration_state_events_migration_occurred
  on public.gnr8_single_site_migration_state_events (migration_id, occurred_at asc);

create index if not exists idx_gnr8_single_site_migration_state_events_migration_index
  on public.gnr8_single_site_migration_state_events (migration_id, event_index asc);

create index if not exists idx_gnr8_single_site_migration_state_events_to_state
  on public.gnr8_single_site_migration_state_events (to_state, occurred_at desc);

create index if not exists idx_gnr8_single_site_migration_state_events_correlation
  on public.gnr8_single_site_migration_state_events (correlation_id);

create index if not exists idx_gnr8_single_site_migration_refs_migration_role
  on public.gnr8_single_site_migration_refs (migration_id, ref_role);

create index if not exists idx_gnr8_single_site_migration_refs_source_lookup
  on public.gnr8_single_site_migration_refs (source_system, source_table, source_record_id, source_watermark);

create unique index if not exists idx_gnr8_single_site_migration_refs_semantic_uq
  on public.gnr8_single_site_migration_refs (
    migration_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_watermark, '')
  );

create index if not exists idx_gnr8_single_site_migration_refs_state_event
  on public.gnr8_single_site_migration_refs (state_event_id)
  where state_event_id is not null;

create index if not exists idx_gnr8_single_site_migration_stage_summaries_stage_status
  on public.gnr8_single_site_migration_stage_summaries (stage, status, updated_at desc);

create index if not exists idx_gnr8_single_site_migration_stage_summaries_migration_updated
  on public.gnr8_single_site_migration_stage_summaries (migration_id, updated_at desc);

create index if not exists idx_gnr8_single_site_migration_blockers_migration_status_severity
  on public.gnr8_single_site_migration_blockers (migration_id, status, severity);

create index if not exists idx_gnr8_single_site_migration_blockers_status_severity
  on public.gnr8_single_site_migration_blockers (status, severity, updated_at desc);

create index if not exists idx_gnr8_single_site_migration_blockers_owner
  on public.gnr8_single_site_migration_blockers (owner_role, status, updated_at desc)
  where owner_role is not null;

create index if not exists idx_gnr8_single_site_migration_closeouts_migration_created
  on public.gnr8_single_site_migration_closeouts (migration_id, created_at desc);

create index if not exists idx_gnr8_single_site_migration_closeouts_outcome_closed
  on public.gnr8_single_site_migration_closeouts (outcome, closed_at desc);

create index if not exists idx_gnr8_single_site_source_evidence_reviews_migration_status
  on public.gnr8_single_site_source_evidence_reviews (migration_id, review_status, updated_at desc);

create index if not exists idx_gnr8_single_site_source_evidence_reviews_package_watermark
  on public.gnr8_single_site_source_evidence_reviews (source_evidence_package_key, source_watermark);

create index if not exists idx_gnr8_single_site_source_evidence_reviews_clone_allowed
  on public.gnr8_single_site_source_evidence_reviews (clone_generation_allowed, reviewed_at desc);

create index if not exists idx_gnr8_single_site_source_evidence_reviews_correlation
  on public.gnr8_single_site_source_evidence_reviews (correlation_id);

create index if not exists idx_gnr8_single_site_source_evidence_review_items_review_category_status
  on public.gnr8_single_site_source_evidence_review_items (review_id, evidence_category, status);

create index if not exists idx_gnr8_single_site_source_evidence_review_items_migration_category
  on public.gnr8_single_site_source_evidence_review_items (migration_id, evidence_category);

create index if not exists idx_gnr8_single_site_source_evidence_review_items_blocking
  on public.gnr8_single_site_source_evidence_review_items (blocks_clone_generation)
  where blocks_clone_generation = true;

create index if not exists idx_gnr8_single_site_source_evidence_review_refs_review_role
  on public.gnr8_single_site_source_evidence_review_refs (review_id, ref_role);

create index if not exists idx_gnr8_single_site_source_evidence_review_refs_source_lookup
  on public.gnr8_single_site_source_evidence_review_refs (source_system, source_table, source_record_id, source_watermark);

create unique index if not exists idx_gnr8_single_site_source_evidence_review_refs_semantic_uq
  on public.gnr8_single_site_source_evidence_review_refs (
    review_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_watermark, '')
  );

create index if not exists idx_gnr8_single_site_source_evidence_review_events_review_occurred
  on public.gnr8_single_site_source_evidence_review_events (review_id, occurred_at asc);

create index if not exists idx_gnr8_single_site_source_evidence_review_events_action
  on public.gnr8_single_site_source_evidence_review_events (event_action, occurred_at desc);

create index if not exists idx_gnr8_single_site_source_evidence_review_events_migration
  on public.gnr8_single_site_source_evidence_review_events (migration_id, occurred_at desc);

alter table public.gnr8_single_site_migrations enable row level security;
alter table public.gnr8_single_site_migration_state_events enable row level security;
alter table public.gnr8_single_site_migration_refs enable row level security;
alter table public.gnr8_single_site_migration_stage_summaries enable row level security;
alter table public.gnr8_single_site_migration_blockers enable row level security;
alter table public.gnr8_single_site_migration_closeouts enable row level security;
alter table public.gnr8_single_site_source_evidence_reviews enable row level security;
alter table public.gnr8_single_site_source_evidence_review_refs enable row level security;
alter table public.gnr8_single_site_source_evidence_review_items enable row level security;
alter table public.gnr8_single_site_source_evidence_review_events enable row level security;

drop trigger if exists trg_gnr8_single_site_migration_state_events_append_only on public.gnr8_single_site_migration_state_events;
create trigger trg_gnr8_single_site_migration_state_events_append_only
  before update or delete on public.gnr8_single_site_migration_state_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_migration_refs_append_only on public.gnr8_single_site_migration_refs;
create trigger trg_gnr8_single_site_migration_refs_append_only
  before update or delete on public.gnr8_single_site_migration_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_migration_closeouts_append_only on public.gnr8_single_site_migration_closeouts;
create trigger trg_gnr8_single_site_migration_closeouts_append_only
  before update or delete on public.gnr8_single_site_migration_closeouts
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_source_evidence_review_refs_append_only on public.gnr8_single_site_source_evidence_review_refs;
create trigger trg_gnr8_single_site_source_evidence_review_refs_append_only
  before update or delete on public.gnr8_single_site_source_evidence_review_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_source_evidence_review_events_append_only on public.gnr8_single_site_source_evidence_review_events;
create trigger trg_gnr8_single_site_source_evidence_review_events_append_only
  before update or delete on public.gnr8_single_site_source_evidence_review_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
