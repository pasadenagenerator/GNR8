import { NextResponse, type NextRequest } from 'next/server'
import { DomainError, NotFoundError } from '@gnr8/core'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminOrgService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const service = getSuperadminOrgService()
    const out = await service.getOrgDetails({ orgId })

    return NextResponse.json(out, { status: 200 })
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status = lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}