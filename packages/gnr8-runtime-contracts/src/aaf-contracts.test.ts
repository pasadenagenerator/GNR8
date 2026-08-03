import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  AAF_APPROVAL_SCOPES,
  AAF_APPROVAL_STATUSES,
  AAF_AUDIT_EVENT_FAMILIES,
  AAF_AUDIT_SEVERITIES,
  AAF_EVIDENCE_PACKAGE_TYPES,
  AAF_GATE_RESULTS,
  AAF_POLICY_EVALUATION_RESULTS,
  AAF_PRIVACY_LABELS,
  AAF_REDACTION_LABELS,
  AAF_REPLAY_CLASSES,
  AAF_RETENTION_CLASSES,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
  AAF_SCOPE_PROHIBITED_ACTIONS,
  AAF_SCOPE_REPLAY_CLASS,
} from './aaf-contracts'

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql',
)
const AAF_SCOPE_EXPANSION_MIGRATION_PATH = path.resolve(
  process.cwd(),
  'apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql',
)
const AAF_GRANTED_WITH_LIMITATIONS_MIGRATION_PATH = path.resolve(
  process.cwd(),
  'apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql',
)
const AAF_CONTENT_APPROVAL_MIGRATION_PATH = path.resolve(
  process.cwd(),
  'apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql',
)

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8')
}

function readAafVocabularyMigrations(): string {
  return [
    MIGRATION_PATH,
    AAF_SCOPE_EXPANSION_MIGRATION_PATH,
    AAF_GRANTED_WITH_LIMITATIONS_MIGRATION_PATH,
    AAF_CONTENT_APPROVAL_MIGRATION_PATH,
  ]
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n')
}

function assertSqlContainsAll(values: readonly string[], sql: string): void {
  for (const value of values) {
    assert.match(sql, new RegExp(`'${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`))
  }
}

test('AAF approval statuses, scopes, and policy results remain canonical', () => {
  assert.deepEqual(AAF_APPROVAL_STATUSES, [
    'requested',
    'granted',
    'granted_with_limitations',
    'rejected',
    'revoked',
    'expired',
    'superseded',
    'cancelled',
    'not_required_by_policy',
  ])
  assert.deepEqual(AAF_APPROVAL_SCOPES, [
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
  ])
  assert.deepEqual(AAF_POLICY_EVALUATION_RESULTS, [
    'approval_required',
    'approval_not_required_by_policy',
    'approval_blocked',
    'approval_stale',
    'approval_superseded',
    'emergency_exception_required',
    'emergency_exception_granted',
    'policy_error',
  ])
})

test('AAF audit and evidence vocabularies remain canonical', () => {
  assert.deepEqual(AAF_AUDIT_EVENT_FAMILIES, [
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
  ])
  assert.deepEqual(AAF_AUDIT_SEVERITIES, ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'security'])
  assert.deepEqual(AAF_REPLAY_CLASSES, [
    'not_replayable',
    'deterministic_replay',
    'manual_retry_only',
    'forbidden_replay',
    'compensating_only',
  ])
  assert.deepEqual(AAF_EVIDENCE_PACKAGE_TYPES, [
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
  ])
})

test('AAF storage labels and gate results are exposed for persistence consumers', () => {
  assert.deepEqual(AAF_PRIVACY_LABELS, [
    'public_operational',
    'internal_operational',
    'client_confidential',
    'credential_sensitive',
    'billing_sensitive',
    'provider_sensitive',
    'legal_sensitive',
  ])
  assert.deepEqual(AAF_REDACTION_LABELS, [
    'none',
    'redaction_required',
    'redacted',
    'credential_redacted',
    'billing_redacted',
    'provider_redacted',
    'legal_redacted',
  ])
  assert.deepEqual(AAF_RETENTION_CLASSES, [
    'short_operational',
    'mvp_operational',
    'security',
    'compliance_long',
    'legal_hold',
  ])
  assert.deepEqual(AAF_GATE_RESULTS, [
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
  ])
})

test('AAF SQL migration contains the canonical enum values', () => {
  const sql = readAafVocabularyMigrations()
  assertSqlContainsAll(AAF_APPROVAL_STATUSES, sql)
  assertSqlContainsAll(AAF_APPROVAL_SCOPES, sql)
  assertSqlContainsAll(AAF_POLICY_EVALUATION_RESULTS, sql)
  assertSqlContainsAll(AAF_AUDIT_EVENT_FAMILIES, sql)
  assertSqlContainsAll(AAF_AUDIT_SEVERITIES, sql)
  assertSqlContainsAll(AAF_REPLAY_CLASSES, sql)
  assertSqlContainsAll(AAF_EVIDENCE_PACKAGE_TYPES, sql)
  assertSqlContainsAll(AAF_RETENTION_CLASSES, sql)
  assertSqlContainsAll(AAF_GATE_RESULTS, sql)
})

