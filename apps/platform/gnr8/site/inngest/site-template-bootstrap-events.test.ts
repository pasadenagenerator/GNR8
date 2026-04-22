import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { emitSiteTemplateBootstrapRequestedEvent } from '@/gnr8/site/inngest/site-template-bootstrap-events'

test('platform emitter constant matches canonical site bootstrap event name', () => {
  assert.equal(SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT, CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT)
})

test('emitSiteTemplateBootstrapRequestedEvent sends canonical event name and payload', async () => {
  const calls: Array<{ name: string; data: Record<string, unknown> }> = []

  await emitSiteTemplateBootstrapRequestedEvent(
    {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
    },
    {
      send: async (event) => {
        calls.push(event as { name: string; data: Record<string, unknown> })
      },
    },
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], {
    name: SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
    data: {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
    },
  })
})
