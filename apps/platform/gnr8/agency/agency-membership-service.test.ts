import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgencyMembersError,
  buildAgencyMembershipUpsertSql,
  buildListAgencyMembersSql,
  buildScopedMembershipDeleteSql,
  buildScopedMembershipLookupSql,
  buildScopedMembershipRoleUpdateSql,
  resolveMembershipOrgColumnExpression,
} from '@/gnr8/agency/agency-membership-service'

test('resolveMembershipOrgColumnExpression supports legacy org_id-only schema', () => {
  const expression = resolveMembershipOrgColumnExpression({
    hasOrganizationId: false,
    hasOrgId: true,
  })

  assert.equal(expression, 'm.org_id')
  assert.match(buildListAgencyMembersSql(expression), /where m\.org_id = \$1::uuid/)
})

test('resolveMembershipOrgColumnExpression supports dual-column compatibility schema', () => {
  const expression = resolveMembershipOrgColumnExpression({
    hasOrganizationId: true,
    hasOrgId: true,
  })

  assert.equal(expression, 'coalesce(m.organization_id, m.org_id)')
  assert.match(buildListAgencyMembersSql(expression), /where coalesce\(m\.organization_id, m\.org_id\) = \$1::uuid/)
})

test('resolveMembershipOrgColumnExpression supports organization_id-only schema', () => {
  const expression = resolveMembershipOrgColumnExpression({
    hasOrganizationId: true,
    hasOrgId: false,
  })

  assert.equal(expression, 'm.organization_id')
  assert.match(buildListAgencyMembersSql(expression), /where m\.organization_id = \$1::uuid/)
})

test('resolveMembershipOrgColumnExpression fails closed without supported membership org columns', () => {
  assert.throws(
    () =>
      resolveMembershipOrgColumnExpression({
        hasOrganizationId: false,
        hasOrgId: false,
      }),
    (error) =>
      error instanceof AgencyMembersError &&
      error.message === 'memberships schema mismatch: expected organization_id and/or org_id',
  )
})

test('buildAgencyMembershipUpsertSql supports org_id-only writes', () => {
  const sql = buildAgencyMembershipUpsertSql({
    hasOrganizationId: false,
    hasOrgId: true,
  })
  assert.match(sql, /insert into public\.memberships \(id, user_id, org_id, role\)/)
  assert.doesNotMatch(sql, /organization_id/)
})

test('buildAgencyMembershipUpsertSql supports organization_id-only writes', () => {
  const sql = buildAgencyMembershipUpsertSql({
    hasOrganizationId: true,
    hasOrgId: false,
  })
  assert.match(sql, /insert into public\.memberships \(id, user_id, organization_id, role\)/)
  assert.doesNotMatch(sql, /org_id = \$3::uuid/)
})

test('buildAgencyMembershipUpsertSql supports dual-column writes', () => {
  const sql = buildAgencyMembershipUpsertSql({
    hasOrganizationId: true,
    hasOrgId: true,
  })
  assert.match(sql, /insert into public\.memberships \(id, user_id, organization_id, org_id, role\)/)
  assert.match(sql, /coalesce\(m\.organization_id, m\.org_id\) = \$3::uuid/)
})

test('scoped membership sql builders are schema-aware', () => {
  const scopedLookup = buildScopedMembershipLookupSql({
    hasOrganizationId: false,
    hasOrgId: true,
  })
  const scopedRoleUpdate = buildScopedMembershipRoleUpdateSql({
    hasOrganizationId: true,
    hasOrgId: false,
  })
  const scopedDelete = buildScopedMembershipDeleteSql({
    hasOrganizationId: true,
    hasOrgId: true,
  })

  assert.match(scopedLookup, /m\.org_id = \$2::uuid/)
  assert.match(scopedRoleUpdate, /m\.organization_id = \$2::uuid/)
  assert.match(scopedDelete, /coalesce\(m\.organization_id, m\.org_id\) = \$2::uuid/)
})
