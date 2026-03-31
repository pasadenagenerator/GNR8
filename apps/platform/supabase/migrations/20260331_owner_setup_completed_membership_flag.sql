-- ============================================================
-- Owner Setup Membership Flag (Additive)
-- Date: 2026-03-31
-- Scope: onboarding gate flag for agency owners
-- ============================================================

begin;

alter table public.memberships
  add column if not exists owner_setup_completed boolean not null default false;

create index if not exists memberships_owner_setup_completed_owner_idx
  on public.memberships (user_id, owner_setup_completed)
  where lower(role::text) = 'owner';

commit;
