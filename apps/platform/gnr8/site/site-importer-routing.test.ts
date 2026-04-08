import assert from 'node:assert/strict'
import test from 'node:test'

import {
  agencyClientSiteImportHref,
  canAccessClientScopedImporter,
  importerSuccessRedirectHref,
} from '@/gnr8/site/site-importer-routing'

test('agency owner/admin can access client-scoped importer', () => {
  assert.equal(canAccessClientScopedImporter('owner'), true)
  assert.equal(canAccessClientScopedImporter('admin'), true)
})

test('member and unknown actor are blocked from client-scoped importer', () => {
  assert.equal(canAccessClientScopedImporter('member'), false)
  assert.equal(canAccessClientScopedImporter(null), false)
})

test('client-scoped importer href never routes through superadmin', () => {
  const href = agencyClientSiteImportHref({
    clientId: '00000000-0000-4000-8000-000000000123',
    agencyId: '00000000-0000-4000-8000-000000000999',
    adminView: false,
  })

  assert.equal(
    href,
    '/gnr8/agency/clients/00000000-0000-4000-8000-000000000123/sites/import?agency=00000000-0000-4000-8000-000000000999',
  )
  assert.equal(href.includes('/superadmin'), false)
})

test('import success redirect targets scoped site workspace', () => {
  const href = importerSuccessRedirectHref({
    clientId: 'client_1',
    agencyId: 'agency_1',
    siteId: 'site_1',
    adminView: true,
  })

  assert.equal(href, '/gnr8/agency/clients/client_1/sites/site_1/overview?agency=agency_1&admin_view=1')
})
