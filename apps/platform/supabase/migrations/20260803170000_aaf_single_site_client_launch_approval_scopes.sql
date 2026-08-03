-- Expand AAF scope/evidence vocabulary for single-site client and launch approvals.
-- This migration only updates AAF CHECK constraints; it creates no approvals, decisions,
-- evidence packages, policies, workflow rows, runtime records, routes, provider calls, or publish actions.

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
      'single_site_improvement_implementation_authorization',
      'single_site_content_approval',
      'single_site_client_approval',
      'single_site_launch_approval'
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
      'single_site_improvement_implementation_authorization',
      'single_site_content_approval',
      'single_site_client_approval',
      'single_site_launch_approval'
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
      'single_site_improvement_implementation_authorization',
      'single_site_content_approval',
      'single_site_client_approval',
      'single_site_launch_approval'
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
      'single_site_improvement_implementation_authorization',
      'single_site_content_approval',
      'single_site_client_approval',
      'single_site_launch_approval'
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
      'single_site_improvement_implementation_authorization_evidence',
      'single_site_content_approval_evidence',
      'single_site_client_approval_evidence',
      'single_site_launch_approval_evidence'
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
      'single_site_improvement_implementation_authorization_evidence',
      'single_site_content_approval_evidence',
      'single_site_client_approval_evidence',
      'single_site_launch_approval_evidence'
    ));

alter table public.gnr8_aaf_approval_scope_definitions
  drop constraint if exists gnr8_aaf_scope_defs_client_launch_approval_contract_ck;

alter table public.gnr8_aaf_approval_scope_definitions
  add constraint gnr8_aaf_scope_defs_client_launch_approval_contract_ck
    check (
      (
        scope = 'single_site_client_approval'
        and subject_type = 'single_site_improved_candidate_client_acceptance'
        and allowed_action = 'approve_single_site_client_acceptance'
        and required_evidence_type = 'single_site_client_approval_evidence'
      )
      or (
        scope = 'single_site_launch_approval'
        and subject_type = 'single_site_launch_readiness_review'
        and allowed_action = 'approve_single_site_launch_readiness'
        and required_evidence_type = 'single_site_launch_approval_evidence'
      )
      or (
        scope not in ('single_site_client_approval', 'single_site_launch_approval')
        and allowed_action not in ('approve_single_site_client_acceptance', 'approve_single_site_launch_readiness')
        and required_evidence_type not in ('single_site_client_approval_evidence', 'single_site_launch_approval_evidence')
      )
    );

alter table public.gnr8_aaf_approval_requests
  drop constraint if exists gnr8_aaf_requests_client_launch_approval_subject_ck;

alter table public.gnr8_aaf_approval_requests
  add constraint gnr8_aaf_requests_client_launch_approval_subject_ck
    check (
      (
        scope = 'single_site_client_approval'
        and subject_type = 'single_site_improved_candidate_client_acceptance'
      )
      or (
        scope = 'single_site_launch_approval'
        and subject_type = 'single_site_launch_readiness_review'
      )
      or scope not in ('single_site_client_approval', 'single_site_launch_approval')
    );

alter table public.gnr8_aaf_approval_policy_evaluations
  drop constraint if exists gnr8_aaf_policy_evals_client_launch_approval_contract_ck;

alter table public.gnr8_aaf_approval_policy_evaluations
  add constraint gnr8_aaf_policy_evals_client_launch_approval_contract_ck
    check (
      (
        scope = 'single_site_client_approval'
        and subject_type = 'single_site_improved_candidate_client_acceptance'
        and action_key = 'approve_single_site_client_acceptance'
      )
      or (
        scope = 'single_site_launch_approval'
        and subject_type = 'single_site_launch_readiness_review'
        and action_key = 'approve_single_site_launch_readiness'
      )
      or (
        scope not in ('single_site_client_approval', 'single_site_launch_approval')
        and action_key not in ('approve_single_site_client_acceptance', 'approve_single_site_launch_readiness')
      )
    );

alter table public.gnr8_aaf_action_gate_attempts
  drop constraint if exists gnr8_aaf_gate_attempts_client_launch_approval_contract_ck;

alter table public.gnr8_aaf_action_gate_attempts
  add constraint gnr8_aaf_gate_attempts_client_launch_approval_contract_ck
    check (
      (
        scope = 'single_site_client_approval'
        and subject_type = 'single_site_improved_candidate_client_acceptance'
        and action_key = 'approve_single_site_client_acceptance'
      )
      or (
        scope = 'single_site_launch_approval'
        and subject_type = 'single_site_launch_readiness_review'
        and action_key = 'approve_single_site_launch_readiness'
      )
      or (
        scope not in ('single_site_client_approval', 'single_site_launch_approval')
        and action_key not in ('approve_single_site_client_acceptance', 'approve_single_site_launch_readiness')
      )
    );

alter table public.gnr8_aaf_evidence_packages
  drop constraint if exists gnr8_aaf_evidence_client_launch_approval_subject_ck;

alter table public.gnr8_aaf_evidence_packages
  add constraint gnr8_aaf_evidence_client_launch_approval_subject_ck
    check (
      (
        package_type = 'single_site_client_approval_evidence'
        and subject_type = 'single_site_improved_candidate_client_acceptance'
      )
      or (
        package_type = 'single_site_launch_approval_evidence'
        and subject_type = 'single_site_launch_readiness_review'
      )
      or package_type not in ('single_site_client_approval_evidence', 'single_site_launch_approval_evidence')
    );
