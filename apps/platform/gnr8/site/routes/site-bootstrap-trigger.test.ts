import assert from 'node:assert/strict'
import test from 'node:test'

import {
  InvalidAgencyIdForBootstrapError,
  triggerSiteTemplateBootstrapJob,
} from '@/gnr8/site/routes/site-bootstrap-trigger'

test('triggerSiteTemplateBootstrapJob returns true when event emit succeeds', async () => {
  const triggered = await triggerSiteTemplateBootstrapJob(
    {
      siteId: 'site-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      templateId: 'template-1',
    },
    {
      resolveAgencyOrganizationId: async () => 'agency-org-1',
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
      resolveAgencyOrganizationId: async () => 'agency-org-1',
      emit: async () => {
        throw new Error('failed')
      },
    },
  )

  assert.equal(triggered, false)
})

test('triggerSiteTemplateBootstrapJob throws deterministic error when agency scope is invalid', async () => {
  await assert.rejects(
    triggerSiteTemplateBootstrapJob(
      {
        siteId: 'site-1',
        clientId: 'client-1',
        agencyId: 'agency-1',
        templateId: 'template-1',
      },
      {
        resolveAgencyOrganizationId: async () => {
          throw new InvalidAgencyIdForBootstrapError({ agencyId: 'agency-1' })
        },
        emit: async () => undefined,
      },
    ),
    (error: unknown) => {
      const typed = error as { code?: unknown } | null
      return typed?.code === 'INVALID_AGENCY_ID_FOR_BOOTSTRAP'
    },
  )
})
