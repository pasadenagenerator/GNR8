import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { ClientUserMembershipError, listClientUsers } from '@/gnr8/client/client-user-membership-service'

type Params = {
  params: Promise<{
    clientId?: string
  }>
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

export async function GET(request: Request, props: Params) {
  try {
    const url = new URL(request.url)
    const requestedAgencyId = normalizeText(url.searchParams.get('agency'))
    const { clientId: routeClientId = '' } = await props.params
    const clientId = normalizeText(routeClientId)

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'Client scope is required.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'view_client_users',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for client user list.' }, { status: 403 })
    }

    const users = await listClientUsers({
      agencyId: actionContext.agencyId,
      clientOrganizationId: clientId,
    })

    return NextResponse.json({
      ok: true,
      agencyId: actionContext.agencyId,
      clientId,
      role: actionContext.role,
      actorMode: actionContext.actorMode,
      users,
    })
  } catch (error) {
    if (error instanceof ClientUserMembershipError) {
      const mapped = mapClientUserError(error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
