import { DOMAIN_VERIFICATION_CHECK_EVENT } from './index'

const CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT = 'domain/verification.check'

type ValidationLogger = (message: string, context: Record<string, unknown>) => void

export function validateDomainVerificationCheckEventName(input: {
  source: string
  eventName?: string
  expectedEventName?: string
  logger?: ValidationLogger
}): boolean {
  const eventName = String(input.eventName ?? DOMAIN_VERIFICATION_CHECK_EVENT).trim()
  const expectedEventName = String(input.expectedEventName ?? CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT).trim()
  if (eventName === expectedEventName) return true

  const logger = input.logger ?? ((message, context) => console.error(message, context))
  logger('DOMAIN_VERIFICATION_CHECK_EVENT_NAME_MISMATCH', {
    source: input.source,
    expectedEventName,
    eventName,
  })
  return false
}

export { CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT }
