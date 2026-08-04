-- Expand AAF evidence vocabulary for single-site launch readiness evidence.
-- This migration only updates AAF CHECK constraints; it creates no approvals,
-- decisions, gate attempts, policies, source truth, runtime records, routes,
-- provider calls, or publish actions.

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
      'single_site_launch_approval_evidence',
      'single_site_launch_readiness_evidence'
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
      'single_site_launch_approval_evidence',
      'single_site_launch_readiness_evidence'
    ));
