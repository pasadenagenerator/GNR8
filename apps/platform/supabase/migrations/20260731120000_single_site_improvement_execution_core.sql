-- GNR8 Single-Site Improvement Execution Core
-- Additive persistence for governed improvement execution attempts.
-- This migration does not create improved runtime versions, mutate runtime
-- artifacts/site versions, publish, call providers, change domains/DNS,
-- create approval decisions, create Generated Proposal Bundles, expose routes,
-- or perform billing behavior.

begin;

create extension if not exists pgcrypto;

alter table public.gnr8_single_site_migration_refs
  drop constraint if exists gnr8_single_site_migration_refs_role_ck;

alter table public.gnr8_single_site_migration_refs
  add constraint gnr8_single_site_migration_refs_role_ck
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
      'implementation_execution_attempt',
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
    ));

create table if not exists public.gnr8_single_site_improvement_execution_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id uuid not null,
  site_id uuid not null,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  proposal_plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  proposal_plan_version integer not null,
  proposal_plan_semantic_watermark text not null,
  proposal_approval_request_id text null,
  proposal_approval_decision_id text null,
  proposal_evidence_package_id text null,
  implementation_authorization_request_id text not null,
  implementation_authorization_decision_id text not null,
  implementation_authorization_evidence_package_id text null,
  aaf_validation_result_ref text null,
  aaf_validation_evidence_ref text null,
  clone_review_id uuid not null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  clone_site_version_ref text not null,
  clone_runtime_artifact_ref text not null,
  source_evidence_review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  selected_recommendation_refs_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  execution_mode text not null default 'dry_run',
  executor_id text null,
  executor_name text null,
  executor_version text null,
  status text not null default 'draft',
  readiness_json jsonb not null default '{}'::jsonb,
  validation_summary_json jsonb not null default '{}'::jsonb,
  semantic_input_watermark text not null,
  semantic_output_watermark text null,
  improved_candidate_site_version_ref text null,
  improved_runtime_artifact_ref text null,
  output_refs_json jsonb not null default '{}'::jsonb,
  failure_json jsonb not null default '{}'::jsonb,
  audit_refs_json jsonb not null default '{}'::jsonb,
  supersedes_attempt_id uuid null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  superseded_by_attempt_id uuid null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  non_approval_boundary_json jsonb not null default jsonb_build_object(
    'contentApproval', false,
    'clientApproval', false,
    'launchApproval', false,
    'publishActivationApproval', false,
    'runtimeMutationPerformed', false
  ),
  content_approval_granted boolean not null default false,
  client_approval_granted boolean not null default false,
  launch_approval_granted boolean not null default false,
  publish_activation_approval_granted boolean not null default false,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  payload_hash text null,
  metadata_json jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  completed_at timestamptz null,
  terminal_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_execution_attempts_status_ck
    check (status in (
      'draft',
      'blocked',
      'ready',
      'started',
      'completed',
      'completed_with_limitations',
      'failed',
      'retry_required',
      'superseded',
      'cancelled'
    )),
  constraint gnr8_single_site_improvement_execution_attempts_mode_ck
    check (execution_mode in ('dry_run', 'execute', 'replay', 'repair')),
  constraint gnr8_single_site_improvement_execution_attempts_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_execution_attempts_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_execution_attempts_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_execution_attempts_json_shape_ck
    check (
      jsonb_typeof(selected_recommendation_refs_json) = 'array'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(readiness_json) = 'object'
      and jsonb_typeof(validation_summary_json) = 'object'
      and jsonb_typeof(output_refs_json) = 'object'
      and jsonb_typeof(failure_json) = 'object'
      and jsonb_typeof(audit_refs_json) = 'object'
      and jsonb_typeof(non_approval_boundary_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_execution_attempts_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(proposal_plan_semantic_watermark)) > 0
      and length(btrim(implementation_authorization_request_id)) > 0
      and length(btrim(implementation_authorization_decision_id)) > 0
      and length(btrim(clone_site_version_ref)) > 0
      and length(btrim(clone_runtime_artifact_ref)) > 0
      and length(btrim(semantic_input_watermark)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_execution_attempts_version_ck
    check (proposal_plan_version >= 1),
  constraint gnr8_single_site_improvement_execution_attempts_watermark_ck
    check (
      (semantic_output_watermark is null or length(btrim(semantic_output_watermark)) > 0)
      and (payload_hash is null or length(payload_hash) between 16 and 128)
    ),
  constraint gnr8_single_site_improvement_execution_attempts_output_boundary_ck
    check (
      status not in ('completed', 'completed_with_limitations')
      or output_refs_json <> '{}'::jsonb
      or coalesce((metadata_json->>'futureBoundaryFixture')::boolean, false)
    ),
  constraint gnr8_single_site_improvement_execution_attempts_non_approval_ck
    check (
      content_approval_granted = false
      and client_approval_granted = false
      and launch_approval_granted = false
      and publish_activation_approval_granted = false
    )
);

create unique index if not exists idx_gnr8_single_site_improvement_execution_attempts_semantic
  on public.gnr8_single_site_improvement_execution_attempts (
    migration_id,
    proposal_plan_id,
    implementation_authorization_decision_id,
    semantic_input_watermark,
    coalesce(supersedes_attempt_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists idx_gnr8_single_site_improvement_execution_attempts_latest
  on public.gnr8_single_site_improvement_execution_attempts (migration_id, updated_at desc, created_at desc);

create table if not exists public.gnr8_single_site_improvement_execution_refs (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  ref_role text not null,
  ref_type text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_record_id text not null,
  source_version text null,
  source_watermark text null,
  semantic_watermark text null,
  content_hash text null,
  media_type text null,
  captured_at timestamptz null,
  fresh_until timestamptz null,
  evidence_only boolean not null default true,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  correlation_id text not null,
  idempotency_key text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_execution_refs_role_ck
    check (ref_role in (
      'proposal_plan',
      'proposal_approval_request',
      'proposal_approval_decision',
      'proposal_evidence_package',
      'implementation_authorization_request',
      'implementation_authorization_decision',
      'implementation_authorization_evidence_package',
      'aaf_execution_validation_result',
      'aaf_execution_validation_evidence',
      'clone_review',
      'clone_site_version',
      'clone_runtime_artifact',
      'source_evidence_review',
      'selected_recommendation',
      'limitation',
      'input_ref',
      'output_ref',
      'validation_ref',
      'audit_event',
      'supersession',
      'external_reference'
    )),
  constraint gnr8_single_site_improvement_execution_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_execution_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_execution_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_improvement_execution_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create unique index if not exists idx_gnr8_single_site_improvement_execution_refs_semantic
  on public.gnr8_single_site_improvement_execution_refs (
    attempt_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_version, ''),
    coalesce(semantic_watermark, '')
  );

create table if not exists public.gnr8_single_site_improvement_execution_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  item_type text not null,
  item_key text not null,
  recommendation_id uuid null references public.gnr8_single_site_improvement_proposal_recommendations(id) on delete restrict,
  status text not null default 'open',
  details_json jsonb not null default '{}'::jsonb,
  refs_json jsonb not null default '[]'::jsonb,
  limitation_json jsonb not null default '{}'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  error_json jsonb not null default '{}'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  semantic_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, item_type, item_key),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_execution_items_type_ck
    check (item_type in (
      'selected_recommendation',
      'limitation',
      'input_ref',
      'output_ref',
      'validation_ref',
      'warning',
      'error',
      'manual_note'
    )),
  constraint gnr8_single_site_improvement_execution_items_status_ck
    check (status in ('open', 'resolved', 'accepted_limitation', 'blocked', 'failed', 'superseded')),
  constraint gnr8_single_site_improvement_execution_items_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_execution_items_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_execution_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_execution_items_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(refs_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(error_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_execution_items_nonempty_text_ck
    check (
      length(btrim(item_key)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create table if not exists public.gnr8_single_site_improvement_execution_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
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
  validation_summary_json jsonb not null default '{}'::jsonb,
  output_refs_json jsonb not null default '{}'::jsonb,
  failure_json jsonb not null default '{}'::jsonb,
  source_watermark text null,
  semantic_watermark text null,
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
  unique (attempt_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_execution_events_action_ck
    check (event_action in (
      'created',
      'proposal_refs_attached',
      'implementation_authorization_refs_attached',
      'aaf_execution_validation_attached',
      'clone_source_refs_attached',
      'selected_recommendation_attached',
      'limitation_attached',
      'blocked',
      'ready',
      'started',
      'completed',
      'completed_with_limitations',
      'failed',
      'retry_required',
      'cancelled',
      'superseded'
    )),
  constraint gnr8_single_site_improvement_execution_events_status_ck
    check (
      (from_status is null or from_status in (
        'draft',
        'blocked',
        'ready',
        'started',
        'completed',
        'completed_with_limitations',
        'failed',
        'retry_required',
        'superseded',
        'cancelled'
      ))
      and (to_status is null or to_status in (
        'draft',
        'blocked',
        'ready',
        'started',
        'completed',
        'completed_with_limitations',
        'failed',
        'retry_required',
        'superseded',
        'cancelled'
      ))
    ),
  constraint gnr8_single_site_improvement_execution_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_execution_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_execution_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_execution_events_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(validation_summary_json) = 'object'
      and jsonb_typeof(output_refs_json) = 'object'
      and jsonb_typeof(failure_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_execution_events_nonempty_text_ck
    check (
      length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

alter table public.gnr8_single_site_improvement_execution_attempts enable row level security;
alter table public.gnr8_single_site_improvement_execution_refs enable row level security;
alter table public.gnr8_single_site_improvement_execution_items enable row level security;
alter table public.gnr8_single_site_improvement_execution_events enable row level security;

drop trigger if exists trg_gnr8_single_site_improvement_execution_refs_append_only
  on public.gnr8_single_site_improvement_execution_refs;
create trigger trg_gnr8_single_site_improvement_execution_refs_append_only
  before update or delete on public.gnr8_single_site_improvement_execution_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_improvement_execution_events_append_only
  on public.gnr8_single_site_improvement_execution_events;
create trigger trg_gnr8_single_site_improvement_execution_events_append_only
  before update or delete on public.gnr8_single_site_improvement_execution_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
