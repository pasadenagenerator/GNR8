import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { AgencyMembersError, inviteAgencyMember, listAgencyMembers } from '@/gnr8/agency/agency-membership-service'

type InviteBody = {
  agencyId?: unknown
  email?: unknown
  role?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function mapAgencyMembersError(message: string): { status: number; message: string } {
  const normalized = message.toLowerCase()
  if (normalized.includes('required') || normalized.includes('valid') || normalized.includes('blocked')) {
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const requestedAgencyId = normalizeText(url.searchParams.get('agency'))

    const actionContext = await requireAgencyActionContext({
      action: 'view_members',
      requestedAgencyId,
    })

    const members = await listAgencyMembers({
      agencyId: actionContext.agencyId,
    })

    return NextResponse.json({
      ok: true,
      agencyId: actionContext.agencyId,
      role: actionContext.role,
      actorMode: actionContext.actorMode,
      members,
    })
  } catch (error) {
    if (error instanceof AgencyMembersError) {
      const mapped = mapAgencyMembersError(error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as InviteBody

    const requestedAgencyId = normalizeText(body.agencyId)
    const email = normalizeText(body.email)
    const role = normalizeText(body.role).toLowerCase()

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'invite_user',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for invite.' }, { status: 403 })
    }

    console.info('[gnr8.agency.members.invite]', {
      actor_user_id: actionContext.userId,
      actor_mode: actionContext.actorMode,
      target_agency_id: actionContext.agencyId,
      invite_email: email,
      invite_role: role,
    })

    const invitedMember = await inviteAgencyMember({
      agencyId: actionContext.agencyId,
      email,
      role: role as 'owner' | 'admin' | 'member',
    })

    return NextResponse.json(
      {
        ok: true,
        invitedMember,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof AgencyMembersError) {
      const mapped = mapAgencyMembersError(error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
