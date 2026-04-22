import {
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  type SiteRenderRequestedPayload,
  SITE_RENDER_REQUESTED_EVENT,
  validateSiteRenderEventName,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'

type SiteRenderEnqueueEvent = {
  name: string
  data: SiteRenderRequestedPayload
}

type SiteRenderEventDeps = {
  send: (event: SiteRenderEnqueueEvent) => Promise<unknown>
}

const DEFAULT_DEPS: SiteRenderEventDeps = {
  send: (event) => inngest.send(event),
}

export async function emitSiteRenderRequestedEvent(
  input: SiteRenderRequestedPayload,
  deps: Partial<SiteRenderEventDeps> = {},
): Promise<void> {
  const eventName = SITE_RENDER_REQUESTED_EVENT
  const matches = validateSiteRenderEventName({
    source: 'worker:emitSiteRenderRequestedEvent',
    eventName,
    expectedEventName: CANONICAL_SITE_RENDER_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[site-render] ${message}`, context),
  })
  if (!matches) {
    throw new Error('Site render event name mismatch. Refusing to emit misconfigured event.')
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
      runtimeSiteId: input.runtimeSiteId,
      runtimeSiteVersionId: input.runtimeSiteVersionId,
    },
  })
}
