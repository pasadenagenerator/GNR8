import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type UserRow = {
  user_id: string
  role: string
  membership_created_at: string
  email: string | null
  user_created_at: string | null
  last_sign_in_at: string | null
}

export async function GET(_request: NextRequest, context: any) {
  try {
    await requireSuperadminUserId()

    const orgId = String(context?.params?.orgId ?? '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    // memberships (public) + auth.users (auth)
    // LEFT JOIN: če auth.users ni dostopen / nimaš pravic, še vedno vrne člane (email bo null)
    const res = await pool.query<UserRow>(
      `
      select
        m.user_id::text as user_id,
        m.role::text as role,
        m.created_at::text as membership_created_at,
        u.email::text as email,
        u.created_at::text as user_created_at,
        u.last_sign_in_at::text as last_sign_in_at
      from public.memberships m
      left join auth.users u on u.id = m.user_id
      where m.org_id = $1
        and (m.deleted_at is null)
      order by m.created_at desc
      `,
      [orgId],
    )

    const users = res.rows.map((r) => ({
      userId: String(r.user_id),
      email: r.email ? String(r.email) : null,
      role: String(r.role),
      membershipCreatedAt: String(r.membership_created_at),
      userCreatedAt: r.user_created_at ? String(r.user_created_at) : null,
      lastSignInAt: r.last_sign_in_at ? String(r.last_sign_in_at) : null,
    }))

    return NextResponse.json({ users }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    const lower = String(msg).toLowerCase()
    const status =
      lower.includes('forbidden') || lower.includes('unauthorized') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}