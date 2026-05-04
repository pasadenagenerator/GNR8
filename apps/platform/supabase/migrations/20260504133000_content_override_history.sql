create table if not exists public.gnr8_content_override_history (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
  slot_key text not null,
  value_type text not null,
  previous_value_json jsonb,
  next_value_json jsonb not null,
  action text not null check (action in ('draft_saved', 'content_published', 'rollback_applied')),
  actor_user_id uuid,
  source text not null default 'manual' check (source in ('manual', 'batch', 'system', 'ai')),
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists gnr8_content_override_history_site_version_idx
  on public.gnr8_content_override_history (site_version_id);

create index if not exists gnr8_content_override_history_site_idx
  on public.gnr8_content_override_history (site_id);

create index if not exists gnr8_content_override_history_slot_key_idx
  on public.gnr8_content_override_history (slot_key);

create index if not exists gnr8_content_override_history_created_at_desc_idx
  on public.gnr8_content_override_history (created_at desc);
