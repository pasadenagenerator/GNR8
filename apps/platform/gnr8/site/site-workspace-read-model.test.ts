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
    availableRuntimeSiteVersionIds: ['latest-runtime-version-id', 'explicit-variant-version'],
    normalizedVariants: [
      { id: 'variant-a', siteVersionId: 'older-variant-version' },
      { id: 'variant-b', siteVersionId: 'explicit-variant-version' },
    ],
    selectedVariantId: 'variant-b',
  })

  assert.equal(selected.selectedRuntimeSiteVersionId, 'explicit-variant-version')
  assert.equal(selected.selectedVariant?.id, 'variant-b')
})

test('runtime version selection falls back to latest runtime when selected variant site version is unavailable', () => {
  const selected = resolveSelectedRuntimeVersionIdForWorkspace({
    latestRuntimeSiteVersionId: 'latest-runtime-version-id',
    availableRuntimeSiteVersionIds: ['latest-runtime-version-id'],
    normalizedVariants: [
      { id: 'variant-a', siteVersionId: 'stale-variant-version' },
    ],
    selectedVariantId: 'variant-a',
  })

  assert.equal(selected.selectedRuntimeSiteVersionId, 'latest-runtime-version-id')
  assert.equal(selected.selectedVariant?.id, 'variant-a')
})

test('latest runtime row selection is timestamp-first across mixed runtime site ids', () => {
  const latest = __siteWorkspaceReadModelTestUtils.resolveLatestRuntimeVersionRow([
    {
      id: 'older-higher-version',
      site_id: 'runtime-site-a',
      ownership_site_id: SITE_ID,
      state: 'DRAFT',
      version_no: 9,
      import_provenance_summary: null,
      artifact_id: null,
      updated_at: '2026-04-01T00:00:00.000Z',
      created_at: '2026-04-01T00:00:00.000Z',
    } as any,
    {
      id: 'fresh-import-version',
      site_id: 'runtime-site-b',
      ownership_site_id: SITE_ID,
      state: 'DRAFT',
      version_no: 1,
      import_provenance_summary: { kind: 'runtime_import_provenance_summary_v1' },
      artifact_id: 'artifact-fresh',
      updated_at: '2026-04-09T09:00:00.000Z',
      created_at: '2026-04-09T09:00:00.000Z',
    } as any,
  ])

  assert.equal(latest?.id, 'fresh-import-version')
  assert.equal(latest?.site_id, 'runtime-site-b')
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
    renderedCaptureStatus: 'failed',
    renderedDomQuality: 'weak',
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    renderedCapture: {
      used: false,
      status: 'failed',
      quality: 'weak',
      domLength: 0,
      nodeCount: 0,
      styleSampleCount: 0,
      styleCoverage: 0,
      screenshots: {
        viewport: false,
        fullPage: false,
      },
      execution: {
        runtimeKind: 'edge',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unsupported',
        failureCategory: 'environment',
        failureCode: 'ENVIRONMENT_UNSUPPORTED',
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: ['RAW_HTML_FALLBACK_USED', 'IMPORT_FIDELITY_DEGRADED'],
    captureEvidence: {
      selectedSourceHtmlPath: '/tmp/snapshot/response-html.raw.html',
      responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
      entryHtmlPath: '/tmp/snapshot/index.html',
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
      renderedDomPath: '/tmp/snapshot/rendered/rendered-dom.html',
      computedStylesPath: '/tmp/snapshot/rendered/computed-styles.json',
      renderedViewportScreenshotPath: '/tmp/snapshot/rendered/screenshots/viewport.png',
      renderedFullpageScreenshotPath: '/tmp/snapshot/rendered/screenshots/fullpage.png',
      screenshotPaths: [],
    },
  })

  assert.equal(parsed?.sourceMode, 'raw_html_fallback')
  assert.equal(parsed?.importFidelityStatus, 'degraded_import')
  assert.equal(parsed?.renderedCaptureStatus, 'failed')
  assert.equal(parsed?.renderedDomQuality, 'weak')
  assert.equal(parsed?.screenshotCount, 0)
  assert.equal(parsed?.computedStyleSampleCount, 0)
  assert.equal(parsed?.renderedCapture.status, 'failed')
  assert.equal(parsed?.renderedCapture.execution.runtimeKind, 'edge')
  assert.equal(parsed?.renderedCapture.execution.environmentSupported, false)
  assert.equal(parsed?.renderedCapture.execution.browserPackageAvailable, false)
  assert.equal(parsed?.renderedCapture.execution.browserBinaryAvailable, false)
  assert.deepEqual(parsed?.importDiagnosticCodes, ['IMPORT_FIDELITY_DEGRADED', 'RAW_HTML_FALLBACK_USED'])
  assert.equal(parsed?.styleSignals, null)
})

