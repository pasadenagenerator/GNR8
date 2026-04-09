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
      content_model: null,
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

test('import provenance summary is parsed when persisted on runtime site version', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportProvenanceSummary({
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode: 'raw_html_fallback',
    importFidelityStatus: 'degraded_import',
    renderedCaptureStatus: 'unavailable',
    renderedDomQuality: 'weak',
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    importDiagnosticCodes: ['RAW_HTML_FALLBACK_USED', 'IMPORT_FIDELITY_DEGRADED'],
    captureEvidence: {
      selectedSourceHtmlPath: '/tmp/snapshot/response-html.raw.html',
      responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
      entryHtmlPath: '/tmp/snapshot/index.html',
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
      screenshotPaths: [],
    },
  })

  assert.equal(parsed?.sourceMode, 'raw_html_fallback')
  assert.equal(parsed?.importFidelityStatus, 'degraded_import')
  assert.equal(parsed?.renderedCaptureStatus, 'unavailable')
  assert.equal(parsed?.renderedDomQuality, 'weak')
  assert.equal(parsed?.screenshotCount, 0)
  assert.equal(parsed?.computedStyleSampleCount, 0)
  assert.deepEqual(parsed?.importDiagnosticCodes, ['IMPORT_FIDELITY_DEGRADED', 'RAW_HTML_FALLBACK_USED'])
  assert.equal(parsed?.styleSignals, null)
})

test('import fidelity prefers persisted summary over semantic signal labels', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportFidelity({
    runtimeVersion: {
      id: 'sv-1',
      ownership_site_id: SITE_ID,
      state: 'DRAFT',
      version_no: 1,
      import_provenance_summary: {
        kind: 'runtime_import_provenance_summary_v1',
        sourceMode: 'rendered_dom',
        importFidelityStatus: 'high_fidelity_import',
        renderedCaptureStatus: 'available',
        renderedDomQuality: 'strong',
        screenshotCount: 2,
        computedStyleSampleCount: 6,
        importDiagnosticCodes: ['RENDERED_CAPTURE_RECOVERED_ON_RETRY'],
        captureEvidence: {
          selectedSourceHtmlPath: '/tmp/snapshot/rendered-capture/rendered-dom.html',
          responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
          entryHtmlPath: '/tmp/snapshot/index.html',
          renderedCaptureManifestPath: '/tmp/snapshot/rendered-capture.json',
          acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
          screenshotPaths: ['/tmp/snapshot/rendered-capture/desktop-fullpage.png'],
        },
        styleSignals: {
          kind: 'style_signal_model_v2',
          version: '2.0.0',
          sourceMode: 'computed_style',
          colors: {
            backgroundTone: 'dark',
            primaryAccent: '#2563eb',
            secondaryAccent: '#14b8a6',
            neutralPalette: ['#0f172a'],
            ctaColorHint: '#2563eb',
          },
          typography: {
            headingFontFamily: 'Inter',
            bodyFontFamily: 'Inter',
            headingCategory: 'sans',
            bodyCategory: 'sans',
            scaleHint: 'large',
            weightContrastHint: 'high',
          },
          spacing: {
            rhythm: 'airy',
            sectionSpacingHint: 'airy',
            layoutDensity: 'airy',
          },
          surfaces: {
            radiusHint: 'rounded',
            shadowHint: 'soft',
          },
          cta: {
            prominence: 'high',
            styleHint: 'solid_button',
          },
          visualToneHint: 'premium',
          diagnostics: [],
        },
      },
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as any,
    pageRows: [
      {
        id: 'page-row',
        site_version_id: 'sv-1',
        page_id: 'page-1',
        path: '/',
        title: 'Home',
        structure_model: null,
        content_model: null,
        migration_governance: null,
        semantic_signals: [{ label: 'import.source_mode:raw_html_fallback' }],
      } as any,
    ],
  })

  assert.equal(parsed.sourceMode, 'rendered_dom')
  assert.equal(parsed.importFidelityStatus, 'high_fidelity_import')
  assert.equal(parsed.renderedCaptureStatus, 'available')
  assert.equal(parsed.renderedDomQuality, 'strong')
  assert.equal(parsed.screenshotCount, 2)
  assert.equal(parsed.computedStyleSampleCount, 6)
  assert.equal(parsed.styleSignals?.sourceMode, 'computed_style')
  assert.ok(parsed.captureEvidenceRefs.some((entry) => entry.includes('rendered-capture.json')))
  assert.deepEqual(parsed.importDiagnosticCodes, ['RENDERED_CAPTURE_RECOVERED_ON_RETRY'])
})

test('import fidelity falls back to semantic signals and only returns unknown when absent', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportFidelity({
    runtimeVersion: null,
    pageRows: [
      {
        id: 'page-row',
        site_version_id: 'sv-1',
        page_id: 'page-1',
        path: '/',
        title: 'Home',
        structure_model: null,
        content_model: null,
        migration_governance: null,
        semantic_signals: [
          { label: 'import.fidelity_status:capture_failed' },
          { label: 'import.screenshot_count:0' },
          { label: 'import.computed_style_sample_count:0' },
        ],
      } as any,
    ],
  })

  assert.equal(parsed.sourceMode, 'unknown')
  assert.equal(parsed.importFidelityStatus, 'capture_failed')
  assert.equal(parsed.renderedCaptureStatus, 'unknown')
  assert.equal(parsed.renderedDomQuality, 'unknown')
  assert.equal(parsed.screenshotCount, 0)
  assert.equal(parsed.computedStyleSampleCount, 0)
  assert.deepEqual(parsed.importDiagnosticCodes, [])
  assert.deepEqual(parsed.captureEvidenceRefs, [])
})