test('AAF migration creates the required canonical table surface', () => {
  const sql = readMigration()
  for (const tableName of [
    'gnr8_aaf_approval_requests',
    'gnr8_aaf_approval_decisions',
    'gnr8_aaf_approval_policies',
    'gnr8_aaf_approval_evidence_links',
    'gnr8_aaf_approval_scope_definitions',
    'gnr8_aaf_approval_supersession_links',
    'gnr8_aaf_approval_revocations',
    'gnr8_aaf_approval_policy_evaluations',
    'gnr8_aaf_approval_subject_refs',
    'gnr8_aaf_audit_events',
    'gnr8_aaf_audit_event_refs',
    'gnr8_aaf_audit_partial_timeline_markers',
    'gnr8_aaf_evidence_packages',
    'gnr8_aaf_evidence_package_items',
    'gnr8_aaf_evidence_package_source_refs',
    'gnr8_aaf_evidence_package_freshness_checks',
    'gnr8_aaf_evidence_package_redactions',
    'gnr8_aaf_evidence_package_supersession',
    'gnr8_aaf_evidence_package_audit_links',
    'gnr8_aaf_action_gate_attempts',
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${tableName}\\b`))
    assert.match(sql, new RegExp(`alter table public\\.${tableName} enable row level security`))
  }
})

test('AAF decisions, evidence, audit, and gate attempts are modeled as append-only', () => {
  const sql = readMigration()
  for (const tableName of [
    'gnr8_aaf_approval_decisions',
    'gnr8_aaf_evidence_packages',
    'gnr8_aaf_audit_events',
    'gnr8_aaf_action_gate_attempts',
  ]) {
    assert.match(sql, new RegExp(`trg_${tableName}_append_only`))
    assert.match(sql, new RegExp(`before update or delete on public\\.${tableName}`))
  }
})

test('AAF audit events require the core actor subject correlation envelope', () => {
  const sql = readMigration()
  for (const requiredColumn of [
    'event_name text not null',
    'event_family text not null',
    'actor_type text not null',
    'actor_id text not null',
    'actor_role text not null',
    'subject_type text not null',
    'subject_id text not null',
    'correlation_id text not null',
    'idempotency_key text not null',
  ]) {
    assert.match(sql, new RegExp(requiredColumn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('not_required_by_policy is explicit and policy-backed', () => {
  const sql = readMigration()
  assert.equal(AAF_APPROVAL_STATUSES.includes('not_required_by_policy'), true)
  assert.equal(AAF_POLICY_EVALUATION_RESULTS.includes('approval_not_required_by_policy'), true)
  assert.match(sql, /status <> 'not_required_by_policy' or policy_evaluation_id is not null/)
})

test('scope contract prevents approval-scope overreach', () => {
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.domain_action.includes('dns_mutation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.domain_action.includes('registrar_mutation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.domain_action.includes('openprovider_mutation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.domain_exception.includes('publish_activation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.launch_signoff.includes('publish_activation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.client_review.includes('publish_activation'), true)
  assert.equal(AAF_SCOPE_REPLAY_CLASS.publish_activation, 'forbidden_replay')
  assert.equal(AAF_SCOPE_REPLAY_CLASS.rollback, 'forbidden_replay')
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.ai_advisory_plan_acceptance.includes('ai_execution'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.ai_advisory_plan_acceptance.includes('publish_activation'), true)
})

test('single-site implementation authorization contract is explicit and non-replayable', () => {
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE, 'single_site_improvement_implementation_authorization')
  assert.equal(
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
    'single_site_improvement_implementation_authorization_evidence',
  )
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE, 'single_site_improvement_proposal_plan')
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_ACTION, 'start_single_site_improvement_implementation')
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE], 'not_replayable')
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.replayClass, 'not_replayable')
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.humanApprovalReplayable, false)
  assert.deepEqual(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.allowedDecisionStatuses, [
    'granted',
    'granted_with_limitations',
    'rejected',
    'revoked',
    'expired',
    'superseded',
    'cancelled',
  ])
  assert.equal(
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.allowedGateResults.includes('not_required_by_policy'),
    false,
  )
  assert.equal(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.allowedGateResults.includes('allowed'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_improvement_implementation_authorization.includes('publish_activation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_improvement_implementation_authorization.includes('content_approval'), true)
})

test('single-site implementation authorization pins required subject and evidence refs', () => {
  assert.deepEqual(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS, [
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
  ])
  assert.deepEqual(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS, [
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
  ])
  assert.deepEqual(
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.requiredSubjectRefs,
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_SUBJECT_REFS,
  )
  assert.deepEqual(
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_CONTRACT.requiredEvidenceRefs,
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_REQUIRED_EVIDENCE_REFS,
  )
})

test('single-site implementation authorization prohibits substitute approvals and projections', () => {
  assert.deepEqual(AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_PROHIBITED_SUBSTITUTIONS, [
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
  ])
  for (const prohibitedAction of [
    'proposal_approval',
    'clone_review_acceptance',
    'client_approval',
    'content_approval',
    'launch_approval',
    'publish_activation',
    'domain_readiness',
    'ddom_readiness',
    'ai_approval',
    'ai_execution',
    'command_center_status',
    'ops_inbox_resolution',
    'chat_transcript_authorization',
    'generated_proposal_bundle_authorization',
  ]) {
    assert.equal(
      AAF_SCOPE_PROHIBITED_ACTIONS.single_site_improvement_implementation_authorization.includes(prohibitedAction),
      true,
    )
  }
})

test('single-site content approval contract is explicit and non-replayable', () => {
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE, 'single_site_content_approval')
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_EVIDENCE_TYPE, 'single_site_content_approval_evidence')
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_SUBJECT_TYPE, 'single_site_improved_version_review')
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_ACTION, 'approve_single_site_content')
  assert.equal(AAF_SCOPE_REPLAY_CLASS[AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE], 'not_replayable')
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.replayClass, 'not_replayable')
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.humanApprovalReplayable, false)
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedDecisionStatuses, [
    'granted',
    'granted_with_limitations',
    'rejected',
    'revoked',
    'expired',
    'superseded',
    'cancelled',
  ])
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedGateResults.includes('not_required_by_policy'), false)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedGateResults.includes('allowed'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredFreshnessBehavior.includes('content_evidence_package_fresh_not_superseded'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredFreshnessBehavior.includes('limitations_current_and_carried_forward'), true)
})

test('single-site content approval pins required subject refs to one candidate and migration context', () => {
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS, [
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
  ])
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredSubjectRefs, AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS)
})

test('single-site content approval pins required evidence refs without making preview approval truth', () => {
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS, [
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
  ])
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredEvidenceRefs, AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS.includes('improved_candidate_rendered_snapshot'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS.includes('preview_rendering'), true)
})

test('single-site content approval prohibits substitute approvals, readiness, projections, and generated output', () => {
  assert.deepEqual(AAF_SINGLE_SITE_CONTENT_APPROVAL_PROHIBITED_SUBSTITUTIONS, [
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
  ])
  for (const prohibitedAction of [
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
  ]) {
    assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes(prohibitedAction), true)
  }
})

test('single-site content approval cannot imply adjacent approval scopes', () => {
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.scope === AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE, false)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.evidencePackageType === AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE, false)
  for (const adjacentScope of [
    'content_publish',
    'client_review',
    'launch_signoff',
    'publish_activation',
    AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  ]) {
    assert.equal(adjacentScope === AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE, false)
  }
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('client_approval'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('launch_approval'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('publish_activation'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('domain_readiness'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('dns_readiness'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('billing_readiness'), true)
  assert.equal(AAF_SCOPE_PROHIBITED_ACTIONS.single_site_content_approval.includes('runtime_mutation'), true)
})

test('single-site content approval supports scoped limited grants with carried limitations', () => {
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.allowedDecisionStatuses.includes('granted_with_limitations'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_SUBJECT_REFS.includes('limitations'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_REQUIRED_EVIDENCE_REFS.includes('known_limitations'), true)
  assert.equal(AAF_SINGLE_SITE_CONTENT_APPROVAL_CONTRACT.requiredFreshnessBehavior.includes('limitations_current_and_carried_forward'), true)
})

test('AAF migration stores object refs and hashes instead of heavy evidence payloads', () => {
  const sql = readMigration()
  assert.match(sql, /storage_bucket text null/)
  assert.match(sql, /storage_key text null/)
  assert.match(sql, /item_hash text not null/)
  assert.doesNotMatch(sql, /evidence_payload/)
  assert.match(sql, /octet_length\(payload_json::text\) <= 65536/)
})
