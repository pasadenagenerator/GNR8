import { resolveCurrentUserAgency, ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'
import { canPerformAction, getUserRoleForAgency, type AgencyAction, type AgencyActorMode, type AgencyRole } from '@/src/auth/rbac'
import { requireSuperadminUserId } from '@/src/auth/require-superadmin-user-id'

export type AgencyActionContext = {
  userId: string
  agencyId: string
  agencyName: string | null
  role: AgencyRole
  actorMode: AgencyActorMode
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
    return { status: 400, message: 'Select an active agency before running this action.' }
  }

  if (error.code === 'ACTIVE_AGENCY_INVALID') {
    return { status: 400, message: 'Selected agency is invalid for current membership context.' }
  }

  return { status: 403, message: 'Membership context is invalid for this operation.' }
}

async function tryRequireSuperadminUserId(): Promise<string | null> {
  try {
    return await requireSuperadminUserId()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (message === 'Unauthorized' || message.startsWith('Forbidden')) {
      return null
    }
    throw error
  }
}

export async function requireAgencyActionContext(input: {
  action: AgencyAction
  requestedAgencyId?: unknown
}): Promise<AgencyActionContext> {
  const requestedAgencyId = normalizeText(input.requestedAgencyId)

  const superadminUserId = await tryRequireSuperadminUserId()
  if (superadminUserId) {
    if (!requestedAgencyId) {
      throw new Error('400|Agency scope is required for admin-view actions.')
    }

    if (!canPerformAction('superadmin', input.action)) {
      throw new Error('403|Action is not allowed for superadmin role.')
    }

    return {
      userId: superadminUserId,
      agencyId: requestedAgencyId,
      agencyName: null,
      role: 'superadmin',
      actorMode: 'admin_view',
    }
  }

  let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgency>>

  try {
    currentUserAgency = await resolveCurrentUserAgency({
      activeAgencyId: requestedAgencyId || null,
    })
  } catch (error) {
    if (error instanceof ResolveCurrentAgencyError) {
      const mapped = mapResolveError(error)
      throw new Error(`${mapped.status}|${mapped.message}`)
    }
    throw error
  }

  if (requestedAgencyId && currentUserAgency.agency_id !== requestedAgencyId) {
    throw new Error('403|Agency scope mismatch for requested action.')
  }

  const role = getUserRoleForAgency(
    {
      memberships: [
        {
          agency_id: currentUserAgency.agency_id,
          role: currentUserAgency.role,
        },
      ],
    },
    currentUserAgency.agency_id,
  )

  if (!role || !canPerformAction(role, input.action)) {
    throw new Error('403|Your role is not authorized for this action.')
  }

  return {
    userId: currentUserAgency.user_id,
    agencyId: currentUserAgency.agency_id,
    agencyName: currentUserAgency.agency_name ?? null,
    role,
    actorMode: 'membership',
  }
}

export function parseAgencyActionContextError(error: unknown): { status: number; message: string } {
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
