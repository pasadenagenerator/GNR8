import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import { runSiteRenderCapture } from '@/gnr8/site/site-render-capture-service'

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
  assert.equal(fs.existsSync(path.resolve(root, 'rendered', 'rendered-dom.html')), true)
  assert.equal(fs.existsSync(path.resolve(root, 'rendered', 'computed-styles.json')), true)
  assert.equal(fs.existsSync(path.resolve(root, 'acquisition-evidence.json')), true)
  assert.equal(persistedSummary?.sourceMode, 'rendered_dom')
  assert.equal(persistedSummary?.renderedCaptureStatus, 'available')
  assert.equal(persistedSummary?.captureEvidence.renderedDomPath?.endsWith('/rendered/rendered-dom.html'), true)
})
