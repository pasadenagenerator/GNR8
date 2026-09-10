-- GNR8 Airship internal preview candidate reviews
-- Records superadmin review readiness for Airship internal preview candidates.
-- This migration does not publish, mutate active pointers, change runtime site
-- version state, call providers, touch domains/DNS/billing, run source capture,
-- dry-run, shadow-publish, rollback, or expose live public content.

begin;

create extension if not exists pgcrypto;

create table if not exists public.gnr8_airship_internal_preview_candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  migration_id uuid not null references public.gnr8_single_site_migrations(id) on delete restrict,
  draft_id uuid not null references public.gnr8_airship_single_site_editor_drafts(id) on delete restrict,
  draft_version integer not null,
  candidate_site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete restrict,
  candidate_runtime_artifact_id uuid not null references public.gnr8_runtime_artifacts(id) on delete restrict,
  review_decision text not null,
  review_status text not null default 'approved',
  publish_readiness_ready boolean not null default true,
  reviewer_actor_id text not null,
  reviewer_actor_type text not null default 'human',
  reviewer_actor_role text not null default 'platform_superadmin',
  reviewed_at timestamptz not null default now(),
  limitations_notes text not null default '',
  next_step text not null default 'publish-readiness evaluation, not publish',
  active_pointer_site_version_id uuid null,
  active_pointer_artifact_id uuid null,
  active_pointer_changed boolean not null default false,
  runtime_version_state_mutated boolean not null default false,
  live_site_mutated boolean not null default false,
  published boolean not null default false,
  service_version text not null,
  idempotency_key text not null,
  correlation_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  privacy_label text not null default 'internal_operational',
  retention_class text not null default 'mvp_operational',
  unique (migration_id, draft_id, draft_version, candidate_site_version_id, candidate_runtime_artifact_id, review_decision),
  unique (idempotency_key),
  constraint gnr8_airship_internal_preview_candidate_reviews_decision_ck
    check (review_decision in ('approved_for_publish_readiness')),
  constraint gnr8_airship_internal_preview_candidate_reviews_status_ck
    check (review_status in ('approved')),
  constraint gnr8_airship_internal_preview_candidate_reviews_actor_type_ck
    check (reviewer_actor_type in ('human', 'system')),
  constraint gnr8_airship_internal_preview_candidate_reviews_actor_role_ck
    check (reviewer_actor_role in ('platform_superadmin', 'internal_operator')),
  constraint gnr8_airship_internal_preview_candidate_reviews_privacy_ck
    check (privacy_label in ('internal_operational', 'client_confidential')),
  constraint gnr8_airship_internal_preview_candidate_reviews_retention_ck
    check (retention_class in ('short_operational', 'mvp_operational', 'compliance_long')),
  constraint gnr8_airship_internal_preview_candidate_reviews_safety_ck
    check (
      publish_readiness_ready = true
      and active_pointer_changed = false
      and runtime_version_state_mutated = false
      and live_site_mutated = false
      and published = false
      and length(btrim(next_step)) > 0
    ),
  constraint gnr8_airship_internal_preview_candidate_reviews_nonempty_text_ck
    check (
      draft_version >= 1
      and length(btrim(review_decision)) > 0
      and length(btrim(reviewer_actor_id)) > 0
      and length(btrim(reviewer_actor_role)) > 0
      and length(btrim(service_version)) > 0
      and length(btrim(idempotency_key)) > 0
      and length(btrim(correlation_id)) > 0
    ),
  constraint gnr8_airship_internal_preview_candidate_reviews_safe_storage_ck
    check (
      limitations_notes !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
      and metadata_json::text !~* '(secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key)'
    )
);

create index if not exists idx_gnr8_airship_internal_preview_candidate_reviews_migration
  on public.gnr8_airship_internal_preview_candidate_reviews (migration_id, reviewed_at desc);

create index if not exists idx_gnr8_airship_internal_preview_candidate_reviews_candidate
  on public.gnr8_airship_internal_preview_candidate_reviews (candidate_site_version_id, candidate_runtime_artifact_id);

alter table public.gnr8_airship_internal_preview_candidate_reviews enable row level security;
alter table public.gnr8_airship_internal_preview_candidate_reviews force row level security;

revoke all on table public.gnr8_airship_internal_preview_candidate_reviews from anon, authenticated;

commit;
