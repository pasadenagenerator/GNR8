export const AAF_APPROVAL_STATUSES = [
  'requested',
  'granted',
  'granted_with_limitations',
  'rejected',
  'revoked',
  'expired',
  'superseded',
  'cancelled',
  'not_required_by_policy',
] as const

export type AafApprovalStatus = (typeof AAF_APPROVAL_STATUSES)[number]

export const AAF_APPROVAL_SCOPES = [
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
] as const

export type AafApprovalScope = (typeof AAF_APPROVAL_SCOPES)[number]

export const AAF_POLICY_EVALUATION_RESULTS = [
  'approval_required',
  'approval_not_required_by_policy',
  'approval_blocked',
  'approval_stale',
  'approval_superseded',
  'emergency_exception_required',
  'emergency_exception_granted',
  'policy_error',
] as const

export type AafPolicyEvaluationResult = (typeof AAF_POLICY_EVALUATION_RESULTS)[number]

export const AAF_AUDIT_EVENT_FAMILIES = [
  'identity/auth',
  'intake',
  'dry-run',
  'batch lifecycle',
  'site item lifecycle',
  'retry/replay',
  'preview/readiness',
  'review/content',
  'approval',
  'domain/DNS',
  'publish',
  'rollback',
  'provider/external execution',
  'cost',
  'asset/storage evidence',
  'external workflow reference',
  'AI advisory',
  'admin/superadmin exception',
  'system failure/audit failure',
] as const

export type AafAuditEventFamily = (typeof AAF_AUDIT_EVENT_FAMILIES)[number]

export const AAF_AUDIT_SEVERITIES = [
  'debug',
  'info',
  'notice',
  'warning',
  'error',
  'critical',
  'security',
] as const

export type AafAuditSeverity = (typeof AAF_AUDIT_SEVERITIES)[number]

export const AAF_REPLAY_CLASSES = [
  'not_replayable',
  'deterministic_replay',
  'manual_retry_only',
  'forbidden_replay',
  'compensating_only',
] as const

export type AafReplayClass = (typeof AAF_REPLAY_CLASSES)[number]

export const AAF_EVIDENCE_PACKAGE_TYPES = [
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
] as const

export type AafEvidencePackageType = (typeof AAF_EVIDENCE_PACKAGE_TYPES)[number]

export const AAF_PRIVACY_LABELS = [
  'public_operational',
  'internal_operational',
  'client_confidential',
  'credential_sensitive',
  'billing_sensitive',
  'provider_sensitive',
  'legal_sensitive',
] as const

export type AafPrivacyLabel = (typeof AAF_PRIVACY_LABELS)[number]

export const AAF_REDACTION_LABELS = [
  'none',
  'redaction_required',
  'redacted',
  'credential_redacted',
  'billing_redacted',
  'provider_redacted',
  'legal_redacted',
] as const

export type AafRedactionLabel = (typeof AAF_REDACTION_LABELS)[number]

export const AAF_RETENTION_CLASSES = [
  'short_operational',
  'mvp_operational',
  'security',
  'compliance_long',
  'legal_hold',
] as const

export type AafRetentionClass = (typeof AAF_RETENTION_CLASSES)[number]

export const AAF_GATE_RESULTS = [
  'allowed',
  'blocked',
  'approval_required',
  'evidence_missing',
  'evidence_stale',
  'approval_stale',
  'approval_superseded',
  'approval_revoked',
  'audit_unavailable',
  'not_required_by_policy',
  'policy_error',
  'fail_closed',
] as const

export type AafGateResult = (typeof AAF_GATE_RESULTS)[number]

export const AAF_SCOPE_REPLAY_CLASS: Record<AafApprovalScope, AafReplayClass> = {
  batch_start: 'manual_retry_only',
  batch_resume: 'manual_retry_only',
  dry_run_waiver: 'not_replayable',
  retry_request: 'manual_retry_only',
  replay_request: 'deterministic_replay',
  unsupported_site_exception: 'not_replayable',
  degraded_capture_exception: 'not_replayable',
  route_coverage_exception: 'not_replayable',
  form_widget_booking_exception: 'not_replayable',
  content_publish: 'manual_retry_only',
  client_review: 'not_replayable',
  launch_signoff: 'not_replayable',
  domain_action: 'manual_retry_only',
  domain_exception: 'not_replayable',
  publish_activation: 'forbidden_replay',
  rollback: 'forbidden_replay',
  cost_exception: 'not_replayable',
  incident_recovery: 'not_replayable',
  external_workflow_reference_acceptance: 'not_replayable',
  ai_advisory_plan_acceptance: 'not_replayable',
  single_site_improvement_implementation_authorization: 'not_replayable',
  single_site_content_approval: 'not_replayable',
}

