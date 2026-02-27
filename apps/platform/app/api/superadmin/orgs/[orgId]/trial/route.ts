import { NextResponse, type NextRequest } from 'next/server'
import { DomainError, NotFoundError } from '@gnr8/core'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminTrialService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))

    const service = getSuperadminTrialService()
    const out = await service.updateOrgTrial({ orgId, body })

    return NextResponse.json(out, { status: 200 })
  } catch (e) {
    // superadmin guard običajno -> 403
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    if (lower.includes('forbidden') || lower.includes('unauthorized')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }

    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}