import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  MissingEntitlementError,
} from '@gnr8/core'

export function mapDomainError(e: unknown): {
  status: number
  message: string
} {
  // Explicit entitlement enforcement
  if (e instanceof MissingEntitlementError) {
    return { status: 403, message: e.message }
  }

  if (e instanceof AuthorizationError) {
    return { status: 403, message: e.message }
  }

  if (e instanceof NotFoundError) {
    return { status: 404, message: e.message }
  }

  if (e instanceof ConflictError) {
    return { status: 409, message: e.message }
  }

  if (e instanceof DomainError) {
    return { status: 400, message: e.message ?? 'Domain error' }
  }

  // fallback (ne-domain error)
  const message = e instanceof Error ? e.message : 'Internal server error'
  return { status: 500, message }
}