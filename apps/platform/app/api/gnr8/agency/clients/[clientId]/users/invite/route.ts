import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import {
  ClientUserMembershipError,
  inviteClientUser,
  type ClientMembershipRole,
} from '@/gnr8/client/client-user-membership-service'

type Params = {
  params: Promise<{
    clientId?: string
  }>
}

type InviteBody = {
  agencyId?: unknown
  email?: unknown
  role?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function mapClientUserError(message: string): { status: number; message: string } {
  const normalized = message.toLowerCase()
  if (normalized.includes('required') || normalized.includes('valid') || normalized.includes('scope')) {
    return { status: 400, message }
  }
  if (normalized.includes('not found')) {
    return { status: 404, message }
  }
  if (normalized.includes('already')) {
    return { status: 409, message }
  }
  return { status: 500, message }
}

export async function POST(request: Request, props: Params) {
  try {
    const { clientId: routeClientId = '' } = await props.params
    const clientId = normalizeText(routeClientId)

    const body = ((await request.json().catch(() => null)) ?? {}) as InviteBody
    const requestedAgencyId = normalizeText(body.agencyId)
    const email = normalizeText(body.email)
    const role = normalizeText(body.role).toLowerCase() || 'member'

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'Client scope is required.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'invite_client_user',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for client invite.' }, { status: 403 })
    }

    const invitedUser = await inviteClientUser({
      agencyId: actionContext.agencyId,
      clientOrganizationId: clientId,
      email,
      role: role as ClientMembershipRole,
      invitedByUserId: actionContext.userId,
    })

    return NextResponse.json(
      {
        ok: true,
        invitedUser,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof ClientUserMembershipError) {
      const mapped = mapClientUserError(error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
