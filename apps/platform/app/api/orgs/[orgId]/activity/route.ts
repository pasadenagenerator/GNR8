import { NextResponse, type NextRequest } from 'next/server'
import {
  AuthorizationError,
  DomainError,
  MissingEntitlementError,
  NotFoundError,
} from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getAuditLogService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  if (value == null) return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function requireParam(value: string, name: string) {
  if (!value) {
    return NextResponse.json({ error: `${name} is required` }, { status: 400 })
  }
  return null
}

function mapError(e: unknown) {
  if (e instanceof MissingEntitlementError) return { status: 403, message: e.message }
  if (e instanceof AuthorizationError) return { status: 403, message: e.message }
  if (e instanceof NotFoundError) return { status: 404, message: e.message }
  if (e instanceof DomainError) return { status: 400, message: e.message }

  const msg = e instanceof Error ? e.message : 'Internal server error'
  return { status: 500, message: msg }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()

    const missing = requireParam(orgId, 'orgId')
    if (missing) return missing

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
    const out = mapError(e)
    return NextResponse.json({ error: out.message }, { status: out.status })
  }
}