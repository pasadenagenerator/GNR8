import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'
import type { QueryResult } from 'pg'

type TxWithClient = {
  client: {
    // pg supports generics: client.query<RowType>(...)
    query: <T extends Record<string, any>>(
      sql: string,
      params?: unknown[],
    ) => Promise<QueryResult<T>>
  }
}

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const txWithClient = input.tx as unknown as TxWithClient

    const result = await txWithClient.client.query<{ role: Role }>(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
       limit 1`,
      [input.orgId, input.actorUserId],
    )

    return result.rows[0]?.role ?? null
  }
}