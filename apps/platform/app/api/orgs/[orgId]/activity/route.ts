// apps/platform/app/api/orgs/[orgId]/activity/route.ts

import { NextResponse, type NextRequest } from 'next/server'
import { AuthorizationError, DomainError, NotFoundError } from '@gnr8/core'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'
import { getAuthorizationService, getEntitlementService } from '@/src/di/core'

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

type MembershipRow = {
  role: 'owner' | 'admin' | 'member'
}

function clampInt(
  value: string | null,
  min: number,
  max: number,
  fallback: number,
) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function isMissingEntitlementError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : ''
  return (
    e instanceof DomainError &&
    msg.toLowerCase().includes('missing required entitlement')
  )
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

    // 1) Membership + role
    const membershipRes = await pool.query<MembershipRow>(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
       limit 1`,
      [orgId, actorUserId],
    )

    const membership = membershipRes.rows[0]
    if (!membership) {
      // skladno z ostalim: membership not found
      throw new NotFoundError('Actor membership not found for organization')
    }

    // 2) Permission gate
    const authorizationService = getAuthorizationService()
    authorizationService.assert(membership.role, 'organization.read')

    // 3) Entitlement gate (paid OR trial)
    const entitlementService = getEntitlementService()
    await entitlementService.assert(orgId, 'organization.read')

    // 4) Query logs (pagination + filters)
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
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 })
    }
    if (isMissingEntitlementError(e)) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Missing required entitlement' },
        { status: 403 },
      )
    }
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}