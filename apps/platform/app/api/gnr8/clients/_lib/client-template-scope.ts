import { ResolveCurrentClientError, resolveCurrentUserClient } from '@/src/auth/resolve-current-client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized || !UUID_RE.test(normalized)) return null
  return normalized
}

export function parseTemplateScopeError(error: unknown): { status: number; message: string } {
  if (error instanceof ResolveCurrentClientError) {
    if (error.code === 'UNAUTHORIZED') return { status: 401, message: 'You must be signed in.' }
    if (error.code === 'NO_MEMBERSHIP') return { status: 403, message: 'No client membership found for current account.' }
    if (error.code === 'ACTIVE_CLIENT_REQUIRED') {
      return { status: 400, message: 'Select an active client before using template intake.' }
    }
    if (error.code === 'ACTIVE_CLIENT_INVALID') {
      return { status: 403, message: 'Requested client scope is invalid for current membership.' }
    }
    return { status: 403, message: 'Invalid client membership context.' }
  }

  if (error instanceof Error) return { status: 500, message: error.message }
  return { status: 500, message: 'Template scope resolution failed.' }
}

export async function requireClientTemplateScope(input: {
  clientIdParam: string
}): Promise<{ userId: string; clientId: string; organizationId: string; agencyId: string }> {
  const clientId = normalizeUuid(input.clientIdParam)
  if (!clientId) {
    throw new Error('400|clientId must be a valid UUID.')
  }

  const currentClient = await resolveCurrentUserClient({
    activeClientId: clientId,
  })

  if (currentClient.client_id !== clientId) {
    throw new Error('403|Client scope mismatch for template operation.')
  }

  return {
    userId: currentClient.user_id,
    clientId: currentClient.client_id,
    organizationId: currentClient.client_id,
    agencyId: currentClient.agency_id,
  }
}

export function parseThrownScopeError(error: unknown): { status: number; message: string } {
  if (error instanceof Error && error.message.includes('|')) {
    const [statusRaw, ...parts] = error.message.split('|')
    const status = Number(statusRaw)
    if (Number.isFinite(status) && status >= 400 && status < 600) {
      return {
        status,
        message: parts.join('|').trim() || 'Template scope validation failed.',
      }
    }
  }

  return parseTemplateScopeError(error)
}
