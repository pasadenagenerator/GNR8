import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AgencyMembersError,
  buildListAgencyMembersSql,
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
