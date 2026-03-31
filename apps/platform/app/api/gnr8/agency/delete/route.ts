import { NextResponse } from 'next/server'

import { parseOwnerContextError, requireOwnerAgencyContext } from '@/app/api/gnr8/agency/_lib/owner-access'
import { AgencyDeprovisioningError, deprovisionAgency } from '@/gnr8/agency/agency-deprovisioning-service'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type Body = {
  agencyId?: unknown
  confirmationSlug?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function mapDeprovisionError(error: AgencyDeprovisioningError): { status: number; message: string } {
  if (error.code === 'INVALID_INPUT') {
    return { status: 400, message: error.message }
  }

  if (error.code === 'AGENCY_NOT_FOUND') {
    return { status: 404, message: error.message }
  }

  if (error.code === 'UNSUPPORTED_HOME_AGENCY_DELETE') {
    return { status: 403, message: error.message }
  }

  if (error.code === 'DEPENDENCY_BLOCK') {
    return { status: 409, message: error.message }
  }

  if (error.code === 'SERVICE_ROLE_UNAVAILABLE' || error.code === 'AUTH_CLEANUP_FAILED') {
    return {
      status: 500,
      message: `${error.message} Data deletion may have completed while auth cleanup needs manual follow-up.`,
    }
  }

  return { status: 500, message: error.message }
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Body

    const requestedAgencyId = normalizeText(body.agencyId)
    const confirmationSlug = normalizeText(body.confirmationSlug)

    if (!requestedAgencyId) {
      return NextResponse.json({ error: 'Agency ID is required.' }, { status: 400 })
    }

    if (!confirmationSlug) {
      return NextResponse.json({ error: 'Typed slug confirmation is required.' }, { status: 400 })
    }

    const ownerContext = await requireOwnerAgencyContext({
      requestedAgencyId,
    })

    if (ownerContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ error: 'Agency scope mismatch for delete request.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()
    const agencyResult = await supabase
      .from('agencies')
      .select('id,slug')
      .eq('id', ownerContext.agencyId)
      .limit(1)
      .maybeSingle()

    if (agencyResult.error) {
      return NextResponse.json({ error: agencyResult.error.message }, { status: 400 })
    }

    const agencySlug = normalizeText(agencyResult.data?.slug)
    if (!agencySlug) {
      return NextResponse.json({ error: 'Agency slug could not be resolved for delete confirmation.' }, { status: 400 })
    }

    if (confirmationSlug !== agencySlug) {
      return NextResponse.json(
        { error: `Typed confirmation must match current agency slug (${agencySlug}).` },
        { status: 400 },
      )
    }

    let result: Awaited<ReturnType<typeof deprovisionAgency>>

    try {
      result = await deprovisionAgency({
        agencyId: ownerContext.agencyId,
        actorUserId: ownerContext.userId,
      })
    } catch (error) {
      if (error instanceof AgencyDeprovisioningError) {
        const mapped = mapDeprovisionError(error)
        return NextResponse.json({ error: mapped.message }, { status: mapped.status })
      }
      throw error
    }

    await supabase.auth.signOut()

    return NextResponse.json({
      ok: true,
      redirectTo: '/login',
      deletedAgencyId: result.agencyId,
      deletedAgencySlug: result.agencySlug,
      deletedCounts: result.deletedCounts,
      authUserCleanup: {
        attempted: result.authUserCleanup.attemptedDeleteUserIds.length,
        deleted: result.authUserCleanup.deletedUserIds.length,
      },
    })
  } catch (error) {
    const mapped = parseOwnerContextError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
