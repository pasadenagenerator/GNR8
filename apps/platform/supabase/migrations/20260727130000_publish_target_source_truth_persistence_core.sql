-- GNR8 Publish Target Source Truth Persistence Core
-- Additive canonical storage for publish target policy/config records.
-- This migration does not implement source readers, publish integration,
-- enforcement, provider calls, active pointer mutation, or runtime behavior.

begin;

create table if not exists public.gnr8_publish_targets (
  id text primary key,
  environment text not null,
  target_kind text not null,
  publish_stage text not null,
  status text not null default 'active',
  policy_version text not null,
  requires_aaf boolean not null default true,
  requires_ddom_snapshot boolean not null default true,
  requires_launch_signoff boolean not null default true,
  allowed_artifact_stages jsonb not null default '[]'::jsonb,
  limitations_json jsonb not null default '{}'::jsonb,
  source_watermark text null,
  created_by_actor_type text not null default 'system',
  created_by_actor_id text not null default 'migration',
  correlation_id text not null default 'ptt-1-bootstrap',
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'compliance_long',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gnr8_publish_targets_environment_ck
    check (environment in ('production', 'preview', 'staging', 'development')),
  constraint gnr8_publish_targets_target_kind_ck
    check (target_kind in ('public_runtime', 'preview_runtime', 'internal_runtime')),
  constraint gnr8_publish_targets_publish_stage_ck
    check (publish_stage in ('production', 'canary', 'shadow')),
  constraint gnr8_publish_targets_status_ck
    check (status in ('active', 'disabled', 'retired')),
  constraint gnr8_publish_targets_actor_type_ck
    check (created_by_actor_type in ('human', 'system', 'provider', 'external_reference', 'ai_advisory')),
  constraint gnr8_publish_targets_privacy_ck
    check (privacy_label in (
      'public_operational',
      'internal_operational',
      'client_confidential',
      'credential_sensitive',
      'billing_sensitive',
      'provider_sensitive',
      'legal_sensitive'
    )),
  constraint gnr8_publish_targets_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'security', 'compliance_long', 'legal_hold')),
  constraint gnr8_publish_targets_json_shape_ck
    check (
      jsonb_typeof(allowed_artifact_stages) = 'array'
      and jsonb_typeof(limitations_json) = 'object'
    ),
  constraint gnr8_publish_targets_allowed_artifact_stage_values_ck
    check (allowed_artifact_stages <@ '["production", "canary", "shadow"]'::jsonb),
  constraint gnr8_publish_targets_source_watermark_nonempty_ck
    check (source_watermark is null or length(btrim(source_watermark)) > 0)
);

create index if not exists idx_gnr8_publish_targets_status_environment_stage
  on public.gnr8_publish_targets (status, environment, publish_stage);

create index if not exists idx_gnr8_publish_targets_target_kind
  on public.gnr8_publish_targets (target_kind);

create index if not exists idx_gnr8_publish_targets_updated_at
  on public.gnr8_publish_targets (updated_at);

create index if not exists idx_gnr8_publish_targets_policy_version
  on public.gnr8_publish_targets (policy_version);

alter table public.gnr8_publish_targets enable row level security;

insert into public.gnr8_publish_targets (
  id,
  environment,
  target_kind,
  publish_stage,
  status,
  policy_version,
  requires_aaf,
  requires_ddom_snapshot,
  requires_launch_signoff,
  allowed_artifact_stages,
  limitations_json,
  source_watermark,
  created_by_actor_type,
  created_by_actor_id,
  correlation_id,
  privacy_label,
  retention_class
)
values (
  'production',
  'production',
  'public_runtime',
  'production',
  'active',
  'ptt-1',
  true,
  true,
  true,
  '["production"]'::jsonb,
  '{
    "phase": "PTT-1",
    "mvpLimitations": [
      "Canonical publish target storage only; no production source reader integration.",
      "No publish route shadow integration or blocking enforcement is implemented in this phase.",
      "Shadow and canary are constrained publish-stage vocabulary but are not seeded as MVP-supported target records."
    ]
  }'::jsonb,
  'ptt-1:gnr8_publish_targets:production',
  'system',
  'migration',
  'ptt-1-bootstrap',
  'internal_operational',
  'compliance_long'
)
on conflict (id) do nothing;

commit;
