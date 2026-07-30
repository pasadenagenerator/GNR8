-- Expand AAF scope/evidence vocabulary for single-site improvement implementation authorization.
-- This migration only updates AAF CHECK constraints; it creates no approvals, decisions, or evidence packages.

alter table public.gnr8_aaf_approval_scope_definitions
  drop constraint if exists gnr8_aaf_approval_scope_definitions_scope_ck;

alter table public.gnr8_aaf_approval_scope_definitions
  add constraint gnr8_aaf_approval_scope_definitions_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance',
      'single_site_improvement_implementation_authorization'
    ));

alter table public.gnr8_aaf_approval_requests
  drop constraint if exists gnr8_aaf_approval_requests_scope_ck;

alter table public.gnr8_aaf_approval_requests
  add constraint gnr8_aaf_approval_requests_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance',
      'single_site_improvement_implementation_authorization'
    ));

alter table public.gnr8_aaf_approval_policy_evaluations
  drop constraint if exists gnr8_aaf_approval_policy_evaluations_scope_ck;

alter table public.gnr8_aaf_approval_policy_evaluations
  add constraint gnr8_aaf_approval_policy_evaluations_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance',
      'single_site_improvement_implementation_authorization'
    ));

alter table public.gnr8_aaf_action_gate_attempts
  drop constraint if exists gnr8_aaf_action_gate_attempts_scope_ck;

alter table public.gnr8_aaf_action_gate_attempts
  add constraint gnr8_aaf_action_gate_attempts_scope_ck
    check (scope in (
      'batch_start',
      'batch_resume',
      'dry_run_waiver',
      'retry_request',
      'replay_request',
      'unsupported_site_exception',
      'degraded_capture_exception',
      'route_coverage_exception',
      'form_widget_booking_exception',
      'content_publish',
      'client_review',
      'launch_signoff',
      'domain_action',
      'domain_exception',
      'publish_activation',
      'rollback',
      'cost_exception',
      'incident_recovery',
      'external_workflow_reference_acceptance',
      'ai_advisory_plan_acceptance',
      'single_site_improvement_implementation_authorization'
    ));

alter table public.gnr8_aaf_approval_scope_definitions
  drop constraint if exists gnr8_aaf_approval_scope_definitions_evidence_type_ck;

alter table public.gnr8_aaf_approval_scope_definitions
  add constraint gnr8_aaf_approval_scope_definitions_evidence_type_ck
    check (required_evidence_type in (
      'batch_start_evidence',
      'dry_run_waiver_evidence',
      'retry_replay_evidence',
      'unsupported_exception_evidence',
      'content_publish_evidence',
      'launch_signoff_evidence',
      'domain_action_evidence',
      'domain_exception_evidence',
      'publish_activation_evidence',
      'rollback_evidence',
      'cost_exception_evidence',
      'external_workflow_reference_evidence',
      'ai_advisory_review_evidence',
      'incident_recovery_evidence',
      'single_site_improvement_implementation_authorization_evidence'
    ));

alter table public.gnr8_aaf_evidence_packages
  drop constraint if exists gnr8_aaf_evidence_packages_type_ck;

alter table public.gnr8_aaf_evidence_packages
  add constraint gnr8_aaf_evidence_packages_type_ck
    check (package_type in (
      'batch_start_evidence',
      'dry_run_waiver_evidence',
      'retry_replay_evidence',
      'unsupported_exception_evidence',
      'content_publish_evidence',
      'launch_signoff_evidence',
      'domain_action_evidence',
      'domain_exception_evidence',
      'publish_activation_evidence',
      'rollback_evidence',
      'cost_exception_evidence',
      'external_workflow_reference_evidence',
      'ai_advisory_review_evidence',
      'incident_recovery_evidence',
      'single_site_improvement_implementation_authorization_evidence'
    ));
