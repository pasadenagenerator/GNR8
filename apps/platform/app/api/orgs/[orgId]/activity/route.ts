import { NextResponse, type NextRequest } from 'next/server'
import { requireActorUserId } from '@/src/auth/require-actor-user-id'
import { getPool } from '@gnr8/data'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type MembershipRow = {
  role: string
}

type AuditRow = {
  id: string
  created_at: string
  actor_user_id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: any
}

function clampLimit(raw: string | null) {
  const n = Number(raw ?? '50')
  if (!Number.isFinite(n)) return 50
  return Math.min(Math.max(Math.floor(n), 1), 200)
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actorUserId = await requireActorUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    // 1) preveri membership (ker memberships (pri tebi) nimajo deleted_at)
    const membership = await pool.query<MembershipRow>(
      `
      select role
      from public.memberships
      where org_id = $1
        and user_id = $2
      limit 1
      `,
      [orgId, actorUserId],
    )

    if (membership.rowCount === 0) {
      // namerno 404, da ne leakamo obstoja orga
      return NextResponse.json(
        { error: 'Actor membership not found for organization' },
        { status: 404 },
      )
    }

    // 2) fetch audit logov
    const url = new URL(request.url)
    const limit = clampLimit(url.searchParams.get('limit'))

    const res = await pool.query<AuditRow>(
      `
      select
        l.id::text as id,
        l.created_at::text as created_at,
        l.actor_user_id::text as actor_user_id,
        u.email as actor_email,
        l.action,
        l.entity_type,
        l.entity_id,
        l.metadata
      from public.audit_logs l
      left join auth.users u on u.id = l.actor_user_id
      where l.org_id = $1
      order by l.created_at desc
      limit $2
      `,
      [orgId, limit],
    )

    const events = res.rows.map((r) => ({
      id: String(r.id),
      at: String(r.created_at),
      actorUserId: String(r.actor_user_id),
      actorEmail: r.actor_email ?? null,
      action: String(r.action),
      entityType: String(r.entity_type),
      entityId: String(r.entity_id),
      // metadata je jsonb -> pride kot object
      metadata: r.metadata ?? {},
    }))

    return NextResponse.json({ events }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status =
      lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}