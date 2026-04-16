import assert from 'node:assert/strict'
import test from 'node:test'

import {
  agencyClientSiteCreateHref,
  agencyClientSiteImportHref,
  canAccessClientScopedImporter,
  importerSuccessRedirectHref,
  getScopedSiteImportCanonicalPath,
  listNonCanonicalScopedImportPaths,
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

test('client-scoped site create href is deterministic and scoped to agency query context', () => {
  const href = agencyClientSiteCreateHref({
    clientId: '00000000-0000-4000-8000-000000000123',
    agencyId: '00000000-0000-4000-8000-000000000999',
    adminView: true,
  })

  assert.equal(
    href,
    '/gnr8/agency/clients/00000000-0000-4000-8000-000000000123/sites/new?agency=00000000-0000-4000-8000-000000000999&admin_view=1',
  )
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

test('scoped import path exposes canonical flow marker and legacy paths separately', () => {
  assert.equal(getScopedSiteImportCanonicalPath(), 'scoped_snapshot_import_v1')
  assert.deepEqual(listNonCanonicalScopedImportPaths(), [
    '/api/gnr8/import/url-and-save',
    '/api/gnr8/import/html-and-save',
    '/api/gnr8/runtime/migrate/url',
  ])
})
