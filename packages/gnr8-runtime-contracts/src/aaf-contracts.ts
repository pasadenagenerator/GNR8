export const AAF_APPROVAL_STATUSES = [
  'requested',
  'granted',
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
}
