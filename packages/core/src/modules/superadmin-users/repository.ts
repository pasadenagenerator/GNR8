import type { SuperadminOrgUser } from './types'

export interface SuperadminUsersRepository {
  /**
   * Returns null if org not found.
   */
  listOrgUsers(input: { orgId: string }): Promise<SuperadminOrgUser[] | null>
}