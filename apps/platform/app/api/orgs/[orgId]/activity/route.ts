// apps/platform/app/api/orgs/[orgId]/activity/route.ts

import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'

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

function isAuthMessage(msg: string): boolean {
  const m = String(msg || '').toLowerCase()
  return m.includes('unauthorized') || m.includes('forbidden')
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

    // 1) Minimal authz: actor mora biti član orga
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

    // 2) Entitlement enforcement: organization.read
    // Paid entitlement OR active trial window
    const entRes = await pool.query<{ ok: number }>(
      `select 1 as ok
       from public.entitlements
       where org_id = $1
         and key = 'organization.read'
         and active = true
         and deleted_at is null
       limit 1`,
      [orgId],
    )

    let hasOrgRead = Boolean(entRes.rows[0])

    if (!hasOrgRead) {
      const trialRes = await pool.query<{
        trial_started_at: string | null
        trial_ends_at: string | null
      }>(
        `select
           trial_started_at::text as trial_started_at,
           trial_ends_at::text as trial_ends_at
         from public.organizations
         where id = $1
         limit 1`,
        [orgId],
      )

      const w = trialRes.rows[0]
      const startedAt = w?.trial_started_at ?? null
      const endsAt = w?.trial_ends_at ?? null

      if (startedAt && endsAt) {
        const startMs = new Date(String(startedAt)).getTime()
        const endMs = new Date(String(endsAt)).getTime()
        const now = Date.now()
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
          const isTrialActive = now >= startMs && now <= endMs
          if (isTrialActive) {
            hasOrgRead = true
          }
        }
      }
    }

    if (!hasOrgRead) {
      return NextResponse.json(
        { error: 'Missing required entitlement: organization.read' },
        { status: 403 },
      )
    }

    // Filters + pagination
    const where: string[] = ['org_id = $1']
    const params: Array<string> = [orgId]
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
      // cursor = ISO timestamp (created_at) zadnjega eventa prejšnje strani
      where.push(`created_at < $${p++}::timestamptz`)
      params.push(cursor)
    }

    // limit+1 for nextCursor
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
    const status = isAuthMessage(String(msg)) ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}