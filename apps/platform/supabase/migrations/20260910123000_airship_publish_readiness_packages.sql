-- GNR8 Airship publish-readiness packages
-- Evidence-only handoff from an approved Airship internal preview candidate
-- review. This migration does not publish, dry-run, shadow-publish, rollback,
-- run source capture, call providers, mutate active pointers, or alter live
-- site/domain/DNS/billing state.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_airship_publish_readiness_packages (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  review_record_id uuid not null references public.gnr8_airship_internal_preview_candidate_reviews(id) on delete restrict,
  reviewed_candidate_site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete restrict,
  reviewed_artifact_id uuid not null references public.gnr8_runtime_artifacts(id) on delete restrict,
  draft_id uuid not null references public.gnr8_airship_single_site_editor_drafts(id) on delete restrict,
  draft_version integer not null,
  readiness_status text not null default 'complete',
  next_step text not null default 'governed dry-run later, not publish',
  review_status text not null,
  review_decision text not null,
  reviewed_at timestamptz not null,
  site_client_source_labels_json jsonb not null default '{}'::jsonb,
  active_pointer_before_site_version_id uuid null,
  active_pointer_before_artifact_id uuid null,
  active_pointer_after_site_version_id uuid null,
  active_pointer_after_artifact_id uuid null,
  source_evidence_summary_json jsonb not null default '{}'::jsonb,
  saved_draft_field_summary_json jsonb not null default '[]'::jsonb,
  internal_preview_url text not null,
  limitations_warnings_json jsonb not null default '[]'::jsonb,
  no_publish_confirmation_json jsonb not null default '{}'::jsonb,
  service_version text not null,
  idempotency_key text not null,
  correlation_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (migration_id, review_record_id, reviewed_candidate_site_version_id, reviewed_artifact_id, draft_id, draft_version),
  unique (idempotency_key),
  constraint gnr8_airship_pub_ready_status_ck
    check (readiness_status in ('complete')),
  constraint gnr8_airship_pub_ready_next_step_ck
    check (next_step = 'governed dry-run later, not publish'),
  constraint gnr8_airship_pub_ready_review_ck
    check (review_status = 'approved' and review_decision = 'approved_for_publish_readiness'),
  constraint gnr8_airship_pub_ready_json_ck
    check (
      jsonb_typeof(site_client_source_labels_json) = 'object'
      and jsonb_typeof(source_evidence_summary_json) = 'object'
      and jsonb_typeof(saved_draft_field_summary_json) = 'array'
      and jsonb_typeof(limitations_warnings_json) = 'array'
      and jsonb_typeof(no_publish_confirmation_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),
  constraint gnr8_airship_pub_ready_no_publish_ck
    check (
      no_publish_confirmation_json @> '{
        "internalPreviewOnly": true,
        "notLive": true,
        "notPublished": true,
        "candidateRuntimeState": "DRAFT",
        "activePointerChanged": false,
        "runtimeVersionStateMutated": false,
        "liveSiteMutated": false,
        "publishes": false,
        "dryRun": false,
        "shadowPublish": false,
        "rollback": false,
        "sourceCapture": false,
        "providerCall": false
      }'::jsonb
    ),
  constraint gnr8_airship_pub_ready_pointer_ck
    check (
      active_pointer_before_site_version_id is not distinct from active_pointer_after_site_version_id
      and active_pointer_before_artifact_id is not distinct from active_pointer_after_artifact_id
      and reviewed_candidate_site_version_id is distinct from active_pointer_after_site_version_id
      and reviewed_artifact_id is distinct from active_pointer_after_artifact_id
    ),
  constraint gnr8_airship_pub_ready_nonempty_ck
    check (
      draft_version >= 1
      and length(btrim(internal_preview_url)) > 0
      and length(btrim(service_version)) > 0
      and length(btrim(idempotency_key)) > 0
      and length(btrim(correlation_id)) > 0
    ),
  constraint gnr8_airship_pub_ready_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_pub_ready_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_pub_ready_safe_storage_ck
    check (
      site_client_source_labels_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and source_evidence_summary_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and saved_draft_field_summary_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and limitations_warnings_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and metadata_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
    )
);

create index if not exists idx_gnr8_airship_pub_ready_migration
  on public.gnr8_airship_publish_readiness_packages (migration_id, created_at desc);

create index if not exists idx_gnr8_airship_pub_ready_review
  on public.gnr8_airship_publish_readiness_packages (review_record_id, created_at desc);

alter table public.gnr8_airship_publish_readiness_packages enable row level security;
alter table public.gnr8_airship_publish_readiness_packages force row level security;

revoke all on table public.gnr8_airship_publish_readiness_packages from anon, authenticated;

commit;
