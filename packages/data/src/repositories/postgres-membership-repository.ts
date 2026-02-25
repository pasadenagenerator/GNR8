import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'
import type { QueryResult, QueryResultRow } from 'pg'

type RoleRow = QueryResultRow & {
  role: Role
}

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    // ProjectTransaction je interface; v PostgresProjectTransaction imamo .client.
    // Tu naredimo minimalen "escape hatch" z močno tipiziranim query podpisom.
    const txWithClient = input.tx as unknown as {
      client: {
        query: <T extends QueryResultRow = QueryResultRow>(
          sql: string,
          params?: unknown[],
        ) => Promise<QueryResult<T>>
      }
    }

    const result = await txWithClient.client.query<RoleRow>(
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