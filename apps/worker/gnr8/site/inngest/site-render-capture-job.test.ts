import assert from 'node:assert/strict'
import test from 'node:test'

import { runSiteRenderCaptureJob } from '@/gnr8/site/inngest/site-render-capture-job'

const PAYLOAD = {
  siteId: '00000000-0000-4000-8000-000000000777',
  clientId: '00000000-0000-4000-8000-000000000201',
  agencyId: '00000000-0000-4000-8000-000000000301',
  templateId: '00000000-0000-4000-8000-000000000901',
  runtimeSiteId: 'runtime-site-1',
  runtimeSiteVersionId: '00000000-0000-4000-8000-000000000981',
}

test('site render capture job runs and persists completion truth', async () => {
  let completed = false

  const result = await runSiteRenderCaptureJob({
    eventData: PAYLOAD,
    deps: {
      markSiteRenderStarted: async () => ({ started: true, currentStatus: 'running' }),
      runSiteRenderCapture: async () => ({
        runtimeSiteId: PAYLOAD.runtimeSiteId,
        runtimeSiteVersionId: PAYLOAD.runtimeSiteVersionId,
        siteVersionId: PAYLOAD.runtimeSiteVersionId,
        sourceMode: 'rendered_dom',
        renderedCaptureStatus: 'available',
        renderedDomQuality: 'strong',
        hasUsableEvidence: true,
        failureReason: null,
        evidence: {
          snapshotRootDirAbs: '/tmp/render',
          renderedDomPath: '/tmp/render/rendered/rendered-dom.html',
          computedStylesPath: '/tmp/render/rendered/computed-styles.json',
          renderedCaptureManifestPath: '/tmp/render/rendered-capture.json',
          acquisitionEvidencePath: '/tmp/render/acquisition-evidence.json',
          viewportScreenshotPath: '/tmp/render/rendered/screenshots/viewport.png',
          fullpageScreenshotPath: '/tmp/render/rendered/screenshots/fullpage.png',
          screenshotPaths: ['/tmp/render/rendered/screenshots/viewport.png'],
          domLength: 1240,
          domNodeCount: 37,
          computedStyleSampleCount: 8,
        },
        importProvenanceSummary: {
          kind: 'runtime_import_provenance_summary_v1',
          sourceMode: 'rendered_dom',
          importFidelityStatus: 'high_fidelity_import',
          renderedCaptureStatus: 'available',
          renderedDomQuality: 'strong',
          importFidelityScore: null,
          screenshotCount: 1,
          computedStyleSampleCount: 8,
          renderedCapture: {
            used: true,
            status: 'available',
            quality: 'strong',
            domLength: 1240,
            nodeCount: 37,
            styleSampleCount: 8,
            styleCoverage: 0.8,
            screenshots: { viewport: true, fullPage: false },
            execution: {
              runtimeKind: 'nodejs',
              environmentSupported: true,
              browserPackageAvailable: true,
              browserBinaryAvailable: true,
              environmentStatus: 'supported',
              failureCategory: 'none',
              failureCode: null,
              browserLaunch: 'succeeded',
              navigation: 'succeeded',
              dom: 'captured',
              screenshot: 'captured',
              styleSampling: 'captured',
            },
          },
          importDiagnosticCodes: ['SITE_RENDER_CAPTURE_COMPLETED'],
          captureEvidence: {
            selectedSourceHtmlPath: null,
            responseHtmlPath: null,
            entryHtmlPath: null,
            renderedCaptureManifestPath: '/tmp/render/rendered-capture.json',
            acquisitionEvidencePath: '/tmp/render/acquisition-evidence.json',
            renderedDomPath: '/tmp/render/rendered/rendered-dom.html',
            computedStylesPath: '/tmp/render/rendered/computed-styles.json',
            renderedViewportScreenshotPath: '/tmp/render/rendered/screenshots/viewport.png',
            renderedFullpageScreenshotPath: null,
            screenshotPaths: ['/tmp/render/rendered/screenshots/viewport.png'],
          },
          captureJob: null,
          workerHealth: null,
          styleSignals: null,
          multipageImport: null,
          siteTree: null,
          templateFamilies: null,
        },
      }),
      markSiteRenderCompleted: async () => {
        completed = true
      },
      markSiteRenderFailed: async () => undefined,
    },
  })

  assert.equal(completed, true)
  assert.deepEqual(result, {
    runtimeSiteId: PAYLOAD.runtimeSiteId,
    runtimeSiteVersionId: PAYLOAD.runtimeSiteVersionId,
    domNodeCount: 37,
    screenshotCount: 1,
    renderedDomPath: '/tmp/render/rendered/rendered-dom.html',
    computedStylesPath: '/tmp/render/rendered/computed-styles.json',
    acquisitionEvidencePath: '/tmp/render/acquisition-evidence.json',
    usableEvidence: true,
    failureReason: null,
  })
})

