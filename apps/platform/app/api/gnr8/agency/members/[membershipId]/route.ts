import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { AgencyMembersError, removeAgencyMember, updateAgencyMemberRole } from '@/gnr8/agency/agency-membership-service'

type Params = {
  params: Promise<{
    membershipId?: string
  }>
}

type RoleBody = {
  agencyId?: unknown
  role?: unknown
}

type RemoveBody = {
  agencyId?: unknown
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

export async function PATCH(request: Request, props: Params) {
  try {
    const { membershipId: routeMembershipId = '' } = await props.params
    const membershipId = normalizeText(routeMembershipId)

    const body = ((await request.json().catch(() => null)) ?? {}) as RoleBody
    const requestedAgencyId = normalizeText(body.agencyId)
    const role = normalizeText(body.role).toLowerCase()

    if (!membershipId) {
      return NextResponse.json({ ok: false, error: 'Membership id is required.' }, { status: 400 })
    }

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'edit_member_role',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for role update.' }, { status: 403 })
    }

    console.info('[gnr8.agency.members.role_update]', {
      actor_user_id: actionContext.userId,
      actor_mode: actionContext.actorMode,
      target_agency_id: actionContext.agencyId,
      target_membership_id: membershipId,
      next_role: role,
    })

    const updated = await updateAgencyMemberRole({
      agencyId: actionContext.agencyId,
      membershipId,
      role: role as 'admin' | 'member',
    })

    return NextResponse.json({
      ok: true,
      membershipId: updated.membershipId,
      role: updated.role,
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

export async function DELETE(request: Request, props: Params) {
  try {
    const { membershipId: routeMembershipId = '' } = await props.params
    const membershipId = normalizeText(routeMembershipId)

    const body = ((await request.json().catch(() => null)) ?? {}) as RemoveBody
    const requestedAgencyId = normalizeText(body.agencyId)

    if (!membershipId) {
      return NextResponse.json({ ok: false, error: 'Membership id is required.' }, { status: 400 })
    }

    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope is required.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'remove_member',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for member removal.' }, { status: 403 })
    }

    console.info('[gnr8.agency.members.remove]', {
      actor_user_id: actionContext.userId,
      actor_mode: actionContext.actorMode,
      target_agency_id: actionContext.agencyId,
      target_membership_id: membershipId,
    })

    await removeAgencyMember({
      agencyId: actionContext.agencyId,
      membershipId,
      actorUserId: actionContext.userId,
    })

    return NextResponse.json({ ok: true, removedMembershipId: membershipId })
  } catch (error) {
    if (error instanceof AgencyMembersError) {
      const mapped = mapAgencyMembersError(error.message)
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
