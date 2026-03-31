import { NextResponse } from 'next/server'

import { getOwnerSetupStatusForAgency } from '@/src/auth/owner-setup-gate'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'
import { resolveCurrentUserAgency, ResolveCurrentAgencyError } from '@/src/auth/resolve-current-agency'

type CompleteOwnerSetupBody = {
  agencyId?: unknown
  password?: unknown
  confirmPassword?: unknown
  fullName?: unknown
}

function asTrimmedString(value: unknown): string {
  return String(value ?? '').trim()
}

function mapResolveError(error: ResolveCurrentAgencyError): { status: number; message: string } {
  if (error.code === 'UNAUTHORIZED') {
    return { status: 401, message: 'You must be signed in to complete owner setup.' }
  }

  if (error.code === 'NO_MEMBERSHIP') {
    return { status: 400, message: 'No agency membership was found for your account.' }
  }

  if (error.code === 'ACTIVE_AGENCY_REQUIRED') {
    return { status: 400, message: 'Select your agency before completing owner setup.' }
  }

  if (error.code === 'ACTIVE_AGENCY_INVALID') {
    return { status: 400, message: 'Selected agency is invalid for your membership.' }
  }

  return { status: 400, message: 'Your membership context is invalid for owner setup.' }
}

function buildAgencyWorkspacePath(agencyId: string): string {
  return `/gnr8/agency?agency=${encodeURIComponent(agencyId)}`
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as CompleteOwnerSetupBody

    const password = asTrimmedString(body.password)
    const confirmPassword = asTrimmedString(body.confirmPassword)
    const fullName = asTrimmedString(body.fullName)
    const requestedAgencyId = asTrimmedString(body.agencyId) || null

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }

    if (fullName.length > 120) {
      return NextResponse.json({ error: 'Full name must be 120 characters or fewer.' }, { status: 400 })
    }

    let currentUserAgency: Awaited<ReturnType<typeof resolveCurrentUserAgency>>

    try {
      currentUserAgency = await resolveCurrentUserAgency({
        activeAgencyId: requestedAgencyId,
      })
    } catch (error) {
      if (error instanceof ResolveCurrentAgencyError) {
        const mapped = mapResolveError(error)
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw error
    }

    if (currentUserAgency.role !== 'owner') {
      return NextResponse.json({ error: 'Only agency owners can complete this setup step.' }, { status: 403 })
    }

    const ownerSetup = await getOwnerSetupStatusForAgency({
      userId: currentUserAgency.user_id,
      agencyId: currentUserAgency.agency_id,
    })

    if (!ownerSetup.hasOwnerMembership) {
      return NextResponse.json({ error: 'Owner membership is invalid for this agency.' }, { status: 403 })
    }

    if (ownerSetup.isCompleted) {
      return NextResponse.json(
        {
          ok: true,
          redirectTo: buildAgencyWorkspacePath(currentUserAgency.agency_id),
        },
        { status: 200 },
      )
    }

    const supabase = await getSupabaseServerClientMutating()

    const updateAuthResult = await supabase.auth.updateUser({
      password,
      data: fullName ? { full_name: fullName } : undefined,
    })

    if (updateAuthResult.error) {
      return NextResponse.json({ error: updateAuthResult.error.message }, { status: 400 })
    }

    const membershipUpdateResult = await supabase
      .from('memberships')
      .update({ owner_setup_completed: true })
      .eq('user_id', currentUserAgency.user_id)
      .in('id', ownerSetup.membershipIds)

    if (membershipUpdateResult.error) {
      return NextResponse.json({ error: membershipUpdateResult.error.message }, { status: 400 })
    }

    const ownerSetupAfterUpdate = await getOwnerSetupStatusForAgency({
      userId: currentUserAgency.user_id,
      agencyId: currentUserAgency.agency_id,
    })

    if (!ownerSetupAfterUpdate.hasOwnerMembership || !ownerSetupAfterUpdate.isCompleted) {
      return NextResponse.json(
        {
          error: 'Owner setup completion could not be verified. Try again.',
          diagnostics: {
            user_id: currentUserAgency.user_id,
            agency_id: currentUserAgency.agency_id,
            membership_ids_before_update: ownerSetup.membershipIds,
            membership_ids_after_update: ownerSetupAfterUpdate.membershipIds,
            owner_setup_completed_after_update: ownerSetupAfterUpdate.isCompleted,
          },
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        redirectTo: buildAgencyWorkspacePath(currentUserAgency.agency_id),
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete owner setup.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
