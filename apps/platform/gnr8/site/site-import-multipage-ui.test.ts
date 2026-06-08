import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS,
  DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS,
  MULTI_PAGE_IMPORT_STATIC_SITE_GUARDRAIL,
  buildSiteImportRequestPayload,
  siteImportSuccessStatusText,
} from '@/gnr8/site/site-import-multipage-ui'
import { importerSuccessRedirectHref } from '@/gnr8/site/site-importer-routing'

test('single-page import payload is unchanged by default', () => {
  const payload = buildSiteImportRequestPayload({
    url: ' https://www.viroidoc.eu/ ',
    siteName: ' ',
    agencyId: 'agency-1',
    adminView: false,
  })

  assert.deepEqual(payload, {
    url: 'https://www.viroidoc.eu/',
    siteName: null,
    agencyId: 'agency-1',
    adminView: false,
  })
  assert.equal('multiPageDiscovery' in payload, false)
})

test('enabled multi-page import sends expected default payload', () => {
  const payload = buildSiteImportRequestPayload({
    url: 'https://www.viroidoc.eu/',
    siteName: null,
    agencyId: 'agency-1',
    adminView: true,
    multiPageImportEnabled: true,
  })

  assert.deepEqual(payload.multiPageDiscovery, {
    enabled: true,
    acquireHtml: true,
    assembleRawArtifactPages: true,
    limits: DEFAULT_MULTI_PAGE_IMPORT_DISCOVERY_LIMITS,
    htmlAcquisitionLimits: DEFAULT_MULTI_PAGE_IMPORT_HTML_ACQUISITION_LIMITS,
  })
})

test('edited multi-page import limits are respected', () => {
  const payload = buildSiteImportRequestPayload({
    url: 'https://example.com/',
    siteName: 'Example',
    agencyId: 'agency-1',
    multiPageImportEnabled: true,
    multiPageLimits: {
      maxRoutes: 12,
      maxDepth: 3,
      maxLinksPerPage: 40,
      maxAcquiredPages: 7,
      maxBytesPerPage: 500_000,
      requestTimeoutMs: 4_500,
    },
  })

  assert.equal(payload.multiPageDiscovery?.limits.maxRoutes, 12)
  assert.equal(payload.multiPageDiscovery?.limits.maxDepth, 3)
  assert.equal(payload.multiPageDiscovery?.limits.maxLinksPerPage, 40)
  assert.equal(payload.multiPageDiscovery?.htmlAcquisitionLimits.maxPages, 7)
  assert.equal(payload.multiPageDiscovery?.htmlAcquisitionLimits.maxBytesPerPage, 500_000)
  assert.equal(payload.multiPageDiscovery?.htmlAcquisitionLimits.requestTimeoutMs, 4_500)
  assert.equal(payload.multiPageDiscovery?.limits.maxTemplateLinksPerRoute, 30)
  assert.equal(payload.multiPageDiscovery?.limits.maxSitemaps, 5)
  assert.equal(payload.multiPageDiscovery?.limits.maxUrlsFromSitemaps, 100)
  assert.equal(payload.multiPageDiscovery?.limits.maxNestedSitemaps, 5)
})

test('import success flow targets Site Workspace', () => {
  const redirectTo = importerSuccessRedirectHref({
    clientId: 'client-1',
    agencyId: 'agency-1',
    siteId: 'site-1',
    adminView: false,
  })

  assert.equal(redirectTo, '/gnr8/agency/clients/client-1/sites/site-1/overview?agency=agency-1')
})

test('warning status text directs operator to Site Workspace summary', () => {
  assert.equal(
    siteImportSuccessStatusText({ multiPageValidationStatus: 'ready_with_warnings' }),
    'Import completed with warnings. Review Multi-Page Import summary in Site Workspace.',
  )
  assert.equal(
    siteImportSuccessStatusText({ warning: 'Imported using raw HTML fallback.' }),
    'Import completed with warnings. Review Multi-Page Import summary in Site Workspace.',
  )
})

test('multi-page guardrail text is static-site scoped', () => {
  assert.equal(
    MULTI_PAGE_IMPORT_STATIC_SITE_GUARDRAIL,
    'Multi-page import is for static websites. Dynamic content, forms, authenticated areas, and commerce are not imported yet.',
  )
})

test('multi-page import payload does not trigger publish or public activation behavior', () => {
  const payload = buildSiteImportRequestPayload({
    url: 'https://www.viroidoc.eu/',
    agencyId: 'agency-1',
    multiPageImportEnabled: true,
  }) as Record<string, unknown>

  assert.equal('publish' in payload, false)
  assert.equal('activate' in payload, false)
  assert.equal('publicPreview' in payload, false)
  assert.equal('production' in payload, false)
})
