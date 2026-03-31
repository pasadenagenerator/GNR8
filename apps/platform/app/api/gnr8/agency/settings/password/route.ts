import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { getSupabaseServerClientMutating } from '@/src/auth/supabase-server-mutating'

type Body = {
  agencyId?: unknown
  newPassword?: unknown
  confirmPassword?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as Body

    const requestedAgencyId = normalizeText(body.agencyId)
    const newPassword = normalizeText(body.newPassword)
    const confirmPassword = normalizeText(body.confirmPassword)

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'change_password',
      requestedAgencyId,
    })

    if (actionContext.agencyId !== requestedAgencyId && requestedAgencyId.length > 0) {
      return NextResponse.json({ error: 'Agency scope mismatch for requested password update.' }, { status: 403 })
    }

    const supabase = await getSupabaseServerClientMutating()
    const authUpdateResult = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (authUpdateResult.error) {
      return NextResponse.json({ error: authUpdateResult.error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      updatedUserId: actionContext.userId,
      message: 'Password updated.',
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }
}
