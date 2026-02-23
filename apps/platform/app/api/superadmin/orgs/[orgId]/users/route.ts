import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type UserRow = {
  user_id: string
  email: string | null
  role: string
  created_at: string
}

export async function GET(
  _request: NextRequest,
  context: { params: { orgId: string } },
) {
  try {
    await requireSuperadminUserId()

    const orgId = String(context.params.orgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    const res = await pool.query<UserRow>(
      `
      select
        m.user_id,
        u.email,
        m.role,
        m.created_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      where m.org_id = $1
        and m.deleted_at is null
      order by m.created_at asc
      `,
      [orgId],
    )

    return NextResponse.json(
      {
        users: res.rows.map((r) => ({
          userId: String(r.user_id),
          email: r.email,
          role: r.role,
          createdAt: String(r.created_at),
        })),
      },
      { status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status =
      lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}