import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import type { RenderedCaptureResult } from '@/gnr8/import-rendered-capture/rendered-capture-contract'
import { runSiteRenderCapture } from '@/gnr8/site/site-render-capture-service'

function makeExistingSummary(input: {
  root: string
  entryHtmlPath: string
  diagnosticCodes?: string[]
}): RuntimeImportProvenanceSummary {
  return {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-source-test',
      snapshotRunId: 'snapshot-run-source-test',
      snapshotStableRootDirAbs: input.root,
      snapshotRunRootDirAbs: input.root,
      requestId: 'request-source-test',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: input.diagnosticCodes ?? [],
    captureEvidence: {
      selectedSourceHtmlPath: input.entryHtmlPath,
      responseHtmlPath: input.entryHtmlPath,
      entryHtmlPath: input.entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }
}

function makeCaptureResult(input: {
  renderedDomPath: string
  diagnostics?: RenderedCaptureResult['diagnostics']
}): RenderedCaptureResult {
  return {
    kind: 'rendered_capture_result_v1',
    version: '1.0.0',
    status: 'available',
    sourceMode: 'rendered_dom',
    documents: [
      {
        kind: 'rendered_document_snapshot_v1',
        sourceUrl: 'file://index.html',
        htmlPathAbs: input.renderedDomPath,
        htmlSha256: 'abc',
        readinessState: 'ready',
      },
    ],
    screenshots: [],
    computedStyleSamples: [],
    layoutGeometryEvidence: [],
    renderedObservedAssetUrls: [],
    diagnostics: input.diagnostics ?? [{ code: 'CAPTURE_JOB_COMPLETED', severity: 'info', message: 'ok' }],
  }
}

test('runSiteRenderCapture persists rendered evidence and patches runtime provenance summary', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-capture-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  const renderedDomSourcePath = path.resolve(root, 'rendered-capture', 'rendered-dom.html')
  const viewportScreenshotSourcePath = path.resolve(root, 'rendered-capture', 'screenshots', 'desktop_viewport.png')
  fs.mkdirSync(path.dirname(renderedDomSourcePath), { recursive: true })
  fs.mkdirSync(path.dirname(viewportScreenshotSourcePath), { recursive: true })

  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Hello</h1><section>Hero</section></body></html>', 'utf8')
  fs.writeFileSync(renderedDomSourcePath, '<!doctype html><html><body><h1>Hello</h1><p>World</p><section>Hero</section></body></html>', 'utf8')
  fs.writeFileSync(viewportScreenshotSourcePath, Buffer.from('PNG', 'utf8'))

  let persistedSummary: RuntimeImportProvenanceSummary | null = null
  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-1',
      snapshotRunId: 'snapshot-run-1',
      snapshotStableRootDirAbs: root,
      snapshotRunRootDirAbs: root,
      requestId: 'request-1',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000777',
      siteVersionId: '00000000-0000-4000-8000-000000000981',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000981',
        site_id: 'runtime-site-1',
        ownership_site_id: '00000000-0000-4000-8000-000000000777',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'available',
        sourceMode: 'rendered_dom',
        documents: [
          {
            kind: 'rendered_document_snapshot_v1',
            sourceUrl: 'file://index.html',
            htmlPathAbs: renderedDomSourcePath,
            htmlSha256: 'abc',
            readinessState: 'ready',
          },
        ],
        screenshots: [
          {
            kind: 'rendered_screenshot_artifact_v1',
            screenshotId: 'screen-1',
            captureType: 'desktop_viewport',
            filePathAbs: viewportScreenshotSourcePath,
            width: 1366,
            height: 768,
            fullPage: false,
          },
        ],
        computedStyleSamples: [],
        layoutGeometryEvidence: [
          {
            routePath: '/',
            viewportWidth: 1366,
            viewportHeight: 768,
            documentHeight: 1600,
            capturedAt: '2026-06-15T10:00:00.000Z',
            regions: [
              {
                regionId: 'layout-region-main',
                tagName: 'main',
                role: 'main',
                selector: 'body > main:nth-of-type(1)',
                boundingBox: { x: 0, y: 80, width: 1366, height: 700 },
                childCount: 2,
              },
            ],
          },
        ],
        renderedObservedAssetUrls: [],
        diagnostics: [{ code: 'CAPTURE_JOB_COMPLETED', severity: 'info', message: 'ok' }],
      }),
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(result.sourceMode, 'rendered_dom')
  assert.equal(result.renderedCaptureStatus, 'available')
  assert.equal(result.hasUsableEvidence, true)
  assert.equal(result.failureReason, null)
  assert.equal(fs.existsSync(path.resolve(root, 'rendered', 'rendered-dom.html')), true)
  assert.equal(fs.existsSync(path.resolve(root, 'rendered', 'computed-styles.json')), true)
  assert.equal(fs.existsSync(path.resolve(root, 'rendered', 'layout-geometry.json')), true)
  assert.equal(fs.existsSync(path.resolve(root, 'acquisition-evidence.json')), true)
  assert.equal(persistedSummary?.sourceMode, 'rendered_dom')
  assert.equal(persistedSummary?.renderedCaptureStatus, 'available')
  assert.equal(persistedSummary?.captureEvidence.renderedDomPath?.endsWith('/rendered/rendered-dom.html'), true)
  assert.equal(persistedSummary?.captureEvidence.layoutGeometryPath?.endsWith('/rendered/layout-geometry.json'), true)
  assert.equal(persistedSummary?.evidenceCaptureBaselineArtifact?.captureExpansionEvidence.layoutGeometryEvidence[0]?.regions.length, 1)
  assert.equal(persistedSummary?.evidenceCaptureBaselineArtifact?.summaries.layoutGeometry.geometryCaptured, true)
})

