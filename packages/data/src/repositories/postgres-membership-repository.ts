import { DomainError } from '@gnr8/core'
import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'
import type { QueryResult } from 'pg'

type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResult<unknown>>
}

function getPgClientFromTx(tx: ProjectTransaction): PgClientLike {
  // PostgresProjectTransaction (in podobni tx-ji) imajo .client
  const maybe = tx as unknown as { client?: unknown }
  const client = maybe?.client as unknown

  if (
    !client ||
    typeof client !== 'object' ||
    !('query' in client) ||
    typeof (client as { query?: unknown }).query !== 'function'
  ) {
    throw new DomainError(
      'Unsupported project transaction implementation (missing tx.client.query)',
    )
  }

  return client as PgClientLike
}

type MembershipRoleRow = {
  role: Role
}

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const client = getPgClientFromTx(input.tx)

    const result = (await client.query(
      `select role
       from public.memberships
       where org_id = $1
         and user_id = $2
       limit 1`,
      [input.orgId, input.actorUserId],
    )) as QueryResult<MembershipRoleRow>

    return result.rows[0]?.role ?? null
  }
}