import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'
import type { QueryResult } from 'pg'

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const txWithClient = input.tx as unknown as {
      client: {
        query: (sql: string, params?: unknown[]) => Promise<QueryResult<any>>
      }
    }

    const result = await txWithClient.client.query(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
         and deleted_at is null
       limit 1`,
      [input.orgId, input.actorUserId],
    )

    return (result.rows[0]?.role as Role | undefined) ?? null
  }
}