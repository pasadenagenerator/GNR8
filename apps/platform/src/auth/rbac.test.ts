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
  assert.equal(canPerformAction(role, 'edit_agency_slug'), true)
  assert.equal(canPerformAction(role, 'edit_owner_profile'), true)
})

test('admin cannot edit agency slug or owner profile', () => {
  assert.equal(canPerformAction('admin', 'edit_agency_slug'), false)
  assert.equal(canPerformAction('admin', 'edit_owner_profile'), false)
})

test('owner can manage agency members', () => {
  assert.equal(canPerformAction('owner', 'view_members'), true)
  assert.equal(canPerformAction('owner', 'invite_user'), true)
  assert.equal(canPerformAction('owner', 'edit_member_role'), true)
  assert.equal(canPerformAction('owner', 'remove_member'), true)
})

test('admin and member are read-only for agency member mutations in v1', () => {
  assert.equal(canPerformAction('admin', 'view_members'), true)
  assert.equal(canPerformAction('admin', 'invite_user'), false)
  assert.equal(canPerformAction('admin', 'edit_member_role'), false)
  assert.equal(canPerformAction('admin', 'remove_member'), false)

  assert.equal(canPerformAction('member', 'view_members'), true)
  assert.equal(canPerformAction('member', 'invite_user'), false)
  assert.equal(canPerformAction('member', 'edit_member_role'), false)
  assert.equal(canPerformAction('member', 'remove_member'), false)
})
