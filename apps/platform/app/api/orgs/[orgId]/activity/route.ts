import { NextResponse, type NextRequest } from 'next/server'
import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getAuditLogService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function clampInt(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value == null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function isMissingEntitlementError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return String(msg).toLowerCase().includes('missing required entitlement')
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const url = request.nextUrl
    const action = url.searchParams.get('action')?.trim() || null
    const entityType = url.searchParams.get('entityType')?.trim() || null
    const entityId = url.searchParams.get('entityId')?.trim() || null
    const cursor = url.searchParams.get('cursor')?.trim() || null
    const limit = clampInt(url.searchParams.get('limit'), 1, 200, 50)

    const service = getAuditLogService()
    const out = await service.listOrgActivity({
      actorUserId,
      orgId,
      action,
      entityType,
      entityId,
      cursor,
      limit,
    })

    return NextResponse.json(out, { status: 200 })
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (e instanceof DomainError) {
      // entitlement enforcement naj bo 403 (ne 400)
      const status = isMissingEntitlementError(e) ? 403 : 400
      return NextResponse.json({ error: e.message }, { status })
    }
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}