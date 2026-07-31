-- GNR8 Single-Site Improved Version Review Core
-- Additive canonical storage for operator review/acceptance of improved
-- candidate runtime versions. This migration does not approve content,
-- client launch, publish activation, domains/DNS, billing, providers, AI,
-- public runtime exposure, or active pointer changes.

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

alter table public.gnr8_single_site_migration_state_events
  drop constraint if exists gnr8_single_site_migration_state_events_state_ck;

alter table public.gnr8_single_site_migration_state_events
  add constraint gnr8_single_site_migration_state_events_state_ck
    check (
      (from_state is null or from_state in (
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
        'improved_version_review_required',
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
      ))
      and to_state in (
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
      'improved_version_review_required',
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
    ));

alter table public.gnr8_single_site_migrations
  drop constraint if exists gnr8_single_site_migrations_state_ck;

alter table public.gnr8_single_site_migrations
  add constraint gnr8_single_site_migrations_state_ck
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
      'improved_version_review_required',
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
    ));

alter table public.gnr8_single_site_migrations
  drop constraint if exists gnr8_single_site_migrations_state_stage_ck;

alter table public.gnr8_single_site_migrations
  add constraint gnr8_single_site_migrations_state_stage_ck
    check (
      (current_stage = 'intake' and current_state in ('site_candidate_created'))
      or (current_stage = 'source_capture' and current_state in ('source_capture_started', 'source_capture_completed', 'source_capture_failed'))
      or (current_stage = 'source_evidence_review' and current_state in ('source_evidence_review_required'))
      or (current_stage = 'clone' and current_state in ('clone_generation_started', 'clone_generation_completed', 'clone_review_required', 'clone_revision_required'))
      or (current_stage = 'proposal' and current_state in ('improvement_proposal_started', 'improvement_proposal_ready', 'improvement_proposal_approved', 'improvement_proposal_rejected'))
      or (current_stage = 'improvement_content' and current_state in ('improvement_implementation_started', 'improvement_implementation_completed', 'improved_version_review_required', 'improved_preview_ready', 'content_review_required', 'content_approved'))
      or (current_stage = 'domain_commercial_readiness' and current_state in ('domain_readiness_required', 'domain_readiness_ready', 'subscription_required', 'subscription_created', 'hosting_entitlement_ready'))
      or (current_stage = 'launch_publish_recovery' and current_state in ('launch_approval_required', 'publish_ready', 'published', 'rollback_available'))
      or (current_stage = 'terminal' and current_state in ('migration_closed_out', 'migration_failed', 'migration_cancelled'))
    );

