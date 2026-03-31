import { resolveCurrentUserAgency, ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'

export type OwnerAgencyContext = {
  userId: string
  agencyId: string
  agencyName: string | null
  role: 'owner' | 'admin' | 'member'
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function mapResolveError(error: ResolveCurrentAgencyError): { status: number; message: string } {
  if (error.code === 'UNAUTHORIZED') {
    return { status: 401, message: 'You must be signed in.' }
  }

  if (error.code === 'NO_MEMBERSHIP') {
    return { status: 403, message: 'No agency membership found for current account.' }
  }

  if (error.code === 'ACTIVE_AGENCY_REQUIRED') {
    return { status: 400, message: 'Select an active agency before updating settings.' }
  }

  if (error.code === 'ACTIVE_AGENCY_INVALID') {
    return { status: 400, message: 'Selected agency is invalid for current membership context.' }
  }

  return { status: 403, message: 'Membership context is invalid for this operation.' }
}

export async function requireOwnerAgencyContext(input?: {
  requestedAgencyId?: unknown
}): Promise<OwnerAgencyContext> {
  const requestedAgencyId = normalizeText(input?.requestedAgencyId) || null
  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgency>>

  try {
    currentUserAgency = await resolveCurrentUserAgency({
      activeAgencyId: requestedAgencyId,
    })
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError) {
      const mapped = mapResolveError(error)
      throw new Error(`${mapped.status}|${mapped.message}`)
    }
    throw error
  }

  if (currentUserAgency.role !== 'owner') {
    throw new Error('403|Only agency owner can perform this action.')
  }

  return {
    userId: currentUserAgency.user_id,
    agencyId: currentUserAgency.agency_id,
    agencyName: currentUserAgency.agency_name ?? null,
    role: currentUserAgency.role,
  }
}

export function parseOwnerContextError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    const [statusRaw, ...messageParts] = error.message.split('|')
    const status = Number(statusRaw)
    if (Number.isFinite(status) && status >= 400 && status < 600) {
      return {
        status,
        message: messageParts.join('|').trim() || 'Operation failed',
      }
    }
    return { status: 500, message: error.message }
  }

  return { status: 500, message: 'Operation failed' }
}