test('runSiteRenderCapture keeps screenshot-only evidence as rendered_dom truth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-screenshot-only-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  const viewportScreenshotSourcePath = path.resolve(root, 'rendered-capture', 'screenshots', 'desktop_viewport.png')
  fs.mkdirSync(path.dirname(viewportScreenshotSourcePath), { recursive: true })

  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Hello</h1></body></html>', 'utf8')
  fs.writeFileSync(viewportScreenshotSourcePath, Buffer.from('PNG', 'utf8'))

  let persistedSummary: RuntimeImportProvenanceSummary | null = null
  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-2',
      snapshotRunId: 'snapshot-run-2',
      snapshotStableRootDirAbs: root,
      snapshotRunRootDirAbs: root,
      requestId: 'request-2',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000778',
      siteVersionId: '00000000-0000-4000-8000-000000000982',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000982',
        site_id: 'runtime-site-2',
        ownership_site_id: '00000000-0000-4000-8000-000000000778',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'partial',
        sourceMode: 'raw_html',
        documents: [],
        screenshots: [
          {
            kind: 'rendered_screenshot_artifact_v1',
            screenshotId: 'screen-2',
            captureType: 'desktop_viewport',
            filePathAbs: viewportScreenshotSourcePath,
            width: 1366,
            height: 768,
            fullPage: false,
          },
        ],
        computedStyleSamples: [],
        layoutGeometryEvidence: [],
        renderedObservedAssetUrls: [],
        diagnostics: [{ code: 'RENDERED_CAPTURE_SCREENSHOT_ONLY', severity: 'warning', message: 'screenshot only' }],
      }),
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(result.sourceMode, 'rendered_dom')
  assert.equal(result.renderedCaptureStatus, 'partial')
  assert.equal(result.hasUsableEvidence, true)
  assert.equal(result.evidence.screenshotPaths.length, 1)
  assert.equal(persistedSummary?.sourceMode, 'rendered_dom')
  assert.equal(persistedSummary?.screenshotCount, 1)
})

test('runSiteRenderCapture marks empty success as failed capture truth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-empty-success-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Hello</h1></body></html>', 'utf8')

  let persistedSummary: RuntimeImportProvenanceSummary | null = null
  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-3',
      snapshotRunId: 'snapshot-run-3',
      snapshotStableRootDirAbs: root,
      snapshotRunRootDirAbs: root,
      requestId: 'request-3',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000779',
      siteVersionId: '00000000-0000-4000-8000-000000000983',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000983',
        site_id: 'runtime-site-3',
        ownership_site_id: '00000000-0000-4000-8000-000000000779',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'available',
        sourceMode: 'rendered_dom',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        layoutGeometryEvidence: [],
        renderedObservedAssetUrls: [],
        diagnostics: [{ code: 'CAPTURE_JOB_COMPLETED', severity: 'info', message: 'worker completed' }],
      }),
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(result.hasUsableEvidence, false)
  assert.equal(result.failureReason, 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS')
  assert.equal(result.sourceMode, 'raw_html_fallback')
  assert.equal(result.renderedCaptureStatus, 'failed')
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('SITE_RENDER_CAPTURE_EMPTY_SUCCESS'), true)
  assert.equal(persistedSummary?.renderedCapture.execution.failureCode, 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS')
})

