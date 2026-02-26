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

function toTrimmedOrNull(v: string | null): string | null {
  const s = (v ?? '').trim()
  return s ? s : null
}

async function getOrgId(context: RouteContext): Promise<string> {
  const { orgId: rawOrgId } = await context.params
  return String(rawOrgId ?? '').trim()
}

function mapError(e: unknown): { status: number; message: string } {
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
    const orgId = await getOrgId(context)

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const url = request.nextUrl
    const action = toTrimmedOrNull(url.searchParams.get('action'))
    const entityType = toTrimmedOrNull(url.searchParams.get('entityType'))
    const entityId = toTrimmedOrNull(url.searchParams.get('entityId'))
    const cursor = toTrimmedOrNull(url.searchParams.get('cursor'))
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