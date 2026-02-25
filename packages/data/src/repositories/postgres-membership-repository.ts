import type { MembershipRepository, ProjectTransaction, Role } from '@gnr8/core'

type RoleRow = {
  role: Role
}

type TxWithClient = {
  client: {
    query: <T extends Record<string, unknown>>(
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: T[] }>
  }
}

export class PostgresMembershipRepository implements MembershipRepository {
  async getActorRoleInOrg(input: {
    tx: ProjectTransaction
    actorUserId: string
    orgId: string
  }): Promise<Role | null> {
    const txWithClient = input.tx as unknown as TxWithClient

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