test('runSiteRenderCapture marks missing worker config as deterministic failure truth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-worker-config-missing-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Hello</h1></body></html>', 'utf8')

  let persistedSummary: RuntimeImportProvenanceSummary | null = null
  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-4',
      snapshotRunId: 'snapshot-run-4',
      snapshotStableRootDirAbs: root,
      snapshotRunRootDirAbs: root,
      requestId: 'request-4',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000780',
      siteVersionId: '00000000-0000-4000-8000-000000000984',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000984',
        site_id: 'runtime-site-4',
        ownership_site_id: '00000000-0000-4000-8000-000000000780',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'failed',
        sourceMode: 'raw_html',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        layoutGeometryEvidence: [],
        renderedObservedAssetUrls: [],
        diagnostics: [{ code: 'CAPTURE_WORKER_NOT_CONFIGURED', severity: 'warning', message: 'worker config missing' }],
      }),
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(result.hasUsableEvidence, false)
  assert.equal(result.failureReason, 'CAPTURE_WORKER_NOT_CONFIGURED')
  assert.equal(result.sourceMode, 'raw_html_fallback')
  assert.equal(result.renderedCaptureStatus, 'failed')
  assert.equal(persistedSummary?.renderedCapture.execution.failureCode, 'CAPTURE_WORKER_NOT_CONFIGURED')
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('NO_USABLE_RENDERED_RUN_FOUND'), true)
})

test('runSiteRenderCapture marks unreachable worker as deterministic failure truth', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-worker-unreachable-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Hello</h1></body></html>', 'utf8')

  let persistedSummary: RuntimeImportProvenanceSummary | null = null
  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: {
      snapshotId: 'snapshot-5',
      snapshotRunId: 'snapshot-run-5',
      snapshotStableRootDirAbs: root,
      snapshotRunRootDirAbs: root,
      requestId: 'request-5',
    },
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000781',
      siteVersionId: '00000000-0000-4000-8000-000000000985',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000985',
        site_id: 'runtime-site-5',
        ownership_site_id: '00000000-0000-4000-8000-000000000781',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'failed',
        sourceMode: 'raw_html',
        documents: [],
        screenshots: [],
        computedStyleSamples: [],
        layoutGeometryEvidence: [],
        renderedObservedAssetUrls: [],
        diagnostics: [
          { code: 'CAPTURE_WORKER_TIMEOUT', severity: 'warning', message: 'timed out' },
          { code: 'CAPTURE_WORKER_UNAVAILABLE', severity: 'warning', message: 'worker unavailable' },
        ],
      }),
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(result.hasUsableEvidence, false)
  assert.equal(result.failureReason, 'CAPTURE_WORKER_TIMEOUT')
  assert.equal(result.sourceMode, 'raw_html_fallback')
  assert.equal(result.renderedCaptureStatus, 'failed')
  assert.equal(persistedSummary?.renderedCapture.execution.failureCode, 'CAPTURE_WORKER_TIMEOUT')
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('NO_USABLE_RENDERED_RUN_FOUND'), true)
})

