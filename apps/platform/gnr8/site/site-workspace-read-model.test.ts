import assert from 'node:assert/strict'
import test from 'node:test'

import {
  __siteWorkspaceReadModelTestUtils,
  assertSiteWorkspaceScope,
  resolveSelectedRuntimeVersionIdForWorkspace,
} from '@/gnr8/site/site-workspace-read-model'

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

test('import fidelity signals are parsed from semantic signal labels', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportFidelitySignals([
    {
      id: 'page-row',
      site_version_id: 'sv-1',
      page_id: 'page-1',
      path: '/',
      title: 'Home',
      structure_model: null,
      migration_governance: null,
      semantic_signals: [
        { label: 'import.source_mode:rendered_dom' },
        { label: 'import.fidelity_status:high_fidelity_import' },
        { label: 'import.rendered_capture_status:available' },
        { label: 'import.rendered_dom_quality:strong' },
        { label: 'import.screenshot_count:2' },
        { label: 'import.computed_style_sample_count:6' },
        { label: 'import.diagnostic:RENDERED_CAPTURE_PARTIAL' },
      ],
    } as any,
  ])

  assert.equal(parsed.sourceMode, 'rendered_dom')
  assert.equal(parsed.importFidelityStatus, 'high_fidelity_import')
  assert.equal(parsed.renderedCaptureStatus, 'available')
  assert.equal(parsed.renderedDomQuality, 'strong')
  assert.equal(parsed.screenshotCount, 2)
  assert.equal(parsed.computedStyleSampleCount, 6)
  assert.deepEqual(parsed.importDiagnosticCodes, ['RENDERED_CAPTURE_PARTIAL'])
})