export const AAF_SCOPE_PROHIBITED_ACTIONS: Record<AafApprovalScope, readonly string[]> = {
  batch_start: ['batch_resume', 'replay_request', 'publish_activation', 'rollback', 'domain_action'],
  batch_resume: ['batch_start', 'replay_request', 'publish_activation'],
  dry_run_waiver: ['publish_activation', 'replay_request', 'unsupported_site_exception'],
  retry_request: ['replay_request', 'publish_activation', 'rollback'],
  replay_request: ['human_approval_replay', 'publish_activation', 'rollback'],
  unsupported_site_exception: ['publish_activation', 'domain_exception', 'cost_exception'],
  degraded_capture_exception: ['client_review', 'launch_signoff', 'publish_activation'],
  route_coverage_exception: ['publish_activation', 'rollback'],
  form_widget_booking_exception: ['functional_parity_claim', 'publish_activation'],
  content_publish: ['publish_activation', 'launch_signoff', 'rollback'],
  client_review: ['publish_activation', 'launch_signoff'],
  launch_signoff: ['publish_activation', 'domain_action', 'dns_mutation'],
  domain_action: ['dns_mutation', 'registrar_mutation', 'openprovider_mutation', 'publish_activation'],
  domain_exception: ['publish_activation', 'dns_mutation', 'registrar_mutation'],
  publish_activation: ['domain_action', 'dns_mutation', 'rollback', 'deterministic_replay'],
  rollback: ['deterministic_replay', 'publish_activation', 'domain_action'],
  cost_exception: ['publish_activation', 'provider_execution'],
  incident_recovery: ['silent_audit_bypass', 'ordinary_replay'],
  external_workflow_reference_acceptance: ['approval_truth', 'action_execution'],
  ai_advisory_plan_acceptance: ['ai_approval', 'ai_execution', 'mutation', 'publish_activation', 'rollback', 'ops_inbox_resolution'],
  single_site_improvement_implementation_authorization: [
    'proposal_approval',
    'clone_review_acceptance',
    'client_approval',
    'content_approval',
    'launch_approval',
    'publish_activation',
    'publish_activation_approval',
    'domain_readiness',
    'ddom_readiness',
    'ai_approval',
    'ai_execution',
    'provider_output_authorization',
    'command_center_status',
    'ops_inbox_resolution',
    'chat_transcript_authorization',
    'generated_proposal_bundle_authorization',
    'runtime_mutation',
    'content_mutation',
    'billing_activation',
    'hosting_activation',
    'dns_mutation',
    'domain_action',
    'rollback',
  ],
  single_site_content_approval: [
    'improved_version_review_acceptance',
    'proposal_approval',
    'implementation_authorization',
    'source_evidence_review_acceptance',
    'clone_review_acceptance',
    'client_approval',
    'launch_approval',
    'publish_activation',
    'publish_activation_approval',
    'domain_readiness',
    'domain_mutation',
    'ddom_readiness',
    'dns_readiness',
    'dns_mutation',
    'billing_readiness',
    'billing_activation',
    'subscription_readiness',
    'hosting_activation',
    'content_publish',
    'content_rollback',
    'preview_rendering_approval',
    'public_runtime_rendering_approval',
    'runtime_mutation',
    'site_version_mutation',
    'active_pointer_mutation',
    'ai_approval',
    'ai_execution',
    'provider_output_authorization',
    'generated_proposal_bundle_authorization',
    'command_center_status',
    'ops_inbox_resolution',
    'chat_transcript_authorization',
  ],
}

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE =
  'single_site_improvement_implementation_authorization' as const

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE =
  'single_site_improvement_implementation_authorization_evidence' as const

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE =
  'single_site_improvement_proposal_plan' as const

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION =
  'start_single_site_improvement_implementation' as const

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS = [
  'tenant',
  'client',
  'site',
  'single_site_migration',
  'proposal_plan',
  'proposal_plan_version',
  'proposal_plan_semantic_watermark',
  'proposal_approval_request',
  'proposal_approval_decision',
  'proposal_evidence_package',
  'clone_review',
  'clone_review_status',
  'clone_review_watermark',
  'clone_site_version',
  'runtime_artifact',
  'runtime_artifact_watermark',
  'source_evidence_review',
  'source_evidence_review_status',
  'source_evidence_review_watermark',
  'selected_recommendations',
  'selected_recommendation_watermarks',
  'implementation_target',
  'implementation_attempt_placeholder',
] as const