create table if not exists public.gnr8_single_site_improved_version_reviews (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  client_id uuid not null,
  site_id uuid not null,
  proposal_plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  proposal_approval_decision_id text not null,
  implementation_authorization_decision_id text not null,
  execution_attempt_id uuid not null references public.gnr8_single_site_improvement_execution_attempts(id) on delete restrict,
  improved_candidate_site_version_ref text not null,
  improved_runtime_artifact_ref text not null,
  clone_site_version_ref text not null,
  clone_runtime_artifact_ref text not null,
  source_evidence_review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  review_status text not null default 'draft',
  review_decision text null,
  content_approval_ready boolean not null default false,
  accepted_with_limitations boolean not null default false,
  retry_required boolean not null default false,
  proposal_alignment_summary_json jsonb not null default '{}'::jsonb,
  selected_recommendation_refs_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  blockers_json jsonb not null default '[]'::jsonb,
  diagnostics_json jsonb not null default '{}'::jsonb,
  non_approval_boundary_json jsonb not null default jsonb_build_object(
    'contentApproval', false,
    'clientApproval', false,
    'launchApproval', false,
    'publishActivationApproval', false,
    'activePointerChanged', false,
    'runtimeMutationPerformedByReview', false
  ),
  content_approval_granted boolean not null default false,
  client_approval_granted boolean not null default false,
  launch_approval_granted boolean not null default false,
  publish_activation_approval_granted boolean not null default false,
  active_pointer_changed boolean not null default false,
  runtime_artifacts_mutated boolean not null default false,
  site_versions_mutated boolean not null default false,
  reviewer_actor_type text null,
  reviewer_actor_id text null,
  reviewer_actor_role text null,
  reviewer_actor_display_label text null,
  review_started_at timestamptz null,
  reviewed_at timestamptz null,
  supersedes_review_id uuid null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
  superseded_by_review_id uuid null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
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
  constraint gnr8_single_site_improved_version_reviews_status_ck
    check (review_status in (
      'draft',
      'ready_for_review',
      'in_review',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'superseded',
      'cancelled'
    )),
  constraint gnr8_single_site_improved_version_reviews_decision_ck
    check (review_decision is null or review_decision in (
      'accept',
      'accept_with_limitations',
      'retry_improvement',
      'reject_improved_version',
      'supersede',
      'cancel'
    )),
  constraint gnr8_single_site_improved_version_reviews_decision_required_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected', 'superseded', 'cancelled')
      or review_decision is not null
    ),
  constraint gnr8_single_site_improved_version_reviews_readiness_ck
    check (content_approval_ready = false or review_status in ('accepted', 'accepted_with_limitations')),
  constraint gnr8_single_site_improved_version_reviews_limited_ck
    check (
      accepted_with_limitations = false
      or (review_status = 'accepted_with_limitations' and jsonb_array_length(limitations_json) > 0)
    ),
  constraint gnr8_single_site_improved_version_reviews_reviewer_ck
    check (
      review_status not in ('accepted', 'accepted_with_limitations', 'retry_required', 'rejected', 'superseded', 'cancelled')
      or (reviewer_actor_type is not null and reviewer_actor_id is not null and reviewer_actor_role is not null and reviewed_at is not null)
    ),
  constraint gnr8_single_site_improved_version_reviews_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improved_version_reviews_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improved_version_reviews_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improved_version_reviews_json_shape_ck
    check (
      jsonb_typeof(proposal_alignment_summary_json) = 'object'
      and jsonb_typeof(selected_recommendation_refs_json) = 'array'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(diagnostics_json) = 'object'
      and jsonb_typeof(non_approval_boundary_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improved_version_reviews_nonempty_text_ck
    check (
      length(btrim(proposal_approval_decision_id)) > 0
      and length(btrim(implementation_authorization_decision_id)) > 0
      and length(btrim(improved_candidate_site_version_ref)) > 0
      and length(btrim(improved_runtime_artifact_ref)) > 0
      and length(btrim(clone_site_version_ref)) > 0
      and length(btrim(clone_runtime_artifact_ref)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improved_version_reviews_non_approval_ck
    check (
      content_approval_granted = false
      and client_approval_granted = false
      and launch_approval_granted = false
      and publish_activation_approval_granted = false
      and active_pointer_changed = false
      and runtime_artifacts_mutated = false
      and site_versions_mutated = false
    )
);

create index if not exists idx_gnr8_single_site_improved_version_reviews_latest
  on public.gnr8_single_site_improved_version_reviews (migration_id, updated_at desc, created_at desc);

create unique index if not exists idx_gnr8_single_site_improved_version_reviews_semantic
  on public.gnr8_single_site_improved_version_reviews (
    migration_id,
    execution_attempt_id,
    improved_candidate_site_version_ref,
    improved_runtime_artifact_ref,
    coalesce(supersedes_review_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.gnr8_single_site_improved_version_review_refs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
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
  constraint gnr8_single_site_improved_version_review_refs_role_ck
    check (ref_role in (
      'migration',
      'client',
      'site',
      'proposal_plan',
      'proposal_approval',
      'implementation_authorization',
      'execution_attempt',
      'improved_candidate_site_version',
      'improved_runtime_artifact',
      'clone_site_version',
      'clone_runtime_artifact',
      'selected_recommendation',
      'dry_run_planned_change_set',
      'source_evidence_review',
      'limitation',
      'evidence',
      'external_reference'
    )),
  constraint gnr8_single_site_improved_version_review_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improved_version_review_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improved_version_review_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_improved_version_review_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create unique index if not exists idx_gnr8_single_site_improved_version_review_refs_semantic
  on public.gnr8_single_site_improved_version_review_refs (
    review_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_version, ''),
    coalesce(semantic_watermark, '')
  );

create table if not exists public.gnr8_single_site_improved_version_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  item_key text not null,
  category text not null,
  severity text not null,
  status text not null default 'open',
  blocks_acceptance boolean not null default false,
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
  unique (review_id, item_key),
  unique (idempotency_key),
  constraint gnr8_single_site_improved_version_review_items_category_ck
    check (category in (
      'proposal_alignment',
      'content_accuracy',
      'visual_quality',
      'brand_consistency',
      'seo',
      'aeo',
      'accessibility',
      'performance',
      'responsive',
      'interaction',
      'technical_integrity',
      'limitation',
      'manual_note',
      'unknown_or_manual'
    )),
  constraint gnr8_single_site_improved_version_review_items_severity_ck
    check (severity in ('p0_blocker', 'p1_major', 'p2_minor', 'p3_note')),
  constraint gnr8_single_site_improved_version_review_items_status_ck
    check (status in ('open', 'resolved', 'accepted_limitation', 'superseded')),
  constraint gnr8_single_site_improved_version_review_items_blocking_ck
    check (
      blocks_acceptance = false
      or (status = 'open' and severity = 'p0_blocker' and accepted_limitation = false)
    ),
  constraint gnr8_single_site_improved_version_review_items_actor_type_ck
    check (reviewer_actor_type is null or reviewer_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improved_version_review_items_json_shape_ck
    check (
      jsonb_typeof(ref_ids_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(evidence_json) = 'object'
      and jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improved_version_review_items_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improved_version_review_items_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improved_version_review_items_nonempty_text_ck
    check (
      length(btrim(item_key)) > 0
      and length(btrim(finding_summary)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create table if not exists public.gnr8_single_site_improved_version_review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
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
  unique (review_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_improved_version_review_events_action_ck
    check (event_action in (
      'created',
      'ref_added',
      'finding_added',
      'ready_for_review',
      'review_started',
      'accepted',
      'accepted_with_limitations',
      'retry_required',
      'rejected',
      'cancelled',
      'superseded'
    )),
  constraint gnr8_single_site_improved_version_review_events_status_ck
    check (
      (from_status is null or from_status in (
        'draft',
        'ready_for_review',
        'in_review',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded',
        'cancelled'
      ))
      and (to_status is null or to_status in (
        'draft',
        'ready_for_review',
        'in_review',
        'accepted',
        'accepted_with_limitations',
        'retry_required',
        'rejected',
        'superseded',
        'cancelled'
      ))
    ),
  constraint gnr8_single_site_improved_version_review_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improved_version_review_events_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(blockers_json) = 'array'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improved_version_review_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improved_version_review_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improved_version_review_events_nonempty_text_ck
    check (
      length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create table if not exists public.gnr8_single_site_improved_version_review_supersessions (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  superseded_review_id uuid not null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
  replacement_review_id uuid null references public.gnr8_single_site_improved_version_reviews(id) on delete restrict,
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
  constraint gnr8_single_site_improved_version_review_supersessions_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improved_version_review_supersessions_json_shape_ck
    check (jsonb_typeof(source_ref_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_improved_version_review_supersessions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improved_version_review_supersessions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improved_version_review_supersessions_nonempty_text_ck
    check (
      length(btrim(supersession_reason)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

alter table public.gnr8_single_site_improved_version_reviews enable row level security;
alter table public.gnr8_single_site_improved_version_review_refs enable row level security;
alter table public.gnr8_single_site_improved_version_review_items enable row level security;
alter table public.gnr8_single_site_improved_version_review_events enable row level security;
alter table public.gnr8_single_site_improved_version_review_supersessions enable row level security;

drop trigger if exists trg_gnr8_single_site_improved_version_review_refs_append_only
  on public.gnr8_single_site_improved_version_review_refs;
create trigger trg_gnr8_single_site_improved_version_review_refs_append_only
  before update or delete on public.gnr8_single_site_improved_version_review_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_improved_version_review_events_append_only
  on public.gnr8_single_site_improved_version_review_events;
create trigger trg_gnr8_single_site_improved_version_review_events_append_only
  before update or delete on public.gnr8_single_site_improved_version_review_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_improved_version_review_supersessions_append_only
  on public.gnr8_single_site_improved_version_review_supersessions;
create trigger trg_gnr8_single_site_improved_version_review_supersessions_append_only
  before update or delete on public.gnr8_single_site_improved_version_review_supersessions
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
