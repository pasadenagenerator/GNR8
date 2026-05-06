import assert from 'node:assert/strict'
import test from 'node:test'

import { pollTemplateSiteStatus } from '@/app/gnr8/_components/client-dashboard/template-site-status-polling'
import type { TemplateSiteBootstrapStatusResult } from '@/gnr8/site/site-create-contract'

function makeStatus(status: TemplateSiteBootstrapStatusResult['status']): TemplateSiteBootstrapStatusResult {
  return {
    ok: true,
    siteId: 's1',
    runtimeSiteId: 'rs1',
    siteVersionId: 'sv1',
    status,
    previewReady: status === 'preview_ready',
    previewUrl: status === 'preview_ready' ? 'https://preview.example.com' : null,
    rawTemplateArtifactFound: true,
    entryHtmlFound: true,
    fileMapCount: 1,
    slotCount: 1,
    publishReady: status === 'preview_ready',
    diagnostics: [],
    reasonCode: status === 'failed' ? 'FAILED' : null,
  }
}

test('polling stops on preview_ready', async () => {
  const statuses: TemplateSiteBootstrapStatusResult[] = [makeStatus('bootstrap_running'), makeStatus('preview_ready')]
  let callCount = 0

  const result = await pollTemplateSiteStatus({
    endpoint: 'http://localhost/status',
    intervalMs: 1,
    timeoutMs: 500,
    fetchImpl: async () => {
      const payload = statuses[Math.min(callCount, statuses.length - 1)]
      callCount += 1
      return new Response(JSON.stringify(payload), { status: 200 })
    },
  })

  assert.equal(result.timedOut, false)
  assert.equal(result.result?.status, 'preview_ready')
  assert.equal(callCount, 2)
})

test('polling stops on timeout', async () => {
  let timeoutCalled = false
  const result = await pollTemplateSiteStatus({
    endpoint: 'http://localhost/status',
    intervalMs: 10,
    timeoutMs: 25,
    fetchImpl: async () => new Response(JSON.stringify(makeStatus('bootstrap_running')), { status: 200 }),
    onPollTimeout: () => {
      timeoutCalled = true
    },
  })

  assert.equal(result.timedOut, true)
  assert.equal(result.result?.status, 'bootstrap_running')
  assert.equal(timeoutCalled, true)
})