export type AafSingleSiteImplementationAuthorizationSubjectRef =
  (typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS)[number]

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS = [
  'proposal_plan_snapshot',
  'proposal_approval',
  'proposal_approval_limitations',
  'clone_review_acceptance',
  'clone_review_limitations',
  'source_evidence_acceptance',
  'source_evidence_limitations',
  'limitations',
  'selected_recommendations',
  'risk_impact_effort_summary',
  'implementation_scope_summary',
  'implementation_approach',
  'implementation_non_goals',
  'operator_notes',
  'advisory_ai_provider_refs',
  'generated_proposal_bundle_refs',
  'audit_timeline_refs',
] as const

export type AafSingleSiteImplementationAuthorizationEvidenceRef =
  (typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS)[number]

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS = [
  'proposal_approval_alone',
  'clone_review_acceptance',
  'client_approval',
  'content_approval',
  'launch_approval',
  'publish_activation_approval',
  'domain_readiness',
  'ddom_readiness',
  'ai_provider_output',
  'command_center_status',
  'ops_inbox_item',
  'chat_transcript',
  'generated_proposal_bundle',
] as const

export type AafSingleSiteImplementationAuthorizationProhibitedSubstitution =
  (typeof AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS)[number]

export type AafScopeContract = {
  scope: AafApprovalScope
  purpose: string
  subjectType: string
  evidencePackageType: AafEvidencePackageType
  allowedAction: string
  replayClass: AafReplayClass
  humanApprovalReplayable: boolean
  allowedDecisionStatuses: readonly AafApprovalStatus[]
  allowedGateResults: readonly AafGateResult[]
  requiredSubjectRefs: readonly string[]
  requiredEvidenceRefs: readonly string[]
  requiredFreshnessBehavior: readonly string[]
  prohibitedSubstitutions: readonly string[]
  prohibitedActions: readonly string[]
}

export const AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT: AafScopeContract = {
  scope: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  purpose:
    'Authorize a human-approved single-site improvement implementation attempt after proposal approval, without implying downstream content, client, launch, publish, provider, billing, domain, DNS, rollback, or runtime mutation approval.',
  subjectType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
  evidencePackageType: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
  allowedAction: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
  replayClass: 'not_replayable',
  humanApprovalReplayable: false,
  allowedDecisionStatuses: ['granted', 'granted_with_limitations', 'rejected', 'revoked', 'expired', 'superseded', 'cancelled'],
  allowedGateResults: [
    'allowed',
    'approval_required',
    'evidence_missing',
    'evidence_stale',
    'approval_stale',
    'approval_superseded',
    'approval_revoked',
    'policy_error',
    'fail_closed',
  ],
  requiredSubjectRefs: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS,
  requiredEvidenceRefs: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS,
  requiredFreshnessBehavior: [
    'proposal_plan_status_current',
    'proposal_plan_version_current',
    'proposal_plan_semantic_watermark_current',
    'proposal_approval_current',
    'clone_review_acceptance_current',
    'clone_review_watermark_current',
    'clone_site_version_current',
    'runtime_artifact_watermark_current',
    'source_evidence_review_acceptance_current',
    'source_evidence_review_watermark_current',
    'selected_recommendations_current',
    'selected_recommendation_watermarks_current',
    'implementation_target_or_attempt_descriptor_current',
    'policy_version_effective',
    'decision_not_expired_revoked_or_superseded',
    'required_audit_timeline_refs_present',
  ],
  prohibitedSubstitutions: AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS,
  prohibitedActions: AAF_SCOPE_PROHIBITED_ACTIONS.single_site_improvement_implementation_authorization,
} as const

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE = 'single_site_content_approval' as const

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE = 'single_site_content_approval_evidence' as const

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE = 'single_site_improved_version_review' as const

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION = 'approve_single_site_content' as const

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS = [
  'tenant',
  'client',
  'site',
  'single_site_migration',
  'improved_version_review',
  'improved_version_review_status',
  'improved_version_review_watermark',
  'improved_candidate_site_version',
  'improved_candidate_site_version_watermark',
  'improved_runtime_artifact',
  'improved_runtime_artifact_watermark',
  'proposal_plan',
  'proposal_approval',
  'implementation_authorization',
  'improvement_execution_attempt',
  'selected_recommendations',
  'selected_recommendation_watermarks',
  'source_evidence_review',
  'source_evidence_review_status',
  'source_evidence_review_watermark',
  'clone_review',
  'clone_review_status',
  'clone_review_watermark',
  'clone_site_version',
  'clone_runtime_artifact',
  'limitations',
] as const

