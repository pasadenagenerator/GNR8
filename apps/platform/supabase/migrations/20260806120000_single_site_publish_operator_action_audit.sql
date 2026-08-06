-- GNR8 Single-Site Publish Operator Action Audit
-- Durable internal audit for dry-run and shadow-publish operator attempts only.
-- This migration does not implement publish behavior, enforcement, AAF writes,
-- provider calls, client portal exposure, Ops Inbox actions, or UI.

begin;

create extension if not exists pgcrypto;

create or replace function public.gnr8_single_site_publish_operator_action_prevent_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Single-site publish operator action audit records are append-only: %.% does not allow %', tg_table_schema, tg_table_name, tg_op;
end;
$$;

create table if not exists public.gnr8_single_site_publish_operator_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id text not null,
  site_id text not null,
  migration_id text not null,
  mode text not null,
  route_action_source text not null,
  actor_id text not null,
  actor_type text not null,
  actor_role text not null,
  confirmation_marker text not null,
  candidate_site_version_ref text not null,
  runtime_artifact_ref text not null,
  publish_target_ref text not null,
  publish_stage text not null,
  publish_environment text not null,
  launch_readiness_evidence_ref text not null,
  publish_activation_request_ref text not null,
  publish_activation_decision_ref text not null,
  gate_attempt_result_ref text not null,
  handoff_watermark text not null,
  gate_input_watermark text not null,
  idempotency_key text not null,
  correlation_id text not null,
  semantic_fingerprint text not null,
  status text not null default 'requested',
  result_summary_json jsonb not null default '{}'::jsonb,
  redacted_diagnostics_json jsonb not null default '{}'::jsonb,
  limitation_summary_json jsonb not null default '{}'::jsonb,
  error_summary_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  unique (idempotency_key),
  constraint gnr8_single_site_publish_operator_actions_mode_ck
    check (mode in ('dry_run', 'shadow_publish')),
  constraint gnr8_single_site_publish_operator_actions_status_ck
    check (status in (
      'requested',
      'preflight_failed',
      'dry_run_completed',
      'shadow_publish_started',
      'shadow_publish_completed',
      'shadow_publish_failed',
      'cancelled',
      'superseded'
    )),
  constraint gnr8_single_site_publish_operator_actions_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_publish_operator_actions_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_publish_operator_actions_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_publish_operator_actions_json_shape_ck
    check (
      jsonb_typeof(result_summary_json) = 'object'
      and jsonb_typeof(redacted_diagnostics_json) = 'object'
      and jsonb_typeof(limitation_summary_json) = 'object'
      and jsonb_typeof(error_summary_json) = 'object'
    ),
  constraint gnr8_single_site_publish_operator_actions_nonempty_text_ck
    check (
      length(btrim(tenant_id)) > 0
      and length(btrim(client_id)) > 0
      and length(btrim(site_id)) > 0
      and length(btrim(migration_id)) > 0
      and length(btrim(route_action_source)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(confirmation_marker)) > 0
      and length(btrim(candidate_site_version_ref)) > 0
      and length(btrim(runtime_artifact_ref)) > 0
      and length(btrim(publish_target_ref)) > 0
      and length(btrim(publish_stage)) > 0
      and length(btrim(publish_environment)) > 0
      and length(btrim(launch_readiness_evidence_ref)) > 0
      and length(btrim(publish_activation_request_ref)) > 0
      and length(btrim(publish_activation_decision_ref)) > 0
      and length(btrim(gate_attempt_result_ref)) > 0
      and length(btrim(handoff_watermark)) > 0
      and length(btrim(gate_input_watermark)) > 0
      and length(btrim(idempotency_key)) > 0
      and length(btrim(correlation_id)) > 0
      and length(btrim(semantic_fingerprint)) > 0
    )
);

create index if not exists idx_gnr8_single_site_publish_operator_actions_scope
  on public.gnr8_single_site_publish_operator_actions (tenant_id, client_id, site_id, migration_id, created_at desc);

create index if not exists idx_gnr8_single_site_publish_operator_actions_mode_status
  on public.gnr8_single_site_publish_operator_actions (mode, status, updated_at desc);

create index if not exists idx_gnr8_single_site_publish_operator_actions_correlation
  on public.gnr8_single_site_publish_operator_actions (correlation_id, created_at desc);

