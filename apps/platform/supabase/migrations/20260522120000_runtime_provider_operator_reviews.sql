create table if not exists public.gnr8_runtime_provider_operator_reviews (
  review_id text primary key,
  handoff_id text not null,
  correlation_key text not null,
  reviewer_ref text not null,
  review_status text not null check (
    review_status in (
      'pending_review',
      'approved_for_future_execution',
      'rejected',
      'needs_changes'
    )
  ),
  review_reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gnr8_runtime_provider_operator_reviews_handoff_id
  on public.gnr8_runtime_provider_operator_reviews (handoff_id);

create index if not exists idx_gnr8_runtime_provider_operator_reviews_correlation_key
  on public.gnr8_runtime_provider_operator_reviews (correlation_key);

