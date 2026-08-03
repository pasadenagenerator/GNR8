-- GNR8 Single-Site Launch Approval Core
-- Additive canonical workflow storage for internal launch readiness approval.
-- This migration does not perform domain/DNS readiness execution, billing or
-- hosting activation, publish activation, runtime artifact mutation, site
-- version mutation, active pointer mutation, provider calls, or public runtime
-- exposure.

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
      'improved_version_review',
      'content_approval',
      'client_approval',
      'launch_approval',
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

create table if not exists public.gnr8_single_site_launch_approvals (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  client_id uuid not null,
  site_id uuid not null,
  content_approval_id uuid not null references public.gnr8_single_site_content_approvals(id) on delete restrict,
  content_approval_status text not null,
  aaf_content_approval_decision_id text not null,
  require_client_approval boolean not null default false,
  client_approval_id uuid null references public.gnr8_single_site_client_approvals(id) on delete restrict,
  client_approval_status text null,
  aaf_client_approval_decision_id text null,
  improved_version_review_id uuid not null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
  improved_version_review_status text not null,
  improved_candidate_site_version_ref text not null,
  improved_runtime_artifact_ref text not null,
  proposal_plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  proposal_approval_decision_id text not null,
  implementation_authorization_decision_id text not null,
  execution_attempt_id uuid not null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  selected_recommendation_refs_json jsonb not null default '[]'::jsonb,
  domain_readiness_ref text null,
  billing_hosting_entitlement_ref text null,
  rollback_readiness_ref text null,
  publish_target_ref text null,
  status text not null default 'draft',
  decision text null,
  readiness_work_ready boolean not null default false,
  approved_with_limitations boolean not null default false,
  launch_revision_required boolean not null default false,
  aaf_launch_approval_request_id text null,
  aaf_launch_approval_decision_id text null,
  aaf_launch_approval_scope text null,
  aaf_launch_approval_action text null,
  aaf_launch_approval_subject_type text null,
  evidence_package_refs_json jsonb not null default '[]'::jsonb,
  launch_checklist_refs_json jsonb not null default '[]'::jsonb,
  blocker_refs_json jsonb not null default '[]'::jsonb,
  smoke_qa_refs_json jsonb not null default '[]'::jsonb,
  reviewer_identity_refs_json jsonb not null default '[]'::jsonb,
  reviewer_representative_refs_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  operator_notes_json jsonb not null default '[]'::jsonb,
  findings_summary_json jsonb not null default '{}'::jsonb,
  decision_summary_json jsonb not null default '{}'::jsonb,
  non_approval_boundary_json jsonb not null default jsonb_build_object(
    'domainReadinessGranted', false,
    'billingHostingReadinessGranted', false,
    'publishActivationApprovalGranted', false,
    'activePointerChanged', false,
    'runtimeMutationPerformedByLaunchApproval', false
  ),
  launch_approval_granted boolean not null default false,
  publish_activation_approval_granted boolean not null default false,
  publish_readiness_not_granted boolean not null default true,
  active_pointer_changed boolean not null default false,
  runtime_artifacts_mutated boolean not null default false,
  site_versions_mutated boolean not null default false,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_role text null,
  reviewer_actor_display_label text null,
  review_started_at timestamptz null,
  decided_at timestamptz null,
  supersedes_launch_approval_id uuid null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
  superseded_by_launch_approval_id uuid null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
  revision_ref text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  request_id text null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  semantic_watermark text null,
  payload_hash text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_approvals_status_ck
    check (status in (
      'not_required_yet',
      'required',
      'draft',
      'ready_for_review',
      'in_review',
      'blocked',
      'approved',
      'approved_with_limitations',
      'rejected',
      'superseded',
      'cancelled'
    )),
  constraint gnr8_single_site_launch_approvals_decision_ck
    check (decision is null or decision in ('approve', 'approve_with_limitations', 'block', 'reject', 'supersede', 'cancel')),
  constraint gnr8_single_site_launch_approvals_decision_required_ck
    check (status not in ('blocked', 'approved', 'approved_with_limitations', 'rejected', 'superseded', 'cancelled') or decision is not null),
  constraint gnr8_single_site_launch_approvals_content_status_ck
    check (content_approval_status in ('approved', 'approved_with_limitations')),
  constraint gnr8_single_site_launch_approvals_client_status_ck
    check (
      (require_client_approval = false and client_approval_id is null and client_approval_status is null and aaf_client_approval_decision_id is null)
      or (require_client_approval = true and client_approval_id is not null and client_approval_status in ('approved', 'approved_with_limitations') and aaf_client_approval_decision_id is not null)
    ),
  constraint gnr8_single_site_launch_approvals_review_status_ck
    check (improved_version_review_status in ('accepted', 'accepted_with_limitations')),
  constraint gnr8_single_site_launch_approvals_aaf_decision_required_ck
    check (status not in ('approved', 'approved_with_limitations') or aaf_launch_approval_decision_id is not null),
  constraint gnr8_single_site_launch_approvals_readiness_refs_required_ck
    check (
      status not in ('approved', 'approved_with_limitations')
      or (
        domain_readiness_ref is not null
        and billing_hosting_entitlement_ref is not null
        and rollback_readiness_ref is not null
        and publish_target_ref is not null
      )
    ),
  constraint gnr8_single_site_launch_approvals_ready_ck
    check (readiness_work_ready = false or status in ('approved', 'approved_with_limitations')),
  constraint gnr8_single_site_launch_approvals_limited_ck
    check (approved_with_limitations = false or (status = 'approved_with_limitations' and jsonb_array_length(limitations_json) > 0)),
  constraint gnr8_single_site_launch_approvals_aaf_scope_ck
    check (
      (aaf_launch_approval_scope is null or aaf_launch_approval_scope = 'single_site_launch_approval')
      and (aaf_launch_approval_action is null or aaf_launch_approval_action = 'approve_single_site_launch_readiness')
      and (aaf_launch_approval_subject_type is null or aaf_launch_approval_subject_type = 'single_site_launch_readiness_review')
    ),
  constraint gnr8_single_site_launch_approvals_reviewer_ck
    check (
      status not in ('blocked', 'approved', 'approved_with_limitations', 'rejected', 'superseded', 'cancelled')
      or (reviewer_actor_type is not null and reviewer_actor_id is not null and reviewer_actor_role is not null and decided_at is not null)
    ),
  constraint gnr8_single_site_launch_approvals_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_approvals_json_shape_ck
    check (
      jsonb_typeof(selected_recommendation_refs_json) = 'array'
      and jsonb_typeof(evidence_package_refs_json) = 'array'
      and jsonb_typeof(launch_checklist_refs_json) = 'array'
      and jsonb_typeof(blocker_refs_json) = 'array'
      and jsonb_typeof(smoke_qa_refs_json) = 'array'
      and jsonb_typeof(reviewer_identity_refs_json) = 'array'
      and jsonb_typeof(reviewer_representative_refs_json) = 'array'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(operator_notes_json) = 'array'
      and jsonb_typeof(findings_summary_json) = 'object'
      and jsonb_typeof(decision_summary_json) = 'object'
      and jsonb_typeof(non_approval_boundary_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_approvals_privacy_ck
    check (privacy_label in ('public_operational', 'internal_operational', 'client_confidential', 'credential_sensitive', 'billing_sensitive', 'provider_sensitive', 'legal_sensitive')),
  constraint gnr8_single_site_launch_approvals_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_approvals_nonempty_text_ck
    check (
      length(btrim(improved_candidate_site_version_ref)) > 0
      and length(btrim(improved_runtime_artifact_ref)) > 0
      and length(btrim(aaf_content_approval_decision_id)) > 0
      and length(btrim(proposal_approval_decision_id)) > 0
      and length(btrim(implementation_authorization_decision_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_launch_approvals_non_runtime_ck
    check (
      publish_activation_approval_granted = false
      and publish_readiness_not_granted = true
      and active_pointer_changed = false
      and runtime_artifacts_mutated = false
      and site_versions_mutated = false
    )
);

create index if not exists idx_gnr8_single_site_launch_approvals_latest
  on public.gnr8_single_site_launch_approvals (migration_id, updated_at desc, created_at desc);

create unique index if not exists idx_gnr8_single_site_launch_approvals_semantic
  on public.gnr8_single_site_launch_approvals (
    migration_id,
    content_approval_id,
    coalesce(client_approval_id, '00000000-0000-0000-0000-000000000000'::uuid),
    improved_version_review_id,
    improved_candidate_site_version_ref,
    improved_runtime_artifact_ref,
    coalesce(supersedes_launch_approval_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.gnr8_single_site_launch_approval_refs (
  id uuid primary key default gen_random_uuid(),
  launch_approval_id uuid not null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
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
  constraint gnr8_single_site_launch_approval_refs_role_ck
    check (ref_role in (
      'migration',
      'client',
      'site',
      'content_approval',
      'aaf_content_approval_decision',
      'client_approval',
      'aaf_client_approval_decision',
      'improved_version_review',
      'improved_candidate_site_version',
      'improved_runtime_artifact',
      'proposal_plan',
      'proposal_approval',
      'implementation_authorization',
      'execution_attempt',
      'selected_recommendation',
      'domain_readiness_placeholder',
      'billing_hosting_entitlement_placeholder',
      'rollback_readiness_placeholder',
      'publish_target_placeholder',
      'launch_checklist',
      'blocker',
      'smoke_qa',
      'reviewer_identity',
      'reviewer_representative_role',
      'aaf_launch_approval_request',
      'aaf_launch_approval_decision',
      'evidence_package',
      'limitation',
      'operator_note',
      'external_reference'
    )),
  constraint gnr8_single_site_launch_approval_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_launch_approval_refs_privacy_ck
    check (privacy_label in ('public_operational', 'internal_operational', 'client_confidential', 'credential_sensitive', 'billing_sensitive', 'provider_sensitive', 'legal_sensitive')),
  constraint gnr8_single_site_launch_approval_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_approval_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create unique index if not exists idx_gnr8_single_site_launch_approval_refs_semantic
  on public.gnr8_single_site_launch_approval_refs (
    launch_approval_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_version, ''),
    coalesce(semantic_watermark, '')
  );

create table if not exists public.gnr8_single_site_launch_approval_items (
  id uuid primary key default gen_random_uuid(),
  launch_approval_id uuid not null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  item_key text not null,
  category text not null,
  severity text not null,
  status text not null default 'open',
  blocks_approval boolean not null default false,
  accepted_limitation boolean not null default false,
  required_recommendation_applied boolean null,
  recommendation_id uuid null references public.gnr8_single_site_improvement_proposal_recommendations(id) on delete restrict,
  finding_summary text not null,
  ref_ids_json jsonb not null default '[]'::jsonb,
  limitation_json jsonb not null default '{}'::jsonb,
  evidence_json jsonb not null default '{}'::jsonb,
  details_json jsonb not null default '{}'::jsonb,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_display_label text null,
  correlation_id text not null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  semantic_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (launch_approval_id, item_key),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_approval_items_category_ck
    check (category in ('content_ready', 'client_ready', 'domain_ready', 'billing_ready', 'rollback_ready', 'qa_ready', 'seo_ready', 'accessibility_ready', 'performance_ready', 'limitation', 'manual_note', 'unknown_or_manual')),
  constraint gnr8_single_site_launch_approval_items_severity_ck
    check (severity in ('p0_blocker', 'p1_major', 'p2_minor', 'p3_note')),
  constraint gnr8_single_site_launch_approval_items_status_ck
    check (status in ('open', 'resolved', 'accepted_limitation', 'superseded')),
  constraint gnr8_single_site_launch_approval_items_blocking_ck
    check (blocks_approval = false or (status = 'open' and severity = 'p0_blocker' and accepted_limitation = false)),
  constraint gnr8_single_site_launch_approval_items_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_approval_items_json_shape_ck
    check (
      jsonb_typeof(ref_ids_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(evidence_json) = 'object'
      and jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_launch_approval_items_privacy_ck
    check (privacy_label in ('public_operational', 'internal_operational', 'client_confidential', 'credential_sensitive', 'billing_sensitive', 'provider_sensitive', 'legal_sensitive')),
  constraint gnr8_single_site_launch_approval_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_approval_items_nonempty_text_ck
    check (length(btrim(item_key)) > 0 and length(btrim(finding_summary)) > 0 and length(btrim(correlation_id)) > 0 and length(btrim(idempotency_key)) > 0)
);

create table if not exists public.gnr8_single_site_launch_approval_events (
  id uuid primary key default gen_random_uuid(),
  launch_approval_id uuid not null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
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
  unique (launch_approval_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_approval_events_action_ck
    check (event_action in ('created', 'ref_attached', 'item_added', 'ready_for_review', 'review_started', 'blocked', 'approved', 'approved_with_limitations', 'rejected', 'superseded', 'cancelled', 'aaf_request_attached', 'aaf_decision_attached')),
  constraint gnr8_single_site_launch_approval_events_status_ck
    check (
      (from_status is null or from_status in ('not_required_yet', 'required', 'draft', 'ready_for_review', 'in_review', 'blocked', 'approved', 'approved_with_limitations', 'rejected', 'superseded', 'cancelled'))
      and (to_status is null or to_status in ('not_required_yet', 'required', 'draft', 'ready_for_review', 'in_review', 'blocked', 'approved', 'approved_with_limitations', 'rejected', 'superseded', 'cancelled'))
    ),
  constraint gnr8_single_site_launch_approval_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_approval_events_json_shape_ck
    check (jsonb_typeof(details_json) = 'object' and jsonb_typeof(limitations_json) = 'array' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_launch_approval_events_privacy_ck
    check (privacy_label in ('public_operational', 'internal_operational', 'client_confidential', 'credential_sensitive', 'billing_sensitive', 'provider_sensitive', 'legal_sensitive')),
  constraint gnr8_single_site_launch_approval_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_approval_events_nonempty_text_ck
    check (length(btrim(event_action)) > 0 and length(btrim(actor_id)) > 0 and length(btrim(actor_role)) > 0 and length(btrim(correlation_id)) > 0 and length(btrim(idempotency_key)) > 0)
);

create table if not exists public.gnr8_single_site_launch_approval_supersessions (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  superseded_launch_approval_id uuid not null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
  replacement_launch_approval_id uuid null references public.gnr8_single_site_launch_approvals(id) on delete restrict,
  supersession_reason text not null,
  source_ref_json jsonb not null default '{}'::jsonb,
  actor_type text not null,
  actor_id text not null,
  actor_role text not null,
  actor_display_label text null,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  privacy_label text not null default 'client_confidential',
  retention_class text not null default 'compliance_long',
  semantic_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_launch_approval_supersessions_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_launch_approval_supersessions_json_shape_ck
    check (jsonb_typeof(source_ref_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_launch_approval_supersessions_privacy_ck
    check (privacy_label in ('public_operational', 'internal_operational', 'client_confidential', 'credential_sensitive', 'billing_sensitive', 'provider_sensitive', 'legal_sensitive')),
  constraint gnr8_single_site_launch_approval_supersessions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_launch_approval_supersessions_nonempty_text_ck
    check (length(btrim(supersession_reason)) > 0 and length(btrim(actor_id)) > 0 and length(btrim(actor_role)) > 0 and length(btrim(correlation_id)) > 0 and length(btrim(idempotency_key)) > 0)
);

alter table public.gnr8_single_site_launch_approvals enable row level security;
alter table public.gnr8_single_site_launch_approval_refs enable row level security;
alter table public.gnr8_single_site_launch_approval_items enable row level security;
alter table public.gnr8_single_site_launch_approval_events enable row level security;
alter table public.gnr8_single_site_launch_approval_supersessions enable row level security;

drop trigger if exists trg_gnr8_single_site_launch_approval_refs_append_only
  on public.gnr8_single_site_launch_approval_refs;
create trigger trg_gnr8_single_site_launch_approval_refs_append_only
  before update or delete on public.gnr8_single_site_launch_approval_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_launch_approval_events_append_only
  on public.gnr8_single_site_launch_approval_events;
create trigger trg_gnr8_single_site_launch_approval_events_append_only
  before update or delete on public.gnr8_single_site_launch_approval_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_launch_approval_supersessions_append_only
  on public.gnr8_single_site_launch_approval_supersessions;
create trigger trg_gnr8_single_site_launch_approval_supersessions_append_only
  before update or delete on public.gnr8_single_site_launch_approval_supersessions
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
