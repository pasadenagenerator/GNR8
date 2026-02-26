import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'
import type { PoolClient, QueryResultRow } from 'pg'

type RoleRow = QueryResultRow & { role: Role }

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const actorUserId = String(input.actorUserId ?? '').trim()
    const orgId = String(input.orgId ?? '').trim()
    if (!actorUserId || !orgId) return null

    // ProjectTransaction je core interface; PostgresProjectTransaction ima `.client: PoolClient`
    const pgTx = input.tx as unknown as { client: PoolClient }

    const res = await pgTx.client.query<RoleRow>(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
       limit 1`,
      [orgId, actorUserId],
    )

    return res.rows[0]?.role ?? null
  }
}