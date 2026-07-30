-- GNR8 Single-Site Improvement Proposal Planning Core
-- Additive canonical storage for proposal planning after accepted clone review.
-- This migration does not implement AI generation, Generated Proposal Bundles,
-- runtime artifact/version mutation, UI, API, billing, domain/DNS, publish,
-- rollback, workers, providers, or public runtime behavior.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_single_site_improvement_proposal_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id uuid not null,
  site_id uuid not null,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  clone_review_id uuid not null references public.gnr8_single_site_clone_reviews(id) on delete restrict,
  source_evidence_review_id uuid not null references public.gnr8_single_site_source_evidence_reviews(id) on delete restrict,
  clone_site_version_ref text not null,
  runtime_artifact_ref text not null,
  plan_status text not null default 'draft',
  plan_version integer not null default 1,
  proposal_scope_json jsonb not null default '{}'::jsonb,
  title text null,
  summary text null,
  limitations_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  operator_notes_json jsonb not null default '[]'::jsonb,
  decision_summary_json jsonb not null default '{}'::jsonb,
  approval_refs_json jsonb not null default '{}'::jsonb,
  implementation_authorization_refs_json jsonb not null default '{}'::jsonb,
  implementation_authorization_attached boolean not null default false,
  supersedes_plan_id uuid null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  superseded_by_plan_id uuid null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
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
  semantic_watermark text null,
  payload_hash text null,
  metadata_json jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_proposal_plans_status_ck
    check (plan_status in (
      'not_started',
      'planning_required',
      'draft',
      'ready_for_review',
      'in_review',
      'changes_requested',
      'approved',
      'approved_with_limitations',
      'rejected',
      'superseded',
      'cancelled'
    )),
  constraint gnr8_single_site_improvement_proposal_plans_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_proposal_plans_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_plans_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_plans_json_shape_ck
    check (
      jsonb_typeof(proposal_scope_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(operator_notes_json) = 'array'
      and jsonb_typeof(decision_summary_json) = 'object'
      and jsonb_typeof(approval_refs_json) = 'object'
      and jsonb_typeof(implementation_authorization_refs_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_proposal_plans_approval_boundary_ck
    check (
      implementation_authorization_attached = false
      or plan_status in ('approved', 'approved_with_limitations')
    ),
  constraint gnr8_single_site_improvement_proposal_plans_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(clone_site_version_ref)) > 0
      and length(btrim(runtime_artifact_ref)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_plans_counter_ck
    check (plan_version >= 1),
  constraint gnr8_single_site_improvement_proposal_plans_watermark_ck
    check (semantic_watermark is null or length(btrim(semantic_watermark)) > 0),
  constraint gnr8_single_site_improvement_proposal_plans_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

create unique index if not exists idx_gnr8_single_site_improvement_proposal_plans_semantic
  on public.gnr8_single_site_improvement_proposal_plans (
    migration_id,
    clone_review_id,
    clone_site_version_ref,
    runtime_artifact_ref,
    coalesce(supersedes_plan_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists idx_gnr8_single_site_improvement_proposal_plans_latest
  on public.gnr8_single_site_improvement_proposal_plans (migration_id, updated_at desc, created_at desc);

create table if not exists public.gnr8_single_site_improvement_proposal_refs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
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
  constraint gnr8_single_site_improvement_proposal_refs_role_ck
    check (ref_role in (
      'clone_review',
      'clone_review_fidelity_finding',
      'runtime_site_version_clone',
      'runtime_artifact_clone',
      'source_evidence_review',
      'source_evidence_ref',
      'source_capture_ref',
      'business_context_ref',
      'website_understanding_ref',
      'visual_continuity_ref',
      'generated_proposal_artifact_ref',
      'generated_proposal_bundle_ref',
      'ai_provider_input_ref',
      'ai_provider_output_ref',
      'operator_note_ref',
      'proposal_approval_request',
      'proposal_approval_decision',
      'proposal_evidence_package',
      'implementation_authorization_request',
      'implementation_authorization_decision',
      'content_approval_ref',
      'launch_approval_ref',
      'external_reference'
    )),
  constraint gnr8_single_site_improvement_proposal_refs_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_refs_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_improvement_proposal_refs_content_hash_ck
    check (content_hash is null or length(content_hash) between 16 and 128),
  constraint gnr8_single_site_improvement_proposal_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(ref_type)) > 0
      and length(btrim(source_system)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_refs_watermark_ck
    check (
      (source_watermark is null or length(btrim(source_watermark)) > 0)
      and (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
    )
);

create unique index if not exists idx_gnr8_single_site_improvement_proposal_refs_semantic
  on public.gnr8_single_site_improvement_proposal_refs (
    plan_id,
    ref_role,
    source_system,
    coalesce(source_table, ''),
    source_record_id,
    coalesce(source_version, ''),
    coalesce(semantic_watermark, '')
  );

create table if not exists public.gnr8_single_site_improvement_proposal_recommendations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  recommendation_key text not null,
  title text not null,
  target_scope text not null default 'site',
  target_refs_json jsonb not null default '[]'::jsonb,
  category text not null,
  risk text not null default 'unknown',
  impact text not null default 'unknown',
  effort text not null default 'unknown',
  confidence text not null default 'medium',
  priority text not null default 'p2',
  rationale text not null,
  expected_outcome text null,
  implementation_notes text null,
  exclusions_json jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '[]'::jsonb,
  linked_finding_ids_json jsonb not null default '[]'::jsonb,
  source_ref_ids_json jsonb not null default '[]'::jsonb,
  advisory_ref_ids_json jsonb not null default '[]'::jsonb,
  recommendation_status text not null default 'draft',
  implementation_authorization_status text not null default 'not_requested',
  blocks_proposal_approval boolean not null default false,
  limitation_accepted boolean not null default false,
  decision_json jsonb not null default '{}'::jsonb,
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
  unique (plan_id, recommendation_key),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_proposal_recommendations_category_ck
    check (category in (
      'content_clarity',
      'visual_design',
      'brand_consistency',
      'conversion',
      'seo',
      'aeo',
      'accessibility',
      'performance',
      'mobile_responsive',
      'information_architecture',
      'trust_credibility',
      'forms_and_leads',
      'analytics_measurement',
      'technical_cleanup',
      'legal_or_compliance',
      'unknown_or_manual'
    )),
  constraint gnr8_single_site_improvement_proposal_recommendations_risk_ck
    check (risk in ('low', 'medium', 'high', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_recommendations_impact_ck
    check (impact in ('low', 'medium', 'high', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_recommendations_effort_ck
    check (effort in ('small', 'medium', 'large', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_recommendations_confidence_ck
    check (confidence in ('low', 'medium', 'high')),
  constraint gnr8_single_site_improvement_proposal_recommendations_priority_ck
    check (priority in ('p0', 'p1', 'p2', 'p3')),
  constraint gnr8_single_site_improvement_proposal_recommendations_target_scope_ck
    check (target_scope in ('site', 'page', 'section', 'component', 'content_slot', 'metadata', 'asset', 'form', 'analytics', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_recommendations_status_ck
    check (recommendation_status in ('draft', 'ready_for_review', 'changes_requested', 'approved', 'approved_with_limitations', 'rejected', 'deferred', 'superseded')),
  constraint gnr8_single_site_improvement_proposal_recommendations_auth_status_ck
    check (implementation_authorization_status in ('not_requested', 'requested', 'authorized', 'authorized_with_limitations', 'rejected', 'expired', 'superseded')),
  constraint gnr8_single_site_improvement_proposal_recommendations_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_proposal_recommendations_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_recommendations_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_recommendations_json_shape_ck
    check (
      jsonb_typeof(target_refs_json) = 'array'
      and jsonb_typeof(exclusions_json) = 'array'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(linked_finding_ids_json) = 'array'
      and jsonb_typeof(source_ref_ids_json) = 'array'
      and jsonb_typeof(advisory_ref_ids_json) = 'array'
      and jsonb_typeof(decision_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_proposal_recommendations_nonempty_text_ck
    check (
      length(btrim(recommendation_key)) > 0
      and length(btrim(title)) > 0
      and length(btrim(rationale)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_recommendations_watermark_ck
    check (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
);

create table if not exists public.gnr8_single_site_improvement_proposal_findings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  finding_key text not null,
  category text not null,
  risk text not null default 'unknown',
  impact text not null default 'unknown',
  summary text not null,
  evidence_confidence text not null default 'medium',
  finding_status text not null default 'open',
  blocks_proposal_approval boolean not null default false,
  accepted_limitation boolean not null default false,
  source_ref_ids_json jsonb not null default '[]'::jsonb,
  clone_fidelity_ref_ids_json jsonb not null default '[]'::jsonb,
  recommendation_ids_json jsonb not null default '[]'::jsonb,
  limitation_json jsonb not null default '{}'::jsonb,
  decision_json jsonb not null default '{}'::jsonb,
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
  unique (plan_id, finding_key),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_proposal_findings_category_ck
    check (category in (
      'content_clarity',
      'visual_design',
      'brand_consistency',
      'conversion',
      'seo',
      'aeo',
      'accessibility',
      'performance',
      'mobile_responsive',
      'information_architecture',
      'trust_credibility',
      'forms_and_leads',
      'analytics_measurement',
      'technical_cleanup',
      'legal_or_compliance',
      'unknown_or_manual'
    )),
  constraint gnr8_single_site_improvement_proposal_findings_risk_ck
    check (risk in ('low', 'medium', 'high', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_findings_impact_ck
    check (impact in ('low', 'medium', 'high', 'unknown')),
  constraint gnr8_single_site_improvement_proposal_findings_confidence_ck
    check (evidence_confidence in ('low', 'medium', 'high')),
  constraint gnr8_single_site_improvement_proposal_findings_status_ck
    check (finding_status in ('open', 'resolved_by_recommendation', 'accepted_limitation', 'deferred', 'superseded')),
  constraint gnr8_single_site_improvement_proposal_findings_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_proposal_findings_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_findings_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_findings_json_shape_ck
    check (
      jsonb_typeof(source_ref_ids_json) = 'array'
      and jsonb_typeof(clone_fidelity_ref_ids_json) = 'array'
      and jsonb_typeof(recommendation_ids_json) = 'array'
      and jsonb_typeof(limitation_json) = 'object'
      and jsonb_typeof(decision_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_proposal_findings_nonempty_text_ck
    check (
      length(btrim(finding_key)) > 0
      and length(btrim(summary)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_findings_watermark_ck
    check (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
);

create table if not exists public.gnr8_single_site_improvement_proposal_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
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
  approval_refs_json jsonb not null default '{}'::jsonb,
  implementation_authorization_refs_json jsonb not null default '{}'::jsonb,
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
  unique (plan_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_improvement_proposal_events_action_ck
    check (event_action in (
      'created',
      'recommendation_added',
      'finding_added',
      'ready_for_review',
      'review_started',
      'changes_requested',
      'approved',
      'approved_with_limitations',
      'rejected',
      'superseded',
      'cancelled',
      'implementation_authorization_attached'
    )),
  constraint gnr8_single_site_improvement_proposal_events_status_ck
    check (
      (from_status is null or from_status in (
        'not_started',
        'planning_required',
        'draft',
        'ready_for_review',
        'in_review',
        'changes_requested',
        'approved',
        'approved_with_limitations',
        'rejected',
        'superseded',
        'cancelled'
      ))
      and (to_status is null or to_status in (
        'not_started',
        'planning_required',
        'draft',
        'ready_for_review',
        'in_review',
        'changes_requested',
        'approved',
        'approved_with_limitations',
        'rejected',
        'superseded',
        'cancelled'
      ))
    ),
  constraint gnr8_single_site_improvement_proposal_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_proposal_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_events_json_shape_ck
    check (
      jsonb_typeof(details_json) = 'object'
      and jsonb_typeof(limitations_json) = 'array'
      and jsonb_typeof(warnings_json) = 'array'
      and jsonb_typeof(approval_refs_json) = 'object'
      and jsonb_typeof(implementation_authorization_refs_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_single_site_improvement_proposal_events_nonempty_text_ck
    check (
      length(btrim(event_action)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_events_watermark_ck
    check (
      (source_watermark is null or length(btrim(source_watermark)) > 0)
      and (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
    ),
  constraint gnr8_single_site_improvement_proposal_events_payload_hash_ck
    check (payload_hash is null or length(payload_hash) between 16 and 128)
);

create table if not exists public.gnr8_single_site_improvement_proposal_supersessions (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  superseded_plan_id uuid not null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
  replacement_plan_id uuid null references public.gnr8_single_site_improvement_proposal_plans(id) on delete restrict,
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
  constraint gnr8_single_site_improvement_proposal_supersessions_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_improvement_proposal_supersessions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_improvement_proposal_supersessions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_improvement_proposal_supersessions_json_shape_ck
    check (jsonb_typeof(source_ref_json) = 'object' and jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_improvement_proposal_supersessions_nonempty_text_ck
    check (
      length(btrim(supersession_reason)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    ),
  constraint gnr8_single_site_improvement_proposal_supersessions_watermark_ck
    check (semantic_watermark is null or length(btrim(semantic_watermark)) > 0)
);

alter table public.gnr8_single_site_improvement_proposal_plans enable row level security;
alter table public.gnr8_single_site_improvement_proposal_refs enable row level security;
alter table public.gnr8_single_site_improvement_proposal_recommendations enable row level security;
alter table public.gnr8_single_site_improvement_proposal_findings enable row level security;
alter table public.gnr8_single_site_improvement_proposal_events enable row level security;
alter table public.gnr8_single_site_improvement_proposal_supersessions enable row level security;

drop trigger if exists trg_gnr8_single_site_improvement_proposal_refs_append_only
  on public.gnr8_single_site_improvement_proposal_refs;
create trigger trg_gnr8_single_site_improvement_proposal_refs_append_only
  before update or delete on public.gnr8_single_site_improvement_proposal_refs
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_improvement_proposal_events_append_only
  on public.gnr8_single_site_improvement_proposal_events;
create trigger trg_gnr8_single_site_improvement_proposal_events_append_only
  before update or delete on public.gnr8_single_site_improvement_proposal_events
  for each row execute function public.gnr8_single_site_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_improvement_proposal_supersessions_append_only
  on public.gnr8_single_site_improvement_proposal_supersessions;
create trigger trg_gnr8_single_site_improvement_proposal_supersessions_append_only
  before update or delete on public.gnr8_single_site_improvement_proposal_supersessions
  for each row execute function public.gnr8_single_site_prevent_update_delete();

commit;
