import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '@gnr8/core'

export function mapDomainError(e: unknown): {
  status: number
  message: string
} {
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
    const msg = e.message ?? 'Domain error'

    // 🔒 Entitlement enforcement → 403
    if (msg.toLowerCase().includes('missing required entitlement')) {
      return { status: 403, message: msg }
    }

    return { status: 400, message: msg }
  }

  // fallback (nikoli ne bi smelo priti sem)
  const message = e instanceof Error ? e.message : 'Internal server error'
  return { status: 500, message }
}