test('site render capture job guardrails skip duplicate completed run', async () => {
  let executedCapture = false
  let completed = false

  const result = await runSiteRenderCaptureJob({
    eventData: PAYLOAD,
    deps: {
      markSiteRenderStarted: async () => ({ started: false, currentStatus: 'completed' }),
      runSiteRenderCapture: async () => {
        executedCapture = true
        throw new Error('should not execute')
      },
      markSiteRenderCompleted: async () => {
        completed = true
      },
      markSiteRenderFailed: async () => undefined,
    },
  })

  assert.equal(executedCapture, false)
  assert.equal(completed, false)
  assert.equal(result.failureReason, 'SITE_RENDER_CAPTURE_NOT_STARTED')
})

test('site render capture job returns explicit failure truth for empty capture result', async () => {
  const result = await runSiteRenderCaptureJob({
    eventData: PAYLOAD,
    deps: {
      markSiteRenderStarted: async () => ({ started: true, currentStatus: 'running' }),
      runSiteRenderCapture: async () => ({
        runtimeSiteId: PAYLOAD.runtimeSiteId,
        runtimeSiteVersionId: PAYLOAD.runtimeSiteVersionId,
        siteVersionId: PAYLOAD.runtimeSiteVersionId,
        sourceMode: 'raw_html_fallback',
        renderedCaptureStatus: 'failed',
        renderedDomQuality: 'unusable',
        hasUsableEvidence: false,
        failureReason: 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS',
        evidence: {
          snapshotRootDirAbs: '/tmp/render-empty',
          renderedDomPath: null,
          computedStylesPath: null,
          renderedCaptureManifestPath: '/tmp/render-empty/rendered-capture.json',
          acquisitionEvidencePath: null,
          viewportScreenshotPath: null,
          fullpageScreenshotPath: null,
          screenshotPaths: [],
          domLength: 0,
          domNodeCount: 0,
          computedStyleSampleCount: 0,
        },
        importProvenanceSummary: {
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
              runtimeKind: 'nodejs',
              environmentSupported: true,
              browserPackageAvailable: true,
              browserBinaryAvailable: true,
              environmentStatus: 'supported',
              failureCategory: 'page',
              failureCode: 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS',
              browserLaunch: 'succeeded',
              navigation: 'succeeded',
              dom: 'empty_or_failed',
              screenshot: 'none',
              styleSampling: 'failed_or_empty',
            },
          },
          importDiagnosticCodes: ['SITE_RENDER_CAPTURE_COMPLETED', 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS', 'NO_USABLE_RENDERED_RUN_FOUND'],
          captureEvidence: {
            selectedSourceHtmlPath: null,
            responseHtmlPath: null,
            entryHtmlPath: null,
            renderedCaptureManifestPath: '/tmp/render-empty/rendered-capture.json',
            acquisitionEvidencePath: null,
            renderedDomPath: null,
            computedStylesPath: null,
            renderedViewportScreenshotPath: null,
            renderedFullpageScreenshotPath: null,
            screenshotPaths: [],
          },
          captureJob: null,
          workerHealth: null,
          styleSignals: null,
          multipageImport: null,
          siteTree: null,
          templateFamilies: null,
        },
      }),
      markSiteRenderCompleted: async () => undefined,
      markSiteRenderFailed: async () => undefined,
    },
  })

  assert.equal(result.usableEvidence, false)
  assert.equal(result.failureReason, 'SITE_RENDER_CAPTURE_EMPTY_SUCCESS')
  assert.equal(result.domNodeCount, 0)
  assert.equal(result.screenshotCount, 0)
})

test('site render capture job failure marks failed and rethrows', async () => {
  let failed = false

  await assert.rejects(
    runSiteRenderCaptureJob({
      eventData: PAYLOAD,
      deps: {
        markSiteRenderStarted: async () => ({ started: true, currentStatus: 'running' }),
        runSiteRenderCapture: async () => {
          throw new Error('boom')
        },
        markSiteRenderCompleted: async () => undefined,
        markSiteRenderFailed: async () => {
          failed = true
        },
      },
    }),
  )

  assert.equal(failed, true)
})
