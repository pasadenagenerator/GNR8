import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMembershipSelectAttempts,
  normalizeMembershipOrgColumnSupport,
  normalizeMembershipOrganizationId,
  resolveMembershipCanonicalOrgColumn,
  resolveMembershipOrgColumnExpression,
} from '@/src/auth/membership-org-column-compat'

test('buildMembershipSelectAttempts covers dual, organization_id-only, and org_id-only select strategies', () => {
  const attempts = buildMembershipSelectAttempts({
    baseColumns: ['id', 'role'],
    includeOwnerSetupCompleted: true,
  })

  assert.deepEqual(
    attempts.map((attempt) => attempt.select),
    [
      'id,role,organization_id,org_id,owner_setup_completed',
      'id,role,organization_id,owner_setup_completed',
      'id,role,org_id,owner_setup_completed',
      'id,role,organization_id,org_id',
      'id,role,organization_id',
      'id,role,org_id',
    ],
  )
  assert.equal(attempts[0]?.inferOwnerSetupCompletedAsFalse, false)
  assert.equal(attempts[3]?.inferOwnerSetupCompletedAsFalse, true)
})

test('normalizeMembershipOrganizationId resolves organization_id and legacy org_id', () => {
  assert.equal(normalizeMembershipOrganizationId({ organization_id: 'a', org_id: 'b' }), 'a')
  assert.equal(normalizeMembershipOrganizationId({ organization_id: null, org_id: 'b' }), 'b')
  assert.equal(normalizeMembershipOrganizationId({ organization_id: '', org_id: '' }), null)
})

test('resolveMembershipOrgColumnExpression supports all schema variants', () => {
  assert.equal(
    resolveMembershipOrgColumnExpression({
      columns: { hasOrganizationId: true, hasOrgId: true },
      tableAlias: 'm',
    }),
    'coalesce(m.organization_id, m.org_id)',
  )
  assert.equal(
    resolveMembershipOrgColumnExpression({
      columns: { hasOrganizationId: true, hasOrgId: false },
      tableAlias: 'm',
    }),
    'm.organization_id',
  )
  assert.equal(
    resolveMembershipOrgColumnExpression({
      columns: { hasOrganizationId: false, hasOrgId: true },
      tableAlias: 'm',
    }),
    'm.org_id',
  )
})

test('resolveMembershipCanonicalOrgColumn prefers organization_id and fails closed when unsupported', () => {
  assert.equal(
    resolveMembershipCanonicalOrgColumn({
      columns: { hasOrganizationId: true, hasOrgId: true },
    }),
    'organization_id',
  )
  assert.equal(
    resolveMembershipCanonicalOrgColumn({
      columns: { hasOrganizationId: false, hasOrgId: true },
    }),
    'org_id',
  )

  assert.throws(
    () =>
      resolveMembershipCanonicalOrgColumn({
        columns: { hasOrganizationId: false, hasOrgId: false },
        missingColumnMessage: 'schema mismatch',
      }),
    (error) => error instanceof Error && error.message === 'schema mismatch',
  )
})

test('normalizeMembershipOrgColumnSupport detects org column support correctly', () => {
  const columns = normalizeMembershipOrgColumnSupport({
    columnNames: ['id', 'organization_id', 'role'],
  })
  assert.equal(columns.hasOrganizationId, true)
  assert.equal(columns.hasOrgId, false)
})
