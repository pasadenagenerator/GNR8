import { NextResponse, type NextRequest } from 'next/server'
import { DomainError, NotFoundError } from '@gnr8/core'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getSuperadminUsersService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function mapError(e: unknown) {
  if (e instanceof NotFoundError) return { status: 404, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : 'Internal server error'
  const lower = String(msg).toLowerCase()
  const status = lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
  return { status, message: msg }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const service = getSuperadminUsersService()
    const out = await service.listOrgUsers({ orgId })

    return NextResponse.json(out, { status: 200 })
  } catch (e) {
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}