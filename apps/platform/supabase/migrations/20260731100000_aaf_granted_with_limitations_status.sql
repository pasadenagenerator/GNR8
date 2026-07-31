-- Add limited-grant vocabulary to AAF approval decisions.
-- This migration only updates the approval decision status CHECK constraint.
-- It creates no approval requests, decisions, evidence packages, policies, or runtime state.

alter table public.gnr8_aaf_approval_decisions
  drop constraint if exists gnr8_aaf_approval_decisions_status_ck;

alter table public.gnr8_aaf_approval_decisions
  add constraint gnr8_aaf_approval_decisions_status_ck
    check (status in (
      'granted',
      'granted_with_limitations',
      'rejected',
      'revoked',
      'expired',
      'superseded',
      'cancelled',
      'not_required_by_policy'
    ));
