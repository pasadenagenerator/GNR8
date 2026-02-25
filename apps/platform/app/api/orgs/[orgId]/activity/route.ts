import { NextResponse, type NextRequest } from 'next/server'
import { DomainError } from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'
import { getEntitlementService } from '@/src/di/core'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type AuditLogRow = {
  id: string
  org_id: string
  actor_user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: unknown
  created_at: string
}

function clampInt(value: string | null, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
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

    const pool = getPool()

    // Minimal authz: actor mora biti član orga
    const memberRes = await pool.query<{ ok: number }>(
      `select 1 as ok
       from public.memberships
       where org_id = $1
         and user_id = $2
       limit 1`,
      [orgId, actorUserId],
    )

    if (!memberRes.rows[0]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Enforce entitlements (paid OR trial)
    const entitlementService = getEntitlementService()
    await entitlementService.assert(orgId, 'organization.read')

    const where: string[] = ['org_id = $1']
    const params: any[] = [orgId]
    let p = 2

    if (action) {
      where.push(`action = $${p++}`)
      params.push(action)
    }
    if (entityType) {
      where.push(`entity_type = $${p++}`)
      params.push(entityType)
    }
    if (entityId) {
      where.push(`entity_id = $${p++}`)
      params.push(entityId)
    }
    if (cursor) {
      where.push(`created_at < $${p++}::timestamptz`)
      params.push(cursor)
    }

    const sql = `
      select
        id::text as id,
        org_id::text as org_id,
        actor_user_id::text as actor_user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at::text as created_at
      from public.audit_logs
      where ${where.join(' and ')}
      order by created_at desc
      limit ${limit + 1}
    `

    const res = await pool.query<AuditLogRow>(sql, params)

    const rows = res.rows
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const events = page.map((r) => ({
      id: String(r.id),
      orgId: String(r.org_id),
      actorUserId: String(r.actor_user_id),
      action: String(r.action),
      entityType: String(r.entity_type),
      entityId: String(r.entity_id),
      metadata: r.metadata ?? {},
      createdAt: String(r.created_at),
    }))

    const nextCursor = hasMore ? events[events.length - 1]?.createdAt ?? null : null

    return NextResponse.json({ events, nextCursor }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'

    if (e instanceof DomainError && String(msg).toLowerCase().includes('missing required entitlement')) {
      return NextResponse.json({ error: msg }, { status: 403 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}