test('import provenance parser preserves capture job + worker health timeout truth', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportProvenanceSummary({
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode: 'raw_html_fallback',
    importFidelityStatus: 'capture_failed',
    renderedCaptureStatus: 'failed',
    renderedDomQuality: 'unusable',
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    renderedCapture: {
      used: false,
      status: 'failed',
      quality: 'unusable',
      domLength: 0,
      nodeCount: 0,
      styleSampleCount: 0,
      styleCoverage: 0,
      screenshots: {
        viewport: false,
        fullPage: false,
      },
      execution: {
        runtimeKind: 'nodejs',
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: 'supported',
        failureCategory: 'page',
        failureCode: 'RENDERED_CAPTURE_TIMEOUT',
        browserLaunch: 'succeeded',
        navigation: 'succeeded',
        dom: 'empty_or_failed',
        screenshot: 'none',
        styleSampling: 'failed_or_empty',
      },
    },
    importDiagnosticCodes: ['CAPTURE_JOB_TIMED_OUT', 'RENDERED_CAPTURE_TIMEOUT', 'CAPTURE_WORKER_FALLBACK_TO_RAW_HTML'],
    captureEvidence: {
      selectedSourceHtmlPath: '/tmp/snapshot/index.html',
      responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
      entryHtmlPath: '/tmp/snapshot/index.html',
      renderedCaptureManifestPath: '/tmp/snapshot/rendered-capture.json',
      acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    captureJob: {
      jobId: 'capture-job-1',
      status: 'timed_out',
      attemptCount: 2,
      maxAttempts: 2,
      failureClass: 'timeout',
      failureCode: 'RENDERED_CAPTURE_TIMEOUT',
      timeoutBudgetMs: 30000,
      createdAt: '2026-04-12T10:00:00.000Z',
      startedAt: '2026-04-12T10:00:01.000Z',
      completedAt: '2026-04-12T10:00:31.000Z',
    },
    workerHealth: {
      enabled: true,
      reachable: true,
      browserAvailable: true,
      queueHealthy: true,
      status: 'timed_out',
      reason: 'RENDERED_CAPTURE_TIMEOUT',
      lastSuccessAt: null,
      lastFailureAt: '2026-04-12T10:00:31.000Z',
      lastFailureClass: 'timed_out',
      lastFailureCode: 'RENDERED_CAPTURE_TIMEOUT',
    },
  })

  assert.equal(parsed?.captureJob?.status, 'timed_out')
  assert.equal(parsed?.captureJob?.failureClass, 'timeout')
  assert.equal(parsed?.workerHealth?.status, 'timed_out')
  assert.equal(parsed?.workerHealth?.reachable, true)
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
        renderedCapture: {
          used: true,
          status: 'available',
          quality: 'strong',
          domLength: 4300,
          nodeCount: 88,
          styleSampleCount: 6,
          styleCoverage: 0.6,
          screenshots: {
            viewport: true,
            fullPage: true,
          },
        },
        importDiagnosticCodes: ['RENDERED_CAPTURE_RECOVERED_ON_RETRY'],
        captureEvidence: {
          selectedSourceHtmlPath: '/tmp/snapshot/rendered-capture/rendered-dom.html',
          responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
          entryHtmlPath: '/tmp/snapshot/index.html',
          renderedCaptureManifestPath: '/tmp/snapshot/rendered-capture.json',
          acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
          renderedDomPath: '/tmp/snapshot/rendered/rendered-dom.html',
          computedStylesPath: '/tmp/snapshot/rendered/computed-styles.json',
          renderedViewportScreenshotPath: '/tmp/snapshot/rendered/screenshots/viewport.png',
          renderedFullpageScreenshotPath: '/tmp/snapshot/rendered/screenshots/fullpage.png',
          screenshotPaths: ['/tmp/snapshot/rendered-capture/desktop-fullpage.png'],
        },
        styleSignals: {
          kind: 'style_signal_model_v2',
          version: '2.0.0',
          sourceMode: 'computed_style',
          provenance: {
            sourceMode: 'computed_style',
            computedStyle: {
              used: true,
              sampleCount: 6,
              coverage: 0.6,
            },
            fallbackUsed: false,
            diagnostics: [],
          },
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
  assert.equal(parsed.styleSignalCoverage, 0.6)
  assert.equal(parsed.styleSignalFallbackUsed, false)
  assert.equal(parsed.styleSignalSourceMode, 'computed_style')
  assert.equal(parsed.evidencePaths.renderedDomPath, '/tmp/snapshot/rendered/rendered-dom.html')
  assert.ok(parsed.captureEvidenceRefs.some((entry) => entry.includes('rendered-capture.json')))
  assert.deepEqual(parsed.importDiagnosticCodes, ['RENDERED_CAPTURE_RECOVERED_ON_RETRY'])
})

test('import fidelity derives capture_timed_out fallback reason from persisted capture job truth', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportFidelity({
    runtimeVersion: {
      id: 'sv-timeout',
      ownership_site_id: SITE_ID,
      state: 'DRAFT',
      version_no: 1,
      import_provenance_summary: {
        kind: 'runtime_import_provenance_summary_v1',
        sourceMode: 'raw_html_fallback',
        importFidelityStatus: 'capture_failed',
        renderedCaptureStatus: 'failed',
        renderedDomQuality: 'unusable',
        screenshotCount: 0,
        computedStyleSampleCount: 0,
        renderedCapture: {
          used: false,
          status: 'failed',
          quality: 'unusable',
          domLength: 0,
          nodeCount: 0,
          styleSampleCount: 0,
          styleCoverage: 0,
          screenshots: { viewport: false, fullPage: false },
        },
        importDiagnosticCodes: ['RENDERED_CAPTURE_TIMEOUT', 'CAPTURE_JOB_TIMED_OUT'],
        captureEvidence: {
          selectedSourceHtmlPath: '/tmp/snapshot/index.html',
          responseHtmlPath: '/tmp/snapshot/response-html.raw.html',
          entryHtmlPath: '/tmp/snapshot/index.html',
          renderedCaptureManifestPath: '/tmp/snapshot/rendered-capture.json',
          acquisitionEvidencePath: '/tmp/snapshot/acquisition-evidence.json',
          renderedDomPath: null,
          computedStylesPath: null,
          renderedViewportScreenshotPath: null,
          renderedFullpageScreenshotPath: null,
          screenshotPaths: [],
        },
        captureJob: {
          jobId: 'capture-job-timeout',
          status: 'timed_out',
          attemptCount: 2,
          maxAttempts: 2,
          failureClass: 'timeout',
          failureCode: 'RENDERED_CAPTURE_TIMEOUT',
          timeoutBudgetMs: 30000,
          createdAt: null,
          startedAt: null,
          completedAt: null,
        },
        workerHealth: {
          enabled: true,
          reachable: true,
          browserAvailable: true,
          queueHealthy: true,
          status: 'timed_out',
          reason: 'RENDERED_CAPTURE_TIMEOUT',
          lastSuccessAt: null,
          lastFailureAt: null,
          lastFailureClass: 'timed_out',
          lastFailureCode: 'RENDERED_CAPTURE_TIMEOUT',
        },
      },
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as any,
    pageRows: [],
  })

  assert.equal(parsed.captureFallbackReason, 'capture_timed_out')
  assert.equal(parsed.captureJob?.status, 'timed_out')
  assert.equal(parsed.workerHealth?.status, 'timed_out')
  assert.ok(parsed.evidenceDiagnostics.includes('CAPTURE_JOB_TIMED_OUT'))
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
  assert.equal(parsed.styleSignalFallbackUsed, true)
  assert.deepEqual(parsed.importDiagnosticCodes, [])
  assert.deepEqual(parsed.captureEvidenceRefs, [])
})

test('import fidelity fallback flag remains false for high-fidelity imports when style provenance is absent', () => {
  const parsed = __siteWorkspaceReadModelTestUtils.parseImportFidelity({
    runtimeVersion: null,
    pageRows: [
      {
        id: 'page-row',
        site_version_id: 'sv-2',
        page_id: 'page-1',
        path: '/',
        title: 'Home',
        structure_model: null,
        content_model: null,
        migration_governance: null,
        semantic_signals: [
          { label: 'import.source_mode:rendered_dom' },
          { label: 'import.fidelity_status:high_fidelity_import' },
        ],
      } as any,
    ],
  })

  assert.equal(parsed.importFidelityStatus, 'high_fidelity_import')
  assert.equal(parsed.styleSignalFallbackUsed, false)
})
