-- ============================================================
-- Client Invite Onboarding Setup Flag + Minimal Profile Fields
-- Date: 2026-04-01
-- Scope: per-client membership onboarding completion
-- ============================================================

begin;

alter table public.client_memberships
  add column if not exists client_setup_completed boolean not null default false,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists mobile_number text;

create index if not exists client_memberships_setup_gate_idx
  on public.client_memberships (user_id, client_setup_completed);

comment on column public.client_memberships.client_setup_completed is
  'Client onboarding completion state scoped to user_id + client_organization_id relationship.';
comment on column public.client_memberships.first_name is
  'Client onboarding first-name field captured for the client-scoped membership.';
comment on column public.client_memberships.last_name is
  'Client onboarding surname field captured for the client-scoped membership.';
comment on column public.client_memberships.mobile_number is
  'Client onboarding mobile-number field captured for the client-scoped membership.';

commit;
