import { NextResponse, type NextRequest } from 'next/server'
import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getOrgStatsService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function isMissingEntitlementError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return msg.toLowerCase().includes('missing required entitlement')
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const service = getOrgStatsService()
    const stats = await service.getOrgStats({ actorUserId, orgId })

    return NextResponse.json(stats, { status: 200 })
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      // entitlement enforcement should behave like "forbidden"
      if (isMissingEntitlementError(e)) {
        return NextResponse.json({ error: e.message }, { status: 403 })
      }
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}