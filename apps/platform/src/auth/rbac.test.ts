import assert from 'node:assert/strict'
import test from 'node:test'

import { canPerformAction, getUserRoleForAgency } from '@/src/auth/rbac'

test('owner can delete agency', () => {
  assert.equal(canPerformAction('owner', 'delete_agency'), true)
})

test('admin cannot delete agency', () => {
  assert.equal(canPerformAction('admin', 'delete_agency'), false)
})

test('member cannot run migration', () => {
  assert.equal(canPerformAction('member', 'run_migration'), false)
})

test('admin can run migration', () => {
  assert.equal(canPerformAction('admin', 'run_migration'), true)
})

test('superadmin resolves in admin_view context regardless of membership', () => {
  const role = getUserRoleForAgency(
    {
      isSuperadmin: true,
      memberships: [],
    },
    '00000000-0000-4000-8000-000000000011',
  )

  assert.equal(role, 'superadmin')
  assert.equal(canPerformAction(role, 'publish'), true)
})
