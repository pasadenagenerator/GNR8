import { TEMPLATE_PROCESSING_REQUESTED_EVENT } from './index'

const CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT = 'template/processing.requested'

type ValidationLogger = (message: string, context: Record<string, unknown>) => void

export function validateTemplateProcessingEventName(input: {
  source: string
  eventName?: string
  expectedEventName?: string
  logger?: ValidationLogger
}): boolean {
  const eventName = String(input.eventName ?? TEMPLATE_PROCESSING_REQUESTED_EVENT).trim()
  const expectedEventName = String(input.expectedEventName ?? CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT).trim()
  if (eventName === expectedEventName) return true

  const logger = input.logger ?? ((message, context) => console.error(message, context))
  logger('TEMPLATE_PROCESSING_EVENT_NAME_MISMATCH', {
    source: input.source,
    expectedEventName,
    eventName,
  })
  return false
}

export { CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT }
