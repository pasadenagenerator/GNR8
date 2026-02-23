import { NextResponse, type NextRequest } from 'next/server'
import { requireSuperadminUserId } from '@/src/superadmin/require-superadmin-user-id'
import { getPool } from '@gnr8/data'

type RouteContext = {
  params: Promise<{ orgId: string }>
}

type UserRow = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperadminUserId()

    const { orgId: rawOrgId } = await context.params
    const orgId = String(rawOrgId ?? '').trim()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const pool = getPool()

    // Opomba:
    // - v Supabase je auth.users v shemi "auth"
    // - memberships je v "public"
    // - joinamo, da dobimo seznam userjev, ki so člani orga
    const res = await pool.query<UserRow>(
      `
      select
        u.id::text as id,
        u.email,
        u.created_at::text as created_at,
        u.last_sign_in_at::text as last_sign_in_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      where m.org_id = $1
        and (m.deleted_at is null)
      order by u.created_at desc nulls last
      `,
      [orgId],
    )

    const users = res.rows.map((r: UserRow) => ({
      id: String(r.id),
      email: r.email ?? null,
      createdAt: r.created_at ? String(r.created_at) : null,
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