import { NextResponse } from 'next/server'

import { getClientSetupStatusForClient } from '@/src/auth/client-setup-gate'
import { resolveCurrentUserClient, ResolveCurrentClientError } from '@/src/auth/resolve-current-client'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type CompleteClientSetupBody = {
  clientId?: unknown
  name?: unknown
  surname?: unknown
  mobileNumber?: unknown
}

function asTrimmedString(value: unknown): string {
  return String(value ?? '').trim()
}

function mapResolveError(error: ResolveCurrentClientError): { status: number; message: string } {
  if (error.code === 'UNAUTHORIZED') {
    return { status: 401, message: 'You must be signed in to complete client setup.' }
  }
  if (error.code === 'NO_MEMBERSHIP') {
    return { status: 400, message: 'No client membership was found for your account.' }
  }
  if (error.code === 'ACTIVE_CLIENT_REQUIRED') {
    return { status: 400, message: 'Select your client before completing setup.' }
  }
  if (error.code === 'ACTIVE_CLIENT_INVALID') {
    return { status: 400, message: 'Selected client is invalid for your membership.' }
  }
  return { status: 400, message: 'Your membership context is invalid for client setup.' }
}

function buildClientWorkspacePath(clientId: string): string {
  return `/gnr8/client?client=${encodeURIComponent(clientId)}`
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as CompleteClientSetupBody

    const requestedClientId = asTrimmedString(body.clientId) || null
    const name = asTrimmedString(body.name)
    const surname = asTrimmedString(body.surname)
    const mobileNumber = asTrimmedString(body.mobileNumber)

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!surname) {
      return NextResponse.json({ error: 'Surname is required.' }, { status: 400 })
    }
    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required.' }, { status: 400 })
    }
    if (name.length > 80) {
      return NextResponse.json({ error: 'Name must be 80 characters or fewer.' }, { status: 400 })
    }
    if (surname.length > 80) {
      return NextResponse.json({ error: 'Surname must be 80 characters or fewer.' }, { status: 400 })
    }
    if (mobileNumber.length > 40) {
      return NextResponse.json({ error: 'Mobile number must be 40 characters or fewer.' }, { status: 400 })
    }

    let currentUserClient: Awaited<ReturnType<typeof resolveCurrentUserClient>>

    try {
      currentUserClient = await resolveCurrentUserClient({
        activeClientId: requestedClientId,
      })
    } catch (error) {
      if (error instanceof ResolveCurrentClientError) {
        const mapped = mapResolveError(error)
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw error
    }

    const setupStatus = await getClientSetupStatusForClient({
      userId: currentUserClient.user_id,
      clientId: currentUserClient.client_id,
      agencyId: currentUserClient.agency_id,
    })

    if (!setupStatus.hasClientMembership) {
      return NextResponse.json({ error: 'Client membership is invalid for this setup context.' }, { status: 403 })
    }

    if (setupStatus.isCompleted) {
      return NextResponse.json(
        {
          ok: true,
          redirectTo: buildClientWorkspacePath(currentUserClient.client_id),
        },
        { status: 200 },
      )
    }

    const supabase = await getSupabaseServerClientMutating()

    const membershipUpdateResult = await supabase
      .from('client_memberships')
      .update({
        first_name: name,
        last_name: surname,
        mobile_number: mobileNumber,
        client_setup_completed: true,
      })
      .eq('user_id', currentUserClient.user_id)
      .eq('client_organization_id', currentUserClient.client_id)
      .eq('agency_id', currentUserClient.agency_id)
      .in('id', setupStatus.membershipIds)

    if (membershipUpdateResult.error) {
      return NextResponse.json({ error: membershipUpdateResult.error.message }, { status: 400 })
    }

    const setupStatusAfterUpdate = await getClientSetupStatusForClient({
      userId: currentUserClient.user_id,
      clientId: currentUserClient.client_id,
      agencyId: currentUserClient.agency_id,
    })

    if (!setupStatusAfterUpdate.hasClientMembership || !setupStatusAfterUpdate.isCompleted) {
      return NextResponse.json(
        {
          error: 'Client setup completion could not be verified. Try again.',
          diagnostics: {
            user_id: currentUserClient.user_id,
            agency_id: currentUserClient.agency_id,
            client_id: currentUserClient.client_id,
            membership_ids_before_update: setupStatus.membershipIds,
            membership_ids_after_update: setupStatusAfterUpdate.membershipIds,
            client_setup_completed_after_update: setupStatusAfterUpdate.isCompleted,
          },
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        redirectTo: buildClientWorkspacePath(currentUserClient.client_id),
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete client setup.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
