import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type Body = {
  agencyId?: unknown
  fullName?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Body

    const requestedAgencyId = normalizeText(body.agencyId)
    const fullName = normalizeText(body.fullName)

    if (!fullName) {
      return NextResponse.json({ error: 'Owner name is required.' }, { status: 400 })
    }

    if (fullName.length > 120) {
      return NextResponse.json({ error: 'Owner name must be 120 characters or fewer.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'edit_agency_settings',
      requestedAgencyId,
    })

    if (actionContext.role !== 'owner') {
      return NextResponse.json({ error: 'Only agency owner can update owner profile settings.' }, { status: 403 })
    }

    if (actionContext.agencyId !== requestedAgencyId && requestedAgencyId.length > 0) {
      return NextResponse.json({ error: 'Agency scope mismatch for requested update.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()
    const authUpdateResult = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
      },
    })

    if (authUpdateResult.error) {
      return NextResponse.json({ error: authUpdateResult.error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      owner: {
        id: actionContext.userId,
        full_name: fullName,
        email: authUpdateResult.data.user?.email ?? null,
      },
      emailEditable: false,
      emailEditReason: 'Auth email update flow is intentionally not enabled in this V1.',
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
