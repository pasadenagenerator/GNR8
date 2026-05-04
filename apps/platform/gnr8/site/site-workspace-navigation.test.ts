import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSiteWorkspaceTab, SITE_WORKSPACE_TABS, siteWorkspaceHref } from '@/gnr8/site/site-workspace-navigation'

test('SITE_WORKSPACE_TABS exposes the expected foundational tabs', () => {
  assert.deepEqual(SITE_WORKSPACE_TABS, ['overview', 'structure', 'design', 'preview', 'content', 'settings'])
})

test('normalizeSiteWorkspaceTab falls back safely', () => {
  assert.equal(normalizeSiteWorkspaceTab('design'), 'design')
  assert.equal(normalizeSiteWorkspaceTab('unknown-tab'), 'overview')
})

test('siteWorkspaceHref builds scoped site route href with agency query', () => {
  const href = siteWorkspaceHref({
    clientId: 'client_1',
    siteId: 'site_1',
    tab: 'preview',
    agencyId: 'agency_1',
    adminView: true,
  })

  assert.equal(href, '/gnr8/agency/clients/client_1/sites/site_1/preview?agency=agency_1&admin_view=1')
})
