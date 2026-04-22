import {
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  type SiteTemplateBootstrapRequestedPayload,
  SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  validateSiteTemplateBootstrapEventName,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'

type SiteTemplateBootstrapEnqueueEvent = {
  name: string
  data: SiteTemplateBootstrapRequestedPayload
}

type SiteTemplateBootstrapEventDeps = {
  send: (event: SiteTemplateBootstrapEnqueueEvent) => Promise<unknown>
}

const DEFAULT_DEPS: SiteTemplateBootstrapEventDeps = {
  send: (event) => inngest.send(event),
}

export async function emitSiteTemplateBootstrapRequestedEvent(
  input: SiteTemplateBootstrapRequestedPayload,
  deps: Partial<SiteTemplateBootstrapEventDeps> = {},
): Promise<void> {
  const eventName = SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT
  const matches = validateSiteTemplateBootstrapEventName({
    source: 'platform:emitSiteTemplateBootstrapRequestedEvent',
    eventName,
    expectedEventName: CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[site-bootstrap] ${message}`, context),
  })
  if (!matches) {
    throw new Error('Site bootstrap event name mismatch. Refusing to emit misconfigured event.')
  }

  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  }

  await resolved.send({
    name: eventName,
    data: {
      siteId: input.siteId,
      clientId: input.clientId,
      agencyId: input.agencyId,
      templateId: input.templateId,
    },
  })
}
