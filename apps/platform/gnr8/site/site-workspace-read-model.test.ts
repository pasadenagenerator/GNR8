import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSiteWorkspaceScope } from '@/gnr8/site/site-workspace-read-model'

const AGENCY_ID = '00000000-0000-4000-8000-000000000011'
const CLIENT_ID = '00000000-0000-4000-8000-000000000101'
const SITE_ID = '00000000-0000-4000-8000-000000009001'

test('assertSiteWorkspaceScope allows site in resolved client and agency scope', () => {
  assert.doesNotThrow(() => {
    assertSiteWorkspaceScope({
      clientOrg: {
        id: CLIENT_ID,
        name: 'Client A',
        agency_id: AGENCY_ID,
        organization_type: 'client',
      },
      site: {
        id: SITE_ID,
        org_id: CLIENT_ID,
        agency_id: AGENCY_ID,
        domain: 'alpha.example.com',
        status: 'live',
      },
      expectedAgencyId: AGENCY_ID,
      expectedClientId: CLIENT_ID,
      expectedSiteId: SITE_ID,
    })
  })
})

test('assertSiteWorkspaceScope fails closed when site leaks across client scope', () => {
  assert.throws(
    () => {
      assertSiteWorkspaceScope({
        clientOrg: {
          id: CLIENT_ID,
          name: 'Client A',
          agency_id: AGENCY_ID,
          organization_type: 'client',
        },
        site: {
          id: SITE_ID,
          org_id: '00000000-0000-4000-8000-000000000202',
          agency_id: AGENCY_ID,
          domain: 'alpha.example.com',
          status: 'live',
        },
        expectedAgencyId: AGENCY_ID,
        expectedClientId: CLIENT_ID,
        expectedSiteId: SITE_ID,
      })
    },
    /fail-closed policy/i,
  )
})
