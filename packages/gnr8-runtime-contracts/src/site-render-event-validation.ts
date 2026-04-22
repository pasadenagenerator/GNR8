import { SITE_RENDER_REQUESTED_EVENT } from './index'

const CANONICAL_SITE_RENDER_REQUESTED_EVENT = 'site/render.requested'

type ValidationLogger = (message: string, context: Record<string, unknown>) => void

export function validateSiteRenderEventName(input: {
  source: string
  eventName?: string
  expectedEventName?: string
  logger?: ValidationLogger
}): boolean {
  const eventName = String(input.eventName ?? SITE_RENDER_REQUESTED_EVENT).trim()
  const expectedEventName = String(input.expectedEventName ?? CANONICAL_SITE_RENDER_REQUESTED_EVENT).trim()
  if (eventName === expectedEventName) return true

  const logger = input.logger ?? ((message, context) => console.error(message, context))
  logger('SITE_RENDER_EVENT_NAME_MISMATCH', {
    source: input.source,
    expectedEventName,
    eventName,
  })
  return false
}

export { CANONICAL_SITE_RENDER_REQUESTED_EVENT }
