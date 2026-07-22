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
  AAF_SCOPE_PROHIBITED_ACTIONS,
  AAF_SCOPE_REPLAY_CLASS,
} from './aaf-contracts'

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  'apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql',
)

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, 'utf8')
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
  assert.deepEqual(AAF_RETENTION_CLASSES, ['mvp_operational', 'security', 'compliance_long', 'legal_hold'])
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
  const sql = readMigration()
  assertSqlContainsAll(AAF_APPROVAL_STATUSES, sql)
  assertSqlContainsAll(AAF_APPROVAL_SCOPES, sql)
  assertSqlContainsAll(AAF_POLICY_EVALUATION_RESULTS, sql)
  assertSqlContainsAll(AAF_AUDIT_EVENT_FAMILIES, sql)
  assertSqlContainsAll(AAF_AUDIT_SEVERITIES, sql)
  assertSqlContainsAll(AAF_REPLAY_CLASSES, sql)
  assertSqlContainsAll(AAF_EVIDENCE_PACKAGE_TYPES, sql)
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

test('AAF migration stores object refs and hashes instead of heavy evidence payloads', () => {
  const sql = readMigration()
  assert.match(sql, /storage_bucket text null/)
  assert.match(sql, /storage_key text null/)
  assert.match(sql, /item_hash text not null/)
  assert.doesNotMatch(sql, /evidence_payload/)
  assert.match(sql, /octet_length\(payload_json::text\) <= 65536/)
})
