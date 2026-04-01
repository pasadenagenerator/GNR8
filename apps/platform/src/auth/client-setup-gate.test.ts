import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateClientSetupStatusForClient } from '@/src/auth/client-setup-gate'

const CLIENT_ALPHA = '00000000-0000-4000-8000-000000000111'
const CLIENT_BRAVO = '00000000-0000-4000-8000-000000000222'
const AGENCY_MAIN = '00000000-0000-4000-8000-000000000333'

test('client setup completed unlocks selected client scope', () => {
  const status = evaluateClientSetupStatusForClient({
    clientId: CLIENT_ALPHA,
    agencyId: AGENCY_MAIN,
    contexts: [
      {
        membership_id: '10000000-0000-4000-8000-000000000001',
        client_id: CLIENT_ALPHA,
        agency_id: AGENCY_MAIN,
        client_setup_completed: true,
        first_name: 'Jamie',
        last_name: 'Lane',
        mobile_number: '+1 555 111 2222',
      },
    ],
  })

  assert.equal(status.hasClientMembership, true)
  assert.equal(status.isCompleted, true)
  assert.deepEqual(status.membershipIds, ['10000000-0000-4000-8000-000000000001'])
  assert.equal(status.firstName, 'Jamie')
  assert.equal(status.surname, 'Lane')
  assert.equal(status.mobileNumber, '+1 555 111 2222')
})

test('missing selected-client membership blocks setup resolution', () => {
  const status = evaluateClientSetupStatusForClient({
    clientId: CLIENT_ALPHA,
    agencyId: AGENCY_MAIN,
    contexts: [
      {
        membership_id: '20000000-0000-4000-8000-000000000001',
        client_id: CLIENT_BRAVO,
        agency_id: AGENCY_MAIN,
        client_setup_completed: true,
        first_name: null,
        last_name: null,
        mobile_number: null,
      },
    ],
  })

  assert.equal(status.hasClientMembership, false)
  assert.equal(status.isCompleted, true)
  assert.deepEqual(status.membershipIds, [])
})

test('client setup stays blocked while selected client membership is incomplete', () => {
  const status = evaluateClientSetupStatusForClient({
    clientId: CLIENT_ALPHA,
    agencyId: AGENCY_MAIN,
    contexts: [
      {
        membership_id: '30000000-0000-4000-8000-000000000001',
        client_id: CLIENT_ALPHA,
        agency_id: AGENCY_MAIN,
        client_setup_completed: false,
        first_name: null,
        last_name: null,
        mobile_number: null,
      },
    ],
  })

  assert.equal(status.hasClientMembership, true)
  assert.equal(status.isCompleted, false)
  assert.deepEqual(status.membershipIds, ['30000000-0000-4000-8000-000000000001'])
})

test('status flips completed after profile write for selected client membership', () => {
  const baseContext = {
    membership_id: '40000000-0000-4000-8000-000000000001',
    client_id: CLIENT_ALPHA,
    agency_id: AGENCY_MAIN,
    client_setup_completed: false,
    first_name: null,
    last_name: null,
    mobile_number: null,
  }

  const before = evaluateClientSetupStatusForClient({
    clientId: CLIENT_ALPHA,
    agencyId: AGENCY_MAIN,
    contexts: [baseContext],
  })

  const after = evaluateClientSetupStatusForClient({
    clientId: CLIENT_ALPHA,
    agencyId: AGENCY_MAIN,
    contexts: [{ ...baseContext, client_setup_completed: true, first_name: 'Ava', last_name: 'Mills', mobile_number: '+1 555 333 4444' }],
  })

  assert.equal(before.isCompleted, false)
  assert.equal(after.isCompleted, true)
  assert.deepEqual(after.membershipIds, before.membershipIds)
  assert.equal(after.firstName, 'Ava')
  assert.equal(after.surname, 'Mills')
  assert.equal(after.mobileNumber, '+1 555 333 4444')
})