test('runSiteRenderCapture keeps non-zero DOM length as usable evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-dom-length-only-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  const renderedDomSourcePath = path.resolve(root, 'rendered-capture', 'rendered-dom.html')
  fs.mkdirSync(path.dirname(renderedDomSourcePath), { recursive: true })

  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><div></div></body></html>', 'utf8')
  fs.writeFileSync(renderedDomSourcePath, '<!doctype html><html><body><div data-shell="1"></div></body></html>', 'utf8')

  const existingSummary: RuntimeImportProvenanceSummary = {
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode: 'raw_html_fallback',
    importFidelityStatus: 'capture_failed',
    renderedCaptureStatus: 'failed',
    renderedDomQuality: 'unusable',
    importFidelityScore: null,
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
      execution: {
        runtimeKind: 'unknown',
        environmentSupported: false,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: 'unknown',
        failureCategory: 'none',
        failureCode: null,
        browserLaunch: 'not_attempted',
        navigation: 'not_attempted',
        dom: 'not_attempted',
        screenshot: 'none',
        styleSampling: 'not_attempted',
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: entryHtmlPath,
      responseHtmlPath: entryHtmlPath,
      entryHtmlPath,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
  }

  const result = await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000782',
      siteVersionId: '00000000-0000-4000-8000-000000000986',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000986',
        site_id: 'runtime-site-6',
        ownership_site_id: '00000000-0000-4000-8000-000000000782',
        import_provenance_summary: existingSummary,
      }),
      runRenderedCapture: async () => ({
        kind: 'rendered_capture_result_v1',
        version: '1.0.0',
        status: 'partial',
        sourceMode: 'rendered_dom',
        documents: [
          {
            kind: 'rendered_document_snapshot_v1',
            sourceUrl: 'file://index.html',
            htmlPathAbs: renderedDomSourcePath,
            htmlSha256: 'abc',
            readinessState: 'timeout_partial',
          },
        ],
        screenshots: [],
        computedStyleSamples: [],
        layoutGeometryEvidence: [],
        renderedObservedAssetUrls: [],
        diagnostics: [{ code: 'CAPTURE_WORKER_EMPTY_RENDER_RESULT', severity: 'warning', message: 'empty result' }],
      }),
      persistRuntimeVersionImportSummary: async () => undefined,
    },
  )

  assert.equal(result.hasUsableEvidence, true)
  assert.equal(result.renderedCaptureStatus, 'partial')
  assert.equal(result.sourceMode, 'rendered_dom')
})

test('runSiteRenderCapture uses existing local provenance source before raw import fallback', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-local-source-'))
  const entryHtmlPath = path.resolve(root, 'index.html')
  const renderedDomSourcePath = path.resolve(root, 'rendered-capture', 'rendered-dom.html')
  fs.mkdirSync(path.dirname(renderedDomSourcePath), { recursive: true })
  fs.writeFileSync(entryHtmlPath, '<!doctype html><html><body><h1>Local</h1></body></html>', 'utf8')
  fs.writeFileSync(renderedDomSourcePath, '<!doctype html><html><body><h1>Local</h1><p>Rendered</p></body></html>', 'utf8')

  let artifactLookupCalled = false
  let capturedSourceUrl = ''

  await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000790',
      siteVersionId: '00000000-0000-4000-8000-000000000990',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000990',
        site_id: 'runtime-site-local-source',
        ownership_site_id: '00000000-0000-4000-8000-000000000790',
        import_provenance_summary: makeExistingSummary({ root, entryHtmlPath }),
      }),
      getRawImportArtifactHtmlForCapture: async () => {
        artifactLookupCalled = true
        return { status: 'artifact_not_found' as const }
      },
      runRenderedCapture: async ({ sourceUrl }) => {
        capturedSourceUrl = sourceUrl
        return makeCaptureResult({ renderedDomPath: renderedDomSourcePath })
      },
      persistRuntimeVersionImportSummary: async () => undefined,
    },
  )

  assert.equal(artifactLookupCalled, false)
  assert.equal(capturedSourceUrl, pathToFileURL(entryHtmlPath).toString())
})