create table if not exists public.gnr8_single_site_publish_operator_action_refs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.gnr8_single_site_publish_operator_actions(id) on delete restrict,
  ref_role text not null,
  source_system text not null default 'gnr8',
  source_table text null,
  source_type text not null,
  source_record_id text not null,
  source_ref text not null,
  source_watermark text null,
  metadata_json jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (action_id, ref_role, source_system, source_type, source_record_id, source_ref),
  constraint gnr8_single_site_publish_operator_action_refs_role_ck
    check (ref_role in (
      'candidate_site_version',
      'runtime_artifact',
      'publish_target',
      'launch_readiness_evidence',
      'publish_activation_request',
      'publish_activation_decision',
      'gate_attempt',
      'handoff_watermark',
      'gate_input_watermark',
      'wrapper_result',
      'publish_result',
      'guard_diagnostic',
      'limitation',
      'blocker',
      'operator_confirmation'
    )),
  constraint gnr8_single_site_publish_operator_action_refs_json_shape_ck
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint gnr8_single_site_publish_operator_action_refs_nonempty_text_ck
    check (
      length(btrim(ref_role)) > 0
      and length(btrim(source_system)) > 0
      and (source_table is null or length(btrim(source_table)) > 0)
      and length(btrim(source_type)) > 0
      and length(btrim(source_record_id)) > 0
      and length(btrim(source_ref)) > 0
      and (source_watermark is null or length(btrim(source_watermark)) > 0)
      and length(btrim(correlation_id)) > 0
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_publish_operator_action_refs_action
  on public.gnr8_single_site_publish_operator_action_refs (action_id, ref_role, created_at desc);

create index if not exists idx_gnr8_single_site_publish_operator_action_refs_role
  on public.gnr8_single_site_publish_operator_action_refs (ref_role, created_at desc);

create table if not exists public.gnr8_single_site_publish_operator_action_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.gnr8_single_site_publish_operator_actions(id) on delete restrict,
  event_index integer not null,
  event_action text not null,
  status text not null,
  actor_id text not null,
  actor_type text not null,
  actor_role text not null,
  result_summary_json jsonb not null default '{}'::jsonb,
  redacted_diagnostics_json jsonb not null default '{}'::jsonb,
  error_summary_json jsonb not null default '{}'::jsonb,
  correlation_id text not null,
  causation_id text null,
  idempotency_key text not null,
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (action_id, event_index),
  unique (idempotency_key),
  constraint gnr8_single_site_publish_operator_action_events_action_ck
    check (event_action in (
      'action_requested',
      'preflight_failed',
      'dry_run_started',
      'dry_run_completed',
      'shadow_publish_started',
      'shadow_publish_completed',
      'shadow_publish_failed',
      'diagnostics_recorded',
      'redaction_applied'
    )),
  constraint gnr8_single_site_publish_operator_action_events_status_ck
    check (status in (
      'requested',
      'preflight_failed',
      'dry_run_completed',
      'shadow_publish_started',
      'shadow_publish_completed',
      'shadow_publish_failed',
      'cancelled',
      'superseded'
    )),
  constraint gnr8_single_site_publish_operator_action_events_actor_type_ck
    check (actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_single_site_publish_operator_action_events_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_single_site_publish_operator_action_events_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_single_site_publish_operator_action_events_json_shape_ck
    check (
      jsonb_typeof(result_summary_json) = 'object'
      and jsonb_typeof(redacted_diagnostics_json) = 'object'
      and jsonb_typeof(error_summary_json) = 'object'
    ),
  constraint gnr8_single_site_publish_operator_action_events_nonempty_text_ck
    check (
      event_index >= 1
      and length(btrim(event_action)) > 0
      and length(btrim(status)) > 0
      and length(btrim(actor_id)) > 0
      and length(btrim(actor_role)) > 0
      and length(btrim(correlation_id)) > 0
      and (causation_id is null or length(btrim(causation_id)) > 0)
      and length(btrim(idempotency_key)) > 0
    )
);

create index if not exists idx_gnr8_single_site_publish_operator_action_events_action
  on public.gnr8_single_site_publish_operator_action_events (action_id, occurred_at desc, event_index);

create index if not exists idx_gnr8_single_site_publish_operator_action_events_event_action
  on public.gnr8_single_site_publish_operator_action_events (event_action, created_at desc);

alter table public.gnr8_single_site_publish_operator_actions enable row level security;
alter table public.gnr8_single_site_publish_operator_action_refs enable row level security;
alter table public.gnr8_single_site_publish_operator_action_events enable row level security;

drop trigger if exists trg_gnr8_single_site_publish_operator_action_refs_append_only
  on public.gnr8_single_site_publish_operator_action_refs;
create trigger trg_gnr8_single_site_publish_operator_action_refs_append_only
  before update or delete on public.gnr8_single_site_publish_operator_action_refs
  for each row execute function public.gnr8_single_site_publish_operator_action_prevent_update_delete();

drop trigger if exists trg_gnr8_single_site_publish_operator_action_events_append_only
  on public.gnr8_single_site_publish_operator_action_events;
create trigger trg_gnr8_single_site_publish_operator_action_events_append_only
  before update or delete on public.gnr8_single_site_publish_operator_action_events
  for each row execute function public.gnr8_single_site_publish_operator_action_prevent_update_delete();

commit;