export type AafSingleSiteContentApprovalSubjectRef =
  (typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS)[number]

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS = [
  'improved_candidate_rendered_snapshot',
  'improved_candidate_content_snapshot',
  'improved_candidate_metadata_snapshot',
  'recommendation_coverage_summary',
  'selected_recommendation_application_status',
  'seo_aeo_metadata_summary',
  'headings_body_copy_cta_internal_link_review_summary',
  'alt_text_accessibility_content_caveats',
  'structured_data_summary',
  'legal_compliance_notes',
  'known_limitations',
  'unresolved_not_applied_recommendations',
  'operator_review_notes',
  'audit_timeline_refs',
] as const

export type AafSingleSiteContentApprovalEvidenceRef =
  (typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS)[number]

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS = [
  'improved_version_review_acceptance',
  'proposal_approval',
  'implementation_authorization',
  'source_evidence_review_acceptance',
  'clone_review_acceptance',
  'client_approval',
  'launch_approval',
  'publish_activation_approval',
  'domain_readiness',
  'ddom_readiness',
  'billing_subscription_readiness',
  'content_publish_event',
  'content_rollback_event',
  'preview_rendering',
  'public_runtime_rendering',
  'ai_provider_output',
  'generated_proposal_bundle',
  'command_center_status',
  'ops_inbox_item',
  'chat_transcript',
] as const

export type AafSingleSiteContentApprovalProhibitedSubstitution =
  (typeof AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS)[number]

export const AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT: AafScopeContract = {
  scope: AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  purpose:
    'Record a human, evidence-backed approval decision that the visible content of one accepted improved single-site candidate is content-ready for later client and launch approval work, without implying client, launch, publish, runtime, domain, DNS, billing, provider, AI, rollback, or UI-derived approval.',
  subjectType: AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
  evidencePackageType: AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
  allowedAction: AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
  replayClass: 'not_replayable',
  humanApprovalReplayable: false,
  allowedDecisionStatuses: ['granted', 'granted_with_limitations', 'rejected', 'revoked', 'expired', 'superseded', 'cancelled'],
  allowedGateResults: [
    'allowed',
    'approval_required',
    'evidence_missing',
    'evidence_stale',
    'approval_stale',
    'approval_superseded',
    'approval_revoked',
    'policy_error',
    'fail_closed',
  ],
  requiredSubjectRefs: AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS,
  requiredEvidenceRefs: AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS,
  requiredFreshnessBehavior: [
    'improved_version_review_latest_and_accepted',
    'improved_version_review_watermark_current',
    'improved_candidate_site_version_current',
    'improved_candidate_site_version_watermark_current',
    'improved_runtime_artifact_current',
    'improved_runtime_artifact_watermark_current',
    'proposal_plan_current',
    'proposal_approval_current',
    'implementation_authorization_current',
    'improvement_execution_attempt_current',
    'selected_recommendations_current',
    'selected_recommendation_watermarks_current',
    'source_evidence_review_acceptance_current',
    'source_evidence_review_watermark_current',
    'clone_review_acceptance_current',
    'clone_review_watermark_current',
    'clone_site_version_current',
    'clone_runtime_artifact_current',
    'limitations_current_and_carried_forward',
    'content_evidence_package_fresh_not_superseded',
    'policy_version_effective',
    'decision_not_expired_revoked_cancelled_or_superseded',
    'required_audit_timeline_refs_present',
  ],
  prohibitedSubstitutions: AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS,
  prohibitedActions: AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval,
} as const