test('runSiteRenderCapture resolves missing local provenance from raw_imported_site artifact HTML bytes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-raw-import-source-'))
  const missingEntryHtmlPath = path.resolve(root, 'missing', 'index.html')
  const renderedDomSourcePath = path.resolve(root, 'rendered-capture', 'rendered-dom.html')
  fs.mkdirSync(path.dirname(renderedDomSourcePath), { recursive: true })
  fs.writeFileSync(renderedDomSourcePath, '<!doctype html><html><body><h1>Durable</h1><p>Rendered</p></body></html>', 'utf8')

  let capturedSourceUrl = ''
  let capturedSnapshotRoot = ''
  let persistedSummary: RuntimeImportProvenanceSummary | null = null

  await runSiteRenderCapture(
    {
      siteId: '00000000-0000-4000-8000-000000000791',
      siteVersionId: '00000000-0000-4000-8000-000000000991',
    },
    {
      getRuntimeVersionById: async () => ({
        id: '00000000-0000-4000-8000-000000000991',
        site_id: 'runtime-site-raw-import-source',
        ownership_site_id: '00000000-0000-4000-8000-000000000791',
        import_provenance_summary: makeExistingSummary({ root, entryHtmlPath: missingEntryHtmlPath }),
      }),
      getRawImportArtifactHtmlForCapture: async () => ({
        status: 'found' as const,
        artifactId: '6f0829d5-a481-4722-b9e1-1b999e65e4b7',
        artifactCreatedAt: '2026-06-16T00:00:00.000Z',
        artifactEntryHtmlPath: 'index.html',
        selectedHtmlPath: 'index.html',
        mediaType: 'text/html; charset=utf-8',
        sizeBytes: 75,
        sha256: '371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861',
        htmlBytes: Buffer.from('<!doctype html><html><body><h1>Durable raw import source</h1></body></html>', 'utf8'),
      }),
      runRenderedCapture: async ({ sourceUrl, snapshotRootDirAbs }) => {
        capturedSourceUrl = sourceUrl
        capturedSnapshotRoot = snapshotRootDirAbs
        assert.equal(fs.readFileSync(new URL(sourceUrl), 'utf8').includes('Durable raw import source'), true)
        return makeCaptureResult({ renderedDomPath: renderedDomSourcePath })
      },
      persistRuntimeVersionImportSummary: async ({ summary }) => {
        persistedSummary = summary
      },
    },
  )

  assert.equal(capturedSourceUrl.endsWith('/index.html'), true)
  assert.equal(capturedSnapshotRoot.includes('rendered-capture-source-rehydration'), true)
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING'), true)
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED'), true)
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND'), true)
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND'), true)
  assert.equal(persistedSummary?.importDiagnosticCodes.includes('RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT'), true)
})

test('runSiteRenderCapture fails clearly when raw_imported_site artifact root HTML is missing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-raw-import-html-missing-'))
  const missingEntryHtmlPath = path.resolve(root, 'gone', 'index.html')
  let captureCalled = false

  await assert.rejects(
    runSiteRenderCapture(
      {
        siteId: '00000000-0000-4000-8000-000000000792',
        siteVersionId: '00000000-0000-4000-8000-000000000992',
      },
      {
        getRuntimeVersionById: async () => ({
          id: '00000000-0000-4000-8000-000000000992',
          site_id: 'runtime-site-raw-import-html-missing',
          ownership_site_id: '00000000-0000-4000-8000-000000000792',
          import_provenance_summary: makeExistingSummary({ root, entryHtmlPath: missingEntryHtmlPath }),
        }),
        getRawImportArtifactHtmlForCapture: async () => ({
          status: 'html_missing' as const,
          artifactId: 'artifact-without-root-html',
          artifactCreatedAt: '2026-06-16T00:00:00.000Z',
          artifactEntryHtmlPath: 'routes/home.html',
          candidateHtmlPaths: ['routes/home.html', 'index.html'],
        }),
        runRenderedCapture: async () => {
          captureCalled = true
          throw new Error('should not capture')
        },
      },
    ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === 'SiteRenderCaptureError' &&
      'code' in error &&
      error.code === 'SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND' &&
      error.message.includes('raw_imported_site artifact HTML'),
  )
  assert.equal(captureCalled, false)
})

test('runSiteRenderCapture fails when local provenance and raw_imported_site artifact are both missing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnr8-site-render-no-source-'))
  const missingEntryHtmlPath = path.resolve(root, 'missing.html')
  let captureCalled = false

  await assert.rejects(
    runSiteRenderCapture(
      {
        siteId: '00000000-0000-4000-8000-000000000793',
        siteVersionId: '00000000-0000-4000-8000-000000000993',
      },
      {
        getRuntimeVersionById: async () => ({
          id: '00000000-0000-4000-8000-000000000993',
          site_id: 'runtime-site-no-source',
          ownership_site_id: '00000000-0000-4000-8000-000000000793',
          import_provenance_summary: makeExistingSummary({ root, entryHtmlPath: missingEntryHtmlPath }),
        }),
        getRawImportArtifactHtmlForCapture: async () => ({ status: 'artifact_not_found' as const }),
        runRenderedCapture: async () => {
          captureCalled = true
          throw new Error('should not capture')
        },
      },
    ),
    (error: unknown) =>
      error instanceof Error &&
      error.name === 'SiteRenderCaptureError' &&
      'code' in error &&
      error.code === 'SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND',
  )
  assert.equal(captureCalled, false)
})
