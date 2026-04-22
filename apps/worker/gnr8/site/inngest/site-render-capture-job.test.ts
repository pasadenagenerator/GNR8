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

  await runSiteRenderCaptureJob({
    eventData: PAYLOAD,
    deps: {
      markSiteRenderStarted: async () => ({ started: true, currentStatus: 'running' }),
      runSiteRenderCapture: async () => ({
        siteVersionId: PAYLOAD.runtimeSiteVersionId,
        sourceMode: 'rendered_dom',
        renderedCaptureStatus: 'available',
        renderedDomQuality: 'strong',
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
      }),
      markSiteRenderCompleted: async () => {
        completed = true
      },
      markSiteRenderFailed: async () => undefined,
    },
  })

  assert.equal(completed, true)
})

test('site render capture job guardrails skip duplicate completed run', async () => {
  let executedCapture = false
  let completed = false

  await runSiteRenderCaptureJob({
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
