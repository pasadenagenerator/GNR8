import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateOwnerSetupStatusForAgency } from '@/src/auth/owner-setup-gate'

const AGENCY_ALPHA = '00000000-0000-4000-8000-000000000111'
const AGENCY_BRAVO = '00000000-0000-4000-8000-000000000222'

test('setup completion unlocks agency workspace when owner memberships for agency are completed', () => {
  const status = evaluateOwnerSetupStatusForAgency({
    agencyId: AGENCY_ALPHA,
    contexts: [
      {
        membership_id: '10000000-0000-4000-8000-000000000001',
        agency_id: AGENCY_ALPHA,
        owner_setup_completed: true,
      },
    ],
  })

  assert.equal(status.hasOwnerMembership, true)
  assert.equal(status.isCompleted, true)
  assert.deepEqual(status.membershipIds, ['10000000-0000-4000-8000-000000000001'])
})

test('wrong-agency membership does not unlock selected agency', () => {
  const status = evaluateOwnerSetupStatusForAgency({
    agencyId: AGENCY_ALPHA,
    contexts: [
      {
        membership_id: '20000000-0000-4000-8000-000000000001',
        agency_id: AGENCY_BRAVO,
        owner_setup_completed: true,
      },
    ],
  })

  assert.equal(status.hasOwnerMembership, false)
  assert.equal(status.isCompleted, true)
  assert.deepEqual(status.membershipIds, [])
})

test('multi-membership users resolve membership ids for selected agency only', () => {
  const status = evaluateOwnerSetupStatusForAgency({
    agencyId: AGENCY_ALPHA,
    contexts: [
      {
        membership_id: '30000000-0000-4000-8000-000000000001',
        agency_id: AGENCY_ALPHA,
        owner_setup_completed: false,
      },
      {
        membership_id: '30000000-0000-4000-8000-000000000002',
        agency_id: AGENCY_BRAVO,
        owner_setup_completed: true,
      },
    ],
  })

  assert.equal(status.hasOwnerMembership, true)
  assert.equal(status.isCompleted, false)
  assert.deepEqual(status.membershipIds, ['30000000-0000-4000-8000-000000000001'])
})

test('no redirect loop after successful completion for selected agency', () => {
  const contextsBefore = [
    {
      membership_id: '40000000-0000-4000-8000-000000000001',
      agency_id: AGENCY_ALPHA,
      owner_setup_completed: false,
    },
  ]

  const before = evaluateOwnerSetupStatusForAgency({
    agencyId: AGENCY_ALPHA,
    contexts: contextsBefore,
  })

  const after = evaluateOwnerSetupStatusForAgency({
    agencyId: AGENCY_ALPHA,
    contexts: contextsBefore.map((context) => ({ ...context, owner_setup_completed: true })),
  })

  assert.equal(before.isCompleted, false)
  assert.equal(after.isCompleted, true)
  assert.deepEqual(after.membershipIds, before.membershipIds)
})
