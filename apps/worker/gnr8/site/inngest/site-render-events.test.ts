import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  SITE_RENDER_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { emitSiteRenderRequestedEvent } from '@/gnr8/site/inngest/site-render-events'

test('worker emitter constant matches canonical site render event name', () => {
  assert.equal(SITE_RENDER_REQUESTED_EVENT, CANONICAL_SITE_RENDER_REQUESTED_EVENT)
})

test('emitSiteRenderRequestedEvent sends canonical event name and payload', async () => {
  const calls: Array<{ name: string; data: Record<string, unknown> }> = []

  await emitSiteRenderRequestedEvent(
    {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
      runtimeSiteId: 'runtime-site-1',
      runtimeSiteVersionId: 'runtime-version-1',
    },
    {
      send: async (event) => {
        calls.push(event as { name: string; data: Record<string, unknown> })
      },
    },
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], {
    name: SITE_RENDER_REQUESTED_EVENT,
    data: {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
      runtimeSiteId: 'runtime-site-1',
      runtimeSiteVersionId: 'runtime-version-1',
    },
  })
})
