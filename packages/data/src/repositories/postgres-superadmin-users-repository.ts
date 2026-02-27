import type { SuperadminOrgUser, SuperadminUsersRepository } from '@gnr8/core'
import type { Pool } from 'pg'
import { getPool } from '../db/pool'

type UserRow = {
  user_id: string
  role: string
  membership_created_at: string | null
  email: string | null
  user_created_at: string | null
  last_sign_in_at: string | null
}

export class PostgresSuperadminUsersRepository implements SuperadminUsersRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async listOrgUsers(input: { orgId: string }): Promise<SuperadminOrgUser[] | null> {
    const orgId = String(input.orgId ?? '').trim()
    if (!orgId) return null

    const client = await this.pool.connect()
    try {
      // 1) org exists (da lahko vrnemo 404, ne samo prazen array)
      const exists = await client.query<{ ok: number }>(
        `select 1 as ok from public.organizations where id = $1::uuid limit 1`,
        [orgId],
      )
      if (!exists.rows[0]) return null

      // 2) users list
      const res = await client.query<UserRow>(
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
        order by m.created_at desc nulls last
        `,
        [orgId],
      )

      return res.rows.map((r) => ({
        userId: String(r.user_id),
        email: r.email ? String(r.email) : null,
        role: String(r.role),
        membershipCreatedAt: r.membership_created_at ? String(r.membership_created_at) : null,
        userCreatedAt: r.user_created_at ? String(r.user_created_at) : null,
        lastSignInAt: r.last_sign_in_at ? String(r.last_sign_in_at) : null,
      }))
    } finally {
      client.release()
    }
  }
}