import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSiteWorkspaceScope, resolveSelectedRuntimeVersionIdForWorkspace } from '@/gnr8/site/site-workspace-read-model'

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

test('runtime version selection defaults to latest runtime when no variant is explicitly selected', () => {
  const selected = resolveSelectedRuntimeVersionIdForWorkspace({
    latestRuntimeSiteVersionId: 'latest-runtime-version-id',
    normalizedVariants: [
      { id: 'variant-a', siteVersionId: 'older-variant-version' },
      { id: 'variant-b', siteVersionId: 'other-variant-version' },
    ],
    selectedVariantId: null,
  })

  assert.equal(selected.selectedRuntimeSiteVersionId, 'latest-runtime-version-id')
  assert.equal(selected.selectedVariant, null)
})

test('runtime version selection honors variant site version only when variant is explicitly selected', () => {
  const selected = resolveSelectedRuntimeVersionIdForWorkspace({
    latestRuntimeSiteVersionId: 'latest-runtime-version-id',
    normalizedVariants: [
      { id: 'variant-a', siteVersionId: 'older-variant-version' },
      { id: 'variant-b', siteVersionId: 'explicit-variant-version' },
    ],
    selectedVariantId: 'variant-b',
  })

  assert.equal(selected.selectedRuntimeSiteVersionId, 'explicit-variant-version')
  assert.equal(selected.selectedVariant?.id, 'variant-b')
})
