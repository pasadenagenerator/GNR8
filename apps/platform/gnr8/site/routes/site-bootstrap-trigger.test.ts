import assert from 'node:assert/strict'
import test from 'node:test'

import { triggerSiteTemplateBootstrapJob } from '@/gnr8/site/routes/site-bootstrap-trigger'

test('triggerSiteTemplateBootstrapJob returns true when event emit succeeds', async () => {
  const triggered = await triggerSiteTemplateBootstrapJob(
    {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
    },
    {
      emit: async () => undefined,
    },
  )

  assert.equal(triggered, true)
})

test('triggerSiteTemplateBootstrapJob returns false when event emit fails', async () => {
  const triggered = await triggerSiteTemplateBootstrapJob(
    {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
    },
    {
      emit: async () => {
        throw new Error('failed')
      },
    },
  )

  assert.equal(triggered, false)
})
